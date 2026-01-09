# E2E Tests for F5 XC Console Plugin

End-to-end tests that use Chrome DevTools MCP server for real browser automation.

## Overview

These tests validate complete workflows in the F5 Distributed Cloud console:
- **Authentication**: Login and session management
- **Resource Lifecycle**: Create → Verify → Delete → Cleanup
- **Navigation**: Deterministic browser navigation

## Test Architecture

Unlike traditional Playwright tests, these E2E tests are designed to be executed through Claude Code using the Chrome DevTools MCP server. The tests are defined as workflow documents that Claude follows step-by-step.

### Directory Structure

```
tests/e2e/
├── README.md                  # This file
├── workflows/                 # Test workflow definitions
│   ├── authentication-flow.md       # Auth flow test
│   ├── http-lb-create-cleanup.md    # HTTP LB lifecycle test
│   └── origin-pool-create-cleanup.md # Origin pool lifecycle test
└── scripts/                   # Validation scripts for evaluate_script
    ├── detect-auth-state.js          # Authentication detection
    ├── validate-resource-created.js  # Resource creation verification
    ├── validate-resource-deleted.js  # Resource deletion verification
    └── cleanup-test-resources.js     # Orphaned resource detection
```

## Running E2E Tests

### Prerequisites

1. **Chrome DevTools MCP Server**: Must be configured and running
2. **Authenticated Session**: Browser must have valid F5 XC console session
3. **Test Namespace**: A namespace with appropriate permissions

### Using the Skill Command

Run via the xc-console skill:

```
/xc-console test e2e [test-name]
```

Available tests:
- `auth` - Authentication flow test
- `http-lb` - HTTP Load Balancer create/cleanup
- `origin-pool` - Origin Pool create/cleanup
- `all` - Run all E2E tests

### Manual Execution

To run a test manually, follow the workflow in the corresponding markdown file:

1. Open Chrome with DevTools MCP server connected
2. Navigate to F5 XC console
3. Execute each MCP command in sequence from the workflow
4. Verify results at each checkpoint

## Test Resource Naming Convention

All test resources are named with the prefix `test-auto-`:

```
test-auto-{resource-type}-{timestamp}
```

Examples:
- `test-auto-http-lb-1704067200000`
- `test-auto-pool-1704067200000`

This allows easy identification and cleanup of test resources.

## Cleanup

Tests should clean up resources automatically. If a test fails mid-execution, run the cleanup script to find and remove orphaned resources:

```
mcp__chrome-devtools__evaluate_script({
  function: "<contents of scripts/cleanup-test-resources.js>"
})
```

## MCP Tools Used

These tests use the following Chrome DevTools MCP tools:

| Tool | Purpose |
|------|---------|
| `mcp__chrome-devtools__list_pages` | List open browser pages |
| `mcp__chrome-devtools__new_page` | Open new browser page |
| `mcp__chrome-devtools__navigate_page` | Navigate to URL |
| `mcp__chrome-devtools__take_snapshot` | Get page accessibility snapshot |
| `mcp__chrome-devtools__click` | Click on element |
| `mcp__chrome-devtools__fill` | Fill input field |
| `mcp__chrome-devtools__evaluate_script` | Execute JavaScript |

## Test Results

### Success Criteria

Each test phase has specific success criteria:

1. **Init**: Browser connected, console accessible
2. **Create**: Form submitted, no errors
3. **Verify**: Resource visible in list
4. **Delete**: Resource removed successfully
5. **Cleanup**: No orphaned test resources

### Failure Handling

On failure:
1. Screenshot is captured for debugging
2. Cleanup phase still executes
3. Failure details are logged with phase information

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `F5XC_CONSOLE_URL` | `https://f5-amer-ent.console.ves.volterra.io` | Console URL |
| `F5XC_TEST_NAMESPACE` | `validation-test` | Test namespace |
| `F5XC_AUTH_METHOD` | `session` | Auth method (session/sso/native) |
| `F5XC_USERNAME` | - | Username for native auth |
| `F5XC_PASSWORD` | - | Password for native auth |

## Adding New Tests

To add a new E2E test:

1. Create workflow file in `workflows/`
2. Follow the existing structure with PHASES and verification
3. Use `test-auto-` prefix for resource names
4. Include cleanup phase
5. Add validation scripts if needed

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check browser session is valid
   - Verify SSO/credentials are correct

2. **Element Not Found**
   - Take new snapshot to get updated refs
   - Console UI may have changed

3. **Cleanup Failed**
   - Manually run cleanup script
   - Check namespace permissions

4. **Timeout Errors**
   - Console may be slow to respond
   - Increase wait times between actions
