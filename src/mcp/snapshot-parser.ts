/**
 * Snapshot Parser
 *
 * Parses accessibility tree snapshots from chrome-devtools MCP.
 * Provides methods to find elements by various criteria.
 */

import { DeterministicSelector, SelectorType } from '../types';

/**
 * Parsed element from snapshot
 */
export interface ParsedElement {
  /** Element UID (reference for click/fill operations) */
  uid: string;
  /** Element role (button, textbox, link, etc.) */
  role: string;
  /** Element name/label */
  name?: string;
  /** Element value */
  value?: string;
  /** Element href (for links) */
  href?: string;
  /** Whether element is focused */
  focused?: boolean;
  /** Whether element is disabled */
  disabled?: boolean;
  /** Whether element is expanded */
  expanded?: boolean;
  /** Whether element is selected */
  selected?: boolean;
  /** Element placeholder text */
  placeholder?: string;
  /** Element description */
  description?: string;
  /** Nesting level (indentation depth) */
  level: number;
  /** Raw line from snapshot */
  raw: string;
}

/**
 * Snapshot parsing result
 */
export interface ParsedSnapshot {
  /** All parsed elements */
  elements: ParsedElement[];
  /** Elements indexed by UID */
  byUid: Map<string, ParsedElement>;
  /** Elements indexed by role */
  byRole: Map<string, ParsedElement[]>;
  /** Current page URL (if detected) */
  url?: string;
  /** Current page title (if detected) */
  title?: string;
  /** Focused element UID (if any) */
  focusedUid?: string;
}

/**
 * Element search options
 */
export interface ElementSearchOptions {
  /** Element role to match */
  role?: string;
  /** Element name to match (exact or partial) */
  name?: string;
  /** Element text content to match */
  text?: string;
  /** Href to match (for links) */
  href?: string;
  /** Placeholder to match (for inputs) */
  placeholder?: string;
  /** Whether to use partial matching */
  partial?: boolean;
  /** Whether match should be case-insensitive */
  caseInsensitive?: boolean;
}

/**
 * Snapshot Parser class
 */
export class SnapshotParser {
  /**
   * Parse a raw snapshot string into structured elements
   */
  parse(rawSnapshot: string): ParsedSnapshot {
    const lines = rawSnapshot.split('\n');
    const elements: ParsedElement[] = [];
    const byUid = new Map<string, ParsedElement>();
    const byRole = new Map<string, ParsedElement[]>();

    let url: string | undefined;
    let title: string | undefined;
    let focusedUid: string | undefined;

    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) continue;

      // Try to extract page URL
      const urlMatch = line.match(/^- URL:\s*(.+)$/i);
      if (urlMatch) {
        url = urlMatch[1].trim();
        continue;
      }

      // Try to extract page title
      const titleMatch = line.match(/^- Title:\s*(.+)$/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
        continue;
      }

