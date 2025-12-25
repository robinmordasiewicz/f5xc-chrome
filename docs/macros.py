"""
MkDocs Macros for f5xc-chrome documentation.

Loads manifest data and provides template functions for dynamic content.
"""

import json
from pathlib import Path


def define_env(env):
    """Define macros and variables for MkDocs."""

    # Load manifest data
    docs_data = Path(__file__).parent.parent / "@docs" / "data"
    manifest_path = docs_data / "manifest.json"

    manifest = {}
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

    # Store manifest in env
    env.variables["manifest"] = manifest
    env.variables["plugin"] = manifest.get("plugin", {})
    env.variables["console_metadata"] = manifest.get("console_metadata", {})
    env.variables["url_sitemap"] = manifest.get("url_sitemap", {})
    env.variables["workflows"] = manifest.get("workflows", [])

    @env.macro
    def plugin_info():
        """Render plugin information card."""
        plugin = manifest.get("plugin", {})
        if not plugin:
            return "!!! warning\n    Plugin manifest not generated. Run `python scripts/generate-manifest.py`"

        return f"""
!!! info "Plugin Information"
    - **Name**: `{plugin.get('name', 'unknown')}`
    - **Version**: `{plugin.get('version', 'unknown')}`
    - **License**: {plugin.get('license', 'MIT')}
    - **Repository**: [{plugin.get('repository', '')}]({plugin.get('repository', '')})
"""

    @env.macro
    def console_stats():
        """Render console metadata statistics."""
        cm = manifest.get("console_metadata", {})
        sitemap = manifest.get("url_sitemap", {})

        if not cm:
            return "!!! warning\n    Console metadata not available."

        stats = cm.get("stats", {})
        coverage = sitemap.get("coverage", {})

        return f"""
| Metric | Value |
|--------|-------|
| Metadata Version | `{cm.get('version', 'unknown')}` |
| Pages Crawled | {stats.get('pages_crawled', 0)} |
| Workspaces Discovered | {stats.get('workspaces_discovered', 0)} |
| Form Fields | {stats.get('form_fields', 0)} |
| Static Routes | {sitemap.get('static_route_count', 0)} |
| Dynamic Patterns | {sitemap.get('dynamic_pattern_count', 0)} |
| Last Crawled | {cm.get('last_crawled', 'Never')} |
"""

    @env.macro
    def workspace_mapping():
        """Render workspace shortcut mapping table."""
        mapping = manifest.get("url_sitemap", {}).get("workspace_mapping", {})

        if not mapping:
            return "No workspace mappings available."

        rows = "\n".join(
            [f"| `{k}` | `{v}` |" for k, v in sorted(mapping.items())]
        )

        return f"""
| Shortcut | Path |
|----------|------|
{rows}
"""

    @env.macro
    def workflow_list():
        """Render available workflows."""
        workflows = manifest.get("workflows", [])

        if not workflows:
            return "No workflows available."

        rows = "\n".join(
            [
                f"| [{w.get('name', w.get('id'))}]({w.get('path', '#')}) | `{w.get('id')}` |"
                for w in workflows
            ]
        )

        return f"""
| Workflow | ID |
|----------|----|
{rows}
"""

    @env.macro
    def selector_priority():
        """Render selector priority chain."""
        priority = manifest.get("console_metadata", {}).get("selector_priority", [])

        if not priority:
            return "Selector priority not defined."

        items = "\n".join([f"{i+1}. `{s}`" for i, s in enumerate(priority)])

        return f"""
The automation uses this selector priority for reliable element targeting:

{items}
"""

    @env.macro
    def mcp_tools():
        """Render MCP tools table."""
        tools = manifest.get("mcp_tools", [])

        if not tools:
            return "No MCP tools defined."

        rows = "\n".join([f"| `{t}` |" for t in tools])

        return f"""
| Tool |
|------|
{rows}
"""
