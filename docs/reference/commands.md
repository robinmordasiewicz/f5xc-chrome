# Commands Reference

## Console Command

The main command for F5 XC console automation.

### Syntax

```bash
/xc:console <subcommand> [options]
```

### Subcommands

| Command | Description | Example |
|---------|-------------|---------|
| `login <url>` | Authenticate to tenant | `/xc:console login https://tenant.volterra.us` |
| `crawl <url>` | Refresh navigation metadata | `/xc:console crawl https://tenant.volterra.us` |
| `nav <target>` | Navigate to workspace/page | `/xc:console nav waap` |
| `create <type>` | Start resource creation | `/xc:console create http-lb` |
| `status` | Show connection status | `/xc:console status` |

## Login Command

Authenticate to an F5 XC tenant.

```bash
/xc:console login https://yourname.console.ves.volterra.io
```

The command:

1. Gets browser context
2. Navigates to tenant URL
3. Detects auth type (native, SSO, or already logged in)
4. Handles accordingly (inform user or auto-complete)
5. Confirms successful login

## Navigation Command

Navigate to a workspace or page.

```bash
/xc:console nav <target>
```

### Available Targets

{{ workspace_mapping() }}

## Create Command

Start resource creation workflow.

```bash
/xc:console create <resource-type>
```

### Resource Types

| Type | Description |
|------|-------------|
| `http-lb` | HTTP Load Balancer |
| `tcp-lb` | TCP Load Balancer |
| `origin-pool` | Origin Pool |
| `waf` | WAF Policy |
| `service-policy` | Service Policy |

## Crawl Command

Refresh console navigation metadata.

```bash
/xc:console crawl https://yourname.console.ves.volterra.io
```

This updates:

- `console-navigation-metadata.json` - Element selectors
- `url-sitemap.json` - URL routing

## Status Command

Show current connection and session status.

```bash
/xc:console status
```

Displays:

- Chrome extension connection status
- Current tab URL
- Authentication state
- Metadata version
