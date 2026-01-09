/**
 * Selector Chain Executor
 *
 * Tries selectors in priority order to find elements deterministically.
 * Falls back through selector types until an element is found.
 */

import {
  DeterministicSelector,
  SelectorType,
  SelectorDefinition,
  SelectorResolutionResult,
  ElementMetadata,
} from '../types';
import { ParsedSnapshot, ParsedElement, getSnapshotParser } from '../mcp/snapshot-parser';

/**
 * Selector priority order (most stable first)
 */
const SELECTOR_PRIORITY: SelectorType[] = [
  'name',
  'aria_label',
  'href_path',
  'text_match',
  'placeholder',
  'css',
  'ref',
];

/**
 * Confidence scores by selector type
 */
const SELECTOR_CONFIDENCE: Record<SelectorType, number> = {
  name: 0.95,
  aria_label: 0.9,
  href_path: 0.85,
  text_match: 0.75,
  placeholder: 0.7,
  css: 0.5,
  ref: 0.1,
};

/**
 * Selector chain execution options
 */
export interface SelectorChainOptions {
  /** Custom priority order (overrides default) */
  priority?: SelectorType[];
  /** Minimum confidence threshold */
  minConfidence?: number;
  /** Whether to stop at first match */
  stopOnFirst?: boolean;
  /** Whether to include ref as fallback */
  allowRefFallback?: boolean;
}

/**
 * Selector chain result
 */
export interface SelectorChainResult {
  /** Whether any selector found the element */
  found: boolean;
  /** The element UID if found */
  uid?: string;
  /** The parsed element if found */
  element?: ParsedElement;
  /** The selector that succeeded */
  usedSelector?: DeterministicSelector;
  /** All selectors that were tried */
  triedSelectors: DeterministicSelector[];
  /** Confidence of the match */
  confidence: number;
  /** Error message if not found */
  error?: string;
}

/**
 * Selector Chain Executor class
 */
export class SelectorChainExecutor {
  private parser = getSnapshotParser();
  private priority: SelectorType[];
  private minConfidence: number;

  constructor(options?: SelectorChainOptions) {
    this.priority = options?.priority ?? SELECTOR_PRIORITY;
    this.minConfidence = options?.minConfidence ?? 0;
  }

  /**
   * Build a selector chain from element metadata
   */
  buildChain(element: ElementMetadata): DeterministicSelector[] {
    const chain: DeterministicSelector[] = [];
    const selectors = element.selectors;

    for (const type of this.priority) {
      const value = this.getSelectorValue(selectors, type);
      if (value) {
        chain.push({
          type,
          value,
          confidence: SELECTOR_CONFIDENCE[type],
        });
      }
    }

    // Add ref as final fallback if available
    if (element.ref) {
      chain.push({
        type: 'ref',
        value: element.ref,
        confidence: SELECTOR_CONFIDENCE.ref,
      });
    }

    return chain;
  }

  /**
   * Extract selector value from definition
   */
  private getSelectorValue(
    selectors: SelectorDefinition,
    type: SelectorType
  ): string | null {
    switch (type) {
      case 'name':
        return selectors.data_testid;
      case 'aria_label':
        return selectors.aria_label;
      case 'href_path':
        return selectors.href_path ?? null;
      case 'text_match':
        return selectors.text_match;
      case 'placeholder':
        return selectors.placeholder ?? null;
      case 'css':
        return selectors.css;
      default:
        return null;
    }
  }

  /**
   * Execute selector chain against a snapshot
   */
  execute(
    snapshot: ParsedSnapshot,
    element: ElementMetadata
  ): SelectorChainResult {
    const chain = this.buildChain(element);
    return this.executeChain(snapshot, chain);
  }

  /**
   * Execute a pre-built selector chain
   */
  executeChain(
    snapshot: ParsedSnapshot,
    chain: DeterministicSelector[]
  ): SelectorChainResult {
    const triedSelectors: DeterministicSelector[] = [];

    for (const selector of chain) {
      // Skip if below minimum confidence
      if (selector.confidence < this.minConfidence) {
        continue;
      }

      triedSelectors.push(selector);

      const element = this.trySelector(snapshot, selector);
      if (element) {
        return {
          found: true,
          uid: element.uid,
          element,
          usedSelector: selector,
          triedSelectors,
          confidence: selector.confidence,
        };
      }
    }

    return {
      found: false,
      triedSelectors,
      confidence: 0,
      error: `Element not found after trying ${triedSelectors.length} selectors`,
    };
  }

  /**
   * Try a single selector against the snapshot
   */
  private trySelector(
    snapshot: ParsedSnapshot,
    selector: DeterministicSelector
  ): ParsedElement | undefined {
    return this.parser.findBySelector(snapshot, selector);
  }

  /**
   * Find element by text with selector chain fallback
   */
  findByText(
    snapshot: ParsedSnapshot,
    text: string,
    options?: { role?: string; exact?: boolean }
  ): SelectorChainResult {
    const triedSelectors: DeterministicSelector[] = [];

    // Try exact text match first
    const textSelector: DeterministicSelector = {
      type: 'text_match',
      value: text,
      confidence: options?.exact ? 0.9 : 0.75,
    };
    triedSelectors.push(textSelector);

    const elements = this.parser.findByText(snapshot, text, {
      partial: !options?.exact,
      caseInsensitive: !options?.exact,
    });

    // Filter by role if specified
    const filtered = options?.role
      ? elements.filter(e => e.role === options.role)
      : elements;

    if (filtered.length > 0) {
      return {
        found: true,
        uid: filtered[0].uid,
        element: filtered[0],
        usedSelector: textSelector,
        triedSelectors,
        confidence: textSelector.confidence,
      };
    }

    return {
      found: false,
      triedSelectors,
      confidence: 0,
      error: `No element found with text "${text}"`,
    };
  }

