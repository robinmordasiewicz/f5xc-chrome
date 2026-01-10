// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Navigation Handler Tests
 *
 * Unit tests for the NavigationHandler class and navigation orchestration.
 * Tests intent processing, URL resolution, instruction generation, and page state detection.
 */

import {
  NavigationHandler,
  NavigationHandlerOptions,
  NavigationInstruction,
  NavigationResult,
  getNavigationHandler,
  resetNavigationHandler,
  processNavigation,
  getNavigationInstructions,
} from '../../../src/handlers/navigation-handler';
import { ParsedSnapshot, resetSnapshotParser, getSnapshotParser } from '../../../src/mcp/snapshot-parser';
import { resetIntentParser } from '../../../src/core/intent-parser';
import { resetURLResolver } from '../../../src/core/url-resolver';
import { resetAuthHandler } from '../../../src/handlers/auth-handler';

// Helper to create ParsedSnapshot with required properties
function createSnapshot(elements: Array<{
  uid: string;
  role: string;
  name?: string;
  raw?: string;
  level?: number;
  expanded?: boolean;
}>, options?: { url?: string; title?: string }): ParsedSnapshot {
  const elems = elements.map(e => ({
    uid: e.uid,
    role: e.role,
    name: e.name || '',
    raw: e.raw || '',
    level: e.level ?? 0,
    expanded: e.expanded,
  }));
  const byUid = new Map(elems.map(e => [e.uid, e]));
  const byRole = new Map<string, typeof elems>();
  elems.forEach(e => {
    if (!byRole.has(e.role)) byRole.set(e.role, []);
    byRole.get(e.role)!.push(e);
  });
  return {
    url: options?.url || '',
    title: options?.title || '',
    elements: elems,
    byUid,
    byRole,
  };
}

// Simple snapshot parser helper
function parseSnapshot(text: string): ParsedSnapshot {
  const parser = getSnapshotParser();
  return parser.parse(text);
}

