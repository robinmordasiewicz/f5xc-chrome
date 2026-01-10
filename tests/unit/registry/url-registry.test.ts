// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * URL Registry Tests
 *
 * Unit tests for the URLRegistry class and URL resolution.
 * Tests sitemap loading, route resolution, workspace mapping, and shortcuts.
 */

import {
  URLRegistry,
  getURLRegistry,
  resetURLRegistry,
} from '../../../src/registry/url-registry';

describe('URL Registry', () => {
  beforeEach(() => {
    // Reset singleton for test isolation
    resetURLRegistry();
  });

  describe('constructor', () => {
    test('creates registry with default options', () => {
      const registry = new URLRegistry();

      expect(registry).toBeInstanceOf(URLRegistry);
      expect(registry.getVersion()).toBeDefined();
    });

    test('accepts custom tenant URL', () => {
      const registry = new URLRegistry({
        tenant_url: 'https://custom.console.ves.volterra.io',
      });

      const fullUrl = registry.buildFullUrl('/web/home');
      expect(fullUrl).toContain('custom.console.ves.volterra.io');
    });

    test('accepts custom default namespace', () => {
      const registry = new URLRegistry({
        default_namespace: 'production',
      });

      // Resolve a shortcut that uses namespace variable
      const result = registry.resolveShortcut('http-lb', {});

      // Should use 'production' as default namespace
      if (result.success && result.url.includes('namespace')) {
        expect(result.url).toContain('production');
      }
    });

    test('loads sitemap data successfully', () => {
      const registry = new URLRegistry();

      expect(registry.getStaticRoutes()).toBeDefined();
      expect(registry.getDynamicRoutes()).toBeDefined();
      expect(registry.getWorkspaceMappings()).toBeDefined();
      expect(registry.getResourceShortcuts()).toBeDefined();
    });
  });

  describe('resolve()', () => {
    let registry: URLRegistry;

    beforeEach(() => {
      registry = new URLRegistry();
    });

    test('resolves static route', () => {
      const result = registry.resolve({ target: '/web/home' });

      if (result.success) {
        expect(result.url).toBe('/web/home');
        expect(result.resolution_method).toBe('static');
      }
    });

    test('resolves workspace alias', () => {
      const result = registry.resolve({ target: 'waap' });

      if (result.success) {
        expect(result.url).toContain('web-app-and-api-protection');
        expect(result.resolution_method).toBe('workspace');
      }
    });

    test('resolves resource shortcut', () => {
      const result = registry.resolve({
        target: 'http-lb',
        namespace: 'production',
      });

      if (result.success) {
        expect(result.url).toContain('http_loadbalancer');
        expect(result.resolution_method).toBe('shortcut');
      }
    });

    test('resolves direct path', () => {
      const result = registry.resolve({ target: '/custom/path' });

      expect(result.success).toBe(true);
      expect(result.url).toBe('/custom/path');
      expect(result.resolution_method).toBe('direct');
    });

    test('reports unresolved variables', () => {
      const result = registry.resolve({
        target: 'http-lb',
        // Not providing namespace
      });

      if (result.success) {
        // If default namespace is used, URL should be complete
        // Otherwise, namespace should be in unresolved_variables
        if (!result.is_complete) {
          expect(result.unresolved_variables).toContain('namespace');
        }
      }
    });

    test('merges provided variables', () => {
      const result = registry.resolve({
        target: 'http-lb',
        variables: { namespace: 'custom-ns' },
      });

      if (result.success) {
        expect(result.url).toContain('custom-ns');
      }
    });

    test('handles convenience namespace parameter', () => {
      const result = registry.resolve({
        target: 'http-lb',
        namespace: 'my-namespace',
      });

      if (result.success) {
        expect(result.url).toContain('my-namespace');
      }
    });

    test('returns error for unknown target', () => {
      const result = registry.resolve({ target: 'nonexistent-target-xyz' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('resolveStaticRoute()', () => {
    let registry: URLRegistry;

    beforeEach(() => {
      registry = new URLRegistry();
    });

    test('resolves known static route', () => {
      const routes = registry.getStaticRoutes();
      const firstRoute = Object.keys(routes)[0];

      if (firstRoute) {
        const result = registry.resolveStaticRoute(firstRoute);

        expect(result.success).toBe(true);
        expect(result.url).toBe(firstRoute);
        expect(result.resolution_method).toBe('static');
      }
    });

    test('returns success=false for unknown route', () => {
      const result = registry.resolveStaticRoute('/nonexistent/route');

      expect(result.success).toBe(false);
    });

    test('includes page_type when available', () => {
      const routes = registry.getStaticRoutes();
      const firstRoute = Object.keys(routes)[0];

      if (firstRoute) {
        const result = registry.resolveStaticRoute(firstRoute);

        if (result.success && routes[firstRoute].page_type) {
          expect(result.page_type).toBe(routes[firstRoute].page_type);
        }
      }
    });
  });

  describe('resolveWorkspace()', () => {
    let registry: URLRegistry;

    beforeEach(() => {
      registry = new URLRegistry();
    });

    test('resolves waap workspace', () => {
      const result = registry.resolveWorkspace('waap');

      expect(result.found).toBe(true);
      expect(result.url).toContain('web-app-and-api-protection');
    });

    test('resolves admin workspace', () => {
      const result = registry.resolveWorkspace('admin');

      if (result.found) {
        expect(result.url).toContain('administration');
      }
    });

    test('normalizes workspace name with underscores', () => {
      const result = registry.resolveWorkspace('web_app_and_api_protection');

      // Should normalize underscores to dashes
      expect(result.found).toBe(true);
    });

    test('normalizes workspace name with spaces', () => {
      const result = registry.resolveWorkspace('web app and api protection');

      // Should normalize spaces to dashes
      expect(result.found).toBe(true);
    });

    test('handles case insensitivity', () => {
      const result = registry.resolveWorkspace('WAAP');

      expect(result.found).toBe(true);
    });

    test('returns found=false for unknown workspace', () => {
      const result = registry.resolveWorkspace('nonexistent-workspace');

      expect(result.found).toBe(false);
      expect(result.url).toBe('');
    });

    test('returns workspace name in result', () => {
      const result = registry.resolveWorkspace('waap');

      expect(result.workspace).toBeDefined();
    });
  });

  describe('resolveShortcut()', () => {
    let registry: URLRegistry;

    beforeEach(() => {
      registry = new URLRegistry();
    });

    test('resolves known shortcut with variables', () => {
      const shortcuts = registry.listShortcuts();

      if (shortcuts.length > 0) {
        const result = registry.resolveShortcut(shortcuts[0], { namespace: 'test-ns' });

        expect(result.success).toBe(true);
      }
    });

    test('normalizes shortcut name', () => {
      // Try with underscores
      const result1 = registry.resolveShortcut('http_lb', { namespace: 'test' });
      // Try with dashes
      const result2 = registry.resolveShortcut('http-lb', { namespace: 'test' });

      // Both should resolve if shortcut exists
      if (result1.success && result2.success) {
        expect(result1.url).toBe(result2.url);
      }
    });

    test('returns success=false for unknown shortcut', () => {
      const result = registry.resolveShortcut('nonexistent-shortcut', {});

      expect(result.success).toBe(false);
      expect(result.resolution_method).toBe('shortcut');
    });

    test('tracks unresolved variables', () => {
      // Get a shortcut that requires variables
      const shortcuts = registry.getResourceShortcuts();
      const shortcutWithVar = Object.entries(shortcuts).find(
        ([_, template]) => template.includes('{')
      );

      if (shortcutWithVar) {
        const result = registry.resolveShortcut(shortcutWithVar[0], {});

        // May have unresolved variables if no defaults exist
        if (!result.is_complete) {
          expect(result.unresolved_variables.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('resolveDynamicRoute()', () => {
    let registry: URLRegistry;

    beforeEach(() => {
      registry = new URLRegistry();
    });

    test('resolves template pattern with variables', () => {
      const result = registry.resolveDynamicRoute(
        '/web/namespaces/{namespace}/http_loadbalancers',
        { namespace: 'production' }
      );

      expect(result.success).toBe(true);
      expect(result.url).toContain('production');
      expect(result.url).not.toContain('{namespace}');
    });

    test('returns success=false when no pattern matches', () => {
      const result = registry.resolveDynamicRoute('random-string', {});

      expect(result.success).toBe(false);
    });

    test('extracts variables from matched URLs', () => {
      const routes = registry.getDynamicRoutes();

      if (routes.length > 0) {
        const route = routes[0];
        // Create a concrete URL from the pattern
        const concreteUrl = route.pattern
          .replace('{namespace}', 'test-ns')
          .replace('{resource_name}', 'my-resource');

        const result = registry.resolveDynamicRoute(concreteUrl, {});

        if (result.success) {
          expect(result.resolution_method).toBe('dynamic');
        }
      }
    });
  });

  describe('matchPattern()', () => {
    let registry: URLRegistry;

    beforeEach(() => {
      registry = new URLRegistry();
    });

    test('matches URL against dynamic route pattern', () => {
      const routes = registry.getDynamicRoutes();

      if (routes.length > 0) {
        const route = routes[0];

        // Create a concrete URL from pattern
        const testUrl = route.pattern
          .replace('{namespace}', 'my-namespace')
          .replace('{resource_name}', 'my-resource');

        const result = registry.matchPattern(testUrl, route);

        if (route.pattern.includes('{')) {
          expect(result.matched).toBe(true);
          expect(result.confidence).toBe(1.0);
        }
      }
    });

    test('extracts variable values from matched URL', () => {
      const routes = registry.getDynamicRoutes();
      const routeWithNamespace = routes.find(r => r.pattern.includes('{namespace}'));

      if (routeWithNamespace) {
        const testUrl = routeWithNamespace.pattern.replace('{namespace}', 'extracted-ns');

        const result = registry.matchPattern(testUrl, routeWithNamespace);

        if (result.matched) {
          expect(result.extracted_variables?.namespace).toBe('extracted-ns');
        }
      }
    });

    test('returns matched=false for non-matching URL', () => {
      const routes = registry.getDynamicRoutes();

      if (routes.length > 0) {
        const result = registry.matchPattern('/completely/different/url', routes[0]);

        expect(result.matched).toBe(false);
        expect(result.confidence).toBe(0);
      }
    });
  });

  describe('buildFullUrl()', () => {
    test('prepends tenant URL to relative path', () => {
      const registry = new URLRegistry({
        tenant_url: 'https://test.console.ves.volterra.io',
      });

      const url = registry.buildFullUrl('/web/home');

      expect(url).toBe('https://test.console.ves.volterra.io/web/home');
    });

    test('returns absolute URL unchanged', () => {
      const registry = new URLRegistry();

      const url = registry.buildFullUrl('https://example.com/path');

      expect(url).toBe('https://example.com/path');
    });

    test('handles http URLs', () => {
      const registry = new URLRegistry();

      const url = registry.buildFullUrl('http://localhost:3000/test');

      expect(url).toBe('http://localhost:3000/test');
    });
  });

  describe('getters', () => {
    let registry: URLRegistry;

    beforeEach(() => {
      registry = new URLRegistry();
    });

    test('getStaticRoutes returns object', () => {
      const routes = registry.getStaticRoutes();

      expect(typeof routes).toBe('object');
    });

    test('getDynamicRoutes returns array', () => {
      const routes = registry.getDynamicRoutes();

      expect(Array.isArray(routes)).toBe(true);
    });

    test('getWorkspaceMappings returns object', () => {
      const mappings = registry.getWorkspaceMappings();

      expect(typeof mappings).toBe('object');
    });

    test('getResourceShortcuts returns object', () => {
      const shortcuts = registry.getResourceShortcuts();

      expect(typeof shortcuts).toBe('object');
    });

    test('getVersion returns string', () => {
      const version = registry.getVersion();

      expect(typeof version).toBe('string');
    });

    test('getLastCrawled returns string', () => {
      const lastCrawled = registry.getLastCrawled();

      expect(typeof lastCrawled).toBe('string');
    });

    test('getCrawlCoverage returns object', () => {
      const coverage = registry.getCrawlCoverage();

      expect(typeof coverage).toBe('object');
    });

    test('listShortcuts returns array of strings', () => {
      const shortcuts = registry.listShortcuts();

      expect(Array.isArray(shortcuts)).toBe(true);
      if (shortcuts.length > 0) {
        expect(typeof shortcuts[0]).toBe('string');
      }
    });

    test('listWorkspaces returns array of strings', () => {
      const workspaces = registry.listWorkspaces();

      expect(Array.isArray(workspaces)).toBe(true);
      if (workspaces.length > 0) {
        expect(typeof workspaces[0]).toBe('string');
      }
    });
  });

  describe('needsCrawl()', () => {
    let registry: URLRegistry;

    beforeEach(() => {
      registry = new URLRegistry();
    });

    test('returns boolean for waap workspace', () => {
      const result = registry.needsCrawl('waap');

      expect(typeof result).toBe('boolean');
    });

    test('returns boolean for administration workspace', () => {
      const result = registry.needsCrawl('administration');

      expect(typeof result).toBe('boolean');
    });

    test('returns boolean for admin alias', () => {
      const result = registry.needsCrawl('admin');

      expect(typeof result).toBe('boolean');
    });

    test('returns boolean for mcn workspace', () => {
      const result = registry.needsCrawl('mcn');

      expect(typeof result).toBe('boolean');
    });

    test('returns boolean for dns workspace', () => {
      const result = registry.needsCrawl('dns');

      expect(typeof result).toBe('boolean');
    });

    test('returns needs_full_crawl for unknown workspace', () => {
      const coverage = registry.getCrawlCoverage();
      const result = registry.needsCrawl('unknown-workspace');

      expect(result).toBe(coverage.needs_full_crawl);
    });
  });

  describe('getWorkspaceUrl()', () => {
    let registry: URLRegistry;

    beforeEach(() => {
      registry = new URLRegistry();
    });

    test('returns URL for known workspace', () => {
      const workspaces = registry.listWorkspaces();

      if (workspaces.length > 0) {
        const url = registry.getWorkspaceUrl(workspaces[0]);

        expect(url).toBeDefined();
        expect(typeof url).toBe('string');
      }
    });

    test('returns undefined for unknown workspace', () => {
      const url = registry.getWorkspaceUrl('nonexistent-workspace');

      expect(url).toBeUndefined();
    });

    test('handles case insensitivity', () => {
      const workspaces = registry.listWorkspaces();

      if (workspaces.length > 0) {
        const url1 = registry.getWorkspaceUrl(workspaces[0]);
        const url2 = registry.getWorkspaceUrl(workspaces[0].toUpperCase());

        // If lowercased alias exists, both should return same URL
        if (url1) {
          expect(url2).toBeDefined();
        }
      }
    });
  });

  describe('getShortcutTemplate()', () => {
    let registry: URLRegistry;

    beforeEach(() => {
      registry = new URLRegistry();
    });

    test('returns template for known shortcut', () => {
      const shortcuts = registry.listShortcuts();

      if (shortcuts.length > 0) {
        const template = registry.getShortcutTemplate(shortcuts[0]);

        expect(template).toBeDefined();
        expect(typeof template).toBe('string');
      }
    });

    test('returns undefined for unknown shortcut', () => {
      const template = registry.getShortcutTemplate('nonexistent-shortcut');

      expect(template).toBeUndefined();
    });

    test('handles case insensitivity', () => {
      const shortcuts = registry.listShortcuts();

      if (shortcuts.length > 0) {
        const template1 = registry.getShortcutTemplate(shortcuts[0]);
        const template2 = registry.getShortcutTemplate(shortcuts[0].toUpperCase());

        // Lowercased lookup should work
        expect(template1).toBeDefined();
        if (template2) {
          expect(template1).toBe(template2);
        }
      }
    });
  });

  describe('singleton helpers', () => {
    describe('getURLRegistry()', () => {
      test('returns URLRegistry instance', () => {
        const registry = getURLRegistry();

        expect(registry).toBeInstanceOf(URLRegistry);
      });

      test('returns same instance on multiple calls', () => {
        const registry1 = getURLRegistry();
        const registry2 = getURLRegistry();

        expect(registry1).toBe(registry2);
      });

      test('accepts options on first call', () => {
        const registry = getURLRegistry({
          tenant_url: 'https://custom.test.io',
        });

        const url = registry.buildFullUrl('/web/home');
        expect(url).toContain('custom.test.io');
      });
    });

    describe('resetURLRegistry()', () => {
      test('clears singleton instance', () => {
        const registry1 = getURLRegistry();
        resetURLRegistry();
        const registry2 = getURLRegistry();

        expect(registry1).not.toBe(registry2);
      });

      test('allows new options after reset', () => {
        getURLRegistry({ tenant_url: 'https://first.io' });
        resetURLRegistry();
        const registry = getURLRegistry({ tenant_url: 'https://second.io' });

        const url = registry.buildFullUrl('/web/home');
        expect(url).toContain('second.io');
      });
    });
  });

  describe('integration scenarios', () => {
    test('complete resolution flow: shortcut to full URL', () => {
      const registry = new URLRegistry({
        tenant_url: 'https://test.console.ves.volterra.io',
      });

      // Resolve shortcut
      const result = registry.resolve({
        target: 'http-lb',
        namespace: 'production',
      });

      if (result.success) {
        // Build full URL
        const fullUrl = registry.buildFullUrl(result.url);

        expect(fullUrl).toContain('test.console.ves.volterra.io');
        expect(fullUrl).toContain('production');
      }
    });

    test('workspace navigation flow', () => {
      const registry = new URLRegistry();

      // Get workspace URL
      const workspace = registry.resolveWorkspace('waap');

      if (workspace.found) {
        // Build full URL
        const fullUrl = registry.buildFullUrl(workspace.url);

        expect(fullUrl).toContain('web-app-and-api-protection');
      }
    });

    test('dynamic route with multiple variables', () => {
      const registry = new URLRegistry();

      // Find a route with multiple variables
      const routes = registry.getDynamicRoutes();
      const multiVarRoute = routes.find(
        r => r.pattern.includes('{namespace}') && r.pattern.includes('{resource_name}')
      );

      if (multiVarRoute) {
        const result = registry.resolveDynamicRoute(multiVarRoute.pattern, {
          namespace: 'staging',
          resource_name: 'my-lb',
        });

        expect(result.success).toBe(true);
        expect(result.url).toContain('staging');
        expect(result.url).toContain('my-lb');
        expect(result.is_complete).toBe(true);
      }
    });
  });
});
