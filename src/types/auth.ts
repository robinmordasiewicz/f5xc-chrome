/**
 * Authentication and State Type Definitions
 *
 * Types for authentication flows and console state detection.
 * Based on authentication-flows.md and detection-patterns.json.
 */

/**
 * Authentication provider types
 */
export type AuthProvider =
  | 'native'
  | 'azure_sso'
  | 'google_sso'
  | 'okta_sso'
  | 'saml'
  | 'already_authenticated'
  | 'unknown';

/**
 * Authentication state
 */
export type AuthStatus =
  | 'authenticated'
  | 'login_required'
  | 'sso_redirect'
  | 'account_selection'
  | 'mfa_required'
  | 'session_expired'
  | 'access_denied'
  | 'connection_failed'
  | 'unknown';

/**
 * Authentication state detection result
 */
export interface AuthState {
  /** Current authentication status */
  status: AuthStatus;
  /** Whether user is authenticated */
  is_authenticated: boolean;
  /** Detected provider (if in login flow) */
  provider?: AuthProvider;
  /** Whether manual intervention is required */
  requires_manual_intervention: boolean;
  /** Redirect URL (for SSO flows) */
  redirect_url?: string;
  /** Message to display to user */
  message?: string;
  /** Current URL during auth flow */
  current_url: string;
  /** Detected username/email (if visible) */
  detected_user?: string;
}

/**
 * Authentication flow step
 */
export interface AuthFlowStep {
  /** Step number */
  step: number;
  /** Step description */
  description: string;
  /** Action to take */
  action: 'navigate' | 'click' | 'wait' | 'detect' | 'prompt_user';
  /** Target URL or element */
  target?: string;
  /** Expected result */
  expected_result: string;
  /** Timeout in milliseconds */
  timeout_ms: number;
  /** Whether step can be skipped */
  skippable: boolean;
}

/**
 * Authentication flow definition
 */
export interface AuthFlow {
  /** Provider this flow handles */
  provider: AuthProvider;
  /** Steps in the flow */
  steps: AuthFlowStep[];
  /** URL patterns that indicate this provider */
  url_patterns: string[];
  /** Success indicators */
  success_indicators: string[];
  /** Failure indicators */
  failure_indicators: string[];
}

/**
 * RBAC permission level
 */
export type PermissionLevel = 'full' | 'edit' | 'read_only' | 'none';

/**
 * RBAC permission state for current page/resource
 */
export interface PermissionState {
  /** Overall permission level */
  level: PermissionLevel;
  /** Whether user can create resources */
  can_create: boolean;
  /** Whether user can edit resources */
  can_edit: boolean;
  /** Whether user can delete resources */
  can_delete: boolean;
  /** Whether user can clone resources */
  can_clone: boolean;
  /** Whether in view-only mode */
  view_only: boolean;
  /** Actions that are locked */
  locked_actions: string[];
  /** Actions that are available */
  available_actions: string[];
  /** Permission indicators detected */
  detected_indicators: string[];
}

/**
 * Subscription tier
 */
export type SubscriptionTier =
  | 'standard'
  | 'advanced'
  | 'enterprise'
  | 'trial'
  | 'unknown';

/**
 * Feature availability badge
 */
export interface FeatureBadge {
  /** Badge type */
  type: 'limited_availability' | 'new' | 'early_access' | 'upgrade' | 'preview';
  /** Where badge was found */
  location: string;
  /** Associated feature/workspace */
  feature: string;
}

/**
 * Subscription state
 */
export interface SubscriptionState {
  /** Detected subscription tier */
  tier: SubscriptionTier;
  /** Feature badges found */
  badges: FeatureBadge[];
  /** Features that require upgrade */
  gated_features: string[];
  /** Features that are available */
  available_features: string[];
  /** Whether upgrade prompts are shown */
  upgrade_prompts_visible: boolean;
}

/**
 * Module/service status
 */
export type ModuleStatus =
  | 'enabled'
  | 'disabled'
  | 'pending_initialization'
  | 'not_configured'
  | 'error'
  | 'unknown';

/**
 * Module state
 */
export interface ModuleState {
  /** Module identifier */
  module_id: string;
  /** Module display name */
  name: string;
  /** Current status */
  status: ModuleStatus;
  /** Whether module is initialized */
  initialized: boolean;
  /** Available action (if not initialized) */
  available_action?: 'enable' | 'explore' | 'configure';
  /** Status badges */
  badges: string[];
  /** Status message */
  message?: string;
}

/**
 * Detection pattern for runtime state
 */
export interface DetectionPattern {
  /** Pattern identifier */
  id: string;
  /** What this pattern detects */
  detects: string;
  /** Selector to find the indicator */
  selector: string;
  /** Text patterns to match */
  text_patterns: string[];
  /** What the detection indicates */
  indicates: Record<string, unknown>;
}

/**
 * Page state snapshot
 */
export interface PageState {
  /** Current URL */
  url: string;
  /** Page title */
  title: string;
  /** Current workspace */
  workspace?: string;
  /** Current namespace */
  namespace?: string;
  /** Current resource type (if on resource page) */
  resource_type?: string;
  /** Current resource name (if on detail page) */
  resource_name?: string;
  /** Page type */
  page_type: string;
  /** Whether page is in loading state */
  is_loading: boolean;
  /** Whether page has error state */
  has_error: boolean;
  /** Error message if present */
  error_message?: string;
}

/**
 * Complete console state snapshot
 */
export interface ConsoleState {
  /** Authentication state */
  auth: AuthState;
  /** Current page state */
  page: PageState;
  /** RBAC permissions */
  permissions?: PermissionState;
  /** Subscription state */
  subscription?: SubscriptionState;
  /** Module states */
  modules: Record<string, ModuleState>;
  /** Timestamp of state capture */
  captured_at: string;
  /** How state was captured */
  capture_method: 'snapshot' | 'script' | 'hybrid';
}

/**
 * State change event
 */
export interface StateChangeEvent {
  /** What changed */
  type: 'auth' | 'page' | 'permission' | 'module';
  /** Previous state */
  previous: unknown;
  /** New state */
  current: unknown;
  /** Timestamp */
  timestamp: string;
}

/**
 * State detection result
 */
export interface StateDetectionResult {
  /** Whether detection succeeded */
  success: boolean;
  /** Detected state */
  state: ConsoleState;
  /** Detection patterns that matched */
  matched_patterns: string[];
  /** Warnings or notes */
  warnings: string[];
  /** Time taken for detection */
  detection_time_ms: number;
}

/**
 * Session state for persistence
 */
export interface SessionState {
  /** Session identifier */
  session_id: string;
  /** Tenant URL */
  tenant_url: string;
  /** Whether authenticated */
  is_authenticated: boolean;
  /** Current user (if known) */
  user?: string;
  /** Default namespace */
  default_namespace?: string;
  /** Last known console state */
  last_state?: ConsoleState;
  /** Session start time */
  started_at: string;
  /** Last activity time */
  last_activity: string;
}
