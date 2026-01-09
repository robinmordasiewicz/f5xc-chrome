# F5 XC Console Automation Test Suite

Comprehensive test infrastructure for validating F5 XC console automation workflows.

## Test Categories

| Category | Purpose | Browser Required | Resource Creation |
|----------|---------|------------------|-------------------|
| **Unit Tests** | Validate metadata, selectors, schemas | No | No |
| **Integration Tests** | Verify navigation, selector resolution | Yes (read-only) | No |
| **UAT Tests** | Execute full workflows end-to-end | Yes | Yes (with cleanup) |

## Directory Structure

```
tests/
├── unit/                          # Unit tests (no browser)
│   ├── metadata/                  # JSON schema validation
│   │   ├── console-navigation-metadata.test.ts
│   │   ├── url-sitemap.test.ts
│   │   └── detection-patterns.test.ts
│   ├── selectors/                 # CSS selector validation
│   │   ├── css-validity.test.ts
│   │   └── selector-priority.test.ts
│   └── workflows/                 # Workflow structure validation
│       ├── frontmatter-validation.test.ts
│       └── required-sections.test.ts
├── integration/                   # Integration tests (browser, read-only)
│   ├── navigation/
│   │   ├── home-page.test.ts
│   │   ├── workspace-navigation.test.ts
│   │   └── sidebar-traversal.test.ts
│   └── selectors/
│       └── element-resolution.test.ts
├── uat/                           # User Acceptance Tests (browser, creates resources)
│   ├── load-balancing/
│   │   ├── http-lb-create-basic.uat.ts
│   │   └── origin-pool-create-basic.uat.ts
│   ├── security/
│   │   └── waf-policy-create-basic.uat.ts
│   ├── dns/
│   ├── cloud-sites/
│   └── administration/
├── helpers/                       # Test utilities
│   ├── cleanup-manager.ts         # Idempotent resource cleanup
│   ├── selector-validator.ts      # CSS selector validation
│   ├── global-setup.ts            # Playwright global setup
│   └── global-teardown.ts         # Playwright global teardown
├── fixtures/                      # Test data
│   └── console-responses.json
├── config/
│   ├── jest.config.ts             # Jest configuration
│   └── playwright.config.ts       # Playwright configuration
└── README.md
```

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

3. Set environment variables (optional):
   ```bash
   export F5XC_CONSOLE_URL="https://your-tenant.console.ves.volterra.io"
   export F5XC_TEST_NAMESPACE="validation-test"
   ```

### Test Commands

```bash
# Run all unit tests (fast, no browser)
npm run test:unit

# Run integration tests (browser, read-only)
npm run test:integration

# Run UAT tests (browser, creates resources)
npm run test:uat

# Run smoke tests (critical path only)
npm run test:smoke

# Run security-focused tests
npm run test:security

# Run nightly test suite
npm run test:nightly

# Run full regression suite
npm run test:all
```

## Test Prioritization

### P1 - Critical Path (Every Commit)
- **Duration**: ~5 minutes
- **Scope**: Unit tests + smoke integration
- **Command**: `npm run test:smoke`

### P2 - Security (On Security Changes)
- **Duration**: ~45 minutes
- **Scope**: WAF, Service Policy, Rate Limiting tests
- **Command**: `npm run test:security`

### P3 - Extended (Nightly)
- **Duration**: ~2 hours
- **Scope**: All integration + Load Balancing UAT
- **Command**: `npm run test:nightly`

### P4 - Full Regression (Weekly)
- **Duration**: ~4-6 hours
- **Scope**: Complete test suite
- **Command**: `npm run test:all`

## Idempotency

All tests are designed to be idempotent (can be run repeatedly without side effects):

1. **Test Resource Naming**: Resources created by tests use the pattern `test-auto-{workflow}-{timestamp}`
2. **Cleanup Manager**: Tracks and deletes all created resources in reverse order
3. **No State Leakage**: Test namespace should be empty after completion

### CleanupManager Usage

```typescript
import { CleanupManager, getGlobalCleanupManager } from '../helpers/cleanup-manager';

const cleanup = getGlobalCleanupManager();

// Register a resource for cleanup
cleanup.register('origin_pool', 'test-auto-pool-123456', 'test-namespace');

// Resources are automatically cleaned up in afterAll via global teardown
```

## Pass/Fail Criteria

### Unit Tests
- JSON parses without errors
- CSS selectors compile without syntax errors
- All required workflow sections present
- URL patterns match expected routes

### Integration Tests
- Pages load within 10 seconds
- At least one selector in priority chain finds element
- Page titles match expected values
- No 404 or Access Denied responses

### UAT Tests
- All workflow steps complete successfully
- Resource appears in console list
- CLI validation (`xcsh`) confirms creation
- Cleanup successfully removes resource

## Writing New Tests

### Unit Test Template

```typescript
// tests/unit/example/my-test.test.ts
import * as fs from 'fs';
import * as path from 'path';

describe('My Test', () => {
  test('should validate something', () => {
    expect(true).toBe(true);
  });
});
```

### Integration Test Template

```typescript
// tests/integration/example/my-test.test.ts
import { test, expect } from '@playwright/test';

test.describe('My Integration Test', () => {
  test('should navigate somewhere', async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveURL(/example/);
  });
});
```

### UAT Test Template

```typescript
// tests/uat/example/my-workflow.uat.ts
import { test, expect } from '@playwright/test';
import { CleanupManager, getGlobalCleanupManager } from '../../helpers/cleanup-manager';

test.describe('My Workflow @nightly', () => {
  const cleanup = getGlobalCleanupManager();
  let testResourceName: string;

  test.beforeAll(async () => {
    testResourceName = CleanupManager.generateResourceName('my-workflow');
  });

  test('should create resource', async ({ page }) => {
    // Test implementation
    cleanup.register('resource_type', testResourceName, 'namespace');
  });
});
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `F5XC_CONSOLE_URL` | F5 XC console base URL | `https://f5-amer-ent.console.ves.volterra.io` |
| `F5XC_TEST_NAMESPACE` | Namespace for test resources | `validation-test` |
| `F5XC_AUTH_METHOD` | Authentication method | `sso` |

## Troubleshooting

### Tests Timeout

Increase timeout in `playwright.config.ts`:
```typescript
timeout: 120000, // 2 minutes
```

### Browser Not Installed

Run:
```bash
npx playwright install chromium
```

### Authentication Issues

Integration and UAT tests require an active browser session. Use Chrome DevTools MCP for automation.

## Related Documentation

- [PHASE-3.9-VALIDATION-PLAN.md](./PHASE-3.9-VALIDATION-PLAN.md) - Manual validation plan
- [Workflow Documentation](../skills/xc-console/workflows/) - Individual workflow files
- [Console Navigation Metadata](../skills/xc-console/console-navigation-metadata.json) - Selector configurations
