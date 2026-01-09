/**
 * Crawl Handler
 *
 * Systematic page discovery and metadata extraction for F5 XC Console.
 * Implements the crawl workflow defined in crawl-workflow.md.
 */

import {
  PageMetadata,
  ElementMetadata,
  WorkspaceMetadata,
  PageType,
  SelectorDefinition,
  FormMetadata,
  FormField,
  TableMetadata,
  TableColumn,
  InputType,
  SidebarItem,
} from '../types';
import { ParsedSnapshot, ParsedElement, getSnapshotParser } from '../mcp/snapshot-parser';
import { ChromeDevToolsAdapter } from '../mcp/chrome-devtools-adapter';

/**
 * Crawl options
 */
export interface CrawlOptions {
  /** Tenant URL to crawl */
  tenantUrl: string;
  /** Specific workspaces to crawl (empty = all) */
  workspaces?: string[];
  /** Whether to crawl forms */
  crawlForms?: boolean;
  /** Whether to extract selectors via JavaScript */
  extractSelectors?: boolean;
  /** Maximum pages to crawl */
  maxPages?: number;
  /** Timeout between navigations in ms */
  navigationTimeout?: number;
  /** Whether to take screenshots */
  takeScreenshots?: boolean;
}

/**
 * Crawl progress callback
 */
export type CrawlProgressCallback = (progress: CrawlProgress) => void;

/**
 * Crawl progress information
 */
export interface CrawlProgress {
  /** Current phase */
  phase: CrawlPhase;
  /** Current workspace being crawled */
  currentWorkspace?: string;
  /** Current page being crawled */
  currentPage?: string;
  /** Pages crawled so far */
  pagesCrawled: number;
  /** Total pages discovered */
  totalPages: number;
  /** Forms extracted */
  formsExtracted: number;
  /** Elements found */
  elementsFound: number;
  /** Elapsed time in ms */
  elapsedMs: number;
  /** Status message */
  message: string;
}

/**
 * Crawl phases
 */
export type CrawlPhase =
  | 'initializing'
  | 'authenticating'
  | 'crawling_home'
  | 'crawling_workspace'
  | 'extracting_forms'
  | 'detecting_state'
  | 'compiling'
  | 'complete'
  | 'error';

/**
 * Crawl result
 */
export interface CrawlResult {
  /** Whether crawl succeeded */
  success: boolean;
  /** Crawl metadata */
  metadata: CrawlMetadata;
  /** Discovered workspaces */
  workspaces: Record<string, WorkspaceMetadata>;
  /** Discovered pages */
  pages: Record<string, PageMetadata>;
  /** Navigation tree */
  navigationTree: NavigationNode;
  /** Errors encountered */
  errors: CrawlError[];
  /** Crawl statistics */
  stats: CrawlStats;
}

/**
 * Crawl metadata header
 */
export interface CrawlMetadata {
  /** Metadata version */
  version: string;
  /** Tenant URL */
  tenant: string;
  /** Crawl timestamp */
  lastCrawled: string;
  /** Crawl duration in minutes */
  crawlDurationMinutes: number;
  /** Number of pages crawled */
  pagesCrawled: number;
  /** Number of forms extracted */
  formsExtracted: number;
  /** Total elements found */
  totalElements: number;
  /** Selectors extracted */
  selectorsExtracted: number;
}

/**
 * Navigation tree node
 */
export interface NavigationNode {
  /** Node name */
  name: string;
  /** URL path */
  url?: string;
  /** Child nodes */
  children: Record<string, NavigationNode>;
}

/**
 * Crawl error
 */
export interface CrawlError {
  /** Error phase */
  phase: CrawlPhase;
  /** Page or element that caused error */
  location: string;
  /** Error message */
  message: string;
  /** Timestamp */
  timestamp: string;
}

/**
 * Crawl statistics
 */
export interface CrawlStats {
  /** Start time */
  startTime: string;
  /** End time */
  endTime: string;
  /** Duration in ms */
  durationMs: number;
  /** Pages crawled */
  pagesCrawled: number;
  /** Forms extracted */
  formsExtracted: number;
  /** Elements found */
  elementsFound: number;
  /** Selectors extracted */
  selectorsExtracted: number;
  /** Errors encountered */
  errorsCount: number;
}

