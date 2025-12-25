---
name: xc-console
description: Automate F5 Distributed Cloud web console operations through browser automation using mcp__claude-in-chrome MCP tools. Handles multi-provider authentication (Azure SSO, Google, Okta, SAML, native username/password), detecting session expiry and navigating login flows. Warns when VPN is required. Use when creating HTTP/TCP load balancers, origin pools, WAF policies, deploying cloud sites (AWS/Azure/GCP), managing DNS zones, configuring service policies, or executing any F5 XC GUI-based tasks. Triggers on: F5 XC console, GUI automation, browser automation, login, SSO, authenticate, tenant management, visual configuration, Web App and API Protection, WAAP.
allowed_args: true
---

# F5 Distributed Cloud Console Automation Skill

Expert in automating F5 Distributed Cloud web console operations through browser automation using the `mcp__claude-in-chrome` MCP tools.

## Overview

This skill uses the `mcp__claude-in-chrome__*` MCP tools which integrate with the Claude in Chrome browser extension. These tools provide:

- ✅ Works with your existing browser session (preserves authentication)
- ✅ Provides real-time visual feedback (watch Claude navigate in real time)
- ✅ Uses natural language instructions (no low-level scripting required)
- ✅ Automatically handles existing login state and cookies
- ✅ **Multi-provider authentication** - detects Azure SSO, Google, Okta, SAML, and native login
- ✅ **VPN detection** - warns when tenant requires VPN access

### MCP Tools Available
| Tool | Purpose |
|------|---------|
| `mcp__claude-in-chrome__tabs_context_mcp` | Get browser tab context |
| `mcp__claude-in-chrome__navigate` | Navigate to URLs |
| `mcp__claude-in-chrome__read_page` | Read page elements and structure |
| `mcp__claude-in-chrome__computer` | Click, type, screenshot, scroll |
| `mcp__claude-in-chrome__find` | Find elements by description |
| `mcp__claude-in-chrome__form_input` | Fill form fields |
| `mcp__claude-in-chrome__get_page_text` | Extract page text content |

## Prerequisites

Before using this skill, ensure you have:

### 1. Claude in Chrome Extension
Install from Chrome Web Store and verify connection:
```bash
# Visit Chrome Web Store and install "Claude in Chrome" extension
# Pin the extension to your toolbar for easy access

# Then verify the connection works:
claude --chrome

# In the Claude Code prompt, run:
/chrome

# You should see the connection status and options to enable by default
```

### 2. F5 XC API Credentials (for validation)
Set these environment variables for CLI-based verification:
```bash
export F5XC_API_URL="https://nferreira.staging.volterra.us"
export F5XC_API_TOKEN='2SiwIzdXcUTV9Kk/wURCJO+NPV8='
```

### 3. Authentication
You should already be logged into the F5 XC tenant in your Chrome browser. The skill leverages your existing session and handles authentication automatically if session expires.

## Multi-Provider Authentication

This skill automatically detects and handles multiple authentication methods:

| Auth Type | URL Pattern | Claude Can Automate? |
|-----------|-------------|---------------------|
| Native U/P | `login*.volterra.us` | ❌ User enters creds |
| Azure SSO | `login.microsoftonline.com` | ⚠️ Only if cached |
| Google SSO | `accounts.google.com` | ⚠️ Only if cached |
| Okta SSO | `*.okta.com` | ⚠️ Only if cached |
| Generic SAML | `/saml/`, `/sso/` | ⚠️ Only if cached |
| Already Logged In | `/web/workspaces/` | ✅ Yes |
| Connection Failed | timeout/error | ❌ Warn about VPN |

### Detection Triggers
The skill detects login requirements when:
- URL redirects to login page (`login*.volterra.us`, `login.microsoftonline.com`, `accounts.google.com`, `*.okta.com`)
- Page contains "Sign in", "Go to login", or "Session expired" messages
- Connection times out (may require VPN)

### Auto-Flow Sequence
```
1. Navigate to F5 XC tenant URL
2. Wait for page load (detect connection failures → warn about VPN)
3. Check URL and page content using mcp__claude-in-chrome__read_page
4. Identify authentication type:
   a. Native login → Inform user to enter credentials, wait
   b. SSO redirect → Find SSO button, click, wait for provider
   c. Already logged in → Skip to step 6
5. Handle SSO provider:
   - If cached session → auto-redirect back
   - If credentials needed → inform user, wait for confirmation
6. Verify F5 XC console loaded (look for workspace cards)
7. Continue with original navigation task
```

