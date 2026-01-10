// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Unit Tests for CSS Selector Validity
 *
 * Validates:
 * - CSS selector syntax in metadata files
 * - Selector specificity calculations
 * - href_path selector patterns
 * - Priority chain validation
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  validateCssSelector,
  calculateSpecificity,
  validateSelectorPriorityChain,
  validateHrefPathSelector,
  validateNavigationSelectors,
} from '../../helpers/selector-validator';

const METADATA_PATH = path.join(__dirname, '../../../skills/xc-console/console-navigation-metadata.json');

describe('CSS Selector Validator', () => {
  describe('validateCssSelector', () => {
    describe('valid selectors', () => {
      test('element selector', () => {
        const result = validateCssSelector('div');
        expect(result.isValid).toBe(true);
      });

      test('ID selector', () => {
        const result = validateCssSelector('#main-content');
        expect(result.isValid).toBe(true);
      });

      test('class selector', () => {
        const result = validateCssSelector('.btn-primary');
        expect(result.isValid).toBe(true);
      });

      test('attribute selector', () => {
        const result = validateCssSelector('[data-testid="submit"]');
        expect(result.isValid).toBe(true);
      });

      test('compound selector', () => {
        const result = validateCssSelector('div.container#main');
        expect(result.isValid).toBe(true);
      });

      test('descendant combinator', () => {
        const result = validateCssSelector('nav ul li');
        expect(result.isValid).toBe(true);
      });

      test('child combinator', () => {
        const result = validateCssSelector('nav > ul > li');
        expect(result.isValid).toBe(true);
      });

      test('href attribute selector', () => {
        const result = validateCssSelector('a[href*="/workspaces"]');
        expect(result.isValid).toBe(true);
      });

      test('multiple classes', () => {
        const result = validateCssSelector('.btn.btn-primary.active');
        expect(result.isValid).toBe(true);
      });

      test('pseudo-class selector', () => {
        const result = validateCssSelector('button:hover');
        expect(result.isValid).toBe(true);
      });
    });

    describe('invalid selectors', () => {
      test('empty string', () => {
        const result = validateCssSelector('');
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });

      test('only whitespace', () => {
        const result = validateCssSelector('   ');
        expect(result.isValid).toBe(false);
      });

      test('starts with combinator', () => {
        const result = validateCssSelector('> div');
        expect(result.isValid).toBe(false);
      });

      test('starts with comma', () => {
        const result = validateCssSelector(', div');
        expect(result.isValid).toBe(false);
      });

      test('ends with comma', () => {
        const result = validateCssSelector('div,');
        expect(result.isValid).toBe(false);
      });

      test('double commas', () => {
        const result = validateCssSelector('div,, span');
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('calculateSpecificity', () => {
    test('element selector has lowest specificity', () => {
      expect(calculateSpecificity('div')).toBeLessThan(calculateSpecificity('.class'));
    });

    test('class selector has medium specificity', () => {
      expect(calculateSpecificity('.class')).toBeLessThan(calculateSpecificity('#id'));
    });

    test('ID selector has highest specificity', () => {
      const idSpec = calculateSpecificity('#main');
      const classSpec = calculateSpecificity('.main');
      const elemSpec = calculateSpecificity('main');

      expect(idSpec).toBeGreaterThan(classSpec);
      expect(classSpec).toBeGreaterThan(elemSpec);
    });

    test('compound selectors add up', () => {
      const single = calculateSpecificity('.btn');
      const double = calculateSpecificity('.btn.primary');

      expect(double).toBeGreaterThan(single);
    });

    test('attribute selectors count as classes', () => {
      const attr = calculateSpecificity('[data-test]');
      const cls = calculateSpecificity('.test');

      // Both should have same weight
      expect(attr).toBe(cls);
    });
  });

  describe('validateSelectorPriorityChain', () => {
    test('validates array of selectors', () => {
      const selectors = ['#main', '.container', 'div'];
      const result = validateSelectorPriorityChain(selectors);

      expect(result.selectors).toEqual(selectors);
      expect(result.validCount).toBe(3);
      expect(result.invalidCount).toBe(0);
    });

    test('reports invalid selectors in chain', () => {
      const selectors = ['#main', '', 'div'];
      const result = validateSelectorPriorityChain(selectors);

      expect(result.validCount).toBe(2);
      expect(result.invalidCount).toBe(1);
    });

    test('provides individual results', () => {
      const selectors = ['#main', '.btn'];
      const result = validateSelectorPriorityChain(selectors);

      expect(result.results.length).toBe(2);
      expect(result.results[0].isValid).toBe(true);
      expect(result.results[1].isValid).toBe(true);
    });
  });

  describe('validateHrefPathSelector', () => {
    test('valid href_path', () => {
      const result = validateHrefPathSelector('/web/workspaces/web-app-and-api-protection');
      expect(result.isValid).toBe(true);
    });

    test('invalid href_path without leading slash', () => {
      const result = validateHrefPathSelector('web/workspaces');
      expect(result.isValid).toBe(false);
    });

    test('empty href_path', () => {
      const result = validateHrefPathSelector('');
      expect(result.isValid).toBe(false);
    });

    test('href_path with special characters', () => {
      const result = validateHrefPathSelector('/web/workspaces/dns-management');
      expect(result.isValid).toBe(true);
    });
  });
});

describe('Console Navigation Metadata Selectors', () => {
  interface WorkspaceCard {
    ref?: string;
    name?: string;
    url?: string;
    selectors?: {
      data_testid?: string | null;
      aria_label?: string | null;
      text_match?: string | null;
      css?: string | null;
    };
  }

  interface Metadata {
    home_page?: {
      elements?: Record<string, unknown>;
      workspace_cards?: Record<string, WorkspaceCard>;
    };
  }

  let metadata: Metadata;

  beforeAll(() => {
    const content = fs.readFileSync(METADATA_PATH, 'utf-8');
    metadata = JSON.parse(content) as Metadata;
  });

  describe('Workspace Card Selectors', () => {
    test('all CSS selectors in workspace cards should be valid', () => {
      const workspaceCards = metadata.home_page?.workspace_cards;
      if (!workspaceCards) {
        // Skip if no workspace cards
        return;
      }

      // Playwright-specific pseudo-selectors that are valid for browser automation but not standard CSS
      const playwrightPseudoSelectors = [':has-text(', ':has(', ':is(', ':text(', ':nth-match('];

      for (const [name, workspace] of Object.entries(workspaceCards)) {
        if (workspace.selectors?.css) {
          const css = workspace.selectors.css;
          // Skip Playwright-specific selectors (they're valid for Playwright, just not standard CSS)
          const isPlaywrightSelector = playwrightPseudoSelectors.some((pseudo) => css.includes(pseudo));
          if (isPlaywrightSelector) {
            // Just verify it's a non-empty string for Playwright selectors
            expect(css.length).toBeGreaterThan(0);
          } else {
            const result = validateCssSelector(css);
            expect(result.isValid).toBe(true);
          }
        }
      }
    });

    test('all workspace URLs should be valid paths', () => {
      const workspaceCards = metadata.home_page?.workspace_cards;
      if (!workspaceCards) {
        return;
      }

      for (const [name, workspace] of Object.entries(workspaceCards)) {
        if (workspace.url) {
          const result = validateHrefPathSelector(workspace.url);
          expect(result.isValid).toBe(true);
        }
      }
    });

    test('each workspace card should have at least one navigation method', () => {
      const workspaceCards = metadata.home_page?.workspace_cards;
      if (!workspaceCards) {
        return;
      }

      for (const [name, workspace] of Object.entries(workspaceCards)) {
        const hasUrl = workspace.url && workspace.url.length > 0;
        const hasTextMatch = workspace.selectors?.text_match && workspace.selectors.text_match.length > 0;
        const hasCss = workspace.selectors?.css && workspace.selectors.css.length > 0;
        const hasAriaLabel = workspace.selectors?.aria_label && workspace.selectors.aria_label.length > 0;

        expect(hasUrl || hasTextMatch || hasCss || hasAriaLabel).toBe(true);
      }
    });
  });

  describe('Selector Types', () => {
    test('workspace cards should have selector objects', () => {
      const workspaceCards = metadata.home_page?.workspace_cards;
      if (!workspaceCards) {
        return;
      }

      const cardsChecked: string[] = [];

      for (const [name, workspace] of Object.entries(workspaceCards)) {
        if (workspace.selectors) {
          // Verify selector structure
          expect(typeof workspace.selectors).toBe('object');
          cardsChecked.push(name);
        }
      }

      // Verify we actually checked some workspace cards
      expect(cardsChecked.length).toBeGreaterThan(0);
    });
  });
});
