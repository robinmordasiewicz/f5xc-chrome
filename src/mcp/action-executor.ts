// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Action Executor
 *
 * Executes BrowserAction sequences with progress reporting, error handling,
 * and rollback capabilities. Integrates with Chrome DevTools MCP for browser automation.
 */

import {
  BrowserAction,
  ActionResult,
  ExecutionPlan,
  ExecutionResult,
  DeterministicSelector,
} from '../types';
import {
  ChromeDevToolsAdapter,
  createNavigationInstruction,
  createClickInstruction,
  createFillInstruction,
  createSnapshotInstruction,
  createWaitInstruction,
} from './chrome-devtools-adapter';
import { getSnapshotParser, ParsedSnapshot, ParsedElement } from './snapshot-parser';
import { getSelectorChainExecutor } from '../core/selector-chain';

/**
 * Execution progress callback
 */
export type ExecutionProgressCallback = (progress: ExecutionProgress) => void;

/**
 * Execution progress information
 */
export interface ExecutionProgress {
  /** Current action index (0-based) */
  current_action_index: number;
  /** Total number of actions */
  total_actions: number;
  /** Current action being executed */
  current_action: BrowserAction;
  /** Status of current action */
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  /** Percentage complete (0-100) */
  percentage: number;
  /** Elapsed time in ms */
  elapsed_ms: number;
  /** Estimated remaining time in ms */
  estimated_remaining_ms: number;
  /** Messages for display */
  messages: string[];
}

/**
 * Executor options
 */
export interface ActionExecutorOptions {
  /** Default timeout for actions (ms) */
  default_timeout?: number;
  /** Whether to continue on non-critical failures */
  continue_on_failure?: boolean;
  /** Whether to take screenshot on failure */
  screenshot_on_failure?: boolean;
  /** Screenshot output directory */
  screenshot_dir?: string;
  /** Progress callback */
  on_progress?: ExecutionProgressCallback;
  /** Dry run mode (generate instructions only, don't execute) */
  dry_run?: boolean;
  /** Maximum retries for failed actions */
  max_retries?: number;
  /** Delay between retries (ms) */
  retry_delay?: number;
}

/**
 * MCP instruction for execution
 */
export interface McpInstruction {
  /** Instruction type */
  type: 'navigate' | 'click' | 'fill' | 'select' | 'wait' | 'snapshot' | 'evaluate';
  /** Target element UID */
  target_uid?: string;
  /** URL for navigation */
  url?: string;
  /** Value for fill operations */
  value?: string;
  /** Text to wait for */
  wait_text?: string;
  /** Timeout in ms */
  timeout?: number;
  /** Human-readable description */
  description: string;
  /** Script to evaluate */
  script?: string;
}

/**
 * Action Executor class
 */
export class ActionExecutor {
  private options: Required<ActionExecutorOptions>;
  private adapter: ChromeDevToolsAdapter;
  private startTime: number = 0;
  private currentSnapshot: ParsedSnapshot | null = null;

  constructor(options: ActionExecutorOptions = {}) {
    this.options = {
      default_timeout: options.default_timeout ?? 30000,
      continue_on_failure: options.continue_on_failure ?? false,
      screenshot_on_failure: options.screenshot_on_failure ?? true,
      screenshot_dir: options.screenshot_dir ?? './screenshots',
      on_progress: options.on_progress ?? (() => {}),
      dry_run: options.dry_run ?? false,
      max_retries: options.max_retries ?? 2,
      retry_delay: options.retry_delay ?? 1000,
    };
    this.adapter = new ChromeDevToolsAdapter();
  }

