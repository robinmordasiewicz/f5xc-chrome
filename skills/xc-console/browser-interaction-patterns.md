# Browser Interaction Patterns for F5 XC Console

This document captures deterministic patterns for browser automation with the F5 XC Console using `mcp__chrome-devtools` MCP tools. These patterns are derived from E2E testing and ensure consistent, reliable automation.

## Overview

The F5 XC Console uses Angular with Angular CDK/Material components. Some UI elements require specific interaction patterns that differ from standard accessibility-based clicking.

## Element Interaction Priority Chain

When interacting with page elements, follow this priority:

| Priority | Method | When to Use |
|----------|--------|-------------|
| 1 | `take_snapshot` + `click` with uid | Standard elements visible in accessibility tree |
| 2 | `evaluate_script` with DOM query | Overlay/dropdown menu items not in accessibility tree |
| 3 | `evaluate_script` with MouseEvent dispatch | Angular Material components requiring full event sequence |

## Pattern 1: Standard Element Clicks

**Use Case**: Buttons, links, form inputs visible in the accessibility tree

```javascript
// Step 1: Take snapshot to get element refs
mcp__chrome-devtools__take_snapshot()

// Step 2: Click using uid from snapshot
mcp__chrome-devtools__click({
  element: "Add HTTP Load Balancer button",
  ref: "{uid_from_snapshot}"
})
```

**Works For**:
- Primary action buttons (Add, Save, Cancel)
- Navigation links and tabs
- Form inputs and checkboxes
- Table row selection

## Pattern 2: Angular CDK Dropdown/Overlay Menus

**Problem**: Action menus (⋮) open overlays whose menu items do NOT appear in accessibility snapshots.

**Solution**: Use `evaluate_script` with DOM queries to find and click overlay items.

### Opening the Dropdown

```javascript
// The action menu button IS visible in the snapshot
mcp__chrome-devtools__click({
  element: "Action menu button for resource",
  ref: "{action_button_uid}"
})
```

### Clicking Menu Items (NOT in snapshot)

```javascript
// Menu items are in Angular CDK overlay - use JavaScript
mcp__chrome-devtools__evaluate_script({
  function: `() => {
    // Find the overlay container
    const overlay = document.querySelector('.cdk-overlay-container');
    if (!overlay) return { success: false, error: 'No overlay found' };

    // Find menu items by text content
    const menuItems = overlay.querySelectorAll('[role="menuitem"], .mat-menu-item, button');

    for (const item of menuItems) {
      if (item.textContent.includes('Delete')) {
        // Dispatch proper event sequence for Angular Material
        const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
        const mouseup = new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window });
        const click = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });

        item.dispatchEvent(mousedown);
        item.dispatchEvent(mouseup);
        item.dispatchEvent(click);

        return { success: true, clicked: item.textContent.trim() };
      }
    }

    return { success: false, error: 'Menu item not found' };
  }`
})
```

### Generic Menu Item Click Function

```javascript
// Reusable function to click any overlay menu item by text
mcp__chrome-devtools__evaluate_script({
  function: `(menuItemText) => {
    const overlay = document.querySelector('.cdk-overlay-container');
    if (!overlay) return { success: false, error: 'No overlay found' };

    const allElements = overlay.querySelectorAll('*');
    for (const el of allElements) {
      if (el.textContent.trim() === menuItemText && el.offsetParent !== null) {
        const events = ['mousedown', 'mouseup', 'click'].map(type =>
          new MouseEvent(type, { bubbles: true, cancelable: true, view: window })
        );
        events.forEach(e => el.dispatchEvent(e));
        return { success: true, clicked: menuItemText };
      }
    }
    return { success: false, error: 'Item not found: ' + menuItemText };
  }`,
  args: ["Delete"]  // Pass the menu item text
})
```

## Pattern 3: Confirmation Dialogs

**Use Case**: Delete confirmations, warning modals

**Pattern**: Confirmation dialogs ARE visible in the accessibility tree

```javascript
// After clicking Delete from dropdown
// Take snapshot - dialog will be visible
mcp__chrome-devtools__take_snapshot()

// Look for:
// - Dialog content: "Are you sure that you want to delete..."
// - Confirm button: typically labeled "Delete" or "Confirm"
// - Cancel button: typically labeled "Cancel"

// Click confirm button using uid from snapshot
mcp__chrome-devtools__click({
  element: "Delete confirmation button",
  ref: "{confirm_button_uid}"
})
```

### Confirmation Dialog Selectors

| Element | Typical Text | Role |
|---------|--------------|------|
| Banner | "Deleting 1 HTTP Load Balancer" | heading |
| Message | "Are you sure that you want to delete..." | paragraph |
| Confirm Button | "Delete" (in red) | button |
| Cancel Button | "Cancel" | button |

## Pattern 4: Form Filling

**Use Case**: Creating resources with multiple form fields

```javascript
// Step 1: Navigate to create form
mcp__chrome-devtools__navigate_page({
  url: "https://tenant.console.ves.volterra.io/web/workspaces/.../create"
})

// Step 2: Take snapshot to identify form fields
mcp__chrome-devtools__take_snapshot()

// Step 3: Fill each field using uid
mcp__chrome-devtools__fill({
  uid: "{name_input_uid}",
  value: "my-resource-name"
})

// Step 4: For dropdowns that need clicking first
mcp__chrome-devtools__click({
  element: "Namespace dropdown",
  ref: "{dropdown_uid}"
})

// Step 5: Take snapshot to see dropdown options
mcp__chrome-devtools__take_snapshot()

// Step 6: Click option
mcp__chrome-devtools__click({
  element: "default namespace option",
  ref: "{option_uid}"
})
```

## Pattern 5: Table Row Actions

**Use Case**: Acting on items in resource lists

