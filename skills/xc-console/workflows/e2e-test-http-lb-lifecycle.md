# E2E Test Workflow: HTTP Load Balancer Lifecycle

**Type**: End-to-End Test
**Tags**: @e2e @smoke @http-lb @create @cleanup
**Duration**: ~5 minutes
**Prerequisites**: Authenticated browser session with F5 XC console
**Patterns**: See `../browser-interaction-patterns.md` for Angular CDK interaction details

## Overview

This workflow validates the complete lifecycle of an HTTP Load Balancer through the F5 XC console:
1. Navigate to HTTP Load Balancers list
2. Create a new HTTP Load Balancer with test configuration
3. Verify the load balancer was created successfully
4. Delete the load balancer
5. Verify cleanup was successful

## Critical Pattern: Angular CDK Overlays

**IMPORTANT**: The F5 XC Console uses Angular CDK for dropdown menus. Menu items in action dropdowns (⋮) are rendered in `.cdk-overlay-container` and do NOT appear in accessibility snapshots.

**Solution**: Use `evaluate_script` with full MouseEvent sequence to click dropdown items.

## Test Invocation

```
/xc-console test http-lb-lifecycle
```

Or manually:
```
/xc-console create HTTP load balancer named test-auto-http-lb-{timestamp}, then verify it exists, then delete it
```

---

## PHASE 1: INITIALIZATION

### Check Browser Connection

```javascript
mcp__chrome-devtools__list_pages()
```

If no pages open with F5 XC console, create one:
```javascript
mcp__chrome-devtools__new_page({ url: "https://f5-amer-ent.console.ves.volterra.io/web/home" })
```

### Verify Authentication

Execute authentication detection:
```javascript
mcp__chrome-devtools__evaluate_script({
  function: "() => { return { url: location.href, authenticated: location.href.includes('/web/'), title: document.title }; }"
})
```

**Success**: `authenticated: true`
**Failure**: Proceed with authentication workflow (see `authentication-flows.md`)

---

## PHASE 2: CREATE HTTP LOAD BALANCER

### Navigate to HTTP Load Balancers

```javascript
mcp__chrome-devtools__navigate_page({
  url: "https://f5-amer-ent.console.ves.volterra.io/web/workspaces/web-app-and-api-protection/namespaces/{namespace}/manage/load_balancers/http_loadbalancers"
})
```

### Take Snapshot and Find Add Button

```javascript
mcp__chrome-devtools__take_snapshot()
```

Look for element with text "Add HTTP Load Balancer" - note the `uid` value.

### Click Add Button

```javascript
mcp__chrome-devtools__click({
  element: "Add HTTP Load Balancer button",
  ref: "{uid_from_snapshot}"
})
```

### Wait for Form and Take Snapshot

```javascript
mcp__chrome-devtools__take_snapshot()
```

### Fill Form - Name

```javascript
mcp__chrome-devtools__fill({
  uid: "{name_input_uid}",
  value: "test-auto-http-lb-e2e"
})
```

### Fill Form - Domain

```javascript
mcp__chrome-devtools__fill({
  uid: "{domain_input_uid}",
  value: "test-auto-e2e.example.com"
})
```

### Submit Form

```javascript
mcp__chrome-devtools__click({
  element: "Save and Exit button",
  ref: "{submit_uid}"
})
```

### Wait for Redirect

```javascript
mcp__chrome-devtools__take_snapshot()
```

**Verify**: URL no longer contains `/create`

---

## PHASE 3: VERIFY CREATION

### Search for Created Resource

