/**
 * Selector Chain Tests
 *
 * Unit tests for the SelectorChainExecutor class and related functions.
 * Tests selector priority, confidence scoring, chain execution, and fallback behavior.
 */

import {
  SelectorChainExecutor,
  SelectorChainOptions,
  SelectorChainResult,
  getSelectorChainExecutor,
  resetSelectorChainExecutor,
  findElement,
} from '../../../src/core/selector-chain';
import { ParsedSnapshot, resetSnapshotParser } from '../../../src/mcp/snapshot-parser';
import { SnapshotBuilder, snapshotFactory } from '../../helpers/snapshot-factory';
import type { ElementMetadata, SelectorDefinition, DeterministicSelector } from '../../../src/types';

describe('Selector Chain', () => {
  let executor: SelectorChainExecutor;

  beforeEach(() => {
    resetSnapshotParser();
    resetSelectorChainExecutor();
    executor = new SelectorChainExecutor();
  });

  afterEach(() => {
    resetSelectorChainExecutor();
    resetSnapshotParser();
  });

  /**
   * Helper to create a SelectorDefinition
   */
  function createSelectorDef(options: Partial<SelectorDefinition> = {}): SelectorDefinition {
    return {
      data_testid: options.data_testid ?? null,
      aria_label: options.aria_label ?? null,
      text_match: options.text_match ?? null,
      href_path: options.href_path ?? null,
      placeholder: options.placeholder ?? null,
      css: options.css ?? null,
    };
  }

  /**
   * Helper to create ElementMetadata
   */
  function createElementMetadata(
    description: string,
    selectors: Partial<SelectorDefinition>,
    ref?: string
  ): ElementMetadata {
    return {
      description,
      selectors: createSelectorDef(selectors),
      ref,
    };
  }

  /**
   * Helper to parse a snapshot string
   */
  function parseSnapshot(content: string): ParsedSnapshot {
    return executor['parser'].parse(content);
  }

  describe('SelectorChainExecutor constructor', () => {
    test('uses default priority and minConfidence', () => {
      const exec = new SelectorChainExecutor();
      expect(exec['priority']).toEqual([
        'name',
        'aria_label',
        'href_path',
        'text_match',
        'placeholder',
        'css',
        'ref',
      ]);
      expect(exec['minConfidence']).toBe(0);
    });

    test('uses custom priority when provided', () => {
      const customPriority = ['text_match', 'href_path', 'aria_label'] as const;
      const exec = new SelectorChainExecutor({ priority: [...customPriority] });
      expect(exec['priority']).toEqual(['text_match', 'href_path', 'aria_label']);
    });

    test('uses custom minConfidence when provided', () => {
      const exec = new SelectorChainExecutor({ minConfidence: 0.5 });
      expect(exec['minConfidence']).toBe(0.5);
    });
  });

  describe('buildChain()', () => {
    test('builds chain from element metadata with all selector types', () => {
      const element = createElementMetadata(
        'Test element',
        {
          data_testid: 'test-btn',
          aria_label: 'Test Button',
          href_path: '/test',
          text_match: 'Test',
          placeholder: 'Enter test',
          css: '.test-class',
        },
        'ref_test'
      );

      const chain = executor.buildChain(element);

      expect(chain.length).toBe(7);
      expect(chain[0]).toEqual({ type: 'name', value: 'test-btn', confidence: 0.95 });
      expect(chain[1]).toEqual({ type: 'aria_label', value: 'Test Button', confidence: 0.9 });
      expect(chain[2]).toEqual({ type: 'href_path', value: '/test', confidence: 0.85 });
      expect(chain[3]).toEqual({ type: 'text_match', value: 'Test', confidence: 0.75 });
      expect(chain[4]).toEqual({ type: 'placeholder', value: 'Enter test', confidence: 0.7 });
      expect(chain[5]).toEqual({ type: 'css', value: '.test-class', confidence: 0.5 });
      expect(chain[6]).toEqual({ type: 'ref', value: 'ref_test', confidence: 0.1 });
    });

    test('builds chain with partial selectors', () => {
      const element = createElementMetadata(
        'Test element',
        {
          text_match: 'Submit',
          aria_label: 'Submit Button',
        }
      );

      const chain = executor.buildChain(element);

      expect(chain.length).toBe(2);
      expect(chain[0].type).toBe('aria_label');
      expect(chain[1].type).toBe('text_match');
    });

    test('adds ref as fallback when available', () => {
      const element = createElementMetadata(
        'Test element',
        { text_match: 'Click' },
        'ref_click'
      );

      const chain = executor.buildChain(element);

      expect(chain[chain.length - 1]).toEqual({
        type: 'ref',
        value: 'ref_click',
        confidence: 0.1,
      });
    });

    test('builds empty chain for element with no selectors', () => {
      const element = createElementMetadata('Empty element', {});
      const chain = executor.buildChain(element);
      expect(chain.length).toBe(0);
    });

    test('respects custom priority order', () => {
      const exec = new SelectorChainExecutor({ priority: ['text_match', 'aria_label'] });
      const element = createElementMetadata(
        'Test element',
        {
          aria_label: 'Label',
          text_match: 'Text',
          data_testid: 'id', // Should be ignored since not in custom priority
        }
      );

      const chain = exec.buildChain(element);

      expect(chain.length).toBe(2);
      expect(chain[0].type).toBe('text_match');
      expect(chain[1].type).toBe('aria_label');
    });
  });

  describe('executeChain()', () => {
    test('returns found=true when first selector matches', () => {
      const snapshot = parseSnapshot('[ref1] button "Submit"');
      const chain: DeterministicSelector[] = [
        { type: 'text_match', value: 'Submit', confidence: 0.75 },
        { type: 'ref', value: 'ref1', confidence: 0.1 },
      ];

      const result = executor.executeChain(snapshot, chain);

      expect(result.found).toBe(true);
      expect(result.uid).toBe('ref1');
      expect(result.usedSelector?.type).toBe('text_match');
      expect(result.confidence).toBe(0.75);
      expect(result.triedSelectors.length).toBe(1);
    });

    test('tries multiple selectors until match found', () => {
      const snapshot = parseSnapshot('[ref1] button "Click Me"');
      const chain: DeterministicSelector[] = [
        { type: 'text_match', value: 'Submit', confidence: 0.75 }, // Won't match
        { type: 'text_match', value: 'Click Me', confidence: 0.75 }, // Will match
        { type: 'ref', value: 'ref1', confidence: 0.1 },
      ];

      const result = executor.executeChain(snapshot, chain);

      expect(result.found).toBe(true);
      expect(result.usedSelector?.value).toBe('Click Me');
      expect(result.triedSelectors.length).toBe(2);
    });

    test('returns found=false when no selector matches', () => {
      const snapshot = parseSnapshot('[ref1] button "Cancel"');
      const chain: DeterministicSelector[] = [
        { type: 'text_match', value: 'Submit', confidence: 0.75 },
        { type: 'text_match', value: 'OK', confidence: 0.75 },
      ];

      const result = executor.executeChain(snapshot, chain);

      expect(result.found).toBe(false);
      expect(result.uid).toBeUndefined();
      expect(result.error).toContain('not found after trying 2 selectors');
      expect(result.confidence).toBe(0);
    });

    test('skips selectors below minimum confidence', () => {
      const exec = new SelectorChainExecutor({ minConfidence: 0.5 });
      const snapshot = parseSnapshot('[ref1] button "Submit"');
      const chain: DeterministicSelector[] = [
        { type: 'ref', value: 'ref1', confidence: 0.1 }, // Below threshold
        { type: 'text_match', value: 'Submit', confidence: 0.75 },
      ];

      const result = exec.executeChain(snapshot, chain);

      expect(result.found).toBe(true);
      expect(result.usedSelector?.type).toBe('text_match');
      expect(result.triedSelectors.length).toBe(1); // ref was skipped
    });

    test('uses ref as fallback when higher priority selectors fail', () => {
      const snapshot = parseSnapshot('[ref1] button "Submit"');
      const chain: DeterministicSelector[] = [
        { type: 'text_match', value: 'Click', confidence: 0.75 }, // Won't match
        { type: 'ref', value: 'ref1', confidence: 0.1 }, // Will match
      ];

      const result = executor.executeChain(snapshot, chain);

      expect(result.found).toBe(true);
      expect(result.usedSelector?.type).toBe('ref');
      expect(result.confidence).toBe(0.1);
    });

    test('handles empty chain', () => {
      const snapshot = parseSnapshot('[ref1] button "Submit"');
      const result = executor.executeChain(snapshot, []);

      expect(result.found).toBe(false);
      expect(result.error).toContain('0 selectors');
    });
  });

  describe('execute()', () => {
    test('builds chain and executes against snapshot', () => {
      const snapshot = parseSnapshot('[ref1] button "Save and Exit"');
      const element = createElementMetadata(
        'Save button',
        { text_match: 'Save and Exit' }
      );

      const result = executor.execute(snapshot, element);

      expect(result.found).toBe(true);
      expect(result.uid).toBe('ref1');
    });

    test('works with element containing ref fallback', () => {
      const snapshot = parseSnapshot('[ref_save] button "Different Text"');
      const element = createElementMetadata(
        'Save button',
        { text_match: 'Save' }, // Won't match
        'ref_save'
      );

      const result = executor.execute(snapshot, element);

      expect(result.found).toBe(true);
      expect(result.usedSelector?.type).toBe('ref');
    });
  });

  describe('findByText()', () => {
    let snapshot: ParsedSnapshot;

    beforeEach(() => {
      snapshot = parseSnapshot(
        '[ref1] button "Submit Form"\n[ref2] button "Cancel"\n[ref3] link "Submit Now"'
      );
    });

    test('finds element by exact text', () => {
      const result = executor.findByText(snapshot, 'Submit Form', { exact: true });

      expect(result.found).toBe(true);
      expect(result.uid).toBe('ref1');
      expect(result.confidence).toBe(0.9);
    });

    test('finds element by partial text', () => {
      const result = executor.findByText(snapshot, 'Submit');

      expect(result.found).toBe(true);
      expect(result.uid).toBe('ref1');
    });

    test('filters by role when specified', () => {
      const result = executor.findByText(snapshot, 'Submit', { role: 'link' });

      expect(result.found).toBe(true);
      expect(result.element?.role).toBe('link');
      expect(result.uid).toBe('ref3');
    });

    test('returns not found for non-matching text', () => {
      const result = executor.findByText(snapshot, 'Delete');

      expect(result.found).toBe(false);
      expect(result.error).toContain('No element found with text "Delete"');
    });

    test('returns not found when role filter eliminates all matches', () => {
      const result = executor.findByText(snapshot, 'Cancel', { role: 'link' });

      expect(result.found).toBe(false);
    });
  });

  describe('findByAriaLabel()', () => {
    let snapshot: ParsedSnapshot;

    beforeEach(() => {
      snapshot = parseSnapshot(
        '[ref1] button "Close Dialog"\n[ref2] button "Submit"\n[ref3] link "Home"'
      );
    });

    test('finds element by aria label (name)', () => {
      const result = executor.findByAriaLabel(snapshot, 'Close Dialog');

      expect(result.found).toBe(true);
      expect(result.uid).toBe('ref1');
      expect(result.confidence).toBe(0.9);
    });

    test('filters by role when specified', () => {
      const snapshotWithRole = parseSnapshot('[ref1] button "Home"\n[ref2] link "Home"');
      const result = executor.findByAriaLabel(snapshotWithRole, 'Home', { role: 'link' });

      expect(result.found).toBe(true);
      expect(result.element?.role).toBe('link');
    });

    test('returns not found for non-matching label', () => {
      const result = executor.findByAriaLabel(snapshot, 'Nonexistent');

      expect(result.found).toBe(false);
      expect(result.error).toContain('No element found with aria-label');
    });
  });

  describe('findByHref()', () => {
    let snapshot: ParsedSnapshot;

    beforeEach(() => {
      snapshot = parseSnapshot(
        '[ref1] link "Home" href="/home"\n[ref2] link "Settings" href="/settings/profile"\n[ref3] link "Dashboard" href="/dashboard"'
      );
    });

    test('finds link by exact href', () => {
      const result = executor.findByHref(snapshot, '/home', { partial: false });

      expect(result.found).toBe(true);
      expect(result.uid).toBe('ref1');
    });

    test('finds link by partial href', () => {
      const result = executor.findByHref(snapshot, '/settings');

      expect(result.found).toBe(true);
      expect(result.uid).toBe('ref2');
    });

    test('returns not found for non-matching href', () => {
      const result = executor.findByHref(snapshot, '/admin');

      expect(result.found).toBe(false);
      expect(result.error).toContain('No element found with href "/admin"');
    });
  });

  describe('findButton()', () => {
    test('finds button by name', () => {
      const snapshot = parseSnapshot('[ref1] button "Submit"\n[ref2] link "Submit Link"');
      const result = executor.findButton(snapshot, 'Submit');

      expect(result.found).toBe(true);
      expect(result.element?.role).toBe('button');
    });

    test('returns not found when no button matches', () => {
      const snapshot = parseSnapshot('[ref1] link "Submit"');
      const result = executor.findButton(snapshot, 'Click');

      expect(result.found).toBe(false);
    });
  });

  describe('findLink()', () => {
    test('finds link by href first', () => {
      const snapshot = parseSnapshot('[ref1] link "Home" href="/home"\n[ref2] link "Home Page"');
      const result = executor.findLink(snapshot, '/home');

      expect(result.found).toBe(true);
      expect(result.uid).toBe('ref1');
    });

    test('falls back to text when href not found', () => {
      const snapshot = parseSnapshot('[ref1] link "Documentation" href="/docs"');
      const result = executor.findLink(snapshot, 'Documentation');

      expect(result.found).toBe(true);
      expect(result.uid).toBe('ref1');
    });

    test('returns not found when neither href nor text matches', () => {
      const snapshot = parseSnapshot('[ref1] link "Home" href="/home"');
      const result = executor.findLink(snapshot, 'Admin');

      expect(result.found).toBe(false);
    });
  });

  describe('findTextbox()', () => {
    test('finds textbox by placeholder', () => {
      const snapshot = parseSnapshot('[ref1] textbox placeholder="Enter your email"');
      const result = executor.findTextbox(snapshot, 'Enter your email');

      expect(result.found).toBe(true);
      expect(result.uid).toBe('ref1');
      expect(result.usedSelector?.type).toBe('placeholder');
    });

    test('finds textbox by partial placeholder', () => {
      const snapshot = parseSnapshot('[ref1] textbox placeholder="Enter username here"');
      const result = executor.findTextbox(snapshot, 'username');

      expect(result.found).toBe(true);
    });

    test('falls back to label when placeholder not found', () => {
      const snapshot = parseSnapshot('[ref1] textbox "Email Address"');
      const result = executor.findTextbox(snapshot, 'Email Address');

      expect(result.found).toBe(true);
      expect(result.usedSelector?.type).toBe('aria_label');
    });

    test('returns not found when no textbox matches', () => {
      const snapshot = parseSnapshot('[ref1] textbox "Username"');
      const result = executor.findTextbox(snapshot, 'Password');

      expect(result.found).toBe(false);
      expect(result.error).toContain('No textbox found');
    });

    test('tracks all tried selectors', () => {
      const snapshot = parseSnapshot('[ref1] textbox "Username"');
      const result = executor.findTextbox(snapshot, 'NonExistent');

      expect(result.triedSelectors.length).toBe(2);
      expect(result.triedSelectors[0].type).toBe('placeholder');
      expect(result.triedSelectors[1].type).toBe('aria_label');
    });
  });

  describe('toResolutionResult()', () => {
    test('converts successful result', () => {
      const chainResult: SelectorChainResult = {
        found: true,
        uid: 'ref1',
        element: { uid: 'ref1', role: 'button', name: 'Test', raw: '', level: 0 },
        usedSelector: { type: 'text_match', value: 'Test', confidence: 0.75 },
        triedSelectors: [{ type: 'text_match', value: 'Test', confidence: 0.75 }],
        confidence: 0.75,
      };

      const result = executor.toResolutionResult(chainResult);

      expect(result.found).toBe(true);
      expect(result.uid).toBe('ref1');
      expect(result.used_selector?.type).toBe('text_match');
      expect(result.tried_selectors.length).toBe(1);
      expect(result.error).toBeUndefined();
    });

    test('converts failed result', () => {
      const chainResult: SelectorChainResult = {
        found: false,
        triedSelectors: [
          { type: 'text_match', value: 'Missing', confidence: 0.75 },
        ],
        confidence: 0,
        error: 'Element not found',
      };

      const result = executor.toResolutionResult(chainResult);

      expect(result.found).toBe(false);
      expect(result.uid).toBeUndefined();
      expect(result.error).toBe('Element not found');
    });
  });

  describe('singleton pattern', () => {
    test('getSelectorChainExecutor returns same instance', () => {
      resetSelectorChainExecutor();
      const exec1 = getSelectorChainExecutor();
      const exec2 = getSelectorChainExecutor();
      expect(exec1).toBe(exec2);
    });

    test('resetSelectorChainExecutor clears singleton', () => {
      const exec1 = getSelectorChainExecutor();
      resetSelectorChainExecutor();
      const exec2 = getSelectorChainExecutor();
      expect(exec1).not.toBe(exec2);
    });

    test('getSelectorChainExecutor applies options on first call', () => {
      resetSelectorChainExecutor();
      const exec = getSelectorChainExecutor({ minConfidence: 0.8 });
      expect(exec['minConfidence']).toBe(0.8);
    });
  });

  describe('findElement() convenience function', () => {
    test('finds element using singleton executor', () => {
      resetSelectorChainExecutor();
      const snapshot = parseSnapshot('[ref1] button "Click Here"');
      const element = createElementMetadata(
        'Click button',
        { text_match: 'Click Here' }
      );

      const result = findElement(snapshot, element);

      expect(result.found).toBe(true);
      expect(result.uid).toBe('ref1');
    });
  });

  describe('confidence scoring', () => {
    test('name selector has highest confidence (0.95)', () => {
      const element = createElementMetadata('Test', { data_testid: 'test-id' });
      const chain = executor.buildChain(element);
      expect(chain[0].confidence).toBe(0.95);
    });

    test('aria_label has high confidence (0.9)', () => {
      const element = createElementMetadata('Test', { aria_label: 'Label' });
      const chain = executor.buildChain(element);
      expect(chain[0].confidence).toBe(0.9);
    });

    test('href_path has good confidence (0.85)', () => {
      const element = createElementMetadata('Test', { href_path: '/path' });
      const chain = executor.buildChain(element);
      expect(chain[0].confidence).toBe(0.85);
    });

    test('text_match has moderate confidence (0.75)', () => {
      const element = createElementMetadata('Test', { text_match: 'Text' });
      const chain = executor.buildChain(element);
      expect(chain[0].confidence).toBe(0.75);
    });

    test('placeholder has low-moderate confidence (0.7)', () => {
      const element = createElementMetadata('Test', { placeholder: 'Enter...' });
      const chain = executor.buildChain(element);
      expect(chain[0].confidence).toBe(0.7);
    });

    test('css has low confidence (0.5)', () => {
      const element = createElementMetadata('Test', { css: '.class' });
      const chain = executor.buildChain(element);
      expect(chain[0].confidence).toBe(0.5);
    });

    test('ref has lowest confidence (0.1)', () => {
      const element = createElementMetadata('Test', {}, 'ref_test');
      const chain = executor.buildChain(element);
      expect(chain[0].confidence).toBe(0.1);
    });
  });

  describe('priority order', () => {
    test('default priority is name > aria_label > href_path > text_match > placeholder > css > ref', () => {
      const element: ElementMetadata = {
        description: 'Test element',
        selectors: {
          data_testid: 'testid',
          aria_label: 'label',
          href_path: '/path',
          text_match: 'text',
          placeholder: 'placeholder',
          css: '.css',
        },
        ref: 'ref_id',
      };

      const chain = executor.buildChain(element);

      expect(chain[0].type).toBe('name');
      expect(chain[1].type).toBe('aria_label');
      expect(chain[2].type).toBe('href_path');
      expect(chain[3].type).toBe('text_match');
      expect(chain[4].type).toBe('placeholder');
      expect(chain[5].type).toBe('css');
      expect(chain[6].type).toBe('ref');
    });

    test('custom priority reorders chain', () => {
      const customExecutor = new SelectorChainExecutor({
        priority: ['css', 'text_match', 'name'],
      });

      const element = createElementMetadata(
        'Test',
        {
          data_testid: 'testid',
          text_match: 'text',
          css: '.css',
        }
      );

      const chain = customExecutor.buildChain(element);

      expect(chain[0].type).toBe('css');
      expect(chain[1].type).toBe('text_match');
      expect(chain[2].type).toBe('name');
    });
  });

  describe('edge cases', () => {
    test('handles snapshot with no elements', () => {
      const snapshot = parseSnapshot('');
      const element = createElementMetadata('Test', { text_match: 'Something' });
      const result = executor.execute(snapshot, element);

      expect(result.found).toBe(false);
    });

    test('handles null selector values in definition', () => {
      const element: ElementMetadata = {
        description: 'Test',
        selectors: {
          data_testid: null,
          aria_label: null,
          text_match: 'Only text',
          href_path: null,
          placeholder: null,
          css: null,
        },
      };

      const chain = executor.buildChain(element);
      expect(chain.length).toBe(1);
      expect(chain[0].type).toBe('text_match');
    });

    test('handles special characters in selector values', () => {
      const snapshot = parseSnapshot('[ref1] button "Save & Continue"');
      const element = createElementMetadata(
        'Test',
        { text_match: 'Save & Continue' }
      );

      const result = executor.execute(snapshot, element);
      expect(result.found).toBe(true);
    });

    test('handles unicode in selector values', () => {
      const snapshot = parseSnapshot('[ref1] button "确认提交"');
      const element = createElementMetadata(
        'Test',
        { text_match: '确认提交' }
      );

      const result = executor.execute(snapshot, element);
      expect(result.found).toBe(true);
    });

    test('handles very long selector values', () => {
      const longText = 'A'.repeat(500);
      const snapshot = parseSnapshot(`[ref1] button "${longText}"`);
      const element = createElementMetadata(
        'Test',
        { text_match: longText }
      );

      const result = executor.execute(snapshot, element);
      expect(result.found).toBe(true);
    });
  });

  describe('complex scenarios', () => {
    test('finds element in complex page structure', () => {
      const snapshot = new SnapshotBuilder()
        .withUrl('/web/workspaces/waap/load_balancers')
        .withTitle('HTTP Load Balancers')
        .addButton('Add HTTP Load Balancer')
        .addButton('Refresh')
        .addTextbox('Search')
        .addLink('Home', '/home')
        .addLink('Settings', '/settings')
        .build();

      const parsed = executor['parser'].parse(snapshot);

      // Find the add button
      const element = createElementMetadata(
        'Add button',
        { text_match: 'Add HTTP Load Balancer' }
      );

      const result = executor.execute(parsed, element);
      expect(result.found).toBe(true);
      expect(result.element?.name).toBe('Add HTTP Load Balancer');
    });

    test('prioritizes more specific selectors', () => {
      const snapshot = parseSnapshot(
        '[ref1] button "Submit" data-testid="submit-btn"\n[ref2] button "Submit" data-testid="other-btn"'
      );

      // Note: data-testid isn't parsed from snapshot, so this tests the priority concept
      const element = createElementMetadata(
        'Submit button',
        {
          data_testid: 'submit-btn',
          text_match: 'Submit',
        }
      );

      const chain = executor.buildChain(element);
      expect(chain[0].type).toBe('name'); // name (data_testid) should come first
      expect(chain[1].type).toBe('text_match');
    });

    test('handles multiple matching elements by returning first', () => {
      const snapshot = parseSnapshot(
        '[ref1] button "OK"\n[ref2] button "OK"\n[ref3] button "OK"'
      );

      const element = createElementMetadata(
        'OK button',
        { text_match: 'OK' }
      );

      const result = executor.execute(snapshot, element);
      expect(result.found).toBe(true);
      expect(result.uid).toBe('ref1'); // First matching element
    });
  });
});
