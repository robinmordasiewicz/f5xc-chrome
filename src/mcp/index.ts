/**
 * MCP Module Index
 *
 * Exports MCP adapters and parsers for browser automation.
 */

// Chrome DevTools Adapter
export {
  ChromeDevToolsAdapter,
  createNavigationInstruction,
  createClickInstruction,
  createFillInstruction,
  createSnapshotInstruction,
  createWaitInstruction,
  type NavigationOptions,
  type ClickOptions,
  type FillOptions,
  type WaitOptions,
  type ScreenshotOptions,
  type FormFieldInput,
  type SnapshotElement,
  type PageSnapshot,
  type PageInfo,
  type NetworkRequest,
  type ConsoleMessage,
  type MCPToolResponse,
} from './chrome-devtools-adapter';

// Snapshot Parser
export {
  SnapshotParser,
  getSnapshotParser,
  resetSnapshotParser,
  parseSnapshot,
  type ParsedElement,
  type ParsedSnapshot,
  type ElementSearchOptions,
} from './snapshot-parser';

// Action Executor
export {
  ActionExecutor,
  getActionExecutor,
  resetActionExecutor,
  executePlan,
  executeAction,
  planToMcpInstructions,
  type ExecutionProgress,
  type ActionExecutorOptions,
  type McpInstruction,
} from './action-executor';
