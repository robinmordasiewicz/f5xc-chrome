/**
 * URL Resolver
 *
 * Converts parsed intents into resolved URLs for deterministic navigation.
 * Uses the URL registry for shortcut and pattern resolution.
 */

import {
  ParsedIntent,
  URLResolution,
  BrowserAction,
  ResourceType,
  WorkspaceId,
  ActionVerb,
} from '../types';
import { URLRegistry, getURLRegistry } from '../registry/url-registry';
import { PageRegistry, getPageRegistry } from '../registry/page-registry';

/**
 * Resource type to URL shortcut mapping
 */
const RESOURCE_SHORTCUTS: Record<ResourceType, string | undefined> = {
  http_loadbalancer: 'http-lb',
  tcp_loadbalancer: 'tcp-lb',
  origin_pool: 'origin-pools',
  health_check: 'health-checks',
  waf_policy: 'waf',
  app_firewall: 'waf',
  service_policy: 'service-policies',
  rate_limiter: 'rate-limiters',
  api_protection: undefined,
  bot_defense: undefined,
  dns_zone: undefined,
  dns_loadbalancer: undefined,
  dns_record: undefined,
  cloud_site: undefined,
  site: undefined,
  namespace: 'admin-namespaces',
  certificate: undefined,
  cdn_distribution: 'cdn',
  cdn_cache_rule: undefined,
  user: 'admin-users',
  group: 'admin-groups',
  role: 'admin-roles',
  credential: 'admin-credentials',
  api_credential: 'admin-credentials',
  service_credential: 'admin-service-credentials',
  quota: 'admin-quotas',
  workspace: undefined,
  home: undefined,
  overview: undefined,
  security: 'security',
  performance: 'performance',
};

/**
 * Action to URL suffix mapping
 */
const ACTION_SUFFIXES: Record<ActionVerb, string | undefined> = {
  navigate: undefined,
  go: undefined,
  open: undefined,
  show: undefined,
  view: undefined,
  list: undefined,
  find: undefined,
  search: undefined,
  get: undefined,
  create: '/create',
  add: '/create',
  new: '/create',
  edit: undefined, // Requires resource ID
  update: undefined,
  modify: undefined,
  delete: undefined,
  remove: undefined,
  attach: undefined,
  detach: undefined,
  enable: undefined,
  disable: undefined,
  clone: undefined,
  export: undefined,
  import: undefined,
  crawl: undefined,
  refresh: undefined,
  status: undefined,
  login: undefined,
  logout: undefined,
};

/**
 * Workspace to URL path mapping
 */
const WORKSPACE_PATHS: Record<WorkspaceId, string> = {
  waap: '/web/workspaces/web-app-and-api-protection',
  mcn: '/web/workspaces/multi-cloud-network-connect',
  mac: '/web/workspaces/multi-cloud-app-connect',
  dns: '/web/workspaces/dns-management',
  cdn: '/web/workspaces/content-delivery-network',
  admin: '/web/workspaces/administration',
  bot: '/web/workspaces/bot-defense',
  data_intel: '/web/workspaces/data-intelligence',
  csd: '/web/workspaces/client-side-defense',
  scan: '/web/workspaces/web-app-scanning',
  nginx: '/web/workspaces/nginx-one',
  bigip: '/web/workspaces/bigip-utilities',
  ddos: '/web/workspaces/routed-ddos',
  observe: '/web/workspaces/observability',
  account: '/web/workspaces/account-protection',
  auth: '/web/workspaces/authentication-intelligence',
  traffic: '/web/workspaces/application-traffic-insight',
  delegated: '/web/workspaces/delegated-access',
  shared: '/web/workspaces/shared-configuration',
  audit: '/web/workspaces/audit-logs-alerts',
  distributed_apps: '/web/workspaces/distributed-apps',
};

/**
 * URL Resolver class
 */
export class URLResolver {
  private urlRegistry: URLRegistry;
  private pageRegistry: PageRegistry;
  private defaultNamespace: string;

