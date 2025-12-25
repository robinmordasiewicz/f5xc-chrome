# Console Metadata

The `console-navigation-metadata.json` file contains element selectors for browser automation.

## Current Status

{{ console_stats() }}

## Structure

```json
{
  "version": "2.2.0",
  "tenant": "nferreira.staging.volterra.us",
  "last_crawled": "2025-12-24T21:35:00Z",

  "deterministic_navigation": {
    "enabled": true,
    "description": "Element refs and stable selectors for deterministic browser automation"
  },

  "selector_priority": [
    "data_testid",
    "aria_label",
    "text_match",
    "css",
    "ref"
  ],

  "authentication": {
    "method": "multi_provider",
    "supported": ["azure_sso", "google_sso", "okta_sso", "saml", "native"],
    "auto_authorized": true
  },

  "home_page": {
    "url": "/web/home",
    "elements": { ... },
    "workspace_cards": { ... }
  },

  "waap_workspace": {
    "url": "/web/workspaces/web-app-and-api-protection",
    "sidebar": { ... }
  },

  "http_load_balancer_list": {
    "url": "/web/workspaces/.../http_loadbalancers",
    "add_button": { ... }
  },

  "http_load_balancer_form": {
    "url": "/web/workspaces/.../create",
    "tabs": { ... },
    "section_tabs": { ... },
    "fields": { ... },
    "actions": { ... }
  },

  "crawl_summary": {
    "pages_crawled": 3,
    "workspaces_discovered": 22,
    "form_fields": 25
  }
}
```

## Selector Priority

{{ selector_priority() }}

## Workspace Cards

Available workspace cards on the home page:

| Workspace | URL Path |
|-----------|----------|
| Web App & API Protection | `/web/workspaces/web-app-and-api-protection` |
| Multi-Cloud Network Connect | `/web/workspaces/multi-cloud-network-connect` |
| Multi-Cloud App Connect | `/web/workspaces/multi-cloud-app-connect` |
| Distributed Apps | `/web/workspaces/distributed-apps` |
| DNS Management | `/web/workspaces/dns-management` |
| Bot Defense | `/web/workspaces/bot-defense` |
| Content Delivery Network | `/web/workspaces/content-delivery-network` |
| Administration | `/web/workspaces/administration` |

## Refreshing Metadata

```bash
/xc:console crawl https://yourname.console.ves.volterra.io
```

This updates all element refs and stable selectors.
