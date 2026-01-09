/**
 * Test Helpers Index
 *
 * Export all helper modules for easy importing.
 */

export {
  CleanupManager,
  getGlobalCleanupManager,
  resetGlobalCleanupManager,
  type ResourceType,
  type CleanupResult,
} from './cleanup-manager';

export {
  validateCssSelector,
  calculateSpecificity,
  validateSelectorPriorityChain,
  validateHrefPathSelector,
  validateNavigationSelectors,
  type SelectorValidationResult,
  type SelectorPriorityChain,
  type NavigationMetadata,
  type WorkspaceMetadata,
  type SidebarMetadata,
  type NavigationValidationResult,
} from './selector-validator';

// Snapshot factory for creating test snapshots
export {
  SnapshotBuilder,
  snapshotFactory,
  loadSnapshotFixture,
  createEmptySnapshot,
  createLoginPageSnapshot,
  createAuthenticatedHomeSnapshot,
  createHttpLbListSnapshot,
  createHttpLbFormSnapshot,
  createPermissionDeniedSnapshot,
  createLoadingStateSnapshot,
  createTestSnapshot,
  type ElementBuilder,
} from './snapshot-factory';

// Intent factory for creating test intents
export {
  IntentBuilder,
  intentFactory,
  createNavigateIntent,
  createListIntent,
  createCreateIntent,
  createDeleteIntent,
  createEditIntent,
  createLowConfidenceIntent,
  createUrlResolution,
  createBrowserAction,
  createExecutionPlan,
} from './intent-factory';

// Mock registries for testing without file I/O
export {
  MockURLRegistry,
  MockPageRegistry,
  mockRegistry,
  mockUrlSitemap,
  mockPageMetadata,
  mockNavigationMetadata,
  createMockUrlRegistry,
  createMockPageRegistry,
} from './mock-registry';