  constructor(options?: { defaultNamespace?: string }) {
    this.urlRegistry = getURLRegistry();
    this.pageRegistry = getPageRegistry();
    this.defaultNamespace = options?.defaultNamespace ?? 'default';
  }

  /**
   * Resolve a parsed intent to a URL
   */
  resolve(intent: ParsedIntent): URLResolution {
    // Handle special resources first
    if (intent.resource === 'home') {
      return this.resolveHome();
    }

    if (intent.resource === 'workspace') {
      return this.resolveWorkspace(intent.workspace);
    }

    // Try shortcut resolution
    const shortcut = RESOURCE_SHORTCUTS[intent.resource];
    if (shortcut) {
      return this.resolveShortcut(shortcut, intent);
    }

    // Try workspace-based resolution
    if (intent.workspace) {
      return this.resolveWorkspaceResource(intent);
    }

    // Fallback to pattern-based resolution
    return this.resolveByPattern(intent);
  }

  /**
   * Resolve to home page
   */
  private resolveHome(): URLResolution {
    return {
      url: '/web/home',
      is_complete: true,
      resolution_source: 'static_route',
      page_metadata: this.pageRegistry.getHomePage(),
    };
  }

  /**
   * Resolve to a workspace
   */
  private resolveWorkspace(workspace?: WorkspaceId): URLResolution {
    if (!workspace) {
      return {
        url: '/web/home',
        is_complete: false,
        unresolved_variables: ['workspace'],
        resolution_source: 'workspace',
      };
    }

    const workspacePath = WORKSPACE_PATHS[workspace];
    if (workspacePath) {
      return {
        url: workspacePath,
        is_complete: true,
        resolution_source: 'workspace',
      };
    }

    // Try URL registry for workspace resolution
    const result = this.urlRegistry.resolveWorkspace(workspace);
    if (result.found) {
      return {
        url: result.url,
        is_complete: true,
        resolution_source: 'workspace',
      };
    }

    return {
      url: '',
      is_complete: false,
      unresolved_variables: ['workspace'],
      resolution_source: 'workspace',
    };
  }

  /**
   * Resolve using a shortcut
   */
  private resolveShortcut(shortcut: string, intent: ParsedIntent): URLResolution {
    const namespace = intent.namespace ?? this.defaultNamespace;

    const result = this.urlRegistry.resolveShortcut(shortcut, {
      namespace,
      resource_name: intent.resource_name ?? '',
    });

    if (result.success) {
      let url = result.url;

      // Apply action suffix if applicable
      const suffix = ACTION_SUFFIXES[intent.action];
      if (suffix && intent.action === 'create') {
        url = url + suffix;
      }

      // For edit/delete, append resource name
      if (['edit', 'delete', 'view'].includes(intent.action) && intent.resource_name) {
        url = url + '/' + intent.resource_name;
      }

      // Build post-navigation actions
      const postActions = this.buildPostNavigationActions(intent);

      return {
        url,
        is_complete: result.is_complete,
        unresolved_variables: result.unresolved_variables,
        resolution_source: 'shortcut',
        post_navigation_actions: postActions.length > 0 ? postActions : undefined,
      };
    }

    return {
      url: '',
      is_complete: false,
      unresolved_variables: ['namespace'],
      resolution_source: 'shortcut',
    };
  }

  /**
   * Resolve resource within a specific workspace
   */
  private resolveWorkspaceResource(intent: ParsedIntent): URLResolution {
    const workspace = intent.workspace ?? 'waap';
    const namespace = intent.namespace ?? this.defaultNamespace;
    const workspacePath = WORKSPACE_PATHS[workspace];

    if (!workspacePath) {
      return {
        url: '',
        is_complete: false,
        unresolved_variables: ['workspace'],
        resolution_source: 'workspace',
      };
    }

    // Build URL based on resource type
    const resourcePath = this.getResourcePath(intent.resource);
    if (resourcePath) {
      let url = `${workspacePath}/namespaces/${namespace}/${resourcePath}`;

      // Apply action suffix
      const suffix = ACTION_SUFFIXES[intent.action];
      if (suffix) {
        url = url + suffix;
      }

      return {
        url,
        is_complete: true,
        resolution_source: 'dynamic_route',
      };
    }

    return {
      url: workspacePath,
      is_complete: true,
      resolution_source: 'workspace',
    };
  }