/**
 * Extracted element from JavaScript
 */
export interface ExtractedElement {
  /** Element index */
  index: number;
  /** Tag name */
  tagName: string;
  /** Role attribute */
  role?: string;
  /** Aria label */
  ariaLabel?: string;
  /** Name attribute */
  name?: string;
  /** Type attribute */
  type?: string;
  /** Text content */
  textContent?: string;
  /** Placeholder */
  placeholder?: string;
  /** Href */
  href?: string;
  /** Deterministic selector */
  deterministicSelector?: string;
  /** Selector type */
  selectorType?: string;
  /** Is visible */
  isVisible: boolean;
}

/**
 * Known workspaces to crawl
 */
const KNOWN_WORKSPACES: Record<string, string> = {
  'web-app-and-api-protection': 'Web App & API Protection',
  'multi-cloud-network-connect': 'Multi-Cloud Network Connect',
  'multi-cloud-app-connect': 'Multi-Cloud App Connect',
  'distributed-apps': 'Distributed Apps',
  'dns-management': 'DNS Management',
  'bot-defense': 'Bot Defense',
  'data-intelligence': 'Data Intelligence',
  'client-side-defense': 'Client-Side Defense',
  'administration': 'Administration',
};

/**
 * JavaScript to extract deterministic selectors
 */
const SELECTOR_EXTRACTION_SCRIPT = `() => {
  function buildDeterministicSelector(el) {
    const name = el.getAttribute('name');
    if (name) return { type: 'name', selector: '[name="' + name + '"]' };

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return { type: 'aria_label', selector: '[aria-label="' + ariaLabel + '"]' };

    const role = el.getAttribute('role');
    const text = el.textContent?.trim().substring(0, 50);
    if (role && text) return { type: 'role_text', selector: '[role="' + role + '"]:has-text("' + text + '")' };

    if (text && text.length < 40) {
      return { type: 'tag_text', selector: el.tagName.toLowerCase() + ':has-text("' + text + '")' };
    }

    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return { type: 'placeholder', selector: '[placeholder="' + placeholder + '"]' };

    return null;
  }

  const elements = document.querySelectorAll('button, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="listbox"], a[href^="/"]');
  const results = [];

  elements.forEach((el, index) => {
    const selectorInfo = buildDeterministicSelector(el);
    if (selectorInfo) {
      results.push({
        index: index,
        tagName: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        name: el.getAttribute('name'),
        type: el.getAttribute('type'),
        textContent: el.textContent?.trim().substring(0, 100),
        placeholder: el.getAttribute('placeholder'),
        href: el.getAttribute('href'),
        deterministicSelector: selectorInfo.selector,
        selectorType: selectorInfo.type,
        isVisible: el.offsetParent !== null
      });
    }
  });

  return JSON.stringify(results, null, 2);
}`;

/**
 * JavaScript to extract navigation links
 */
const NAVIGATION_EXTRACTION_SCRIPT = `() => {
  const links = document.querySelectorAll('nav a[href], .sidebar a[href], [role="navigation"] a[href], aside a[href]');
  const urls = [];

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('/web/')) {
      urls.push({
        url: href,
        text: link.textContent?.trim(),
        ariaLabel: link.getAttribute('aria-label')
      });
    }
  });

  return JSON.stringify(urls, null, 2);
}`;

/**
 * Crawl Handler class
 */
export class CrawlHandler {
  private options: Required<CrawlOptions>;
  private parser = getSnapshotParser();
  private startTime: Date | null = null;
  private progressCallback?: CrawlProgressCallback;

  // Crawl state
  private pages: Record<string, PageMetadata> = {};
  private workspaces: Record<string, WorkspaceMetadata> = {};
  private navigationTree: NavigationNode = { name: 'Root', children: {} };
  private errors: CrawlError[] = [];
  private elementsFound = 0;
  private selectorsExtracted = 0;
  private formsExtracted = 0;

