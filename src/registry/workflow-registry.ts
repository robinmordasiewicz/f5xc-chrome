/**
 * Workflow Registry
 *
 * Parses workflow markdown files and provides query/lookup capabilities.
 * Workflows define step-by-step procedures for F5 XC Console operations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ActionVerb, ResourceType, WorkspaceId, BrowserAction } from '../types';

/**
 * Workflow metadata from YAML frontmatter
 */
export interface WorkflowMetadata {
  /** Workflow title */
  title: string;
  /** Description */
  description: string;
  /** Version */
  version: string;
  /** Last updated date */
  last_updated: string;
  /** Category (e.g., "Load Balancing", "Security") */
  category: string;
  /** Complexity level */
  complexity: 'Beginner' | 'Intermediate' | 'Advanced';
  /** Estimated duration */
  estimated_duration: string;
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  /** Step number */
  number: number;
  /** Step title */
  title: string;
  /** Console path (if navigation step) */
  console_path?: string;
  /** Detailed instructions */
  details: string[];
  /** Verification criteria */
  verify?: string[];
  /** Raw markdown content */
  raw_content: string;
}

/**
 * Input parameter definition
 */
export interface WorkflowParameter {
  /** Parameter name */
  name: string;
  /** Example value */
  example_value: string | boolean | number;
  /** Parameter type */
  type: 'string' | 'boolean' | 'number' | 'array';
  /** Whether required */
  required: boolean;
}

/**
 * Complete workflow definition
 */
export interface Workflow {
  /** Workflow identifier (filename without extension) */
  id: string;
  /** File path */
  file_path: string;
  /** Metadata from frontmatter */
  metadata: WorkflowMetadata;
  /** Overview text */
  overview: string;
  /** Prerequisites */
  prerequisites: string[];
  /** Input parameters */
  parameters: WorkflowParameter[];
  /** Workflow steps */
  steps: WorkflowStep[];
  /** Success criteria */
  success_criteria: string[];
  /** Related workflows */
  related_workflows: string[];
  /** Keywords for search */
  keywords: string[];
  /** Raw markdown content */
  raw_content: string;
}

/**
 * Workflow search result
 */
export interface WorkflowSearchResult {
  /** Matched workflow */
  workflow: Workflow;
  /** Match score 0-1 */
  score: number;
  /** Which parts matched */
  matched_on: ('title' | 'description' | 'keywords' | 'category' | 'parameters')[];
}

/**
 * Workflow registry options
 */
export interface WorkflowRegistryOptions {
  /** Directory containing workflow files */
  workflows_dir?: string;
  /** File extension to look for */
  file_extension?: string;
  /** Whether to watch for changes */
  watch?: boolean;
}

/**
 * Default workflow directory path
 */
const DEFAULT_WORKFLOWS_DIR = 'skills/xc-console/workflows';

/**
 * Workflow Registry class
 */
export class WorkflowRegistry {
  private workflows: Map<string, Workflow> = new Map();
  private workflowsDir: string;
  private fileExtension: string;
  private loaded: boolean = false;

  constructor(options: WorkflowRegistryOptions = {}) {
    this.workflowsDir = options.workflows_dir ?? DEFAULT_WORKFLOWS_DIR;
    this.fileExtension = options.file_extension ?? '.md';
  }

