/**
 * Intent Parser
 *
 * Parses natural language commands into structured intents for
 * deterministic navigation and automation.
 */

import {
  ParsedIntent,
  ActionVerb,
  ResourceType,
  WorkspaceId,
} from '../types';
import {
  extractAction,
  extractResource,
  extractWorkspace,
  extractNamespace,
  extractResourceName,
  tokenize,
} from '../utils/pattern-matcher';

/**
 * Minimum confidence threshold for accepting a parse result
 */
const MIN_CONFIDENCE = 0.5;

/**
 * Intent parser class
 */
export class IntentParser {
  /**
   * Parse a natural language command into a structured intent
   */
  parse(input: string): ParsedIntent {
    const normalizedInput = input.trim();

    // Extract components
    const actionResult = extractAction(normalizedInput);
    const resourceResult = extractResource(normalizedInput);
    const workspaceResult = extractWorkspace(normalizedInput);
    const namespaceResult = extractNamespace(normalizedInput);
    const resourceNameResult = extractResourceName(normalizedInput);

    // Determine action (default to 'list' for queries)
    const action = actionResult?.action ?? this.inferAction(normalizedInput);
    const actionConfidence = actionResult?.confidence ?? 0.5;

    // Determine resource (required)
    const resource = resourceResult?.resource ?? this.inferResource(normalizedInput);
    const resourceConfidence = resourceResult?.confidence ?? 0.3;

    // Calculate overall confidence
    const confidence = this.calculateConfidence({
      action: actionConfidence,
      resource: resourceConfidence,
      workspace: workspaceResult?.confidence,
      namespace: namespaceResult?.confidence,
    });

    // Build matched patterns list
    const matchedPatterns: string[] = [];
    if (actionResult) matchedPatterns.push(`action:${actionResult.action}`);
    if (resourceResult) matchedPatterns.push(`resource:${resourceResult.resource}`);
    if (workspaceResult) matchedPatterns.push(`workspace:${workspaceResult.workspace}`);
    if (namespaceResult) matchedPatterns.push(`namespace:${namespaceResult.namespace}`);

    // Determine if clarification is needed
    const needsClarification = this.needsClarification({
      action,
      resource,
      confidence,
      hasNamespace: !!namespaceResult,
    });

    // Build clarification questions if needed
    const clarificationQuestions = needsClarification
      ? this.buildClarificationQuestions({
          action,
          resource,
          hasNamespace: !!namespaceResult,
          hasWorkspace: !!workspaceResult,
        })
      : undefined;

    // Extract any additional parameters
    const parameters = this.extractParameters(normalizedInput);

    return {
      action,
      resource,
      resource_name: resourceNameResult?.name,
      namespace: namespaceResult?.namespace,
      workspace: workspaceResult?.workspace ?? resourceResult?.workspace,
      parameters,
      confidence,
      matched_patterns: matchedPatterns,
      raw_input: input,
      needs_clarification: needsClarification,
      clarification_questions: clarificationQuestions,
    };
  }

  /**
   * Infer action from input when no explicit match found
   */
  private inferAction(input: string): ActionVerb {
    const lower = input.toLowerCase();

    // Question patterns suggest listing/viewing
    if (lower.match(/^(what|where|which|show|list|find|get)/)) {
      return 'list';
    }

    // Creation patterns
    if (lower.match(/^(create|add|new|make|deploy|set up)/)) {
      return 'create';
    }

    // Modification patterns
    if (lower.match(/^(edit|update|modify|change|configure)/)) {
      return 'edit';
    }

    // Deletion patterns
    if (lower.match(/^(delete|remove|destroy)/)) {
      return 'delete';
    }

    // Navigation is the default
    return 'navigate';
  }

