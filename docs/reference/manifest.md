# Manifest Reference

The plugin generates a machine-readable manifest for downstream consumption.

## Manifest Location

- **Root**: `manifest.json` - Generated manifest (gitignored)
- **Docs**: `@docs/data/manifest.json` - MkDocs data source (gitignored)

## Generation

```bash
python scripts/generate-manifest.py
```

This aggregates:

- `.claude-plugin/plugin.json`
- `skills/xc-console/console-navigation-metadata.json`
- `skills/xc-console/url-sitemap.json`
- Git metadata

## Schema

```json
{
  "$schema": "https://f5xc-chrome.github.io/schema/manifest-v1.json",
  "manifest_version": "1.0.0",
  "generated_at": "2025-12-24T00:00:00Z",

  "plugin": {
    "name": "xc",
    "version": "0.3.0",
    "description": "...",
    "author": {},
    "license": "MIT",
    "repository": "...",
    "keywords": []
  },

  "build": {
    "commit": "abc123",
    "branch": "main",
    "tag": "v0.3.0"
  },

  "console_metadata": {
    "version": "2.2.0",
    "tenant": "...",
    "last_crawled": "...",
    "selector_priority": [],
    "authentication": {},
    "stats": {}
  },

  "url_sitemap": {
    "version": "2.2.0",
    "coverage": {},
    "workspace_mapping": {},
    "resource_shortcuts": {},
    "static_route_count": 23,
    "dynamic_pattern_count": 9
  },

  "skills": [],
  "workflows": [],
  "mcp_tools": [],
  "commands": [],
  "documentation": {},
  "ecosystem": []
}
```

## Using the Manifest

### In MkDocs

The manifest data is available through macros:

```markdown
{{ plugin_info() }}
{{ console_stats() }}
{{ workspace_mapping() }}
```

### Programmatically

```python
import json
from urllib.request import urlopen

manifest_url = "https://robinmordasiewicz.github.io/f5xc-chrome/data/manifest.json"
manifest = json.loads(urlopen(manifest_url).read())

print(f"Plugin version: {manifest['plugin']['version']}")
print(f"Metadata version: {manifest['console_metadata']['version']}")
```

### In CI/CD

```yaml
- name: Check manifest version
  run: |
    VERSION=$(jq -r '.plugin.version' manifest.json)
    echo "Plugin version: $VERSION"
```

## Data Files

Individual data files are also generated:

| File | Contents |
|------|----------|
| `@docs/data/plugin.json` | Plugin identity |
| `@docs/data/console_metadata.json` | Console crawl stats |
| `@docs/data/url_sitemap.json` | URL routing |
| `@docs/data/workflows.json` | Available workflows |
