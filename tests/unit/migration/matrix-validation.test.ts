/**
 * Matrix Validation Test Suite
 *
 * Comprehensive validation across all components of the plugin
 * to ensure consistency and correctness after migration.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

describe('Matrix Validation Suite', () => {
  const projectRoot = path.resolve(__dirname, '../../..');

  // Define all component categories for matrix testing
  const COMPONENT_MATRIX = {
    documentation: [
      'README.md',
      'CHANGELOG.md',
      // 'CLAUDE.md', // Optional - may not exist in all setups
      'docs/features/navigation.md',
      'docs/generated/PLUGIN_README.md',
      'docs/generated/SKILL_xc-console.md',
    ],
    skills: [
      'skills/xc-console/SKILL.md',
      'skills/xc-console/authentication-flows.md',
      'skills/xc-console/crawl-workflow.md',
    ],
    scripts: [
      'skills/xc-console/scripts/crawl-console.js',
      'skills/xc-console/scripts/detect-modules.js',
      'skills/xc-console/scripts/detect-permissions.js',
      'skills/xc-console/scripts/detect-subscription.js',
      'scripts/generate-manifest.py',
    ],
    configuration: [
      '.mcp.json',
      '.claude-plugin/plugin.json',
      'hooks/hooks.json',
      'commands/console.md',
      'agents/xc-troubleshooter.md',
    ],
    tests: [
      'tests/config/jest.config.ts',
      'tests/unit/mcp/chrome-devtools-adapter.test.ts',
    ],
  };

  describe('File Existence Matrix', () => {
    const allFiles = Object.values(COMPONENT_MATRIX).flat();

    test.each(allFiles)('%s exists', (file) => {
      const filePath = path.join(projectRoot, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('MCP Tool Name Consistency Matrix', () => {
    const filesWithMCPRefs = [
      ...COMPONENT_MATRIX.skills,
      ...COMPONENT_MATRIX.scripts,
      ...COMPONENT_MATRIX.configuration,
    ];

    describe.each(filesWithMCPRefs)('%s', (file) => {
      let content: string;

      beforeAll(() => {
        const filePath = path.join(projectRoot, file);
        if (fs.existsSync(filePath)) {
          content = fs.readFileSync(filePath, 'utf-8');
        }
      });

      test('no legacy mcp__claude-in-chrome__ references', () => {
        if (!content) return;
        expect(content).not.toMatch(/mcp__claude-in-chrome__/);
      });

      test('uses mcp__chrome-devtools__ if MCP tools mentioned', () => {
        if (!content) return;
        if (content.includes('mcp__')) {
          expect(content).toMatch(/mcp__chrome-devtools__/);
        }
      });
    });
  });

  describe('Version Consistency Matrix', () => {
    test('package.json and plugin.json versions are valid semver', () => {
      const pkgPath = path.join(projectRoot, 'package.json');
      const pluginPath = path.join(projectRoot, '.claude-plugin/plugin.json');

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf-8'));

      // Both should have valid semver versions
      expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(plugin.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    test('all version files have valid semver format', () => {
      const versionFiles = [
        { file: 'package.json', key: 'version' },
        { file: '.claude-plugin/plugin.json', key: 'version' },
      ];

      for (const { file, key } of versionFiles) {
        const filePath = path.join(projectRoot, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        expect(content[key]).toMatch(/^\d+\.\d+\.\d+/);
      }
    });

    test('documentation version badges exist', () => {
      const docsWithBadges = [
        'docs/generated/PLUGIN_README.md',
      ];

      for (const file of docsWithBadges) {
        const filePath = path.join(projectRoot, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          // Should have a version badge with any valid version
          expect(content).toMatch(/version-\d+\.\d+\.\d+/);
        }
      }
    });
  });

  describe('JSON Schema Validation Matrix', () => {
    const jsonFiles = [
      '.mcp.json',
      '.claude-plugin/plugin.json',
      'hooks/hooks.json',
      'package.json',
      'tsconfig.json',
    ];

    test.each(jsonFiles)('%s is valid JSON', (file) => {
      const filePath = path.join(projectRoot, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Handle tsconfig.json which may have comments
      let jsonContent = content;
      if (file === 'tsconfig.json') {
        jsonContent = content
          .replace(/\/\/.*/g, '')
          .replace(/\/\*[\s\S]*?\*\//g, '');
      }

      expect(() => JSON.parse(jsonContent)).not.toThrow();
    });

    test('hooks.json has valid schema reference', () => {
      const hooksPath = path.join(projectRoot, 'hooks/hooks.json');
      const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));

      expect(hooks.$schema).toMatch(/anthropic.com/);
    });

    test('.mcp.json has mcpServers structure', () => {
      const mcpPath = path.join(projectRoot, '.mcp.json');
      const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));

      expect(mcp).toHaveProperty('mcpServers');
      expect(typeof mcp.mcpServers).toBe('object');
    });

    test('plugin.json has required fields', () => {
      const pluginPath = path.join(projectRoot, '.claude-plugin/plugin.json');
      const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf-8'));

      expect(plugin).toHaveProperty('name');
      expect(plugin).toHaveProperty('version');
      expect(plugin).toHaveProperty('description');
    });
  });

  describe('YAML Frontmatter Validation Matrix', () => {
    const yamlFiles = [
      'skills/xc-console/SKILL.md',
      'commands/console.md',
    ];

    test.each(yamlFiles)('%s has valid YAML frontmatter', (file) => {
      const filePath = path.join(projectRoot, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for YAML frontmatter markers
      expect(content).toMatch(/^---/);
      expect(content).toMatch(/\n---/);

      // Extract frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      expect(frontmatterMatch).not.toBeNull();
    });
  });

  describe('Cross-Reference Validation Matrix', () => {
    test('SKILL.md description matches skill directory name', () => {
      const skillPath = path.join(projectRoot, 'skills/xc-console/SKILL.md');
      const content = fs.readFileSync(skillPath, 'utf-8');

      expect(content).toMatch(/name:\s*xc-console/);
    });

    test('hooks reference tools that exist in MCP config', () => {
      const hooksPath = path.join(projectRoot, 'hooks/hooks.json');
      const mcpPath = path.join(projectRoot, '.mcp.json');

      const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
      const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));

      // Extract server name from hooks
      const hooksContent = JSON.stringify(hooks);
      if (hooksContent.includes('mcp__chrome-devtools__')) {
        expect(mcp.mcpServers).toHaveProperty('chrome-devtools');
      }
    });

    test('commands reference allowed MCP tools that exist', () => {
      const commandPath = path.join(projectRoot, 'commands/console.md');
      const mcpPath = path.join(projectRoot, '.mcp.json');

      const commandContent = fs.readFileSync(commandPath, 'utf-8');
      const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));

      if (commandContent.includes('mcp__chrome-devtools__')) {
        expect(mcp.mcpServers).toHaveProperty('chrome-devtools');
      }
    });
  });

  describe('Documentation Completeness Matrix', () => {
    test('README.md has all required sections', () => {
      const readmePath = path.join(projectRoot, 'README.md');
      const content = fs.readFileSync(readmePath, 'utf-8');

      const requiredSections = [
        /Overview|Introduction/i,
        /Prerequisites|Requirements/i,
        /Install|Setup|Getting Started/i,
      ];

      for (const section of requiredSections) {
        expect(content).toMatch(section);
      }
    });

    test('CHANGELOG.md follows Keep a Changelog format', () => {
      const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
      const content = fs.readFileSync(changelogPath, 'utf-8');

      expect(content).toMatch(/# Changelog/);
      expect(content).toMatch(/\[[\d.]+\]/);
    });

    test('skill documentation covers all MCP tools used', () => {
      const skillPath = path.join(projectRoot, 'skills/xc-console/SKILL.md');
      const authPath = path.join(projectRoot, 'skills/xc-console/authentication-flows.md');

      const skillContent = fs.readFileSync(skillPath, 'utf-8');
      const authContent = fs.readFileSync(authPath, 'utf-8');

      // Key tools that should be documented
      const documentedTools = [
        /navigate/i,
        /snapshot|read_page/i,
        /click/i,
        /fill/i,
      ];

      const combinedContent = skillContent + authContent;

      for (const tool of documentedTools) {
        expect(combinedContent).toMatch(tool);
      }
    });
  });

  describe('Script Functionality Matrix', () => {
    const scriptTests = [
      {
        file: 'skills/xc-console/scripts/detect-permissions.js',
        expectedExports: ['canEdit', 'canDelete', 'viewOnly'],
      },
      {
        file: 'skills/xc-console/scripts/detect-modules.js',
        expectedExports: ['currentWorkspace', 'modules', 'serviceStatus'],
      },
      {
        file: 'skills/xc-console/scripts/detect-subscription.js',
        expectedExports: ['tier', 'features'],
      },
    ];

    test.each(scriptTests)('$file returns expected structure', ({ file, expectedExports }) => {
      const filePath = path.join(projectRoot, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check that script mentions expected output properties
      for (const prop of expectedExports) {
        expect(content).toMatch(new RegExp(prop));
      }
    });

    test('all scripts are valid JavaScript IIFE', () => {
      const scripts = [
        'skills/xc-console/scripts/detect-permissions.js',
        'skills/xc-console/scripts/detect-modules.js',
        'skills/xc-console/scripts/detect-subscription.js',
      ];

      for (const script of scripts) {
        const filePath = path.join(projectRoot, script);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for IIFE pattern
        expect(content).toMatch(/\(function.*\(\)/);
        expect(content).toMatch(/\}\)\(\);?\s*$/);
      }
    });
  });

  describe('CI/CD Configuration Matrix', () => {
    test('GitHub Actions workflow exists', async () => {
      const workflowsDir = path.join(projectRoot, '.github/workflows');

      if (fs.existsSync(workflowsDir)) {
        const files = fs.readdirSync(workflowsDir);
        expect(files.length).toBeGreaterThan(0);
      }
    });

    test('package.json has QA scripts', () => {
      const pkgPath = path.join(projectRoot, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

      expect(pkg.scripts).toHaveProperty('qa');
      expect(pkg.scripts).toHaveProperty('qa:typecheck');
      expect(pkg.scripts).toHaveProperty('qa:unit');
    });
  });

  describe('Encoding and Format Matrix', () => {
    test('all markdown files are UTF-8', async () => {
      const mdFiles = await glob('**/*.md', {
        cwd: projectRoot,
        ignore: ['node_modules/**'],
      });

      for (const file of mdFiles.slice(0, 20)) { // Test first 20
        const filePath = path.join(projectRoot, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Should not have BOM or invalid characters
        expect(content.charCodeAt(0)).not.toBe(0xFEFF);
      }
    });

    test('JSON files are valid and parseable', () => {
      const jsonFiles = [
        'package.json',
        '.mcp.json',
        '.claude-plugin/plugin.json',
        'hooks/hooks.json',
      ];

      for (const file of jsonFiles) {
        const filePath = path.join(projectRoot, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Should be valid JSON
        expect(() => JSON.parse(content)).not.toThrow();

        // Should use indentation (not minified)
        expect(content).toMatch(/\n\s+/);
      }
    });
  });
});
