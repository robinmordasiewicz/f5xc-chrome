# F5 XC Console Crawl Workflow (v2.2)

This document defines the step-by-step workflow for Claude to crawl the F5 XC console and generate deterministic navigation metadata with stable selectors.

## Overview

The plugin ships with pre-crawled metadata that works out of the box. Crawling is **optional** - use it to refresh stale data or update after F5 XC console UI changes.

**What gets extracted:**
- Element refs (session-specific)
- Stable selectors (data-testid, aria-label, text content)
- URL sitemap (static and dynamic routes)

## Quick Start

To execute a crawl:
```
/xc:console crawl https://nferreira.staging.volterra.us/
```

Claude will follow the phases below to systematically extract page metadata.

---

## Phase 1: Initialize Browser Session

### Step 1.1: Get Browser Context
```
Tool: mcp__claude-in-chrome__tabs_context_mcp
Parameters: { createIfEmpty: true }
```

### Step 1.2: Navigate to Tenant Home
```
Tool: mcp__claude-in-chrome__navigate
Parameters: { tabId: [from context], url: "[tenant-url]" }
```

### Step 1.3: Wait for Page Load
```
Tool: mcp__claude-in-chrome__computer
Parameters: { action: "wait", duration: 3, tabId: [tabId] }
```

### Step 1.4: Handle Authentication if Needed
Check URL - if redirected to login:
- Follow `./authentication-flows.md`
- Return here after authenticated

### Step 1.5: Verify Home Page
```
Tool: mcp__claude-in-chrome__computer
Parameters: { action: "screenshot", tabId: [tabId] }
```
Confirm: URL ends with `/web/home` and workspace cards visible.

---

## Phase 2: Extract Home Page Metadata

### Step 2.1: Read Page Structure
```
Tool: mcp__claude-in-chrome__read_page
Parameters: { tabId: [tabId], filter: "interactive" }
```

### Step 2.2: Parse Workspace Cards

For each workspace card found, record:

```json
{
  "workspace_name": "[text from card]",
  "card_ref": "[ref_X]",
  "description": "[subtitle text]"
}
```

Expected cards:
- Web App & API Protection
- Multi-Cloud Network Connect
- Multi-Cloud App Connect
- Distributed Apps
- DNS Management
- Bot Defense
- Data Intelligence
- Client-Side Defense

### Step 2.3: Store Home Metadata

```json
{
  "pages": {
    "/web/home": {
      "title": "F5 Distributed Cloud Console",
      "workspace": "Home",
      "elements": {
        "workspace_cards": [
          { "name": "Web App & API Protection", "ref": "ref_X" },
          // ... other cards
        ]
      }
    }
  }
}
```

---

## Phase 2B: Extract Stable Selectors

For each element identified, extract stable selectors that work across browser sessions.

### Step 2B.1: Execute JavaScript to Extract Element Attributes

```
Tool: mcp__claude-in-chrome__javascript_tool
Parameters: {
  tabId: [tabId],
  text: `
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
  `
}
```

### Step 2B.2: Map Selectors to Element Refs

For each element from `read_page`:
1. Match by position/role to extracted selectors
2. Combine ref with stable selector data
3. Build fallback chain: `data_testid > aria_label > text_match > css > ref`

### Step 2B.3: Update Metadata with Selectors

```json
{
  "web_app_api_protection": {
    "ref": "ref_7",
    "name": "Web App & API Protection",
    "selectors": {
      "data_testid": null,
      "aria_label": null,
      "text_match": "Web App & API Protection",
      "css": ".workspace-card:has-text('Web App')"
    }
  }
}
```

---

## Phase 2C: URL Mapping

Extract all navigation URLs for the sitemap.

### Step 2C.1: Extract Navigation Links

```
Tool: mcp__claude-in-chrome__javascript_tool
Parameters: {
  tabId: [tabId],
  text: `
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
  `
}
```

### Step 2C.2: Categorize URLs

- **Static routes**: Fixed paths like `/web/home`, `/web/workspaces/...`
- **Dynamic routes**: Paths with variables like `/namespaces/{namespace}/...`

### Step 2C.3: Update url-sitemap.json

Add discovered URLs to the sitemap file.

---

## Phase 3: Crawl Workspace - Web App & API Protection