  /**
   * Execute a full execution plan
   */
  async executePlan(plan: ExecutionPlan): Promise<ExecutionResult> {
    this.startTime = Date.now();
    const actionResults: ActionResult[] = [];
    let success = true;
    let error: string | undefined;

    // Execute each action
    for (let i = 0; i < plan.actions.length; i++) {
      const action = plan.actions[i];

      // Report progress
      this.reportProgress({
        current_action_index: i,
        total_actions: plan.actions.length,
        current_action: action,
        status: 'executing',
        percentage: Math.round((i / plan.actions.length) * 100),
        elapsed_ms: Date.now() - this.startTime,
        estimated_remaining_ms: this.estimateRemainingTime(i, plan.actions.length),
        messages: [`Executing: ${action.description}`],
      });

      // Execute the action
      const result = await this.executeAction(action);
      actionResults.push(result);

      // Handle failure
      if (!result.success) {
        this.reportProgress({
          current_action_index: i,
          total_actions: plan.actions.length,
          current_action: action,
          status: 'failed',
          percentage: Math.round((i / plan.actions.length) * 100),
          elapsed_ms: Date.now() - this.startTime,
          estimated_remaining_ms: 0,
          messages: [`Failed: ${result.error}`],
        });

        if (action.required && !this.options.continue_on_failure) {
          success = false;
          error = result.error;
          break;
        }
      } else {
        this.reportProgress({
          current_action_index: i,
          total_actions: plan.actions.length,
          current_action: action,
          status: 'completed',
          percentage: Math.round(((i + 1) / plan.actions.length) * 100),
          elapsed_ms: Date.now() - this.startTime,
          estimated_remaining_ms: this.estimateRemainingTime(i + 1, plan.actions.length),
          messages: [`Completed: ${action.description}`],
        });
      }
    }

    const totalDuration = Date.now() - this.startTime;
    const summary = this.generateSummary(actionResults, success);

    return {
      success,
      plan,
      action_results: actionResults,
      total_duration_ms: totalDuration,
      final_url: plan.url_resolution.url, // Would need actual URL from browser
      error,
      summary,
    };
  }

  /**
   * Execute a single browser action
   */
  async executeAction(action: BrowserAction): Promise<ActionResult> {
    const startTime = Date.now();
    let retries = 0;

    while (retries <= this.options.max_retries) {
      try {
        if (this.options.dry_run) {
          // In dry run mode, just simulate success
          return {
            success: true,
            action,
            duration_ms: 0,
            data: { dry_run: true },
          };
        }

        // Execute based on action type
        const result = await this.executeActionType(action);

        return {
          success: true,
          action,
          duration_ms: Date.now() - startTime,
          data: result,
        };
      } catch (err) {
        retries++;

        if (retries <= this.options.max_retries) {
          // Wait before retry
          await this.delay(this.options.retry_delay);
          continue;
        }

        const errorMessage = err instanceof Error ? err.message : String(err);

        // Take screenshot on failure if enabled
        let screenshotPath: string | undefined;
        if (this.options.screenshot_on_failure) {
          screenshotPath = await this.takeFailureScreenshot(action);
        }

        return {
          success: false,
          action,
          duration_ms: Date.now() - startTime,
          error: errorMessage,
          screenshot_path: screenshotPath,
        };
      }
    }

    // Should never reach here
    return {
      success: false,
      action,
      duration_ms: Date.now() - startTime,
      error: 'Max retries exceeded',
    };
  }

