// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * F5 XC Console Automation - Type Definitions Index
 *
 * Central export point for all type definitions used in the
 * deterministic Chrome automation system.
 */

// Navigation metadata types
export type {
  SelectorType,
  InputType,
  PageType,
  SelectorDefinition,
  DeterministicSelector,
  ElementMetadata,
  WorkspaceCard,
  SidebarItem,
  FormField,
  FormSection,
  FormMetadata,
  TableColumn,
  TableMetadata,
  PageMetadata,
  WorkspaceMetadata,
  HomePageMetadata,
  AuthenticationConfig,
  NavigationMetadata,
  SelectorResolutionResult,
} from './navigation';

// URL registry types
export type {
  StaticRoute,
  RouteVariable,
  DynamicRoute,
  WorkspaceMapping,
  ResourceShortcut,
  CrawlCoverage,
  URLSitemap,
  URLResolutionRequest,
  URLResolutionResult,
  PatternMatchResult,
  WorkspaceResolution,
  URLBuilderOptions,
} from './url-registry';

// Intent parsing types
export type {
  ActionVerb,
  ResourceType,
  WorkspaceId,
  ParsedIntent,
  IntentPattern,
  BrowserAction,
  URLResolution,
  ActionResult,
  ExecutionPlan,
  ExecutionResult,
  ResourceSynonyms,
  ActionSynonyms,
} from './intent';

// Authentication and state types
export type {
  AuthProvider,
  AuthStatus,
  AuthState,
  AuthFlowStep,
  AuthFlow,
  PermissionLevel,
  PermissionState,
  SubscriptionTier,
  FeatureBadge,
  SubscriptionState,
  ModuleStatus,
  ModuleState,
  DetectionPattern,
  PageState,
  ConsoleState,
  StateChangeEvent,
  StateDetectionResult,
  SessionState,
} from './auth';
