// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Intent Factory
 *
 * Generates test intents for unit testing.
 * Provides builders for creating realistic ParsedIntent objects.
 */

import type {
  ParsedIntent,
  ActionVerb,
  ResourceType,
  WorkspaceId,
  ExecutionPlan,
  BrowserAction,
  URLResolution,
} from '../../src/types';

/**
 * Intent builder for creating test intents
 */
export class IntentBuilder {
  private intent: ParsedIntent = {
    action: 'navigate',
    resource: 'workspace',
    parameters: {},
    confidence: 0.9,
    matched_patterns: [],
    raw_input: '',
    needs_clarification: false,
  };

  /**
   * Set the action verb
   */
  withAction(action: ActionVerb): this {
    this.intent.action = action;
    return this;
  }

  /**
   * Set the resource type
   */
  withResource(resource: ResourceType): this {
    this.intent.resource = resource;
    return this;
  }

  /**
   * Set the resource name
   */
  withResourceName(name: string): this {
    this.intent.resource_name = name;
    return this;
  }

  /**
   * Set the namespace
   */
  withNamespace(namespace: string): this {
    this.intent.namespace = namespace;
    return this;
  }

  /**
   * Set the workspace
   */
  withWorkspace(workspace: WorkspaceId): this {
    this.intent.workspace = workspace;
    return this;
  }

  /**
   * Set a parameter
   */
  withParameter(key: string, value: string | boolean | number): this {
    this.intent.parameters[key] = value;
    return this;
  }

  /**
   * Set the confidence score
   */
  withConfidence(confidence: number): this {
    this.intent.confidence = confidence;
    return this;
  }

  /**
   * Add matched patterns
   */
  withMatchedPatterns(patterns: string[]): this {
    this.intent.matched_patterns = patterns;
    return this;
  }

  /**
   * Set the raw input
   */
  withRawInput(input: string): this {
    this.intent.raw_input = input;
    return this;
  }

  /**
   * Set needs clarification flag
   */
  withNeedsClarification(needs: boolean, questions?: string[]): this {
    this.intent.needs_clarification = needs;
    this.intent.clarification_questions = questions;
    return this;
  }

  /**
   * Build the intent
   */
  build(): ParsedIntent {
    return { ...this.intent };
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.intent = {
      action: 'navigate',
      resource: 'workspace',
      parameters: {},
      confidence: 0.9,
      matched_patterns: [],
      raw_input: '',
      needs_clarification: false,
    };
    return this;
  }
}

/**
 * Create a navigation intent
 */
export function createNavigateIntent(
  resource: ResourceType,
  options: {
    namespace?: string;
    workspace?: WorkspaceId;
    resourceName?: string;
    confidence?: number;
    rawInput?: string;
  } = {}
): ParsedIntent {
  const builder = new IntentBuilder()
    .withAction('navigate')
    .withResource(resource)
    .withConfidence(options.confidence ?? 0.9)
    .withRawInput(options.rawInput ?? `navigate to ${resource}`);

  if (options.namespace) builder.withNamespace(options.namespace);
  if (options.workspace) builder.withWorkspace(options.workspace);
  if (options.resourceName) builder.withResourceName(options.resourceName);

  return builder.build();
}

/**
 * Create a list intent
 */
export function createListIntent(
  resource: ResourceType,
  options: {
    namespace?: string;
    workspace?: WorkspaceId;
    confidence?: number;
    rawInput?: string;
  } = {}
): ParsedIntent {
  const builder = new IntentBuilder()
    .withAction('list')
    .withResource(resource)
    .withConfidence(options.confidence ?? 0.85)
    .withRawInput(options.rawInput ?? `show me ${resource}s`);

  if (options.namespace) builder.withNamespace(options.namespace);
  if (options.workspace) builder.withWorkspace(options.workspace);

  return builder.build();
}

/**
 * Create a create intent
 */
