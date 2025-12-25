# F5 XC Chrome Plugin

Chrome browser automation for F5 Distributed Cloud console - navigate, crawl, and automate XC GUI operations.

## Overview

This Claude Code plugin provides browser automation capabilities for the F5 Distributed Cloud (XC) web console. It uses the Claude in Chrome extension to interact with the console GUI, enabling automated navigation, form filling, and data extraction.

## Features

- **Multi-Provider Authentication** - Azure SSO, Google, Okta, SAML, and native login
- **Deterministic Navigation** - Pre-crawled stable selectors for reliable automation
- **Form Automation** - Fill HTTP Load Balancer, Origin Pool, and WAF forms
- **Console Crawling** - Extract and refresh navigation metadata
- **Real-time Feedback** - Watch automation in your browser

## Quick Links

| Resource | Description |
|----------|-------------|
| [Installation](getting-started/installation.md) | Get started with the plugin |
| [Commands](reference/commands.md) | Available commands reference |
| [Manifest](reference/manifest.md) | Machine-readable metadata |
| [Workflows](features/workflows.md) | Pre-built automation workflows |

## Plugin Metadata

{{ plugin_info() }}

## Console Coverage

{{ console_stats() }}

## Related Plugins

| Plugin | Command | Purpose |
|--------|---------|---------|
| **f5xc-chrome** | `/xc:console` | Browser/console automation |
| f5xc-cli | `/xc:cli` | CLI operations (f5xcctl) |
| f5xc-terraform | `/xc:tf` | Infrastructure as Code |

## License

MIT License - see [LICENSE](https://github.com/robinmordasiewicz/f5xc-chrome/blob/main/LICENSE) for details.