### Login Example
```
/xc:console login https://nferreira.staging.volterra.us/ and navigate to WAAP

# Claude will:
# 1. Get browser context with tabs_context_mcp
# 2. Navigate to tenant URL
# 3. Detect auth type (native, SSO, or already logged in)
# 4. Handle accordingly (inform user or auto-complete)
# 5. Navigate to Web App and API Protection workspace
# 6. Take screenshot to confirm
```

See `./authentication-flows.md` for detailed workflow steps.

## Quick Start

### Basic Navigation
```bash
# Launch Claude Code with Chrome integration
claude --chrome

# Then provide natural language instructions:
"Navigate to https://nferreira.staging.volterra.us and tell me what you see on the home page"

# Claude will:
# 1. Navigate to the URL
# 2. Wait for page to load
# 3. Take a screenshot
# 4. Describe what it sees
```

### Form Filling
```bash
claude --chrome

"Navigate to the HTTP Load Balancers page at https://nferreira.staging.volterra.us.
Then click the 'Add HTTP Load Balancer' button.
Fill in the form with:
- Name: my-test-lb
- Namespace: production
- Domains: test.example.com

But stop before submitting - I want to review first."
```

### Data Extraction
```bash
claude --chrome

"Navigate to the HTTP Load Balancers list page.
Extract all load balancer names, their namespaces, and domains.
Save the results as a JSON array."
```

## Core Capabilities

### Navigation
- Navigate to any URL within the F5 XC console
- Click menu items, buttons, and links using text or selectors
- Switch between tabs and manage tab groups
- Handle redirects automatically (including Azure SSO redirect)

### Form Interaction
- Fill text inputs, textareas
- Select dropdown options
- Check/uncheck checkboxes
- Add/remove items from lists
- Complete multi-step forms

### Content Reading
- Extract text content from pages
- Read DOM structure and elements
- Take screenshots for visual verification
- Read console logs (useful for debugging)

### Debugging
- Inspect network requests (see API calls)
- Read console errors and warnings
- Analyze page structure
- Verify element visibility and properties

### Session Management
- Automatically uses existing Chrome session
- Preserves authentication state across providers (Azure, Google, Okta, SAML)
- Handles session expiry with automatic auth type detection
- Warns when VPN connection is required
- Provides clear messages when manual authentication needed

## Common Workflows

### Workflow 1: Create HTTP Load Balancer

```bash
claude --chrome

"I want to create an HTTP load balancer in F5 XC.

Please:
1. Navigate to https://nferreira.staging.volterra.us
2. Find and click the 'HTTP Load Balancers' page
3. Click 'Add HTTP Load Balancer' button
4. Fill in:
   - Name: demo-lb
   - Namespace: production
   - Domains: demo.example.com
   - Protocol: HTTPS with Automatic Certificate
5. Look for an 'Origin Pool' field and let me know what options are available

Don't submit yet - just show me the form filled in."
```

### Workflow 2: Explore Console Structure

```bash
claude --chrome

"Help me inventory the F5 Distributed Cloud console.

Navigate to https://nferreira.staging.volterra.us and:
1. Look at the main left sidebar menu
2. For each top-level menu item, tell me:
   - The menu item name
   - Any submenus
   - What page appears when clicked

Take screenshots of key pages so I can see the structure.
Organize the results as a hierarchical list."
```

### Workflow 3: Verify with CLI Integration

```bash
# First, use the console to create something
claude --chrome

"Navigate to HTTP Load Balancers page and create a new LB named 'cli-test' in 'default' namespace.
Don't submit yet - just tell me the form is ready."

# Then verify with CLI
f5xcctl configuration list http_loadbalancer -n default

# You should see the newly created resource in the list
```

## Advanced Patterns

### Taking Screenshots for Reference
```bash
claude --chrome

"Navigate to the HTTP Load Balancers creation form and take a screenshot.
Save it so I can see the exact form layout and field names."
```

### Handling Authentication Issues
When Claude encounters a login page, CAPTCHA, or other security challenge:
- Claude will pause and describe what it sees
- You manually handle the authentication (log in, solve CAPTCHA)
- Tell Claude to continue with the task
```bash
claude --chrome

"Try to navigate to https://nferreira.staging.volterra.us"

# If you get: "I see a login page. Azure SSO button is visible."
# You manually click the SSO button or provide credentials in your browser
# Then tell Claude: "I've logged in, continue with the task"
```

