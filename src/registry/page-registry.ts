/**
 * Page Registry
 *
 * Loads and queries navigation metadata for deterministic element selection.
 * Provides page metadata, element selectors, and form field information.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  NavigationMetadata,
  PageMetadata,
  ElementMetadata,
  SelectorDefinition,
  DeterministicSelector,
  SelectorType,
  FormMetadata,
  FormField,
  WorkspaceCard,
  SidebarItem,
  SelectorResolutionResult,
} from '../types';

/**
 * Default path to navigation metadata JSON file
 */
const DEFAULT_METADATA_PATH = path.join(
  __dirname,
  '../../skills/xc-console/console-navigation-metadata.json'
);

/**
 * Selector priority order (higher index = higher priority for fallback)
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
  name: 0.95, // data-testid or name attribute - most stable
  aria_label: 0.9, // accessibility label - very stable
  href_path: 0.85, // URL path - stable for links
  text_match: 0.75, // text content - can change with i18n
  placeholder: 0.7, // placeholder text - moderately stable
  css: 0.5, // CSS selector - can break with UI changes
  ref: 0.1, // session-specific ref - last resort
};

/**
 * Page Registry class for navigation metadata access
 */
export class PageRegistry {
  private metadata: NavigationMetadata;

  constructor(metadataPath?: string) {
    this.metadata = this.loadMetadata(metadataPath);
  }

