# E2E Test: Origin Pool Create and Cleanup

**Tags**: @e2e @smoke @origin-pool @create @cleanup
**Duration**: ~4 minutes
**Prerequisites**: Authenticated browser session with F5 XC console

## Test Overview

This test validates the complete lifecycle of an Origin Pool:
1. Navigate to Origin Pools list
2. Create a new Origin Pool with test configuration
3. Verify the origin pool was created successfully
4. Delete the origin pool
5. Verify cleanup was successful

## Environment Variables

```
F5XC_CONSOLE_URL: https://f5-amer-ent.console.ves.volterra.io (default)
F5XC_TEST_NAMESPACE: validation-test (default)
```

## Test Resource Configuration

```json
{
  "resourceName": "test-auto-pool-{timestamp}",
  "resourceType": "origin_pool",
  "namespace": "{F5XC_TEST_NAMESPACE}",
  "config": {
    "origins": [{
      "type": "public_ip",
      "address": "192.0.2.1",
      "port": 80
    }],
    "loadbalancer_algorithm": "ROUND_ROBIN",
    "healthcheck": {
      "path": "/health",
      "interval": 30
    }
  }
}
```

---

## PHASE 1: INITIALIZATION

### Step 1.1: Verify Browser Connection

```
mcp__chrome-devtools__list_pages()
```

**Expected**: Returns list of open pages with authenticated F5 XC console session.

### Step 1.2: Navigate to Console Home

```
mcp__chrome-devtools__navigate_page({ url: "{F5XC_CONSOLE_URL}/web/home" })
```

**Expected**: Page loads successfully, shows workspace cards.

---

## PHASE 2: CREATE ORIGIN POOL

### Step 2.1: Navigate to Origin Pools List

```
mcp__chrome-devtools__navigate_page({
  url: "{F5XC_CONSOLE_URL}/web/workspaces/web-app-and-api-protection/namespaces/{namespace}/manage/load_balancers/origin_pools"
})
```

### Step 2.2: Wait for Page Load and Snapshot

```
mcp__chrome-devtools__take_snapshot()
```

**Verify**:
- URL contains `origin_pools`
- Page does NOT contain "Access Denied"
- "Add Origin Pool" button visible

### Step 2.3: Click Add Button

```
mcp__chrome-devtools__click({
  element: "Add Origin Pool button",
  ref: "{ref_from_snapshot}"
})
```

### Step 2.4: Wait for Form and Snapshot

```
mcp__chrome-devtools__take_snapshot()
```

**Verify**: Form is visible with Name input field.

### Step 2.5: Fill Metadata - Name

```
mcp__chrome-devtools__fill({
  element: "Name input field",
  ref: "{name_input_ref}",
  value: "test-auto-pool-{timestamp}"
})
```

### Step 2.6: Configure Origin Server

Find and click "Add Item" or "Configure" for origins:

```
mcp__chrome-devtools__take_snapshot()
mcp__chrome-devtools__click({
  element: "Add Item button for origin servers",
  ref: "{add_origin_ref}"
})
```

### Step 2.7: Fill Origin Server Details

```
mcp__chrome-devtools__take_snapshot()
```

Fill origin type (Public IP):
```
mcp__chrome-devtools__click({
  element: "Origin Server Type selector",
  ref: "{origin_type_ref}"
})
```

Select Public IP option and fill IP address:
```
mcp__chrome-devtools__fill({
  element: "IP Address input",
  ref: "{ip_input_ref}",
  value: "192.0.2.1"
})
```

Fill port:
```
mcp__chrome-devtools__fill({
  element: "Port input",
  ref: "{port_input_ref}",
  value: "80"
})
```

### Step 2.8: Apply Origin Configuration

```
mcp__chrome-devtools__click({
  element: "Apply button for origin configuration",
  ref: "{apply_origin_ref}"
})
```

### Step 2.9: Submit Form

```
mcp__chrome-devtools__take_snapshot()
mcp__chrome-devtools__click({
  element: "Save and Exit button",
  ref: "{submit_button_ref}"
})
```

### Step 2.10: Wait for Creation and Verify

```
mcp__chrome-devtools__take_snapshot()
```

**Verify**:
- URL returns to list view (no `/create`)
- Page contains the created resource name "test-auto-pool-{timestamp}"
- No error messages visible

---

## PHASE 3: VERIFY CREATION

### Step 3.1: Execute Verification Script

```
mcp__chrome-devtools__evaluate_script({
  function: "() => {
    const rows = document.querySelectorAll('table tbody tr, [data-testid*=\"row\"]');
    const resourceName = 'test-auto-pool-{timestamp}';
    for (const row of rows) {
      if (row.textContent.includes(resourceName)) {
        return { found: true, resourceName, resourceType: 'origin_pool' };
      }
    }
    return { found: false, resourceName, rowCount: rows.length };
  }"
})
```

**Expected**: `{ found: true, resourceName: "test-auto-pool-{timestamp}", resourceType: "origin_pool" }`

---

## PHASE 4: CLEANUP - DELETE RESOURCE

### Step 4.1: Locate Resource Row Actions

From the snapshot, find the action menu (⋮) or delete button for the test resource.

```
mcp__chrome-devtools__click({
  element: "Action menu for test resource",
  ref: "{action_menu_ref}"
})
```

### Step 4.2: Click Delete Option

```
mcp__chrome-devtools__take_snapshot()
mcp__chrome-devtools__click({
  element: "Delete option",
  ref: "{delete_option_ref}"
})
```

### Step 4.3: Confirm Deletion

Wait for confirmation dialog:

```
mcp__chrome-devtools__take_snapshot()
mcp__chrome-devtools__click({
  element: "Confirm Delete button",
  ref: "{confirm_delete_ref}"
})
```

### Step 4.4: Wait for Deletion to Complete

```
mcp__chrome-devtools__take_snapshot()
```

---

## PHASE 5: VERIFY CLEANUP

### Step 5.1: Verify Resource Removed

```
mcp__chrome-devtools__evaluate_script({
  function: "() => {
    const rows = document.querySelectorAll('table tbody tr, [data-testid*=\"row\"]');
    const resourceName = 'test-auto-pool-{timestamp}';
    for (const row of rows) {
      if (row.textContent.includes(resourceName)) {
        return { deleted: false, resourceName, message: 'Resource still exists' };
      }
    }
    return { deleted: true, resourceName, message: 'Resource successfully deleted' };
  }"
})
```

**Expected**: `{ deleted: true, resourceName: "test-auto-pool-{timestamp}", message: "Resource successfully deleted" }`

---

## Test Result Validation

### Success Criteria

| Phase | Criterion | Status |
|-------|-----------|--------|
| Init | Browser connected | ✅ |
| Create | Form submitted without errors | ✅ |
| Verify | Resource appears in list | ✅ |
| Delete | Resource removed from list | ✅ |
| Cleanup | No test resources remaining | ✅ |

---

## Cleanup Script (Always Execute)

```
mcp__chrome-devtools__evaluate_script({
  function: "() => {
    const testResources = [];
    const rows = document.querySelectorAll('table tbody tr');
    rows.forEach(row => {
      if (row.textContent.includes('test-auto-pool-')) {
        testResources.push(row.textContent.trim().substring(0, 50));
      }
    });
    return { orphanedResources: testResources, count: testResources.length };
  }"
})
```

If orphaned resources found, repeat PHASE 4 for each.