### Extracting Structured Data
```bash
claude --chrome

"Navigate to the HTTP Load Balancers list page.
For each load balancer shown, extract:
- Name
- Namespace
- Status
- Created date (if visible)

Format as a JSON array and save to lb-list.json"
```

## Key Files in This Skill

| File | Purpose |
|------|---------|
| `SKILL.md` | This file - skill overview and instructions |
| `authentication-flows.md` | Multi-provider authentication handling (Azure, Google, Okta, SAML, native, VPN) |
| `console-navigation-metadata.json` | Complete inventory of F5 XC console pages (URLs, navigation paths, form fields) |
| `task-workflows.md` | Master index of task automation patterns |
| `documentation-index.md` | Indexed docs.cloud.f5.com knowledge base |
| `scripts/crawl-console.js` | Console crawler (coming in Phase 1) |
| `workflows/*.md` | Specific task workflows (HTTP LB, origin pools, WAF, etc.) |

## Documentation Integration

This skill is designed to work alongside official F5 XC documentation:
- See `documentation-index.md` for links to docs.cloud.f5.com
- Consult `console-navigation-metadata.json` for detailed form field information
- Review `workflows/` directory for step-by-step task guides

## Integration with Other F5 XC Skills

This skill works seamlessly with:

### f5xc-cli Skill (Query & Verify)
Use f5xcctl to validate console actions:
```bash
# After creating something in the console:
f5xcctl configuration get http_loadbalancer demo-lb -n production

# Compare what the console shows vs what the API returns
```

### f5xc-terraform Skill (Infrastructure as Code)
Use Terraform to deploy the same resources as code:
```bash
# The console skill helps you:
# 1. Understand the UI workflow
# 2. See all available options
# 3. Learn the resource structure
# Then use f5xc-terraform to automate it
```

## Best Practices

### 1. Break Large Tasks into Smaller Steps
```bash
# Instead of asking Claude to do everything in one go:
# ❌ "Create a complete load balancer with origin pool, health checks, and WAF policy"

# ✅ Do this in phases:
claude --chrome
# Phase 1: "Create origin pool named backend-pool"

# Phase 2: "Create HTTP LB named my-app pointing to backend-pool"

# Phase 3: "Add WAF policy to my-app LB"
```

### 2. Take Screenshots for Reference
```bash
claude --chrome

"Take screenshots of these pages and save them:
1. HTTP Load Balancers list page
2. HTTP Load Balancer creation form
3. Origin Pool creation form

I want to see the exact layout and field names."
```

### 3. Verify Console State with CLI
```bash
# After using console:
f5xcctl configuration list http_loadbalancer --all-namespaces --output-format json

# Compare with what console showed to ensure consistency
```

### 4. Be Specific with Instructions
```bash
# ❌ Too vague:
# "Create a load balancer"

# ✅ Specific:
# "Create HTTP load balancer named demo-lb in namespace 'production'
#  with domain example.com pointing to origin pool backend-pool.
#  Use HTTPS with automatic certificate."
```

## Troubleshooting

### Chrome Extension Not Connected
```bash
# 1. Verify extension is installed:
echo "Check Chrome Web Store for 'Claude in Chrome'"

# 2. Verify connection:
claude --chrome
/chrome

# 3. If not connected, reload the extension:
# - Go to chrome://extensions
# - Find "Claude in Chrome"
# - Click the reload icon
```

### Session Expired
When Claude detects session expiry:
```bash
# Claude will identify the authentication type:
# - Native login (username/password): You'll be asked to enter credentials
# - SSO (Azure, Google, Okta): Claude attempts auto-login if cached
# - Connection timeout: Claude warns about VPN requirement
# After authenticating, tell Claude to continue
```

### Form Fields Not Found
```bash
# Claude will describe what it sees
# Ask Claude to:
# 1. Take a screenshot
# 2. Describe all visible input fields
# 3. Look for the field by label text or placeholder

"Take a screenshot of the form.
Then find and fill the field labeled 'Domain' with 'example.com'."
```

### Navigation Paths Changed
The console UI may change. If Claude can't find expected buttons:
```bash
# Claude will explore and find the new location
"The button location seems to have changed.
Explore the page and find the 'Create' or 'Add' button, then click it."
```