  /**
   * Execute action based on type
   */
  private async executeActionType(action: BrowserAction): Promise<Record<string, unknown>> {
    switch (action.type) {
      case 'navigate':
        return this.executeNavigate(action);

      case 'click':
        return this.executeClick(action);

      case 'fill':
        return this.executeFill(action);

      case 'select':
        return this.executeSelect(action);

      case 'wait':
        return this.executeWait(action);

      case 'verify':
        return this.executeVerify(action);

      case 'screenshot':
        return this.executeScreenshot(action);

      case 'scroll':
        return this.executeScroll(action);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Execute navigate action
   */
  private async executeNavigate(action: BrowserAction): Promise<Record<string, unknown>> {
    if (!action.url) {
      throw new Error('Navigate action requires URL');
    }

    // Generate MCP instruction
    const instruction = createNavigationInstruction(action.url);

    return {
      instruction,
      url: action.url,
      note: 'Execute with mcp__chrome-devtools__navigate_page',
    };
  }

  /**
   * Execute click action
   */
  private async executeClick(action: BrowserAction): Promise<Record<string, unknown>> {
    if (!action.target) {
      throw new Error('Click action requires target selector');
    }

    // Resolve the selector to a UID
    const uid = await this.resolveSelector(action.target);

    if (!uid) {
      throw new Error(`Could not find element matching selector: ${JSON.stringify(action.target)}`);
    }

    // Generate MCP instruction
    const instruction = createClickInstruction(uid, action.description);

    return {
      instruction,
      uid,
      note: 'Execute with mcp__chrome-devtools__click',
    };
  }

  /**
   * Execute fill action
   */
  private async executeFill(action: BrowserAction): Promise<Record<string, unknown>> {
    if (!action.target) {
      throw new Error('Fill action requires target selector');
    }
    if (action.value === undefined) {
      throw new Error('Fill action requires value');
    }

    // Resolve the selector to a UID
    const uid = await this.resolveSelector(action.target);

    if (!uid) {
      throw new Error(`Could not find element matching selector: ${JSON.stringify(action.target)}`);
    }

    // Generate MCP instruction
    const instruction = createFillInstruction(uid, action.value);

    return {
      instruction,
      uid,
      value: action.value,
      note: 'Execute with mcp__chrome-devtools__fill',
    };
  }

  /**
   * Execute select action (for dropdowns)
   */
  private async executeSelect(action: BrowserAction): Promise<Record<string, unknown>> {
    if (!action.target) {
      throw new Error('Select action requires target selector');
    }
    if (action.value === undefined) {
      throw new Error('Select action requires value');
    }

    // Resolve the selector to a UID
    const uid = await this.resolveSelector(action.target);

    if (!uid) {
      throw new Error(`Could not find element matching selector: ${JSON.stringify(action.target)}`);
    }

    // For select, typically we need to click to open, then click the option
    return {
      instruction: `Click dropdown ${uid}, then select option "${action.value}"`,
      uid,
      value: action.value,
      note: 'Execute with mcp__chrome-devtools__click then mcp__chrome-devtools__click on option',
    };
  }

  /**
   * Execute wait action
   */
  private async executeWait(action: BrowserAction): Promise<Record<string, unknown>> {
    if (!action.wait_text && !action.timeout) {
      throw new Error('Wait action requires wait_text or timeout');
    }

    if (action.wait_text) {
      // Generate wait for text instruction
      const instruction = createWaitInstruction(action.wait_text);
      return {
        instruction,
        wait_text: action.wait_text,
        timeout: action.timeout,
        note: 'Execute with mcp__chrome-devtools__wait_for',
      };
    } else {
      // Simple timeout wait
      return {
        instruction: `Wait for ${action.timeout}ms`,
        timeout: action.timeout,
        note: 'Use setTimeout or similar delay',
      };
    }
  }

  /**
   * Execute verify action
   */
  private async executeVerify(action: BrowserAction): Promise<Record<string, unknown>> {
    // Take a snapshot and verify expected content
    const instruction = createSnapshotInstruction();

    return {
      instruction,
      verify_text: action.wait_text,
      note: 'Take snapshot and verify content contains expected text',
    };
  }

  /**
   * Execute screenshot action
   */
  private async executeScreenshot(action: BrowserAction): Promise<Record<string, unknown>> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot_${timestamp}.png`;
    const filepath = `${this.options.screenshot_dir}/${filename}`;

    return {
      instruction: `Take screenshot and save to ${filepath}`,
      filepath,
      note: 'Execute with mcp__chrome-devtools__take_screenshot',
    };
  }

  /**
   * Execute scroll action
   */
  private async executeScroll(action: BrowserAction): Promise<Record<string, unknown>> {
    if (action.target) {
      // Scroll to element
      const uid = await this.resolveSelector(action.target);
      return {
        instruction: `Scroll to element ${uid}`,
        uid,
        note: 'Execute with mcp__chrome-devtools__evaluate_script to scroll into view',
      };
    } else {
      // Scroll by amount or to position
      return {
        instruction: 'Scroll page',
        note: 'Execute with mcp__chrome-devtools__evaluate_script',
      };
    }
  }

  /**
   * Resolve a selector to a UID using the current snapshot
   */
  private async resolveSelector(selector: DeterministicSelector): Promise<string | null> {
    // If we don't have a snapshot, we need one
    if (!this.currentSnapshot) {
      // In real execution, this would take a snapshot
      // For instruction generation, we return a placeholder
      return `{resolve:${selector.type}:${selector.value}}`;
    }

    const executor = getSelectorChainExecutor();
    let result;

    // Use the appropriate finder method based on selector type
    switch (selector.type) {
      case 'name':
      case 'text_match':
        result = executor.findByText(this.currentSnapshot, selector.value);
        break;
      case 'aria_label':
        result = executor.findByAriaLabel(this.currentSnapshot, selector.value);
        break;
      case 'href_path':
        result = executor.findByHref(this.currentSnapshot, selector.value);
        break;
      case 'placeholder':
        result = executor.findTextbox(this.currentSnapshot, selector.value);
        break;
      default:
        // For css and ref, use text match as fallback
        result = executor.findByText(this.currentSnapshot, selector.value);
    }

    return result.found ? result.uid ?? null : null;
  }

  /**
   * Take a screenshot on failure
   */
  private async takeFailureScreenshot(action: BrowserAction): Promise<string | undefined> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `failure_${action.type}_${timestamp}.png`;
      const filepath = `${this.options.screenshot_dir}/${filename}`;

      // In real execution, this would take the screenshot
      return filepath;
    } catch {
      return undefined;
    }
  }

  /**
   * Report progress to callback
   */
  private reportProgress(progress: ExecutionProgress): void {
    this.options.on_progress(progress);
  }

  /**
   * Estimate remaining time based on progress
   */
  private estimateRemainingTime(completedActions: number, totalActions: number): number {
    if (completedActions === 0) {
      return totalActions * 2000; // Estimate 2s per action
    }

    const elapsed = Date.now() - this.startTime;
    const avgTimePerAction = elapsed / completedActions;
    const remainingActions = totalActions - completedActions;

    return Math.round(avgTimePerAction * remainingActions);
  }

  /**
   * Generate execution summary
   */
  private generateSummary(results: ActionResult[], success: boolean): string {
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalTime = results.reduce((sum, r) => sum + r.duration_ms, 0);

    if (success) {
      return `Execution completed successfully. ${succeeded} actions executed in ${totalTime}ms.`;
    } else {
      return `Execution failed. ${succeeded} succeeded, ${failed} failed. Total time: ${totalTime}ms.`;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set the current snapshot for selector resolution
   */
  setSnapshot(snapshot: ParsedSnapshot): void {
    this.currentSnapshot = snapshot;
  }

  /**
   * Convert a BrowserAction to MCP instructions
   */
  actionToMcpInstructions(action: BrowserAction): McpInstruction[] {
    const instructions: McpInstruction[] = [];

    switch (action.type) {
      case 'navigate':
        instructions.push({
          type: 'navigate',
          url: action.url,
          timeout: action.timeout,
          description: action.description,
        });
        break;

      case 'click':
        instructions.push({
          type: 'click',
          target_uid: action.target ? `{resolve:${action.target.type}:${action.target.value}}` : undefined,
          description: action.description,
        });
        break;

      case 'fill':
        instructions.push({
          type: 'fill',
          target_uid: action.target ? `{resolve:${action.target.type}:${action.target.value}}` : undefined,
          value: action.value,
          description: action.description,
        });
        break;

      case 'select':
        // For select, we often need click + click option
        instructions.push({
          type: 'click',
          target_uid: action.target ? `{resolve:${action.target.type}:${action.target.value}}` : undefined,
          description: `Open dropdown: ${action.description}`,
        });
        instructions.push({
          type: 'click',
          target_uid: `{resolve:text_match:${action.value}}`,
          description: `Select option: ${action.value}`,
        });
        break;

      case 'wait':
        if (action.wait_text) {
          instructions.push({
            type: 'wait',
            wait_text: action.wait_text,
            timeout: action.timeout,
            description: action.description,
          });
        }
        break;

      case 'verify':
        instructions.push({
          type: 'snapshot',
          description: `Take snapshot and verify: ${action.description}`,
        });
        break;

      case 'screenshot':
        instructions.push({
          type: 'evaluate',
          description: action.description,
        });
        break;
    }

    return instructions;
  }

  /**
   * Convert an execution plan to MCP instructions
   */
  planToMcpInstructions(plan: ExecutionPlan): McpInstruction[] {
    const instructions: McpInstruction[] = [];

    // Add navigation instruction if URL is complete
    if (plan.url_resolution.is_complete) {
      instructions.push({
        type: 'navigate',
        url: plan.url_resolution.url,
        description: `Navigate to ${plan.url_resolution.url}`,
      });
    }

    // Add post-navigation actions
    if (plan.url_resolution.post_navigation_actions) {
      for (const action of plan.url_resolution.post_navigation_actions) {
        instructions.push(...this.actionToMcpInstructions(action));
      }
    }

    // Add main actions
    for (const action of plan.actions) {
      instructions.push(...this.actionToMcpInstructions(action));
    }

    // Add validation actions
    if (plan.validation_checks) {
      for (const action of plan.validation_checks) {
        instructions.push(...this.actionToMcpInstructions(action));
      }
    }

    return instructions;
  }

  /**
   * Generate human-readable instructions for a plan
   */
  generateInstructionText(plan: ExecutionPlan): string[] {
    const lines: string[] = [];
    const mcpInstructions = this.planToMcpInstructions(plan);

    lines.push('# Execution Instructions');
    lines.push('');
    lines.push(`Goal: ${plan.intent.raw_input}`);
    lines.push(`Target URL: ${plan.url_resolution.url}`);
    lines.push('');
    lines.push('## Steps:');
    lines.push('');

    let stepNum = 1;
    for (const inst of mcpInstructions) {
      lines.push(`${stepNum}. ${inst.description}`);
      lines.push(`   Type: ${inst.type}`);

      if (inst.url) {
        lines.push(`   URL: ${inst.url}`);
      }
      if (inst.target_uid) {
        lines.push(`   Target: ${inst.target_uid}`);
      }
      if (inst.value) {
        lines.push(`   Value: ${inst.value}`);
      }
      if (inst.wait_text) {
        lines.push(`   Wait for: ${inst.wait_text}`);
      }

      lines.push('');
      stepNum++;
    }

    return lines;
  }
}

// Singleton instance
let actionExecutorInstance: ActionExecutor | null = null;

/**
 * Get the singleton action executor instance
 */
export function getActionExecutor(options?: ActionExecutorOptions): ActionExecutor {
  if (!actionExecutorInstance) {
    actionExecutorInstance = new ActionExecutor(options);
  }
  return actionExecutorInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetActionExecutor(): void {
  actionExecutorInstance = null;
}

/**
 * Execute an execution plan
 */
export async function executePlan(
  plan: ExecutionPlan,
  options?: ActionExecutorOptions
): Promise<ExecutionResult> {
  const executor = getActionExecutor(options);
  return executor.executePlan(plan);
}

/**
 * Execute a single browser action
 */
export async function executeAction(
  action: BrowserAction,
  options?: ActionExecutorOptions
): Promise<ActionResult> {
  const executor = getActionExecutor(options);
  return executor.executeAction(action);
}

/**
 * Convert a plan to MCP instructions
 */
export function planToMcpInstructions(plan: ExecutionPlan): McpInstruction[] {
  const executor = getActionExecutor();
  return executor.planToMcpInstructions(plan);
}

/**
 * Generate human-readable instructions for a plan
 */
export function generateInstructionText(plan: ExecutionPlan): string[] {
  const executor = getActionExecutor();
  return executor.generateInstructionText(plan);
}
