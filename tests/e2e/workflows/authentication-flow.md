# E2E Test: Authentication Flow

**Tags**: @e2e @smoke @auth @login
**Duration**: ~3 minutes
**Prerequisites**: Valid F5 XC console credentials

## Test Overview

This test validates the authentication flow to F5 XC console:
1. Navigate to console URL
2. Detect authentication state
3. Handle login if required (Native, SSO, or existing session)
4. Verify authenticated state
5. Navigate to verify access permissions

## Environment Variables

```
F5XC_CONSOLE_URL: https://f5-amer-ent.console.ves.volterra.io (default)
F5XC_AUTH_METHOD: sso | native | session (default: session)
F5XC_USERNAME: (for native auth)
F5XC_PASSWORD: (for native auth)
```

---

## PHASE 1: DETECT AUTHENTICATION STATE

### Step 1.1: Navigate to Console

```
mcp__chrome-devtools__navigate_page({
  url: "{F5XC_CONSOLE_URL}"
})
```

### Step 1.2: Take Snapshot and Analyze

```
mcp__chrome-devtools__take_snapshot()
```

### Step 1.3: Detect Current State

Execute detection script:

```
mcp__chrome-devtools__evaluate_script({
  function: "() => {
    const url = window.location.href;
    const pageContent = document.body.innerText;

    // Check for authenticated state indicators
    const authIndicators = {
      isLoginPage: url.includes('/login') ||
                   url.includes('/auth') ||
                   pageContent.includes('Sign In') ||
                   pageContent.includes('Log In'),

      isSSOPage: url.includes('microsoftonline.com') ||
                 url.includes('okta.com') ||
                 url.includes('accounts.google.com') ||
                 url.includes('login.microsoftonline.com'),

      isAuthenticated: url.includes('/web/home') ||
                       url.includes('/web/workspaces') ||
                       pageContent.includes('Overview') ||
                       document.querySelector('[data-testid*=\"workspace\"]') !== null,

      hasAccessDenied: pageContent.includes('Access Denied') ||
                       pageContent.includes('Unauthorized'),

      currentUrl: url
    };

    // Determine authentication state
    if (authIndicators.isAuthenticated && !authIndicators.hasAccessDenied) {
      return { state: 'authenticated', ...authIndicators };
    } else if (authIndicators.isSSOPage) {
      return { state: 'sso_required', ...authIndicators };
    } else if (authIndicators.isLoginPage) {
      return { state: 'login_required', ...authIndicators };
    } else if (authIndicators.hasAccessDenied) {
      return { state: 'access_denied', ...authIndicators };
    }

    return { state: 'unknown', ...authIndicators };
  }"
})
```

**Expected States**:
- `authenticated` → Proceed to Phase 3 (Verify Access)
- `login_required` → Proceed to Phase 2 (Login Flow)
- `sso_required` → Proceed to Phase 2.B (SSO Flow)
- `access_denied` → Test fails - credentials issue
- `unknown` → Take screenshot, manual investigation needed

---

## PHASE 2: HANDLE LOGIN (If Required)

### Phase 2.A: Native Username/Password Login

#### Step 2.A.1: Detect Login Form

```
mcp__chrome-devtools__take_snapshot()
```

Look for username and password input fields.

#### Step 2.A.2: Fill Username

```
mcp__chrome-devtools__fill({
  element: "Username or email input field",
  ref: "{username_input_ref}",
  value: "{F5XC_USERNAME}"
})
```

#### Step 2.A.3: Fill Password

```
mcp__chrome-devtools__fill({
  element: "Password input field",
  ref: "{password_input_ref}",
  value: "{F5XC_PASSWORD}"
})
```

#### Step 2.A.4: Submit Login

```
mcp__chrome-devtools__click({
  element: "Sign In or Login button",
  ref: "{login_button_ref}"
})
```

#### Step 2.A.5: Wait for Redirect

```
mcp__chrome-devtools__take_snapshot()
```

**Verify**: URL changes to `/web/home` or authenticated area.

---

### Phase 2.B: SSO Login Flow

#### Step 2.B.1: Detect SSO Provider

```
mcp__chrome-devtools__evaluate_script({
  function: "() => {
    const url = window.location.href;
    if (url.includes('microsoftonline.com') || url.includes('login.microsoft')) {
      return { provider: 'azure', url };
    } else if (url.includes('okta.com')) {
      return { provider: 'okta', url };
    } else if (url.includes('accounts.google.com')) {
      return { provider: 'google', url };
    }
    return { provider: 'unknown', url };
  }"
})
```

#### Step 2.B.2: Azure SSO Flow

If Azure detected:

```
mcp__chrome-devtools__take_snapshot()
```