  constructor(options: CrawlOptions) {
    this.options = {
      tenantUrl: options.tenantUrl,
      workspaces: options.workspaces ?? [],
      crawlForms: options.crawlForms ?? true,
      extractSelectors: options.extractSelectors ?? true,
      maxPages: options.maxPages ?? 100,
      navigationTimeout: options.navigationTimeout ?? 3000,
      takeScreenshots: options.takeScreenshots ?? false,
    };
  }

  /**
   * Set progress callback
   */
  onProgress(callback: CrawlProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Report progress
   */
  private reportProgress(
    phase: CrawlPhase,
    message: string,
    extra?: Partial<CrawlProgress>
  ): void {
    if (this.progressCallback) {
      this.progressCallback({
        phase,
        pagesCrawled: Object.keys(this.pages).length,
        totalPages: Object.keys(this.pages).length,
        formsExtracted: this.formsExtracted,
        elementsFound: this.elementsFound,
        elapsedMs: this.startTime ? Date.now() - this.startTime.getTime() : 0,
        message,
        ...extra,
      });
    }
  }

  /**
   * Generate MCP instructions for crawling
   * Returns instructions that Claude can execute via chrome-devtools MCP
   */
  generateCrawlInstructions(): CrawlInstruction[] {
    const instructions: CrawlInstruction[] = [];

    // Phase 1: Initialize and navigate to home
    instructions.push({
      step: 1,
      phase: 'initializing',
      tool: 'mcp__chrome-devtools__navigate_page',
      params: ChromeDevToolsAdapter.buildNavigationParams({
        url: `${this.options.tenantUrl}/web/home`,
        timeout: this.options.navigationTimeout,
      }),
      description: 'Navigate to tenant home page',
      expectedOutcome: 'Home page loaded',
    });

    // Wait for page to load
    instructions.push({
      step: 2,
      phase: 'initializing',
      tool: 'mcp__chrome-devtools__wait_for',
      params: ChromeDevToolsAdapter.buildWaitParams({ time: 2 }),
      description: 'Wait for page to load',
      expectedOutcome: 'Page stable',
    });

    // Take snapshot to verify authentication
    instructions.push({
      step: 3,
      phase: 'authenticating',
      tool: 'mcp__chrome-devtools__take_snapshot',
      params: {},
      description: 'Take snapshot to check authentication',
      expectedOutcome: 'Snapshot showing home page or login',
    });

    // Phase 2: Extract home page metadata
    instructions.push({
      step: 4,
      phase: 'crawling_home',
      tool: 'mcp__chrome-devtools__take_snapshot',
      params: {},
      description: 'Extract home page structure',
      expectedOutcome: 'Workspace cards identified',
    });

    // Extract selectors via JavaScript
    if (this.options.extractSelectors) {
      instructions.push({
        step: 5,
        phase: 'crawling_home',
        tool: 'mcp__chrome-devtools__evaluate_script',
        params: { function: SELECTOR_EXTRACTION_SCRIPT },
        description: 'Extract deterministic selectors',
        expectedOutcome: 'Selectors extracted for all interactive elements',
      });
    }

    // Extract navigation links
    instructions.push({
      step: 6,
      phase: 'crawling_home',
      tool: 'mcp__chrome-devtools__evaluate_script',
      params: { function: NAVIGATION_EXTRACTION_SCRIPT },
      description: 'Extract navigation URLs',
      expectedOutcome: 'URL sitemap populated',
    });

    return instructions;
  }

  /**
   * Generate instructions to crawl a specific workspace
   */
  generateWorkspaceCrawlInstructions(workspaceId: string): CrawlInstruction[] {
    const instructions: CrawlInstruction[] = [];
    const workspaceName = KNOWN_WORKSPACES[workspaceId] ?? workspaceId;

    // Navigate to workspace
    instructions.push({
      step: 1,
      phase: 'crawling_workspace',
      tool: 'mcp__chrome-devtools__navigate_page',
      params: ChromeDevToolsAdapter.buildNavigationParams({
        url: `${this.options.tenantUrl}/web/workspaces/${workspaceId}`,
        timeout: this.options.navigationTimeout,
      }),
      description: `Navigate to ${workspaceName} workspace`,
      expectedOutcome: 'Workspace loaded',
    });

    // Wait for load
    instructions.push({
      step: 2,
      phase: 'crawling_workspace',
      tool: 'mcp__chrome-devtools__wait_for',
      params: ChromeDevToolsAdapter.buildWaitParams({ time: 2 }),
      description: 'Wait for workspace to load',
      expectedOutcome: 'Sidebar and content visible',
    });

    // Take snapshot
    instructions.push({
      step: 3,
      phase: 'crawling_workspace',
      tool: 'mcp__chrome-devtools__take_snapshot',
      params: {},
      description: 'Extract workspace structure',
      expectedOutcome: 'Sidebar navigation and page elements',
    });

    // Extract selectors
    if (this.options.extractSelectors) {
      instructions.push({
        step: 4,
        phase: 'crawling_workspace',
        tool: 'mcp__chrome-devtools__evaluate_script',
        params: { function: SELECTOR_EXTRACTION_SCRIPT },
        description: 'Extract workspace selectors',
        expectedOutcome: 'All interactive elements catalogued',
      });
    }

    return instructions;
  }

  /**
   * Process a snapshot and extract page metadata
   */
  processSnapshot(
    url: string,
    snapshot: ParsedSnapshot,
    extractedElements?: ExtractedElement[]
  ): PageMetadata {
    const elements: Record<string, ElementMetadata> = {};
    let form: FormMetadata | undefined;
    let table: TableMetadata | undefined;

    // Process elements from snapshot
    for (const element of snapshot.elements) {
      if (this.isInteractiveElement(element)) {
        const elementId = this.generateElementId(element);
        const selectors = this.buildSelectors(element, extractedElements);

        elements[elementId] = {
          ref: element.uid,
          selectors,
          name: element.name,
        };

        this.elementsFound++;
        if (selectors.aria_label || selectors.text_match) {
          this.selectorsExtracted++;
        }
      }
    }

    // Detect form structure
    if (this.detectFormPresence(snapshot)) {
      form = this.extractFormMetadata(snapshot, extractedElements);
      if (form) {
        this.formsExtracted++;
      }
    }

    // Detect table structure
    if (this.detectTablePresence(snapshot)) {
      table = this.extractTableMetadata(snapshot);
    }

    const pageMetadata: PageMetadata = {
      url,
      page_type: this.detectPageType(url, snapshot),
      title: snapshot.title ?? '',
      workspace: this.extractWorkspaceFromUrl(url),
      elements,
    };

    if (form) {
      pageMetadata.form = form;
    }

    if (table) {
      pageMetadata.table = table;
    }

    // Store in pages
    this.pages[url] = pageMetadata;

    return pageMetadata;
  }

  /**
   * Check if element is interactive
   */
  private isInteractiveElement(element: ParsedElement): boolean {
    const interactiveRoles = [
      'button',
      'link',
      'textbox',
      'combobox',
      'listbox',
      'menuitem',
      'tab',
      'checkbox',
      'radio',
      'switch',
      'slider',
      'searchbox',
    ];

    return interactiveRoles.includes(element.role ?? '');
  }

  /**
   * Generate element ID from element properties
   */
  private generateElementId(element: ParsedElement): string {
    // Use name if available
    if (element.name) {
      return element.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 50);
    }

    // Use role + uid
    return `${element.role ?? 'element'}_${element.uid ?? 'unknown'}`;
  }

