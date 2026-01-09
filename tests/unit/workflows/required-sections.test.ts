/**
 * Unit Tests for Workflow Required Sections
 *
 * Validates:
 * - Required markdown sections present
 * - Section ordering and structure
 * - Validation and troubleshooting content
 */

import * as fs from 'fs';
import * as path from 'path';

const WORKFLOWS_DIR = path.join(__dirname, '../../../skills/xc-console/workflows');

/**
 * Get all workflow markdown files
 */
function getWorkflowFiles(): string[] {
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    return [];
  }

  return fs.readdirSync(WORKFLOWS_DIR)
    .filter((file) => file.endsWith('.md') && file !== 'task-workflows.md')
    .map((file) => path.join(WORKFLOWS_DIR, file));
}

/**
 * Extract headings from markdown content
 */
function extractHeadings(content: string): Array<{ level: number; text: string }> {
  const headingPattern = /^(#{1,6})\s+(.+)$/gm;
  const headings: Array<{ level: number; text: string }> = [];

  let match;
  while ((match = headingPattern.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
    });
  }

  return headings;
}

/**
 * Check if content contains a section (case-insensitive)
 */
function hasSection(content: string, sectionName: string): boolean {
  const pattern = new RegExp(`^#+\\s+${sectionName}`, 'im');
  return pattern.test(content);
}

describe('Workflow Required Sections', () => {
  let workflowFiles: string[];

  beforeAll(() => {
    workflowFiles = getWorkflowFiles();
  });

  describe('Core Sections', () => {
    test('all workflows should have Overview section', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);

        expect(hasSection(content, 'Overview')).toBe(true);
      }
    });

    test('all workflows should have Prerequisites section', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);

        expect(hasSection(content, 'Prerequisites')).toBe(true);
      }
    });

    test('all workflows should have step-by-step execution section', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);

        // Could be "Step-by-Step Execution" or "Steps" or similar
        const hasSteps = hasSection(content, 'Step-by-Step') ||
                        hasSection(content, 'Steps') ||
                        hasSection(content, 'Execution') ||
                        hasSection(content, 'Procedure');

        expect(hasSteps).toBe(true);
      }
    });
  });

  describe('Validation Sections', () => {
    test('all workflows should have validation section', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);

        // Could be "Validation" or "Verify" or "Success Criteria"
        const hasValidation = hasSection(content, 'Validation') ||
                             hasSection(content, 'Verify') ||
                             hasSection(content, 'Success Criteria') ||
                             content.toLowerCase().includes('cli') ||
                             content.includes('xcsh');

        expect(hasValidation).toBe(true);
      }
    });

    test('workflows should include CLI validation commands', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);

        // CLI commands should be present for validation
        const hasCli = content.includes('xcsh') ||
                      content.includes('```bash') ||
                      content.includes('CLI');

        expect(hasCli).toBe(true);
      }
    });
  });

  describe('Troubleshooting Section', () => {
    test('all workflows should have troubleshooting section', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);

        // Troubleshooting or Common Issues
        const hasTroubleshooting = hasSection(content, 'Troubleshooting') ||
                                   hasSection(content, 'Common Issues') ||
                                   hasSection(content, 'Issues') ||
                                   hasSection(content, 'Problems');

        expect(hasTroubleshooting).toBe(true);
      }
    });
  });

  describe('Input Parameters', () => {
    test('all workflows should have input parameters section', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);

        // Parameters section with JSON example
        const hasParams = hasSection(content, 'Input Parameters') ||
                         hasSection(content, 'Parameters') ||
                         content.includes('```json');

        expect(hasParams).toBe(true);
      }
    });
  });

  describe('Documentation References', () => {
    test('all workflows should reference official documentation', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);

        // Should have links to F5 docs
        const hasDocLinks = content.includes('docs.cloud.f5.com') ||
                           content.includes('Related Documentation') ||
                           content.includes('Documentation') ||
                           content.includes('References');

        expect(hasDocLinks).toBe(true);
      }
    });
  });

  describe('Section Structure', () => {
    test('workflow should have proper heading hierarchy', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);
        const headings = extractHeadings(content);

        // Should have H1 title
        const h1Headings = headings.filter((h) => h.level === 1);
        expect(h1Headings.length).toBeGreaterThanOrEqual(1);

        // Should have H2 sections
        const h2Headings = headings.filter((h) => h.level === 2);
        expect(h2Headings.length).toBeGreaterThanOrEqual(3);
      }
    });

    test('step sections should be numbered', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);

        // Steps should be numbered (Step 1, Step 2, etc.)
        const stepPattern = /Step\s+\d+/i;
        const hasNumberedSteps = stepPattern.test(content);

        expect(hasNumberedSteps).toBe(true);
      }
    });
  });

  describe('Next Steps Section', () => {
    test('workflows should suggest next steps', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);

        // Should have next steps or related workflows
        const hasNextSteps = hasSection(content, 'Next Steps') ||
                            hasSection(content, 'Related') ||
                            hasSection(content, 'What\'s Next') ||
                            content.toLowerCase().includes('after creating') ||
                            content.toLowerCase().includes('after completion');

        expect(hasNextSteps).toBe(true);
      }
    });
  });

  describe('Rollback Instructions', () => {
    test('workflows should include rollback instructions or be read-only', () => {
      // Some workflows don't need rollback because they're read-only or monitoring
      const readOnlyWorkflows = [
        'task-workflows.md',
        'admin-manage-quotas.md',
        'waf-policy-monitor-tuning.md',
      ];

      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);

        // Skip read-only or monitoring workflows
        if (readOnlyWorkflows.some((name) => fileName.includes(name.replace('.md', '')))) {
          continue;
        }

        // Should have rollback, cleanup, or modification instructions
        const hasRollback = hasSection(content, 'Rollback') ||
                           hasSection(content, 'Cleanup') ||
                           hasSection(content, 'Undo') ||
                           hasSection(content, 'Notes') ||
                           content.toLowerCase().includes('delete') ||
                           content.toLowerCase().includes('remove') ||
                           content.toLowerCase().includes('disable') ||
                           content.toLowerCase().includes('revert') ||
                           content.toLowerCase().includes('reset');

        expect(hasRollback).toBe(true);
      }
    });
  });
});

describe('Workflow Content Quality', () => {
  let workflowFiles: string[];

  beforeAll(() => {
    workflowFiles = getWorkflowFiles();
  });

  describe('Minimum Content', () => {
    test('workflows should have substantial content', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);

        // Minimum 200 lines for a complete workflow
        const lineCount = content.split('\n').length;
        expect(lineCount).toBeGreaterThanOrEqual(200);
      }
    });

    test('workflows should have multiple steps', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);

        // Count step mentions
        const stepMatches = content.match(/Step\s+\d+/gi) || [];
        expect(stepMatches.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('Console Path Instructions', () => {
    test('workflows should include console navigation paths', () => {
      for (const filePath of workflowFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);

        // Should have Console Path or navigation instructions
        const hasConsolePath = content.includes('Console Path') ||
                              content.includes('Navigate to') ||
                              content.includes('/web/workspaces');

        expect(hasConsolePath).toBe(true);
      }
    });
  });
});