      // Parse element line
      const element = this.parseLine(line);
      if (element) {
        elements.push(element);
        byUid.set(element.uid, element);

        // Index by role
        const roleElements = byRole.get(element.role) ?? [];
        roleElements.push(element);
        byRole.set(element.role, roleElements);

        // Track focused element
        if (element.focused) {
          focusedUid = element.uid;
        }
      }
    }

    return {
      elements,
      byUid,
      byRole,
      url,
      title,
      focusedUid,
    };
  }

  /**
   * Parse a single line from the snapshot
   */
  private parseLine(line: string): ParsedElement | null {
    // Calculate indentation level
    const level = (line.match(/^(\s*)/)?.[1].length ?? 0) / 2;

    // Match element pattern: [uid] role "name" [properties]
    // Examples:
    // - [1] button "Submit"
    // - [2] textbox "Username" focused
    // - [3] link "Home" href="/home"
    const elementPattern = /\[(\w+)\]\s+(\w+)(?:\s+"([^"]*)")?(.*)$/;
    const match = line.match(elementPattern);

    if (!match) return null;

    const [, uid, role, name, rest] = match;

    const element: ParsedElement = {
      uid,
      role,
      name: name || undefined,
      level,
      raw: line,
    };

    // Parse additional properties from rest of line
    if (rest) {
      // Check for focused
      if (rest.includes('focused')) {
        element.focused = true;
      }

      // Check for disabled
      if (rest.includes('disabled')) {
        element.disabled = true;
      }

      // Check for expanded
      if (rest.includes('expanded')) {
        element.expanded = true;
      }

      // Check for selected
      if (rest.includes('selected')) {
        element.selected = true;
      }

      // Extract href
      const hrefMatch = rest.match(/href="([^"]*)"/);
      if (hrefMatch) {
        element.href = hrefMatch[1];
      }

      // Extract value
      const valueMatch = rest.match(/value="([^"]*)"/);
      if (valueMatch) {
        element.value = valueMatch[1];
      }

      // Extract placeholder
      const placeholderMatch = rest.match(/placeholder="([^"]*)"/);
      if (placeholderMatch) {
        element.placeholder = placeholderMatch[1];
      }

      // Extract description
      const descMatch = rest.match(/description="([^"]*)"/);
      if (descMatch) {
        element.description = descMatch[1];
      }
    }

    return element;
  }

  /**
   * Find an element by UID
   */
  findByUid(snapshot: ParsedSnapshot, uid: string): ParsedElement | undefined {
    return snapshot.byUid.get(uid);
  }

  /**
   * Find elements by role
   */
  findByRole(snapshot: ParsedSnapshot, role: string): ParsedElement[] {
    return snapshot.byRole.get(role) ?? [];
  }

  /**
   * Find elements by text content (name)
   */
  findByText(
    snapshot: ParsedSnapshot,
    text: string,
    options?: { partial?: boolean; caseInsensitive?: boolean }
  ): ParsedElement[] {
    const partial = options?.partial ?? true;
    const caseInsensitive = options?.caseInsensitive ?? true;

    const normalizedText = caseInsensitive ? text.toLowerCase() : text;

    return snapshot.elements.filter(element => {
      if (!element.name) return false;

      const elementName = caseInsensitive ? element.name.toLowerCase() : element.name;

      if (partial) {
        return elementName.includes(normalizedText);
      }
      return elementName === normalizedText;
    });
  }

  /**
   * Find elements by href
   */
  findByHref(
    snapshot: ParsedSnapshot,
    href: string,
    options?: { partial?: boolean }
  ): ParsedElement[] {
    const partial = options?.partial ?? true;

    return snapshot.elements.filter(element => {
      if (!element.href) return false;

      if (partial) {
        return element.href.includes(href);
      }
      return element.href === href;
    });
  }

  /**
   * Find elements by placeholder
   */
  findByPlaceholder(
    snapshot: ParsedSnapshot,
    placeholder: string,
    options?: { partial?: boolean; caseInsensitive?: boolean }
  ): ParsedElement[] {
    const partial = options?.partial ?? true;
    const caseInsensitive = options?.caseInsensitive ?? true;

    const normalizedPlaceholder = caseInsensitive ? placeholder.toLowerCase() : placeholder;

    return snapshot.elements.filter(element => {
      if (!element.placeholder) return false;

      const elementPlaceholder = caseInsensitive
        ? element.placeholder.toLowerCase()
        : element.placeholder;

      if (partial) {
        return elementPlaceholder.includes(normalizedPlaceholder);
      }
      return elementPlaceholder === normalizedPlaceholder;
    });
  }

  /**
   * Find element matching search options
   */
  findElement(
    snapshot: ParsedSnapshot,
    options: ElementSearchOptions
  ): ParsedElement | undefined {
    const results = this.findElements(snapshot, options);
    return results[0];
  }

  /**
   * Find all elements matching search options
   */
  findElements(
    snapshot: ParsedSnapshot,
    options: ElementSearchOptions
  ): ParsedElement[] {
    return snapshot.elements.filter(element => {
      // Check role
      if (options.role && element.role !== options.role) {
        return false;
      }

      // Check name
      if (options.name) {
        if (!element.name) return false;

        const elementName = options.caseInsensitive
          ? element.name.toLowerCase()
          : element.name;
        const searchName = options.caseInsensitive
          ? options.name.toLowerCase()
          : options.name;

        if (options.partial) {
          if (!elementName.includes(searchName)) return false;
        } else {
          if (elementName !== searchName) return false;
        }
      }

      // Check text (alias for name)
      if (options.text) {
        if (!element.name) return false;

        const elementName = options.caseInsensitive
          ? element.name.toLowerCase()
          : element.name;
        const searchText = options.caseInsensitive
          ? options.text.toLowerCase()
          : options.text;

        if (options.partial) {
          if (!elementName.includes(searchText)) return false;
        } else {
          if (elementName !== searchText) return false;
        }
      }

      // Check href
      if (options.href) {
        if (!element.href) return false;

        if (options.partial) {
          if (!element.href.includes(options.href)) return false;
        } else {
          if (element.href !== options.href) return false;
        }
      }

      // Check placeholder
      if (options.placeholder) {
        if (!element.placeholder) return false;

        const elementPlaceholder = options.caseInsensitive
          ? element.placeholder.toLowerCase()
          : element.placeholder;
        const searchPlaceholder = options.caseInsensitive
          ? options.placeholder.toLowerCase()
          : options.placeholder;

        if (options.partial) {
          if (!elementPlaceholder.includes(searchPlaceholder)) return false;
        } else {
          if (elementPlaceholder !== searchPlaceholder) return false;
        }
      }

      return true;
    });
  }

  /**
   * Find element using a deterministic selector
   */
  findBySelector(
    snapshot: ParsedSnapshot,
    selector: DeterministicSelector
  ): ParsedElement | undefined {
    switch (selector.type) {
      case 'ref':
        return this.findByUid(snapshot, selector.value);

      case 'text_match':
        return this.findElement(snapshot, {
          text: selector.value,
          partial: false,
          caseInsensitive: false,
        });

      case 'aria_label':
        return this.findElement(snapshot, {
          name: selector.value,
          partial: false,
          caseInsensitive: false,
        });

      case 'href_path':
        return this.findElement(snapshot, {
          href: selector.value,
          partial: true,
        });

      case 'placeholder':
        return this.findElement(snapshot, {
          placeholder: selector.value,
          partial: false,
          caseInsensitive: false,
        });

      default:
        // For CSS and name selectors, try text matching
        return this.findElement(snapshot, {
          text: selector.value,
          partial: true,
          caseInsensitive: true,
        });
    }
  }

  /**
   * Get all buttons from snapshot
   */
  getButtons(snapshot: ParsedSnapshot): ParsedElement[] {
    return this.findByRole(snapshot, 'button');
  }

  /**
   * Get all links from snapshot
   */
  getLinks(snapshot: ParsedSnapshot): ParsedElement[] {
    return this.findByRole(snapshot, 'link');
  }

  /**
   * Get all textboxes from snapshot
   */
  getTextboxes(snapshot: ParsedSnapshot): ParsedElement[] {
    return this.findByRole(snapshot, 'textbox');
  }

  /**
   * Get all checkboxes from snapshot
   */
  getCheckboxes(snapshot: ParsedSnapshot): ParsedElement[] {
    return this.findByRole(snapshot, 'checkbox');
  }

  /**
   * Get all comboboxes from snapshot
   */
  getComboboxes(snapshot: ParsedSnapshot): ParsedElement[] {
    return this.findByRole(snapshot, 'combobox');
  }

  /**
   * Get focused element
   */
  getFocusedElement(snapshot: ParsedSnapshot): ParsedElement | undefined {
    if (snapshot.focusedUid) {
      return snapshot.byUid.get(snapshot.focusedUid);
    }
    return snapshot.elements.find(e => e.focused);
  }

  /**
   * Check if element exists by text
   */
  hasText(snapshot: ParsedSnapshot, text: string): boolean {
    return this.findByText(snapshot, text).length > 0;
  }

  /**
   * Check if button exists by name
   */
  hasButton(snapshot: ParsedSnapshot, name: string): boolean {
    const buttons = this.findByRole(snapshot, 'button');
    return buttons.some(
      b => b.name?.toLowerCase().includes(name.toLowerCase())
    );
  }

  /**
   * Check if link exists by href
   */
  hasLink(snapshot: ParsedSnapshot, href: string): boolean {
    return this.findByHref(snapshot, href).length > 0;
  }
}

/**
 * Singleton instance
 */
let defaultParser: SnapshotParser | null = null;

/**
 * Get the default snapshot parser instance
 */
export function getSnapshotParser(): SnapshotParser {
  if (!defaultParser) {
    defaultParser = new SnapshotParser();
  }
  return defaultParser;
}

/**
 * Reset the default parser (useful for testing)
 */
export function resetSnapshotParser(): void {
  defaultParser = null;
}

/**
 * Quick parse function
 */
export function parseSnapshot(rawSnapshot: string): ParsedSnapshot {
  return getSnapshotParser().parse(rawSnapshot);
}