  /**
   * Build selector definition for element
   */
  private buildSelectors(
    element: ParsedElement,
    extractedElements?: ExtractedElement[]
  ): SelectorDefinition {
    const selectors: SelectorDefinition = {
      data_testid: null,
      aria_label: null,
      text_match: null,
      css: null,
    };

    // Try to find matching extracted element with JS selectors
    if (extractedElements) {
      const match = this.findMatchingExtractedElement(element, extractedElements);
      if (match) {
        if (match.ariaLabel) {
          selectors.aria_label = match.ariaLabel;
        }
        if (match.placeholder) {
          selectors.placeholder = match.placeholder;
        }
        if (match.deterministicSelector) {
          selectors.css = match.deterministicSelector;
        }
      }
    }

    // Build text match selector from element name
    if (element.name) {
      selectors.text_match = element.name;
    }

    // Build href path selector for links
    if (element.role === 'link' && element.href) {
      selectors.href_path = element.href;
    }

    return selectors;
  }

  /**
   * Find matching extracted element
   */
  private findMatchingExtractedElement(
    element: ParsedElement,
    extractedElements: ExtractedElement[]
  ): ExtractedElement | undefined {
    // Match by text content
    if (element.name) {
      const textMatch = extractedElements.find(
        e => e.textContent?.includes(element.name ?? '') && e.role === element.role
      );
      if (textMatch) return textMatch;
    }

    // Match by role
    return extractedElements.find(e => e.role === element.role);
  }

