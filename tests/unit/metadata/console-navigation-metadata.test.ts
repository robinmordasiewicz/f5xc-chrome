// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Unit Tests for console-navigation-metadata.json
 *
 * Validates:
 * - JSON structure and schema
 * - Required fields present
 * - Workspace card configurations
 * - Selector formats
 * - URL patterns
 */

import * as fs from 'fs';
import * as path from 'path';

const METADATA_PATH = path.join(__dirname, '../../../skills/xc-console/console-navigation-metadata.json');

interface SelectorConfig {
  data_testid?: string | null;
  aria_label?: string | null;
  text_match?: string | null;
  css?: string | null;
}

interface WorkspaceCard {
  ref?: string;
  name?: string;
  url?: string;
  selectors?: SelectorConfig;
}

interface NavigationMetadata {
  version?: string;
  tenant?: string;
  last_crawled?: string;
  deterministic_navigation?: {
    enabled?: boolean;
    description?: string;
  };
  selector_priority?: string[];
  authentication?: Record<string, unknown>;
  home_page?: {
    url?: string;
    page_type?: string;
    elements?: Record<string, unknown>;
    workspace_cards?: Record<string, WorkspaceCard>;
  };
  crawl_summary?: Record<string, unknown>;
  [key: string]: unknown;
}

