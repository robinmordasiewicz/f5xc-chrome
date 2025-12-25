# URL Sitemap

The `url-sitemap.json` file provides complete URL routing for deterministic navigation.

## Structure

```json
{
  "version": "2.2.0",
  "tenant": "nferreira.staging.volterra.us",

  "static_routes": {
    "/web/home": { ... },
    "/web/catalog/use-cases": { ... },
    "/web/workspaces/web-app-and-api-protection": { ... }
  },

  "dynamic_routes": [
    {
      "pattern": "/web/workspaces/{workspace}/namespaces/{namespace}/manage/{resource_type}",
      "variables": { ... },
      "example": "..."
    }
  ],

  "workspace_mapping": {
    "waap": "/web/workspaces/web-app-and-api-protection",
    "mcn": "/web/workspaces/multi-cloud-network-connect"
  },

  "resource_shortcuts": {
    "http-lb": "/web/workspaces/.../http_loadbalancers",
    "origin-pools": "/web/workspaces/.../origin_pools"
  },

  "crawl_coverage": {
    "static_routes_discovered": 23,
    "dynamic_patterns_defined": 9,
    "workspaces_mapped": 21
  }
}
```

## Workspace Mapping

{{ workspace_mapping() }}

## Resource Shortcuts

| Shortcut | Path Pattern |
|----------|--------------|
| `http-lb` | `.../manage/load_balancers/http_loadbalancers` |
| `tcp-lb` | `.../manage/load_balancers/tcp_loadbalancers` |
| `origin-pools` | `.../manage/load_balancers/origin_pools` |
| `health-checks` | `.../manage/load_balancers/health_checks` |
| `waf` | `.../manage/app_firewall` |
| `cdn` | `.../manage/cdn/distributions` |
| `service-policies` | `.../manage/service_policies/service_policies` |
| `rate-limiters` | `.../manage/rate_limiter_policies` |
| `security` | `.../overview/security` |
| `performance` | `.../overview/performance` |

## Dynamic Route Patterns

### Workspace Overview Sections

```
/web/workspaces/{workspace}/namespaces/{namespace}/overview/{section}
```

Variables:
- `workspace`: `web-app-and-api-protection`, `multi-cloud-network-connect`
- `namespace`: user-defined
- `section`: `security`, `performance`, `summary`

### Load Balancer Pages

```
/web/workspaces/{workspace}/namespaces/{namespace}/manage/load_balancers/{lb_type}
```

Variables:
- `lb_type`: `http_loadbalancers`, `tcp_loadbalancers`, `origin_pools`, `health_checks`

### Resource Management

```
/web/workspaces/{workspace}/namespaces/{namespace}/manage/{resource_type}
```

Variables:
- `resource_type`: `app_firewall`, `rate_limiter_policies`, `public_ip`, etc.

### Create/Edit Forms

```
/web/workspaces/{workspace}/namespaces/{namespace}/manage/{resource_type}/{action}
```

Variables:
- `action`: `create`, `edit`

## Using the Sitemap

### Direct Navigation

```python
sitemap = load_json("url-sitemap.json")

# Use workspace shortcut
waap_path = sitemap["workspace_mapping"]["waap"]
# -> "/web/workspaces/web-app-and-api-protection"

# Use resource shortcut (with namespace)
http_lb_path = sitemap["resource_shortcuts"]["http-lb"].replace("{namespace}", "default")
```

### Building Dynamic URLs

```python
def build_url(pattern: str, **kwargs) -> str:
    url = pattern
    for key, value in kwargs.items():
        url = url.replace(f"{{{key}}}", value)
    return url

# Example
url = build_url(
    "/web/workspaces/{workspace}/namespaces/{namespace}/manage/load_balancers/{lb_type}",
    workspace="web-app-and-api-protection",
    namespace="production",
    lb_type="http_loadbalancers"
)
```