  /**
   * Detect if page has a form
   */
  private detectFormPresence(snapshot: ParsedSnapshot): boolean {
    const formIndicators = ['textbox', 'combobox', 'checkbox', 'radio'];
    let inputCount = 0;

    for (const element of snapshot.elements) {
      if (formIndicators.includes(element.role ?? '')) {
        inputCount++;
      }
    }

    return inputCount >= 2; // At least 2 form fields
  }

  /**
   * Extract form metadata
   */
  private extractFormMetadata(
    snapshot: ParsedSnapshot,
    extractedElements?: ExtractedElement[]
  ): FormMetadata | undefined {
    const fields: Record<string, FormField> = {};
    let submitButton: ElementMetadata | undefined;
    let cancelButton: ElementMetadata | undefined;

    for (const element of snapshot.elements) {
      // Detect form fields
      if (['textbox', 'combobox', 'checkbox', 'radio', 'listbox', 'searchbox'].includes(element.role ?? '')) {
        const selectors = this.buildSelectors(element, extractedElements);
        const fieldName = this.extractFieldName(element, extractedElements);
        const fieldType = this.mapRoleToFieldType(element.role ?? '') as InputType;

        fields[fieldName] = {
          ref: element.uid,
          label: element.name ?? '',
          type: fieldType,
          required: false, // Default since ParsedElement doesn't have required
          selectors,
        };
      }

      // Detect submit/cancel buttons
      if (element.role === 'button') {
        const buttonText = (element.name ?? '').toLowerCase();
        const selectors = this.buildSelectors(element, extractedElements);

        if (buttonText.includes('save') || buttonText.includes('submit') || buttonText.includes('create')) {
          submitButton = {
            ref: element.uid,
            selectors,
            name: element.name,
          };
        } else if (buttonText.includes('cancel') || buttonText.includes('close')) {
          cancelButton = {
            ref: element.uid,
            selectors,
            name: element.name,
          };
        }
      }
    }

    if (Object.keys(fields).length === 0) {
      return undefined;
    }

    return {
      fields,
      actions: {
        submit: submitButton,
        cancel: cancelButton,
      },
    };
  }

  /**
   * Extract field name from element
   */
  private extractFieldName(
    element: ParsedElement,
    extractedElements?: ExtractedElement[]
  ): string {
    // Try to find matching extracted element with name attribute
    if (extractedElements) {
      const match = this.findMatchingExtractedElement(element, extractedElements);
      if (match?.name) {
        return match.name;
      }
    }

    // Generate from element name
    if (element.name) {
      return element.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    }

    return `field_${element.uid ?? 'unknown'}`;
  }

  /**
   * Map accessibility role to form field type
   */
  private mapRoleToFieldType(role: string): string {
    const roleMap: Record<string, string> = {
      textbox: 'text',
      searchbox: 'text',
      combobox: 'select',
      listbox: 'select',
      checkbox: 'checkbox',
      radio: 'radio',
      switch: 'checkbox',
      slider: 'slider',
    };

    return roleMap[role] ?? 'text';
  }

  /**
   * Detect if page has a table
   */
  private detectTablePresence(snapshot: ParsedSnapshot): boolean {
    return snapshot.elements.some(e =>
      e.role === 'table' || e.role === 'grid' || e.role === 'rowgroup'
    );
  }

