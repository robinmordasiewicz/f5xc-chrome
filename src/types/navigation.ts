/**
 * Navigation Type Definitions
 *
 * Types for F5 XC Console navigation metadata and element selectors.
 * Based on console-navigation-metadata.json structure.
 */

/**
 * Selector type priority chain - ordered from most to least reliable
 * Higher priority selectors are more stable across sessions
 */
export type SelectorType =
  | 'name'
  | 'aria_label'
  | 'href_path'
  | 'text_match'
  | 'placeholder'
  | 'css'
  | 'ref';

/**
 * Input types for form elements
 */
export type InputType =
  | 'textbox'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'listbox'
  | 'spinbutton'
  | 'combobox'
  | 'switch';

/**
 * Page type classification
 */
export type PageType =
  | 'home'
  | 'workspace'
  | 'list'
  | 'form'
  | 'detail'
  | 'admin_page'
  | 'catalog';

/**
 * Selector definitions as stored in metadata
 */
export interface SelectorDefinition {
  /** Data-testid attribute (most reliable when present) */
  data_testid: string | null;
  /** Aria-label attribute (good accessibility-based selector) */
  aria_label: string | null;
  /** Text content match */
  text_match: string | null;
  /** Href path for links */
  href_path?: string | null;
  /** Placeholder text for inputs */
  placeholder?: string | null;
  /** CSS selector (less stable, use as fallback) */
  css: string | null;
}

/**
 * Deterministic selector with type and confidence
 * Used for runtime selector resolution
 */
export interface DeterministicSelector {
  /** Selector type from priority chain */
  type: SelectorType;
  /** The actual selector value */
  value: string;
  /** Confidence score 0-1 (higher = more reliable) */
  confidence: number;
}

/**
 * Element metadata as stored in navigation JSON
 */
export interface ElementMetadata {
  /** Session-specific ref (fallback only, changes between sessions) */
  ref?: string;
  /** Human-readable element description */
  description?: string;
  /** Element name (if applicable) */
  name?: string;
  /** URL the element navigates to */
  url?: string;
  /** Input type for form fields */
  type?: InputType;
  /** Whether the field is required */
  required?: boolean;
  /** Selector definitions for finding the element */
  selectors: SelectorDefinition;
}

/**
 * Workspace card metadata
 */
export interface WorkspaceCard {
  /** Session-specific ref */
  ref: string;
  /** Display name of the workspace */
  name: string;
  /** URL path to the workspace */
  url?: string;
  /** Selectors for finding the card */
  selectors: SelectorDefinition;
}

/**
 * Sidebar item metadata
 */
export interface SidebarItem {
  /** Session-specific ref */
  ref: string;
  /** Sidebar item name */
  name: string;
  /** URL path */
  url?: string;
  /** Href path selector */
  href_path?: string;
  /** Child items (for nested navigation) */
  children?: Record<string, SidebarItem>;
  /** Selectors for finding the item */
  selectors?: SelectorDefinition;
}

/**
 * Form field metadata
 */
export interface FormField {
  /** Session-specific ref */
  ref?: string;
  /** Field label/name */
  label?: string;
  /** Input type */
  type: InputType;
  /** Whether field is required */
  required?: boolean;
  /** Default value */
  default_value?: string;
  /** Validation pattern */
  pattern?: string;
  /** Available options for select/radio/checkbox */
  options?: string[];
  /** Selectors for finding the field */
  selectors: SelectorDefinition;
}

/**
 * Form section metadata
 */
export interface FormSection {
  /** Section name */
  name: string;
  /** Section description */
  description?: string;
  /** Whether section is collapsed by default */
  collapsed?: boolean;
  /** Fields in this section */
  fields: Record<string, FormField>;
}

/**
 * Form metadata
 */
