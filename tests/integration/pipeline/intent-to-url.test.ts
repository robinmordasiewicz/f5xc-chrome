// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Integration Tests for Intent → URL Resolution Pipeline
 *
 * Tests the complete flow from natural language intent parsing
 * to URL resolution, validating component integration.
 */

import { IntentParser } from '../../../src/core/intent-parser';
import { URLRegistry } from '../../../src/registry/url-registry';
import { PageRegistry } from '../../../src/registry/page-registry';

describe('Intent to URL Resolution Pipeline', () => {
  let intentParser: IntentParser;
  let urlRegistry: URLRegistry;
  let pageRegistry: PageRegistry;

  beforeAll(() => {
    intentParser = new IntentParser();
    urlRegistry = new URLRegistry();
    pageRegistry = new PageRegistry();
  });

  describe('Intent Parsing', () => {
    test('should parse "List load balancers" intent as list action', () => {
      // Note: "show" maps to navigate, "show me" maps to list
      // Use explicit "List" for unambiguous list action
      const intent = intentParser.parse('List load balancers');

      expect(intent.action).toBe('list');
      expect(intent.resource).toContain('loadbalancer');
      expect(intent.confidence).toBeGreaterThanOrEqual(0.6);
    });

    test('should parse "Navigate to WAAP workspace" intent', () => {
      const intent = intentParser.parse('Navigate to WAAP workspace');

      expect(intent.action).toBe('navigate');
      expect(intent.confidence).toBeGreaterThanOrEqual(0.5);
    });

    test('should parse "Go to DNS management" intent', () => {
      const intent = intentParser.parse('Go to DNS management');

      expect(intent.action).toBe('navigate');
    });

    test('should parse namespaced resource intent with Find action', () => {
      // Use "Find" which explicitly maps to list
      const intent = intentParser.parse('Find HTTP load balancers in production namespace');

      expect(intent.action).toBe('list');
      expect(intent.namespace).toBe('production');
      expect(intent.confidence).toBeGreaterThanOrEqual(0.6);
    });

    test('should parse "Create HTTP load balancer" intent', () => {
      const intent = intentParser.parse('Create HTTP load balancer');

      expect(intent.action).toBe('create');
      expect(intent.resource).toContain('loadbalancer');
      expect(intent.confidence).toBeGreaterThanOrEqual(0.6);
    });

    test('should parse "Add new origin pool" intent', () => {
      const intent = intentParser.parse('Add new origin pool');

      expect(intent.action).toBe('create');
      expect(intent.resource).toContain('origin');
      expect(intent.confidence).toBeGreaterThanOrEqual(0.5);
    });

    test('should parse named resource creation intent', () => {
      const intent = intentParser.parse('Create origin pool named backend-pool');

      expect(intent.action).toBe('create');
      expect(intent.resource_name).toBe('backend-pool');
      expect(intent.confidence).toBeGreaterThanOrEqual(0.5);
    });

    test('should parse "View my-lb load balancer" intent as navigate', () => {
      // "view" is a synonym for navigate
      const intent = intentParser.parse('View my-lb load balancer');

      expect(intent.action).toBe('navigate');
      expect(intent.confidence).toBeGreaterThanOrEqual(0.5);
    });

    test('should parse "Edit test-waf WAF policy" intent', () => {
      const intent = intentParser.parse('Edit test-waf WAF policy');

      expect(intent.action).toBe('edit');
      expect(intent.resource).toContain('waf');
    });

    test('should parse "Delete origin pool old-backend" intent', () => {
      const intent = intentParser.parse('Delete origin pool old-backend');

      expect(intent.action).toBe('delete');
      expect(intent.resource_name).toBe('old-backend');
      expect(intent.resource).toContain('origin');
      expect(intent.confidence).toBeGreaterThanOrEqual(0.6);
    });
  });

  describe('Ambiguous Intent Handling', () => {
    test('should handle unclear intent with lower confidence', () => {
      const intent = intentParser.parse('something about networking');

      // Should still parse but with lower confidence
      expect(intent.confidence).toBeLessThan(0.8);
    });

    test('should handle empty input gracefully', () => {
      const intent = intentParser.parse('');

      expect(intent.confidence).toBeLessThan(0.5);
    });

    test('should handle gibberish input gracefully', () => {
      const intent = intentParser.parse('asdfghjkl qwertyuiop');

      expect(intent.confidence).toBeLessThan(0.5);
    });
  });

  describe('URL Resolution', () => {
    test('should resolve workspace alias "waap"', () => {
      const result = urlRegistry.resolveWorkspace('waap');
      expect(result.found).toBe(true);
      expect(result.url).toContain('web-app-and-api-protection');
    });

    test('should resolve workspace alias "mcn"', () => {
      const result = urlRegistry.resolveWorkspace('mcn');
      expect(result.found).toBe(true);
      expect(result.url).toContain('multi-cloud-network-connect');
    });

    test('should resolve workspace alias "admin"', () => {
      const result = urlRegistry.resolveWorkspace('admin');
      expect(result.found).toBe(true);
      expect(result.url).toContain('administration');
    });

    test('should resolve workspace alias "dns"', () => {
      const result = urlRegistry.resolveWorkspace('dns');
      expect(result.found).toBe(true);
      expect(result.url).toContain('dns');
    });

    test('should resolve HTTP load balancer shortcut', () => {
      // Note: shortcut uses hyphen: 'http-lb' not 'http_loadbalancer'
      const result = urlRegistry.resolveShortcut('http-lb', { namespace: 'default' });
      expect(result.success).toBe(true);
      expect(result.url).toContain('http_loadbalancers');
    });

    test('should resolve origin pool shortcut', () => {
      // Note: shortcut uses hyphen: 'origin-pools'
      const result = urlRegistry.resolveShortcut('origin-pools', { namespace: 'default' });
      expect(result.success).toBe(true);
    });
  });

  describe('Full Pipeline Integration', () => {
    test('should complete full intent → workspace resolution pipeline', () => {
      // Step 1: Parse intent
      const intent = intentParser.parse('Navigate to WAAP workspace');

      // Step 2: Validate parsed intent
      expect(intent.action).toBe('navigate');
      expect(intent.confidence).toBeGreaterThanOrEqual(0.5);

      // Step 3: Resolve workspace
      const workspaceResult = urlRegistry.resolveWorkspace('waap');

      // Step 4: Validate URL
      expect(workspaceResult.found).toBe(true);
      expect(workspaceResult.url).toContain('web-app-and-api-protection');
    });

    test('should complete full intent → resource URL pipeline', () => {
      // Step 1: Parse intent with explicit "List" action
      const intent = intentParser.parse('List HTTP load balancers in staging');

      // Step 2: Validate parsed intent
      expect(intent.action).toBe('list');
      expect(intent.resource).toContain('loadbalancer');
      expect(intent.namespace).toBe('staging');

      // Step 3: Resolve to URL with namespace using correct shortcut key
      const urlResult = urlRegistry.resolveShortcut('http-lb', {
        namespace: intent.namespace || 'default',
      });

      // Step 4: Validate URL
      expect(urlResult.success).toBe(true);
      expect(urlResult.url).toContain('/staging/');
      expect(urlResult.url).toContain('/http_loadbalancers');
    });

    test('should complete full intent → page metadata pipeline', () => {
      // Step 1: Parse intent
      const intent = intentParser.parse('Go to WAAP workspace');

      // Step 2: Get workspace URL
      const workspaceResult = urlRegistry.resolveWorkspace('waap');
      expect(workspaceResult.found).toBe(true);

      // Step 3: Get page metadata from registry
      const workspaceCard = pageRegistry.getWorkspaceCard('web_app_api_protection');

      // Step 4: Validate metadata available
      expect(workspaceCard).toBeDefined();
    });
  });

  describe('Error Recovery', () => {
    test('should handle missing namespace with default', () => {
      const intent = intentParser.parse('List load balancers');

      // Should parse with list action
      expect(intent.action).toBe('list');
      expect(intent.namespace).toBeUndefined();

      // URL resolution should still work with default namespace
      const result = urlRegistry.resolveShortcut('http-lb', { namespace: 'default' });
      expect(result.success).toBe(true);
    });

    test('should handle unknown resource type with lower confidence', () => {
      const intent = intentParser.parse('Show me the foobar widgets');

      // Should have lower confidence for unknown resources
      expect(intent.confidence).toBeLessThanOrEqual(0.7);
    });

    test('should handle unknown workspace alias gracefully', () => {
      const result = urlRegistry.resolveWorkspace('nonexistent_workspace_xyz');
      expect(result.found).toBe(false);
    });
  });
});
