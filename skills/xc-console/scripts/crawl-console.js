#!/usr/bin/env node
/**
 * F5 XC Console Crawler
 *
 * This script provides the crawling logic for Claude to systematically
 * extract DOM metadata from the F5 Distributed Cloud console.
 *
 * Note: This script is NOT run directly via Node.js. Instead, it serves
 * as a reference implementation that Claude follows when executing the
 * crawl workflow using mcp__claude-in-chrome__* tools.
 *
 * Usage: /f5xc-console crawl https://tenant.volterra.us/
 */

// ============================================================================
// CRAWL WORKFLOW SPECIFICATION
// ============================================================================

/**
 * PHASE 1: INITIALIZATION
 *
 * Claude should execute these MCP tool calls:
 *
 * 1. Get browser context:
 *    mcp__claude-in-chrome__tabs_context_mcp({ createIfEmpty: true })
 *
 * 2. Navigate to tenant home:
 *    mcp__claude-in-chrome__navigate({ tabId, url: tenantUrl })
 *
 * 3. Wait for page load:
 *    mcp__claude-in-chrome__computer({ action: "wait", duration: 3, tabId })
 *
 * 4. Check for login/SSO (see authentication-flows.md if needed)
 */

/**
 * PHASE 2: EXTRACT HOME PAGE
 *
 * On the home page, extract workspace cards:
 *
 * 1. Read page structure:
 *    mcp__claude-in-chrome__read_page({ tabId, filter: "interactive" })
 *
 * 2. For each workspace card, record:
 *    - Card title (e.g., "Web App & API Protection")
 *    - Card ref (e.g., "ref_15")
 *    - Navigation URL (click card, capture URL, go back)
 *
 * Expected workspaces:
 *    - Web App & API Protection
 *    - Multi-Cloud Network Connect
 *    - Multi-Cloud App Connect
 *    - Distributed Apps
 *    - DNS Management
 *    - Bot Defense
 *    - Data Intelligence
 *    - Client-Side Defense
 *    - Web App Scanning
 *    - NGINX One
 *    - BIG-IP Utilities
 *    - Content Delivery Network
 */

/**
 * PHASE 3: CRAWL EACH WORKSPACE
 *
 * For each workspace:
 *
 * 1. Click workspace card:
 *    mcp__claude-in-chrome__computer({ action: "left_click", ref: cardRef, tabId })
 *
 * 2. Wait for workspace to load:
 *    mcp__claude-in-chrome__computer({ action: "wait", duration: 2, tabId })
 *
 * 3. Extract sidebar navigation:
 *    mcp__claude-in-chrome__read_page({ tabId })
 *    - Look for navigation menu items
 *    - Record section headers (Overview, Manage, etc.)
 *    - Record menu items with their refs
 *
 * 4. For each menu item, crawl the page (see Phase 4)
 *
 * 5. Return to home:
 *    mcp__claude-in-chrome__navigate({ tabId, url: "/web/home" })
 */

/**
 * PHASE 4: CRAWL INDIVIDUAL PAGES
 *
 * For each page in the workspace:
 *
 * 1. Navigate to the page (click menu item or direct URL)
 *
 * 2. Extract page metadata:
 *    mcp__claude-in-chrome__read_page({ tabId })
 *
 *    Record:
 *    - Page title
 *    - Current URL
 *    - All buttons (refs, labels, actions)
 *    - All links (refs, labels, hrefs)
 *    - Table structure (if present)
 *
 * 3. If page has "Add" button, extract form structure (see Phase 5)
 *
 * 4. Take screenshot for visual reference:
 *    mcp__claude-in-chrome__computer({ action: "screenshot", tabId })
 */

/**
 * PHASE 5: EXTRACT FORM STRUCTURE
 *
 * For resource creation forms:
 *
 * 1. Click "Add" button:
 *    mcp__claude-in-chrome__computer({ action: "left_click", ref: addButtonRef, tabId })
 *
 * 2. Wait for form to load:
 *    mcp__claude-in-chrome__computer({ action: "wait", duration: 2, tabId })
 *
 * 3. Extract form sections (tabs/steps):
 *    mcp__claude-in-chrome__read_page({ tabId })
 *    - Look for tab navigation
 *    - Record section names
 *
 * 4. For each section, extract fields:
 *    - Click section tab
 *    - mcp__claude-in-chrome__read_page({ tabId })
 *    - For each field, record:
 *      - Field name (from label)
 *      - Field ref
 *      - Input type (text, select, checkbox, etc.)
 *      - Required status
 *      - Validation pattern (if visible)
 *      - Default value
 *      - Options (for select fields)
 *
 * 5. Record submit/cancel buttons
 *
 * 6. Cancel form (don't submit):
 *    mcp__claude-in-chrome__computer({ action: "left_click", ref: cancelButtonRef, tabId })
 */

// ============================================================================
// METADATA OUTPUT STRUCTURE
// ============================================================================

const METADATA_TEMPLATE = {
  version: "2.2.0",
  tenant: "",
  last_crawled: "",
  crawl_duration_seconds: 0,
  selector_priority: ["data_testid", "aria_label", "text_match", "css", "ref"],

  workspaces: {
    // Populated during crawl with selectors
  },

  pages: {
    // "/web/path": {
    //   title: "Page Title",
    //   workspace: "Workspace Name",
    //   url: "/web/path",
    //   navigation_path: ["Home", "Workspace", "Section", "Page"],
    //   elements: {
    //     add_button: {
    //       ref: "ref_X",
    //       text: "Add Resource",
    //       type: "button",
    //       selectors: { data_testid, aria_label, text_match, css }
    //     },
    //   },
    //   table: { columns, row_actions },
    //   form: { sections, fields, submit_button, cancel_button }
    // }
  },

  navigation_tree: {
    // Hierarchical structure for quick lookup
  }
};