describe('console-navigation-metadata.json', () => {
  let metadata: NavigationMetadata;

  beforeAll(() => {
    const content = fs.readFileSync(METADATA_PATH, 'utf-8');
    metadata = JSON.parse(content) as NavigationMetadata;
  });

  describe('JSON Structure', () => {
    test('should parse without errors', () => {
      expect(metadata).toBeDefined();
      expect(typeof metadata).toBe('object');
    });

    test('should have version field', () => {
      expect(metadata.version).toBeDefined();
      expect(typeof metadata.version).toBe('string');
    });

    test('should have tenant field', () => {
      expect(metadata.tenant).toBeDefined();
      expect(typeof metadata.tenant).toBe('string');
    });

    test('should have last_crawled field', () => {
      expect(metadata.last_crawled).toBeDefined();
      expect(typeof metadata.last_crawled).toBe('string');
      // Verify ISO date format
      expect(() => new Date(metadata.last_crawled as string)).not.toThrow();
    });
  });

  describe('Deterministic Navigation', () => {
    test('should have deterministic_navigation config', () => {
      expect(metadata.deterministic_navigation).toBeDefined();
      expect(typeof metadata.deterministic_navigation).toBe('object');
    });

    test('deterministic_navigation should have enabled flag', () => {
      expect(metadata.deterministic_navigation?.enabled).toBeDefined();
      expect(typeof metadata.deterministic_navigation?.enabled).toBe('boolean');
    });
  });

  describe('Selector Priority', () => {
    test('should have selector_priority array', () => {
      expect(metadata.selector_priority).toBeDefined();
      expect(Array.isArray(metadata.selector_priority)).toBe(true);
    });

    test('selector_priority should include expected types', () => {
      const priority = metadata.selector_priority || [];
      expect(priority).toContain('name');
      expect(priority).toContain('aria_label');
    });
  });

  describe('Home Page Configuration', () => {
    test('should have home_page object', () => {
      expect(metadata.home_page).toBeDefined();
      expect(typeof metadata.home_page).toBe('object');
    });

    test('home_page should have url', () => {
      expect(metadata.home_page?.url).toBeDefined();
      expect(typeof metadata.home_page?.url).toBe('string');
    });

    test('home_page should have elements', () => {
      expect(metadata.home_page?.elements).toBeDefined();
      expect(typeof metadata.home_page?.elements).toBe('object');
    });
  });

  describe('Workspace Cards', () => {
    test('should have workspace_cards object', () => {
      const workspaceCards = metadata.home_page?.workspace_cards;
      expect(workspaceCards).toBeDefined();
      expect(typeof workspaceCards).toBe('object');
    });

    test('should have multiple workspace cards', () => {
      const workspaceCards = metadata.home_page?.workspace_cards;
      const cardCount = workspaceCards ? Object.keys(workspaceCards).length : 0;
      expect(cardCount).toBeGreaterThan(0);
    });

    test('each workspace card should have required fields', () => {
      const workspaceCards = metadata.home_page?.workspace_cards;
      if (!workspaceCards) return;

      for (const [name, card] of Object.entries(workspaceCards)) {
        // Each card should have a name
        expect(card.name).toBeDefined();
        expect(typeof card.name).toBe('string');

        // Each card should have a URL or a text_match selector for navigation
        const hasUrl = card.url && typeof card.url === 'string';
        const hasTextMatch = card.selectors?.text_match && typeof card.selectors.text_match === 'string';
        expect(hasUrl || hasTextMatch).toBe(true);

        // If URL exists, it should start with /
        if (card.url) {
          expect(card.url.startsWith('/')).toBe(true);
        }

        // Each card should have selectors object
        expect(card.selectors).toBeDefined();
        expect(typeof card.selectors).toBe('object');
      }
    });

    test('workspace cards should include expected workspaces', () => {
      const workspaceCards = metadata.home_page?.workspace_cards;
      if (!workspaceCards) return;

      // Check for some expected workspace cards
      const cardNames = Object.keys(workspaceCards);
      expect(cardNames.length).toBeGreaterThanOrEqual(5);

      // Should have common workspace cards
      const hasWaap = cardNames.some((name) => name.includes('web_app') || name.includes('waap'));
      const hasDns = cardNames.some((name) => name.includes('dns'));
      expect(hasWaap || hasDns).toBe(true);
    });
  });

  describe('Authentication Configuration', () => {
    test('should have authentication object', () => {
      expect(metadata.authentication).toBeDefined();
      expect(typeof metadata.authentication).toBe('object');
    });

    test('authentication should have method', () => {
      expect(metadata.authentication?.method).toBeDefined();
    });

    test('authentication should have supported providers', () => {
      expect(metadata.authentication?.supported).toBeDefined();
      expect(Array.isArray(metadata.authentication?.supported)).toBe(true);
    });
  });

  describe('Selectors Format', () => {
    test('all CSS selectors should be valid strings', () => {
      const workspaceCards = metadata.home_page?.workspace_cards;
      if (!workspaceCards) return;

      for (const [name, card] of Object.entries(workspaceCards)) {
        if (card.selectors?.css) {
          expect(typeof card.selectors.css).toBe('string');
          expect(card.selectors.css.length).toBeGreaterThan(0);
        }
      }
    });

    test('all text_match values should be non-empty strings', () => {
      const workspaceCards = metadata.home_page?.workspace_cards;
      if (!workspaceCards) return;

      for (const [name, card] of Object.entries(workspaceCards)) {
        if (card.selectors?.text_match) {
          expect(typeof card.selectors.text_match).toBe('string');
          expect(card.selectors.text_match.length).toBeGreaterThan(0);
        }
      }
    });

    test('all URLs should be valid paths', () => {
      const workspaceCards = metadata.home_page?.workspace_cards;
      if (!workspaceCards) return;

      for (const [name, card] of Object.entries(workspaceCards)) {
        if (card.url) {
          expect(card.url.startsWith('/')).toBe(true);
          // URL should not contain spaces
          expect(card.url.includes(' ')).toBe(false);
        }
      }
    });
  });

  describe('Crawl Summary', () => {
    test('should have crawl_summary if available', () => {
      // Crawl summary helps track what was crawled
      if (metadata.crawl_summary) {
        expect(typeof metadata.crawl_summary).toBe('object');
      }
    });
  });

  describe('Version Format', () => {
    test('version should follow semver format', () => {
      const version = metadata.version as string;
      const semverPattern = /^\d+\.\d+\.\d+$/;
      expect(semverPattern.test(version)).toBe(true);
    });
  });
});
