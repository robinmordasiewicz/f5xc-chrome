/**
 * Registry Module Index
 *
 * Exports all registry classes and utilities for URL and page metadata access.
 */

// URL Registry
export {
  URLRegistry,
  getURLRegistry,
  resetURLRegistry,
} from './url-registry';

// Page Registry
export {
  PageRegistry,
  getPageRegistry,
  resetPageRegistry,
} from './page-registry';

// Metadata Updater
export {
  MetadataUpdater,
  getMetadataUpdater,
  resetMetadataUpdater,
  updateMetadataFromCrawl,
  type MetadataUpdaterOptions,
  type UpdateResult,
  type UpdateChange,
  type MetadataDiff,
} from './metadata-updater';

// Workflow Registry
export {
  WorkflowRegistry,
  getWorkflowRegistry,
  resetWorkflowRegistry,
  loadWorkflows,
  findWorkflowByIntent,
  type Workflow,
  type WorkflowStep,
  type WorkflowMetadata,
  type WorkflowParameter,
  type WorkflowSearchResult,
} from './workflow-registry';
