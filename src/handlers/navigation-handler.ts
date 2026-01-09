/**
 * Navigation Handler
 *
 * Orchestrates end-to-end navigation flow including:
 * - Authentication checking
 * - URL resolution
 * - Page navigation
 * - State verification
 */

import {
  ParsedIntent,
  URLResolution,
  BrowserAction,
  ExecutionPlan,
  ExecutionResult,
  ActionResult,
  PageState,
} from '../types';
import { getIntentParser, parseIntent } from '../core/intent-parser';
import { getURLResolver, resolveIntent } from '../core/url-resolver';
import { getSelectorChainExecutor } from '../core/selector-chain';
import { getAuthHandler, AuthDetectionResult } from './auth-handler';
import { ParsedSnapshot, getSnapshotParser } from '../mcp/snapshot-parser';
import { ChromeDevToolsAdapter } from '../mcp/chrome-devtools-adapter';

/**
 * Navigation handler options
 */
export interface NavigationHandlerOptions {
  /** Default namespace */
  defaultNamespace?: string;
  /** Tenant URL */
  tenantUrl?: string;
  /** Whether to check authentication before navigation */
  checkAuth?: boolean;
  /** Timeout for navigation operations */
  timeout?: number;
  /** Whether to take screenshots on error */
  screenshotOnError?: boolean;
}

/**
 * Navigation result
 */
export interface NavigationResult {
  /** Whether navigation succeeded */
  success: boolean;
  /** Final URL after navigation */
  finalUrl: string;
  /** Page state after navigation */
  pageState?: PageState;
  /** Error message if failed */
  error?: string;
  /** Whether authentication was required */
  authRequired: boolean;
  /** Execution details */
  execution?: ExecutionResult;
}

/**
 * Navigation instruction for Claude
 */
export interface NavigationInstruction {
  /** MCP tool to call */
  tool: string;
  /** Parameters for the tool */
  params: Record<string, unknown>;
  /** Human-readable description */
  description: string;
  /** Expected outcome */
  expectedOutcome: string;
}

/**
 * Navigation Handler class
 */
export class NavigationHandler {
  private defaultNamespace: string;
  private tenantUrl: string;
  private checkAuth: boolean;
  private timeout: number;
  private screenshotOnError: boolean;
  private parser = getSnapshotParser();

  constructor(options?: NavigationHandlerOptions) {
    this.defaultNamespace = options?.defaultNamespace ?? 'default';
    this.tenantUrl = options?.tenantUrl ?? 'https://f5-amer-ent.console.ves.volterra.io';
    this.checkAuth = options?.checkAuth ?? true;
    this.timeout = options?.timeout ?? 30000;
    this.screenshotOnError = options?.screenshotOnError ?? true;
  }

  /**
   * Process a natural language navigation command
   */
  processCommand(command: string): ExecutionPlan {
    // Parse the intent
    const intent = parseIntent(command);

    // Resolve to URL
    const resolution = resolveIntent(intent);

    // Build execution plan
    return this.buildExecutionPlan(intent, resolution);
  }

  /**
   * Build execution plan from intent and resolution
   */
  buildExecutionPlan(intent: ParsedIntent, resolution: URLResolution): ExecutionPlan {
    const actions: BrowserAction[] = [];

    // Add navigation action
    actions.push({
      type: 'navigate',
      url: this.buildFullUrl(resolution.url),
      description: `Navigate to ${resolution.url}`,
      required: true,
      timeout: this.timeout,
    });

    // Add wait for load action
    actions.push({
      type: 'wait',
      wait_text: 'Loading',
      timeout: 10000,
      description: 'Wait for page to load',
      required: false,
    });

    // Add post-navigation actions from resolution
    if (resolution.post_navigation_actions) {
      actions.push(...resolution.post_navigation_actions);
    }

    // Add verification action
    actions.push({
      type: 'verify',
      description: 'Verify page loaded correctly',
      required: true,
    });

    return {
      intent,
      url_resolution: resolution,
      actions,
      estimated_duration_ms: this.estimateDuration(actions),
      requires_auth: this.checkAuth,
    };
  }

  /**
   * Generate navigation instructions for Claude
   */
  generateInstructions(command: string): NavigationInstruction[] {
    const plan = this.processCommand(command);
    const instructions: NavigationInstruction[] = [];

    // Check authentication first
    if (plan.requires_auth) {
      instructions.push({
        tool: 'mcp__chrome-devtools__take_snapshot',
        params: {},
        description: 'Take snapshot to check authentication state',
        expectedOutcome: 'Page snapshot showing current state',
      });
    }

    // Navigate to URL
    instructions.push({
      tool: 'mcp__chrome-devtools__navigate_page',
      params: ChromeDevToolsAdapter.buildNavigationParams({
        url: this.buildFullUrl(plan.url_resolution.url),
        timeout: this.timeout,
      }),
      description: `Navigate to ${plan.url_resolution.url}`,
      expectedOutcome: 'Page loads successfully',
    });

    // Wait for load
    instructions.push({
      tool: 'mcp__chrome-devtools__wait_for',
      params: ChromeDevToolsAdapter.buildWaitParams({
        time: 2,
      }),
      description: 'Wait for page to fully load',
      expectedOutcome: 'Page content is stable',
    });

    // Take final snapshot
    instructions.push({
      tool: 'mcp__chrome-devtools__take_snapshot',
      params: {},
      description: 'Take snapshot to verify navigation',
      expectedOutcome: 'Snapshot shows expected page content',
    });

    return instructions;
  }

