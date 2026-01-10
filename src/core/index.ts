// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Core Module Index
 *
 * Exports core functionality for intent parsing, URL resolution, and selector chain execution.
 */

// Intent Parser
export {
  IntentParser,
  getIntentParser,
  resetIntentParser,
  parseIntent,
} from './intent-parser';

// URL Resolver
export {
  URLResolver,
  getURLResolver,
  resetURLResolver,
  resolveIntent,
} from './url-resolver';

// Selector Chain
export {
  SelectorChainExecutor,
  getSelectorChainExecutor,
  resetSelectorChainExecutor,
  findElement,
  type SelectorChainOptions,
  type SelectorChainResult,
} from './selector-chain';

// State Detector
export {
  StateDetector,
  getStateDetector,
  resetStateDetector,
  detectPermissions,
  detectSubscription,
  detectModules,
  detectConsoleState,
  type StateDetectorOptions,
  type PermissionDetectionResult,
  type SubscriptionDetectionResult,
  type ModuleDetectionResult,
} from './state-detector';