  /**
   * Extract table metadata
   */
  private extractTableMetadata(snapshot: ParsedSnapshot): TableMetadata | undefined {
    const columns: TableColumn[] = [];
    const rowActions: string[] = [];

    // Find column headers
    for (const element of snapshot.elements) {
      if (element.role === 'columnheader' && element.name) {
        columns.push({
          header: element.name,
          key: element.name.toLowerCase().replace(/\s+/g, '_'),
          sortable: true, // Assume sortable by default
        });
      }
    }

    // Find row action buttons
    const actionPatterns = ['edit', 'delete', 'clone', 'view', 'manage'];
    for (const element of snapshot.elements) {
      if (element.role === 'button' || element.role === 'menuitem') {
        const text = (element.name ?? '').toLowerCase();
        for (const pattern of actionPatterns) {
          if (text.includes(pattern) && !rowActions.includes(element.name ?? '')) {
            rowActions.push(element.name ?? '');
          }
        }
      }
    }

    if (columns.length === 0) {
      return undefined;
    }

    return {
      columns,
      row_actions: rowActions,
    };
  }

  /**
   * Detect page type from URL and content
   */
  private detectPageType(url: string, snapshot: ParsedSnapshot): PageType {
    if (url.includes('/home')) return 'home';
    if (url.includes('/create')) return 'form';
    if (url.includes('/edit')) return 'form';
    if (url.includes('/manage/')) return 'list';
    if (url.includes('/overview/')) return 'detail';
    if (url.includes('/about')) return 'detail';

    // Check for form presence
    if (this.detectFormPresence(snapshot)) {
      return 'form';
    }

    // Check for table presence
    if (this.detectTablePresence(snapshot)) {
      return 'list';
    }

    return 'detail';
  }

  /**
   * Extract workspace from URL
   */
  private extractWorkspaceFromUrl(url: string): string | undefined {
    const match = url.match(/\/workspaces\/([^/]+)/);
    if (match) {
      return KNOWN_WORKSPACES[match[1]] ?? match[1];
    }
    return undefined;
  }

  /**
   * Process workspace and build metadata
   */
  processWorkspace(
    workspaceId: string,
    snapshot: ParsedSnapshot,
    _extractedElements?: ExtractedElement[]
  ): WorkspaceMetadata {
    const workspaceName = KNOWN_WORKSPACES[workspaceId] ?? workspaceId;

    // Extract sidebar items from snapshot
    const sidebarSections = this.extractSidebarItems(snapshot);

    const workspaceMetadata: WorkspaceMetadata = {
      name: workspaceName,
      url: `/web/workspaces/${workspaceId}`,
      sidebar: sidebarSections.size > 0 ? { sections: Object.fromEntries(sidebarSections) } : undefined,
    };

    this.workspaces[workspaceId] = workspaceMetadata;

    // Add to navigation tree
    if (!this.navigationTree.children['Home']) {
      this.navigationTree.children['Home'] = { name: 'Home', url: '/web/home', children: {} };
    }
    this.navigationTree.children['Home'].children[workspaceName] = {
      name: workspaceName,
      url: `/web/workspaces/${workspaceId}`,
      children: {},
    };

    return workspaceMetadata;
  }

  /**
   * Extract sidebar items from workspace
   */
  private extractSidebarItems(snapshot: ParsedSnapshot): Map<string, SidebarItem> {
    const items = new Map<string, SidebarItem>();

    for (const element of snapshot.elements) {
      // Look for navigation links in sidebar
      if (element.role === 'link' && element.href && element.name) {
        const selectors: SelectorDefinition = {
          data_testid: null,
          aria_label: element.name,
          text_match: element.name,
          href_path: element.href,
          css: null,
        };

        items.set(element.name, {
          ref: element.uid,
          name: element.name,
          url: element.href,
          href_path: element.href,
          selectors,
        });
      }
    }

    return items;
  }

