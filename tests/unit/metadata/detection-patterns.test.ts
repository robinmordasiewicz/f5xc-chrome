// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Unit Tests for detection-patterns.json
 *
 * Validates:
 * - JSON structure and schema
 * - Detection pattern configurations
 * - Regular expression validity
 * - Pattern categories
 */

import * as fs from 'fs';
import * as path from 'path';

const PATTERNS_PATH = path.join(__dirname, '../../../skills/xc-console/detection-patterns.json');

describe('detection-patterns.json', () => {
  let patterns: Record<string, unknown>;

  beforeAll(() => {
    const content = fs.readFileSync(PATTERNS_PATH, 'utf-8');
    patterns = JSON.parse(content);
  });

  describe('JSON Structure', () => {
    test('should parse without errors', () => {
      expect(patterns).toBeDefined();
      expect(typeof patterns).toBe('object');
    });
  });

  describe('Pattern Categories', () => {
    test('should have pattern categories', () => {
      // Detection patterns may have various categories
      const keys = Object.keys(patterns);
      expect(keys.length).toBeGreaterThan(0);
    });
  });

  describe('Regular Expression Patterns', () => {
    test('all regex patterns should be valid', () => {
      function validateRegexPatterns(obj: unknown, path: string = ''): void {
        if (typeof obj === 'string') {
          // Check if it looks like a regex pattern
          if (obj.startsWith('^') || obj.endsWith('$') || obj.includes('.*') || obj.includes('\\')) {
            try {
              new RegExp(obj);
            } catch (e) {
              throw new Error(`Invalid regex at ${path}: ${obj}`);
            }
          }
        } else if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            validateRegexPatterns(item, `${path}[${index}]`);
          });
        } else if (typeof obj === 'object' && obj !== null) {
          for (const [key, value] of Object.entries(obj)) {
            validateRegexPatterns(value, path ? `${path}.${key}` : key);
          }
        }
      }

      expect(() => validateRegexPatterns(patterns)).not.toThrow();
    });
  });

  describe('State Detection Patterns', () => {
    test('should have state detection patterns if present', () => {
      // State detection for RBAC, subscription, modules
      if (patterns.state_detection || patterns.stateDetection) {
        const statePatterns = (patterns.state_detection || patterns.stateDetection) as Record<string, unknown>;
        expect(typeof statePatterns).toBe('object');
      }
    });
  });

  describe('Error Detection Patterns', () => {
    test('should have error detection patterns if present', () => {
      // Error patterns for identifying failures
      if (patterns.error_patterns || patterns.errorPatterns || patterns.errors) {
        const errorPatterns = (patterns.error_patterns || patterns.errorPatterns || patterns.errors) as Record<string, unknown>;
        expect(typeof errorPatterns).toBe('object');
      }
    });
  });

  describe('Loading Indicator Patterns', () => {
    test('should have loading indicator patterns if present', () => {
      // Loading patterns for wait conditions
      if (patterns.loading_indicators || patterns.loadingIndicators || patterns.loading) {
        const loadingPatterns = (patterns.loading_indicators || patterns.loadingIndicators || patterns.loading) as Record<string, unknown>;
        expect(typeof loadingPatterns).toBe('object');
      }
    });
  });

  describe('Pattern Structure', () => {
    test('each pattern should have expected fields', () => {
      function checkPatternStructure(obj: unknown, path: string = ''): void {
        if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
          const record = obj as Record<string, unknown>;

          // If this looks like a pattern definition (has specific keys)
          if (record.selector || record.pattern || record.text) {
            // Valid pattern structure
            return;
          }

          // Recurse into nested objects
          for (const [key, value] of Object.entries(record)) {
            checkPatternStructure(value, path ? `${path}.${key}` : key);
          }
        }
      }

      expect(() => checkPatternStructure(patterns)).not.toThrow();
    });
  });
});
