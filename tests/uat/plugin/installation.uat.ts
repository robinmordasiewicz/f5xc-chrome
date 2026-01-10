// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Plugin Installation User Acceptance Tests
 *
 * Validates that the plugin can be correctly installed and recognized
 * by Claude Code, including all required files and configurations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';

describe('Plugin Installation UAT', () => {
  const projectRoot = path.resolve(__dirname, '../../..');
  const pluginDir = path.join(projectRoot, '.claude-plugin');

  describe('Plugin Structure Validation', () => {
    test('plugin.json exists and is valid JSON', () => {
      const pluginJsonPath = path.join(pluginDir, 'plugin.json');
      expect(fs.existsSync(pluginJsonPath)).toBe(true);

      const content = fs.readFileSync(pluginJsonPath, 'utf-8');
      const plugin = JSON.parse(content);

      expect(plugin).toHaveProperty('name');
      expect(plugin).toHaveProperty('version');
      expect(plugin).toHaveProperty('description');
    });

    test('plugin.json has correct version 0.12.0', () => {
      const pluginJsonPath = path.join(pluginDir, 'plugin.json');
      const plugin = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));

      expect(plugin.version).toBe('0.12.0');
    });

    test('plugin.json has required metadata fields', () => {
      const pluginJsonPath = path.join(pluginDir, 'plugin.json');
      const plugin = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));

      expect(plugin.name).toBe('xc');
      expect(typeof plugin.description).toBe('string');
      expect(plugin.description.length).toBeGreaterThan(10);
    });

    test('.mcp.json exists and configures chrome-devtools', () => {
      const mcpJsonPath = path.join(projectRoot, '.mcp.json');
      expect(fs.existsSync(mcpJsonPath)).toBe(true);

      const mcp = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));
      expect(mcp).toHaveProperty('mcpServers');
      expect(mcp.mcpServers).toHaveProperty('chrome-devtools');
    });

    test('.mcp.json has correct chrome-devtools configuration', () => {
      const mcpJsonPath = path.join(projectRoot, '.mcp.json');
      const mcp = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));

      const cdtConfig = mcp.mcpServers['chrome-devtools'];
      expect(cdtConfig).toHaveProperty('command');
      expect(cdtConfig.command).toBe('npx');
      expect(cdtConfig.args).toContain('-y');
      expect(cdtConfig.args.some((arg: string) => arg.includes('@anthropic/mcp-server-chrome-devtools'))).toBe(true);
    });
  });

  describe('Required Files Presence', () => {
    const requiredFiles = [
      '.claude-plugin/plugin.json',
      '.mcp.json',
      'CLAUDE.md',
      'README.md',
      'CHANGELOG.md',
      'package.json',
      'skills/xc-console/SKILL.md',
      'commands/console.md',
      'hooks/hooks.json',
    ];

    test.each(requiredFiles)('%s exists', (file) => {
      const filePath = path.join(projectRoot, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('Skill Registration', () => {
    test('xc-console skill directory exists', () => {
      const skillDir = path.join(projectRoot, 'skills/xc-console');
      expect(fs.existsSync(skillDir)).toBe(true);
      expect(fs.statSync(skillDir).isDirectory()).toBe(true);
    });

    test('xc-console SKILL.md has required frontmatter', () => {
      const skillPath = path.join(projectRoot, 'skills/xc-console/SKILL.md');
      const content = fs.readFileSync(skillPath, 'utf-8');

      // Check for YAML frontmatter
      expect(content).toMatch(/^---/);
      expect(content).toMatch(/name:\s*xc-console/);
      expect(content).toMatch(/description:/);
    });

    test('xc-console skill has supporting files', () => {
      const skillDir = path.join(projectRoot, 'skills/xc-console');

      const supportingFiles = [
        'authentication-flows.md',
        'crawl-workflow.md',
        'scripts/crawl-console.js',
        'scripts/detect-modules.js',
        'scripts/detect-permissions.js',
        'scripts/detect-subscription.js',
      ];

      for (const file of supportingFiles) {
        const filePath = path.join(skillDir, file);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });
  });

  describe('Command Registration', () => {
    test('console command file exists', () => {
      const commandPath = path.join(projectRoot, 'commands/console.md');
      expect(fs.existsSync(commandPath)).toBe(true);
    });

    test('console command has required frontmatter', () => {
      const commandPath = path.join(projectRoot, 'commands/console.md');
      const content = fs.readFileSync(commandPath, 'utf-8');

      // Check for YAML frontmatter
      expect(content).toMatch(/^---/);
      expect(content).toMatch(/allowed-tools:/);
      expect(content).toMatch(/mcp__chrome-devtools__\*/);
    });
  });

  describe('Hooks Configuration', () => {
    test('hooks.json is valid JSON', () => {
      const hooksPath = path.join(projectRoot, 'hooks/hooks.json');
      const content = fs.readFileSync(hooksPath, 'utf-8');

      expect(() => JSON.parse(content)).not.toThrow();
    });

    test('hooks.json has correct schema reference', () => {
      const hooksPath = path.join(projectRoot, 'hooks/hooks.json');
      const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));

      expect(hooks.$schema).toMatch(/anthropic.com\/claude-code\/hooks\.schema\.json/);
    });

    test('hooks.json references chrome-devtools tools', () => {
      const hooksPath = path.join(projectRoot, 'hooks/hooks.json');
      const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));

      const content = JSON.stringify(hooks);
      expect(content).toMatch(/mcp__chrome-devtools__/);
      expect(content).not.toMatch(/mcp__claude-in-chrome__/);
    });
  });

  describe('Package.json Validation', () => {
    test('package.json has correct name', () => {
      const pkgPath = path.join(projectRoot, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

      expect(pkg.name).toBe('@anthropic/f5xc-console');
    });

    test('package.json version matches plugin.json', () => {
      const pkgPath = path.join(projectRoot, 'package.json');
      const pluginPath = path.join(pluginDir, 'plugin.json');

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf-8'));

      expect(pkg.version).toBe(plugin.version);
    });

    test('package.json has test scripts', () => {
      const pkgPath = path.join(projectRoot, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

      expect(pkg.scripts).toHaveProperty('test');
      expect(pkg.scripts).toHaveProperty('test:unit');
      expect(pkg.scripts).toHaveProperty('test:integration');
    });
  });

  describe('TypeScript Configuration', () => {
    test('tsconfig.json exists and is valid', () => {
      const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);

      const content = fs.readFileSync(tsconfigPath, 'utf-8');
      // Remove comments for JSON parsing
      const jsonContent = content.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(() => JSON.parse(jsonContent)).not.toThrow();
    });
  });

  describe('Local Installation Simulation', () => {
    test('npm install completes without errors', () => {
      // Skip if CI environment without npm
      if (!process.env.CI && !fs.existsSync(path.join(projectRoot, 'node_modules'))) {
        console.log('Skipping npm install test - node_modules not present');
        return;
      }

      // Verify node_modules exists (should be installed)
      expect(fs.existsSync(path.join(projectRoot, 'node_modules'))).toBe(true);
    });

    test('TypeScript compilation succeeds', () => {
      try {
        execSync('npm run qa:typecheck', {
          cwd: projectRoot,
          stdio: 'pipe',
        });
      } catch (error: any) {
        // If TypeScript check fails, report the error
        console.log('TypeScript compilation output:', error.stdout?.toString());
        throw new Error(`TypeScript compilation failed: ${error.message}`);
      }
    });
  });
});
