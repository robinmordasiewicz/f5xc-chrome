// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Mock Registry
 *
 * Mock implementations for URL/Page registries for unit testing.
 * Provides deterministic test data without file I/O.
 */

import type {
  URLSitemap,
  StaticRoute,
  DynamicRoute,
  CrawlCoverage,
  PageMetadata,
  NavigationMetadata,
  WorkspaceMetadata,
  FormMetadata,
  SelectorDefinition,
  FormField,
  TableColumn,
  HomePageMetadata,
  AuthenticationConfig,
  PageType,
} from '../../src/types';

/**
 * Create a base selector definition
 */
function createSelector(
  options: Partial<SelectorDefinition> = {}
): SelectorDefinition {
  return {
    data_testid: options.data_testid ?? null,
    aria_label: options.aria_label ?? null,
    text_match: options.text_match ?? null,
    href_path: options.href_path ?? null,
    placeholder: options.placeholder ?? null,
    css: options.css ?? null,
  };
}

/**
 * Mock URL sitemap data
 */
export const mockUrlSitemap: URLSitemap = {
  version: '1.0.0',
  tenant: 'https://acmecorp.console.ves.volterra.io',
  last_crawled: '2024-01-01T00:00:00Z',
  description: 'Mock URL sitemap for testing',
  static_routes: {
    '/': {
      title: 'Sign In',
      page_type: 'home',
    },
    '/web/workspaces': {
      title: 'Workspaces',
      page_type: 'home',
    },
    '/web/workspaces/web-app-and-api-protection/overview': {
      title: 'WAAP Overview',
      workspace: 'waap',
      page_type: 'workspace',
    },
    '/web/workspaces/administration/overview': {
      title: 'Administration Overview',
      workspace: 'admin',
      page_type: 'admin_page',
    },
  },
  dynamic_routes: [
    {
      pattern: '/web/workspaces/web-app-and-api-protection/namespaces/{namespace}/load_balancers/http_loadbalancers',
      description: 'HTTP Load Balancer List',
      variables: { namespace: 'user-defined' },
      example: '/web/workspaces/web-app-and-api-protection/namespaces/production/load_balancers/http_loadbalancers',
    },
    {
      pattern: '/web/workspaces/web-app-and-api-protection/namespaces/{namespace}/load_balancers/http_loadbalancers/create',
      description: 'Create HTTP Load Balancer',
      variables: { namespace: 'user-defined' },
      example: '/web/workspaces/web-app-and-api-protection/namespaces/production/load_balancers/http_loadbalancers/create',
    },
    {
      pattern: '/web/workspaces/web-app-and-api-protection/namespaces/{namespace}/load_balancers/http_loadbalancers/{name}/edit',
      description: 'Edit HTTP Load Balancer',
      variables: { namespace: 'user-defined', name: 'user-defined' },
      example: '/web/workspaces/web-app-and-api-protection/namespaces/production/load_balancers/http_loadbalancers/web-frontend/edit',
    },
    {
      pattern: '/web/workspaces/web-app-and-api-protection/namespaces/{namespace}/origin_pools',
      description: 'Origin Pools List',
      variables: { namespace: 'user-defined' },
      example: '/web/workspaces/web-app-and-api-protection/namespaces/production/origin_pools',
    },
  ],
  workspace_mapping: {
    waap: '/web/workspaces/web-app-and-api-protection',
    mcn: '/web/workspaces/multi-cloud-networking',
    admin: '/web/workspaces/administration',
    cdn: '/web/workspaces/cdn',
  },
  resource_shortcuts: {
    'http-lb': '/web/workspaces/web-app-and-api-protection/namespaces/{namespace}/load_balancers/http_loadbalancers',
    'origin-pool': '/web/workspaces/web-app-and-api-protection/namespaces/{namespace}/origin_pools',
    waf: '/web/workspaces/web-app-and-api-protection/namespaces/{namespace}/waf',
  },
  crawl_coverage: {
    static_routes_discovered: 25,
    dynamic_patterns_defined: 15,
    workspaces_mapped: 4,
    shortcuts_defined: 10,
    waap_complete: true,
    administration_complete: true,
    mcn_complete: false,
    dns_complete: false,
    needs_full_crawl: false,
    selector_coverage: {
      administration: '95%',
      waap: '90%',
      overall: '85%',
    },
  },
};

/**
 * Mock page metadata
 */