  /**
   * Load all workflows from the directory
   */
  async loadWorkflows(): Promise<number> {
    this.workflows.clear();

    if (!fs.existsSync(this.workflowsDir)) {
      console.warn(`Workflows directory not found: ${this.workflowsDir}`);
      this.loaded = true;
      return 0;
    }

    const files = fs.readdirSync(this.workflowsDir)
      .filter(f => f.endsWith(this.fileExtension));

    for (const file of files) {
      try {
        const filePath = path.join(this.workflowsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const workflow = this.parseWorkflow(file, filePath, content);
        this.workflows.set(workflow.id, workflow);
      } catch (error) {
        console.error(`Error parsing workflow ${file}:`, error);
      }
    }

    this.loaded = true;
    return this.workflows.size;
  }

  /**
   * Parse a workflow from markdown content
   */
  private parseWorkflow(filename: string, filePath: string, content: string): Workflow {
    const id = filename.replace(this.fileExtension, '');

    // Parse YAML frontmatter
    const metadata = this.parseFrontmatter(content);

    // Parse sections
    const overview = this.parseSection(content, '## Overview', '##') || '';
    const prerequisites = this.parsePrerequisites(content);
    const parameters = this.parseParameters(content);
    const steps = this.parseSteps(content);
    const successCriteria = this.parseSuccessCriteria(content);
    const relatedWorkflows = this.parseRelatedWorkflows(content);
    const keywords = this.extractKeywords(metadata, overview, steps);

    return {
      id,
      file_path: filePath,
      metadata,
      overview,
      prerequisites,
      parameters,
      steps,
      success_criteria: successCriteria,
      related_workflows: relatedWorkflows,
      keywords,
      raw_content: content,
    };
  }

  /**
   * Parse YAML frontmatter
   */
  private parseFrontmatter(content: string): WorkflowMetadata {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    const defaults: WorkflowMetadata = {
      title: 'Untitled Workflow',
      description: '',
      version: '1.0.0',
      last_updated: new Date().toISOString().split('T')[0],
      category: 'General',
      complexity: 'Beginner',
      estimated_duration: '5-10 minutes',
    };

    if (!frontmatterMatch) {
      return defaults;
    }

    const yaml = frontmatterMatch[1];
    const metadata = { ...defaults };

    // Simple YAML parsing (key: value)
    const lines = yaml.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        switch (key) {
          case 'title':
            metadata.title = value.trim();
            break;
          case 'description':
            metadata.description = value.trim();
            break;
          case 'version':
            metadata.version = value.trim();
            break;
          case 'last_updated':
            metadata.last_updated = value.trim();
            break;
          case 'category':
            metadata.category = value.trim();
            break;
          case 'complexity':
            metadata.complexity = value.trim() as WorkflowMetadata['complexity'];
            break;
          case 'estimated_duration':
            metadata.estimated_duration = value.trim();
            break;
        }
      }
    }

