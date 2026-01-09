# E2E Test: HTTP Load Balancer Create and Cleanup

**Tags**: @e2e @smoke @http-lb @create @cleanup
**Duration**: ~5 minutes
**Prerequisites**: Authenticated browser session with F5 XC console

## Test Overview

This test validates the complete lifecycle of an HTTP Load Balancer:
1. Navigate to HTTP Load Balancers list
2. Create a new HTTP Load Balancer with test configuration
3. Verify the load balancer was created successfully
4. Delete the load balancer
5. Verify cleanup was successful

## Environment Variables

```
F5XC_CONSOLE_URL: https://f5-amer-ent.console.ves.volterra.io (default)
F5XC_TEST_NAMESPACE: validation-test (default)
```

## Test Resource Configuration

```json
{
  "resourceName": "test-auto-http-lb-{timestamp}",
  "resourceType": "http_loadbalancer",
  "namespace": "{F5XC_TEST_NAMESPACE}",
  "config": {
    "domains": ["test-auto-{timestamp}.example.com"],
    "loadBalancerType": "HTTP",
    "originPools": []
  }
}
```

---

## PHASE 1: INITIALIZATION

### Step 1.1: Verify Browser Connection

```
mcp__chrome-devtools__list_pages()
```

**Expected**: Returns list of open pages. If no pages, create new:
```
mcp__chrome-devtools__new_page({ url: "{F5XC_CONSOLE_URL}" })
```

### Step 1.2: Navigate to Console Home

```
mcp__chrome-devtools__navigate_page({ url: "{F5XC_CONSOLE_URL}/web/home" })
```

**Expected**: Page loads successfully, no access denied errors.

### Step 1.3: Take Initial Snapshot

```
mcp__chrome-devtools__take_snapshot()
```

**Verify**: Page contains workspace cards or authenticated content (not login page).

---

## PHASE 2: CREATE HTTP LOAD BALANCER

### Step 2.1: Navigate to HTTP Load Balancers List

```
mcp__chrome-devtools__navigate_page({
  url: "{F5XC_CONSOLE_URL}/web/workspaces/web-app-and-api-protection/namespaces/{namespace}/manage/load_balancers/http_loadbalancers"
})
```

### Step 2.2: Wait for Page Load and Snapshot

```
mcp__chrome-devtools__take_snapshot()
```

**Verify**:
- URL contains `http_loadbalancers`
- Page does NOT contain "Access Denied"
- "Add HTTP Load Balancer" button visible

### Step 2.3: Click Add Button

```
mcp__chrome-devtools__click({
  element: "Add HTTP Load Balancer button",
  ref: "{ref_from_snapshot}"
})
```

### Step 2.4: Wait for Form and Snapshot

```
mcp__chrome-devtools__take_snapshot()
```

**Verify**: URL contains `/create` or form dialog is visible.

### Step 2.5: Fill Metadata - Name

```
mcp__chrome-devtools__fill({
  element: "Name input field",
  ref: "{name_input_ref}",
  value: "test-auto-http-lb-{timestamp}"
})
```

### Step 2.6: Fill Domains Configuration

Look for domain input field in snapshot and fill:

```
mcp__chrome-devtools__fill({
  element: "Domain input field",
  ref: "{domain_input_ref}",
  value: "test-auto-{timestamp}.example.com"
})
```

### Step 2.7: Configure Load Balancer Type (if required)

Select HTTP type if dropdown present:

```
mcp__chrome-devtools__click({
  element: "Load Balancer Type HTTP option",
  ref: "{http_type_ref}"
})
```

### Step 2.8: Submit Form

```
mcp__chrome-devtools__click({
  element: "Save and Exit button",
  ref: "{submit_button_ref}"
})
```

### Step 2.9: Wait for Creation and Verify

```
mcp__chrome-devtools__take_snapshot()
```

**Verify**:
- URL returns to list view (no `/create`)
- Page contains the created resource name "test-auto-http-lb-{timestamp}"
- No error messages visible

---

## PHASE 3: VERIFY CREATION

### Step 3.1: Search for Created Resource

If search input available:
```
mcp__chrome-devtools__fill({
  element: "Search input",
  ref: "{search_ref}",
  value: "test-auto-http-lb-{timestamp}"
})
```

### Step 3.2: Verify Resource in List

```
mcp__chrome-devtools__take_snapshot()
```

**Verify**: Resource "test-auto-http-lb-{timestamp}" appears in table.

### Step 3.3: Execute Verification Script

```
mcp__chrome-devtools__evaluate_script({
  function: "() => {
    const rows = document.querySelectorAll('table tbody tr, [data-testid*=\"row\"]');
    const resourceName = 'test-auto-http-lb-{timestamp}';
    for (const row of rows) {
      if (row.textContent.includes(resourceName)) {
        return { found: true, resourceName };
      }
    }
    return { found: false, resourceName, rowCount: rows.length };
  }"
})
```

**Expected**: `{ found: true, resourceName: "test-auto-http-lb-{timestamp}" }`

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

### Step 5.1: Search for Deleted Resource

```
mcp__chrome-devtools__fill({
  element: "Search input",
  ref: "{search_ref}",
  value: "test-auto-http-lb-{timestamp}"
})
```

### Step 5.2: Verify Resource Removed

```
mcp__chrome-devtools__evaluate_script({
  function: "() => {
    const rows = document.querySelectorAll('table tbody tr, [data-testid*=\"row\"]');
    const resourceName = 'test-auto-http-lb-{timestamp}';
    for (const row of rows) {
      if (row.textContent.includes(resourceName)) {
        return { deleted: false, resourceName, message: 'Resource still exists' };
      }
    }
    return { deleted: true, resourceName, message: 'Resource successfully deleted' };
  }"
})
```

**Expected**: `{ deleted: true, resourceName: "test-auto-http-lb-{timestamp}", message: "Resource successfully deleted" }`

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

### Failure Handling

If any phase fails:
1. Take screenshot for debugging
2. Attempt cleanup regardless (delete any created resources)
3. Report failure with phase information

---

## Cleanup Script (Always Execute)

Even on test failure, attempt to clean up any created resources:

```
mcp__chrome-devtools__evaluate_script({
  function: "() => {
    const testResources = [];
    const rows = document.querySelectorAll('table tbody tr');
    rows.forEach(row => {
      if (row.textContent.includes('test-auto-http-lb-')) {
        testResources.push(row.textContent.trim().substring(0, 50));
      }
    });
    return { orphanedResources: testResources, count: testResources.length };
  }"
})
```

If orphaned resources found, repeat PHASE 4 for each.
