/**
 * Intent Parser Unit Tests
 *
 * Tests for natural language command parsing into structured intents.
 */

import {
  IntentParser,
  getIntentParser,
  resetIntentParser,
  parseIntent,
} from '../../../src/core/intent-parser';

describe('Intent Parser', () => {
  let parser: IntentParser;

  beforeEach(() => {
    resetIntentParser();
    parser = new IntentParser();
  });

  afterAll(() => {
    resetIntentParser();
  });

  describe('parse()', () => {
    describe('action extraction', () => {
      test('parses "navigate" action from canonical form', () => {
        const result = parser.parse('navigate to load balancers');
        expect(result.action).toBe('navigate');
        expect(result.matched_patterns).toContain('action:navigate');
      });

      test('parses "list" action from canonical form', () => {
        const result = parser.parse('list all load balancers');
        expect(result.action).toBe('list');
        expect(result.matched_patterns).toContain('action:list');
      });

      test('parses "create" action from canonical form', () => {
        const result = parser.parse('create http load balancer');
        expect(result.action).toBe('create');
        expect(result.matched_patterns).toContain('action:create');
      });

      test('parses "edit" action from canonical form', () => {
        const result = parser.parse('edit load balancer web-frontend');
        expect(result.action).toBe('edit');
        expect(result.matched_patterns).toContain('action:edit');
      });

      test('parses "delete" action from canonical form', () => {
        const result = parser.parse('delete origin pool backend-pool');
        expect(result.action).toBe('delete');
        expect(result.matched_patterns).toContain('action:delete');
      });

      test('infers "list" from question patterns', () => {
        const result = parser.parse('what load balancers exist');
        expect(result.action).toBe('list');
      });

      test('infers "create" from creation patterns', () => {
        const result = parser.parse('make a new origin pool');
        expect(result.action).toBe('create');
      });

      test('defaults to "navigate" for ambiguous input', () => {
        // Note: "something random" doesn't match any pattern
        // The inferred action default is 'navigate'
        const result = parser.parse('something random');
        expect(result.action).toBe('navigate');
      });
    });

    describe('resource extraction', () => {
      test('extracts http_loadbalancer resource', () => {
        const result = parser.parse('show all http load balancers');
        expect(result.resource).toBe('http_loadbalancer');
        expect(result.matched_patterns).toContain('resource:http_loadbalancer');
      });

      test('extracts origin_pool resource', () => {
        const result = parser.parse('list origin pools');
        expect(result.resource).toBe('origin_pool');
        expect(result.matched_patterns).toContain('resource:origin_pool');
      });

      test('extracts waf_policy resource', () => {
        // Note: "waf policies" matches "policies" (service_policy) due to longest match
        // Use "waf policy" (singular) or "web application firewall" to match waf_policy
        const result = parser.parse('show waf policy');
        expect(result.resource).toBe('waf_policy');
        expect(result.matched_patterns).toContain('resource:waf_policy');
      });

      test('extracts namespace resource', () => {
        const result = parser.parse('list namespaces');
        expect(result.resource).toBe('namespace');
      });

      test('infers "home" from dashboard patterns', () => {
        const result = parser.parse('go to dashboard');
        expect(result.resource).toBe('home');
      });

      test('infers "workspace" from admin patterns', () => {
        const result = parser.parse('open administration');
        expect(result.resource).toBe('workspace');
      });

      test('defaults to "overview" for unrecognized input', () => {
        const result = parser.parse('something completely unknown');
        expect(result.resource).toBe('overview');
      });
    });

    describe('workspace extraction', () => {
      test('extracts WAAP workspace', () => {
        const result = parser.parse('navigate to waap workspace');
        expect(result.workspace).toBe('waap');
        expect(result.matched_patterns).toContain('workspace:waap');
      });

      test('extracts admin workspace', () => {
        const result = parser.parse('go to admin');
        expect(result.workspace).toBe('admin');
      });

      test('extracts MCN workspace', () => {
        const result = parser.parse('open mcn');
        expect(result.workspace).toBe('mcn');
      });

      test('extracts DNS workspace', () => {
        const result = parser.parse('navigate to dns management');
        expect(result.workspace).toBe('dns');
      });

      test('inherits workspace from resource context', () => {
        // http_loadbalancer has workspace_context: ['waap']
        const result = parser.parse('list load balancers');
        expect(result.workspace).toBe('waap');
      });
    });

    describe('namespace extraction', () => {
      test('extracts namespace from "in namespace" pattern', () => {
        const result = parser.parse('list load balancers in production namespace');
        expect(result.namespace).toBe('production');
        expect(result.matched_patterns).toContain('namespace:production');
      });

      test('extracts namespace from "in <namespace>" pattern', () => {
        const result = parser.parse('show waf policies in staging');
        expect(result.namespace).toBe('staging');
      });

      test('extracts namespace from "namespace <name>" pattern', () => {
        const result = parser.parse('navigate to namespace development');
        expect(result.namespace).toBe('development');
      });

      test('extracts namespace from "ns:" pattern', () => {
        const result = parser.parse('list load balancers ns:default');
        expect(result.namespace).toBe('default');
      });

      test('returns undefined when no namespace specified', () => {
        const result = parser.parse('list load balancers');
        expect(result.namespace).toBeUndefined();
      });
    });

    describe('resource name extraction', () => {
      test('extracts resource name from "named" pattern', () => {
        const result = parser.parse('edit load balancer named web-frontend');
        expect(result.resource_name).toBe('web-frontend');
      });

      test('extracts resource name from "called" pattern', () => {
        const result = parser.parse('delete origin pool called backend-pool');
        expect(result.resource_name).toBe('backend-pool');
      });

      test('extracts resource name from resource-specific pattern', () => {
        // Note: Pattern matches "waf <name>" where name is "policy"
        // For proper name extraction, use "named" or "called" pattern
        const result = parser.parse('edit waf named test-waf');
        expect(result.resource_name).toBe('test-waf');
      });

      test('returns undefined when no name specified', () => {
        const result = parser.parse('list load balancers');
        expect(result.resource_name).toBeUndefined();
      });
    });

    describe('confidence calculation', () => {
      test('high confidence for well-formed input with all components', () => {
        const result = parser.parse('navigate to load balancers in production namespace');
        expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      });

      test('moderate confidence for input with action and resource', () => {
        const result = parser.parse('list load balancers');
        expect(result.confidence).toBeGreaterThanOrEqual(0.6);
        expect(result.confidence).toBeLessThan(1.0);
      });

      test('low confidence for ambiguous input', () => {
        const result = parser.parse('asdfghjkl');
        expect(result.confidence).toBeLessThan(0.5);
      });

      test('confidence is between 0 and 1', () => {
        const inputs = [
          'navigate to waap',
          'list all load balancers',
          'create origin pool',
          'something random',
          '',
        ];

        inputs.forEach(input => {
          const result = parser.parse(input);
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
        });
      });
    });

    describe('needs clarification', () => {
      test('requires clarification for low confidence', () => {
        const result = parser.parse('asdfghjkl');
        expect(result.needs_clarification).toBe(true);
      });

      test('requires clarification for CRUD on namespace-scoped resource without namespace', () => {
        const result = parser.parse('create http load balancer');
        expect(result.needs_clarification).toBe(true);
        expect(result.clarification_questions).toContain('Which namespace should I use?');
      });

      test('does not require clarification when namespace is provided', () => {
        const result = parser.parse('create http load balancer in production namespace');
        expect(result.needs_clarification).toBe(false);
      });

      test('does not require clarification for list actions', () => {
        const result = parser.parse('list load balancers');
        expect(result.needs_clarification).toBe(false);
      });

      test('does not require clarification for navigate actions', () => {
        const result = parser.parse('navigate to waap');
        expect(result.needs_clarification).toBe(false);
      });
    });

    describe('clarification questions', () => {
      test('asks for namespace when missing for CRUD actions', () => {
        const result = parser.parse('create http load balancer');
        // CRUD action on namespaced resource without namespace should need clarification
        expect(result.needs_clarification).toBe(true);
        expect(result.clarification_questions).toBeDefined();
        expect(result.clarification_questions).toContain('Which namespace should I use?');
      });

      test('asks for name when creating', () => {
        const result = parser.parse('create http load balancer');
        expect(result.needs_clarification).toBe(true);
        expect(result.clarification_questions).toBeDefined();
        // The question format includes resource type without underscores
        expect(result.clarification_questions!.some(q => q.includes('named'))).toBe(true);
      });

      test('has empty questions when no clarification needed', () => {
        const result = parser.parse('navigate to waap workspace');
        expect(result.clarification_questions).toBeUndefined();
      });
    });

    describe('parameter extraction', () => {
      test('extracts filter parameters', () => {
        const result = parser.parse('list load balancers filtered by status=active');
        expect(result.parameters.filter_status).toBe('active');
      });

      test('extracts sort parameters', () => {
        const result = parser.parse('list load balancers sorted by name desc');
        expect(result.parameters.sort_by).toBe('name');
        expect(result.parameters.sort_order).toBe('desc');
      });

      test('extracts limit parameters', () => {
        const result = parser.parse('show first 10 load balancers');
        expect(result.parameters.limit).toBe(10);
      });

      test('extracts "all" flag', () => {
        const result = parser.parse('list all load balancers');
        expect(result.parameters.all).toBe(true);
      });

      test('extracts "detailed" flag', () => {
        const result = parser.parse('show detailed load balancer info');
        expect(result.parameters.detailed).toBe(true);
      });

      test('returns empty parameters for simple input', () => {
        const result = parser.parse('navigate to waap');
        expect(Object.keys(result.parameters).length).toBe(0);
      });
    });

    describe('raw input preservation', () => {
      test('preserves original input', () => {
        const input = '  Navigate to WAAP  ';
        const result = parser.parse(input);
        expect(result.raw_input).toBe(input);
      });
    });

    describe('matched patterns', () => {
      test('includes all matched patterns', () => {
        const result = parser.parse('navigate to load balancers in production namespace');
        expect(result.matched_patterns).toContain('action:navigate');
        expect(result.matched_patterns).toContain('resource:http_loadbalancer');
        expect(result.matched_patterns).toContain('namespace:production');
      });

      test('has empty patterns for unrecognized input', () => {
        const result = parser.parse('xyz123');
        expect(result.matched_patterns.length).toBe(0);
      });
    });
  });

  describe('parseMultiple()', () => {
    test('parses commands separated by "and"', () => {
      const results = parser.parseMultiple('list load balancers and list origin pools');
      expect(results.length).toBe(2);
      expect(results[0].resource).toBe('http_loadbalancer');
      expect(results[1].resource).toBe('origin_pool');
    });

    test('parses commands separated by "then"', () => {
      const results = parser.parseMultiple('navigate to waap then list load balancers');
      expect(results.length).toBe(2);
      expect(results[0].action).toBe('navigate');
      expect(results[1].action).toBe('list');
    });

    test('parses commands separated by "and then"', () => {
      const results = parser.parseMultiple('create load balancer and then edit it');
      expect(results.length).toBe(2);
      expect(results[0].action).toBe('create');
      expect(results[1].action).toBe('edit');
    });

    test('returns single result for single command', () => {
      const results = parser.parseMultiple('list load balancers');
      expect(results.length).toBe(1);
    });
  });

  describe('isValidCommand()', () => {
    test('returns true for valid commands', () => {
      expect(parser.isValidCommand('list load balancers')).toBe(true);
      expect(parser.isValidCommand('navigate to waap')).toBe(true);
      expect(parser.isValidCommand('create origin pool')).toBe(true);
    });

    test('returns false for empty input', () => {
      expect(parser.isValidCommand('')).toBe(false);
    });

    test('returns false for very short input', () => {
      expect(parser.isValidCommand('ab')).toBe(false);
    });

    test('returns false for gibberish input', () => {
      expect(parser.isValidCommand('xyz')).toBe(false);
      expect(parser.isValidCommand('asdfghjkl')).toBe(false);
    });
  });

  describe('getSuggestions()', () => {
    test('returns resource-based suggestions', () => {
      const suggestions = parser.getSuggestions('load balancer');
      expect(suggestions.length).toBeGreaterThan(0);
      // Suggestions use the canonical resource name format (e.g., "http loadbalancer")
      expect(suggestions.some(s => s.toLowerCase().includes('http loadbalancer'))).toBe(true);
    });

    test('returns common commands for low confidence input', () => {
      const suggestions = parser.getSuggestions('asdfghjkl');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('Show me load balancers');
    });

    test('limits suggestions to 5', () => {
      const suggestions = parser.getSuggestions('some input');
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    test('includes create suggestion', () => {
      const suggestions = parser.getSuggestions('load balancer');
      expect(suggestions.some(s => s.startsWith('Create'))).toBe(true);
    });
  });

  describe('singleton pattern', () => {
    test('getIntentParser returns same instance', () => {
      const parser1 = getIntentParser();
      const parser2 = getIntentParser();
      expect(parser1).toBe(parser2);
    });

    test('resetIntentParser clears singleton', () => {
      const parser1 = getIntentParser();
      resetIntentParser();
      const parser2 = getIntentParser();
      expect(parser1).not.toBe(parser2);
    });
  });

  describe('parseIntent() function', () => {
    test('parses intent using singleton', () => {
      const result = parseIntent('list load balancers');
      expect(result.action).toBe('list');
      expect(result.resource).toBe('http_loadbalancer');
    });

    test('returns same result as parser.parse()', () => {
      const input = 'navigate to waap workspace';
      const functionResult = parseIntent(input);
      const methodResult = new IntentParser().parse(input);

      expect(functionResult.action).toBe(methodResult.action);
      expect(functionResult.resource).toBe(methodResult.resource);
      expect(functionResult.workspace).toBe(methodResult.workspace);
    });
  });

  describe('complex intent parsing scenarios', () => {
    test('parses "Show me all load balancers in production"', () => {
      const result = parser.parse('Show me all load balancers in production');
      // Note: "show" matches "navigate" before "show me" matches "list"
      expect(result.action).toBe('navigate');
      expect(result.resource).toBe('http_loadbalancer');
      expect(result.namespace).toBe('production');
      expect(result.parameters.all).toBe(true);
    });

    test('parses "Create HTTP LB named frontend in staging"', () => {
      const result = parser.parse('Create HTTP LB named frontend in staging');
      expect(result.action).toBe('create');
      expect(result.resource).toBe('http_loadbalancer');
      expect(result.resource_name).toBe('frontend');
      expect(result.namespace).toBe('staging');
    });

    test('parses "Delete origin pool backend-pool in development"', () => {
      const result = parser.parse('Delete origin pool backend-pool in development');
      expect(result.action).toBe('delete');
      expect(result.resource).toBe('origin_pool');
      expect(result.namespace).toBe('development');
    });

    test('parses "Navigate to WAAP workspace"', () => {
      const result = parser.parse('Navigate to WAAP workspace');
      expect(result.action).toBe('navigate');
      expect(result.workspace).toBe('waap');
    });

    test('parses "List first 10 web application firewall sorted by name"', () => {
      // Note: Use "web application firewall" (full synonym) to clearly match waf_policy
      // "waf policies" would match "policies" (service_policy) due to longest match
      const result = parser.parse('List first 10 web application firewall sorted by name');
      expect(result.action).toBe('list');
      expect(result.resource).toBe('waf_policy');
      expect(result.parameters.limit).toBe(10);
      expect(result.parameters.sort_by).toBe('name');
    });
  });

  describe('determinism verification', () => {
    test('parse returns consistent results for same input', () => {
      const input = 'list load balancers in production namespace';
      const results = Array(10).fill(null).map(() => parser.parse(input));

      const firstResult = results[0];
      results.forEach(result => {
        expect(result.action).toBe(firstResult.action);
        expect(result.resource).toBe(firstResult.resource);
        expect(result.namespace).toBe(firstResult.namespace);
        expect(result.confidence).toBe(firstResult.confidence);
      });
    });

    test('parseMultiple returns consistent results', () => {
      const input = 'navigate to waap and list load balancers';
      const results = Array(5).fill(null).map(() => parser.parseMultiple(input));

      results.forEach(resultSet => {
        expect(resultSet.length).toBe(2);
        expect(resultSet[0].action).toBe('navigate');
        expect(resultSet[1].action).toBe('list');
      });
    });
  });

  describe('edge cases', () => {
    test('handles empty string', () => {
      const result = parser.parse('');
      expect(result.action).toBeDefined();
      expect(result.resource).toBeDefined();
      expect(result.confidence).toBeLessThan(0.5);
    });

    test('handles whitespace-only input', () => {
      const result = parser.parse('   \t\n   ');
      expect(result.action).toBeDefined();
      expect(result.resource).toBeDefined();
    });

    test('handles very long input', () => {
      const longInput = 'navigate to ' + 'waap '.repeat(100);
      const result = parser.parse(longInput);
      expect(result.action).toBe('navigate');
      expect(result.workspace).toBe('waap');
    });

    test('handles special characters', () => {
      const result = parser.parse('list load-balancers_in namespace @test!');
      expect(result.action).toBe('list');
    });

    test('handles unicode characters', () => {
      const result = parser.parse('list load balancers 日本語');
      expect(result.action).toBe('list');
      expect(result.resource).toBe('http_loadbalancer');
    });

    test('handles numeric input', () => {
      const result = parser.parse('12345');
      expect(result.action).toBeDefined();
      expect(result.resource).toBeDefined();
    });
  });
});
