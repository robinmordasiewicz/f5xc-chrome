# Installation

## Prerequisites

### 1. Claude in Chrome Extension

Install from the Chrome Web Store and verify connection:

```bash
# Visit Chrome Web Store and install "Claude in Chrome" extension
# Pin the extension to your toolbar for easy access

# Verify connection
claude --chrome
```

### 2. F5 XC Tenant Access

- Azure AD, Google, Okta, or SAML credentials with tenant access
- Valid tenant URL (e.g., `https://yourname.console.ves.volterra.io`)

## Install Plugin

### From GitHub

```bash
# Clone repository
git clone https://github.com/robinmordasiewicz/f5xc-chrome.git

# Install as Claude Code plugin
claude plugin install ./f5xc-chrome
```

### Direct Usage

```bash
# Use directly without installing
claude --plugin-dir /path/to/f5xc-chrome
```

## Verify Installation

```bash
# Start Claude Code with Chrome integration
claude --chrome

# Check plugin is loaded
/xc:console status
```

## Environment Variables (Optional)

For CLI-based verification:

```bash
export F5XC_API_URL="https://yourname.console.ves.volterra.io"
export F5XC_API_TOKEN='your-api-token'
```
