#!/usr/bin/env python3
# Copyright (c) 2026 Robin Mordasiewicz. MIT License.

"""
Generate documentation from plugin.json and skill metadata.

This script reads plugin metadata and generates beautiful, standardized
documentation using MkDocs Material compatible templates.

Usage:
    python scripts/generate-docs-from-metadata.py [--output docs/]
    python scripts/generate-docs-from-metadata.py --skill xc-console
    python scripts/generate-docs-from-metadata.py --plugin-only
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


class DocumentationGenerator:
    """Generate documentation from plugin and skill metadata."""

    def __init__(self, plugin_root: Path):
        self.plugin_root = plugin_root
        self.plugin_json = self._load_json(".claude-plugin/plugin.json")
        self.templates_dir = plugin_root / "templates"

    def _load_json(self, relative_path: str) -> dict[str, Any]:
        """Load a JSON file relative to plugin root."""
        path = self.plugin_root / relative_path
        if path.exists():
            with open(path) as f:
                return json.load(f)
        return {}

    def _load_template(self, template_name: str) -> str:
        """Load a template file."""
        template_path = self.templates_dir / template_name
        if template_path.exists():
            return template_path.read_text()
        raise FileNotFoundError(f"Template not found: {template_path}")

    def _substitute_variables(self, template: str, variables: dict[str, Any]) -> str:
        """Substitute {{ variable }} placeholders in template."""

        def replace_var(match: re.Match) -> str:
            var_path = match.group(1).strip()
            # Handle nested paths like plugin.author.name
            value = variables
            for key in var_path.split("."):
                if isinstance(value, dict):
                    value = value.get(key, f"{{{{ {var_path} }}}}")
                else:
                    return f"{{{{ {var_path} }}}}"
            return str(value) if value is not None else ""

        return re.sub(r"\{\{\s*([^}]+)\s*\}\}", replace_var, template)

    def get_plugin_variables(self) -> dict[str, Any]:
        """Extract variables from plugin.json for template substitution."""
        pj = self.plugin_json

        # Determine repo from repository URL or author URL
        repo = ""
        if "repository" in pj:
            repo = pj["repository"].replace("https://github.com/", "")

        # Get primary command from commands directory
        commands_dir = self.plugin_root / pj.get("commands", "./commands/")
        primary_command = ""
        if commands_dir.exists():
            md_files = list(commands_dir.glob("*.md"))
            if md_files:
                primary_command = md_files[0].stem

        # Get skill info
        skills_dir = self.plugin_root / pj.get("skills", "./skills/")
        skill_name = ""
        skill_description = ""
        if skills_dir.exists():
            skill_dirs = [d for d in skills_dir.iterdir() if d.is_dir()]
            if skill_dirs:
                skill_name = skill_dirs[0].name
                skill_md = skill_dirs[0] / "SKILL.md"
                if skill_md.exists():
                    content = skill_md.read_text()
                    # Extract description from frontmatter
                    if match := re.search(
                        r"^---\s*\n.*?description:\s*(.+?)\n.*?^---",
                        content,
                        re.MULTILINE | re.DOTALL,
                    ):
                        skill_description = match.group(1).strip()

        return {
            "plugin": {
                "name": pj.get("name", "plugin-name"),
                "version": pj.get("version", "0.0.0"),
                "description": pj.get("description", "Plugin description"),
                "license": pj.get("license", "MIT"),
                "repo": repo,
                "author": pj.get("author", {"name": "Author", "url": ""}),
                "keywords": pj.get("keywords", []),
                "command_prefix": pj.get("name", "plugin"),
                "primary_command": primary_command,
                "skill_name": skill_name,
                "skill_description": skill_description,
                "marketplace": "robinmordasiewicz/f5-distributed-cloud-marketplace",
                "release_date": datetime.now().strftime("%Y-%m-%d"),
            }
        }

    def get_skill_variables(self, skill_name: str) -> dict[str, Any]:
        """Extract variables from skill metadata for template substitution."""
        skills_dir = self.plugin_root / self.plugin_json.get("skills", "./skills/")
        skill_dir = skills_dir / skill_name

        if not skill_dir.exists():
            raise FileNotFoundError(f"Skill not found: {skill_dir}")

        # Load SKILL.md frontmatter
        skill_md = skill_dir / "SKILL.md"
        skill_data = {"name": skill_name, "description": "", "version": "1.0.0", "status": "active", "triggers": []}

        if skill_md.exists():
            content = skill_md.read_text()
            # Extract frontmatter
            if match := re.search(r"^---\s*\n(.*?)^---", content, re.MULTILINE | re.DOTALL):
                frontmatter = match.group(1)
                if name_match := re.search(r"name:\s*(.+)", frontmatter):
                    skill_data["name"] = name_match.group(1).strip()
                if desc_match := re.search(r"description:\s*(.+)", frontmatter):
                    skill_data["description"] = desc_match.group(1).strip()
                    # Extract trigger keywords from description
                    if triggers_match := re.search(r"Triggers? on:?\s*(.+?)\.?\s*$", skill_data["description"]):
                        skill_data["triggers"] = [t.strip() for t in triggers_match.group(1).split(",")]

        # Load console-navigation-metadata.json
        metadata_file = skill_dir / "console-navigation-metadata.json"
        metadata = {}
        if metadata_file.exists():
            metadata = json.loads(metadata_file.read_text())

        # Load url-sitemap.json
        sitemap_file = skill_dir / "url-sitemap.json"
        sitemap = {}
        static_route_count = 0
        dynamic_route_count = 0
        if sitemap_file.exists():
            sitemap = json.loads(sitemap_file.read_text())
            static_route_count = len(sitemap.get("static_routes", {}))
            dynamic_route_count = len(sitemap.get("dynamic_routes", []))

        # Count elements in metadata
        element_count = self._count_elements(metadata)

        # Get MCP tools from SKILL.md
        mcp_tools = []
        if skill_md.exists():
            content = skill_md.read_text()
            mcp_tools = re.findall(r"`(mcp__[^`]+)`", content)[:5]

        return {
            "skill": skill_data,
            "metadata": {
                "version": metadata.get("version", "1.0.0"),
                "last_crawled": metadata.get("last_crawled", "N/A"),
                "tenant": metadata.get("tenant", "N/A"),
                "static_route_count": static_route_count,
                "dynamic_route_count": dynamic_route_count,
                "element_count": element_count,
            },
            "mcp": {
                "tool_1": mcp_tools[0] if len(mcp_tools) > 0 else "mcp__tool_1",
                "tool_2": mcp_tools[1] if len(mcp_tools) > 1 else "mcp__tool_2",
                "tool_3": mcp_tools[2] if len(mcp_tools) > 2 else "mcp__tool_3",
            },
            "workflow_1": {"name": "Primary Workflow", "description": "Main automation workflow"},
            "workflow_2": {"name": "Secondary Workflow", "description": "Additional workflow"},
            "plugin": self.get_plugin_variables()["plugin"],
        }

    def _count_elements(self, obj: Any, count: int = 0) -> int:
        """Recursively count elements with 'ref' or 'selectors' keys."""
        if isinstance(obj, dict):
            if "ref" in obj or "selectors" in obj:
                count += 1
            for value in obj.values():
                count = self._count_elements(value, count)
        elif isinstance(obj, list):
            for item in obj:
                count = self._count_elements(item, count)
        return count

    def generate_plugin_docs(self, output_path: Path | None = None) -> str:
        """Generate plugin documentation from template."""
        template = self._load_template("PLUGIN_DOC_TEMPLATE.md")
        variables = self.get_plugin_variables()
        content = self._substitute_variables(template, variables)

        if output_path:
            output_path.write_text(content)
            print(f"Generated plugin docs: {output_path}")

        return content

    def generate_skill_docs(self, skill_name: str, output_path: Path | None = None) -> str:
        """Generate skill documentation from template."""
        template = self._load_template("SKILL_DOC_TEMPLATE.md")
        variables = self.get_skill_variables(skill_name)
        content = self._substitute_variables(template, variables)

        if output_path:
            output_path.write_text(content)
            print(f"Generated skill docs: {output_path}")

        return content

    def generate_all(self, output_dir: Path) -> None:
        """Generate all documentation."""
        output_dir.mkdir(parents=True, exist_ok=True)

        # Generate plugin docs
        self.generate_plugin_docs(output_dir / "PLUGIN_README.md")

        # Generate skill docs for each skill
        skills_dir = self.plugin_root / self.plugin_json.get("skills", "./skills/")
        if skills_dir.exists():
            for skill_dir in skills_dir.iterdir():
                if skill_dir.is_dir() and (skill_dir / "SKILL.md").exists():
                    self.generate_skill_docs(skill_dir.name, output_dir / f"SKILL_{skill_dir.name}.md")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Generate documentation from plugin metadata")
    parser.add_argument("--plugin-root", type=Path, default=Path("."), help="Path to plugin root directory")
    parser.add_argument("--output", type=Path, default=Path("docs/generated"), help="Output directory")
    parser.add_argument("--skill", type=str, help="Generate docs for specific skill only")
    parser.add_argument("--plugin-only", action="store_true", help="Generate plugin docs only")
    parser.add_argument("--preview", action="store_true", help="Preview output without writing files")

    args = parser.parse_args()

    try:
        generator = DocumentationGenerator(args.plugin_root)

        if args.preview:
            if args.skill:
                print(generator.generate_skill_docs(args.skill))
            else:
                print(generator.generate_plugin_docs())
        elif args.plugin_only:
            generator.generate_plugin_docs(args.output / "PLUGIN_README.md")
        elif args.skill:
            args.output.mkdir(parents=True, exist_ok=True)
            generator.generate_skill_docs(args.skill, args.output / f"SKILL_{args.skill}.md")
        else:
            generator.generate_all(args.output)

        print("\nDocumentation generation complete!")

    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