export const mockPageMetadata: Record<string, PageMetadata> = {
  '/web/workspaces': {
    url: '/web/workspaces',
    page_type: 'home',
    title: 'Workspaces',
    elements: {
      waap_workspace: {
        description: 'WAAP workspace card',
        url: '/web/workspaces/web-app-and-api-protection',
        selectors: createSelector({
          href_path: '/web/workspaces/web-app-and-api-protection',
          text_match: 'Web App & API Protection',
        }),
      },
      mcn_workspace: {
        description: 'MCN workspace card',
        url: '/web/workspaces/multi-cloud-networking',
        selectors: createSelector({
          href_path: '/web/workspaces/multi-cloud-networking',
          text_match: 'Multi-Cloud Networking',
        }),
      },
    },
  },
  '/web/workspaces/web-app-and-api-protection/namespaces/{namespace}/load_balancers/http_loadbalancers': {
    url: '/web/workspaces/web-app-and-api-protection/namespaces/{namespace}/load_balancers/http_loadbalancers',
    page_type: 'list',
    title: 'HTTP Load Balancers',
    workspace: 'waap',
    elements: {
      add_button: {
        description: 'Add new load balancer button',
        selectors: createSelector({
          text_match: 'Add HTTP Load Balancer',
          aria_label: 'Add HTTP Load Balancer',
        }),
      },
      refresh_button: {
        description: 'Refresh list button',
        selectors: createSelector({
          text_match: 'Refresh',
        }),
      },
      search_input: {
        description: 'Search input field',
        selectors: createSelector({
          placeholder: 'Search by name...',
        }),
      },
    },
    table: {
      columns: [
        { header: 'Name', key: 'name', sortable: true },
        { header: 'Domains', key: 'domains', sortable: false },
        { header: 'Origin Pools', key: 'origin_pools', sortable: false },
        { header: 'Status', key: 'status', sortable: true },
        { header: 'Actions', key: 'actions', sortable: false },
      ],
      row_actions: ['edit', 'delete'],
    },
  },
  '/web/workspaces/web-app-and-api-protection/namespaces/{namespace}/load_balancers/http_loadbalancers/create': {
    url: '/web/workspaces/web-app-and-api-protection/namespaces/{namespace}/load_balancers/http_loadbalancers/create',
    page_type: 'form',
    title: 'Create HTTP Load Balancer',
    workspace: 'waap',
    elements: {
      name_input: {
        description: 'Name input field',
        selectors: createSelector({
          placeholder: 'Enter load balancer name',
        }),
      },
      save_button: {
        description: 'Save button',
        selectors: createSelector({
          text_match: 'Save and Exit',
        }),
      },
      cancel_button: {
        description: 'Cancel button',
        selectors: createSelector({
          text_match: 'Cancel',
        }),
      },
    },
    form: {
      tabs: ['Metadata', 'Load Balancer Configuration', 'Security Configuration', 'WAF/Bot/DDOS'],
      sections: {
        basic_information: {
          name: 'Basic Information',
          fields: {
            name: {
              label: 'Name',
              type: 'textbox',
              required: true,
              selectors: createSelector({
                placeholder: 'Enter load balancer name',
              }),
            },
            description: {
              label: 'Description',
              type: 'textbox',
              required: false,
              selectors: createSelector({
                placeholder: 'Enter description',
              }),
            },
          },
        },
        domains: {
          name: 'Domains',
          fields: {
            domains: {
              label: 'Domains',
              type: 'textbox',
              required: true,
              selectors: createSelector({
                placeholder: 'Enter domain',
              }),
            },
          },
        },
      },
    },
  },
};

/**
 * Mock authentication configuration
 */
export const mockAuthConfig: AuthenticationConfig = {
  method: 'multi_provider',
  supported: ['password', 'azure', 'okta'],
  login_url: '/',
  auto_authorized: false,
};

/**
 * Mock home page metadata
 */
export const mockHomePage: HomePageMetadata = {
  url: '/web/workspaces',
  elements: {
    user_menu: {
      description: 'User menu button',
      selectors: createSelector({
        aria_label: 'User Menu',
      }),
    },
  },
  workspace_cards: {
    waap: {
      ref: 'ref_waap',
      name: 'Web App & API Protection',
      url: '/web/workspaces/web-app-and-api-protection',
      selectors: createSelector({
        href_path: '/web/workspaces/web-app-and-api-protection',
        text_match: 'Web App & API Protection',
      }),
    },
    mcn: {
      ref: 'ref_mcn',
      name: 'Multi-Cloud Networking',
      url: '/web/workspaces/multi-cloud-networking',
      selectors: createSelector({
        href_path: '/web/workspaces/multi-cloud-networking',
        text_match: 'Multi-Cloud Networking',
      }),
    },
  },
};

/**
 * Mock navigation metadata
 */
