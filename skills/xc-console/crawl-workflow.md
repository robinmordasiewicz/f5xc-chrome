# F5 XC Console Crawl Workflow

This document defines the step-by-step workflow for Claude to crawl the F5 XC console and generate deterministic navigation metadata.

## Quick Start

To execute a crawl:
```
/f5xc-console crawl https://nferreira.staging.volterra.us/
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
  "version": "2.0.0",
  "tenant": "nferreira.staging.volterra.us",
  "last_crawled": "2025-12-24T15:00:00Z",
  "crawl_duration_minutes": 25,
  "pages_crawled": 45,
  "forms_extracted": 12,
  "total_elements": 350
}
```

### Step 6.3: Save to File

Write complete JSON to:
`/Users/r.mordasiewicz/.claude/skills/f5xc-console/console-navigation-metadata.json`

---

## Output Schema

```json
{
  "version": "2.0.0",
  "tenant": "string",
  "last_crawled": "ISO-8601",

  "workspaces": {
    "Web App & API Protection": {
      "url": "/web/workspaces/web-app-and-api-protection",
      "card_ref": "ref_X",
      "sections": ["Overview", "Manage"]
    }
  },

  "pages": {
    "/web/path": {
      "title": "string",
      "workspace": "string",
      "url": "string",
      "elements": {},
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

## Post-Crawl Validation

After crawl completes:

1. **Verify page count** - should match expected workspaces
2. **Check form fields** - ensure required fields captured
3. **Test deterministic nav** - try navigating using refs only
4. **Compare with previous** - note any changes from last crawl
