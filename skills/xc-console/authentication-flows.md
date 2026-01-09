# Authentication Flows for F5 Distributed Cloud

This document describes multi-provider authentication handling using `mcp__chrome-devtools` MCP tools.

## Overview

F5 XC tenants can be configured with different authentication methods. This skill automatically detects the auth type and handles it appropriately.

## Authentication Type Detection Matrix

| Auth Type | URL Pattern | Page Indicators | Claude Can Automate? |
|-----------|-------------|-----------------|---------------------|
| Native U/P | `login*.volterra.us` | Email + Password fields | ❌ User enters creds |
| Azure SSO | `login.microsoftonline.com` | Microsoft branding | ⚠️ Only if cached |
| Google SSO | `accounts.google.com` | Google branding | ⚠️ Only if cached |
| Okta SSO | `*.okta.com`, `*.oktapreview.com` | Okta branding | ⚠️ Only if cached |
| Generic SAML | `/saml/`, `/sso/`, `/auth/` | "Enterprise login" | ⚠️ Only if cached |
| Already Logged In | `/web/workspaces/` | Workspace cards | ✅ Yes |
| Connection Failed | timeout/error | No page loaded | ❌ Warn about VPN |

## Detection Phase

### Step 1: Attempt Navigation with Timeout

Navigate to tenant URL and detect connection issues:

```
Tool: mcp__chrome-devtools__navigate
Parameters:
  tabId: [current tab ID]
  url: [tenant URL]

# Wait up to 15 seconds for page load
Tool: mcp__chrome-devtools__computer
Parameters:
  action: "wait"
  tabId: [tab ID]
  duration: 5

# If page doesn't load, warn user about VPN
```

**Connection Failure Response:**
```
"Connection to [tenant URL] failed or timed out.
This tenant may require VPN access. Please:
1. Connect to your corporate VPN
2. Tell me to retry

I'll wait for your confirmation."
```

### Step 2: Check Current URL and Page Content

After navigation, check for login indicators:

```
Tool: mcp__chrome-devtools__read_page
Parameters:
  tabId: [current tab ID]
  filter: "interactive"
```

**Check URL patterns to identify auth type.**

### Step 3: Identify Login Type

**Native F5 XC Login (Username/Password):**
- URL: `login-staging.volterra.us` OR `login.volterra.us`
- Page: Email field + Password field + "Sign In" button
- Action: STOP and inform user to enter credentials

**Azure SSO:**
- URL: `login.microsoftonline.com`
- Page: Microsoft logo, "Pick an account" or "Enter password"
- Action: If cached session → auto-click. Else → inform user

**Google SSO:**
- URL: `accounts.google.com`
- Page: Google logo, "Choose an account" or "Enter password"
- Action: If cached session → auto-click. Else → inform user

**Okta SSO:**
- URL: `*.okta.com` OR `*.oktapreview.com`
- Page: Okta branding, username/password fields
- Action: If cached session → auto-click. Else → inform user

**Generic SAML/SSO:**
- URL: Contains `/saml/`, `/sso/`, `/auth/`
- Page: "Enterprise login", "Company login", custom IdP form
- Action: Inform user of detected provider type → wait for confirmation

**Already Authenticated:**
- URL: Contains `/web/workspaces/`
- Page: Workspace cards, navigation sidebar
- Action: No login needed → proceed with task

## Authentication Flow by Type

### Native Username/Password (F5 XC Direct Login)

When native login is detected (URL: `login*.volterra.us`):

```
STOP and inform user:

"I've detected a native F5 XC login page requiring credentials.
Please enter your username and password, then tell me when you're logged in.

I cannot enter credentials for you due to security policies."
```

**Wait for user confirmation before continuing.**

### SSO Authentication (Azure, Google, Okta, SAML)

#### Step 4: Find and Click SSO Button

For F5 XC login page with SSO option:

