// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * URL Registry Type Definitions
 *
 * Types for F5 XC Console URL routing and resolution.
 * Based on url-sitemap.json structure.
 */

import { PageType } from './navigation';

/**
 * Static route entry - fixed URL path
 */
export interface StaticRoute {
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Workspace identifier (for workspace pages) */
  workspace?: string;
  /** Section within workspace */
  section?: string;
  /** Page type classification */
  page_type: PageType;
}

/**
 * Variable definition in dynamic routes
 */
export interface RouteVariable {
  /** Variable name */
  name: string;
  /** Allowed values (array) or 'user-defined' for free-form input */
  values: string[] | 'user-defined';
  /** Whether this variable is required */
  required: boolean;
  /** Default value if not provided */
  default?: string;
}

/**
 * Dynamic route pattern with variable placeholders
 */
export interface DynamicRoute {
  /** URL pattern with {variable} placeholders */
  pattern: string;
  /** Human-readable description */
  description: string;
  /** Variable definitions */
  variables: Record<string, string[] | 'user-defined'>;
  /** Example URL with substituted values */
  example: string;
}

/**
 * Workspace alias to URL mapping
 */
export interface WorkspaceMapping {
  /** Short alias (e.g., 'waap', 'mcn') */
  alias: string;
  /** Full URL path */
  path: string;
}

/**
 * Resource shortcut - quick access to common resources
 */
export interface ResourceShortcut {
  /** Shortcut name (e.g., 'http-lb', 'waf') */
  name: string;
  /** URL template (may contain {namespace} placeholder) */
  template: string;
  /** Required variables */
  required_variables: string[];
}

/**
 * Crawl coverage statistics
 */
export interface CrawlCoverage {
  /** Number of static routes discovered */
  static_routes_discovered: number;
  /** Number of dynamic patterns defined */
  dynamic_patterns_defined: number;
  /** Number of workspaces mapped */
  workspaces_mapped: number;
  /** Number of shortcuts defined */
  shortcuts_defined: number;
  /** WAAP workspace complete */
  waap_complete: boolean;
  /** Administration workspace complete */
  administration_complete: boolean;
  /** MCN workspace complete */
  mcn_complete: boolean;
  /** DNS workspace complete */
  dns_complete: boolean;
  /** Whether full crawl is needed */
  needs_full_crawl: boolean;
  /** Selector coverage percentages */
  selector_coverage: {
    administration: string;
    waap: string;
    overall: string;
    [workspace: string]: string;
  };
  /** Additional notes */
  note?: string;
}

/**
 * Complete URL sitemap structure
 * Matches url-sitemap.json
 */
export interface URLSitemap {
  /** Sitemap version */
  version: string;
  /** Tenant URL */
  tenant: string;
  /** Last crawl timestamp */
  last_crawled: string;
  /** Description */
  description: string;
  /** Static route definitions */
  static_routes: Record<string, StaticRoute>;
  /** Dynamic route patterns */
  dynamic_routes: DynamicRoute[];
  /** Workspace alias mappings */
  workspace_mapping: Record<string, string>;
  /** Resource shortcuts */
  resource_shortcuts: Record<string, string>;
  /** Crawl coverage stats */
  crawl_coverage: CrawlCoverage;
}

/**
 * URL resolution request
 */
export interface URLResolutionRequest {
  /** Target (can be shortcut, workspace alias, or full path) */
  target: string;
  /** Variables to substitute */
  variables?: Record<string, string>;
  /** Namespace (convenience for common variable) */
  namespace?: string;
  /** Resource name (convenience for common variable) */
  resource_name?: string;
}

/**
 * URL resolution result
 */
export interface URLResolutionResult {
  /** Whether resolution succeeded */
  success: boolean;
  /** Resolved URL (may still have unresolved variables) */
  url: string;
  /** Whether the URL is complete (no unresolved variables) */
  is_complete: boolean;
  /** Variables that still need values */
  unresolved_variables: string[];
  /** How the URL was resolved */
  resolution_method: 'static' | 'dynamic' | 'shortcut' | 'workspace' | 'direct';
  /** Matched pattern (for dynamic routes) */
  matched_pattern?: string;
  /** Page metadata if available */
  page_type?: PageType;
  /** Error message if failed */
  error?: string;
}

/**
 * URL pattern match result
 */
export interface PatternMatchResult {
  /** Whether pattern matched */
  matched: boolean;
  /** The matched pattern */
  pattern?: DynamicRoute;
  /** Extracted variables from URL */
  extracted_variables?: Record<string, string>;
  /** Match confidence (0-1) */
  confidence: number;
}

/**
 * Workspace resolution result
 */
export interface WorkspaceResolution {
  /** Resolved workspace identifier */
  workspace: string;
  /** Full workspace URL */
  url: string;
  /** Display name */
  display_name?: string;
  /** Whether workspace was found */
  found: boolean;
}

/**
 * URL builder options
 */
export interface URLBuilderOptions {
  /** Base tenant URL */
  tenant_url?: string;
  /** Default namespace */
  default_namespace?: string;
  /** Whether to validate variables against allowed values */
  validate_variables?: boolean;
  /** Whether to return partial URLs (with unresolved variables) */
  allow_partial?: boolean;
}
