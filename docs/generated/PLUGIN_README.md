---
# ============================================================================
# PLUGIN DOCUMENTATION TEMPLATE
# ============================================================================
# This template provides a standardized format for plugin documentation.
# Variables in {{ brackets }} are auto-populated from plugin.json metadata.
#
# MkDocs Material Compatible Features:
# - Admonitions (note, tip, warning, danger)
# - Content tabs
# - Collapsible sections
# - Tables with sorting
# - Badge shields
# - Icons and emojis
# ============================================================================
---

<div align="center">

# xc

[![Version](https://img.shields.io/badge/version-0.5.1-blue?style=for-the-badge)](https://github.com/robinmordasiewicz/f5xc-console/releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Plugin-purple?style=for-the-badge)](https://claude.com/claude-code)

**Chrome browser automation for F5 Distributed Cloud console - navigate, crawl, and automate XC GUI operations**

[Installation](#installation) | [Commands](#commands) | [Skills](#skills) | [Examples](#examples) | [Troubleshooting](#troubleshooting)

</div>

---

## Overview

<!--
Brief 2-3 sentence overview of what the plugin does and its primary use case.
Focus on the value it provides to users.
-->

Chrome browser automation for F5 Distributed Cloud console - navigate, crawl, and automate XC GUI operations

!!! tip "Quick Start"
    ```bash
    /plugin install xc
    /xc:console --help
    ```

## Features

<!-- List key features with icons for visual appeal -->

| Feature | Description | Status |
|:--------|:------------|:------:|
| :material-check-circle: **Feature 1** | Description of feature | :white_check_mark: |
| :material-check-circle: **Feature 2** | Description of feature | :white_check_mark: |
| :material-clock-outline: **Feature 3** | Description of planned feature | :construction: |

## Prerequisites

!!! warning "Requirements"
    Before using this plugin, ensure you have:

- [ ] **Claude Code** - [Install Claude Code](https://claude.com/claude-code)
- [ ] **Required Extension** - Any browser extensions or tools needed
- [ ] **API Access** - Required credentials or API tokens

### Environment Variables

```bash
# Required
export REQUIRED_VAR="your-value-here"

# Optional
export OPTIONAL_VAR="default-value"
```

## Installation

=== "From Marketplace"

    ```bash
    # Add the marketplace (one time)
    /plugin marketplace add robinmordasiewicz/f5-distributed-cloud-marketplace

    # Install the plugin
    /plugin install xc
    ```

=== "Direct Install"

    ```bash
    /plugin install robinmordasiewicz/f5xc-console
    ```

=== "Local Development"

    ```bash
    git clone https://github.com/robinmordasiewicz/f5xc-console.git
    cd xc
    /plugin install .
    ```

## Commands

### `/xc:console`

**Description:** Primary command description

!!! example "Usage"
    ```bash
    /xc:console <action> [arguments]
    ```

#### Actions

| Action | Description | Example |
|:-------|:------------|:--------|
| `action1` | What action1 does | `/xc:console action1 arg` |
| `action2` | What action2 does | `/xc:console action2 arg` |

#### Arguments

| Argument | Required | Type | Description | Default |
|:---------|:--------:|:-----|:------------|:--------|
| `--arg1` | :white_check_mark: | `string` | Description | - |
| `--arg2` | :x: | `boolean` | Description | `false` |
| `--arg3` | :x: | `number` | Description | `10` |

## Skills

### `xc-console`

> Automate F5 Distributed Cloud web console operations through browser automation using mcp__claude-in-chrome MCP tools. Handles multi-provider authentication (Azure SSO, Google, Okta, SAML, native username/password), detecting session expiry and navigating login flows. Warns when VPN is required. Use when creating HTTP/TCP load balancers, origin pools, WAF policies, deploying cloud sites (AWS/Azure/GCP), managing DNS zones, configuring service policies, or executing any F5 XC GUI-based tasks. Triggers on: F5 XC console, GUI automation, browser automation, login, SSO, authenticate, tenant management, visual configuration, Web App and API Protection, WAAP.

??? info "Skill Metadata"
    | Field | Value |
    |:------|:------|
    | **Triggers** | keyword1, keyword2, keyword3 |
    | **MCP Tools** | `tool1`, `tool2`, `tool3` |
    | **Version** | 0.5.1 |

#### Capabilities

- :material-check: Capability 1
- :material-check: Capability 2
- :material-check: Capability 3

#### Bundled Resources

```
skills/xc-console/
├── SKILL.md              # Main skill instructions
├── metadata.json         # Navigation metadata
├── url-sitemap.json      # URL mapping (NEW in v2.2+)
├── scripts/              # Automation scripts
├── references/           # Reference documentation
└── workflows/            # Step-by-step workflows
```

## Examples

### Example 1: Basic Usage

```bash
# Step 1: Initialize
/xc:console init

# Step 2: Execute main action
/xc:console run --arg1 value

# Step 3: Verify results
/xc:console status
```

### Example 2: Advanced Workflow

??? example "Click to expand"
    ```bash
    # Advanced multi-step workflow
    /xc:console configure --advanced
    /xc:console validate
    /xc:console execute --parallel
    /xc:console report --format json
    ```

## Configuration

### Plugin Settings

| Setting | Type | Default | Description |
|:--------|:-----|:--------|:------------|
| `setting1` | `string` | `"default"` | What this setting controls |
| `setting2` | `boolean` | `true` | What this setting controls |
| `setting3` | `number` | `30` | What this setting controls (seconds) |

### Metadata Configuration

??? abstract "console-navigation-metadata.json"
    ```json
    {
      "version": "{{ metadata.version }}",
      "deterministic_navigation": {
        "enabled": true,
        "selector_priority": ["data_testid", "aria_label", "text_match", "css", "ref"]
      }
    }
    ```

## Troubleshooting

??? danger "Connection Failed"
    **Problem:** Unable to connect to service

    **Symptoms:**
    - Timeout errors
    - Connection refused

    **Solutions:**
    1. Check network connectivity
    2. Verify credentials are correct
    3. Ensure required services are running

    ```bash
    # Diagnostic command
    /xc:console diagnose
    ```

??? warning "Authentication Error"
    **Problem:** Authentication fails

    **Solutions:**
    1. Verify environment variables are set
    2. Check token expiration
    3. Regenerate credentials if needed

??? note "Performance Issues"
    **Problem:** Slow execution

    **Solutions:**
    1. Check selector chain efficiency
    2. Use stable selectors (`data_testid`) over session refs
    3. Enable caching if available

## API Reference

??? info "Metadata Schema"
    ```json
    {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "required": ["version", "tenant"],
      "properties": {
        "version": { "type": "string" },
        "tenant": { "type": "string" },
        "last_crawled": { "type": "string", "format": "date-time" }
      }
    }
    ```

## Changelog

??? abstract "Version History"
    | Version | Date | Changes |
    |:--------|:-----|:--------|
    | `0.5.1` | 2025-12-24 | Current release |
    | `0.2.0` | 2025-01-01 | Added feature X |
    | `0.1.0` | 2024-12-01 | Initial release |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Development setup
git clone https://github.com/robinmordasiewicz/f5xc-console.git
cd xc
# Make changes and submit PR
```

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**[Report Issue](https://github.com/robinmordasiewicz/f5xc-console/issues)** | **[Request Feature](https://github.com/robinmordasiewicz/f5xc-console/issues/new)** | **[Documentation](https://github.com/robinmordasiewicz/f5xc-console#readme)**

Made with :heart: by [Robin Mordasiewicz](https://github.com/robinmordasiewicz)

</div>
