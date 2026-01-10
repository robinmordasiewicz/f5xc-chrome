// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Integration Tests for Snapshot → Element Finding Pipeline
 *
 * Tests the complete flow from accessibility snapshot parsing
 * to element finding via various methods.
 */

import { SnapshotParser, ParsedSnapshot, ParsedElement } from '../../../src/mcp/snapshot-parser';
import { createTestSnapshot, createAuthenticatedHomeSnapshot, createLoginPageSnapshot, SnapshotBuilder } from '../../helpers/snapshot-factory';

describe('Snapshot to Element Finding Pipeline', () => {
  let snapshotParser: SnapshotParser;

  beforeEach(() => {
    snapshotParser = new SnapshotParser();
  });

  describe('Basic Element Finding', () => {
    test('should find button by role from snapshot', () => {
      const snapshot = createTestSnapshot([
        { uid: 'btn1', role: 'button', name: 'Submit', level: 1 },
        { uid: 'btn2', role: 'button', name: 'Cancel', level: 1 },
        { uid: 'txt1', role: 'textbox', name: 'Username', level: 1 },
      ]);

      // Step 1: Parse snapshot
      const parsed = snapshotParser.parse(snapshot);
      expect(parsed.elements.length).toBe(3);

      // Step 2: Find buttons by role
      const buttons = snapshotParser.findByRole(parsed, 'button');
      expect(buttons.length).toBe(2);

      // Step 3: Find specific button by name
      const submitButton = snapshotParser.findByText(parsed, 'Submit')[0];
      expect(submitButton).toBeDefined();
      expect(submitButton.uid).toBe('btn1');
    });

    test('should find textbox by role and name', () => {
      const snapshot = createTestSnapshot([
        { uid: 'input1', role: 'textbox', name: 'Email', level: 1 },
        { uid: 'input2', role: 'textbox', name: 'Password', level: 1 },
      ]);

      const parsed = snapshotParser.parse(snapshot);
      const emailInput = snapshotParser.findByText(parsed, 'Email')[0];

      expect(emailInput).toBeDefined();
      expect(emailInput.uid).toBe('input1');
      expect(emailInput.role).toBe('textbox');
    });

    test('should find element by UID', () => {
      // Note: UID regex uses \w+ which only matches word characters (letters, digits, underscore)
      // Hyphens are not allowed in UIDs
      const snapshot = createTestSnapshot([
        { uid: 'uniqueid123', role: 'link', name: 'Documentation', level: 1 },
      ]);

      const parsed = snapshotParser.parse(snapshot);
      const element = snapshotParser.findByUid(parsed, 'uniqueid123');

      expect(element).toBeDefined();
      expect(element?.name).toBe('Documentation');
    });
  });

  describe('Element Search Methods', () => {
    test('should find element by name', () => {
      const snapshot = createTestSnapshot([
        { uid: 'nav1', role: 'navigation', name: 'Main Navigation', level: 1 },
        { uid: 'card1', role: 'article', name: 'Web App & API Protection', level: 1 },
        { uid: 'card2', role: 'article', name: 'DNS Management', level: 1 },
      ]);

      const parsed = snapshotParser.parse(snapshot);

      // Find by name
      const waapCard = snapshotParser.findByText(parsed, 'Web App & API Protection')[0];

      expect(waapCard).toBeDefined();
      expect(waapCard.uid).toBe('card1');
    });

    test('should find all elements of a role', () => {
      const snapshot = createTestSnapshot([
        { uid: 'btn1', role: 'button', name: 'Save', level: 1 },
        { uid: 'link1', role: 'link', name: 'Home', level: 1 },
        { uid: 'btn2', role: 'button', name: 'Cancel', level: 1 },
      ]);

      const parsed = snapshotParser.parse(snapshot);
      const buttons = snapshotParser.findByRole(parsed, 'button');

      expect(buttons.length).toBe(2);
    });

    test('should return empty when no match found', () => {
      const snapshot = createTestSnapshot([
        { uid: 'el1', role: 'generic', name: 'Something', level: 1 },
      ]);

      const parsed = snapshotParser.parse(snapshot);
      const result = snapshotParser.findByText(parsed, 'Non-existent');

      expect(result.length).toBe(0);
    });
  });

  describe('Authentication State Detection', () => {
    test('should detect login page elements', () => {
      const snapshot = createLoginPageSnapshot();
      const parsed = snapshotParser.parse(snapshot);

      // Find login form elements
      const emailInput = snapshotParser.findByRole(parsed, 'textbox')
        .find(el => el.name?.toLowerCase().includes('email'));
      const signInButton = snapshotParser.findByText(parsed, 'Sign In')[0];

      expect(emailInput).toBeDefined();
      expect(signInButton).toBeDefined();
    });

    test('should detect authenticated home elements', () => {
      const snapshot = createAuthenticatedHomeSnapshot();
      const parsed = snapshotParser.parse(snapshot);

      // Find workspace cards (using href-based links)
      const waapCard = snapshotParser.findByText(parsed, 'Web App & API Protection')[0];
      // Find admin element (from fixture)
      const adminLink = snapshotParser.findByText(parsed, 'Administration')[0];

      expect(waapCard).toBeDefined();
      expect(adminLink).toBeDefined();
    });
  });

  describe('Complex Element Structures', () => {
    test('should handle multiple matching elements', () => {
      const snapshot = createTestSnapshot([
        { uid: 'btn1', role: 'button', name: 'Save', level: 1 },
        { uid: 'btn2', role: 'button', name: 'Save', level: 1 },
        { uid: 'btn3', role: 'button', name: 'Save', level: 1 },
      ]);

      const parsed = snapshotParser.parse(snapshot);
      const buttons = snapshotParser.findByText(parsed, 'Save');

      // Should return all matching elements
      expect(buttons.length).toBe(3);
    });

    test('should find form elements by role', () => {
      const snapshot = createTestSnapshot([
        { uid: 'form1', role: 'form', name: 'Create Load Balancer', level: 1 },
        { uid: 'input1', role: 'textbox', name: 'Name', level: 2 },
        { uid: 'input2', role: 'textbox', name: 'Description', level: 2 },
        { uid: 'select1', role: 'combobox', name: 'Namespace', level: 2 },
        { uid: 'btn1', role: 'button', name: 'Save', level: 2 },
        { uid: 'btn2', role: 'button', name: 'Cancel', level: 2 },
      ]);

      const parsed = snapshotParser.parse(snapshot);

      // Find form elements
      const textboxes = snapshotParser.findByRole(parsed, 'textbox');
      const comboboxes = snapshotParser.findByRole(parsed, 'combobox');
      const buttons = snapshotParser.findByRole(parsed, 'button');

      expect(textboxes.length).toBe(2);
      expect(comboboxes.length).toBe(1);
      expect(buttons.length).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty snapshot gracefully', () => {
      const emptySnapshot = '';
      const parsed = snapshotParser.parse(emptySnapshot);

      expect(parsed.elements).toEqual([]);
    });

    test('should handle malformed snapshot gracefully', () => {
      const malformedSnapshot = 'This is not a valid snapshot format';
      const parsed = snapshotParser.parse(malformedSnapshot);

      // Should not throw, return empty or best-effort parse
      expect(parsed).toBeDefined();
    });

    test('should handle elements with missing properties', () => {
      const snapshot = createTestSnapshot([
        { uid: 'el1', role: 'button', name: undefined, level: 1 },
        { uid: 'el2', role: 'link', name: 'Link', level: 1 },
      ]);

      const parsed = snapshotParser.parse(snapshot);

      // Should not throw when searching
      const result = snapshotParser.findByText(parsed, 'Link');
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Full Pipeline Integration', () => {
    test('should complete full snapshot → element finding pipeline', () => {
      // Step 1: Create realistic authenticated home snapshot
      const snapshot = createAuthenticatedHomeSnapshot();

      // Step 2: Parse snapshot
      const parsed = snapshotParser.parse(snapshot);
      expect(parsed.elements.length).toBeGreaterThan(0);

      // Step 3: Find workspace card
      const waapCard = snapshotParser.findByText(parsed, 'Web App & API Protection')[0];

      // Step 4: Validate result
      expect(waapCard).toBeDefined();
      expect(waapCard.uid).toBeDefined();
    });

    test('should complete full pipeline with form element finding', () => {
      // Step 1: Create form page snapshot
      const snapshot = createTestSnapshot([
        { uid: 'form1', role: 'form', name: 'Create Load Balancer', level: 1 },
        { uid: 'input1', role: 'textbox', name: 'Name', level: 2 },
        { uid: 'input2', role: 'textbox', name: 'Description', level: 2 },
        { uid: 'select1', role: 'combobox', name: 'Namespace', level: 2 },
        { uid: 'btn1', role: 'button', name: 'Save', level: 2 },
        { uid: 'btn2', role: 'button', name: 'Cancel', level: 2 },
      ]);

      // Step 2: Parse snapshot
      const parsed = snapshotParser.parse(snapshot);

      // Step 3: Find form elements
      const nameInput = snapshotParser.findByRole(parsed, 'textbox')
        .find(el => el.name === 'Name');
      const namespaceSelect = snapshotParser.findByRole(parsed, 'combobox')[0];
      const saveButton = snapshotParser.findByText(parsed, 'Save')[0];

      // Step 4: Validate all form elements found
      expect(nameInput).toBeDefined();
      expect(namespaceSelect).toBeDefined();
      expect(saveButton).toBeDefined();

      // Step 5: Validate UIDs for action execution
      expect(nameInput?.uid).toBe('input1');
      expect(namespaceSelect?.uid).toBe('select1');
      expect(saveButton?.uid).toBe('btn1');
    });
  });

  describe('Performance Considerations', () => {
    test('should handle large snapshots efficiently', () => {
      // Create large snapshot using SnapshotBuilder directly for proper format
      const builder = new SnapshotBuilder()
        .withUrl('https://test.console.ves.volterra.io/test')
        .withTitle('Test Page');

      for (let i = 0; i < 100; i++) {
        builder.addElement({
          uid: `el${i}`,
          role: i % 2 === 0 ? 'button' : 'textbox',
          name: `Element ${i}`,
          level: 1,
        });
      }

      const snapshot = builder.build();
      const parsed = snapshotParser.parse(snapshot);

      // Should parse all elements
      expect(parsed.elements.length).toBe(100);

      // Should find element quickly
      const startTime = Date.now();
      const result = snapshotParser.findByText(parsed, 'Element 50');
      const endTime = Date.now();

      expect(result.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });
});
