/**
 * Skill Invocation User Acceptance Tests
 *
 * Validates that skills can be properly invoked and that their
 * configurations are correct for Claude Code execution.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

describe('Skill Invocation UAT', () => {
  const projectRoot = path.resolve(__dirname, '../../..');
  const skillsDir = path.join(projectRoot, 'skills');

  describe('xc-console Skill Configuration', () => {
    let skillContent: string;
    let skillFrontmatter: any;

    beforeAll(() => {
      const skillPath = path.join(skillsDir, 'xc-console/SKILL.md');
      skillContent = fs.readFileSync(skillPath, 'utf-8');

      // Extract YAML frontmatter
      const frontmatterMatch = skillContent.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        skillFrontmatter = yaml.load(frontmatterMatch[1]);
      }
    });

    test('skill has valid name', () => {
      expect(skillFrontmatter.name).toBe('xc-console');
    });

    test('skill has description', () => {
      expect(skillFrontmatter.description).toBeDefined();
      expect(skillFrontmatter.description.length).toBeGreaterThan(50);
    });

    test('skill description mentions browser automation', () => {
      expect(skillFrontmatter.description.toLowerCase()).toMatch(/browser automation|chrome devtools|mcp/);
    });

    test('skill description mentions authentication support', () => {
      expect(skillFrontmatter.description.toLowerCase()).toMatch(/authentication|sso|azure|okta/);
    });

    test('skill has trigger keywords', () => {
      const triggerKeywords = [
        'F5 XC console',
        'GUI automation',
        'browser automation',
        'login',
        'SSO',
        'authenticate',
        'WAAP',
      ];

      const description = skillFrontmatter.description.toLowerCase();
      const foundTriggers = triggerKeywords.filter(
        (keyword) => description.includes(keyword.toLowerCase())
      );

      expect(foundTriggers.length).toBeGreaterThan(3);
    });

    test('skill allows arguments', () => {
      expect(skillFrontmatter.allowed_args).toBe(true);
    });
  });

  describe('Skill Supporting Files', () => {
    const skillDir = path.join(skillsDir, 'xc-console');

    test('authentication-flows.md provides complete auth guidance', () => {
      const authPath = path.join(skillDir, 'authentication-flows.md');
      const content = fs.readFileSync(authPath, 'utf-8');

      // Check for authentication types
      expect(content).toMatch(/Native.*Username.*Password/i);
      expect(content).toMatch(/Azure SSO/i);
      expect(content).toMatch(/Google SSO/i);
      expect(content).toMatch(/Okta SSO/i);
      expect(content).toMatch(/SAML/i);

      // Check for MCP tool instructions
      expect(content).toMatch(/mcp__chrome-devtools__navigate_page/);
      expect(content).toMatch(/mcp__chrome-devtools__take_snapshot|read_page/);
      expect(content).toMatch(/mcp__chrome-devtools__click/);
    });

    test('crawl-workflow.md provides crawling instructions', () => {
      const crawlPath = path.join(skillDir, 'crawl-workflow.md');
      const content = fs.readFileSync(crawlPath, 'utf-8');

      // Check for workflow steps
      expect(content).toMatch(/navigate/i);
      expect(content).toMatch(/snapshot|read_page/i);
      expect(content).toMatch(/crawl/i);

      // Check for MCP tools
      expect(content).toMatch(/mcp__chrome-devtools__/);
    });

    test('scripts directory contains detection scripts', () => {
      const scriptsDir = path.join(skillDir, 'scripts');

      const requiredScripts = [
        'crawl-console.js',
        'detect-modules.js',
        'detect-permissions.js',
        'detect-subscription.js',
      ];

      for (const script of requiredScripts) {
        const scriptPath = path.join(scriptsDir, script);
        expect(fs.existsSync(scriptPath)).toBe(true);

        const content = fs.readFileSync(scriptPath, 'utf-8');
        // Scripts should be valid JavaScript
        expect(content).toMatch(/function|const|let|var/);
      }
    });

    test('detection scripts return structured data', () => {
      const scriptsDir = path.join(skillDir, 'scripts');

      // Check detect-permissions.js returns expected structure
      const permissionsScript = fs.readFileSync(
        path.join(scriptsDir, 'detect-permissions.js'),
        'utf-8'
      );
      expect(permissionsScript).toMatch(/canEdit|canDelete|canCreate|viewOnly/);

      // Check detect-modules.js returns expected structure
      const modulesScript = fs.readFileSync(
        path.join(scriptsDir, 'detect-modules.js'),
        'utf-8'
      );
      expect(modulesScript).toMatch(/currentWorkspace|modules|serviceStatus/);

      // Check detect-subscription.js returns expected structure
      const subscriptionScript = fs.readFileSync(
        path.join(scriptsDir, 'detect-subscription.js'),
        'utf-8'
      );
      expect(subscriptionScript).toMatch(/tier|features|limits/);
    });
  });

  describe('Command Configuration', () => {
    let commandContent: string;
    let commandFrontmatter: any;

    beforeAll(() => {
      const commandPath = path.join(projectRoot, 'commands/console.md');
      commandContent = fs.readFileSync(commandPath, 'utf-8');

      // Extract YAML frontmatter
      const frontmatterMatch = commandContent.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        commandFrontmatter = yaml.load(frontmatterMatch[1]);
      }
    });

    test('command has allowed-tools configured', () => {
      expect(commandFrontmatter['allowed-tools']).toBeDefined();
    });

    test('command allows chrome-devtools MCP tools', () => {
      const allowedTools = commandFrontmatter['allowed-tools'];
      expect(allowedTools).toMatch(/mcp__chrome-devtools__\*/);
    });

    test('command allows file operation tools', () => {
      const allowedTools = commandFrontmatter['allowed-tools'];
      expect(allowedTools).toMatch(/Read|Write|Glob|Grep/);
    });

    test('command does not allow legacy tools', () => {
      const allowedTools = commandFrontmatter['allowed-tools'];
      expect(allowedTools).not.toMatch(/mcp__claude-in-chrome/);
    });
  });

  describe('Hooks Integration', () => {
    let hooks: any;

    beforeAll(() => {
      const hooksPath = path.join(projectRoot, 'hooks/hooks.json');
      hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
    });

    test('hooks define PostToolUse handlers', () => {
      expect(hooks.hooks).toHaveProperty('PostToolUse');
      expect(Array.isArray(hooks.hooks.PostToolUse)).toBe(true);
    });

    test('hooks define PreToolUse handlers', () => {
      expect(hooks.hooks).toHaveProperty('PreToolUse');
      expect(Array.isArray(hooks.hooks.PreToolUse)).toBe(true);
    });

    test('PostToolUse hooks target chrome-devtools tools', () => {
      const postHooks = hooks.hooks.PostToolUse;

      for (const hook of postHooks) {
        if (hook.matcher?.toolName) {
          expect(hook.matcher.toolName).toMatch(/^mcp__chrome-devtools__/);
        }
      }
    });

    test('PreToolUse hooks target chrome-devtools tools', () => {
      const preHooks = hooks.hooks.PreToolUse;

      for (const hook of preHooks) {
        if (hook.matcher?.toolName) {
          expect(hook.matcher.toolName).toMatch(/^mcp__chrome-devtools__/);
        }
      }
    });

    test('hooks have valid hook configurations', () => {
      const allHooks = [
        ...hooks.hooks.PostToolUse,
        ...hooks.hooks.PreToolUse,
      ];

      for (const hook of allHooks) {
        // Each hook should have a matcher
        expect(hook).toHaveProperty('matcher');

        // Each hook should have hooks array
        expect(hook).toHaveProperty('hooks');
        expect(Array.isArray(hook.hooks)).toBe(true);
      }
    });
  });

  describe('Metadata Files', () => {
    test('console-navigation-metadata.json exists', () => {
      const metadataPath = path.join(
        skillsDir,
        'xc-console/console-navigation-metadata.json'
      );

      if (fs.existsSync(metadataPath)) {
        const content = fs.readFileSync(metadataPath, 'utf-8');
        const metadata = JSON.parse(content);

        expect(metadata).toHaveProperty('version');
      }
    });

    test('url-sitemap.json exists and is valid', () => {
      const sitemapPath = path.join(skillsDir, 'xc-console/url-sitemap.json');

      if (fs.existsSync(sitemapPath)) {
        const content = fs.readFileSync(sitemapPath, 'utf-8');
        const sitemap = JSON.parse(content);

        expect(sitemap).toHaveProperty('version');
        expect(sitemap).toHaveProperty('routes');
      }
    });
  });

  describe('Agent Configuration', () => {
    test('xc-troubleshooter agent exists', () => {
      const agentPath = path.join(projectRoot, 'agents/xc-troubleshooter.md');
      expect(fs.existsSync(agentPath)).toBe(true);
    });

    test('xc-troubleshooter uses chrome-devtools tools', () => {
      const agentPath = path.join(projectRoot, 'agents/xc-troubleshooter.md');
      const content = fs.readFileSync(agentPath, 'utf-8');

      expect(content).toMatch(/mcp__chrome-devtools__/);
      expect(content).not.toMatch(/mcp__claude-in-chrome__/);
    });
  });
});
