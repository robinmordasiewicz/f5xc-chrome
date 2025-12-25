---
description: F5 Distributed Cloud console automation via Chrome browser
argument-hint: [action] [url/target]
allowed-tools: mcp__claude-in-chrome__*, Read, Write, Glob, Grep
---

# F5 XC Console Automation Command

Automate F5 Distributed Cloud web console operations using Chrome browser automation.

## Usage

```
/xc:console [action] [arguments]
```

## Actions

### login
Authenticate to F5 XC tenant (supports Azure SSO, Google, Okta, SAML, native login).

```
/xc:console login <tenant-url>
```

**Example:**
```
/xc:console login https://nferreira.staging.volterra.us
```

**Workflow:**
1. Get browser tab context
2. Navigate to tenant URL (detect connection failures → warn about VPN)
3. Identify authentication type based on URL pattern:
   - `login*.volterra.us` → Native login (user enters credentials)
   - `login.microsoftonline.com` → Azure SSO
   - `accounts.google.com` → Google SSO
   - `*.okta.com` → Okta SSO
   - `/saml/`, `/sso/` → Generic SAML
4. Handle authentication:
   - Cached session → auto-complete
   - Credentials needed → inform user, wait for confirmation
5. Verify console home page loaded (workspace cards visible)
6. Take screenshot to confirm

### crawl
Crawl the F5 XC console to extract navigation metadata and element refs.

```
/xc:console crawl <tenant-url>
```

**Example:**
```
/xc:console crawl https://nferreira.staging.volterra.us
```

**Workflow:**
1. Login to tenant (uses login workflow)
2. Navigate to home page, extract workspace cards with refs
3. Enter WAAP workspace, extract sidebar navigation
4. Open HTTP Load Balancer form, extract all form fields
5. Save metadata to `console-navigation-metadata.json`
6. Report crawl summary (pages, forms, refs extracted)

### nav
Navigate to a specific workspace or page.

```
/xc:console nav <target>
```

**Targets:**
- `home` - Console home page
- `waap` - Web App & API Protection workspace
- `mcn` - Multi-Cloud Network Connect
- `mac` - Multi-Cloud App Connect
- `dns` - DNS Management
- `http-lb` - HTTP Load Balancers list
- `origin-pools` - Origin Pools list
- `waf` - App Firewall policies

**Example:**
```
/xc:console nav waap
/xc:console nav http-lb
```

### create
Start creating a resource with guided form filling.

```
/xc:console create <resource-type>
```

**Resource Types:**
- `http-lb` - HTTP Load Balancer
- `origin-pool` - Origin Pool
- `waf` - WAF Policy

**Example:**
```
/xc:console create http-lb
```

**Workflow:**
1. Navigate to resource list page
2. Click Add button
3. Guide user through form fields
4. Stop before submit for user review

### status
Show current browser state and connection status.

```
/xc:console status
```

**Output:**
- Browser connection status
- Current tab URL
- Login state
- Last crawl timestamp

## Prerequisites

1. **Claude in Chrome Extension** - Install from Chrome Web Store
2. **Chrome Connection** - Run `claude --chrome` or enable in settings
3. **F5 XC Tenant Access** - Via SSO (Azure, Google, Okta, SAML) or native login
4. **VPN** (if required) - Some tenants require VPN access

## Skill Reference

This command uses the `xc-console` skill which provides:
- Pre-crawled navigation metadata for deterministic automation
- Multi-provider authentication handling (Azure, Google, Okta, SAML, native)
- VPN requirement detection
- Form field mapping for all major resource types

See `skills/xc-console/SKILL.md` for detailed documentation.

## Examples

```bash
# Login and check status
/xc:console login https://nferreira.staging.volterra.us

# Navigate to HTTP Load Balancers
/xc:console nav http-lb

# Start creating a load balancer
/xc:console create http-lb

# Refresh console metadata
/xc:console crawl https://nferreira.staging.volterra.us
```

## Related Commands

- `/xc:cli` - F5 XC CLI operations (f5xcctl)
- `/xc:tf` - Terraform infrastructure management
- `/xc:docs` - Documentation lookups
- `/xc:api` - Direct API interactions
