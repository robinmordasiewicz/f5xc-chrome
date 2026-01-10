// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Metadata Updater
 *
 * Updates navigation metadata and URL sitemap JSON files with discoveries from crawling.
 * Handles validation, diffing, backup, and safe writing of metadata files.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  NavigationMetadata,
  URLSitemap,
  PageMetadata,
  WorkspaceMetadata,
  StaticRoute,
  DynamicRoute,
  SelectorType,
  CrawlCoverage,
  HomePageMetadata,
} from '../types';
import { CrawlResult, NavigationNode } from '../handlers/crawl-handler';

/**
 * Metadata updater options
 */
export interface MetadataUpdaterOptions {
  /** Base path for metadata files */
  basePath?: string;
  /** Whether to create backups before updating */
  createBackup?: boolean;
  /** Whether to validate before writing */
  validateBeforeWrite?: boolean;
  /** Whether to perform dry run (no actual writes) */
  dryRun?: boolean;
}

/**
 * Update result
 */
export interface UpdateResult {
  /** Whether update succeeded */
  success: boolean;
  /** Files that were updated */
  filesUpdated: string[];
  /** Files that were created */
  filesCreated: string[];
  /** Backup files created */
  backupsCreated: string[];
  /** Changes summary */
  changes: UpdateChange[];
  /** Errors encountered */
  errors: string[];
}

/**
 * Individual change record
 */
export interface UpdateChange {
  /** Type of change */
  type: 'add' | 'update' | 'remove';
  /** What was changed */
  target: 'page' | 'workspace' | 'route' | 'element';
  /** Path or identifier */
  path: string;
  /** Old value (for updates) */
  oldValue?: unknown;
  /** New value */
  newValue?: unknown;
}

/**
 * Diff result between old and new metadata
 */
export interface MetadataDiff {
  /** Pages added */
  pagesAdded: string[];
  /** Pages updated */
  pagesUpdated: string[];
  /** Pages removed */
  pagesRemoved: string[];
  /** Workspaces added */
  workspacesAdded: string[];
  /** Workspaces updated */
  workspacesUpdated: string[];
  /** Routes added */
  routesAdded: string[];
  /** Routes updated */
  routesUpdated: string[];
  /** Total changes */
  totalChanges: number;
}

/**
 * Default paths for metadata files
 */
const DEFAULT_PATHS = {
  navigationMetadata: 'skills/xc-console/console-navigation-metadata.json',
  urlSitemap: 'skills/xc-console/url-sitemap.json',
};

/**
 * Metadata Updater class
 */
export class MetadataUpdater {
  private basePath: string;
  private createBackup: boolean;
  private validateBeforeWrite: boolean;
  private dryRun: boolean;

  constructor(options?: MetadataUpdaterOptions) {
    this.basePath = options?.basePath ?? process.cwd();
    this.createBackup = options?.createBackup ?? true;
    this.validateBeforeWrite = options?.validateBeforeWrite ?? true;
    this.dryRun = options?.dryRun ?? false;
  }

  /**
   * Update navigation metadata from crawl result
   */
  updateNavigationMetadata(crawlResult: CrawlResult): UpdateResult {
    const result: UpdateResult = {
      success: false,
      filesUpdated: [],
      filesCreated: [],
      backupsCreated: [],
      changes: [],
      errors: [],
    };

    try {
      const filePath = path.join(this.basePath, DEFAULT_PATHS.navigationMetadata);

      // Load existing metadata
      let existingMetadata: NavigationMetadata | null = null;
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          existingMetadata = JSON.parse(content) as NavigationMetadata;
        } catch (e) {
          result.errors.push(`Failed to parse existing metadata: ${e}`);
        }
      }

      // Build new metadata
      const newMetadata = this.buildNavigationMetadata(crawlResult, existingMetadata);

      // Calculate diff
      if (existingMetadata) {
        const diff = this.diffNavigationMetadata(existingMetadata, newMetadata);
        result.changes = this.diffToChanges(diff);
      } else {
        result.changes.push({
          type: 'add',
          target: 'page',
          path: 'all',
          newValue: `${Object.keys(crawlResult.pages).length} pages`,
        });
      }

      // Validate
      if (this.validateBeforeWrite) {
        const validationErrors = this.validateNavigationMetadata(newMetadata);
        if (validationErrors.length > 0) {
          result.errors.push(...validationErrors);
          return result;
        }
      }

      // Create backup
      if (this.createBackup && existingMetadata && !this.dryRun) {
        const backupPath = this.createBackupFile(filePath);
        if (backupPath) {
          result.backupsCreated.push(backupPath);
        }
      }

