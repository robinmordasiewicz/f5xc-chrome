/**
 * Unit Tests for url-sitemap.json
 *
 * Validates:
 * - JSON structure and schema
 * - Static routes configuration
 * - Dynamic route patterns
 * - Workspace mapping
 * - Resource shortcuts
 */

import * as fs from 'fs';
import * as path from 'path';

const SITEMAP_PATH = path.join(__dirname, '../../../skills/xc-console/url-sitemap.json');

describe('url-sitemap.json', () => {
  let sitemap: Record<string, unknown>;

  beforeAll(() => {
    const content = fs.readFileSync(SITEMAP_PATH, 'utf-8');
    sitemap = JSON.parse(content);
  });

  describe('JSON Structure', () => {
    test('should parse without errors', () => {
      expect(sitemap).toBeDefined();
      expect(typeof sitemap).toBe('object');
    });

    test('should have version field', () => {
      expect(sitemap.version).toBeDefined();
      expect(typeof sitemap.version).toBe('string');
    });

    test('should have tenant field', () => {
      expect(sitemap.tenant).toBeDefined();
      expect(typeof sitemap.tenant).toBe('string');
    });

    test('should have description field', () => {
      expect(sitemap.description).toBeDefined();
      expect(typeof sitemap.description).toBe('string');
    });
  });

  describe('Static Routes', () => {
    test('should have static_routes object', () => {
      expect(sitemap.static_routes).toBeDefined();
      expect(typeof sitemap.static_routes).toBe('object');
    });

    test('should have home route', () => {
      const routes = sitemap.static_routes as Record<string, unknown>;
      expect(routes['/web/home']).toBeDefined();
    });

    test('should have catalog route', () => {
      const routes = sitemap.static_routes as Record<string, unknown>;
      expect(routes['/web/catalog/use-cases']).toBeDefined();
    });

    test('each static route should have required fields', () => {
      const routes = sitemap.static_routes as Record<string, Record<string, unknown>>;

      for (const [path, route] of Object.entries(routes)) {
        // Each route should start with /
        expect(path.startsWith('/')).toBe(true);

        // Each route should have a title
        expect(route.title).toBeDefined();
        expect(typeof route.title).toBe('string');

        // Each route should have a page_type
        expect(route.page_type).toBeDefined();
        expect(typeof route.page_type).toBe('string');
      }
    });

    test('workspace routes should have workspace field', () => {
      const routes = sitemap.static_routes as Record<string, Record<string, unknown>>;

      for (const [path, route] of Object.entries(routes)) {
        if (route.page_type === 'workspace') {
          expect(route.workspace).toBeDefined();
          expect(typeof route.workspace).toBe('string');
        }
      }
    });
  });

  describe('Dynamic Routes', () => {
    test('should have dynamic_routes array', () => {
      expect(sitemap.dynamic_routes).toBeDefined();
      expect(Array.isArray(sitemap.dynamic_routes)).toBe(true);
    });

    test('each dynamic route should have pattern and description', () => {
      const routes = sitemap.dynamic_routes as Array<Record<string, unknown>>;

      for (const route of routes) {
        expect(route.pattern).toBeDefined();
        expect(typeof route.pattern).toBe('string');

        expect(route.description).toBeDefined();
        expect(typeof route.description).toBe('string');
      }
    });

    test('dynamic route patterns should contain placeholders', () => {
      const routes = sitemap.dynamic_routes as Array<Record<string, unknown>>;

      for (const route of routes) {
        const pattern = route.pattern as string;
        // Dynamic routes should have {placeholder} variables
        expect(pattern.includes('{')).toBe(true);
        expect(pattern.includes('}')).toBe(true);
      }
    });

    test('dynamic routes should have example field', () => {
      const routes = sitemap.dynamic_routes as Array<Record<string, unknown>>;

      for (const route of routes) {
        expect(route.example).toBeDefined();
        expect(typeof route.example).toBe('string');
        // Example should be a concrete URL path
        expect((route.example as string).startsWith('/')).toBe(true);
      }
    });
  });

  describe('Workspace Mapping', () => {
    test('should have workspace_mapping object', () => {
      expect(sitemap.workspace_mapping).toBeDefined();
      expect(typeof sitemap.workspace_mapping).toBe('object');
    });

    test('should have common workspace shortcuts', () => {
      const mapping = sitemap.workspace_mapping as Record<string, string>;

      const expectedMappings = [
        'waap',
        'mcn',
        'dns',
        'admin',
        'home',
      ];

      for (const key of expectedMappings) {
        expect(mapping[key]).toBeDefined();
        expect(mapping[key].startsWith('/')).toBe(true);
      }
    });

    test('all workspace mappings should point to valid paths', () => {
      const mapping = sitemap.workspace_mapping as Record<string, string>;

      for (const [shortcut, path] of Object.entries(mapping)) {
        expect(typeof path).toBe('string');
        expect(path.startsWith('/web/')).toBe(true);
      }
    });
  });

  describe('Resource Shortcuts', () => {
    test('should have resource_shortcuts object', () => {
      expect(sitemap.resource_shortcuts).toBeDefined();
      expect(typeof sitemap.resource_shortcuts).toBe('object');
    });

    test('should have common resource shortcuts', () => {
      const shortcuts = sitemap.resource_shortcuts as Record<string, string>;

      const expectedShortcuts = [
        'http-lb',
        'origin-pools',
        'waf',
      ];

      for (const key of expectedShortcuts) {
        expect(shortcuts[key]).toBeDefined();
      }
    });

    test('resource shortcuts may contain namespace placeholder', () => {
      const shortcuts = sitemap.resource_shortcuts as Record<string, string>;

      for (const [name, path] of Object.entries(shortcuts)) {
        expect(typeof path).toBe('string');
        // Should either be a fixed path or contain {namespace}
        expect(path.startsWith('/')).toBe(true);
      }
    });
  });

  describe('Crawl Coverage', () => {
    test('should have crawl_coverage object', () => {
      expect(sitemap.crawl_coverage).toBeDefined();
      expect(typeof sitemap.crawl_coverage).toBe('object');
    });

    test('crawl_coverage should track completeness', () => {
      const coverage = sitemap.crawl_coverage as Record<string, unknown>;

      // Should track number of routes discovered
      expect(coverage.static_routes_discovered).toBeDefined();
      expect(typeof coverage.static_routes_discovered).toBe('number');

      // Should track workspace coverage
      expect(coverage.workspaces_mapped).toBeDefined();
      expect(typeof coverage.workspaces_mapped).toBe('number');
    });
  });

  describe('Administration Routes', () => {
    test('should have administration workspace routes', () => {
      const routes = sitemap.static_routes as Record<string, Record<string, unknown>>;

      const adminRoutes = Object.keys(routes).filter((path) =>
        path.includes('/workspaces/administration/')
      );

      expect(adminRoutes.length).toBeGreaterThan(0);
    });

    test('should have IAM routes', () => {
      const routes = sitemap.static_routes as Record<string, Record<string, unknown>>;

      const iamRoutes = Object.keys(routes).filter((path) =>
        path.includes('/administration/iam/')
      );

      expect(iamRoutes.length).toBeGreaterThan(0);
    });

    test('should have tenant settings routes', () => {
      const routes = sitemap.static_routes as Record<string, Record<string, unknown>>;

      const tenantRoutes = Object.keys(routes).filter((path) =>
        path.includes('/administration/tenant-settings/')
      );

      expect(tenantRoutes.length).toBeGreaterThan(0);
    });
  });

  describe('Version Consistency', () => {
    test('version should follow semver format', () => {
      const version = sitemap.version as string;
      const semverPattern = /^\d+\.\d+\.\d+$/;
      expect(semverPattern.test(version)).toBe(true);
    });
  });
});
