/**
 * Intent Type Definitions
 *
 * Types for natural language intent parsing and action execution.
 */

import { DeterministicSelector, PageMetadata } from './navigation';

/**
 * Supported action verbs for console operations
 */
export type ActionVerb =
  // Navigation actions
  | 'navigate'
  | 'go'
  | 'open'
  | 'show'
  | 'view'
  // List actions
  | 'list'
  | 'find'
  | 'search'
  | 'get'
  // CRUD actions
  | 'create'
  | 'add'
  | 'new'
  | 'edit'
  | 'update'
  | 'modify'
  | 'delete'
  | 'remove'
  // Resource operations
  | 'attach'
  | 'detach'
  | 'enable'
  | 'disable'
  | 'clone'
  | 'export'
  | 'import'
  // System actions
  | 'crawl'
  | 'refresh'
  | 'status'
  | 'login'
  | 'logout';

/**
 * Resource types in F5 XC Console
 */
export type ResourceType =
  // Load Balancing
  | 'http_loadbalancer'
  | 'tcp_loadbalancer'
  | 'origin_pool'
  | 'health_check'
  // Security
  | 'waf_policy'
  | 'app_firewall'
  | 'service_policy'
  | 'rate_limiter'
  | 'api_protection'
  | 'bot_defense'
  // DNS
  | 'dns_zone'
  | 'dns_loadbalancer'
  | 'dns_record'
  // Infrastructure
  | 'cloud_site'
  | 'site'
  | 'namespace'
  | 'certificate'
  // CDN
  | 'cdn_distribution'
  | 'cdn_cache_rule'
  // Administration
  | 'user'
  | 'group'
  | 'role'
  | 'credential'
  | 'api_credential'
  | 'service_credential'
  | 'quota'
  // Navigation targets (not resources)
  | 'workspace'
  | 'home'
  | 'overview'
  | 'security'
  | 'performance';

/**
 * Workspace identifiers
 */
export type WorkspaceId =
  | 'waap'
  | 'mcn'
  | 'mac'
  | 'dns'
  | 'cdn'
  | 'admin'
  | 'bot'
  | 'data_intel'
  | 'csd'
  | 'scan'
  | 'nginx'
  | 'bigip'
  | 'ddos'
  | 'observe'
  | 'account'
  | 'auth'
  | 'traffic'
  | 'delegated'
  | 'shared'
  | 'audit'
  | 'distributed_apps';

/**
 * Parsed intent from natural language input
 */
export interface ParsedIntent {
  /** Primary action verb */
  action: ActionVerb;
  /** Target resource type */
  resource: ResourceType;
  /** Specific resource name (if mentioned) */
  resource_name?: string;
  /** Target namespace */
  namespace?: string;
  /** Target workspace */
  workspace?: WorkspaceId;
  /** Additional parameters extracted from input */
  parameters: Record<string, string | boolean | number>;
  /** Confidence score 0-1 */
  confidence: number;
  /** Which patterns matched */
  matched_patterns: string[];
  /** Original raw input */
  raw_input: string;
  /** Disambiguation needed? */
  needs_clarification: boolean;
  /** Clarification questions if needed */
  clarification_questions?: string[];
}

/**
 * Intent pattern for matching natural language
 */
export interface IntentPattern {
  /** Pattern identifier */
  id: string;
  /** Regex patterns to match */
  patterns: RegExp[];
  /** Action this pattern maps to */
  action: ActionVerb;
  /** Resource type this pattern maps to */
  resource?: ResourceType;
  /** Groups to extract from regex */
  extract_groups: {
    group_index: number;
    parameter: string;
  }[];
  /** Weight for confidence scoring */
  weight: number;
  /** Example inputs that match */
  examples: string[];
}

/**
 * Browser action to execute
 */
export interface BrowserAction {
  /** Action type */
  type: 'navigate' | 'click' | 'fill' | 'select' | 'wait' | 'verify' | 'screenshot' | 'scroll';
  /** Target element (for click, fill, select) */
  target?: DeterministicSelector;
  /** Value to input (for fill, select) */
  value?: string;
  /** URL to navigate to (for navigate) */
  url?: string;
  /** Text to wait for (for wait) */
  wait_text?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Human-readable description */
  description: string;
  /** Whether action is required or optional */
  required: boolean;
  /** Retry configuration */
  retry?: {
    max_attempts: number;
    delay_ms: number;
  };
}

/**
 * URL resolution result with post-navigation actions
 */
export interface URLResolution {
  /** Resolved URL path */
  url: string;
  /** Whether URL is complete (no unresolved variables) */
  is_complete: boolean;
  /** Variables that still need values */
  unresolved_variables?: string[];
  /** Page metadata if known */
  page_metadata?: PageMetadata;
  /** Actions to perform after navigation */
  post_navigation_actions?: BrowserAction[];
  /** How the URL was resolved */
  resolution_source: 'static_route' | 'dynamic_route' | 'shortcut' | 'workspace' | 'direct';
}

/**
 * Action execution result
 */
export interface ActionResult {
  /** Whether action succeeded */
  success: boolean;
  /** Action that was executed */
  action: BrowserAction;
  /** Time taken in milliseconds */
  duration_ms: number;
  /** Error message if failed */
  error?: string;
  /** Screenshot path if taken */
  screenshot_path?: string;
  /** Additional result data */
  data?: Record<string, unknown>;
}

/**
 * Execution plan for a parsed intent
 */
export interface ExecutionPlan {
  /** Original intent */
  intent: ParsedIntent;
  /** Resolved URL */
  url_resolution: URLResolution;
  /** Sequence of actions to execute */
  actions: BrowserAction[];
  /** Estimated total duration */
  estimated_duration_ms: number;
  /** Whether authentication is required */
  requires_auth: boolean;
  /** Prerequisites that must be met */
  prerequisites?: string[];
  /** Validation checks after execution */
  validation_checks?: BrowserAction[];
}

/**
 * Execution result for a complete plan
 */
export interface ExecutionResult {
  /** Whether execution succeeded */
  success: boolean;
  /** The plan that was executed */
  plan: ExecutionPlan;
  /** Results for each action */
  action_results: ActionResult[];
  /** Total duration in milliseconds */
  total_duration_ms: number;
  /** Final URL after execution */
  final_url: string;
  /** Error message if failed */
  error?: string;
  /** Summary for user */
  summary: string;
}

/**
 * Resource synonym mapping
 */
export interface ResourceSynonyms {
  /** Canonical resource type */
  canonical: ResourceType;
  /** Alternative names/phrases */
  synonyms: string[];
  /** Workspace context (if resource is workspace-specific) */
  workspace_context?: WorkspaceId[];
}

/**
 * Action synonym mapping
 */
export interface ActionSynonyms {
  /** Canonical action verb */
  canonical: ActionVerb;
  /** Alternative verbs/phrases */
  synonyms: string[];
}