### Finding Row by Resource Name

```javascript
mcp__chrome-devtools__evaluate_script({
  function: `(resourceName) => {
    const rows = document.querySelectorAll('table tbody tr, [role="row"]');

    for (const row of rows) {
      if (row.textContent.includes(resourceName)) {
        // Find the action button in this row
        const actionBtn = row.querySelector('button[aria-haspopup="menu"]');
        if (actionBtn) {
          actionBtn.click();
          return { success: true, found: resourceName };
        }
      }
    }
    return { success: false, error: 'Row not found: ' + resourceName };
  }`,
  args: ["test-auto-http-lb-e2e"]
})
```

### Verifying Resource Exists

```javascript
mcp__chrome-devtools__evaluate_script({
  function: `(resourceName) => {
    const rows = document.querySelectorAll('table tbody tr');
    for (const row of rows) {
      if (row.textContent.includes(resourceName)) {
        return { found: true, name: resourceName };
      }
    }
    return { found: false };
  }`,
  args: ["test-auto-http-lb-e2e"]
})
```

## Pattern 6: Waiting for State Changes

**Use Case**: Waiting for operations to complete

### Wait for Element to Appear

```javascript
// After submitting a form, wait for redirect
mcp__chrome-devtools__evaluate_script({
  function: `() => {
    return {
      url: location.href,
      isCreatePage: location.href.includes('/create'),
      title: document.title
    };
  }`
})

// If still on create page, wait and retry
```

### Wait for Item Count Change

```javascript
mcp__chrome-devtools__evaluate_script({
  function: `(expectedCount) => {
    const countEl = document.evaluate(
      "//*[contains(text(), 'item')]",
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    return {
      currentCount: countEl ? countEl.textContent : 'unknown',
      expectedCount: expectedCount
    };
  }`,
  args: ["1 item"]
})
```

## Pattern 7: Test Resource Cleanup

**Convention**: All test resources use `test-auto-` prefix

### Finding Orphaned Test Resources

```javascript
mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const TEST_PREFIX = 'test-auto-';
    const rows = document.querySelectorAll('table tbody tr');
    const orphans = [];

    rows.forEach(row => {
      const text = row.textContent || '';
      if (text.includes(TEST_PREFIX)) {
        const match = text.match(/test-auto-[a-z0-9-]+/i);
        orphans.push(match ? match[0] : 'unknown');
      }
    });

    return {
      found: orphans.length > 0,
      count: orphans.length,
      resources: orphans,
      cleanupRequired: orphans.length > 0
    };
  }`
})
```

## Common Selectors Reference

### Angular CDK Overlay Container

```css
.cdk-overlay-container    /* Contains all overlays/dropdowns */
.cdk-overlay-pane         /* Individual overlay panel */
.mat-menu-panel           /* Material menu panel */
.mat-menu-item            /* Menu item */
```

### F5 XC Console Specific

```css
[data-testid="..."]       /* Stable test IDs when available */
[aria-label="..."]        /* Accessibility labels */
button[aria-haspopup]     /* Dropdown trigger buttons */
.workspace-card           /* Home page workspace cards */
```

### Table Elements

```css
table tbody tr            /* Table rows */
[role="row"]              /* ARIA row role */
[role="gridcell"]         /* Table cells */
```

## Troubleshooting

### Issue: Menu Item Click Does Nothing

**Cause**: Simple `click()` doesn't trigger Angular change detection

**Solution**: Use full MouseEvent sequence (mousedown → mouseup → click)

### Issue: Element Not in Snapshot

**Cause**: Element is in Angular CDK overlay, not main DOM tree for accessibility

**Solution**: Use `evaluate_script` to query `.cdk-overlay-container`

### Issue: Stale Element Reference

**Cause**: Page updated between snapshot and click

**Solution**: Take fresh snapshot before each interaction

### Issue: Form Field Not Accepting Input

**Cause**: Angular reactive form validation or focus issues

**Solution**: Click the field first, then use `fill()`, or use `evaluate_script` to set value and dispatch input event

```javascript
mcp__chrome-devtools__evaluate_script({
  function: `(selector, value) => {
    const input = document.querySelector(selector);
    if (input) {
      input.focus();
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return { success: true };
    }
    return { success: false };
  }`,
  args: ["input[name='name']", "my-resource"]
})
```

## Complete E2E Workflow Example

### HTTP Load Balancer Lifecycle: Create → Verify → Delete → Cleanup

```
Phase 1: Navigate
  mcp__chrome-devtools__navigate_page({ url: "...http_loadbalancers" })
  mcp__chrome-devtools__take_snapshot()

Phase 2: Create
  mcp__chrome-devtools__click({ ref: "add_button_uid" })
  mcp__chrome-devtools__take_snapshot()
  mcp__chrome-devtools__fill({ uid: "name_uid", value: "test-auto-http-lb" })
  mcp__chrome-devtools__fill({ uid: "domain_uid", value: "test.example.com" })
  mcp__chrome-devtools__click({ ref: "save_button_uid" })

Phase 3: Verify Creation
  mcp__chrome-devtools__take_snapshot()
  mcp__chrome-devtools__evaluate_script({ /* search for resource */ })

Phase 4: Delete (using overlay pattern)
  mcp__chrome-devtools__click({ ref: "action_menu_uid" })  // Opens overlay
  mcp__chrome-devtools__evaluate_script({ /* click Delete in overlay */ })
  mcp__chrome-devtools__take_snapshot()  // See confirmation dialog
  mcp__chrome-devtools__click({ ref: "confirm_delete_uid" })

Phase 5: Verify Cleanup
  mcp__chrome-devtools__take_snapshot()
  mcp__chrome-devtools__evaluate_script({ /* verify resource gone */ })
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-09 | Initial patterns from E2E test execution |
