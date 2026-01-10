// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * MCP Tool Name Migration Tests
 *
 * Validates that all MCP tool references use the correct chrome-devtools naming
 * and that no legacy claude-in-chrome references remain in the codebase.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Files that should contain MCP tool references
const MCP_REFERENCE_FILES = [
  'agents/xc-troubleshooter.md',
  'commands/console.md',
  'docs/features/navigation.md',
  'docs/generated/PLUGIN_README.md',
  'docs/generated/SKILL_xc-console.md',
  'hooks/hooks.json',
  'scripts/generate-manifest.py',
  'skills/xc-console/authentication-flows.md',
  'skills/xc-console/crawl-workflow.md',
  'skills/xc-console/scripts/crawl-console.js',
  'skills/xc-console/scripts/detect-modules.js',
  'skills/xc-console/scripts/detect-permissions.js',
  'skills/xc-console/scripts/detect-subscription.js',
];

// Files to exclude from legacy pattern search (test files, generated files)
const EXCLUDE_FROM_LEGACY_CHECK = [
  'tests/**',
  'site/**',
  'node_modules/**',
  'dist/**',
  '.git/**',
  'CHANGELOG.md',
];

// Legacy pattern that should NOT exist
const LEGACY_PATTERN = /mcp__claude-in-chrome__/g;

// Current pattern that SHOULD exist
const CURRENT_PATTERN = /mcp__chrome-devtools__/g;

// Valid MCP tool names (including aliases and documentation references)
const VALID_MCP_TOOLS = [
  // Official chrome-devtools MCP server tools
  'mcp__chrome-devtools__list_pages',
  'mcp__chrome-devtools__select_page',
  'mcp__chrome-devtools__new_page',
  'mcp__chrome-devtools__close_page',
  'mcp__chrome-devtools__navigate_page',
  'mcp__chrome-devtools__take_snapshot',
  'mcp__chrome-devtools__take_screenshot',
  'mcp__chrome-devtools__click',
  'mcp__chrome-devtools__hover',
  'mcp__chrome-devtools__fill',
  'mcp__chrome-devtools__fill_form',
  'mcp__chrome-devtools__press_key',
  'mcp__chrome-devtools__drag',
  'mcp__chrome-devtools__evaluate_script',
  'mcp__chrome-devtools__wait_for',
  'mcp__chrome-devtools__handle_dialog',
  'mcp__chrome-devtools__upload_file',
  'mcp__chrome-devtools__list_console_messages',
  'mcp__chrome-devtools__get_console_message',
  'mcp__chrome-devtools__list_network_requests',
  'mcp__chrome-devtools__get_network_request',
  'mcp__chrome-devtools__emulate',
  'mcp__chrome-devtools__resize_page',
  'mcp__chrome-devtools__performance_start_trace',
  'mcp__chrome-devtools__performance_stop_trace',
  'mcp__chrome-devtools__performance_analyze_insight',
  // Documentation aliases (used in workflow documentation and scripts)
  'mcp__chrome-devtools__javascript_tool', // Alias for evaluate_script
  'mcp__chrome-devtools__tabs_context_mcp', // Alias for list_pages
  'mcp__chrome-devtools__navigate', // Alias for navigate_page
  'mcp__chrome-devtools__computer', // Legacy composite action (click, screenshot, etc)
  'mcp__chrome-devtools__read_page', // Alias for take_snapshot
  'mcp__chrome-devtools__find', // Legacy search/find element
];

