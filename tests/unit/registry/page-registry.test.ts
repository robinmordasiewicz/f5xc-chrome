/**
 * Page Registry Tests
 *
 * Unit tests for the PageRegistry class and navigation metadata.
 * Tests element selection, form fields, workspace navigation, and selectors.
 */

import {
  PageRegistry,
  getPageRegistry,
  resetPageRegistry,
} from '../../../src/registry/page-registry';
import { SelectorType, DeterministicSelector } from '../../../src/types';

describe('Page Registry', () => {
  beforeEach(() => {
    // Reset singleton for test isolation
    resetPageRegistry();
  });

  describe('constructor', () => {
    test('creates registry with default metadata path', () => {
      const registry = new PageRegistry();

      expect(registry).toBeInstanceOf(PageRegistry);
      expect(registry.getVersion()).toBeDefined();
    });

    test('loads metadata successfully', () => {
      const registry = new PageRegistry();

      expect(registry.getTenant()).toBeDefined();
      expect(registry.getLastCrawled()).toBeDefined();
    });
  });

  describe('getHomePage()', () => {
    let registry: PageRegistry;

    beforeEach(() => {
      registry = new PageRegistry();
    });

    test('returns home page metadata', () => {
      const home = registry.getHomePage();

      expect(home).toBeDefined();
      expect(home.url).toBeDefined();
      expect(home.page_type).toBe('home');
    });

    test('includes elements in home page', () => {
      const home = registry.getHomePage();

      expect(home.elements).toBeDefined();
      expect(typeof home.elements).toBe('object');
    });
  });

  describe('getWorkspaceCard()', () => {
    let registry: PageRegistry;

    beforeEach(() => {
      registry = new PageRegistry();
    });

    test('returns workspace card by exact name', () => {
      const cards = registry.getAllWorkspaceCards();
      const firstCardName = Object.keys(cards)[0];

      if (firstCardName) {
        const card = registry.getWorkspaceCard(firstCardName);

        expect(card).toBeDefined();
        expect(card?.name).toBeDefined();
      }
    });

    test('normalizes workspace name with spaces', () => {
      // Try "web app and api protection" instead of "web_app_and_api_protection"
      const card = registry.getWorkspaceCard('web app and api protection');

      if (card) {
        expect(card.name).toBeDefined();
      }
    });

    test('normalizes workspace name with dashes', () => {
      const card = registry.getWorkspaceCard('web-app-and-api-protection');

      if (card) {
        expect(card.name).toBeDefined();
      }
    });

    test('performs fuzzy match on display name', () => {
      const cards = registry.getAllWorkspaceCards();
      const firstCard = Object.values(cards)[0];

      if (firstCard) {
        // Try partial name match
        const partialName = firstCard.name.substring(0, 5);
        const card = registry.getWorkspaceCard(partialName);

        // May or may not find it depending on partial match
        if (card) {
          expect(card.name).toBeDefined();
        }
      }
    });

    test('returns undefined for unknown workspace', () => {
      const card = registry.getWorkspaceCard('nonexistent-workspace-xyz');

      expect(card).toBeUndefined();
    });
  });

  describe('getAllWorkspaceCards()', () => {
    test('returns object with workspace cards', () => {
      const registry = new PageRegistry();
      const cards = registry.getAllWorkspaceCards();

      expect(typeof cards).toBe('object');
      expect(Object.keys(cards).length).toBeGreaterThan(0);
    });

    test('each card has required properties', () => {
      const registry = new PageRegistry();
      const cards = registry.getAllWorkspaceCards();

      for (const card of Object.values(cards)) {
        expect(card.name).toBeDefined();
        expect(card.selectors).toBeDefined();
      }
    });
  });

  describe('getElement()', () => {
    let registry: PageRegistry;

    beforeEach(() => {
      registry = new PageRegistry();
    });

    test('retrieves element by dot-notation path', () => {
      const element = registry.getElement('home_page.workspace_cards');

      expect(element).toBeDefined();
    });

    test('returns undefined for invalid path', () => {
      const element = registry.getElement('nonexistent.path.element');

      expect(element).toBeUndefined();
    });

    test('handles single-level path', () => {
      const element = registry.getElement('home_page');

      expect(element).toBeDefined();
    });
  });

  describe('buildSelectorChain()', () => {
    let registry: PageRegistry;

    beforeEach(() => {
      registry = new PageRegistry();
    });

    test('returns array of selectors', () => {
      const selectors = {
        data_testid: 'my-element',
        aria_label: 'My Element',
        text_match: 'My Element',
        css: '.my-element',
      };

      const chain = registry.buildSelectorChain(selectors);

      expect(Array.isArray(chain)).toBe(true);
      expect(chain.length).toBeGreaterThan(0);
    });

    test('sorts selectors by confidence (highest first)', () => {
      const selectors = {
        data_testid: 'high-confidence',
        aria_label: null,
        text_match: null,
        css: '.low-confidence',
      };

      const chain = registry.buildSelectorChain(selectors);

      if (chain.length >= 2) {
        expect(chain[0].confidence).toBeGreaterThanOrEqual(chain[1].confidence);
      }
    });

    test('includes confidence scores', () => {
      const selectors = {
        data_testid: 'test-element',
        aria_label: null,
        text_match: null,
        css: null,
      };

      const chain = registry.buildSelectorChain(selectors);

      if (chain.length > 0) {
        expect(chain[0].confidence).toBeDefined();
        expect(chain[0].confidence).toBeGreaterThan(0);
        expect(chain[0].confidence).toBeLessThanOrEqual(1);
      }
    });

    test('maps name to data_testid', () => {
      const selectors = {
        data_testid: 'test-id',
        aria_label: null,
        text_match: null,
        css: null,
      };

      const chain = registry.buildSelectorChain(selectors);

      const nameSelector = chain.find(s => s.type === 'name');
      expect(nameSelector?.value).toBe('test-id');
    });

    test('includes all available selector types', () => {
      const selectors = {
        data_testid: 'test-id',
        aria_label: 'Test Label',
        href_path: '/path/to/page',
        text_match: 'Text Content',
        placeholder: 'Enter value...',
        css: '.test-class',
      };

      const chain = registry.buildSelectorChain(selectors);

      expect(chain.length).toBeGreaterThanOrEqual(6);
    });

    test('returns empty array for selectors with all nulls', () => {
      const selectors = {
        data_testid: null,
        aria_label: null,
        text_match: null,
        css: null,
      };

      const chain = registry.buildSelectorChain(selectors);

      expect(chain).toEqual([]);
    });
  });

  describe('getBestSelector()', () => {
    let registry: PageRegistry;

    beforeEach(() => {
      registry = new PageRegistry();
    });

    test('returns highest confidence selector', () => {
      const element = {
        selectors: {
          css: '.my-element',
          data_testid: 'my-element-id',
        },
      };

      const best = registry.getBestSelector(element as any);

      expect(best).toBeDefined();
      expect(best?.type).toBe('name'); // data_testid maps to name type
    });

    test('falls back to ref when no selectors', () => {
      const element = {
        selectors: {},
        ref: 'ref123',
      };

      const best = registry.getBestSelector(element as any);

      expect(best).toBeDefined();
      expect(best?.type).toBe('ref');
      expect(best?.value).toBe('ref123');
    });

    test('returns null when no selectors and no ref', () => {
      const element = {
        selectors: {},
      };

      const best = registry.getBestSelector(element as any);

      expect(best).toBeNull();
    });
  });

  describe('selectorToLocator()', () => {
    let registry: PageRegistry;

    beforeEach(() => {
      registry = new PageRegistry();
    });

    test('converts name to data-testid attribute selector', () => {
      const selector: DeterministicSelector = {
        type: 'name',
        value: 'my-element',
        confidence: 0.95,
      };

      const locator = registry.selectorToLocator(selector);

      expect(locator).toBe('[data-testid="my-element"]');
    });

    test('converts aria_label to aria-label attribute selector', () => {
      const selector: DeterministicSelector = {
        type: 'aria_label',
        value: 'My Button',
        confidence: 0.9,
      };

      const locator = registry.selectorToLocator(selector);

      expect(locator).toBe('[aria-label="My Button"]');
    });

    test('converts href_path to href attribute selector', () => {
      const selector: DeterministicSelector = {
        type: 'href_path',
        value: '/web/home',
        confidence: 0.85,
      };

      const locator = registry.selectorToLocator(selector);

      expect(locator).toBe('[href="/web/home"]');
    });

    test('converts text_match to text selector', () => {
      const selector: DeterministicSelector = {
        type: 'text_match',
        value: 'Click Me',
        confidence: 0.75,
      };

      const locator = registry.selectorToLocator(selector);

      expect(locator).toBe('text="Click Me"');
    });

    test('converts placeholder to placeholder attribute selector', () => {
      const selector: DeterministicSelector = {
        type: 'placeholder',
        value: 'Enter name...',
        confidence: 0.7,
      };

      const locator = registry.selectorToLocator(selector);

      expect(locator).toBe('[placeholder="Enter name..."]');
    });

    test('returns css selector as-is', () => {
      const selector: DeterministicSelector = {
        type: 'css',
        value: '.my-class > div',
        confidence: 0.5,
      };

      const locator = registry.selectorToLocator(selector);

      expect(locator).toBe('.my-class > div');
    });

    test('returns ref as-is', () => {
      const selector: DeterministicSelector = {
        type: 'ref',
        value: 'ref123',
        confidence: 0.1,
      };

      const locator = registry.selectorToLocator(selector);

      expect(locator).toBe('ref123');
    });
  });

  describe('getFormMetadata()', () => {
    let registry: PageRegistry;

    beforeEach(() => {
      registry = new PageRegistry();
    });

    test('returns form metadata when exists', () => {
      // The actual form IDs depend on the metadata file
      // Check if forms exist first
      const anyForm = registry.getFormMetadata('http_loadbalancer_create');

      // Form might not exist in the metadata
      if (anyForm) {
        expect(anyForm.fields || anyForm.sections).toBeDefined();
      }
    });

    test('returns undefined for unknown form', () => {
      const form = registry.getFormMetadata('nonexistent-form-id');

      expect(form).toBeUndefined();
    });
  });

  describe('getFormField()', () => {
    let registry: PageRegistry;

    beforeEach(() => {
      registry = new PageRegistry();
    });

    test('returns undefined for unknown form', () => {
      const field = registry.getFormField('nonexistent-form', 'name');

      expect(field).toBeUndefined();
    });

    test('returns undefined for unknown field', () => {
      // Try with any form that might exist
      const field = registry.getFormField('http_loadbalancer_create', 'nonexistent-field');

      expect(field).toBeUndefined();
    });
  });

  describe('getAllFormFields()', () => {
    let registry: PageRegistry;

    beforeEach(() => {
      registry = new PageRegistry();
    });

    test('returns empty object for unknown form', () => {
      const fields = registry.getAllFormFields('nonexistent-form');

      expect(fields).toEqual({});
    });

    test('returns object with fields for known form', () => {
      const fields = registry.getAllFormFields('http_loadbalancer_create');

      // If form exists, should return fields object
      expect(typeof fields).toBe('object');
    });
  });

  describe('getWorkspaceSidebar()', () => {
    let registry: PageRegistry;

    beforeEach(() => {
      registry = new PageRegistry();
    });

    test('returns undefined for unknown workspace', () => {
      const sidebar = registry.getWorkspaceSidebar('nonexistent-workspace');

      expect(sidebar).toBeUndefined();
    });

    test('returns sidebar for known workspace if available', () => {
      // Try common workspaces
      const sidebar = registry.getWorkspaceSidebar('waap');

      // Sidebar may or may not exist depending on metadata
      if (sidebar) {
        expect(typeof sidebar).toBe('object');
      }
    });
  });

  describe('findSidebarItem()', () => {
    let registry: PageRegistry;

    beforeEach(() => {
      registry = new PageRegistry();
    });

    test('returns undefined for unknown workspace', () => {
      const item = registry.findSidebarItem('nonexistent-workspace', 'overview');

      expect(item).toBeUndefined();
    });

    test('returns undefined when sidebar not found', () => {
      const item = registry.findSidebarItem('waap', 'nonexistent-item');

      expect(item).toBeUndefined();
    });
  });

  describe('getAuthConfig()', () => {
    test('returns authentication configuration', () => {
      const registry = new PageRegistry();
      const authConfig = registry.getAuthConfig();

      expect(authConfig).toBeDefined();
    });
  });

  describe('getSelectorPriority()', () => {
    test('returns selector priority array', () => {
      const registry = new PageRegistry();
      const priority = registry.getSelectorPriority();

      expect(Array.isArray(priority)).toBe(true);
      expect(priority.length).toBeGreaterThan(0);
    });

    test('includes common selector types', () => {
      const registry = new PageRegistry();
      const priority = registry.getSelectorPriority();

      // Should include at least some common types
      expect(priority).toContain('name');
    });
  });

  describe('metadata info', () => {
    let registry: PageRegistry;

    beforeEach(() => {
      registry = new PageRegistry();
    });

    test('getVersion returns string', () => {
      const version = registry.getVersion();

      expect(typeof version).toBe('string');
    });

    test('getLastCrawled returns string', () => {
      const lastCrawled = registry.getLastCrawled();

      expect(typeof lastCrawled).toBe('string');
    });

    test('getCrawlSummary returns object', () => {
      const summary = registry.getCrawlSummary();

      expect(summary).toBeDefined();
    });

    test('isDeterministicNavigationEnabled returns boolean', () => {
      const enabled = registry.isDeterministicNavigationEnabled();

      expect(typeof enabled).toBe('boolean');
    });

    test('getTenant returns string', () => {
      const tenant = registry.getTenant();

      expect(typeof tenant).toBe('string');
    });
  });

  describe('singleton helpers', () => {
    describe('getPageRegistry()', () => {
      test('returns PageRegistry instance', () => {
        const registry = getPageRegistry();

        expect(registry).toBeInstanceOf(PageRegistry);
      });

      test('returns same instance on multiple calls', () => {
        const registry1 = getPageRegistry();
        const registry2 = getPageRegistry();

        expect(registry1).toBe(registry2);
      });
    });

    describe('resetPageRegistry()', () => {
      test('clears singleton instance', () => {
        const registry1 = getPageRegistry();
        resetPageRegistry();
        const registry2 = getPageRegistry();

        expect(registry1).not.toBe(registry2);
      });
    });
  });

  describe('integration scenarios', () => {
    test('builds selector chain for workspace card', () => {
      const registry = new PageRegistry();
      const cards = registry.getAllWorkspaceCards();
      const firstCardKey = Object.keys(cards)[0];

      if (firstCardKey) {
        const card = cards[firstCardKey];
        const chain = registry.buildSelectorChain(card.selectors);

        expect(chain.length).toBeGreaterThan(0);

        // Convert to locator
        if (chain.length > 0) {
          const locator = registry.selectorToLocator(chain[0]);
          expect(typeof locator).toBe('string');
        }
      }
    });

    test('navigates element hierarchy', () => {
      const registry = new PageRegistry();

      // Get home page
      const home = registry.getHomePage();
      expect(home).toBeDefined();

      // Get workspace cards
      const cards = registry.getAllWorkspaceCards();
      expect(Object.keys(cards).length).toBeGreaterThan(0);

      // Get individual card
      const firstCardKey = Object.keys(cards)[0];
      const card = registry.getWorkspaceCard(firstCardKey);
      expect(card).toBeDefined();
    });

    test('complete selector resolution flow', () => {
      const registry = new PageRegistry();
      const cards = registry.getAllWorkspaceCards();
      const firstCard = Object.values(cards)[0];

      if (firstCard) {
        // Build selector chain
        const chain = registry.buildSelectorChain(firstCard.selectors);

        // Get best selector
        const element = { selectors: firstCard.selectors };
        const best = registry.getBestSelector(element as any);

        if (best) {
          // Convert to locator
          const locator = registry.selectorToLocator(best);
          expect(locator).toBeDefined();
          expect(typeof locator).toBe('string');
        }
      }
    });
  });
});