  /**
   * Infer resource from input when no explicit match found
   */
  private inferResource(input: string): ResourceType {
    const lower = input.toLowerCase();

    // Check for workspace-like navigation
    if (lower.match(/home|dashboard|main/)) {
      return 'home';
    }

    if (lower.match(/admin|administration|settings/)) {
      return 'workspace';
    }

    // Default to overview
    return 'overview';
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(scores: {
    action: number;
    resource: number;
    workspace?: number;
    namespace?: number;
  }): number {
    const weights = {
      action: 0.3,
      resource: 0.4,
      workspace: 0.15,
      namespace: 0.15,
    };

    let totalWeight = weights.action + weights.resource;
    let weightedSum = scores.action * weights.action + scores.resource * weights.resource;

    if (scores.workspace !== undefined) {
      weightedSum += scores.workspace * weights.workspace;
      totalWeight += weights.workspace;
    }

    if (scores.namespace !== undefined) {
      weightedSum += scores.namespace * weights.namespace;
      totalWeight += weights.namespace;
    }

    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  /**
   * Determine if clarification is needed
   */
  private needsClarification(context: {
    action: ActionVerb;
    resource: ResourceType;
    confidence: number;
    hasNamespace: boolean;
  }): boolean {
    // Low confidence always needs clarification
    if (context.confidence < MIN_CONFIDENCE) {
      return true;
    }

    // CRUD actions on namespace-scoped resources need namespace
    const crudActions: ActionVerb[] = ['create', 'edit', 'delete', 'clone'];
    const namespacedResources: ResourceType[] = [
      'http_loadbalancer',
      'tcp_loadbalancer',
      'origin_pool',
      'health_check',
      'waf_policy',
      'app_firewall',
      'service_policy',
      'rate_limiter',
    ];

    if (
      crudActions.includes(context.action) &&
      namespacedResources.includes(context.resource) &&
      !context.hasNamespace
    ) {
      return true;
    }

    return false;
  }

  /**
   * Build clarification questions based on missing information
   */
  private buildClarificationQuestions(context: {
    action: ActionVerb;
    resource: ResourceType;
    hasNamespace: boolean;
    hasWorkspace: boolean;
  }): string[] {
    const questions: string[] = [];

    if (!context.hasNamespace) {
      questions.push('Which namespace should I use?');
    }

    if (!context.hasWorkspace && context.resource === 'workspace') {
      questions.push('Which workspace would you like to navigate to?');
    }

    if (context.action === 'create') {
      questions.push(`What should the ${context.resource.replace(/_/g, ' ')} be named?`);
    }

    return questions;
  }

  /**
   * Extract additional parameters from input
   */
  private extractParameters(input: string): Record<string, string | boolean | number> {
    const params: Record<string, string | boolean | number> = {};

    // Extract filter patterns
    const filterMatch = input.match(/filter(?:ed)?\s+by\s+(\w+)\s*[=:]\s*["']?([^"'\s]+)["']?/i);
    if (filterMatch) {
      params[`filter_${filterMatch[1]}`] = filterMatch[2];
    }

    // Extract sort patterns
    const sortMatch = input.match(/sort(?:ed)?\s+by\s+(\w+)(?:\s+(asc|desc))?/i);
    if (sortMatch) {
      params.sort_by = sortMatch[1];
      params.sort_order = sortMatch[2]?.toLowerCase() ?? 'asc';
    }

    // Extract limit patterns
    const limitMatch = input.match(/(?:first|top|limit)\s+(\d+)/i);
    if (limitMatch) {
      params.limit = parseInt(limitMatch[1], 10);
    }

    // Extract flags
    if (input.match(/\ball\b/i)) {
      params.all = true;
    }

    if (input.match(/\bdetailed?\b/i)) {
      params.detailed = true;
    }

    return params;
  }

  /**
   * Parse multiple commands (separated by "and" or "then")
   */
  parseMultiple(input: string): ParsedIntent[] {
    const separators = /\s+(?:and\s+then|then|and)\s+/i;
    const commands = input.split(separators);

    return commands.map(cmd => this.parse(cmd.trim()));
  }

  /**
   * Check if input is a valid command
   */
  isValidCommand(input: string): boolean {
    if (!input || input.trim().length < 3) {
      return false;
    }

    const parsed = this.parse(input);
    return parsed.confidence >= MIN_CONFIDENCE;
  }

  /**
   * Get suggestions for ambiguous input
   */
  getSuggestions(input: string): string[] {
    const parsed = this.parse(input);
    const suggestions: string[] = [];

    // Suggest based on detected resource
    if (parsed.resource) {
      const resourceName = parsed.resource.replace(/_/g, ' ');

      suggestions.push(`Show me all ${resourceName}s`);
      suggestions.push(`Create a new ${resourceName}`);
      suggestions.push(`List ${resourceName}s in default namespace`);
    }

    // Suggest common commands
    if (parsed.confidence < 0.5) {
      suggestions.push('Show me load balancers');
      suggestions.push('Navigate to WAAP workspace');
      suggestions.push('List origin pools in default namespace');
      suggestions.push('Go to administration');
    }

    return suggestions.slice(0, 5);
  }
}

/**
 * Singleton instance
 */
let defaultParser: IntentParser | null = null;

/**
 * Get the default intent parser instance
 */
export function getIntentParser(): IntentParser {
  if (!defaultParser) {
    defaultParser = new IntentParser();
  }
  return defaultParser;
}

/**
 * Reset the default parser (useful for testing)
 */
export function resetIntentParser(): void {
  defaultParser = null;
}

/**
 * Quick parse function for simple usage
 */
export function parseIntent(input: string): ParsedIntent {
  return getIntentParser().parse(input);
}
