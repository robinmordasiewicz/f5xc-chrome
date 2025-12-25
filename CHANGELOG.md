# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-12-25

- fix: change plugin name to xc for cleaner command path


## [1.0.0] - 2025-12-24

### Added
- Initial release of f5xc-chrome plugin
- `/xc:console` command with subcommands:
  - `login` - Azure SSO authentication
  - `crawl` - Console metadata extraction
  - `nav` - Workspace navigation
  - `create` - Resource creation wizard
  - `status` - Connection status
- `xc-console` skill for browser automation
- Pre-crawled navigation metadata for deterministic automation
- Support for HTTP Load Balancer form automation
- Azure SSO automatic authentication handling
- 23 workflow templates for common tasks
- Console crawl scripts for metadata refresh

### Technical Details
- Uses `mcp__claude-in-chrome__*` MCP tools for browser automation
- Element refs stored in `console-navigation-metadata.json`
- Compatible with Claude Code plugin system
- Supports Chrome extension integration via `claude --chrome`

### Known Limitations
- Requires Claude in Chrome extension
- Browser must be visible during automation
- Session timeout requires manual re-authentication in some cases