### Step 3.1: Enter Workspace
```
Tool: mcp__claude-in-chrome__computer
Parameters: { action: "left_click", ref: "[waap_card_ref]", tabId: [tabId] }
```

Wait 2 seconds for load.

### Step 3.2: Capture Workspace URL
Record current URL: `/web/workspaces/web-app-and-api-protection/...`

### Step 3.3: Extract Sidebar Navigation
```
Tool: mcp__claude-in-chrome__read_page
Parameters: { tabId: [tabId] }
```

Parse sidebar structure:
- Look for section headers (Overview, Manage)
- List all menu items with refs
- Note expandable menus (Load Balancers > HTTP, TCP)

### Step 3.4: Crawl Each Menu Item

For each menu item:

1. **Click menu item**:
   ```
   Tool: mcp__claude-in-chrome__computer
   Parameters: { action: "left_click", ref: "[menu_item_ref]", tabId: [tabId] }
   ```

2. **Wait for page load** (2 seconds)

3. **Extract page metadata**:
   ```
   Tool: mcp__claude-in-chrome__read_page
   Parameters: { tabId: [tabId], filter: "interactive" }
   ```

4. **Record page data**:
   ```json
   {
     "/web/workspaces/.../http_loadbalancers": {
       "title": "HTTP Load Balancers",
       "workspace": "Web App & API Protection",
       "sidebar_section": "Manage > Load Balancers",
       "elements": {
         "add_button": { "ref": "ref_42", "text": "Add HTTP Load Balancer" },
         "filter_input": { "ref": "ref_43", "type": "text" },
         "namespace_select": { "ref": "ref_44", "type": "select" }
       },
       "table": {
         "columns": ["Name", "Namespace", "Domains", "Status"],
         "row_actions": ["Edit", "Delete", "Clone"]
       }
     }
   }
   ```

5. **If page has "Add" button, crawl the form** (see Phase 4)

### Step 3.5: Return to Home
```
Tool: mcp__claude-in-chrome__navigate
Parameters: { tabId: [tabId], url: "[tenant-url]/web/home" }
```

---

## Phase 4: Extract Form Structure

When a page has an "Add [Resource]" button:

### Step 4.1: Click Add Button
```
Tool: mcp__claude-in-chrome__computer
Parameters: { action: "left_click", ref: "[add_button_ref]", tabId: [tabId] }
```

Wait 2 seconds for form to load.

### Step 4.2: Screenshot Form
```
Tool: mcp__claude-in-chrome__computer
Parameters: { action: "screenshot", tabId: [tabId] }
```

### Step 4.3: Extract Form Tabs/Sections
```
Tool: mcp__claude-in-chrome__read_page
Parameters: { tabId: [tabId] }
```

Look for:
- Tab navigation (Basic Configuration, Origin Pool, Routes, etc.)
- Section headers within each tab
- Form/JSON toggle

### Step 4.4: For Each Tab, Extract Fields

1. **Click tab** (if not already active)
2. **Read page**
3. **For each field, record**:

```json
{
  "name": "metadata.name",
  "label": "Name",
  "ref": "ref_45",
  "type": "text",
  "required": true,
  "placeholder": "Enter name",
  "validation_hint": "Lowercase alphanumeric and dashes only"
}
```

Field types to identify:
- `text` - Single line input
- `textarea` - Multi-line input
- `select` - Dropdown
- `checkbox` - Boolean toggle
- `radio` - Option group
- `key-value` - Label editor
- `reference` - Resource selector

### Step 4.5: Record Submit/Cancel Buttons
```json
{
  "submit_button": { "ref": "ref_99", "text": "Save and Exit" },
  "cancel_button": { "ref": "ref_98", "text": "Cancel" }
}
```

### Step 4.6: Cancel Form (DO NOT SUBMIT)
```
Tool: mcp__claude-in-chrome__computer
Parameters: { action: "left_click", ref: "[cancel_button_ref]", tabId: [tabId] }
```

---

## Phase 5: Repeat for All Workspaces

After completing WAAP workspace, repeat Phase 3-4 for:

1. Multi-Cloud Network Connect
2. DNS Management
3. Bot Defense
4. Administration

Priority order (by common usage):
1. Web App & API Protection (most comprehensive)
2. DNS Management (simpler structure)
3. Multi-Cloud Network Connect
4. Administration
5. Others (as time permits)

---

## Phase 6: Generate Final Metadata