  /**
   * Load navigation metadata from JSON file
   */
  private loadMetadata(metadataPath?: string): NavigationMetadata {
    const filePath = metadataPath ?? DEFAULT_METADATA_PATH;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as NavigationMetadata;
    } catch (error) {
      throw new Error(
        `Failed to load navigation metadata from ${filePath}: ${error}`
      );
    }
  }

  /**
   * Get the home page metadata
   */
  getHomePage(): PageMetadata {
    const home = this.metadata.home_page;
    return {
      url: home.url,
      page_type: 'home',
      elements: home.elements as Record<string, ElementMetadata>,
    };
  }

  /**
   * Get workspace card by name
   */
  getWorkspaceCard(name: string): WorkspaceCard | undefined {
    const normalizedName = name.toLowerCase().replace(/[\s-]/g, '_');
    const cards = this.metadata.home_page.workspace_cards;

    // Direct match
    if (cards[normalizedName]) {
      return cards[normalizedName];
    }

    // Fuzzy match by display name
    for (const [key, card] of Object.entries(cards)) {
      if (
        card.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(key.replace(/_/g, ' '))
      ) {
        return card;
      }
    }

    return undefined;
  }

  /**
   * Get all workspace cards
   */
  getAllWorkspaceCards(): Record<string, WorkspaceCard> {
    return this.metadata.home_page.workspace_cards;
  }

  /**
   * Get element metadata by path
   * Path format: "home.elements.search" or "waap.sidebar.overview"
   */
  getElement(path: string): ElementMetadata | undefined {
    const parts = path.split('.');
    let current: unknown = this.metadata;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current as ElementMetadata | undefined;
  }

  /**
   * Build deterministic selector chain for an element
   * Returns selectors in priority order with confidence scores
   */
  buildSelectorChain(selectors: SelectorDefinition): DeterministicSelector[] {
    const chain: DeterministicSelector[] = [];

    // Build selectors in priority order
    for (const type of SELECTOR_PRIORITY) {
      const value = this.getSelectorValue(selectors, type);
      if (value) {
        chain.push({
          type,
          value,
          confidence: SELECTOR_CONFIDENCE[type],
        });
      }
    }

    // Sort by confidence (highest first)
    return chain.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get selector value from definition by type
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
   * Get the best available selector for an element
   */
  getBestSelector(element: ElementMetadata): DeterministicSelector | null {
    const chain = this.buildSelectorChain(element.selectors);

    if (chain.length > 0) {
      return chain[0];
    }

    // Fallback to ref if available
    if (element.ref) {
      return {
        type: 'ref',
        value: element.ref,
        confidence: SELECTOR_CONFIDENCE.ref,
      };
    }

    return null;
  }

  /**
   * Convert deterministic selector to browser-compatible format
   */
  selectorToLocator(selector: DeterministicSelector): string {
    switch (selector.type) {
      case 'name':
        return `[data-testid="${selector.value}"]`;
      case 'aria_label':
        return `[aria-label="${selector.value}"]`;
      case 'href_path':
        return `[href="${selector.value}"]`;
      case 'text_match':
        return `text="${selector.value}"`;
      case 'placeholder':
        return `[placeholder="${selector.value}"]`;
      case 'css':
        return selector.value;
      case 'ref':
        // Refs are used directly with chrome-devtools click/fill
        return selector.value;
      default:
        return selector.value;
    }
  }

  /**
   * Get form metadata by form identifier
   */
  getFormMetadata(formId: string): FormMetadata | undefined {
    return this.metadata.forms?.[formId];
  }

  /**
   * Get form field by form ID and field path
   */
  getFormField(formId: string, fieldPath: string): FormField | undefined {
    const form = this.getFormMetadata(formId);
    if (!form) return undefined;

    // Try flat fields first
    if (form.fields?.[fieldPath]) {
      return form.fields[fieldPath];
    }

    // Try sectioned fields
    if (form.sections) {
      for (const section of Object.values(form.sections)) {
        if (section.fields[fieldPath]) {
          return section.fields[fieldPath];
        }
      }
    }

    return undefined;
  }

  /**
   * Get all fields for a form (flattened)
   */
  getAllFormFields(formId: string): Record<string, FormField> {
    const form = this.getFormMetadata(formId);
    if (!form) return {};

    const fields: Record<string, FormField> = {};

    // Add flat fields
    if (form.fields) {
      Object.assign(fields, form.fields);
    }

    // Add sectioned fields
    if (form.sections) {
      for (const section of Object.values(form.sections)) {
        Object.assign(fields, section.fields);
      }
    }

    return fields;
  }

  /**
   * Get sidebar navigation for a workspace
   */
  getWorkspaceSidebar(workspace: string): Record<string, SidebarItem> | undefined {
    const workspaceData = this.metadata.workspaces?.[workspace];
    if (workspaceData?.sidebar?.sections) {
      return workspaceData.sidebar.sections;
    }

    // Check for workspace-specific data in root metadata
    const workspaceKey = `${workspace}_workspace`;
    const wsData = (this.metadata as unknown as Record<string, unknown>)[workspaceKey];
    if (wsData && typeof wsData === 'object' && 'sidebar' in wsData) {
      return (wsData as { sidebar: Record<string, SidebarItem> }).sidebar;
    }

    return undefined;
  }

  /**
   * Find sidebar item by name
   */
  findSidebarItem(
    workspace: string,
    itemName: string
  ): SidebarItem | undefined {
    const sidebar = this.getWorkspaceSidebar(workspace);
    if (!sidebar) return undefined;

    const normalizedName = itemName.toLowerCase().replace(/[\s-]/g, '_');

    // Direct match
    if (sidebar[normalizedName]) {
      return sidebar[normalizedName];
    }

    // Search recursively
    const searchItem = (
      items: Record<string, SidebarItem>
    ): SidebarItem | undefined => {
      for (const [key, item] of Object.entries(items)) {
        if (
          key.toLowerCase() === normalizedName ||
          item.name?.toLowerCase() === itemName.toLowerCase()
        ) {
          return item;
        }

        if (item.children) {
          const found = searchItem(item.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    return searchItem(sidebar);
  }

  /**
   * Get authentication configuration
   */
  getAuthConfig() {
    return this.metadata.authentication;
  }

  /**
   * Get selector priority configuration
   */
  getSelectorPriority(): SelectorType[] {
    return this.metadata.selector_priority ?? SELECTOR_PRIORITY;
  }

  /**
   * Get metadata version
   */
  getVersion(): string {
    return this.metadata.version;
  }

  /**
   * Get last crawl timestamp
   */
  getLastCrawled(): string {
    return this.metadata.last_crawled;
  }

  /**
   * Get crawl summary statistics
   */
  getCrawlSummary() {
    return this.metadata.crawl_summary;
  }

  /**
   * Check if deterministic navigation is enabled
   */
  isDeterministicNavigationEnabled(): boolean {
    return this.metadata.deterministic_navigation?.enabled ?? false;
  }

  /**
   * Get tenant URL
   */
  getTenant(): string {
    return this.metadata.tenant;
  }
}

/**
 * Singleton instance for convenience
 */
let defaultRegistry: PageRegistry | null = null;

/**
 * Get the default page registry instance
 */
export function getPageRegistry(metadataPath?: string): PageRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new PageRegistry(metadataPath);
  }
  return defaultRegistry;
}

/**
 * Reset the default registry (useful for testing)
 */
export function resetPageRegistry(): void {
  defaultRegistry = null;
}