  /**
   * Get resource path segment for a resource type
   */
  private getResourcePath(resource: ResourceType): string | undefined {
    const resourcePaths: Partial<Record<ResourceType, string>> = {
      http_loadbalancer: 'manage/load_balancers/http_loadbalancers',
      tcp_loadbalancer: 'manage/load_balancers/tcp_loadbalancers',
      origin_pool: 'manage/load_balancers/origin_pools',
      health_check: 'manage/load_balancers/health_checks',
      waf_policy: 'manage/app_firewall',
      app_firewall: 'manage/app_firewall',
      service_policy: 'manage/service_policies/service_policies',
      rate_limiter: 'manage/rate_limiter_policies',
      cdn_distribution: 'manage/cdn/distributions',
      security: 'overview/security',
      performance: 'overview/performance',
      overview: 'overview/summary',
    };

    return resourcePaths[resource];
  }

  /**
   * Resolve using pattern matching
   */
  private resolveByPattern(intent: ParsedIntent): URLResolution {
    const namespace = intent.namespace ?? this.defaultNamespace;

    // Try to build a dynamic URL
    const result = this.urlRegistry.resolve({
      target: intent.resource.replace(/_/g, '-'),
      namespace,
      resource_name: intent.resource_name,
    });

    if (result.success) {
      return {
        url: result.url,
        is_complete: result.is_complete,
        unresolved_variables: result.unresolved_variables,
        resolution_source: result.resolution_method === 'dynamic' ? 'dynamic_route' : 'static_route',
      };
    }

    // Fallback to workspace home
    const workspace = intent.workspace ?? 'waap';
    return {
      url: WORKSPACE_PATHS[workspace] ?? '/web/home',
      is_complete: false,
      unresolved_variables: ['resource_path'],
      resolution_source: 'workspace',
    };
  }

  /**
   * Build post-navigation actions based on intent
   */
  private buildPostNavigationActions(intent: ParsedIntent): BrowserAction[] {
    const actions: BrowserAction[] = [];

    // Wait for page load
    actions.push({
      type: 'wait',
      wait_text: 'Loading',
      timeout: 10000,
      description: 'Wait for page to load',
      required: true,
    });

    // Handle search/filter
    if (intent.parameters.filter_name) {
      actions.push({
        type: 'fill',
        value: String(intent.parameters.filter_name),
        description: 'Filter by name',
        required: false,
      });
    }

    // Handle create action - click create button
    if (intent.action === 'create') {
      actions.push({
        type: 'click',
        description: 'Click create button',
        required: true,
        retry: { max_attempts: 3, delay_ms: 1000 },
      });
    }

    return actions;
  }

  /**
   * Build full URL with tenant
   */
  buildFullUrl(path: string): string {
    return this.urlRegistry.buildFullUrl(path);
  }

  /**
   * Get the default namespace
   */
  getDefaultNamespace(): string {
    return this.defaultNamespace;
  }

  /**
   * Set the default namespace
   */
  setDefaultNamespace(namespace: string): void {
    this.defaultNamespace = namespace;
  }
}

/**
 * Singleton instance
 */
let defaultResolver: URLResolver | null = null;

/**
 * Get the default URL resolver instance
 */
export function getURLResolver(options?: { defaultNamespace?: string }): URLResolver {
  if (!defaultResolver) {
    defaultResolver = new URLResolver(options);
  }
  return defaultResolver;
}

/**
 * Reset the default resolver (useful for testing)
 */
export function resetURLResolver(): void {
  defaultResolver = null;
}

/**
 * Quick resolve function for simple usage
 */
export function resolveIntent(intent: ParsedIntent): URLResolution {
  return getURLResolver().resolve(intent);
}