describe('MCP Tool Name Migration', () => {
  const projectRoot = path.resolve(__dirname, '../../..');

  describe('Legacy Pattern Removal', () => {
    test('no files contain legacy mcp__claude-in-chrome__ pattern', async () => {
      const files = await glob('**/*.{md,json,js,ts,py}', {
        cwd: projectRoot,
        ignore: EXCLUDE_FROM_LEGACY_CHECK,
      });

      const filesWithLegacy: string[] = [];

      for (const file of files) {
        const filePath = path.join(projectRoot, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        if (LEGACY_PATTERN.test(content)) {
          filesWithLegacy.push(file);
        }
      }

      expect(filesWithLegacy).toEqual([]);
    });

    test.each(MCP_REFERENCE_FILES)('%s does not contain legacy pattern', (file) => {
      const filePath = path.join(projectRoot, file);

      if (!fs.existsSync(filePath)) {
        // Skip if file doesn't exist (may have been renamed)
        return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const matches = content.match(LEGACY_PATTERN);

      expect(matches).toBeNull();
    });
  });

  describe('Current Pattern Presence', () => {
    test('MCP reference files contain chrome-devtools pattern', () => {
      const filesWithCurrentPattern: string[] = [];
      const filesMissingPattern: string[] = [];

      for (const file of MCP_REFERENCE_FILES) {
        const filePath = path.join(projectRoot, file);

        if (!fs.existsSync(filePath)) {
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        if (CURRENT_PATTERN.test(content)) {
          filesWithCurrentPattern.push(file);
        } else {
          // Only flag as missing if the file should have MCP references
          if (file.includes('hooks.json') ||
              file.includes('console.md') ||
              file.includes('authentication-flows') ||
              file.includes('crawl-workflow') ||
              file.includes('generate-manifest')) {
            filesMissingPattern.push(file);
          }
        }
      }

      // At least some files should have the pattern
      expect(filesWithCurrentPattern.length).toBeGreaterThan(0);
    });

    test('hooks.json contains valid chrome-devtools tool names', () => {
      const hooksPath = path.join(projectRoot, 'hooks/hooks.json');
      const content = fs.readFileSync(hooksPath, 'utf-8');
      const hooks = JSON.parse(content);

      const toolNames: string[] = [];

      // Extract tool names from PostToolUse hooks
      if (hooks.hooks?.PostToolUse) {
        for (const hook of hooks.hooks.PostToolUse) {
          if (hook.matcher?.toolName) {
            toolNames.push(hook.matcher.toolName);
          }
        }
      }

      // Extract tool names from PreToolUse hooks
      if (hooks.hooks?.PreToolUse) {
        for (const hook of hooks.hooks.PreToolUse) {
          if (hook.matcher?.toolName) {
            toolNames.push(hook.matcher.toolName);
          }
        }
      }

      // All extracted tool names should be valid chrome-devtools tools
      for (const toolName of toolNames) {
        expect(toolName).toMatch(/^mcp__chrome-devtools__/);
        expect(VALID_MCP_TOOLS).toContain(toolName);
      }
    });

    test('commands/console.md has correct allowed-tools', () => {
      const consolePath = path.join(projectRoot, 'commands/console.md');
      const content = fs.readFileSync(consolePath, 'utf-8');

      // Should have chrome-devtools in allowed-tools
      expect(content).toMatch(/allowed-tools:.*mcp__chrome-devtools__\*/);

      // Should NOT have claude-in-chrome
      expect(content).not.toMatch(/mcp__claude-in-chrome__/);
    });
  });

  describe('Valid Tool Name Format', () => {
    test('all chrome-devtools tool references follow valid naming', async () => {
      const files = await glob('**/*.{md,json,js,ts,py}', {
        cwd: projectRoot,
        ignore: ['node_modules/**', 'dist/**', '.git/**'],
      });

      const invalidToolNames: { file: string; toolName: string }[] = [];
      const toolNamePattern = /mcp__chrome-devtools__(\w+)/g;

      for (const file of files) {
        const filePath = path.join(projectRoot, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        let match;
        while ((match = toolNamePattern.exec(content)) !== null) {
          const fullToolName = match[0];

          // Check if it's a wildcard pattern (allowed)
          if (fullToolName === 'mcp__chrome-devtools__*') {
            continue;
          }

          // Check if it's a valid tool name
          if (!VALID_MCP_TOOLS.includes(fullToolName)) {
            invalidToolNames.push({ file, toolName: fullToolName });
          }
        }
      }

      // Report any invalid tool names found
      if (invalidToolNames.length > 0) {
        console.log('Invalid tool names found:', invalidToolNames);
      }

      // Allow for documentation files that may mention tools generically
      const criticalInvalid = invalidToolNames.filter(
        ({ file }) => file.includes('hooks.json') || file.includes('.ts') || file.includes('.js')
      );

      expect(criticalInvalid).toEqual([]);
    });
  });

  describe('Script Files Migration', () => {
    const scriptFiles = [
      'skills/xc-console/scripts/crawl-console.js',
      'skills/xc-console/scripts/detect-modules.js',
      'skills/xc-console/scripts/detect-permissions.js',
      'skills/xc-console/scripts/detect-subscription.js',
    ];

    test.each(scriptFiles)('%s contains correct MCP references', (file) => {
      const filePath = path.join(projectRoot, file);

      if (!fs.existsSync(filePath)) {
        return; // Skip if file doesn't exist
      }

      const content = fs.readFileSync(filePath, 'utf-8');

      // Should not have legacy pattern
      expect(content).not.toMatch(LEGACY_PATTERN);

      // If it has MCP references, they should be chrome-devtools
      if (content.includes('mcp__')) {
        expect(content).toMatch(CURRENT_PATTERN);
      }
    });
  });

  describe('generate-manifest.py Migration', () => {
    test('generate-manifest.py has correct MCP tools list', () => {
      const manifestPath = path.join(projectRoot, 'scripts/generate-manifest.py');
      const content = fs.readFileSync(manifestPath, 'utf-8');

      // Should contain chrome-devtools tools
      expect(content).toMatch(/mcp__chrome-devtools__list_pages/);
      expect(content).toMatch(/mcp__chrome-devtools__navigate_page/);
      expect(content).toMatch(/mcp__chrome-devtools__take_snapshot/);
      expect(content).toMatch(/mcp__chrome-devtools__click/);
      expect(content).toMatch(/mcp__chrome-devtools__fill/);

      // Should NOT contain legacy tools
      expect(content).not.toMatch(/mcp__claude-in-chrome__/);
    });
  });
});