export function createCreateIntent(
  resource: ResourceType,
  options: {
    resourceName?: string;
    namespace?: string;
    workspace?: WorkspaceId;
    confidence?: number;
    rawInput?: string;
  } = {}
): ParsedIntent {
  const builder = new IntentBuilder()
    .withAction('create')
    .withResource(resource)
    .withConfidence(options.confidence ?? 0.9)
    .withRawInput(options.rawInput ?? `create ${resource}`);

  if (options.resourceName) builder.withResourceName(options.resourceName);
  if (options.namespace) builder.withNamespace(options.namespace);
  if (options.workspace) builder.withWorkspace(options.workspace);

  return builder.build();
}

/**
 * Create a delete intent
 */
export function createDeleteIntent(
  resource: ResourceType,
  resourceName: string,
  options: {
    namespace?: string;
    workspace?: WorkspaceId;
    confidence?: number;
    rawInput?: string;
  } = {}
): ParsedIntent {
  const builder = new IntentBuilder()
    .withAction('delete')
    .withResource(resource)
    .withResourceName(resourceName)
    .withConfidence(options.confidence ?? 0.85)
    .withRawInput(options.rawInput ?? `delete ${resource} ${resourceName}`);

  if (options.namespace) builder.withNamespace(options.namespace);
  if (options.workspace) builder.withWorkspace(options.workspace);

  return builder.build();
}

/**
 * Create an edit intent
 */
export function createEditIntent(
  resource: ResourceType,
  resourceName: string,
  options: {
    namespace?: string;
    workspace?: WorkspaceId;
    confidence?: number;
    rawInput?: string;
  } = {}
): ParsedIntent {
  const builder = new IntentBuilder()
    .withAction('edit')
    .withResource(resource)
    .withResourceName(resourceName)
    .withConfidence(options.confidence ?? 0.85)
    .withRawInput(options.rawInput ?? `edit ${resource} ${resourceName}`);

  if (options.namespace) builder.withNamespace(options.namespace);
  if (options.workspace) builder.withWorkspace(options.workspace);

  return builder.build();
}

/**
 * Create a low confidence intent
 */
export function createLowConfidenceIntent(rawInput: string): ParsedIntent {
  return new IntentBuilder()
    .withAction('navigate')
    .withResource('workspace')
    .withConfidence(0.2)
    .withRawInput(rawInput)
    .withNeedsClarification(true, ['What would you like to do?', 'Which resource are you referring to?'])
    .build();
}

/**
 * Create a URL resolution result
 */
export function createUrlResolution(
  url: string,
  options: {
    isComplete?: boolean;
    unresolvedVariables?: string[];
    resolutionSource?: URLResolution['resolution_source'];
    postNavigationActions?: BrowserAction[];
  } = {}
): URLResolution {
  return {
    url,
    is_complete: options.isComplete ?? true,
    unresolved_variables: options.unresolvedVariables,
    resolution_source: options.resolutionSource ?? 'shortcut',
    post_navigation_actions: options.postNavigationActions,
  };
}

/**
 * Create a browser action
 */
export function createBrowserAction(
  type: BrowserAction['type'],
  description: string,
  options: Partial<BrowserAction> = {}
): BrowserAction {
  return {
    type,
    description,
    required: options.required ?? true,
    ...options,
  };
}

/**
 * Create an execution plan
 */
export function createExecutionPlan(
  intent: ParsedIntent,
  urlResolution: URLResolution,
  actions: BrowserAction[] = []
): ExecutionPlan {
  return {
    intent,
    url_resolution: urlResolution,
    actions,
    estimated_duration_ms: actions.length * 500,
    requires_auth: true,
  };
}

/**
 * Intent factory singleton
 */
export const intentFactory = {
  builder: () => new IntentBuilder(),
  navigate: createNavigateIntent,
  list: createListIntent,
  create: createCreateIntent,
  delete: createDeleteIntent,
  edit: createEditIntent,
  lowConfidence: createLowConfidenceIntent,
  urlResolution: createUrlResolution,
  browserAction: createBrowserAction,
  executionPlan: createExecutionPlan,
};