### Step 6.1: Compile All Extracted Data

Merge all page metadata into single JSON structure.

### Step 6.2: Add Metadata Header

```json
{
  "version": "2.2.0",
  "tenant": "nferreira.staging.volterra.us",
  "last_crawled": "2025-12-24T15:00:00Z",
  "crawl_duration_minutes": 25,
  "pages_crawled": 45,
  "forms_extracted": 12,
  "total_elements": 350,
  "selectors_extracted": 280
}
```

### Step 6.3: Save to File

Write complete JSON to:
`/Users/r.mordasiewicz/.claude/skills/f5xc-console/console-navigation-metadata.json`

---

## Output Schema

```json
{
  "version": "2.2.0",
  "tenant": "string",
  "last_crawled": "ISO-8601",
  "selector_priority": ["data_testid", "aria_label", "text_match", "css", "ref"],

  "workspaces": {
    "Web App & API Protection": {
      "url": "/web/workspaces/web-app-and-api-protection",
      "card_ref": "ref_X",
      "selectors": {
        "data_testid": null,
        "aria_label": null,
        "text_match": "Web App & API Protection",
        "css": ".workspace-card:has-text('Web App')"
      },
      "sections": ["Overview", "Manage"]
    }
  },

  "pages": {
    "/web/path": {
      "title": "string",
      "workspace": "string",
      "url": "string",
      "elements": {
        "element_name": {
          "ref": "ref_X",
          "selectors": {
            "data_testid": "string|null",
            "aria_label": "string|null",
            "text_match": "string|null",
            "css": "string|null"
          }
        }
      },
      "table": {},
      "form": {}
    }
  },

  "navigation_tree": {
    "Home": {
      "children": {
        "Web App & API Protection": {
          "url": "/web/workspaces/web-app-and-api-protection",
          "children": {}
        }
      }
    }
  }
}
```

---

## Crawl Tips

1. **Take screenshots** at each major page for debugging
2. **Wait 2-3 seconds** after each navigation for SPAs
3. **Cancel all forms** - never submit during crawl
4. **Note dynamic elements** - some refs change between sessions
5. **Record CSS selectors** when available (data-testid, aria-label)

---

## Estimated Duration

| Workspace | Pages | Forms | Time |
|-----------|-------|-------|------|
| Web App & API Protection | 15 | 5 | 10 min |
| DNS Management | 5 | 2 | 3 min |
| Multi-Cloud Network Connect | 10 | 4 | 7 min |
| Administration | 8 | 2 | 5 min |
| **Total** | **38** | **13** | **25 min** |

---

## Phase 7: Permission State Detection (RBAC)

Detect user permissions to understand what actions are available vs restricted.

### Step 7.1: Navigate to a Resource List Page

```
Tool: mcp__claude-in-chrome__navigate
Parameters: { tabId: [tabId], url: "[tenant-url]/web/workspaces/web-app-and-api-protection/namespaces/[namespace]/manage/load_balancers/http_loadbalancers" }
```

### Step 7.2: Execute Permission Detection Script

```
Tool: mcp__claude-in-chrome__javascript_tool
Parameters: {
  tabId: [tabId],
  action: "javascript_exec",
  text: [contents of scripts/detect-permissions.js]
}
```

### Step 7.3: Analyze Action Menu for RBAC

Click on an item's action menu (three dots):
```
Tool: mcp__claude-in-chrome__computer
Parameters: { action: "left_click", ref: "[action_button_ref]", tabId: [tabId] }
```

Check for "Locked" indicators:
- **Pattern 1**: `generic "Locked"` as first child of option
- **Pattern 2**: `tooltip` with permission denial message

### Step 7.4: Test Configuration View Mode

Click "Manage Configuration" and check:
- Look for `generic "View"` badge in dialog header
- Check if "Edit Configuration" button has `generic "Locked"` sibling
- Verify form fields are read-only

### Step 7.5: Record RBAC State

```json
{
  "rbac_state": {
    "namespace": "[namespace]",
    "permissions": {
      "canEdit": false,
      "canDelete": false,
      "canCreate": false,
      "canClone": false,
      "viewOnly": true
    },
    "lockedActions": ["Add", "Edit Configuration", "Clone Object", "Delete"],
    "availableActions": ["Manage Configuration", "Show Status", "Show Child Objects"],
    "indicators": [
      { "type": "locked_button", "action": "Edit Configuration" },
      { "type": "view_badge", "location": "dialog" }
    ]
  }
}
```

