# Installation

## Prerequisites

### 1. Chrome DevTools MCP Server

This plugin uses the Chrome DevTools MCP server for browser automation. The server is configured in `.mcp.json` and starts automatically when needed.

```bash
# Verify the MCP server works:
npx -y @anthropic/mcp-server-chrome-devtools@latest

# The server will start automatically with Claude Code
```

### 2. F5 XC Tenant Access

- Azure AD, Google, Okta, or SAML credentials with tenant access
- Valid tenant URL (e.g., `https://yourname.console.ves.volterra.io`)

## Install Plugin

### From GitHub

```bash
# Clone repository
git clone https://github.com/robinmordasiewicz/f5xc-console.git

# Install as Claude Code plugin
claude plugin install ./f5xc-console
```

### Direct Usage

```bash
# Use directly without installing
claude --plugin-dir /path/to/f5xc-console
```

## Verify Installation

```bash
# Start Claude Code (Chrome DevTools MCP starts automatically)
claude

# Check plugin is loaded
/xc:console status
```

## MCP Configuration

The `.mcp.json` file configures the Chrome DevTools MCP server:

```json
{
  "$schema": "https://anthropic.com/claude-code/mcp.schema.json",
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-chrome-devtools@latest"]
    }
  }
}
```

## Environment Variables (Optional)

For CLI-based verification:

```bash
export F5XC_API_URL="https://yourname.console.ves.volterra.io"
export F5XC_API_TOKEN='your-api-token'
```