```
Tool: mcp__chrome-devtools__find
Parameters:
  tabId: [tab ID]
  query: "Sign in with SSO OR Enterprise login OR SSO button"
```

Then click the SSO button:

```
Tool: mcp__chrome-devtools__computer
Parameters:
  action: "left_click"
  tabId: [tab ID]
  ref: [element ref from find]
```

#### Step 5: Handle "Go to login" Dialog

If session expired dialog appears:

```
Tool: mcp__chrome-devtools__find
Parameters:
  tabId: [tab ID]
  query: "Go to login button"

Tool: mcp__chrome-devtools__computer
Parameters:
  action: "left_click"
  tabId: [tab ID]
  ref: [button ref]
```

### SSO Provider Handling

After redirect to SSO provider, identify which one:

```
Tool: mcp__chrome-devtools__computer
Parameters:
  action: "wait"
  tabId: [tab ID]
  duration: 3

Tool: mcp__chrome-devtools__computer
Parameters:
  action: "screenshot"
  tabId: [tab ID]
```

#### Azure AD (Microsoft)
- **URL**: `login.microsoftonline.com`
- **Indicators**: Microsoft logo, "Pick an account", "Sign in"
- **Cached Session**: Look for account tiles, click appropriate one
- **Fresh Login**: Inform user to enter credentials

#### Google Workspace
- **URL**: `accounts.google.com`
- **Indicators**: Google logo, "Choose an account"
- **Cached Session**: Look for account list, click appropriate one
- **Fresh Login**: Inform user to enter credentials

#### Okta
- **URL**: `*.okta.com` or `*.oktapreview.com`
- **Indicators**: Okta branding, organization name
- **Cached Session**: May auto-redirect
- **Fresh Login**: Inform user to enter credentials

#### Generic SAML/SSO
- **URL**: Contains `/saml/`, `/sso/`, `/auth/`
- **Indicators**: Corporate branding, "Enterprise login"
- **Action**: Always inform user about detected provider

### Handling SSO States

**Possible States After Redirect:**

1. **Auto-authenticated** (cached session):
   - Page automatically redirects back to F5 XC
   - No action needed, proceed to verification

2. **Account Selection** (multiple accounts cached):
   ```
   Tool: mcp__chrome-devtools__read_page
   Parameters:
     tabId: [tab ID]

   # Look for account tiles, then click the desired one
   Tool: mcp__chrome-devtools__find
   Parameters:
     tabId: [tab ID]
     query: "user account tile OR email address"
   ```

3. **Credentials Required** (no cached session):
   ```
   Inform user:
   "Your [Provider Name] session requires authentication.
   Please enter your credentials in the browser and complete any MFA prompts.
   Tell me when you're logged in."
   ```

4. **MFA Required**:
   ```
   Inform user:
   "Multi-factor authentication required.
   Please complete the MFA prompt in your browser.
   Tell me when you're done."
   ```

## Post-Authentication Phase

### Step 8: Wait for F5 XC Console

After authentication completes:

```
Tool: mcp__chrome-devtools__computer
Parameters:
  action: "wait"
  tabId: [tab ID]
  duration: 5
```

### Step 9: Verify Successful Login

```
Tool: mcp__chrome-devtools__read_page
Parameters:
  tabId: [tab ID]
```

**Success Indicators:**
- URL contains the tenant domain (e.g., `nferreira.staging.volterra.us`)
- URL does NOT contain `login`
- Page contains workspace cards or navigation menu
- Page has "Home" or tenant name in header

**Failure Indicators:**
- Still on login page
- Error message visible
- Session expired message reappears

### Step 10: Take Confirmation Screenshot

```
Tool: mcp__chrome-devtools__computer
Parameters:
  action: "screenshot"
  tabId: [tab ID]
```

## Navigation to Target

### Step 11: Navigate to Requested Workspace

For "Web App and API Protection":

