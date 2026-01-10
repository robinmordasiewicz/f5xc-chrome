// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Unit Tests for Workflow Frontmatter Validation
 *
 * Validates:
 * - YAML frontmatter presence
 * - Required metadata fields
 * - Field value formats
 * - Category and complexity values
 */

import * as fs from 'fs';
import * as path from 'path';

const WORKFLOWS_DIR = path.join(__dirname, '../../../skills/xc-console/workflows');

interface WorkflowFrontmatter {
  title?: string;
  description?: string;
  version?: string;
  last_updated?: string;
  category?: string;
  complexity?: string;
  estimated_duration?: string;
  [key: string]: unknown;
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): WorkflowFrontmatter | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatterText = frontmatterMatch[1];
  const result: WorkflowFrontmatter = {};

  // Simple YAML parser for key: value pairs
  const lines = frontmatterText.split('\n');
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      // Remove quotes if present
      result[key] = value.replace(/^["']|["']$/g, '');
    }
  }

  return result;
}

/**
 * Get all workflow markdown files
 */
function getWorkflowFiles(): string[] {
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    return [];
  }

  // Exclude task-workflows.md (index file) and e2e-test-* workflows (test specs have different structure)
  return fs.readdirSync(WORKFLOWS_DIR)
    .filter((file) => file.endsWith('.md') && file !== 'task-workflows.md' && !file.startsWith('e2e-test-'))
    .map((file) => path.join(WORKFLOWS_DIR, file));
}

describe('Workflow Frontmatter Validation', () => {
  let workflowFiles: string[];

  beforeAll(() => {
    workflowFiles = getWorkflowFiles();
  });

  describe('Frontmatter Presence', () => {
    test('workflows directory should exist', () => {
      expect(fs.existsSync(WORKFLOWS_DIR)).toBe(true);
    });

    test('should have workflow files', () => {
      expect(workflowFiles.length).toBeGreaterThan(0);
    });

    test('all workflow files should have frontmatter', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        const fileName = path.basename(filePath);

        expect(frontmatter).not.toBeNull();
      }
    });
  });

  describe('Required Fields', () => {
    test('all workflows should have title', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        const fileName = path.basename(filePath);

        expect(frontmatter?.title).toBeDefined();
        expect(typeof frontmatter?.title).toBe('string');
        expect((frontmatter?.title as string).length).toBeGreaterThan(0);
      }
    });

    test('all workflows should have description', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        const fileName = path.basename(filePath);

        expect(frontmatter?.description).toBeDefined();
        expect(typeof frontmatter?.description).toBe('string');
      }
    });

    test('all workflows should have version', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        const fileName = path.basename(filePath);

        expect(frontmatter?.version).toBeDefined();
      }
    });

    test('all workflows should have category', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        const fileName = path.basename(filePath);

        expect(frontmatter?.category).toBeDefined();
      }
    });

    test('all workflows should have complexity', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        const fileName = path.basename(filePath);

        expect(frontmatter?.complexity).toBeDefined();
      }
    });
  });

  describe('Field Value Formats', () => {
    test('version should follow semver format', () => {
      const semverPattern = /^\d+\.\d+\.\d+$/;

      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        const fileName = path.basename(filePath);

        if (frontmatter?.version) {
          expect(semverPattern.test(frontmatter.version as string)).toBe(true);
        }
      }
    });

    test('complexity should be valid value', () => {
      const validComplexities = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        const fileName = path.basename(filePath);

        if (frontmatter?.complexity) {
          expect(validComplexities).toContain(frontmatter.complexity);
        }
      }
    });

    test('category should be valid value', () => {
      const validCategories = [
        'Load Balancing',
        'Security',
        'DNS',
        'DNS & Global Routing',
        'Cloud Sites',
        'Administration',
        'Networking',
        'WAF',
        'Bot Defense',
        'API Protection',
        'Multi-Cloud',
        'Origin Pool',
        'Health Check',
        'Traffic Management',
        'Cloud Deployment',
      ];

      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        const fileName = path.basename(filePath);

        if (frontmatter?.category) {
          expect(validCategories).toContain(frontmatter.category);
        }
      }
    });

    test('estimated_duration should be valid format', () => {
      // Patterns like "10 minutes", "15-30 minutes", "1-2 hours", "~20 minutes", "30-45 minutes (daily for 1-7 days)"
      const durationPattern = /^~?\d+(-\d+)?\s*(minutes?|hours?|min|hr|mins|hrs)(\s*\(.*\))?$/i;

      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        const fileName = path.basename(filePath);

        if (frontmatter?.estimated_duration) {
          expect(durationPattern.test(frontmatter.estimated_duration as string)).toBe(true);
        }
      }
    });

    test('last_updated should be valid date', () => {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;

      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        const fileName = path.basename(filePath);

        if (frontmatter?.last_updated) {
          expect(datePattern.test(frontmatter.last_updated as string)).toBe(true);
        }
      }
    });
  });

  describe('Title Consistency', () => {
    test('title should start with "Workflow"', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        const fileName = path.basename(filePath);

        if (frontmatter?.title) {
          expect((frontmatter.title as string).startsWith('Workflow')).toBe(true);
        }
      }
    });

    test('title should describe the action', () => {
      // Titles should contain action words
      const actionWords = ['Create', 'Add', 'Configure', 'Deploy', 'Manage', 'Monitor', 'Setup'];

      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        const fileName = path.basename(filePath);

        if (frontmatter?.title) {
          const hasActionWord = actionWords.some((word) =>
            (frontmatter.title as string).includes(word)
          );
          expect(hasActionWord).toBe(true);
        }
      }
    });
  });
});
