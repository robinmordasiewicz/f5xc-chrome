# Contributing to F5 XC Chrome Plugin

We welcome contributions! This guide explains how to contribute to this plugin
and use the documentation templates for consistent, beautiful documentation.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/robinmordasiewicz/f5xc-console.git
cd f5xc-console

# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes, then generate docs
python scripts/generate-docs-from-metadata.py

# Submit PR
```

## Documentation Templates

This repository includes standardized documentation templates that produce
beautiful, MkDocs Material compatible documentation.

### Available Templates

| Template | Purpose | Output |
|:---------|:--------|:-------|
| `templates/PLUGIN_DOC_TEMPLATE.md` | Plugin-level documentation | `docs/generated/PLUGIN_README.md` |
| `templates/SKILL_DOC_TEMPLATE.md` | Skill-level documentation | `docs/generated/SKILL_*.md` |

### Template Features

Both templates include:

- :material-shield-check: **Shield.io badges** - Version, license, status indicators
- :material-view-dashboard: **Centered hero section** - Professional header with navigation
- :material-table: **Tables** - Features, arguments, configuration
- :material-chevron-down-box: **Collapsible sections** - Troubleshooting, advanced options
- :material-auto-fix: **Auto-population** - Variables extracted from metadata
- :material-book-open-variant: **MkDocs Material** - Full compatibility

### Using the Templates

#### Option 1: Auto-Generate from Metadata

The recommended approach is to auto-generate documentation from your
`plugin.json` and skill metadata:

```bash
# Generate all documentation
python scripts/generate-docs-from-metadata.py

# Generate plugin docs only
python scripts/generate-docs-from-metadata.py --plugin-only

# Generate specific skill docs
python scripts/generate-docs-from-metadata.py --skill xc-console

# Preview without writing files
python scripts/generate-docs-from-metadata.py --preview
```

#### Option 2: Manual Template Usage

Copy a template and replace the `{{ variable }}` placeholders:

```bash
cp templates/SKILL_DOC_TEMPLATE.md skills/my-skill/SKILL.md
# Edit and replace {{ variables }} with actual values
```

### Variable Reference

#### Plugin Variables (`plugin.*`)

| Variable | Source | Example |
|:---------|:-------|:--------|
| `{{ plugin.name }}` | `plugin.json → name` | `xc` |
| `{{ plugin.version }}` | `plugin.json → version` | `0.5.1` |
| `{{ plugin.description }}` | `plugin.json → description` | `Chrome browser automation...` |
| `{{ plugin.license }}` | `plugin.json → license` | `MIT` |
| `{{ plugin.repo }}` | `plugin.json → repository` | `robinmordasiewicz/f5xc-console` |
| `{{ plugin.author.name }}` | `plugin.json → author.name` | `Robin Mordasiewicz` |
| `{{ plugin.author.url }}` | `plugin.json → author.url` | `https://github.com/...` |

#### Skill Variables (`skill.*`)

| Variable | Source | Example |
|:---------|:-------|:--------|
| `{{ skill.name }}` | `SKILL.md frontmatter` | `xc-console` |
| `{{ skill.description }}` | `SKILL.md frontmatter` | `Automate F5 XC console...` |
| `{{ skill.version }}` | Derived from plugin | `0.5.1` |
| `{{ skill.triggers }}` | Extracted from description | `F5 XC, console, login` |

#### Metadata Variables (`metadata.*`)

| Variable | Source | Example |
|:---------|:-------|:--------|
| `{{ metadata.version }}` | `console-navigation-metadata.json` | `2.2.0` |
| `{{ metadata.last_crawled }}` | `console-navigation-metadata.json` | `2025-12-24T21:35:00Z` |
| `{{ metadata.tenant }}` | `console-navigation-metadata.json` | `nferreira.staging.volterra.us` |
| `{{ metadata.static_route_count }}` | Computed from `url-sitemap.json` | `8` |
| `{{ metadata.element_count }}` | Computed from metadata | `150` |

## Adding a New Skill

### Step 1: Create Skill Directory

```bash
mkdir -p skills/my-skill
```

### Step 2: Create SKILL.md with Frontmatter

```markdown
---
name: my-skill
description: Description of what this skill does. Triggers on: keyword1, keyword2.
allowed_args: true
---

# My Skill

Instructions for using this skill...
```

### Step 3: Add Metadata Files (Optional)

```bash
skills/my-skill/
├── SKILL.md                          # Required
├── console-navigation-metadata.json  # Optional - element selectors
├── url-sitemap.json                  # Optional - URL mapping
├── scripts/                          # Optional - automation scripts
├── references/                       # Optional - reference docs
└── workflows/                        # Optional - step-by-step guides
```

### Step 4: Generate Documentation

```bash
python scripts/generate-docs-from-metadata.py --skill my-skill
```

### Step 5: Review and Submit

1. Review generated docs in `docs/generated/`
2. Make any manual adjustments if needed
3. Commit changes
4. Submit pull request

## MkDocs Material Syntax Reference

### Admonitions

```markdown
!!! note "Optional Title"
    Note content here.

!!! tip "Pro Tip"
    Helpful tip content.

!!! warning "Caution"
    Warning content.

!!! danger "Critical"
    Critical warning content.
```

### Collapsible Sections

```markdown
??? note "Click to expand"
    Hidden content here.

???+ note "Expanded by default"
    Visible content here.
```

### Content Tabs

```markdown
=== "Tab 1"
    Content for tab 1.

=== "Tab 2"
    Content for tab 2.
```

### Tables

```markdown
| Column 1 | Column 2 | Column 3 |
|:---------|:--------:|----------:|
| Left     | Center   | Right     |
```

### Icons

```markdown
:material-check: Check icon
:material-close: Close icon
:white_check_mark: Checkmark emoji
:warning: Warning emoji
```

## Code Style

### Python

- Follow PEP 8
- Use type hints
- Add docstrings

### Markdown

- Use ATX-style headers (`#`)
- Use fenced code blocks with language
- Keep lines under 100 characters

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add new feature
fix: fix a bug
docs: update documentation
chore: maintenance task
refactor: code restructuring
```

## Questions?

- :material-github: [Open an Issue](https://github.com/robinmordasiewicz/f5xc-console/issues)
- :material-message: Start a Discussion

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