---

## Phase 8: Subscription Feature Detection

Detect subscription tier and feature availability based on badges and UI indicators.

### Step 8.1: Navigate to Home Page

```
Tool: mcp__claude-in-chrome__navigate
Parameters: { tabId: [tabId], url: "[tenant-url]/web/home" }
```

### Step 8.2: Execute Subscription Detection Script

```
Tool: mcp__claude-in-chrome__javascript_tool
Parameters: {
  tabId: [tabId],
  action: "javascript_exec",
  text: [contents of scripts/detect-subscription.js]
}
```

### Step 8.3: Scan Workspace Cards for Badges

Read page and look for badge patterns:
- `generic "Limited Availability"` - Feature in limited release
- `generic "New"` - Recently added feature
- `generic "Early Access"` - Preview/beta feature
- `generic "Upgrade"` - Requires subscription upgrade

### Step 8.4: Check for Upgrade Prompts

Search page for:
- "Upgrade" buttons
- "Contact Sales" links
- "Not available in your plan" text
- "Requires Advanced subscription" warnings

### Step 8.5: Record Subscription State

```json
{
  "subscription_state": {
    "tier": "standard|advanced|enterprise|unknown",
    "badges_found": [
      { "badge": "Limited Availability", "workspace": "Client-Side Defense" },
      { "badge": "New", "workspace": "BIG-IP Utilities" },
      { "badge": "Early Access", "workspace": "BIG-IP APM" }
    ],
    "gated_features": ["API Discovery", "Bot Defense Advanced"],
    "available_features": ["Web App Scanning", "Bot Defense Standard"],
    "upgrade_prompts": []
  }
}
```

---

## Phase 9: Module Initialization Detection

Detect which modules/workspaces need initialization or are already enabled.

### Step 9.1: Navigate to Workspace About Page

For each workspace to check:
```
Tool: mcp__claude-in-chrome__navigate
Parameters: { tabId: [tabId], url: "[tenant-url]/web/workspaces/[workspace]/workspace-info/about" }
```

### Step 9.2: Execute Module Detection Script

```
Tool: mcp__claude-in-chrome__javascript_tool
Parameters: {
  tabId: [tabId],
  action: "javascript_exec",
  text: [contents of scripts/detect-modules.js]
}
```

### Step 9.3: Check Service Status Indicators

Look for:
- `"This service is enabled."` → Module is active
- `"This service is not enabled."` → Module needs initialization
- `button "Visit Service"` → Enabled
- `button "Enable Service"` → Needs initialization

### Step 9.4: Check Workspace Services Table

Parse the "Workspace Services" table:
- **Status column**: `● Enabled` (green) or `Disabled`
- **Action column**: `Explore` (enabled) or `Enable` (needs init)

### Step 9.5: Record Module States

```json
{
  "module_states": {
    "web-app-scanning": {
      "initialized": true,
      "status": "enabled",
      "action_available": "Explore"
    },
    "client-side-defense": {
      "initialized": true,
      "status": "enabled",
      "badges": ["Limited Availability"]
    },
    "data-intelligence": {
      "initialized": false,
      "status": "disabled",
      "action_available": "Enable"
    }
  }
}
```

---

## Phase 10: Compile State Detection Report

Combine all detection results into a comprehensive state report.

### Step 10.1: Merge Detection Results

```json
{
  "detection_report": {
    "timestamp": "ISO-8601",
    "tenant": "[tenant-url]",
    "rbac": { ... },
    "subscription": { ... },
    "modules": { ... }
  }
}
```

### Step 10.2: Generate Conditional Logic

Based on detected states, determine:
- Which forms/buttons should be available
- Which workspaces can be accessed
- What features require upgrade
- Which modules need enabling first

---

## Post-Crawl Validation

After crawl completes:

1. **Verify page count** - should match expected workspaces
2. **Check form fields** - ensure required fields captured
3. **Test deterministic nav** - try navigating using refs only
4. **Compare with previous** - note any changes from last crawl
5. **Validate RBAC detection** - test permission detection on read-only namespace
6. **Validate subscription detection** - confirm badge patterns match
7. **Validate module detection** - verify enabled/disabled states