export const mockNavigationMetadata: NavigationMetadata = {
  version: '1.0.0',
  tenant: 'https://acmecorp.console.ves.volterra.io',
  last_crawled: '2024-01-01T00:00:00Z',
  deterministic_navigation: {
    enabled: true,
    description: 'Deterministic navigation using stable selectors',
    note: 'Mock data for testing',
  },
  selector_priority: ['name', 'aria_label', 'href_path', 'text_match', 'placeholder', 'css', 'ref'],
  authentication: mockAuthConfig,
  home_page: mockHomePage,
  workspaces: {
    waap: {
      url: '/web/workspaces/web-app-and-api-protection',
      name: 'Web App & API Protection',
      sidebar: {
        sections: {
          load_balancers: {
            ref: 'ref_lb',
            name: 'Load Balancers',
            url: '/web/workspaces/web-app-and-api-protection/load_balancers',
            href_path: '/load_balancers',
            children: {
              http_lb: {
                ref: 'ref_http_lb',
                name: 'HTTP Load Balancers',
                url: '/web/workspaces/web-app-and-api-protection/load_balancers/http_loadbalancers',
                href_path: '/load_balancers/http_loadbalancers',
              },
              tcp_lb: {
                ref: 'ref_tcp_lb',
                name: 'TCP Load Balancers',
                url: '/web/workspaces/web-app-and-api-protection/load_balancers/tcp_loadbalancers',
                href_path: '/load_balancers/tcp_loadbalancers',
              },
            },
          },
          origin_pools: {
            ref: 'ref_origin',
            name: 'Origin Pools',
            url: '/web/workspaces/web-app-and-api-protection/origin_pools',
            href_path: '/origin_pools',
          },
        },
      },
    },
  },
};

/**
 * Mock URL registry class
 */
export class MockURLRegistry {
  private sitemap: URLSitemap;

  constructor(sitemap: URLSitemap = mockUrlSitemap) {
    this.sitemap = sitemap;
  }

  getStaticRoute(path: string): StaticRoute | undefined {
    return this.sitemap.static_routes[path];
  }

  getDynamicRoutes(): DynamicRoute[] {
    return this.sitemap.dynamic_routes;
  }

  findDynamicRoute(urlPath: string): DynamicRoute | undefined {
    return this.sitemap.dynamic_routes.find(route => {
      const pattern = route.pattern.replace(/\{[^}]+\}/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(urlPath);
    });
  }

  getWorkspaceMapping(alias: string): string | undefined {
    return this.sitemap.workspace_mapping[alias];
  }

  getResourceShortcut(name: string): string | undefined {
    return this.sitemap.resource_shortcuts[name];
  }

  resolveWorkspace(input: string): { alias: string; path: string } | undefined {
    const inputLower = input.toLowerCase();
    for (const [alias, path] of Object.entries(this.sitemap.workspace_mapping)) {
      if (alias.toLowerCase() === inputLower) {
        return { alias, path };
      }
    }
    return undefined;
  }

  resolveDynamicRoute(pattern: string, variables: Record<string, string>): string {
    let result = pattern;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(`{${key}}`, value);
    }
    return result;
  }

  getSitemap(): URLSitemap {
    return this.sitemap;
  }
}

/**
 * Mock page registry class
 */
export class MockPageRegistry {
  private pages: Record<string, PageMetadata>;
  private navigation: NavigationMetadata;

  constructor(
    pages: Record<string, PageMetadata> = mockPageMetadata,
    navigation: NavigationMetadata = mockNavigationMetadata
  ) {
    this.pages = pages;
    this.navigation = navigation;
  }

  getPage(urlPattern: string): PageMetadata | undefined {
    return this.pages[urlPattern];
  }

  getNavigation(): NavigationMetadata {
    return this.navigation;
  }

  findPageByUrl(url: string): PageMetadata | undefined {
    // Try exact match first
    if (this.pages[url]) {
      return this.pages[url];
    }

    // Try pattern matching
    for (const [pattern, page] of Object.entries(this.pages)) {
      const regex = new RegExp('^' + pattern.replace(/\{[^}]+\}/g, '[^/]+') + '$');
      if (regex.test(url)) {
        return page;
      }
    }

    return undefined;
  }

  getElement(pageUrl: string, elementName: string) {
    const page = this.pages[pageUrl];
    return page?.elements?.[elementName];
  }

  getFormField(pageUrl: string, sectionName: string, fieldName: string): FormField | undefined {
    const page = this.pages[pageUrl];
    return page?.form?.sections?.[sectionName]?.fields?.[fieldName];
  }

  getWorkspace(workspaceId: string): WorkspaceMetadata | undefined {
    return this.navigation.workspaces?.[workspaceId];
  }
}

/**
 * Create mock registry instances
 */
export function createMockUrlRegistry(customSitemap?: Partial<URLSitemap>): MockURLRegistry {
  const sitemap = customSitemap
    ? { ...mockUrlSitemap, ...customSitemap }
    : mockUrlSitemap;
  return new MockURLRegistry(sitemap);
}

export function createMockPageRegistry(
  customPages?: Record<string, PageMetadata>,
  customNavigation?: NavigationMetadata
): MockPageRegistry {
  return new MockPageRegistry(
    customPages ?? mockPageMetadata,
    customNavigation ?? mockNavigationMetadata
  );
}

/**
 * Mock registry factory singleton
 */
export const mockRegistry = {
  urlSitemap: mockUrlSitemap,
  pageMetadata: mockPageMetadata,
  navigationMetadata: mockNavigationMetadata,
  createUrlRegistry: createMockUrlRegistry,
  createPageRegistry: createMockPageRegistry,
};