```
Tool: mcp__chrome-devtools__find
Parameters:
  tabId: [tab ID]
  query: "Web App & API Protection card OR WAAP workspace"

Tool: mcp__chrome-devtools__computer
Parameters:
  action: "left_click"
  tabId: [tab ID]
  ref: [workspace card ref]
```

Or navigate directly:

```
Tool: mcp__chrome-devtools__navigate
Parameters:
  tabId: [tab ID]
  url: "https://[tenant].volterra.us/web/workspaces/web-app-and-api-protection"
```

## Error Handling

### VPN Connection Required

If navigation times out or connection fails:
```
Claude response:
"Connection to [tenant URL] failed or timed out.

This tenant may require VPN access. Please:
1. Connect to your corporate VPN
2. Tell me to retry

I'll wait for your confirmation."
```

### Session Timeout During Navigation

If session expires mid-task:
1. Detect redirect to login page
2. Identify authentication type (native vs SSO)
3. Handle accordingly (see Authentication Flow by Type)
4. Resume original task after authentication

### Authentication Failure

If authentication fails:
1. Take screenshot of error
2. Report error to user with detected auth type
3. Suggest appropriate next steps
4. Wait for user confirmation before retrying

### Manual Intervention Required

**For Native Username/Password:**
```
Claude response:
"I've detected a native F5 XC login page. Please:
1. Enter your email and password
2. Click Sign In
3. Tell me when you're logged in

I cannot enter credentials for security reasons."
```

**For SSO Providers (Azure/Google/Okta/SAML):**
```
Claude response:
"I've detected [Provider Name] authentication. Please:
1. Enter your credentials in the browser
2. Complete any MFA prompts
3. Tell me when you're logged in

I'll wait for your confirmation before continuing."
```

## Complete Flow Example

```
User: /xc:console login to https://nferreira.staging.volterra.us/ and navigate to WAAP

Claude actions:
1. tabs_context_mcp → Get available tabs
2. tabs_create_mcp → Create new tab (if needed)
3. navigate → Go to tenant URL
4. wait(5) → Let page load (detect connection failures)

5. [If connection fails/times out]:
   → Inform user: "VPN may be required"
   → Wait for user confirmation to retry

6. read_page → Check current URL and page content
7. Identify authentication type based on URL:

   [If Native Login (login*.volterra.us)]:
   → Inform user: "Please enter credentials"
   → Wait for user confirmation

   [If Already Logged In (/web/workspaces/)]:
   → Skip authentication, proceed to step 11

   [If SSO Redirect Detected]:
   a. find("Go to login" OR "SSO button") → Find login trigger
   b. computer(left_click) → Click it
   c. wait(3) → Wait for SSO redirect
   d. screenshot → Identify SSO provider
   e. read_page → Check authentication state

   [If cached session]: Auto-redirect back to F5 XC
   [If account selection]: Click appropriate account
   [If credentials needed]: Inform user, wait for confirmation

8. wait(5) → Wait for console to load
9. read_page → Verify logged in (URL contains tenant, no login pages)
10. computer(screenshot) → Confirm login state

11. Navigate to target workspace:
    find("Web App & API Protection") → Find workspace card
    computer(left_click) → Click workspace card
    OR navigate directly to /web/workspaces/web-app-and-api-protection

12. wait(3) → Let workspace load
13. computer(screenshot) → Capture final state
14. Report success to user
```

## Workspace Navigation Reference

| Workspace | URL Path | Card Text |
|-----------|----------|-----------|
| Web App & API Protection | `/web/workspaces/web-app-and-api-protection` | "Web App & API Protection" |
| Multi-Cloud Network Connect | `/web/workspaces/multi-cloud-network-connect` | "Multi-Cloud Network Connect" |
| DNS Management | `/web/workspaces/dns-management` | "DNS Management" |
| CDN | `/web/workspaces/cdn` | "CDN" |
| Distributed Apps | `/web/workspaces/distributed-apps` | "Distributed Apps" |
| Administration | `/web/workspaces/administration` | "Administration" |