      // Write new metadata
      if (!this.dryRun) {
        this.writeJsonFile(filePath, newMetadata);
        if (existingMetadata) {
          result.filesUpdated.push(filePath);
        } else {
          result.filesCreated.push(filePath);
        }
      }

      result.success = true;
    } catch (e) {
      result.errors.push(`Failed to update navigation metadata: ${e}`);
    }

    return result;
  }

  /**
   * Update URL sitemap from crawl result
   */
  updateUrlSitemap(crawlResult: CrawlResult): UpdateResult {
    const result: UpdateResult = {
      success: false,
      filesUpdated: [],
      filesCreated: [],
      backupsCreated: [],
      changes: [],
      errors: [],
    };

    try {
      const filePath = path.join(this.basePath, DEFAULT_PATHS.urlSitemap);

      // Load existing sitemap
      let existingSitemap: URLSitemap | null = null;
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          existingSitemap = JSON.parse(content) as URLSitemap;
        } catch (e) {
          result.errors.push(`Failed to parse existing sitemap: ${e}`);
        }
      }

      // Build new sitemap
      const newSitemap = this.buildUrlSitemap(crawlResult, existingSitemap);

      // Calculate changes
      if (existingSitemap) {
        const routesAdded = Object.keys(newSitemap.static_routes).filter(
          r => !existingSitemap!.static_routes[r]
        );
        const routesUpdated = Object.keys(newSitemap.static_routes).filter(
          r => existingSitemap!.static_routes[r] &&
            JSON.stringify(existingSitemap!.static_routes[r]) !==
            JSON.stringify(newSitemap.static_routes[r])
        );

        for (const route of routesAdded) {
          result.changes.push({
            type: 'add',
            target: 'route',
            path: route,
            newValue: newSitemap.static_routes[route],
          });
        }
        for (const route of routesUpdated) {
          result.changes.push({
            type: 'update',
            target: 'route',
            path: route,
            oldValue: existingSitemap.static_routes[route],
            newValue: newSitemap.static_routes[route],
          });
        }
      }

      // Validate
      if (this.validateBeforeWrite) {
        const validationErrors = this.validateUrlSitemap(newSitemap);
        if (validationErrors.length > 0) {
          result.errors.push(...validationErrors);
          return result;
        }
      }

      // Create backup
      if (this.createBackup && existingSitemap && !this.dryRun) {
        const backupPath = this.createBackupFile(filePath);
        if (backupPath) {
          result.backupsCreated.push(backupPath);
        }
      }

      // Write new sitemap
      if (!this.dryRun) {
        this.writeJsonFile(filePath, newSitemap);
        if (existingSitemap) {
          result.filesUpdated.push(filePath);
        } else {
          result.filesCreated.push(filePath);
        }
      }

      result.success = true;
    } catch (e) {
      result.errors.push(`Failed to update URL sitemap: ${e}`);
    }

    return result;
  }

  /**
   * Update all metadata files from crawl result
   */
  updateAllMetadata(crawlResult: CrawlResult): UpdateResult {
    const navResult = this.updateNavigationMetadata(crawlResult);
    const sitemapResult = this.updateUrlSitemap(crawlResult);

    return {
      success: navResult.success && sitemapResult.success,
      filesUpdated: [...navResult.filesUpdated, ...sitemapResult.filesUpdated],
      filesCreated: [...navResult.filesCreated, ...sitemapResult.filesCreated],
      backupsCreated: [...navResult.backupsCreated, ...sitemapResult.backupsCreated],
      changes: [...navResult.changes, ...sitemapResult.changes],
      errors: [...navResult.errors, ...sitemapResult.errors],
    };
  }

  /**
   * Build navigation metadata from crawl result
   */
  private buildNavigationMetadata(
    crawlResult: CrawlResult,
    existing?: NavigationMetadata | null
  ): NavigationMetadata {
    const selectorPriority: SelectorType[] = ['name', 'aria_label', 'text_match', 'href_path', 'placeholder', 'css', 'ref'];

    // Default home page structure
    const defaultHomePage: HomePageMetadata = {
      url: '/web/home',
      elements: {},
      workspace_cards: {},
    };

    // Start with existing or empty structure
    const metadata: NavigationMetadata = existing ? { ...existing } : {
      version: '2.3.0',
      tenant: crawlResult.metadata.tenant,
      last_crawled: crawlResult.metadata.lastCrawled,
      deterministic_navigation: {
        enabled: true,
        description: 'Use deterministic selectors for reliable automation',
        note: 'Selector priority chain ensures stable element identification',
      },
      selector_priority: selectorPriority,
      authentication: {
        method: 'multi_provider',
        supported: ['azure_sso', 'google', 'okta', 'native'],
        login_url: '/api/web/login',
        auto_authorized: false,
      },
      home_page: defaultHomePage,
      workspaces: {},
    };

    // Update version and crawl info
    metadata.version = '2.3.0';
    metadata.last_crawled = crawlResult.metadata.lastCrawled;
    metadata.tenant = crawlResult.metadata.tenant;

    // Initialize workspaces if undefined
    if (!metadata.workspaces) {
      metadata.workspaces = {};
    }

    // Merge workspaces
    for (const [id, workspace] of Object.entries(crawlResult.workspaces)) {
      metadata.workspaces[id] = this.mergeWorkspace(
        metadata.workspaces[id],
        workspace
      );
    }

    // Update crawl summary
    metadata.crawl_summary = {
      pages_crawled: Object.keys(crawlResult.pages).length,
      forms_extracted: crawlResult.metadata.formsExtracted,
      total_refs: crawlResult.stats.elementsFound,
      workspaces_discovered: Object.keys(crawlResult.workspaces).length,
      sidebar_items: 0, // Calculate from workspaces if needed
      form_fields: 0, // Calculate from forms if needed
      stable_selector_coverage: 0.85, // Estimate
    };

    return metadata;
  }

  /**
   * Merge workspace metadata
   */
  private mergeWorkspace(
    existing: WorkspaceMetadata | undefined,
    incoming: WorkspaceMetadata
  ): WorkspaceMetadata {
    if (!existing) {
      return incoming;
    }

    // Merge sidebar sections if both exist
    const mergedSidebar = existing.sidebar && incoming.sidebar
      ? {
          sections: {
            ...existing.sidebar.sections,
            ...incoming.sidebar.sections,
          },
        }
      : incoming.sidebar ?? existing.sidebar;

    return {
      ...existing,
      ...incoming,
      sidebar: mergedSidebar,
    };
  }

  /**
   * Merge page metadata
   */
  private mergePage(
    existing: PageMetadata | undefined,
    incoming: PageMetadata
  ): PageMetadata {
    if (!existing) {
      return incoming;
    }

    return {
      ...existing,
      ...incoming,
      // Merge elements, preserving existing selectors
      elements: {
        ...existing.elements,
        ...incoming.elements,
      },
      // Use newer form if available
      form: incoming.form ?? existing.form,
      // Use newer table if available
      table: incoming.table ?? existing.table,
    };
  }

  /**
   * Build URL sitemap from crawl result
   */
  private buildUrlSitemap(
    crawlResult: CrawlResult,
    existing?: URLSitemap | null
  ): URLSitemap {
    const defaultCrawlCoverage: CrawlCoverage = {
      static_routes_discovered: 0,
      dynamic_patterns_defined: 0,
      workspaces_mapped: 0,
      shortcuts_defined: 0,
      waap_complete: false,
      administration_complete: false,
      mcn_complete: false,
      dns_complete: false,
      needs_full_crawl: true,
      selector_coverage: {
        administration: '0%',
        waap: '0%',
        overall: '0%',
      },
    };

    const sitemap: URLSitemap = existing ? { ...existing } : {
      version: '2.3.0',
      tenant: crawlResult.metadata.tenant,
      last_crawled: crawlResult.metadata.lastCrawled,
      description: 'URL routing and resolution for F5 XC Console',
      static_routes: {},
      dynamic_routes: [],
      workspace_mapping: {},
      resource_shortcuts: {},
      crawl_coverage: defaultCrawlCoverage,
    };

    // Update version and timestamp
    sitemap.version = '2.3.0';
    sitemap.last_crawled = crawlResult.metadata.lastCrawled;

    // Add static routes from pages
    for (const [url, page] of Object.entries(crawlResult.pages)) {
      // Skip dynamic routes (those with variables)
      if (url.includes('{') || url.includes('/namespaces/')) {
        continue;
      }

      sitemap.static_routes[url] = {
        title: page.title ?? url,
        workspace: page.workspace,
        page_type: page.page_type,
      };
    }

    // Add workspace mappings
    for (const [id, workspace] of Object.entries(crawlResult.workspaces)) {
      sitemap.workspace_mapping[id] = workspace.url;
    }

    // Extract dynamic routes from pages with namespace patterns
    this.extractDynamicRoutes(crawlResult.pages, sitemap);

    // Update crawl coverage
    sitemap.crawl_coverage = {
      ...sitemap.crawl_coverage,
      static_routes_discovered: Object.keys(sitemap.static_routes).length,
      dynamic_patterns_defined: sitemap.dynamic_routes.length,
      workspaces_mapped: Object.keys(sitemap.workspace_mapping).length,
      shortcuts_defined: Object.keys(sitemap.resource_shortcuts).length,
    };

    return sitemap;
  }

  /**
   * Extract dynamic route patterns from pages
   */
  private extractDynamicRoutes(
    pages: Record<string, PageMetadata>,
    sitemap: URLSitemap
  ): void {
    const existingPatterns = new Set(sitemap.dynamic_routes.map(r => r.pattern));

    for (const url of Object.keys(pages)) {
      // Check for namespace pattern
      const namespaceMatch = url.match(/\/namespaces\/([^/]+)/);
      if (namespaceMatch) {
        // Create dynamic route pattern
        const pattern = url.replace(/\/namespaces\/[^/]+/, '/namespaces/{namespace}');

        if (!existingPatterns.has(pattern)) {
          sitemap.dynamic_routes.push({
            pattern,
            description: `Dynamic route with namespace variable`,
            variables: {
              namespace: 'user-defined',
            },
            example: url,
          });
          existingPatterns.add(pattern);
        }
      }

      // Check for resource name pattern
      const resourceMatch = url.match(/\/(http_loadbalancers|origin_pools|app_firewalls)\/([^/]+)/);
      if (resourceMatch) {
        const pattern = url.replace(
          new RegExp(`/${resourceMatch[1]}/[^/]+`),
          `/${resourceMatch[1]}/{name}`
        );

        if (!existingPatterns.has(pattern)) {
          sitemap.dynamic_routes.push({
            pattern,
            description: `Dynamic route with resource name variable`,
            variables: {
              name: 'user-defined',
            },
            example: url,
          });
          existingPatterns.add(pattern);
        }
      }
    }
  }

  /**
   * Diff two navigation metadata objects
   */
  diffNavigationMetadata(
    oldMetadata: NavigationMetadata,
    newMetadata: NavigationMetadata
  ): MetadataDiff {
    const diff: MetadataDiff = {
      pagesAdded: [],
      pagesUpdated: [],
      pagesRemoved: [],
      workspacesAdded: [],
      workspacesUpdated: [],
      routesAdded: [],
      routesUpdated: [],
      totalChanges: 0,
    };

    // Compare forms (which contain page/form metadata)
    const oldForms = new Set(Object.keys(oldMetadata.forms ?? {}));
    const newForms = new Set(Object.keys(newMetadata.forms ?? {}));

    for (const form of newForms) {
      if (!oldForms.has(form)) {
        diff.pagesAdded.push(form);
      } else if (JSON.stringify(oldMetadata.forms?.[form]) !== JSON.stringify(newMetadata.forms?.[form])) {
        diff.pagesUpdated.push(form);
      }
    }

    for (const form of oldForms) {
      if (!newForms.has(form)) {
        diff.pagesRemoved.push(form);
      }
    }

    // Compare workspaces
    const oldWorkspaces = new Set(Object.keys(oldMetadata.workspaces ?? {}));
    const newWorkspaces = new Set(Object.keys(newMetadata.workspaces ?? {}));

    for (const ws of newWorkspaces) {
      if (!oldWorkspaces.has(ws)) {
        diff.workspacesAdded.push(ws);
      } else if (JSON.stringify(oldMetadata.workspaces?.[ws]) !== JSON.stringify(newMetadata.workspaces?.[ws])) {
        diff.workspacesUpdated.push(ws);
      }
    }

    diff.totalChanges =
      diff.pagesAdded.length +
      diff.pagesUpdated.length +
      diff.pagesRemoved.length +
      diff.workspacesAdded.length +
      diff.workspacesUpdated.length;

    return diff;
  }

  /**
   * Convert diff to changes array
   */
  private diffToChanges(diff: MetadataDiff): UpdateChange[] {
    const changes: UpdateChange[] = [];

    for (const page of diff.pagesAdded) {
      changes.push({ type: 'add', target: 'page', path: page });
    }
    for (const page of diff.pagesUpdated) {
      changes.push({ type: 'update', target: 'page', path: page });
    }
    for (const page of diff.pagesRemoved) {
      changes.push({ type: 'remove', target: 'page', path: page });
    }
    for (const ws of diff.workspacesAdded) {
      changes.push({ type: 'add', target: 'workspace', path: ws });
    }
    for (const ws of diff.workspacesUpdated) {
      changes.push({ type: 'update', target: 'workspace', path: ws });
    }

    return changes;
  }

  /**
   * Validate navigation metadata
   */
  private validateNavigationMetadata(metadata: NavigationMetadata): string[] {
    const errors: string[] = [];

    if (!metadata.version) {
      errors.push('Missing version field');
    }

    if (!metadata.selector_priority || metadata.selector_priority.length === 0) {
      errors.push('Missing or empty selector_priority');
    }

    if (!metadata.home_page) {
      errors.push('Missing home_page field');
    }

    // Validate workspaces have required fields
    for (const [id, workspace] of Object.entries(metadata.workspaces ?? {})) {
      if (!workspace.url) {
        errors.push(`Workspace ${id} missing URL`);
      }
      if (!workspace.name) {
        errors.push(`Workspace ${id} missing name`);
      }
    }

    return errors;
  }

  /**
   * Validate URL sitemap
   */
  private validateUrlSitemap(sitemap: URLSitemap): string[] {
    const errors: string[] = [];

    if (!sitemap.version) {
      errors.push('Missing version field');
    }

    // Validate static routes
    for (const [url, route] of Object.entries(sitemap.static_routes ?? {})) {
      if (!url.startsWith('/')) {
        errors.push(`Invalid static route URL: ${url}`);
      }
      if (!route.page_type) {
        errors.push(`Static route ${url} missing page_type`);
      }
    }

    // Validate dynamic routes (now an array)
    for (const route of sitemap.dynamic_routes ?? []) {
      if (!route.pattern.includes('{')) {
        errors.push(`Dynamic route pattern missing variable: ${route.pattern}`);
      }
      if (!route.variables || Object.keys(route.variables).length === 0) {
        errors.push(`Dynamic route ${route.pattern} missing variables`);
      }
    }

    return errors;
  }

  /**
   * Create backup of a file
   */
  private createBackupFile(filePath: string): string | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = path.extname(filePath);
      const base = path.basename(filePath, ext);
      const dir = path.dirname(filePath);
      const backupPath = path.join(dir, `${base}.backup-${timestamp}${ext}`);

      fs.copyFileSync(filePath, backupPath);
      return backupPath;
    } catch (e) {
      console.error(`Failed to create backup: ${e}`);
      return null;
    }
  }

  /**
   * Write JSON file with formatting
   */
  private writeJsonFile(filePath: string, data: unknown): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  }

  /**
   * Generate diff report as markdown
   */
  generateDiffReport(diff: MetadataDiff): string {
    const lines: string[] = [];

    lines.push('# Metadata Update Report');
    lines.push('');
    lines.push(`## Summary`);
    lines.push(`- Total changes: ${diff.totalChanges}`);
    lines.push(`- Pages added: ${diff.pagesAdded.length}`);
    lines.push(`- Pages updated: ${diff.pagesUpdated.length}`);
    lines.push(`- Pages removed: ${diff.pagesRemoved.length}`);
    lines.push(`- Workspaces added: ${diff.workspacesAdded.length}`);
    lines.push(`- Workspaces updated: ${diff.workspacesUpdated.length}`);
    lines.push('');

    if (diff.pagesAdded.length > 0) {
      lines.push('## Pages Added');
      for (const page of diff.pagesAdded) {
        lines.push(`- ${page}`);
      }
      lines.push('');
    }

    if (diff.pagesUpdated.length > 0) {
      lines.push('## Pages Updated');
      for (const page of diff.pagesUpdated) {
        lines.push(`- ${page}`);
      }
      lines.push('');
    }

    if (diff.pagesRemoved.length > 0) {
      lines.push('## Pages Removed');
      for (const page of diff.pagesRemoved) {
        lines.push(`- ${page}`);
      }
      lines.push('');
    }

    if (diff.workspacesAdded.length > 0) {
      lines.push('## Workspaces Added');
      for (const ws of diff.workspacesAdded) {
        lines.push(`- ${ws}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * Singleton instance
 */
let defaultUpdater: MetadataUpdater | null = null;

/**
 * Get the default metadata updater instance
 */
export function getMetadataUpdater(options?: MetadataUpdaterOptions): MetadataUpdater {
  if (!defaultUpdater) {
    defaultUpdater = new MetadataUpdater(options);
  }
  return defaultUpdater;
}

/**
 * Reset the default updater (useful for testing)
 */
export function resetMetadataUpdater(): void {
  defaultUpdater = null;
}

/**
 * Quick function to update metadata from crawl result
 */
export function updateMetadataFromCrawl(crawlResult: CrawlResult): UpdateResult {
  return getMetadataUpdater().updateAllMetadata(crawlResult);
}
