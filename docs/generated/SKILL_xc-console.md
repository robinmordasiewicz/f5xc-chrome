---
# ============================================================================
# SKILL DOCUMENTATION TEMPLATE
# ============================================================================
# This template provides a standardized format for skill documentation.
# Variables in {{ brackets }} are auto-populated from SKILL.md frontmatter
# and associated metadata files.
#
# MkDocs Material Compatible Features:
# - Admonitions with custom titles
# - Tabbed content blocks
# - Collapsible details
# - Data tables
# - Task lists
# - Icons and emojis
# ============================================================================
name: xc-console
description: Automate F5 Distributed Cloud web console operations through browser automation using mcp__chrome-devtools MCP tools. Handles multi-provider authentication (Azure SSO, Google, Okta, SAML, native username/password), detecting session expiry and navigating login flows. Warns when VPN is required. Use when creating HTTP/TCP load balancers, origin pools, WAF policies, deploying cloud sites (AWS/Azure/GCP), managing DNS zones, configuring service policies, or executing any F5 XC GUI-based tasks. Triggers on: F5 XC console, GUI automation, browser automation, login, SSO, authenticate, tenant management, visual configuration, Web App and API Protection, WAAP.
allowed_args: true
---

<div align="center">

# :material-robot: xc-console

[![Skill Version](https://img.shields.io/badge/skill-v1.0.0-blue?style=flat-square)]()
[![Metadata](https://img.shields.io/badge/metadata-v2.2.0-green?style=flat-square)]()
[![Status](https://img.shields.io/badge/status-active-brightgreen?style=flat-square)]()

**Automate F5 Distributed Cloud web console operations through browser automation using mcp__chrome-devtools MCP tools. Handles multi-provider authentication (Azure SSO, Google, Okta, SAML, native username/password), detecting session expiry and navigating login flows. Warns when VPN is required. Use when creating HTTP/TCP load balancers, origin pools, WAF policies, deploying cloud sites (AWS/Azure/GCP), managing DNS zones, configuring service policies, or executing any F5 XC GUI-based tasks. Triggers on: F5 XC console, GUI automation, browser automation, login, SSO, authenticate, tenant management, visual configuration, Web App and API Protection, WAAP.**

</div>

---

## :material-information: Overview

<!--
Concise overview of what this skill does and when Claude should use it.
Remember: Claude is smart - only include non-obvious procedural knowledge.
-->

Automate F5 Distributed Cloud web console operations through browser automation using mcp__chrome-devtools MCP tools. Handles multi-provider authentication (Azure SSO, Google, Okta, SAML, native username/password), detecting session expiry and navigating login flows. Warns when VPN is required. Use when creating HTTP/TCP load balancers, origin pools, WAF policies, deploying cloud sites (AWS/Azure/GCP), managing DNS zones, configuring service policies, or executing any F5 XC GUI-based tasks. Triggers on: F5 XC console, GUI automation, browser automation, login, SSO, authenticate, tenant management, visual configuration, Web App and API Protection, WAAP.

!!! abstract "Trigger Keywords"
    {{ skill.triggers | join(", ") }}

## :material-check-all: Prerequisites

Before using this skill, ensure:

- [x] Required tool/extension is installed
- [x] Authentication is configured
- [x] Environment variables are set

=== "Environment Setup"

    ```bash
    export REQUIRED_VAR="your-value"
    export OPTIONAL_VAR="default"
    ```

=== "Tool Verification"

    ```bash
    # Verify tool is available
    which required-tool
    ```

## :material-tools: MCP Tools Used

This skill leverages the following MCP tools:

| Tool | Purpose | Required |
|:-----|:--------|:--------:|
| `mcp__chrome-devtools` | Primary interaction | :white_check_mark: |
| `mcp__chrome-devtools__*` | Secondary function | :white_check_mark: |
| `mcp__chrome-devtools__tabs_context_mcp` | Optional enhancement | :x: |

??? info "Tool Reference"
    ```
    mcp__chrome-devtools      - Description of what it does
    mcp__chrome-devtools__*      - Description of what it does
    mcp__chrome-devtools__tabs_context_mcp      - Description of what it does
    ```

## :material-navigation: Navigation Metadata

This skill includes pre-crawled navigation metadata for deterministic automation.

### Selector Priority Chain

!!! tip "Cross-Session Reliability"
    Selectors are prioritized for stability across browser sessions:

    ```
    1. data_testid  →  Most stable (95%+ success)
    2. aria_label   →  Very stable (90%+ success)
    3. text_match   →  Stable (85%+ success)
    4. css          →  Moderate (70%+ success)
    5. ref          →  Session-specific (fallback only)
    ```

### URL Sitemap

??? abstract "Static Routes"
    | Route | Description | Page Type |
    |:------|:------------|:----------|
    | `/path/one` | Description | `workspace` |
    | `/path/two` | Description | `list` |
    | `/path/three` | Description | `form` |

??? abstract "Dynamic Routes"
    | Pattern | Variables | Example |
    |:--------|:----------|:--------|
    | `/path/{var1}/{var2}` | `var1`, `var2` | `/path/value1/value2` |

### Element Selectors

??? example "Sample Element with Selectors"
    ```json
    {
      "element_name": {
        "ref": "ref_123",
        "selectors": {
          "data_testid": "element-test-id",
          "aria_label": "Element Label",
          "text_match": "Element Text",
          "css": ".element-class"
        }
      }
    }
    ```

## :material-play-circle: Workflows

### Workflow 1: Primary Workflow

Main automation workflow

```mermaid
graph LR
    A[Start] --> B[Step 1]
    B --> C[Step 2]
    C --> D[Step 3]
    D --> E[Complete]
```

=== "Step 1"

    ```bash
    # First step
    action_1
    ```

=== "Step 2"

    ```bash
    # Second step
    action_2
    ```

=== "Step 3"

    ```bash
    # Third step
    action_3
    ```

### Workflow 2: Secondary Workflow

??? example "Detailed Steps"
    1. **Initialize** - Set up the environment
    2. **Configure** - Apply settings
    3. **Execute** - Run the main action
    4. **Validate** - Verify results
    5. **Cleanup** - Remove temporary resources

## :material-folder-open: Bundled Resources

```
xc-console/
├── SKILL.md                           # This file - main instructions
├── console-navigation-metadata.json   # Pre-crawled element selectors
├── url-sitemap.json                   # Complete URL mapping
├── authentication-flows.md            # Auth provider handling
├── scripts/
│   └── automation-script.js           # Reusable automation code
├── references/
│   └── api-reference.md               # API documentation
└── workflows/
    ├── workflow-1.md                  # Step-by-step workflow
    └── workflow-2.md                  # Additional workflow
```

### Scripts

| Script | Purpose | Usage |
|:-------|:--------|:------|
| `scripts/script-1.js` | Description | When to use |
| `scripts/script-2.py` | Description | When to use |

### References

| Reference | Content | Load When |
|:----------|:--------|:----------|
| `references/ref-1.md` | Description | Condition |
| `references/ref-2.md` | Description | Condition |

## :material-lightning-bolt: Quick Reference

### Common Actions

| Action | Command/Method | Notes |
|:-------|:---------------|:------|
| Action 1 | `method_1()` | Quick note |
| Action 2 | `method_2()` | Quick note |
| Action 3 | `method_3()` | Quick note |

### Status Indicators

| Status | Meaning | Action |
|:------:|:--------|:-------|
| :white_check_mark: | Success | Continue |
| :warning: | Warning | Review |
| :x: | Error | Investigate |
| :hourglass: | Pending | Wait |

## :material-bug: Troubleshooting

??? danger "Error: Connection Timeout"
    **Cause:** Network or VPN issue

    **Solution:**
    1. Check network connectivity
    2. Verify VPN connection if required
    3. Retry with increased timeout

??? warning "Error: Element Not Found"
    **Cause:** Selector mismatch or page change

    **Solution:**
    1. Check if page structure changed
    2. Fall back to text_match selector
    3. Re-crawl if persistent

??? note "Performance: Slow Execution"
    **Cause:** Using session-specific refs

    **Solution:**
    1. Prefer stable selectors (data_testid)
    2. Use cached metadata when available
    3. Batch operations where possible

## :material-chart-line: Metadata Statistics

??? info "Current Metadata Version"
    | Field | Value |
    |:------|:------|
    | **Version** | 2.2.0 |
    | **Last Crawled** | 2025-12-24T21:35:00Z |
    | **Tenant** | nferreira.staging.volterra.us |
    | **Static Routes** | 23 |
    | **Dynamic Routes** | 9 |
    | **Elements Mapped** | 91 |

## :material-link-variant: Related Resources

- [:material-github: Plugin Repository](https://github.com/robinmordasiewicz/f5xc-console)
- [:material-book-open-variant: Full Documentation]({{ plugin.docs_url }})
- [:material-bug: Report Issue](https://github.com/robinmordasiewicz/f5xc-console/issues)
- [:material-lightbulb: Request Feature](https://github.com/robinmordasiewicz/f5xc-console/issues/new)

---

<div align="center">

**Skill Version:** 1.0.0 | **Metadata Version:** 2.2.0 | **Last Updated:** 2025-12-24T21:35:00Z

</div>