  /**
   * Find element by aria label
   */
  findByAriaLabel(
    snapshot: ParsedSnapshot,
    label: string,
    options?: { role?: string }
  ): SelectorChainResult {
    const triedSelectors: DeterministicSelector[] = [];

    const selector: DeterministicSelector = {
      type: 'aria_label',
      value: label,
      confidence: SELECTOR_CONFIDENCE.aria_label,
    };
    triedSelectors.push(selector);

    const elements = this.parser.findElements(snapshot, {
      name: label,
      partial: false,
      caseInsensitive: false,
      role: options?.role,
    });

    if (elements.length > 0) {
      return {
        found: true,
        uid: elements[0].uid,
        element: elements[0],
        usedSelector: selector,
        triedSelectors,
        confidence: selector.confidence,
      };
    }

    return {
      found: false,
      triedSelectors,
      confidence: 0,
      error: `No element found with aria-label "${label}"`,
    };
  }

  /**
   * Find element by href path
   */
  findByHref(
    snapshot: ParsedSnapshot,
    href: string,
    options?: { partial?: boolean }
  ): SelectorChainResult {
    const triedSelectors: DeterministicSelector[] = [];

    const selector: DeterministicSelector = {
      type: 'href_path',
      value: href,
      confidence: SELECTOR_CONFIDENCE.href_path,
    };
    triedSelectors.push(selector);

    const elements = this.parser.findByHref(snapshot, href, {
      partial: options?.partial ?? true,
    });

    if (elements.length > 0) {
      return {
        found: true,
        uid: elements[0].uid,
        element: elements[0],
        usedSelector: selector,
        triedSelectors,
        confidence: selector.confidence,
      };
    }

    return {
      found: false,
      triedSelectors,
      confidence: 0,
      error: `No element found with href "${href}"`,
    };
  }

  /**
   * Find button by name
   */
  findButton(
    snapshot: ParsedSnapshot,
    name: string
  ): SelectorChainResult {
    return this.findByText(snapshot, name, { role: 'button' });
  }

  /**
   * Find link by text or href
   */
  findLink(
    snapshot: ParsedSnapshot,
    textOrHref: string
  ): SelectorChainResult {
    // Try href first (more specific)
    const hrefResult = this.findByHref(snapshot, textOrHref);
    if (hrefResult.found) {
      return hrefResult;
    }

    // Fall back to text
    return this.findByText(snapshot, textOrHref, { role: 'link' });
  }

  /**
   * Find textbox by placeholder or label
   */
  findTextbox(
    snapshot: ParsedSnapshot,
    identifier: string
  ): SelectorChainResult {
    const triedSelectors: DeterministicSelector[] = [];

    // Try placeholder first
    const placeholderSelector: DeterministicSelector = {
      type: 'placeholder',
      value: identifier,
      confidence: SELECTOR_CONFIDENCE.placeholder,
    };
    triedSelectors.push(placeholderSelector);

    const byPlaceholder = this.parser.findByPlaceholder(snapshot, identifier, {
      partial: true,
      caseInsensitive: true,
    });

    if (byPlaceholder.length > 0) {
      return {
        found: true,
        uid: byPlaceholder[0].uid,
        element: byPlaceholder[0],
        usedSelector: placeholderSelector,
        triedSelectors,
        confidence: placeholderSelector.confidence,
      };
    }

    // Fall back to name/label
    const labelSelector: DeterministicSelector = {
      type: 'aria_label',
      value: identifier,
      confidence: SELECTOR_CONFIDENCE.aria_label,
    };
    triedSelectors.push(labelSelector);

    const byLabel = this.parser.findElements(snapshot, {
      name: identifier,
      role: 'textbox',
      partial: true,
      caseInsensitive: true,
    });

    if (byLabel.length > 0) {
      return {
        found: true,
        uid: byLabel[0].uid,
        element: byLabel[0],
        usedSelector: labelSelector,
        triedSelectors,
        confidence: labelSelector.confidence,
      };
    }

    return {
      found: false,
      triedSelectors,
      confidence: 0,
      error: `No textbox found for "${identifier}"`,
    };
  }

  /**
   * Convert result to SelectorResolutionResult type
   */
  toResolutionResult(result: SelectorChainResult): SelectorResolutionResult {
    return {
      found: result.found,
      uid: result.uid,
      used_selector: result.usedSelector,
      tried_selectors: result.triedSelectors,
      error: result.error,
    };
  }
}

/**
 * Singleton instance
 */
let defaultExecutor: SelectorChainExecutor | null = null;

/**
 * Get the default selector chain executor
 */
export function getSelectorChainExecutor(
  options?: SelectorChainOptions
): SelectorChainExecutor {
  if (!defaultExecutor) {
    defaultExecutor = new SelectorChainExecutor(options);
  }
  return defaultExecutor;
}

/**
 * Reset the default executor (useful for testing)
 */
export function resetSelectorChainExecutor(): void {
  defaultExecutor = null;
}

/**
 * Quick function to find element by selector chain
 */
export function findElement(
  snapshot: ParsedSnapshot,
  element: ElementMetadata
): SelectorChainResult {
  return getSelectorChainExecutor().execute(snapshot, element);
}