  /**
   * Extract sidebar sections from workspace
   */
  private extractSidebarSections(snapshot: ParsedSnapshot): string[] {
    const sections: string[] = [];
    const sectionPatterns = ['overview', 'manage', 'monitor', 'security', 'settings', 'tools'];

    for (const element of snapshot.elements) {
      if (element.role === 'heading' || element.role === 'button') {
        const text = (element.name ?? '').toLowerCase();
        for (const pattern of sectionPatterns) {
          if (text.includes(pattern) && !sections.includes(element.name ?? '')) {
            sections.push(element.name ?? '');
          }
        }
      }
    }

    return sections;
  }

  /**
   * Compile final crawl result
   */
  compileCrawlResult(): CrawlResult {
    const endTime = new Date();
    const durationMs = this.startTime
      ? endTime.getTime() - this.startTime.getTime()
      : 0;

    const metadata: CrawlMetadata = {
      version: '2.3.0',
      tenant: this.options.tenantUrl,
      lastCrawled: endTime.toISOString(),
      crawlDurationMinutes: Math.round(durationMs / 60000),
      pagesCrawled: Object.keys(this.pages).length,
      formsExtracted: this.formsExtracted,
      totalElements: this.elementsFound,
      selectorsExtracted: this.selectorsExtracted,
    };

    const stats: CrawlStats = {
      startTime: this.startTime?.toISOString() ?? '',
      endTime: endTime.toISOString(),
      durationMs,
      pagesCrawled: Object.keys(this.pages).length,
      formsExtracted: this.formsExtracted,
      elementsFound: this.elementsFound,
      selectorsExtracted: this.selectorsExtracted,
      errorsCount: this.errors.length,
    };

    return {
      success: this.errors.length === 0,
      metadata,
      workspaces: this.workspaces,
      pages: this.pages,
      navigationTree: this.navigationTree,
      errors: this.errors,
      stats,
    };
  }

  /**
   * Record an error
   */
  recordError(phase: CrawlPhase, location: string, message: string): void {
    this.errors.push({
      phase,
      location,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Start crawl timer
   */
  startCrawl(): void {
    this.startTime = new Date();
    this.pages = {};
    this.workspaces = {};
    this.navigationTree = { name: 'Root', children: {} };
    this.errors = [];
    this.elementsFound = 0;
    this.selectorsExtracted = 0;
    this.formsExtracted = 0;

    this.reportProgress('initializing', 'Starting crawl...');
  }

  /**
   * Get current progress
   */
  getProgress(): CrawlProgress {
    return {
      phase: this.errors.length > 0 ? 'error' : 'crawling_workspace',
      pagesCrawled: Object.keys(this.pages).length,
      totalPages: Object.keys(this.pages).length,
      formsExtracted: this.formsExtracted,
      elementsFound: this.elementsFound,
      elapsedMs: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      message: `Crawled ${Object.keys(this.pages).length} pages`,
    };
  }

  /**
   * Get known workspaces
   */
  static getKnownWorkspaces(): Record<string, string> {
    return { ...KNOWN_WORKSPACES };
  }
}

/**
 * Crawl instruction for Claude to execute
 */
export interface CrawlInstruction {
  /** Step number */
  step: number;
  /** Crawl phase */
  phase: CrawlPhase;
  /** MCP tool to call */
  tool: string;
  /** Tool parameters */
  params: Record<string, unknown>;
  /** Description of what this step does */
  description: string;
  /** Expected outcome */
  expectedOutcome: string;
}

/**
 * Singleton instance
 */
let defaultHandler: CrawlHandler | null = null;

/**
 * Get the default crawl handler instance
 */
export function getCrawlHandler(options: CrawlOptions): CrawlHandler {
  if (!defaultHandler || defaultHandler['options'].tenantUrl !== options.tenantUrl) {
    defaultHandler = new CrawlHandler(options);
  }
  return defaultHandler;
}

/**
 * Reset the default handler (useful for testing)
 */
export function resetCrawlHandler(): void {
  defaultHandler = null;
}

/**
 * Quick function to generate crawl instructions
 */
export function generateCrawlInstructions(tenantUrl: string): CrawlInstruction[] {
  return getCrawlHandler({ tenantUrl }).generateCrawlInstructions();
}
