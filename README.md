# f5xc-console

Chrome browser automation for F5 Distributed Cloud console - navigate, crawl, and automate XC GUI operations.

## Overview

This Claude Code plugin provides browser automation capabilities for the F5 Distributed Cloud (XC) web console. It uses the Claude in Chrome extension to interact with the console GUI, enabling automated navigation, form filling, and data extraction.

## Features

- **Azure SSO Authentication** - Automatic detection and handling of session expiry
- **Deterministic Navigation** - Pre-crawled element refs for reliable automation
- **Form Automation** - Fill HTTP Load Balancer, Origin Pool, and WAF forms
- **Console Crawling** - Extract and refresh navigation metadata
- **Real-time Feedback** - Watch automation in your browser

## Installation

### Prerequisites

1. **Claude in Chrome Extension**
   - Install from [Chrome Web Store](https://chrome.google.com/webstore)
   - Pin extension to toolbar

2. **F5 XC Tenant Access**
   - Azure AD credentials with tenant access
   - Valid tenant URL (e.g., `https://yourname.console.ves.volterra.io`)

### Install Plugin

```bash
# Clone repository
git clone https://github.com/robinmordasiewicz/f5xc-console.git

# Install as Claude Code plugin
claude plugin install ./f5xc-console

# Or use directly
claude --plugin-dir /path/to/f5xc-console
```

## Usage

### Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/xc:console login <url>` | Authenticate to tenant | `/xc:console login https://nferreira.staging.volterra.us` |
| `/xc:console crawl <url>` | Refresh navigation metadata | `/xc:console crawl https://nferreira.staging.volterra.us` |
| `/xc:console nav <target>` | Navigate to workspace/page | `/xc:console nav waap` |
| `/xc:console create <type>` | Start resource creation | `/xc:console create http-lb` |
| `/xc:console status` | Show connection status | `/xc:console status` |

### Quick Start

```bash
# Start Claude Code with Chrome integration
claude --chrome

# Login to your tenant
/xc:console login https://yourname.console.ves.volterra.io

# Navigate to HTTP Load Balancers
/xc:console nav http-lb

# Create a new load balancer
/xc:console create http-lb
```

### Navigation Targets

- `home` - Console home page
- `waap` - Web App & API Protection
- `mcn` - Multi-Cloud Network Connect
- `mac` - Multi-Cloud App Connect
- `dns` - DNS Management
- `http-lb` - HTTP Load Balancers
- `origin-pools` - Origin Pools
- `waf` - App Firewall policies

## Plugin Structure

```
f5xc-console/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── skills/
│   └── xc-console/
│       ├── SKILL.md         # Skill definition
│       ├── console-navigation-metadata.json
│       ├── workflows/       # Task automation patterns
│       └── scripts/         # Crawl utilities
├── commands/
│   └── console.md           # Command definition
├── README.md
├── LICENSE
└── CHANGELOG.md
```

## Related Plugins

This plugin is part of the F5 XC automation ecosystem:

| Plugin | Commands | Purpose |
|--------|----------|---------|
| **f5xc-console** | `/xc:console` | Browser/console automation |
| f5xc-cli | `/xc:cli` | CLI operations (f5xcctl) |
| f5xc-terraform | `/xc:tf` | Infrastructure as Code |
| f5xc-docs | `/xc:docs` | Documentation lookups |
| f5xc-api | `/xc:api` | Direct API interaction |

## Development

### Refreshing Metadata

The console crawl extracts element refs for deterministic automation:

```bash
/xc:console crawl https://yourname.console.ves.volterra.io
```

This updates `console-navigation-metadata.json` with current element refs.

### Adding New Workflows

1. Create workflow file in `skills/xc-console/workflows/`
2. Follow existing patterns (see `http-loadbalancer-create-basic.md`)
3. Test with `/xc:console create <type>`

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

Robin Mordasiewicz - [GitHub](https://github.com/robinmordasiewicz)