// ============================================================================
// SELECTOR EXTRACTION SCRIPTS (v2.2)
// ============================================================================

/**
 * JavaScript to extract stable selectors from DOM elements.
 * Execute via mcp__claude-in-chrome__javascript_tool
 */
const SELECTOR_EXTRACTION_SCRIPT = `
const elements = document.querySelectorAll('[data-testid], [aria-label], button, input, select, a');
const selectors = [];

elements.forEach((el) => {
  const selector = {
    tagName: el.tagName.toLowerCase(),
    data_testid: el.getAttribute('data-testid'),
    aria_label: el.getAttribute('aria-label'),
    text_content: el.textContent?.trim().substring(0, 50),
    id: el.id || null,
    name: el.getAttribute('name'),
    role: el.getAttribute('role')
  };

  if (selector.data_testid || selector.aria_label || selector.id || selector.name) {
    selectors.push(selector);
  }
});

JSON.stringify(selectors, null, 2);
`;

/**
 * JavaScript to extract navigation URLs for sitemap.
 * Execute via mcp__claude-in-chrome__javascript_tool
 */
const URL_EXTRACTION_SCRIPT = `
const links = document.querySelectorAll('nav a[href], .sidebar a[href], [role="navigation"] a[href]');
const urls = [];

links.forEach(link => {
  const href = link.getAttribute('href');
  if (href && href.startsWith('/web/')) {
    urls.push({
      url: href,
      text: link.textContent?.trim(),
      aria_label: link.getAttribute('aria-label')
    });
  }
});

JSON.stringify(urls, null, 2);
`;

// ============================================================================
// URL SITEMAP TEMPLATE (v2.2)
// ============================================================================

const URL_SITEMAP_TEMPLATE = {
  version: "2.2.0",
  tenant: "",
  last_crawled: null,
  description: "Complete URL sitemap for F5 XC console deterministic navigation",

  static_routes: {
    // "/web/home": { title, description, page_type }
  },

  dynamic_routes: [
    // { pattern, description, variables, example }
  ],

  workspace_mapping: {
    // shorthand: full_path
  },

  resource_shortcuts: {
    // alias: template_url
  }
};

// ============================================================================
// WORKSPACE DEFINITIONS (Known Structure)
// ============================================================================

const KNOWN_WORKSPACES = [
  {
    name: "Web App & API Protection",
    url_path: "/web/workspaces/web-app-and-api-protection",
    sections: {
      "Overview": ["Security", "Performance"],
      "Manage": [
        "Load Balancers",
        "CDN",
        "BIG-IP Virtual Servers",
        "Third-Party Applications",
        "App Firewall",
        "Service Policies",
        "Rate Limiter Policies",
        "Shared Objects",
        "AI & ML",
        "Public IP Addresses"
      ]
    }
  },
  {
    name: "Multi-Cloud Network Connect",
    url_path: "/web/workspaces/multi-cloud-network-connect",
    sections: {
      "Overview": ["Dashboard"],
      "Manage": ["Sites", "Networking", "Security"]
    }
  },
  {
    name: "DNS Management",
    url_path: "/web/workspaces/dns-management",
    sections: {
      "Overview": ["DNS Load Balancers"],
      "Manage": ["DNS Zones"]
    }
  }
  // Add more workspaces as discovered
];

// ============================================================================
// CRAWL EXECUTION COMMANDS
// ============================================================================

/**
 * To execute a full crawl, Claude should:
 *
 * 1. Initialize: Set up browser tab and navigate to tenant
 * 2. For each workspace in KNOWN_WORKSPACES:
 *    a. Navigate to workspace
 *    b. Crawl all sidebar menu items
 *    c. For each page with forms, extract form structure
 * 3. Generate metadata JSON
 * 4. Save to console-navigation-metadata.json
 *
 * Estimated time: 15-30 minutes depending on page load times
 */

// Export for reference (this is documentation, not executable code)
export const CRAWL_SPEC = {
  version: "2.2.0",
  phases: [
    "initialization",
    "home_extraction",
    "selector_extraction",   // NEW: Extract stable selectors (data-testid, aria-label)
    "url_mapping",           // NEW: Build URL sitemap
    "workspace_crawl",
    "page_crawl",
    "form_extraction"
  ],
  tools_used: [
    "mcp__claude-in-chrome__tabs_context_mcp",
    "mcp__claude-in-chrome__navigate",
    "mcp__claude-in-chrome__read_page",
    "mcp__claude-in-chrome__computer",
    "mcp__claude-in-chrome__javascript_tool",  // NEW: For selector/URL extraction
    "mcp__claude-in-chrome__find"
  ],
  output_files: {
    metadata: "console-navigation-metadata.json",
    sitemap: "url-sitemap.json"
  },
  selector_priority: ["data_testid", "aria_label", "text_match", "css", "ref"]
};

console.log("F5 XC Console Crawler Specification");
console.log("This file documents the crawl workflow for Claude to execute.");
console.log("Run via: /f5xc-console crawl <tenant-url>");