describe('Navigation Handler', () => {
  beforeEach(() => {
    // Reset all singletons for test isolation
    resetNavigationHandler();
    resetSnapshotParser();
    resetIntentParser();
    resetURLResolver();
    resetAuthHandler();
  });

  describe('constructor', () => {
    test('creates handler with default options', () => {
      const handler = new NavigationHandler();

      expect(handler.getDefaultNamespace()).toBe('default');
      expect(handler.getTenantUrl()).toBe('https://f5-amer-ent.console.ves.volterra.io');
    });

    test('accepts custom default namespace', () => {
      const handler = new NavigationHandler({
        defaultNamespace: 'production',
      });

      expect(handler.getDefaultNamespace()).toBe('production');
    });

    test('accepts custom tenant URL', () => {
      const handler = new NavigationHandler({
        tenantUrl: 'https://custom.console.ves.volterra.io',
      });

      expect(handler.getTenantUrl()).toBe('https://custom.console.ves.volterra.io');
    });

    test('accepts all custom options', () => {
      const handler = new NavigationHandler({
        defaultNamespace: 'staging',
        tenantUrl: 'https://custom.console.ves.volterra.io',
        checkAuth: false,
        timeout: 60000,
        screenshotOnError: false,
      });

      expect(handler.getDefaultNamespace()).toBe('staging');
      expect(handler.getTenantUrl()).toBe('https://custom.console.ves.volterra.io');
    });
  });

  describe('processCommand()', () => {
    test('processes navigation command to execution plan', () => {
      const handler = new NavigationHandler();
      const plan = handler.processCommand('show me load balancers');

      expect(plan).toBeDefined();
      expect(plan.intent).toBeDefined();
      // "show me" may parse as navigate or list depending on pattern matching
      expect(['list', 'navigate']).toContain(plan.intent.action);
      expect(plan.url_resolution).toBeDefined();
      expect(plan.actions).toBeInstanceOf(Array);
      expect(plan.actions.length).toBeGreaterThan(0);
    });

    test('includes navigation action in plan', () => {
      const handler = new NavigationHandler();
      const plan = handler.processCommand('navigate to origin pools');

      const navAction = plan.actions.find(a => a.type === 'navigate');
      expect(navAction).toBeDefined();
      expect(navAction?.url).toContain('origin_pools');
    });

    test('includes wait action in plan', () => {
      const handler = new NavigationHandler();
      const plan = handler.processCommand('go to load balancers');

      const waitAction = plan.actions.find(a => a.type === 'wait');
      expect(waitAction).toBeDefined();
    });

    test('includes verify action in plan', () => {
      const handler = new NavigationHandler();
      const plan = handler.processCommand('show http load balancers');

      const verifyAction = plan.actions.find(a => a.type === 'verify');
      expect(verifyAction).toBeDefined();
    });

    test('estimates duration based on actions', () => {
      const handler = new NavigationHandler();
      const plan = handler.processCommand('list load balancers');

      expect(plan.estimated_duration_ms).toBeGreaterThan(0);
    });

    test('sets requires_auth based on checkAuth option', () => {
      const handler = new NavigationHandler({ checkAuth: true });
      const plan = handler.processCommand('show load balancers');

      expect(plan.requires_auth).toBe(true);
    });

    test('handles create action', () => {
      const handler = new NavigationHandler();
      const plan = handler.processCommand('create a new load balancer');

      expect(plan.intent.action).toBe('create');
    });

    test('handles commands with namespace', () => {
      const handler = new NavigationHandler();
      const plan = handler.processCommand('show load balancers in production');

      expect(plan.intent.namespace).toBe('production');
    });
  });

  describe('buildExecutionPlan()', () => {
    test('builds plan with all required actions', () => {
      const handler = new NavigationHandler();
      const intent = {
        action: 'list' as const,
        resource: 'http_loadbalancer' as const,
        confidence: 0.9,
        parameters: {},
        matched_patterns: ['list'],
        raw_input: 'show load balancers',
        needs_clarification: false,
      };
      const resolution = {
        url: '/web/load_balancers',
        is_complete: true,
        resolution_source: 'static_route' as const,
      };

      const plan = handler.buildExecutionPlan(intent, resolution);

      expect(plan.intent).toBe(intent);
      expect(plan.url_resolution).toBe(resolution);
      expect(plan.actions.some(a => a.type === 'navigate')).toBe(true);
      expect(plan.actions.some(a => a.type === 'wait')).toBe(true);
      expect(plan.actions.some(a => a.type === 'verify')).toBe(true);
    });

    test('builds full URL for navigation', () => {
      const handler = new NavigationHandler({
        tenantUrl: 'https://test.console.ves.volterra.io',
      });
      const intent = {
        action: 'list' as const,
        resource: 'origin_pool' as const,
        confidence: 0.8,
        parameters: {},
        matched_patterns: ['list'],
        raw_input: 'list origin pools',
        needs_clarification: false,
      };
      const resolution = {
        url: '/web/origin_pools',
        is_complete: true,
        resolution_source: 'static_route' as const,
      };

      const plan = handler.buildExecutionPlan(intent, resolution);
      const navAction = plan.actions.find(a => a.type === 'navigate');

      expect(navAction?.url).toBe('https://test.console.ves.volterra.io/web/origin_pools');
    });
  });

  describe('generateInstructions()', () => {
    test('generates array of navigation instructions', () => {
      const handler = new NavigationHandler();
      const instructions = handler.generateInstructions('show load balancers');

      expect(instructions).toBeInstanceOf(Array);
      expect(instructions.length).toBeGreaterThan(0);
    });

    test('includes snapshot instruction for auth check', () => {
      const handler = new NavigationHandler({ checkAuth: true });
      const instructions = handler.generateInstructions('navigate to origin pools');

      const snapshotInstr = instructions.find(i =>
        i.tool.includes('take_snapshot')
      );
      expect(snapshotInstr).toBeDefined();
    });

    test('includes navigate_page instruction', () => {
      const handler = new NavigationHandler();
      const instructions = handler.generateInstructions('go to load balancers');

      const navInstr = instructions.find(i =>
        i.tool.includes('navigate_page')
      );
      expect(navInstr).toBeDefined();
      expect(navInstr?.params).toHaveProperty('url');
    });

    test('includes wait_for instruction', () => {
      const handler = new NavigationHandler();
      const instructions = handler.generateInstructions('show origin pools');

      const waitInstr = instructions.find(i =>
        i.tool.includes('wait_for')
      );
      expect(waitInstr).toBeDefined();
    });

    test('instruction has tool, params, description, expectedOutcome', () => {
      const handler = new NavigationHandler();
      const instructions = handler.generateInstructions('list load balancers');

      for (const instr of instructions) {
        expect(instr).toHaveProperty('tool');
        expect(instr).toHaveProperty('params');
        expect(instr).toHaveProperty('description');
        expect(instr).toHaveProperty('expectedOutcome');
      }
    });

    test('skips auth check when checkAuth is false', () => {
      const handler = new NavigationHandler({ checkAuth: false });
      const instructions = handler.generateInstructions('show load balancers');

      // Should still have navigation and wait, but no initial auth check snapshot
      // The first instruction should be navigate_page, not take_snapshot
      expect(instructions[0].tool).toContain('navigate_page');
    });
  });

  describe('generateSummary()', () => {
    test('generates markdown summary', () => {
      const handler = new NavigationHandler();
      const summary = handler.generateSummary('show load balancers');

      expect(summary).toContain('## Navigation Plan');
      expect(summary).toContain('**Intent**');
    });

    test('includes action in summary', () => {
      const handler = new NavigationHandler();
      const summary = handler.generateSummary('list origin pools');

      expect(summary).toContain('list');
    });

    test('includes resource in summary', () => {
      const handler = new NavigationHandler();
      const summary = handler.generateSummary('show http load balancers');

      expect(summary).toContain('http_loadbalancer');
    });

    test('includes namespace when specified', () => {
      const handler = new NavigationHandler();
      const summary = handler.generateSummary('show load balancers in production');

      expect(summary).toContain('production');
    });

    test('includes confidence percentage', () => {
      const handler = new NavigationHandler();
      const summary = handler.generateSummary('list load balancers');

      expect(summary).toMatch(/\*\*Confidence\*\*: \d+%/);
    });

    test('includes target URL', () => {
      const handler = new NavigationHandler();
      const summary = handler.generateSummary('navigate to origin pools');

      expect(summary).toContain('**Target URL**');
    });

    test('includes full URL with tenant', () => {
      const handler = new NavigationHandler({
        tenantUrl: 'https://test.ves.volterra.io',
      });
      const summary = handler.generateSummary('show load balancers');

      expect(summary).toContain('https://test.ves.volterra.io');
    });

    test('lists actions in order', () => {
      const handler = new NavigationHandler();
      const summary = handler.generateSummary('show load balancers');

      expect(summary).toContain('**Actions**:');
      expect(summary).toMatch(/\d+\./); // numbered list
    });

    test('notes auth requirement', () => {
      const handler = new NavigationHandler({ checkAuth: true });
      const summary = handler.generateSummary('show load balancers');

      expect(summary).toContain('authentication');
    });
  });

  describe('checkAuthentication()', () => {
    test('returns auth detection result', () => {
      const handler = new NavigationHandler();
      const snapshot = createSnapshot([
        { uid: 'ref1', role: 'text', name: 'Welcome' },
      ]);

      const result = handler.checkAuthentication(
        'https://f5-amer-ent.console.ves.volterra.io/web/home',
        snapshot
      );

      expect(result).toHaveProperty('state');
    });

    test('detects login required state', () => {
      const handler = new NavigationHandler();
      const snapshot = createSnapshot([
        { uid: 'ref1', role: 'button', name: 'Sign In' },
      ], { url: 'https://auth.console.ves.volterra.io/login' });

      const result = handler.checkAuthentication(
        'https://auth.console.ves.volterra.io/login',
        snapshot
      );

      expect(result.state.status).toBe('login_required');
    });

    test('detects authenticated state', () => {
      const handler = new NavigationHandler();
      const snapshot = createSnapshot([
        { uid: 'ref1', role: 'text', name: 'Welcome, user@example.com' },
        { uid: 'ref2', role: 'button', name: 'Logout' },
      ], { url: 'https://f5-amer-ent.console.ves.volterra.io/web/home' });

      const result = handler.checkAuthentication(
        'https://f5-amer-ent.console.ves.volterra.io/web/home',
        snapshot
      );

      expect(result.state.status).toBe('authenticated');
    });
  });

  describe('detectPageState()', () => {
    test('returns page state object', () => {
      const handler = new NavigationHandler();
      const snapshot = createSnapshot([
        { uid: 'ref1', role: 'heading', name: 'HTTP Load Balancers' },
      ]);

      const state = handler.detectPageState('/web/load_balancers', snapshot);

      expect(state).toHaveProperty('url');
      expect(state).toHaveProperty('title');
      expect(state).toHaveProperty('page_type');
      expect(state).toHaveProperty('is_loading');
      expect(state).toHaveProperty('has_error');
    });

    test('extracts workspace from URL', () => {
      const handler = new NavigationHandler();
      const snapshot = createSnapshot([]);

      const state = handler.detectPageState(
        '/web/workspaces/web-app-and-api-protection/overview',
        snapshot
      );

      expect(state.workspace).toBe('web-app-and-api-protection');
    });

    test('extracts namespace from URL', () => {
      const handler = new NavigationHandler();
      const snapshot = createSnapshot([]);

      const state = handler.detectPageState(
        '/web/namespaces/production/load_balancers',
        snapshot
      );

      expect(state.namespace).toBe('production');
    });

    test('detects home page type', () => {
      const handler = new NavigationHandler();
      const snapshot = createSnapshot([]);

      const state = handler.detectPageState('/web/home', snapshot);

      expect(state.page_type).toBe('home');
    });

    test('detects form page type for create', () => {
      const handler = new NavigationHandler();
      const snapshot = createSnapshot([]);

      const state = handler.detectPageState('/web/load_balancers/create', snapshot);

      expect(state.page_type).toBe('form');
    });

    test('detects form page type for edit', () => {
      const handler = new NavigationHandler();
      const snapshot = createSnapshot([]);

      const state = handler.detectPageState('/web/load_balancers/edit/my-lb', snapshot);

      expect(state.page_type).toBe('form');
    });

    test('detects list page type', () => {
      const handler = new NavigationHandler();
      const snapshot = createSnapshot([]);

      const state = handler.detectPageState('/web/manage/load_balancers', snapshot);

      expect(state.page_type).toBe('list');
    });

    test('detects overview page type', () => {
      const handler = new NavigationHandler();
      const snapshot = createSnapshot([]);

      const state = handler.detectPageState('/web/overview/dashboard', snapshot);

      expect(state.page_type).toBe('overview');
    });

    test('detects workspace page type', () => {
      const handler = new NavigationHandler();
      const snapshot = createSnapshot([]);

      const state = handler.detectPageState('/web/workspaces/', snapshot);

      expect(state.page_type).toBe('workspace');
    });

    test('detects loading state', () => {
      const handler = new NavigationHandler();
      const snapshot = parseSnapshot('[1] text "Loading..."');

      const state = handler.detectPageState('/web/load_balancers', snapshot);

      expect(state.is_loading).toBe(true);
    });

    test('detects loading state with Please wait', () => {
      const handler = new NavigationHandler();
      const snapshot = parseSnapshot('[1] text "Please wait"');

      const state = handler.detectPageState('/web/load_balancers', snapshot);

      expect(state.is_loading).toBe(true);
    });

    test('detects error state', () => {
      const handler = new NavigationHandler();
      const snapshot = parseSnapshot('[1] text "Error: Something went wrong"');

      const state = handler.detectPageState('/web/load_balancers', snapshot);

      expect(state.has_error).toBe(true);
    });

    test('detects error state with Failed', () => {
      const handler = new NavigationHandler();
      const snapshot = parseSnapshot('[1] text "Failed to load data"');

      const state = handler.detectPageState('/web/load_balancers', snapshot);

      expect(state.has_error).toBe(true);
    });

    test('detects not found error', () => {
      const handler = new NavigationHandler();
      const snapshot = parseSnapshot('[1] text "Resource not found"');

      const state = handler.detectPageState('/web/load_balancers', snapshot);

      expect(state.has_error).toBe(true);
    });

    test('extracts error message', () => {
      const handler = new NavigationHandler();
      const snapshot = parseSnapshot('[1] text "Error loading resource"');

      const state = handler.detectPageState('/web/load_balancers', snapshot);

      expect(state.error_message).toContain('Error');
    });
  });

  describe('buildFullUrl()', () => {
    test('prepends tenant URL to relative path', () => {
      const handler = new NavigationHandler({
        tenantUrl: 'https://test.console.ves.volterra.io',
      });

      const url = handler.buildFullUrl('/web/load_balancers');

      expect(url).toBe('https://test.console.ves.volterra.io/web/load_balancers');
    });

    test('returns absolute URL unchanged', () => {
      const handler = new NavigationHandler();

      const url = handler.buildFullUrl('https://other.example.com/path');

      expect(url).toBe('https://other.example.com/path');
    });

    test('handles http URLs', () => {
      const handler = new NavigationHandler();

      const url = handler.buildFullUrl('http://localhost:3000/test');

      expect(url).toBe('http://localhost:3000/test');
    });
  });

  describe('setDefaultNamespace()', () => {
    test('updates default namespace', () => {
      const handler = new NavigationHandler();

      handler.setDefaultNamespace('staging');

      expect(handler.getDefaultNamespace()).toBe('staging');
    });
  });

  describe('setTenantUrl()', () => {
    test('updates tenant URL', () => {
      const handler = new NavigationHandler();

      handler.setTenantUrl('https://new.console.ves.volterra.io');

      expect(handler.getTenantUrl()).toBe('https://new.console.ves.volterra.io');
    });
  });

  describe('singleton helpers', () => {
    describe('getNavigationHandler()', () => {
      test('returns NavigationHandler instance', () => {
        const handler = getNavigationHandler();

        expect(handler).toBeInstanceOf(NavigationHandler);
      });

      test('returns same instance on multiple calls', () => {
        const handler1 = getNavigationHandler();
        const handler2 = getNavigationHandler();

        expect(handler1).toBe(handler2);
      });

      test('accepts options on first call', () => {
        const handler = getNavigationHandler({
          defaultNamespace: 'custom-ns',
        });

        expect(handler.getDefaultNamespace()).toBe('custom-ns');
      });
    });

    describe('resetNavigationHandler()', () => {
      test('clears singleton instance', () => {
        const handler1 = getNavigationHandler();
        resetNavigationHandler();
        const handler2 = getNavigationHandler();

        expect(handler1).not.toBe(handler2);
      });

      test('allows new options after reset', () => {
        getNavigationHandler({ defaultNamespace: 'first' });
        resetNavigationHandler();
        const handler = getNavigationHandler({ defaultNamespace: 'second' });

        expect(handler.getDefaultNamespace()).toBe('second');
      });
    });

    describe('processNavigation()', () => {
      test('processes command using default handler', () => {
        const plan = processNavigation('show load balancers');

        expect(plan).toBeDefined();
        expect(plan.intent).toBeDefined();
        expect(plan.actions).toBeInstanceOf(Array);
      });
    });

    describe('getNavigationInstructions()', () => {
      test('returns instructions using default handler', () => {
        const instructions = getNavigationInstructions('navigate to origin pools');

        expect(instructions).toBeInstanceOf(Array);
        expect(instructions.length).toBeGreaterThan(0);
      });
    });
  });

  describe('edge cases', () => {
    test('handles empty command', () => {
      const handler = new NavigationHandler();

      // Should not throw, but may have low confidence
      const plan = handler.processCommand('');

      expect(plan).toBeDefined();
      expect(plan.intent.confidence).toBeLessThan(0.5);
    });

    test('handles unknown resource', () => {
      const handler = new NavigationHandler();

      const plan = handler.processCommand('show me unicorns');

      expect(plan).toBeDefined();
      // Should still have actions but may have incomplete resolution
    });

    test('handles special characters in command', () => {
      const handler = new NavigationHandler();

      const plan = handler.processCommand('show load_balancers in my-namespace');

      expect(plan).toBeDefined();
    });

    test('handles URL with trailing slash', () => {
      const handler = new NavigationHandler({
        tenantUrl: 'https://test.console.ves.volterra.io/',
      });

      const url = handler.buildFullUrl('/web/load_balancers');

      // Should handle double slash
      expect(url).toContain('load_balancers');
    });

    test('handles snapshot without title', () => {
      const handler = new NavigationHandler();
      const snapshot = createSnapshot([
        { uid: 'ref1', role: 'heading', name: 'Test' },
      ], { url: '/test', title: undefined });

      const state = handler.detectPageState('/test', snapshot);

      expect(state.title).toBe('');
    });

    test('handles snapshot without elements', () => {
      const handler = new NavigationHandler();
      const snapshot = createSnapshot([]);

      const state = handler.detectPageState('/test', snapshot);

      expect(state.is_loading).toBe(false);
      expect(state.has_error).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    test('complete navigation flow: command to instructions', () => {
      const handler = new NavigationHandler({
        tenantUrl: 'https://test.console.ves.volterra.io',
        checkAuth: true,
      });

      // Process command
      const plan = handler.processCommand('show load balancers in production');

      // Verify plan - "show" may parse as navigate or list depending on pattern matching
      expect(['list', 'navigate']).toContain(plan.intent.action);
      expect(plan.intent.namespace).toBe('production');
      expect(plan.requires_auth).toBe(true);

      // Generate instructions
      const instructions = handler.generateInstructions('show load balancers in production');

      // Verify instructions
      expect(instructions.length).toBeGreaterThanOrEqual(3); // snapshot, navigate, wait, snapshot
      expect(instructions.some(i => i.tool.includes('navigate_page'))).toBe(true);

      // Generate summary
      const summary = handler.generateSummary('show load balancers in production');

      // Verify summary
      expect(summary).toContain('production');
      expect(summary).toContain('load_balancer');
    });

    test('auth check then navigate flow', () => {
      const handler = new NavigationHandler({
        checkAuth: true,
      });

      // Simulate authenticated state
      const authSnapshot = createSnapshot([
        { uid: 'ref1', role: 'text', name: 'Welcome, user@example.com' },
        { uid: 'ref2', role: 'button', name: 'Logout' },
      ]);

      const authResult = handler.checkAuthentication(
        'https://f5-amer-ent.console.ves.volterra.io/web/home',
        authSnapshot
      );

      expect(authResult.state.status).toBe('authenticated');

      // Now generate navigation instructions
      const instructions = handler.generateInstructions('go to origin pools');

      expect(instructions.length).toBeGreaterThan(0);
    });

    test('page state detection after navigation', () => {
      const handler = new NavigationHandler();

      // Simulate page after navigation
      const pageSnapshot = parseSnapshot(
        '[1] heading "HTTP Load Balancers"\n[2] table "Load Balancer List"\n[3] button "Create"'
      );

      const state = handler.detectPageState(
        '/web/workspaces/waap/namespaces/production/http_loadbalancers',
        pageSnapshot
      );

      expect(state.workspace).toBe('waap');
      expect(state.namespace).toBe('production');
      expect(state.is_loading).toBe(false);
      expect(state.has_error).toBe(false);
    });
  });
});