Look for email input and fill:
```
mcp__chrome-devtools__fill({
  element: "Email input field",
  ref: "{email_input_ref}",
  value: "{F5XC_USERNAME}"
})
mcp__chrome-devtools__click({
  element: "Next button",
  ref: "{next_button_ref}"
})
```

Wait and fill password:
```
mcp__chrome-devtools__take_snapshot()
mcp__chrome-devtools__fill({
  element: "Password input field",
  ref: "{password_input_ref}",
  value: "{F5XC_PASSWORD}"
})
mcp__chrome-devtools__click({
  element: "Sign In button",
  ref: "{signin_button_ref}"
})
```

#### Step 2.B.3: Handle "Stay Signed In" Prompt

```
mcp__chrome-devtools__take_snapshot()
```

If "Stay signed in?" prompt appears:
```
mcp__chrome-devtools__click({
  element: "Yes button (stay signed in)",
  ref: "{yes_button_ref}"
})
```

#### Step 2.B.4: Wait for SSO Redirect

```
mcp__chrome-devtools__take_snapshot()
```

**Verify**: URL returns to F5 XC console.

---

### Phase 2.C: Existing Session (No Action Required)

If already authenticated, skip to Phase 3.

---

## PHASE 3: VERIFY AUTHENTICATED STATE

### Step 3.1: Navigate to Home

```
mcp__chrome-devtools__navigate_page({
  url: "{F5XC_CONSOLE_URL}/web/home"
})
```

### Step 3.2: Verify Home Page Access

```
mcp__chrome-devtools__take_snapshot()
```

### Step 3.3: Execute Verification Script

```
mcp__chrome-devtools__evaluate_script({
  function: "() => {
    const url = window.location.href;
    const hasWorkspaces = document.querySelector('[data-testid*=\"workspace\"]') !== null ||
                          document.body.innerText.includes('Web App & API Protection') ||
                          document.body.innerText.includes('Multi-Cloud');

    const hasNavigation = document.querySelector('nav') !== null ||
                          document.querySelector('[role=\"navigation\"]') !== null;

    const hasAccessDenied = document.body.innerText.includes('Access Denied');

    return {
      authenticated: hasWorkspaces && !hasAccessDenied,
      hasWorkspaces,
      hasNavigation,
      hasAccessDenied,
      currentUrl: url
    };
  }"
})
```

**Expected**:
```json
{
  "authenticated": true,
  "hasWorkspaces": true,
  "hasNavigation": true,
  "hasAccessDenied": false
}
```

---

## PHASE 4: VERIFY ACCESS PERMISSIONS

### Step 4.1: Navigate to WAAP Workspace

```
mcp__chrome-devtools__navigate_page({
  url: "{F5XC_CONSOLE_URL}/web/workspaces/web-app-and-api-protection"
})
```

### Step 4.2: Verify Access

```
mcp__chrome-devtools__take_snapshot()
```

### Step 4.3: Execute Permission Check

```
mcp__chrome-devtools__evaluate_script({
  function: "() => {
    const hasAccessDenied = document.body.innerText.includes('Access Denied') ||
                            document.body.innerText.includes('Unauthorized');

    const hasManageSection = document.body.innerText.includes('Manage') ||
                             document.body.innerText.includes('Load Balancers');

    const canSeeAddButtons = document.querySelectorAll('button:contains(\"Add\"), a:contains(\"Add\")').length > 0;

    return {
      hasAccess: !hasAccessDenied && hasManageSection,
      hasAccessDenied,
      hasManageSection,
      workspaceUrl: window.location.href
    };
  }"
})
```

**Expected**:
```json
{
  "hasAccess": true,
  "hasAccessDenied": false,
  "hasManageSection": true
}
```

---

## Test Result Validation

### Success Criteria

| Phase | Criterion | Status |
|-------|-----------|--------|
| Detect | Authentication state identified | ✅ |
| Login | (If required) Successfully authenticated | ✅ |
| Verify | Home page accessible | ✅ |
| Access | WAAP workspace accessible | ✅ |

### Failure Scenarios

1. **Access Denied**: Credentials or permissions issue
2. **SSO Timeout**: MFA required or SSO session expired
3. **Network Error**: Console unreachable
4. **Unknown State**: Unexpected page content

---

## Session State Detection Script

Use this script to check session state at any time:

```
mcp__chrome-devtools__evaluate_script({
  function: "() => {
    return {
      url: window.location.href,
      title: document.title,
      isAuthenticated: !window.location.href.includes('/login') &&
                       !window.location.href.includes('/auth'),
      hasF5XCContent: document.body.innerText.includes('F5') ||
                      document.body.innerText.includes('Distributed Cloud'),
      timestamp: new Date().toISOString()
    };
  }"
})
```
