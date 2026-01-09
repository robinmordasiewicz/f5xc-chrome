/**
 * URL Registry
 *
 * Loads and queries the URL sitemap for deterministic navigation.
 * Resolves shortcuts, workspaces, and dynamic routes to full URLs.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  URLSitemap,
  StaticRoute,
  DynamicRoute,
  URLResolutionRequest,
  URLResolutionResult,
  PatternMatchResult,
  WorkspaceResolution,
  URLBuilderOptions,
} from '../types';

/**
 * Default path to URL sitemap JSON file
 */
const DEFAULT_SITEMAP_PATH = path.join(
  __dirname,
  '../../skills/xc-console/url-sitemap.json'
);

/**
 * URL Registry class for deterministic URL resolution
 */
export class URLRegistry {
  private sitemap: URLSitemap;
  private tenantUrl: string;
  private defaultNamespace: string;

  constructor(options?: URLBuilderOptions) {
    this.sitemap = this.loadSitemap();
    this.tenantUrl = options?.tenant_url ?? `https://${this.sitemap.tenant}`;
    this.defaultNamespace = options?.default_namespace ?? 'default';
  }

  /**
   * Load the URL sitemap from JSON file
   */
  private loadSitemap(sitemapPath?: string): URLSitemap {
    const filePath = sitemapPath ?? DEFAULT_SITEMAP_PATH;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as URLSitemap;
    } catch (error) {
      throw new Error(`Failed to load URL sitemap from ${filePath}: ${error}`);
    }
  }

  /**
   * Resolve a target to a full URL
   */
  resolve(request: URLResolutionRequest): URLResolutionResult {
    const { target, variables = {}, namespace, resource_name } = request;

    // Merge convenience variables into main variables
    const mergedVars = { ...variables };
    if (namespace) {
      mergedVars.namespace = namespace;
    }
    if (resource_name) {
      mergedVars.resource_name = resource_name;
    }

    // Try resolution methods in order of specificity
    // 1. Direct static route match
    const staticResult = this.resolveStaticRoute(target);
    if (staticResult.success) {
      return staticResult;
    }

    // 2. Workspace alias
    const workspaceResult = this.resolveWorkspace(target);
    if (workspaceResult.found) {
      return {
        success: true,
        url: workspaceResult.url,
        is_complete: true,
        unresolved_variables: [],
        resolution_method: 'workspace',
        page_type: 'workspace',
      };
    }

    // 3. Resource shortcut
    const shortcutResult = this.resolveShortcut(target, mergedVars);
    if (shortcutResult.success) {
      return shortcutResult;
    }

    // 4. Dynamic route pattern matching
    const dynamicResult = this.resolveDynamicRoute(target, mergedVars);
    if (dynamicResult.success) {
      return dynamicResult;
    }

    // 5. Treat as direct path
    if (target.startsWith('/')) {
      return {
        success: true,
        url: target,
        is_complete: true,
        unresolved_variables: [],
        resolution_method: 'direct',
      };
    }

    return {
      success: false,
      url: '',
      is_complete: false,
      unresolved_variables: [],
      resolution_method: 'direct',
      error: `Could not resolve target: ${target}`,
    };
  }

  /**
   * Resolve a static route by exact path match
   */
  resolveStaticRoute(pathOrAlias: string): URLResolutionResult {
    const route = this.sitemap.static_routes[pathOrAlias];
    if (route) {
      return {
        success: true,
        url: pathOrAlias,
        is_complete: true,
        unresolved_variables: [],
        resolution_method: 'static',
        page_type: route.page_type,
      };
    }

    return {
      success: false,
      url: '',
      is_complete: false,
      unresolved_variables: [],
      resolution_method: 'static',
    };
  }

  /**
   * Resolve a workspace alias to full URL
   */
  resolveWorkspace(alias: string): WorkspaceResolution {
    const normalizedAlias = alias.toLowerCase().replace(/[_\s]/g, '-');

    // Check direct mapping
    const mapping = this.sitemap.workspace_mapping[normalizedAlias];
    if (mapping) {
      return {
        workspace: normalizedAlias,
        url: mapping,
        found: true,
      };
    }

    // Check workspace name variations
    for (const [key, url] of Object.entries(this.sitemap.workspace_mapping)) {
      if (
        key.includes(normalizedAlias) ||
        normalizedAlias.includes(key) ||
        url.toLowerCase().includes(normalizedAlias)
      ) {
        return {
          workspace: key,
          url,
          found: true,
        };
      }
    }

    return {
      workspace: alias,
      url: '',
      found: false,
    };
  }

  /**
   * Resolve a resource shortcut with variable substitution
   */
  resolveShortcut(
    shortcut: string,
    variables: Record<string, string>
  ): URLResolutionResult {
    const normalizedShortcut = shortcut.toLowerCase().replace(/[_\s]/g, '-');
    const template = this.sitemap.resource_shortcuts[normalizedShortcut];

    if (!template) {
      return {
        success: false,
        url: '',
        is_complete: false,
        unresolved_variables: [],
        resolution_method: 'shortcut',
      };
    }

    return this.substituteVariables(template, variables, 'shortcut');
  }

  /**
   * Match and resolve a dynamic route pattern
   */
  resolveDynamicRoute(
    target: string,
    variables: Record<string, string>
  ): URLResolutionResult {
    // If target is a template pattern, substitute directly
    if (target.includes('{')) {
      return this.substituteVariables(target, variables, 'dynamic');
    }

    // Try to find a matching dynamic route pattern
    for (const route of this.sitemap.dynamic_routes) {
      const match = this.matchPattern(target, route);
      if (match.matched) {
        // Merge extracted variables with provided ones
        const combinedVars = { ...match.extracted_variables, ...variables };
        return this.substituteVariables(route.pattern, combinedVars, 'dynamic');
      }
    }

    return {
      success: false,
      url: '',
      is_complete: false,
      unresolved_variables: [],
      resolution_method: 'dynamic',
    };
  }

  /**
   * Match a URL against a dynamic route pattern
   */
  matchPattern(url: string, route: DynamicRoute): PatternMatchResult {
    // Convert pattern to regex
    const regexPattern = route.pattern.replace(
      /\{(\w+)\}/g,
      (_match, name) => `(?<${name}>[^/]+)`
    );

    const regex = new RegExp(`^${regexPattern}$`);
    const match = url.match(regex);

    if (match?.groups) {
      return {
        matched: true,
        pattern: route,
        extracted_variables: match.groups as Record<string, string>,
        confidence: 1.0,
      };
    }

    return {
      matched: false,
      confidence: 0,
    };
  }

  /**
   * Substitute variables into a URL template
   */
  private substituteVariables(
    template: string,
    variables: Record<string, string>,
    method: 'static' | 'dynamic' | 'shortcut' | 'workspace' | 'direct'
  ): URLResolutionResult {
    let url = template;
    const unresolved: string[] = [];

    // Find all variable placeholders
    const variablePattern = /\{(\w+)\}/g;
    let match;

    while ((match = variablePattern.exec(template)) !== null) {
      const varName = match[1];
      const value = variables[varName] ?? this.getDefaultValue(varName);

      if (value) {
        url = url.replace(`{${varName}}`, value);
      } else {
        unresolved.push(varName);
      }
    }

    return {
      success: true,
      url,
      is_complete: unresolved.length === 0,
      unresolved_variables: unresolved,
      resolution_method: method,
    };
  }

  /**
   * Get default value for common variables
   */
  private getDefaultValue(varName: string): string | undefined {
    const defaults: Record<string, string> = {
      namespace: this.defaultNamespace,
    };
    return defaults[varName];
  }

  /**
   * Build a full URL with tenant prefix
   */
  buildFullUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${this.tenantUrl}${path}`;
  }

  /**
   * Get all static routes
   */
  getStaticRoutes(): Record<string, StaticRoute> {
    return this.sitemap.static_routes;
  }

  /**
   * Get all dynamic route patterns
   */
  getDynamicRoutes(): DynamicRoute[] {
    return this.sitemap.dynamic_routes;
  }

  /**
   * Get all workspace mappings
   */
  getWorkspaceMappings(): Record<string, string> {
    return this.sitemap.workspace_mapping;
  }

  /**
   * Get all resource shortcuts
   */
  getResourceShortcuts(): Record<string, string> {
    return this.sitemap.resource_shortcuts;
  }

  /**
   * Get sitemap version info
   */
  getVersion(): string {
    return this.sitemap.version;
  }

  /**
   * Get last crawl timestamp
   */
  getLastCrawled(): string {
    return this.sitemap.last_crawled;
  }

  /**
   * Get crawl coverage statistics
   */
  getCrawlCoverage() {
    return this.sitemap.crawl_coverage;
  }

  /**
   * Check if a workspace needs crawling
   */
  needsCrawl(workspace: string): boolean {
    const coverage = this.sitemap.crawl_coverage;

    switch (workspace) {
      case 'waap':
        return !coverage.waap_complete;
      case 'administration':
      case 'admin':
        return !coverage.administration_complete;
      case 'mcn':
        return !coverage.mcn_complete;
      case 'dns':
        return !coverage.dns_complete;
      default:
        return coverage.needs_full_crawl;
    }
  }

  /**
   * Get workspace URL by alias
   */
  getWorkspaceUrl(alias: string): string | undefined {
    return this.sitemap.workspace_mapping[alias.toLowerCase()];
  }

  /**
   * Get shortcut URL template
   */
  getShortcutTemplate(shortcut: string): string | undefined {
    return this.sitemap.resource_shortcuts[shortcut.toLowerCase()];
  }

  /**
   * List all available shortcuts
   */
  listShortcuts(): string[] {
    return Object.keys(this.sitemap.resource_shortcuts);
  }

  /**
   * List all available workspaces
   */
  listWorkspaces(): string[] {
    return Object.keys(this.sitemap.workspace_mapping);
  }
}

/**
 * Singleton instance for convenience
 */
let defaultRegistry: URLRegistry | null = null;

/**
 * Get the default URL registry instance
 */
export function getURLRegistry(options?: URLBuilderOptions): URLRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new URLRegistry(options);
  }
  return defaultRegistry;
}

/**
 * Reset the default registry (useful for testing)
 */
export function resetURLRegistry(): void {
  defaultRegistry = null;
}
