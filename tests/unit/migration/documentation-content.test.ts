// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Documentation Content Validation Tests
 *
 * Validates that documentation files are correctly updated for the
 * Chrome DevTools MCP migration and contain accurate information.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Documentation Content Validation', () => {
  const projectRoot = path.resolve(__dirname, '../../..');

  describe('README.md', () => {
    let readmeContent: string;

    beforeAll(() => {
      const readmePath = path.join(projectRoot, 'README.md');
      readmeContent = fs.readFileSync(readmePath, 'utf-8');
    });

    test('mentions Chrome DevTools MCP server in overview', () => {
      expect(readmeContent).toMatch(/Chrome DevTools MCP server/i);
    });

    test('does not mention legacy claude-in-chrome extension', () => {
      expect(readmeContent).not.toMatch(/claude-in-chrome/i);
      expect(readmeContent).not.toMatch(/Claude in Chrome extension/i);
    });

    test('has correct MCP server package reference', () => {
      expect(readmeContent).toMatch(/@anthropic\/mcp-server-chrome-devtools/);
    });

    test('quick start section does not require --chrome flag', () => {
      expect(readmeContent).not.toMatch(/claude --chrome/);
    });

    test('has prerequisites section', () => {
      expect(readmeContent).toMatch(/Prerequisites/i);
    });

    test('mentions mcp.json configuration', () => {
      expect(readmeContent).toMatch(/\.mcp\.json/i);
    });
  });

  describe('CHANGELOG.md', () => {
    let changelogContent: string;

    beforeAll(() => {
      const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
      changelogContent = fs.readFileSync(changelogPath, 'utf-8');
    });

    test('exists and is not empty', () => {
      expect(changelogContent.length).toBeGreaterThan(100);
    });

    test('follows Keep a Changelog format', () => {
      expect(changelogContent).toMatch(/# Changelog/);
      expect(changelogContent).toMatch(/Keep a Changelog/);
      expect(changelogContent).toMatch(/Semantic Versioning/);
    });

    test('has version 0.12.0 entry', () => {
      expect(changelogContent).toMatch(/\[0\.12\.0\]/);
    });

    test('mentions Chrome DevTools MCP migration', () => {
      expect(changelogContent).toMatch(/Chrome DevTools/i);
    });

    test('is not corrupted (reasonable file size)', () => {
      // Changelog should be under 100KB for a reasonable project
      expect(changelogContent.length).toBeLessThan(100000);
    });

    test('does not have duplicate version entries', () => {
      const versionMatches = changelogContent.match(/## \[[\d.]+\]/g) || [];
      const uniqueVersions = new Set(versionMatches);
      expect(versionMatches.length).toBe(uniqueVersions.size);
    });
  });

  describe('Generated Documentation', () => {
    describe('PLUGIN_README.md', () => {
      let pluginReadme: string;

      beforeAll(() => {
        const pluginPath = path.join(projectRoot, 'docs/generated/PLUGIN_README.md');
        pluginReadme = fs.readFileSync(pluginPath, 'utf-8');
      });

      test('has correct version badge', () => {
        expect(pluginReadme).toMatch(/version-0\.12\.0/);
      });

      test('mentions chrome-devtools tools', () => {
        expect(pluginReadme).toMatch(/mcp__chrome-devtools/);
      });

      test('does not have legacy tool references', () => {
        expect(pluginReadme).not.toMatch(/mcp__claude-in-chrome/);
      });

      test('has skill description', () => {
        expect(pluginReadme).toMatch(/xc-console/);
      });
    });

    describe('SKILL_xc-console.md', () => {
      let skillDoc: string;

      beforeAll(() => {
        const skillPath = path.join(projectRoot, 'docs/generated/SKILL_xc-console.md');
        skillDoc = fs.readFileSync(skillPath, 'utf-8');
      });

      test('has correct MCP tools section', () => {
        expect(skillDoc).toMatch(/mcp__chrome-devtools/);
      });

      test('does not have legacy tool references', () => {
        expect(skillDoc).not.toMatch(/mcp__claude-in-chrome/);
      });

      test('has authentication flows reference', () => {
        expect(skillDoc).toMatch(/authentication/i);
      });

      test('has metadata version reference', () => {
        expect(skillDoc).toMatch(/Metadata Version/i);
      });
    });
  });

  describe('Skill Documentation', () => {
    describe('authentication-flows.md', () => {
      let authFlows: string;

      beforeAll(() => {
        const authPath = path.join(projectRoot, 'skills/xc-console/authentication-flows.md');
        authFlows = fs.readFileSync(authPath, 'utf-8');
      });

      test('uses chrome-devtools MCP tools', () => {
        expect(authFlows).toMatch(/mcp__chrome-devtools__/);
      });

      test('does not use legacy MCP tools', () => {
        expect(authFlows).not.toMatch(/mcp__claude-in-chrome__/);
      });

      test('documents authentication types', () => {
        expect(authFlows).toMatch(/Native/i);
        expect(authFlows).toMatch(/Azure SSO/i);
        expect(authFlows).toMatch(/Google/i);
        expect(authFlows).toMatch(/Okta/i);
      });

      test('has navigation workflow', () => {
        expect(authFlows).toMatch(/navigate/i);
        expect(authFlows).toMatch(/take_snapshot|read_page/i);
      });
    });

    describe('crawl-workflow.md', () => {
      let crawlWorkflow: string;

      beforeAll(() => {
        const crawlPath = path.join(projectRoot, 'skills/xc-console/crawl-workflow.md');
        crawlWorkflow = fs.readFileSync(crawlPath, 'utf-8');
      });

      test('uses chrome-devtools MCP tools', () => {
        expect(crawlWorkflow).toMatch(/mcp__chrome-devtools__/);
      });

      test('does not use legacy MCP tools', () => {
        expect(crawlWorkflow).not.toMatch(/mcp__claude-in-chrome__/);
      });

      test('documents crawl process', () => {
        expect(crawlWorkflow).toMatch(/crawl/i);
        expect(crawlWorkflow).toMatch(/navigate/i);
      });
    });
  });

  describe('Feature Documentation', () => {
    test('navigation.md uses correct tool names', () => {
      const navPath = path.join(projectRoot, 'docs/features/navigation.md');
      const content = fs.readFileSync(navPath, 'utf-8');

      expect(content).toMatch(/mcp__chrome-devtools__/);
      expect(content).not.toMatch(/mcp__claude-in-chrome__/);
    });
  });

  describe('Agent Documentation', () => {
    test('xc-troubleshooter.md uses correct tool names', () => {
      const agentPath = path.join(projectRoot, 'agents/xc-troubleshooter.md');
      const content = fs.readFileSync(agentPath, 'utf-8');

      expect(content).toMatch(/mcp__chrome-devtools__/);
      expect(content).not.toMatch(/mcp__claude-in-chrome__/);
    });
  });

  describe('Content Consistency', () => {
    test('all documentation files reference same MCP server name', () => {
      const docFiles = [
        'README.md',
        'docs/features/navigation.md',
        'skills/xc-console/authentication-flows.md',
        'skills/xc-console/crawl-workflow.md',
      ];

      const serverNamePattern = /chrome-devtools/gi;

      for (const file of docFiles) {
        const filePath = path.join(projectRoot, file);

        if (!fs.existsSync(filePath)) {
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).toMatch(serverNamePattern);
      }
    });

    test('no documentation mentions deprecated extension approach', () => {
      const docFiles = [
        'README.md',
        'docs/features/navigation.md',
        'skills/xc-console/authentication-flows.md',
        'skills/xc-console/crawl-workflow.md',
        'commands/console.md',
      ];

      const deprecatedPatterns = [
        /browser extension/i,
        /Chrome extension/i,
        /--chrome flag/i,
        /claude --chrome/i,
      ];

      for (const file of docFiles) {
        const filePath = path.join(projectRoot, file);

        if (!fs.existsSync(filePath)) {
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        for (const pattern of deprecatedPatterns) {
          expect(content).not.toMatch(pattern);
        }
      }
    });
  });
});
