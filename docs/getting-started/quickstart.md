# Quick Start

## Basic Usage

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

## Navigation Targets

{{ workspace_mapping() }}

## Example Workflows

### Create HTTP Load Balancer

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
5. Don't submit yet - just show me the form filled in."
```

### Explore Console Structure

```bash
claude --chrome

"Help me inventory the F5 Distributed Cloud console.

Navigate to https://nferreira.staging.volterra.us and:
1. Look at the main left sidebar menu
2. For each top-level menu item, tell me:
   - The menu item name
   - Any submenus
   - What page appears when clicked

Take screenshots of key pages."
```