export interface FormMetadata {
  /** Dialog/modal element ref */
  dialog_ref?: string;
  /** Form tabs (if tabbed) */
  tabs?: string[];
  /** Section tabs within form */
  section_tabs?: string[];
  /** Form sections */
  sections?: Record<string, FormSection>;
  /** Flat fields (if not sectioned) */
  fields?: Record<string, FormField>;
  /** Form actions (buttons) */
  actions?: {
    cancel?: ElementMetadata;
    submit?: ElementMetadata;
    [key: string]: ElementMetadata | undefined;
  };
}

/**
 * Table column metadata
 */
export interface TableColumn {
  /** Column header text */
  header: string;
  /** Column key/identifier */
  key: string;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Whether column is filterable */
  filterable?: boolean;
}

/**
 * Table metadata
 */
export interface TableMetadata {
  /** Table columns */
  columns: TableColumn[];
  /** Available row actions */
  row_actions?: string[];
  /** Pagination config */
  pagination?: {
    enabled: boolean;
    page_sizes: number[];
    selector?: string;
  };
  /** Search/filter input */
  search?: ElementMetadata;
}

/**
 * Page metadata for a specific console page
 */
export interface PageMetadata {
  /** Full URL path */
  url: string;
  /** Page title */
  title?: string;
  /** Workspace identifier */
  workspace?: string;
  /** Page type classification */
  page_type: PageType;
  /** Interactive elements on the page */
  elements?: Record<string, ElementMetadata>;
  /** Table structure if present */
  table?: TableMetadata;
  /** Form structure if present */
  form?: FormMetadata;
  /** Sidebar navigation */
  sidebar?: Record<string, SidebarItem>;
}

/**
 * Workspace metadata
 */
export interface WorkspaceMetadata {
  /** URL path to workspace */
  url: string;
  /** Display name */
  name: string;
  /** Sidebar navigation structure */
  sidebar?: {
    sections: Record<string, SidebarItem>;
  };
  /** Namespace selector (if applicable) */
  namespace_selector?: ElementMetadata;
}

/**
 * Home page metadata
 */
export interface HomePageMetadata {
  /** Home page URL */
  url: string;
  /** Home page elements */
  elements: Record<string, ElementMetadata>;
  /** Workspace cards */
  workspace_cards: Record<string, WorkspaceCard>;
}

/**
 * Authentication configuration
 */
export interface AuthenticationConfig {
  /** Authentication method */
  method: 'multi_provider' | 'single_provider';
  /** Supported authentication providers */
  supported: string[];
  /** Login URL */
  login_url: string;
  /** Whether already authorized */
  auto_authorized: boolean;
  /** Reference to auth flows documentation */
  see_also?: string;
}

/**
 * Complete navigation metadata structure
 * Matches console-navigation-metadata.json
 */
export interface NavigationMetadata {
  /** Metadata version */
  version: string;
  /** Tenant URL */
  tenant: string;
  /** Last crawl timestamp */
  last_crawled: string;
  /** Deterministic navigation config */
  deterministic_navigation: {
    enabled: boolean;
    description: string;
    note: string;
  };
  /** Selector priority order */
  selector_priority: SelectorType[];
  /** Authentication configuration */
  authentication: AuthenticationConfig;
  /** Home page metadata */
  home_page: HomePageMetadata;
  /** Workspace-specific metadata */
  workspaces?: Record<string, WorkspaceMetadata>;
  /** Form definitions */
  forms?: Record<string, FormMetadata>;
  /** Crawl summary statistics */
  crawl_summary?: {
    pages_crawled: number;
    forms_extracted: number;
    total_refs: number;
    workspaces_discovered: number;
    sidebar_items: number;
    form_fields: number;
    stable_selector_coverage: number;
  };
}

/**
 * Result of selector resolution
 */
export interface SelectorResolutionResult {
  /** Whether an element was found */
  found: boolean;
  /** The element's uid (from snapshot) */
  uid?: string;
  /** Which selector succeeded */
  used_selector?: DeterministicSelector;
  /** All selectors that were tried */
  tried_selectors: DeterministicSelector[];
  /** Error message if not found */
  error?: string;
}
