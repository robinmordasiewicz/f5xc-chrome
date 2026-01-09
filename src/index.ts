/**
 * F5 XC Console Automation - Main Entry Point
 *
 * Deterministic Chrome automation system for F5 Distributed Cloud Console.
 * Provides natural language parsing, URL resolution, and browser automation.
 */

import { parseIntent as _parseIntent, resolveIntent as _resolveIntent } from './core';

// Types
export * from './types';

// Registry
export {
  URLRegistry,
  getURLRegistry,
  resetURLRegistry,
  PageRegistry,
  getPageRegistry,
  resetPageRegistry,
  MetadataUpdater,
  getMetadataUpdater,
  resetMetadataUpdater,
  updateMetadataFromCrawl,
  WorkflowRegistry,
  getWorkflowRegistry,
  resetWorkflowRegistry,
  loadWorkflows,
  findWorkflowByIntent,
} from './registry';

// Core
export {
  IntentParser,
  getIntentParser,
  resetIntentParser,
  parseIntent,
  URLResolver,
  getURLResolver,
  resetURLResolver,
  resolveIntent,
  SelectorChainExecutor,
  getSelectorChainExecutor,
  resetSelectorChainExecutor,
  findElement,
  StateDetector,
  getStateDetector,
  resetStateDetector,
  detectPermissions,
  detectSubscription,
  detectModules,
  detectConsoleState,
} from './core';

// Handlers
export {
  AuthHandler,
  getAuthHandler,
  resetAuthHandler,
  NavigationHandler,
  getNavigationHandler,
  resetNavigationHandler,
  processNavigation,
  getNavigationInstructions,
  CrawlHandler,
  getCrawlHandler,
  resetCrawlHandler,
  generateCrawlInstructions,
  FormHandler,
  getFormHandler,
  resetFormHandler,
  generateFormFillInstructions,
  detectFormFields,
} from './handlers';

// MCP
export {
  ChromeDevToolsAdapter,
  createNavigationInstruction,
  createClickInstruction,
  createFillInstruction,
  createSnapshotInstruction,
  createWaitInstruction,
  SnapshotParser,
  getSnapshotParser,
  resetSnapshotParser,
  parseSnapshot,
  ActionExecutor,
  getActionExecutor,
  resetActionExecutor,
  executePlan,
  executeAction,
  planToMcpInstructions,
} from './mcp';

// Utils
export {
  extractAction,
  extractResource,
  extractWorkspace,
  extractNamespace,
  extractResourceName,
  tokenize,
  similarity,
  findBestMatch,
  getActionSynonyms,
  getResourceSynonyms,
  normalizeAction,
  normalizeResource,
} from './utils';

/**
 * Quick helper to parse and resolve a natural language command
 */
export function parseAndResolve(input: string) {
  const intent = _parseIntent(input);
  const resolution = _resolveIntent(intent);
  return { intent, resolution };
}
