# Test: HTTP Load Balancer Creation

Validates the HTTP load balancer creation workflow.

## Prerequisites

- [ ] Chrome browser with Claude in Chrome extension
- [ ] Valid F5 XC tenant access
- [ ] Logged into F5 XC console
- [ ] At least one origin pool configured

## Test Steps

### 1. Navigate to Load Balancers

```
Action: Navigate to Multi-Cloud App Connect > Load Balancers > HTTP Load Balancers
Expected: HTTP Load Balancers list page displays
```

### 2. Initiate Creation

```
Action: Click "Add HTTP Load Balancer" button
Expected: Load balancer creation form opens
```

### 3. Configure Basic Settings

```
Action: Fill in basic configuration
Fields:
  - Name: test-http-lb-001
  - Domains: test.example.com
  - Load Balancer Type: HTTP
Expected: Form accepts all values without validation errors
```

### 4. Configure Origin Pool

```
Action: Add origin pool reference
Fields:
  - Origin Pool: [select existing pool]
  - Weight: 1
  - Priority: 1
Expected: Origin pool added to configuration
```

### 5. Save Configuration

```
Action: Click "Save and Exit"
Expected:
  - Success notification appears
  - Redirected to load balancer list
  - New load balancer visible in list
```

## Validation Criteria

- [ ] Load balancer appears in list with status "Active"
- [ ] Configuration matches input values
- [ ] No error messages during creation
- [ ] Load balancer is accessible via API

## Cleanup

```
Action: Delete test load balancer
Steps:
  1. Select test-http-lb-001 from list
  2. Click Actions > Delete
  3. Confirm deletion
Expected: Load balancer removed from list
```

## Related Workflows

- `workflow-http-lb-create.md`
- `workflow-origin-pool-create.md`