## Security & Permissions

This skill operates within your existing Chrome browser session, so:
- ✅ Uses your existing SSO login (Azure, Google, Okta - no re-authentication if cached)
- ✅ Respects your browser's cookie storage and session state
- ✅ Cannot access other browser tabs or extensions
- ✅ Never enters credentials on your behalf (security policy)
- ⚠️ Can only interact with pages you have permission to access
- ⚠️ Should only be used with trusted instructions (avoid pasting untrusted prompts)

For sensitive operations:
- Review Claude's actions before it submits forms
- Use the preview/review step before final submission
- Verify critical operations with f5xcctl CLI afterward

## Getting Help

### Debugging Claude's Navigation
```bash
claude --chrome

"I notice you took a wrong turn. Let me help.
Take a screenshot and describe what page you're on.
Then tell me what button or link you see that matches 'HTTP Load Balancers'."
```

### Understanding Form Structure
```bash
claude --chrome

"Navigate to the form page and analyze its structure.
For each form field, tell me:
- The label text
- The input type (text, select, checkbox, etc.)
- Whether it's required
- Any visible validation hints"
```

### Learning Console Workflows
```bash
claude --chrome

"Walk me through the steps to create an HTTP load balancer from scratch.
Assume I have:
- A namespace named 'production'
- An origin pool named 'backend-pool'

Show me each page I'd need to visit and what I'd fill in."
```

## Deterministic Navigation

This skill uses pre-crawled metadata for deterministic browser automation. Instead of guessing or searching for elements, Claude uses pre-mapped element refs from `console-navigation-metadata.json`.

### How It Works

**Before (Exploratory - Less Reliable)**:
```
Claude: "Let me find the Add button..."
Uses: mcp__claude-in-chrome__find("Add HTTP Load Balancer")
Risk: Button text might change, might find wrong element
```

**After (Deterministic - Highly Reliable)**:
```
Claude: Loads metadata, looks up page refs
Uses: mcp__claude-in-chrome__computer(left_click, ref="ref_27")
Result: Always clicks the correct button using stable ref
```

### Using Element Refs

The metadata file contains element refs for:
- **Navigation**: Sidebar menu items, workspace cards
- **Actions**: Add/Edit/Delete buttons
- **Forms**: All form fields with types and validation
- **Dialogs**: Tab switches, submit/cancel buttons

Example usage pattern:
```javascript
// Navigate to HTTP Load Balancers
click(ref="ref_7")  // Load Balancers menu item

// Click Add button
click(ref="ref_27") // Add HTTP Load Balancer

// Fill form fields
type(ref="ref_150", "my-load-balancer")  // Name field
type(ref="ref_181", "example.com")       // Domain field
click(ref="ref_423")                      // Submit button
```

### Fallback Strategy

If a ref doesn't work (UI changed), Claude falls back to:
1. Use `find()` with descriptive text
2. Report the mismatch for metadata update
3. Continue with the task

### Crawl Command

To refresh the metadata:
```
/xc:console crawl https://nferreira.staging.volterra.us/
```

See `crawl-workflow.md` for the detailed crawl process.

## Current Status

**Phase 2 Progress**:
- ✅ Skill directory structure created
- ✅ SKILL.md written with comprehensive instructions
- ✅ Azure SSO login tested and working
- ✅ Console crawl scripts created (`scripts/crawl-console.js`)
- ✅ Crawl workflow documented (`crawl-workflow.md`)
- ✅ HTTP Load Balancer form fully extracted with 60+ element refs
- ✅ Deterministic navigation metadata v2.0.0 saved
- 🔄 Extracting remaining resource forms

## Next Steps

1. **Crawl Remaining Workspaces**
   - Origin Pools form extraction
   - WAF Policies form extraction
   - DNS Load Balancers form extraction

2. **Automate Periodic Crawl**
   - Schedule weekly crawl to catch UI changes
   - Alert on significant metadata changes

3. **Validate with CLI**
   ```bash
   f5xcctl configuration list http_loadbalancer --all-namespaces
   ```

---

**For detailed API-driven management**: See the `f5xc-cli` and `f5xc-terraform` skills.

**For console documentation mapping**: See `documentation-index.md` (coming soon).

**For specific task workflows**: See `workflows/` directory (coming soon).