```javascript
mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('table tbody tr');
    for (const row of rows) {
      if (row.textContent.includes('test-auto-http-lb-e2e')) {
        return { found: true, name: 'test-auto-http-lb-e2e' };
      }
    }
    return { found: false };
  }`
})
```

**Expected**: `{ found: true }`

---

## PHASE 4: DELETE RESOURCE

### Step 4.1: Find and Click Action Menu Button

From the snapshot, locate the action menu (⋮) button in the row containing the test resource.

```javascript
mcp__chrome-devtools__click({
  element: "Action menu for test-auto-http-lb-e2e",
  ref: "{action_menu_uid}"
})
```

### Step 4.2: Click Delete Option (CRITICAL - Uses JavaScript)

**IMPORTANT**: The dropdown menu items are NOT in the accessibility snapshot.
They are rendered in `.cdk-overlay-container` which is outside the main DOM tree.

**Use this deterministic pattern:**

```javascript
mcp__chrome-devtools__evaluate_script({
  function: `() => {
    // Angular CDK renders menu in overlay container
    const overlay = document.querySelector('.cdk-overlay-container');
    if (!overlay) {
      return { success: false, error: 'No overlay found - menu may not be open' };
    }

    // Find menu items
    const menuItems = overlay.querySelectorAll('[role="menuitem"], .mat-menu-item, button');

    for (const item of menuItems) {
      if (item.textContent.includes('Delete')) {
        // Angular Material requires full event sequence
        // Simple click() does NOT trigger change detection
        const eventConfig = { bubbles: true, cancelable: true, view: window };

        item.dispatchEvent(new MouseEvent('mousedown', eventConfig));
        item.dispatchEvent(new MouseEvent('mouseup', eventConfig));
        item.dispatchEvent(new MouseEvent('click', eventConfig));

        return { success: true, clicked: 'Delete' };
      }
    }

    return { success: false, error: 'Delete option not found in menu' };
  }`
})
```

### Step 4.3: Confirm Deletion

After clicking Delete, a confirmation dialog appears. This dialog IS visible in the accessibility snapshot.

```javascript
mcp__chrome-devtools__take_snapshot()
```

Look for:
- Banner: "Deleting 1 HTTP Load Balancer"
- Message: "Are you sure that you want to delete HTTP load balancer test-auto-http-lb-e2e?"
- Confirm button: "Delete" (uid will be in snapshot)

```javascript
mcp__chrome-devtools__click({
  element: "Delete confirmation button",
  ref: "{confirm_button_uid}"
})
```

---

## PHASE 5: VERIFY CLEANUP

### Check Resource Deleted

```javascript
mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const rows = document.querySelectorAll('table tbody tr');
    for (const row of rows) {
      if (row.textContent.includes('test-auto-http-lb-e2e')) {
        return { deleted: false };
      }
    }
    return { deleted: true };
  }`
})
```

**Expected**: `{ deleted: true }`

### Verify Item Count Changed

```javascript
mcp__chrome-devtools__take_snapshot()
```

Check that item count decreased by 1.

---

## Test Result Summary

| Phase | Action | Expected Result |
|-------|--------|-----------------|
| Init | Connect browser | Pages listed |
| Init | Verify auth | URL contains `/web/` |
| Create | Fill form | All fields populated |
| Create | Submit | Redirected to list |
| Verify | Search list | Resource found |
| Delete | Click action menu | Dropdown opens |
| Delete | **Click Delete (via JS)** | **Confirmation dialog shows** |
| Delete | Confirm | Resource removed |
| Cleanup | Verify | Resource not in list |

## Interaction Pattern Reference

| Step | Element Type | Method | Reason |
|------|--------------|--------|--------|
| Add button | Standard button | `click` | In accessibility tree |
| Form inputs | Input fields | `fill` | Standard form interaction |
| Save button | Standard button | `click` | In accessibility tree |
| Action menu (⋮) | Button | `click` | Opens the overlay |
| **Delete option** | **Dropdown item** | **`evaluate_script`** | **NOT in accessibility tree** |
| Confirm button | Dialog button | `click` | Dialog IS in accessibility tree |

## Cleanup on Failure

If test fails, run cleanup to remove orphaned resources:

```javascript
mcp__chrome-devtools__evaluate_script({
  function: `() => {
    const TEST_PREFIX = 'test-auto-';
    const orphans = [];

    document.querySelectorAll('table tbody tr').forEach(row => {
      if (row.textContent.includes(TEST_PREFIX)) {
        const match = row.textContent.match(/test-auto-[a-z0-9-]+/i);
        orphans.push(match ? match[0] : 'unknown');
      }
    });

    return {
      orphanCount: orphans.length,
      resources: orphans,
      cleanupRequired: orphans.length > 0
    };
  }`
})
```

Then manually delete each orphaned resource using the same delete pattern above.

## Troubleshooting

### "Delete option not found in menu"

1. Verify the action menu is actually open (take a screenshot)
2. Check that the overlay container exists
3. The menu may have a different text - try partial match or inspect the page

### "No overlay found"

1. The action menu button click may have failed
2. Take a snapshot and verify the action button uid
3. Try clicking the action button again

### "Delete confirmation dialog not appearing"

1. The `evaluate_script` click may not have triggered
2. Verify the MouseEvent sequence is being dispatched
3. Try a screenshot to see the current page state

### "Resource still exists after delete"

1. Wait a moment for the deletion to complete
2. Refresh the page or take a new snapshot
3. Check if there was an error message on the page