  /**
   * Generate a summary of what will happen
   */
  generateSummary(command: string): string {
    const plan = this.processCommand(command);
    const lines: string[] = [];

    lines.push(`## Navigation Plan for: "${command}"`);
    lines.push('');
    lines.push(`**Intent**: ${plan.intent.action} ${plan.intent.resource}`);

    if (plan.intent.namespace) {
      lines.push(`**Namespace**: ${plan.intent.namespace}`);
    }

    if (plan.intent.workspace) {
      lines.push(`**Workspace**: ${plan.intent.workspace}`);
    }

    lines.push(`**Confidence**: ${(plan.intent.confidence * 100).toFixed(0)}%`);
    lines.push('');
    lines.push(`**Target URL**: ${plan.url_resolution.url}`);
    lines.push(`**Full URL**: ${this.buildFullUrl(plan.url_resolution.url)}`);

    if (!plan.url_resolution.is_complete) {
      lines.push('');
      lines.push('**⚠️ Unresolved Variables**:');
      for (const v of plan.url_resolution.unresolved_variables ?? []) {
        lines.push(`  - ${v}`);
      }
    }

    lines.push('');
    lines.push('**Actions**:');
    for (let i = 0; i < plan.actions.length; i++) {
      const action = plan.actions[i];
      lines.push(`  ${i + 1}. ${action.description}`);
    }

    if (plan.requires_auth) {
      lines.push('');
      lines.push('*Note: Will check authentication before navigation*');
    }

    return lines.join('\n');
  }

  /**
   * Check authentication state before navigation
   */
  checkAuthentication(
    currentUrl: string,
    snapshot: ParsedSnapshot
  ): AuthDetectionResult {
    const authHandler = getAuthHandler({ tenantUrl: this.tenantUrl });
    return authHandler.analyzeAuth(currentUrl, snapshot);
  }

  /**
   * Detect page state from snapshot
   */
  detectPageState(url: string, snapshot: ParsedSnapshot): PageState {
    return {
      url,
      title: snapshot.title ?? '',
      workspace: this.extractWorkspace(url),
      namespace: this.extractNamespace(url),
      page_type: this.detectPageType(url, snapshot),
      is_loading: this.isLoading(snapshot),
      has_error: this.hasError(snapshot),
      error_message: this.extractError(snapshot),
    };
  }

  /**
   * Extract workspace from URL
   */
  private extractWorkspace(url: string): string | undefined {
    const match = url.match(/\/workspaces\/([^/]+)/);
    return match?.[1];
  }

  /**
   * Extract namespace from URL
   */
  private extractNamespace(url: string): string | undefined {
    const match = url.match(/\/namespaces\/([^/]+)/);
    return match?.[1];
  }

  /**
   * Detect page type from URL and content
   */
  private detectPageType(url: string, snapshot: ParsedSnapshot): string {
    if (url.includes('/home')) return 'home';
    if (url.includes('/create')) return 'form';
    if (url.includes('/edit')) return 'form';
    if (url.includes('/manage/')) return 'list';
    if (url.includes('/overview/')) return 'overview';
    if (url.includes('/workspaces/')) return 'workspace';
    return 'unknown';
  }

  /**
   * Check if page is loading
   */
  private isLoading(snapshot: ParsedSnapshot): boolean {
    return (
      this.parser.hasText(snapshot, 'Loading') ||
      this.parser.hasText(snapshot, 'Please wait')
    );
  }

  /**
   * Check if page has error
   */
  private hasError(snapshot: ParsedSnapshot): boolean {
    return (
      this.parser.hasText(snapshot, 'Error') ||
      this.parser.hasText(snapshot, 'Failed') ||
      this.parser.hasText(snapshot, 'not found')
    );
  }

  /**
   * Extract error message from page
   */
  private extractError(snapshot: ParsedSnapshot): string | undefined {
    const errorElements = this.parser.findElements(snapshot, {
      text: 'error',
      partial: true,
      caseInsensitive: true,
    });

    if (errorElements.length > 0) {
      return errorElements[0].name;
    }

    return undefined;
  }

  /**
   * Build full URL with tenant
   */
  buildFullUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${this.tenantUrl}${path}`;
  }

  /**
   * Estimate total duration for actions
   */
  private estimateDuration(actions: BrowserAction[]): number {
    return actions.reduce((total, action) => {
      return total + (action.timeout ?? 5000);
    }, 0);
  }

  /**
   * Get the default namespace
   */
  getDefaultNamespace(): string {
    return this.defaultNamespace;
  }

  /**
   * Set the default namespace
   */
  setDefaultNamespace(namespace: string): void {
    this.defaultNamespace = namespace;
    getURLResolver().setDefaultNamespace(namespace);
  }

  /**
   * Get the tenant URL
   */
  getTenantUrl(): string {
    return this.tenantUrl;
  }

  /**
   * Set the tenant URL
   */
  setTenantUrl(url: string): void {
    this.tenantUrl = url;
    getAuthHandler().setTenantUrl(url);
  }
}

/**
 * Singleton instance
 */
let defaultHandler: NavigationHandler | null = null;

/**
 * Get the default navigation handler instance
 */
export function getNavigationHandler(
  options?: NavigationHandlerOptions
): NavigationHandler {
  if (!defaultHandler) {
    defaultHandler = new NavigationHandler(options);
  }
  return defaultHandler;
}

/**
 * Reset the default handler (useful for testing)
 */
export function resetNavigationHandler(): void {
  defaultHandler = null;
}

/**
 * Quick function to process a navigation command
 */
export function processNavigation(command: string): ExecutionPlan {
  return getNavigationHandler().processCommand(command);
}

/**
 * Quick function to generate navigation instructions
 */
export function getNavigationInstructions(command: string): NavigationInstruction[] {
  return getNavigationHandler().generateInstructions(command);
}
