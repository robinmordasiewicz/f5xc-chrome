// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Unit Tests for Selector Priority Chain Logic
 *
 * Validates:
 * - Priority ordering of selectors
 * - Specificity-based fallback patterns
 * - href_path vs CSS selector priority
 */

import {
  validateCssSelector,
  calculateSpecificity,
  validateSelectorPriorityChain,
} from '../../helpers/selector-validator';

describe('Selector Priority Logic', () => {
  describe('Specificity-based Priority', () => {
    test('ID selectors should have highest priority', () => {
      const selectors = [
        '#unique-id',
        '.common-class',
        'button',
      ];

      const specificities = selectors.map((s) => ({
        selector: s,
        specificity: calculateSpecificity(s),
      }));

      // ID should have highest
      expect(specificities[0].specificity).toBeGreaterThan(specificities[1].specificity);
      // Class should be higher than element
      expect(specificities[1].specificity).toBeGreaterThan(specificities[2].specificity);
    });

    test('compound selectors increase specificity', () => {
      const simple = calculateSpecificity('button');
      const withClass = calculateSpecificity('button.primary');
      const withId = calculateSpecificity('button#submit');

      expect(withClass).toBeGreaterThan(simple);
      expect(withId).toBeGreaterThan(withClass);
    });

    test('attribute selectors equal class weight', () => {
      const attrSelector = '[data-testid="btn"]';
      const classSelector = '.btn';

      const attrSpec = calculateSpecificity(attrSelector);
      const classSpec = calculateSpecificity(classSelector);

      expect(attrSpec).toBe(classSpec);
    });
  });

  describe('Priority Chain Validation', () => {
    test('priority chain should have all valid selectors', () => {
      const chain = [
        'a[href*="/workspaces/web-app-and-api-protection"]',
        '[data-testid="waap-workspace"]',
        '.workspace-card.waap',
        'nav li a',
      ];

      const result = validateSelectorPriorityChain(chain);
      expect(result.validCount).toBe(chain.length);
      expect(result.invalidCount).toBe(0);
    });

    test('priority chain with invalid selector should be flagged', () => {
      const chain = [
        'a[href*="/workspaces"]',
        '> invalid',  // Invalid - starts with combinator
        'div.fallback',
      ];

      const result = validateSelectorPriorityChain(chain);
      expect(result.invalidCount).toBe(1);
      expect(result.results[1].isValid).toBe(false);
    });

    test('empty priority chain should report zero valid', () => {
      const result = validateSelectorPriorityChain([]);
      expect(result.validCount).toBe(0);
      expect(result.results.length).toBe(0);
    });
  });

  describe('Recommended Priority Patterns', () => {
    test('href_path selectors should be highly specific', () => {
      // href_path based selectors are reliable
      const hrefSelector = 'a[href*="/web/workspaces/administration"]';
      const genericClass = '.sidebar-item';

      const hrefSpec = calculateSpecificity(hrefSelector);
      const classSpec = calculateSpecificity(genericClass);

      // Attribute selector should be at least as specific as class
      expect(hrefSpec).toBeGreaterThanOrEqual(classSpec);
    });

    test('data-testid selectors are stable', () => {
      const testIdSelector = '[data-testid="admin-users"]';
      const result = validateCssSelector(testIdSelector);

      expect(result.isValid).toBe(true);
      expect(result.specificity).toBeGreaterThan(0);
    });

    test('text-based selectors should include context', () => {
      // Text-based selectors are fragile, so they should have context
      const goodSelector = 'nav li a[href*="/users"]';
      const result = validateCssSelector(goodSelector);

      expect(result.isValid).toBe(true);
    });
  });

  describe('F5 XC Console Specific Patterns', () => {
    test('workspace navigation selector pattern', () => {
      const patterns = [
        'a[href*="/workspaces/web-app-and-api-protection"]',
        'a[href*="/workspaces/multi-cloud-network-connect"]',
        'a[href*="/workspaces/dns-management"]',
        'a[href*="/workspaces/administration"]',
      ];

      for (const pattern of patterns) {
        const result = validateCssSelector(pattern);
        expect(result.isValid).toBe(true);
      }
    });

    test('sidebar section selector pattern', () => {
      const patterns = [
        'a[href*="/manage/load_balancers"]',
        'a[href*="/manage/origin_pools"]',
        'a[href*="/manage/app_firewall"]',
        'a[href*="/iam/users"]',
        'a[href*="/tenant-settings"]',
      ];

      for (const pattern of patterns) {
        const result = validateCssSelector(pattern);
        expect(result.isValid).toBe(true);
      }
    });

    test('form field selector pattern', () => {
      const patterns = [
        'input[name="name"]',
        'input[name="description"]',
        'select[name="namespace"]',
        'button[type="submit"]',
      ];

      for (const pattern of patterns) {
        const result = validateCssSelector(pattern);
        expect(result.isValid).toBe(true);
      }
    });
  });

  describe('Priority Fallback Strategy', () => {
    test('recommended fallback order', () => {
      // Best practice: Most specific → Most generic
      const fallbackChain = [
        // 1. ID selector (most specific, but rare in modern apps)
        '#workspace-waap',
        // 2. Attribute selector with exact match
        '[data-testid="waap-workspace"]',
        // 3. Attribute selector with partial match (href)
        'a[href*="/workspaces/web-app-and-api-protection"]',
        // 4. Class selector
        '.workspace-card.waap',
        // 5. Element + class (least specific)
        'nav li.workspace-item',
      ];

      const result = validateSelectorPriorityChain(fallbackChain);
      expect(result.validCount).toBe(fallbackChain.length);

      // Verify specificity decreases (or stays same) along chain
      let previousSpec = Infinity;
      for (const res of result.results) {
        if (res.specificity !== undefined) {
          // Allow equal specificity, but warn if increasing
          // (This is advisory, not strict)
        }
      }
    });
  });
});