    return metadata;
  }

  /**
   * Parse a section by header
   */
  private parseSection(content: string, startHeader: string, endPattern: string): string | null {
    const startRegex = new RegExp(`${startHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n`, 'i');
    const startMatch = content.match(startRegex);

    if (!startMatch || startMatch.index === undefined) {
      return null;
    }

    const startIndex = startMatch.index + startMatch[0].length;
    const afterStart = content.substring(startIndex);

    // Find the next section header
    const endMatch = afterStart.match(new RegExp(`^${endPattern}\\s`, 'm'));
    const endIndex = endMatch?.index ?? afterStart.length;

    return afterStart.substring(0, endIndex).trim();
  }

  /**
   * Parse prerequisites list
   */
  private parsePrerequisites(content: string): string[] {
    const section = this.parseSection(content, '## Prerequisites', '##');
    if (!section) return [];

    const items: string[] = [];
    const lines = section.split('\n');

    for (const line of lines) {
      // Match checkbox items: - ✅ ... or - [ ] ... or - [x] ...
      const match = line.match(/^[-*]\s*(?:✅|☑️|\[x\]|\[ \])?\s*(.+)$/i);
      if (match) {
        items.push(match[1].trim());
      }
    }

    return items;
  }

  /**
   * Parse input parameters from JSON code block
   */
  private parseParameters(content: string): WorkflowParameter[] {
    const section = this.parseSection(content, '## Input Parameters', '##');
    if (!section) return [];

    // Find JSON code block
    const jsonMatch = section.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch) return [];

    try {
      const params = JSON.parse(jsonMatch[1]);
      return Object.entries(params).map(([name, value]) => ({
        name,
        example_value: value as string | boolean | number,
        type: this.inferType(value),
        required: true, // Assume required by default
      }));
    } catch {
      return [];
    }
  }

  /**
   * Infer parameter type from value
   */
  private inferType(value: unknown): 'string' | 'boolean' | 'number' | 'array' {
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    return 'string';
  }

  /**
   * Parse workflow steps
   */
  private parseSteps(content: string): WorkflowStep[] {
    const steps: WorkflowStep[] = [];

    // Match step headers: ### Step N: Title
    const stepRegex = /### Step (\d+):\s*(.+)\n([\s\S]*?)(?=### Step \d+:|## |$)/gi;
    let match;

    while ((match = stepRegex.exec(content)) !== null) {
      const [fullMatch, stepNumber, title, body] = match;

      // Parse console path
      const pathMatch = body.match(/\*\*Console Path\*\*:\s*(.+)/i);
      const consolePath = pathMatch ? pathMatch[1].trim() : undefined;

      // Parse details
      const detailsSection = this.parseSection(body, '**Details**:', '**') || '';
      const details = detailsSection
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^[-*\d.]\s*/, '').trim());

      // Parse verification
      const verifyMatch = body.match(/\*\*Verify\*\*:?\s*([\s\S]*?)(?=---|$)/i);
      const verify = verifyMatch
        ? verifyMatch[1]
            .split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => line.replace(/^[-*]\s*/, '').trim())
        : undefined;

      steps.push({
        number: parseInt(stepNumber, 10),
        title: title.trim(),
        console_path: consolePath,
        details,
        verify,
        raw_content: fullMatch,
      });
    }

    return steps;
  }

  /**
   * Parse success criteria
   */
  private parseSuccessCriteria(content: string): string[] {
    const section = this.parseSection(content, '## Success Criteria', '##');
    if (!section) return [];

    const items: string[] = [];
    const lines = section.split('\n');

    for (const line of lines) {
      // Match checkbox items: - [x] ... or - [ ] ...
      const match = line.match(/^[-*]\s*\[[x ]\]\s*(.+)$/i);
      if (match) {
        items.push(match[1].trim());
      }
    }

    return items;
  }

  /**
   * Parse related workflows
   */
  private parseRelatedWorkflows(content: string): string[] {
    const workflows: string[] = [];

    // Match workflow references like: workflow-name.md or `workflow-name.md`
    const matches = content.matchAll(/[`']?([a-z0-9-]+\.md)[`']?/gi);

    for (const match of matches) {
      const workflow = match[1].replace('.md', '');
      if (!workflows.includes(workflow)) {
        workflows.push(workflow);
      }
    }

    return workflows;
  }

  /**
   * Extract keywords for search
   */
  private extractKeywords(
    metadata: WorkflowMetadata,
    overview: string,
    steps: WorkflowStep[]
  ): string[] {
    const keywords: string[] = [];

    // Add category as keyword
    keywords.push(metadata.category.toLowerCase());

    // Extract from title
    const titleWords = metadata.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);
    keywords.push(...titleWords);

    // Extract resource types mentioned
    const resourcePatterns = [
      'http load balancer', 'load balancer', 'origin pool',
      'waf', 'firewall', 'dns', 'certificate', 'site',
      'namespace', 'bot defense', 'rate limiting', 'api protection'
    ];

    const fullText = `${metadata.title} ${metadata.description} ${overview}`.toLowerCase();
    for (const pattern of resourcePatterns) {
      if (fullText.includes(pattern)) {
        keywords.push(pattern.replace(/\s+/g, '_'));
      }
    }

    // Extract actions
    const actionPatterns = ['create', 'update', 'delete', 'add', 'remove', 'configure', 'manage'];
    for (const action of actionPatterns) {
      if (fullText.includes(action)) {
        keywords.push(action);
      }
    }

    // Deduplicate
    return [...new Set(keywords)];
  }

  /**
   * Get a workflow by ID
   */
  getWorkflow(id: string): Workflow | undefined {
    this.ensureLoaded();
    return this.workflows.get(id);
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): Workflow[] {
    this.ensureLoaded();
    return Array.from(this.workflows.values());
  }

  /**
   * Find workflows by intent
   */
  findByIntent(
    action: ActionVerb,
    resource?: ResourceType,
    workspace?: WorkspaceId
  ): WorkflowSearchResult[] {
    this.ensureLoaded();
    const results: WorkflowSearchResult[] = [];

    const actionKeyword = action.toLowerCase();
    const resourceKeyword = resource?.toLowerCase().replace(/_/g, ' ');

    for (const workflow of this.workflows.values()) {
      let score = 0;
      const matchedOn: WorkflowSearchResult['matched_on'] = [];

      // Check action match
      if (workflow.keywords.includes(actionKeyword)) {
        score += 0.3;
        matchedOn.push('keywords');
      }

      // Check resource match
      if (resourceKeyword) {
        const resourceNormalized = resourceKeyword.replace(/_/g, ' ');
        if (
          workflow.metadata.title.toLowerCase().includes(resourceNormalized) ||
          workflow.metadata.description.toLowerCase().includes(resourceNormalized)
        ) {
          score += 0.4;
          matchedOn.push('title');
        }

        if (workflow.keywords.some(k => k.includes(resourceNormalized.replace(/\s+/g, '_')))) {
          score += 0.2;
          if (!matchedOn.includes('keywords')) {
            matchedOn.push('keywords');
          }
        }
      }

      // Check category match
      if (
        resource &&
        this.categoryMatchesResource(workflow.metadata.category, resource)
      ) {
        score += 0.1;
        matchedOn.push('category');
      }

      if (score > 0) {
        results.push({ workflow, score, matched_on: matchedOn });
      }
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Check if category matches resource type
   */
  private categoryMatchesResource(category: string, resource: ResourceType): boolean {
    const categoryLower = category.toLowerCase();
    const resourceLower = resource.toLowerCase();

    const categoryMap: Record<string, string[]> = {
      'load balancing': ['http_loadbalancer', 'tcp_loadbalancer', 'origin_pool', 'health_check'],
      'security': ['waf_policy', 'app_firewall', 'service_policy', 'rate_limiter', 'api_protection', 'bot_defense'],
      'dns': ['dns_zone', 'dns_loadbalancer', 'dns_record'],
      'administration': ['user', 'group', 'role', 'credential', 'api_credential', 'quota'],
    };

    for (const [cat, resources] of Object.entries(categoryMap)) {
      if (categoryLower.includes(cat) && resources.includes(resourceLower)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Search workflows by query string
   */
  searchWorkflows(query: string): WorkflowSearchResult[] {
    this.ensureLoaded();
    const results: WorkflowSearchResult[] = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    for (const workflow of this.workflows.values()) {
      let score = 0;
      const matchedOn: WorkflowSearchResult['matched_on'] = [];

      // Check title
      if (workflow.metadata.title.toLowerCase().includes(queryLower)) {
        score += 0.5;
        matchedOn.push('title');
      }

      // Check description
      if (workflow.metadata.description.toLowerCase().includes(queryLower)) {
        score += 0.3;
        matchedOn.push('description');
      }

      // Check keywords
      for (const word of queryWords) {
        if (workflow.keywords.some(k => k.includes(word))) {
          score += 0.1;
          if (!matchedOn.includes('keywords')) {
            matchedOn.push('keywords');
          }
        }
      }

      // Check category
      if (workflow.metadata.category.toLowerCase().includes(queryLower)) {
        score += 0.1;
        matchedOn.push('category');
      }

      if (score > 0) {
        results.push({ workflow, score, matched_on: matchedOn });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Get workflow steps as browser actions
   */
  getWorkflowSteps(workflowId: string): WorkflowStep[] {
    const workflow = this.getWorkflow(workflowId);
    return workflow?.steps ?? [];
  }

  /**
   * Get workflows by category
   */
  getWorkflowsByCategory(category: string): Workflow[] {
    this.ensureLoaded();
    return Array.from(this.workflows.values())
      .filter(w => w.metadata.category.toLowerCase() === category.toLowerCase());
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    this.ensureLoaded();
    const categories = new Set<string>();
    for (const workflow of this.workflows.values()) {
      categories.add(workflow.metadata.category);
    }
    return Array.from(categories).sort();
  }

  /**
   * Ensure workflows are loaded
   */
  private ensureLoaded(): void {
    if (!this.loaded) {
      // Synchronous load for simplicity in getters
      this.loadWorkflowsSync();
    }
  }

  /**
   * Synchronous workflow loading
   */
  private loadWorkflowsSync(): void {
    this.workflows.clear();

    if (!fs.existsSync(this.workflowsDir)) {
      this.loaded = true;
      return;
    }

    const files = fs.readdirSync(this.workflowsDir)
      .filter(f => f.endsWith(this.fileExtension));

    for (const file of files) {
      try {
        const filePath = path.join(this.workflowsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const workflow = this.parseWorkflow(file, filePath, content);
        this.workflows.set(workflow.id, workflow);
      } catch (error) {
        // Skip invalid files
      }
    }

    this.loaded = true;
  }

  /**
   * Get statistics about loaded workflows
   */
  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    byComplexity: Record<string, number>;
  } {
    this.ensureLoaded();

    const byCategory: Record<string, number> = {};
    const byComplexity: Record<string, number> = {};

    for (const workflow of this.workflows.values()) {
      byCategory[workflow.metadata.category] = (byCategory[workflow.metadata.category] || 0) + 1;
      byComplexity[workflow.metadata.complexity] = (byComplexity[workflow.metadata.complexity] || 0) + 1;
    }

    return {
      total: this.workflows.size,
      byCategory,
      byComplexity,
    };
  }
}

// Singleton instance
let workflowRegistryInstance: WorkflowRegistry | null = null;

/**
 * Get the singleton workflow registry instance
 */
export function getWorkflowRegistry(options?: WorkflowRegistryOptions): WorkflowRegistry {
  if (!workflowRegistryInstance) {
    workflowRegistryInstance = new WorkflowRegistry(options);
  }
  return workflowRegistryInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetWorkflowRegistry(): void {
  workflowRegistryInstance = null;
}

/**
 * Load workflows and return the registry
 */
export async function loadWorkflows(options?: WorkflowRegistryOptions): Promise<WorkflowRegistry> {
  const registry = getWorkflowRegistry(options);
  await registry.loadWorkflows();
  return registry;
}

/**
 * Find a workflow matching the given intent
 */
export function findWorkflowByIntent(
  action: ActionVerb,
  resource?: ResourceType,
  workspace?: WorkspaceId
): Workflow | undefined {
  const registry = getWorkflowRegistry();
  const results = registry.findByIntent(action, resource, workspace);
  return results.length > 0 ? results[0].workflow : undefined;
}
