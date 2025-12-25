# API Reference

## MCP Tools

The plugin uses Claude in Chrome MCP tools for browser automation.

{{ mcp_tools() }}

### Tool Descriptions

| Tool | Purpose |
|------|---------|
| `tabs_context_mcp` | Get browser tab context and IDs |
| `navigate` | Navigate to URLs |
| `read_page` | Read page elements and structure |
| `computer` | Click, type, screenshot, scroll |
| `find` | Find elements by description |
| `form_input` | Fill form fields |
| `get_page_text` | Extract page text content |
| `javascript_tool` | Execute JavaScript in page context |

## Selector Types

### data_testid

Most stable selector, used by developers for testing.

```javascript
[data-testid="add-lb-btn"]
```

### aria_label

Accessibility labels, fairly stable.

```javascript
[aria-label="Add Load Balancer"]
```

### text_match

Text content matching, used with `find()`.

```javascript
"Add HTTP Load Balancer"
```

### css

CSS selectors for complex matching.

```javascript
".workspace-card:has-text('Web App')"
```

### ref

Session-specific references, may become stale.

```javascript
"ref_27"
```

## URL Patterns

### Static Routes

Fixed paths that don't change:

```
/web/home
/web/catalog/use-cases
/web/workspaces/web-app-and-api-protection
```

### Dynamic Routes

Paths with variable segments:

```
/web/workspaces/{workspace}/namespaces/{namespace}/manage/{resource_type}
```

Variables:

- `{workspace}` - Workspace slug
- `{namespace}` - Tenant namespace
- `{resource_type}` - Resource type slug
- `{resource_id}` - Resource identifier

## Workflow Patterns

### Basic Workflow Structure

```markdown
---
name: workflow-name
description: What this workflow does
---

# Workflow Name

## Prerequisites
- Required setup steps

## Steps

### Step 1: Navigate
Navigate to the target page.

### Step 2: Fill Form
Fill required fields.

### Step 3: Submit
Review and submit.

## Validation
Verify the result.
```

### Field Definitions

```json
{
  "field_name": {
    "ref": "ref_123",
    "type": "textbox|listbox|checkbox|spinbutton",
    "required": true,
    "selectors": {
      "data_testid": null,
      "aria_label": "Field Label",
      "text_match": null,
      "css": "input[name='field']"
    }
  }
}
```
