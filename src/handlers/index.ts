// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Handlers Module Index
 *
 * Exports handler functionality for authentication, navigation, crawling, and state detection.
 */

// Authentication Handler
export {
  AuthHandler,
  getAuthHandler,
  resetAuthHandler,
  type AuthHandlerOptions,
  type AuthDetectionResult,
} from './auth-handler';

// Navigation Handler
export {
  NavigationHandler,
  getNavigationHandler,
  resetNavigationHandler,
  processNavigation,
  getNavigationInstructions,
  type NavigationHandlerOptions,
  type NavigationResult,
  type NavigationInstruction,
} from './navigation-handler';

// Crawl Handler
export {
  CrawlHandler,
  getCrawlHandler,
  resetCrawlHandler,
  generateCrawlInstructions,
  type CrawlOptions,
  type CrawlProgress,
  type CrawlProgressCallback,
  type CrawlPhase,
  type CrawlResult,
  type CrawlMetadata,
  type CrawlError,
  type CrawlStats,
  type CrawlInstruction,
  type NavigationNode,
  type ExtractedElement,
} from './crawl-handler';

// Form Handler
export {
  FormHandler,
  getFormHandler,
  resetFormHandler,
  generateFormFillInstructions,
  detectFormFields,
  type FormFieldValue,
  type FormFillOptions,
  type FormFillResult,
  type FormValidationError,
  type FormInstruction,
  type DetectedFormField,
} from './form-handler';
