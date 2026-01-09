#!/usr/bin/env python3
"""
Manifest Generator for f5xc-console Plugin

Generates a rich manifest.json from source files for downstream consumption.
This is the source of truth for machine-readable plugin metadata.

Usage:
    python scripts/generate-manifest.py

Output:
    - manifest.json (root) - complete plugin manifest
    - @docs/data/manifest.json - MkDocs data source
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path


def load_json(filepath: Path) -> dict:
    """Load JSON file safely."""
    if not filepath.exists():
        return {}
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def count_files(directory: Path, pattern: str) -> int:
    """Count files matching pattern in directory."""
    if not directory.exists():
        return 0
    return len(list(directory.glob(pattern)))


def get_skills(skills_dir: Path) -> list:
    """Extract skill metadata from SKILL.md files."""
    skills = []
    for skill_dir in skills_dir.iterdir():
        if not skill_dir.is_dir():
            continue
        skill_md = skill_dir / "SKILL.md"
        if skill_md.exists():
            content = skill_md.read_text(encoding="utf-8")
            # Parse frontmatter
            if content.startswith("---"):
                parts = content.split("---", 2)
                if len(parts) >= 3:
                    frontmatter = parts[1].strip()
                    skill_info = {
                        "id": skill_dir.name,
                        "path": str(skill_dir.relative_to(skills_dir.parent)),
                    }
                    for line in frontmatter.split("\n"):
                        if ":" in line:
                            key, value = line.split(":", 1)
                            skill_info[key.strip()] = value.strip()
                    skills.append(skill_info)
    return skills


def get_workflows(workflows_dir: Path) -> list:
    """Extract workflow metadata from markdown files."""
    workflows = []
    if not workflows_dir.exists():
        return workflows
    for workflow_file in workflows_dir.glob("*.md"):
        if workflow_file.name.startswith("_"):
            continue
        workflows.append({
            "id": workflow_file.stem,
            "name": workflow_file.stem.replace("-", " ").title(),
            "path": str(workflow_file.relative_to(workflows_dir.parent.parent.parent)),
        })
    return workflows


def get_changelog(root_dir: Path, limit: int = 5) -> list:
    """Extract recent changelog entries."""
    changelog_path = root_dir / "CHANGELOG.md"
    if not changelog_path.exists():
        return []

    content = changelog_path.read_text(encoding="utf-8")
    entries = []
    current_entry = None

    for line in content.split("\n"):
        if line.startswith("## "):
            if current_entry and len(entries) < limit:
                entries.append(current_entry)
            version = line.replace("## ", "").strip()
            current_entry = {"version": version, "changes": []}
        elif current_entry and line.startswith("- "):
            current_entry["changes"].append(line[2:].strip())

    if current_entry and len(entries) < limit:
        entries.append(current_entry)

    return entries


def get_git_info() -> dict:
    """Extract git repository information."""
    import subprocess

    def run_git(args: list) -> str:
        try:
            result = subprocess.run(
                ["git"] + args,
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent.parent,
            )
            return result.stdout.strip()
        except Exception:
            return ""

    return {
        "commit": run_git(["rev-parse", "HEAD"])[:8],
        "branch": run_git(["rev-parse", "--abbrev-ref", "HEAD"]),
        "tag": run_git(["describe", "--tags", "--abbrev=0"]) or None,
    }


def generate_manifest(root_dir: Path) -> dict:
    """Generate complete plugin manifest."""
    # Load source files
    plugin_json = load_json(root_dir / ".claude-plugin" / "plugin.json")
    nav_metadata = load_json(
        root_dir / "skills" / "xc-console" / "console-navigation-metadata.json"
    )
    url_sitemap = load_json(root_dir / "skills" / "xc-console" / "url-sitemap.json")

    # Gather stats
    skills = get_skills(root_dir / "skills")
    workflows_dir = root_dir / "skills" / "xc-console" / "workflows"
    workflows = get_workflows(workflows_dir)
    changelog = get_changelog(root_dir)

    # Git info
    git_info = get_git_info()

    # Build manifest
    manifest = {
        "$schema": "https://robinmordasiewicz.github.io/f5xc-console/schema/manifest-v1.json",
        "manifest_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),

        # Plugin identity (enriched)
        "plugin": {
            "name": plugin_json.get("name", "xc"),
            "display_name": plugin_json.get("display_name", plugin_json.get("name", "xc")),
            "version": plugin_json.get("version", "0.0.0"),
            "tagline": plugin_json.get("tagline", ""),
            "description": plugin_json.get("description", ""),
            "long_description": plugin_json.get("long_description", ""),
            "author": plugin_json.get("author", {}),
            "license": plugin_json.get("license", "MIT"),
            "repository": plugin_json.get("repository", ""),
            "homepage": plugin_json.get("homepage", ""),
            "keywords": plugin_json.get("keywords", []),
            "categories": plugin_json.get("categories", []),
            "platforms": plugin_json.get("platforms", []),
        },

        # Marketing/Display
        "display": {
            "icon": plugin_json.get("icon", ""),
            "banner": plugin_json.get("banner", ""),
            "screenshots": plugin_json.get("screenshots", []),
            "features": plugin_json.get("features", []),
        },

        # Installation
        "installation": plugin_json.get("installation", {}),
        "prerequisites": plugin_json.get("prerequisites", []),
        "compatibility": plugin_json.get("compatibility", {}),

        # Support
        "support": plugin_json.get("support", {}),
        "maintainers": plugin_json.get("maintainers", []),

        # Build info
        "build": {
            "commit": git_info.get("commit"),
            "branch": git_info.get("branch"),
            "tag": git_info.get("tag"),
        },

        # Changelog
        "changelog": changelog,

        # Console metadata summary
        "console_metadata": {
            "version": nav_metadata.get("version", "unknown"),
            "tenant": nav_metadata.get("tenant", ""),
            "last_crawled": nav_metadata.get("crawl_summary", {}).get(
                "last_crawled", nav_metadata.get("last_crawled", "")
            ),
            "selector_priority": nav_metadata.get("selector_priority", []),
            "authentication": nav_metadata.get("authentication", {}),
            "stats": {
                "pages_crawled": nav_metadata.get("crawl_summary", {}).get(
                    "pages_crawled", 0
                ),
                "workspaces_discovered": nav_metadata.get("crawl_summary", {}).get(
                    "workspaces_discovered", 0
                ),
                "form_fields": nav_metadata.get("crawl_summary", {}).get(
                    "form_fields", 0
                ),
            },
        },

        # URL sitemap summary
        "url_sitemap": {
            "version": url_sitemap.get("version", "unknown"),
            "coverage": url_sitemap.get("crawl_coverage", {}),
            "workspace_mapping": url_sitemap.get("workspace_mapping", {}),
            "resource_shortcuts": url_sitemap.get("resource_shortcuts", {}),
            "static_route_count": len(url_sitemap.get("static_routes", {})),
            "dynamic_pattern_count": len(url_sitemap.get("dynamic_routes", [])),
        },

        # Available skills
        "skills": skills,

        # Available workflows
        "workflows": workflows,

        # MCP tools used
        "mcp_tools": [
            "mcp__chrome-devtools__list_pages",
            "mcp__chrome-devtools__navigate_page",
            "mcp__chrome-devtools__take_snapshot",
            "mcp__chrome-devtools__click",
            "mcp__chrome-devtools__fill",
            "mcp__chrome-devtools__take_screenshot",
            "mcp__chrome-devtools__evaluate_script",
        ],

        # Commands
        "commands": [
            {
                "name": "console",
                "alias": "xc:console",
                "description": "F5 XC console automation",
                "subcommands": [
                    {"name": "login", "description": "Authenticate to tenant"},
                    {"name": "crawl", "description": "Refresh navigation metadata"},
                    {"name": "nav", "description": "Navigate to workspace/page"},
                    {"name": "create", "description": "Start resource creation"},
                    {"name": "status", "description": "Show connection status"},
                ],
            }
        ],

        # Documentation URLs
        "documentation": {
            "plugin_docs": plugin_json.get("homepage", "https://robinmordasiewicz.github.io/f5xc-console/"),
            "api_reference": "https://docs.cloud.f5.com/docs/api",
            "f5xc_docs": "https://docs.cloud.f5.com/",
        },

        # Related plugins
        "ecosystem": [
            {
                "name": "f5xc-cli",
                "command": "/xc:cli",
                "purpose": "CLI operations (f5xcctl)",
            },
            {
                "name": "f5xc-terraform",
                "command": "/xc:tf",
                "purpose": "Infrastructure as Code",
            },
            {
                "name": "f5xc-docs",
                "command": "/xc:docs",
                "purpose": "Documentation lookups",
            },
        ],
    }

    return manifest


def main():
    """Main entry point."""
    root_dir = Path(__file__).parent.parent

    # Generate manifest
    manifest = generate_manifest(root_dir)

    # Write to root
    manifest_path = root_dir / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Generated: {manifest_path}")

    # Create @docs/data directory if it doesn't exist
    docs_data_dir = root_dir / "@docs" / "data"
    docs_data_dir.mkdir(parents=True, exist_ok=True)

    # Write to @docs for MkDocs
    docs_manifest_path = docs_data_dir / "manifest.json"
    with open(docs_manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Generated: {docs_manifest_path}")

    # Also create individual data files for MkDocs macros
    with open(docs_data_dir / "plugin.json", "w", encoding="utf-8") as f:
        json.dump(manifest["plugin"], f, indent=2)

    with open(docs_data_dir / "display.json", "w", encoding="utf-8") as f:
        json.dump(manifest["display"], f, indent=2)

    with open(docs_data_dir / "console_metadata.json", "w", encoding="utf-8") as f:
        json.dump(manifest["console_metadata"], f, indent=2)

    with open(docs_data_dir / "url_sitemap.json", "w", encoding="utf-8") as f:
        json.dump(manifest["url_sitemap"], f, indent=2)

    with open(docs_data_dir / "workflows.json", "w", encoding="utf-8") as f:
        json.dump(manifest["workflows"], f, indent=2)

    with open(docs_data_dir / "installation.json", "w", encoding="utf-8") as f:
        json.dump({
            "installation": manifest["installation"],
            "prerequisites": manifest["prerequisites"],
            "compatibility": manifest["compatibility"],
        }, f, indent=2)

    print(f"Generated data files in: {docs_data_dir}")


if __name__ == "__main__":
    main()
