/**
 * SelectorValidator - CSS Selector Validation and Testing
 *
 * Validates CSS selector syntax without requiring a browser.
 * Used by unit tests to verify selector configurations.
 */

export interface SelectorValidationResult {
  isValid: boolean;
  selector: string;
  error?: string;
  specificity?: number;
}

export interface SelectorPriorityChain {
  selectors: string[];
  validCount: number;
  invalidCount: number;
  results: SelectorValidationResult[];
}

/**
 * Validate CSS selector syntax
 * Uses a regex-based approach for unit tests (no browser required)
 */
export function validateCssSelector(selector: string): SelectorValidationResult {
  const result: SelectorValidationResult = {
    isValid: false,
    selector,
  };

  if (!selector || typeof selector !== 'string') {
    result.error = 'Selector must be a non-empty string';
    return result;
  }

  // Trim whitespace
  const trimmed = selector.trim();
  if (trimmed.length === 0) {
    result.error = 'Selector cannot be empty';
    return result;
  }

  // Check for common invalid patterns
  const invalidPatterns = [
    { pattern: /^\s*,/, message: 'Selector cannot start with comma' },
    { pattern: /,\s*$/, message: 'Selector cannot end with comma' },
    { pattern: /,,/, message: 'Double commas not allowed' },
    { pattern: /^\s*>/, message: 'Selector cannot start with combinator >' },
    { pattern: /^\s*\+/, message: 'Selector cannot start with combinator +' },
    { pattern: /^\s*~/, message: 'Selector cannot start with combinator ~' },
    { pattern: /\[\s*\]/, message: 'Empty attribute selector not allowed' },
  ];

  for (const { pattern, message } of invalidPatterns) {
    if (pattern.test(trimmed)) {
      result.error = message;
      return result;
    }
  }

  // Validate using document.querySelector in a try-catch pattern simulation
  // Since we're in Node.js without DOM, we use a permissive pattern matching approach
  try {
    // A permissive regex that accepts most valid CSS selectors
    // This includes: elements, classes, IDs, attribute selectors, pseudo-classes,
    // combinators, and compound selectors
    const validCssPattern = /^[a-zA-Z*#.\[:][a-zA-Z0-9_\-#.\[\]="'*^$|~:()>+\s,/]*$/;

    // Check for basic validity - must start with valid selector start character
    // and contain only valid CSS selector characters
    const isValidPattern = validCssPattern.test(trimmed);

    // Additional check: balanced brackets
    const openBrackets = (trimmed.match(/\[/g) || []).length;
    const closeBrackets = (trimmed.match(/\]/g) || []).length;
    const bracketsBalanced = openBrackets === closeBrackets;

    // Additional check: balanced parentheses
    const openParens = (trimmed.match(/\(/g) || []).length;
    const closeParens = (trimmed.match(/\)/g) || []).length;
    const parensBalanced = openParens === closeParens;

    if (isValidPattern && bracketsBalanced && parensBalanced) {
      result.isValid = true;
      result.specificity = calculateSpecificity(trimmed);
    } else {
      if (!bracketsBalanced) {
        result.error = 'Unbalanced brackets in selector';
      } else if (!parensBalanced) {
        result.error = 'Unbalanced parentheses in selector';
      } else {
        result.error = 'Invalid CSS selector syntax';
      }
    }
  } catch (e) {
    result.error = `Selector validation error: ${e instanceof Error ? e.message : String(e)}`;
  }

  return result;
}

/**
 * Calculate CSS specificity score
 * Returns a single number for comparison (higher = more specific)
 */
export function calculateSpecificity(selector: string): number {
  let ids = 0;
  let classes = 0;
  let elements = 0;

  // Count IDs (#)
  ids = (selector.match(/#[a-zA-Z][a-zA-Z0-9_-]*/g) || []).length;

  // Count classes (.), attribute selectors ([]), and pseudo-classes (:)
  classes += (selector.match(/\.[a-zA-Z][a-zA-Z0-9_-]*/g) || []).length;
  classes += (selector.match(/\[.+?\]/g) || []).length;
  classes += (selector.match(/:[a-zA-Z][a-zA-Z-]*/g) || []).length;

  // Count element selectors and pseudo-elements (::)
  elements += (selector.match(/^[a-zA-Z][a-zA-Z0-9-]*|[\s>+~][a-zA-Z][a-zA-Z0-9-]*/g) || []).length;
  elements += (selector.match(/::[a-zA-Z][a-zA-Z-]*/g) || []).length;

  // Specificity: (ids * 100) + (classes * 10) + elements
  return ids * 100 + classes * 10 + elements;
}

/**
 * Validate a priority chain of selectors
 */
export function validateSelectorPriorityChain(selectors: string[]): SelectorPriorityChain {
  const results = selectors.map(validateCssSelector);

  return {
    selectors,
    validCount: results.filter((r) => r.isValid).length,
    invalidCount: results.filter((r) => !r.isValid).length,
    results,
  };
}

/**
 * Validate href_path selector pattern
 * These are special selectors used in F5 XC console navigation
 */
export function validateHrefPathSelector(hrefPath: string): SelectorValidationResult {
  const result: SelectorValidationResult = {
    isValid: false,
    selector: hrefPath,
  };

  if (!hrefPath || typeof hrefPath !== 'string') {
    result.error = 'href_path must be a non-empty string';
    return result;
  }

  // href_path should be a valid URL path
  const pathPattern = /^\/[a-zA-Z0-9/_-]*$/;
  if (pathPattern.test(hrefPath)) {
    result.isValid = true;
    // Convert to actual CSS selector for specificity
    result.specificity = calculateSpecificity(`a[href*="${hrefPath}"]`);
  } else {
    result.error = 'Invalid href_path format';
  }

  return result;
}

/**
 * Validate all selectors in a navigation metadata object
 */
export function validateNavigationSelectors(metadata: NavigationMetadata): NavigationValidationResult {
  const results: NavigationValidationResult = {
    totalSelectors: 0,
    validSelectors: 0,
    invalidSelectors: 0,
    errors: [],
  };

  // Validate workspaces
  if (metadata.workspaces) {
    for (const [workspaceKey, workspace] of Object.entries(metadata.workspaces)) {
      if (workspace.selectors) {
        for (const selector of workspace.selectors) {
          results.totalSelectors++;
          const validation = validateCssSelector(selector);
          if (validation.isValid) {
            results.validSelectors++;
          } else {
            results.invalidSelectors++;
            results.errors.push({
              location: `workspaces.${workspaceKey}.selectors`,
              selector,
              error: validation.error || 'Unknown error',
            });
          }
        }
      }

      // Validate href_path
      if (workspace.href_path) {
        results.totalSelectors++;
        const validation = validateHrefPathSelector(workspace.href_path);
        if (validation.isValid) {
          results.validSelectors++;
        } else {
          results.invalidSelectors++;
          results.errors.push({
            location: `workspaces.${workspaceKey}.href_path`,
            selector: workspace.href_path,
            error: validation.error || 'Unknown error',
          });
        }
      }
    }
  }

  return results;
}

// Type definitions for navigation metadata
export interface NavigationMetadata {
  workspaces?: Record<string, WorkspaceMetadata>;
  sidebar?: Record<string, SidebarMetadata>;
  [key: string]: unknown;
}

export interface WorkspaceMetadata {
  selectors?: string[];
  href_path?: string;
  [key: string]: unknown;
}

export interface SidebarMetadata {
  selectors?: string[];
  [key: string]: unknown;
}

export interface NavigationValidationResult {
  totalSelectors: number;
  validSelectors: number;
  invalidSelectors: number;
  errors: Array<{
    location: string;
    selector: string;
    error: string;
  }>;
}
