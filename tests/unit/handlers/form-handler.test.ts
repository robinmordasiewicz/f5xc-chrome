/**
 * Form Handler Tests
 *
 * Unit tests for the FormHandler class and form field manipulation.
 * Tests field detection, value generation, and instruction building.
 */

import {
  FormHandler,
  FormFieldValue,
  FormFillOptions,
  FormFillResult,
  DetectedFormField,
} from '../../../src/handlers/form-handler';
import { ParsedSnapshot, resetSnapshotParser, getSnapshotParser } from '../../../src/mcp/snapshot-parser';
import { SnapshotBuilder } from '../../helpers/snapshot-factory';

describe('Form Handler', () => {
  let handler: FormHandler;

  beforeEach(() => {
    resetSnapshotParser();
    handler = new FormHandler();
  });

  afterEach(() => {
    resetSnapshotParser();
  });

  /**
   * Helper to create a parsed snapshot from content
   */
  function parseSnapshot(content: string): ParsedSnapshot {
    return getSnapshotParser().parse(content);
  }

  describe('detectFormFields()', () => {
    test('detects textbox fields', () => {
      const snapshot = parseSnapshot('[1] textbox "Username"');
      const fields = handler.detectFormFields(snapshot);

      expect(fields.length).toBe(1);
      expect(fields[0].type).toBe('textbox');
      expect(fields[0].name).toBe('Username');
      expect(fields[0].uid).toBe('1');
    });

    test('detects multiple textbox fields', () => {
      const snapshot = parseSnapshot(
        '[1] textbox "Username"\n[2] textbox "Password"\n[3] textbox "Email"'
      );
      const fields = handler.detectFormFields(snapshot);

      expect(fields.length).toBe(3);
    });

    test('detects combobox fields', () => {
      const snapshot = parseSnapshot('[1] combobox "Select Country"');
      const fields = handler.detectFormFields(snapshot);

      expect(fields.length).toBe(1);
      expect(fields[0].type).toBe('combobox');
    });

    test('detects checkbox fields', () => {
      const snapshot = parseSnapshot('[1] checkbox "Remember me"');
      const fields = handler.detectFormFields(snapshot);

      expect(fields.length).toBe(1);
      expect(fields[0].type).toBe('checkbox');
    });

    test('detects radio fields', () => {
      const snapshot = parseSnapshot('[1] radio "Option A"');
      const fields = handler.detectFormFields(snapshot);

      expect(fields.length).toBe(1);
      expect(fields[0].type).toBe('radio');
    });

    test('detects switch fields', () => {
      const snapshot = parseSnapshot('[1] switch "Enable notifications"');
      const fields = handler.detectFormFields(snapshot);

      expect(fields.length).toBe(1);
      expect(fields[0].type).toBe('switch');
    });

    test('detects searchbox as textbox', () => {
      const snapshot = parseSnapshot('[1] searchbox "Search"');
      const fields = handler.detectFormFields(snapshot);

      expect(fields.length).toBe(1);
      expect(fields[0].type).toBe('textbox');
    });

    test('detects spinbutton fields', () => {
      const snapshot = parseSnapshot('[1] spinbutton "Quantity"');
      const fields = handler.detectFormFields(snapshot);

      expect(fields.length).toBe(1);
      expect(fields[0].type).toBe('spinbutton');
    });

    test('ignores non-form elements', () => {
      const snapshot = parseSnapshot(
        '[1] button "Submit"\n[2] link "Cancel"\n[3] heading "Form Title"'
      );
      const fields = handler.detectFormFields(snapshot);

      expect(fields.length).toBe(0);
    });

    test('detects required fields from name containing *', () => {
      const snapshot = parseSnapshot('[1] textbox "Username *"');
      const fields = handler.detectFormFields(snapshot);

      expect(fields[0].required).toBe(true);
    });

    test('detects required fields from name containing "required"', () => {
      const snapshot = parseSnapshot('[1] textbox "Username (required)"');
      const fields = handler.detectFormFields(snapshot);

      expect(fields[0].required).toBe(true);
    });

    test('detects disabled fields', () => {
      const snapshot = parseSnapshot('[1] textbox "Locked Field" disabled');
      const fields = handler.detectFormFields(snapshot);

      expect(fields[0].disabled).toBe(true);
    });

    test('captures current value', () => {
      const snapshot = parseSnapshot('[1] textbox "Username" value="john_doe"');
      const fields = handler.detectFormFields(snapshot);

      expect(fields[0].current_value).toBe('john_doe');
    });

    test('captures placeholder text', () => {
      const snapshot = parseSnapshot('[1] textbox placeholder="Enter username"');
      const fields = handler.detectFormFields(snapshot);

      expect(fields[0].placeholder).toBe('Enter username');
    });

    test('uses placeholder as name if no name provided', () => {
      const snapshot = parseSnapshot('[1] textbox placeholder="Enter email"');
      const fields = handler.detectFormFields(snapshot);

      expect(fields[0].name).toBe('Enter email');
    });

    test('detects options for combobox', () => {
      const snapshot = parseSnapshot(
        '[1] combobox "Select Size"\n  [2] option "Small"\n  [3] option "Medium"\n  [4] option "Large"'
      );
      const fields = handler.detectFormFields(snapshot);

      expect(fields[0].options).toBeDefined();
      expect(fields[0].options).toEqual(['Small', 'Medium', 'Large']);
    });

    test('handles mixed form with multiple field types', () => {
      const snapshot = parseSnapshot(
        `[1] textbox "Name"
[2] textbox "Email"
[3] combobox "Country"
[4] checkbox "Subscribe"
[5] radio "Male"
[6] radio "Female"
[7] button "Submit"`
      );
      const fields = handler.detectFormFields(snapshot);

      expect(fields.length).toBe(6);
      expect(fields.filter(f => f.type === 'textbox').length).toBe(2);
      expect(fields.filter(f => f.type === 'combobox').length).toBe(1);
      expect(fields.filter(f => f.type === 'checkbox').length).toBe(1);
      expect(fields.filter(f => f.type === 'radio').length).toBe(2);
    });
  });

  describe('generateFillInstructions()', () => {
    test('generates instruction for textbox field', () => {
      const snapshot = parseSnapshot('[1] textbox "Username"');
      const values: FormFieldValue[] = [
        { field_name: 'Username', value: 'john_doe' },
      ];

      const result = handler.generateFillInstructions(snapshot, values);

      expect(result.success).toBe(true);
      expect(result.fields_filled).toContain('Username');
      expect(result.instructions.length).toBe(1);
      expect(result.instructions[0].type).toBe('fill_field');
      expect(result.instructions[0].value).toBe('john_doe');
    });

    test('generates instruction for multiple fields', () => {
      const snapshot = parseSnapshot(
        '[1] textbox "Username"\n[2] textbox "Email"\n[3] textbox "Password"'
      );
      const values: FormFieldValue[] = [
        { field_name: 'Username', value: 'john' },
        { field_name: 'Email', value: 'john@example.com' },
        { field_name: 'Password', value: 'secret123' },
      ];

      const result = handler.generateFillInstructions(snapshot, values);

      expect(result.success).toBe(true);
      expect(result.fields_filled.length).toBe(3);
      expect(result.instructions.length).toBe(3);
    });

    test('generates instruction for checkbox', () => {
      const snapshot = parseSnapshot('[1] checkbox "Accept Terms"');
      const values: FormFieldValue[] = [
        { field_name: 'Accept Terms', value: true },
      ];

      const result = handler.generateFillInstructions(snapshot, values);

      expect(result.success).toBe(true);
      expect(result.instructions[0].type).toBe('toggle_checkbox');
      expect(result.instructions[0].description).toContain('Check');
    });

    test('generates instruction for unchecking checkbox', () => {
      const snapshot = parseSnapshot('[1] checkbox "Send Newsletter"');
      const values: FormFieldValue[] = [
        { field_name: 'Send Newsletter', value: false },
      ];

      const result = handler.generateFillInstructions(snapshot, values);

      expect(result.instructions[0].description).toContain('Uncheck');
    });

    test('generates instruction for combobox/select', () => {
      const snapshot = parseSnapshot('[1] combobox "Country"');
      const values: FormFieldValue[] = [
        { field_name: 'Country', value: 'United States' },
      ];

      const result = handler.generateFillInstructions(snapshot, values);

      expect(result.instructions[0].type).toBe('select_option');
    });

    test('generates instruction for radio button', () => {
      const snapshot = parseSnapshot('[1] radio "Premium Plan"');
      const values: FormFieldValue[] = [
        { field_name: 'Premium Plan', value: 'true' },
      ];

      const result = handler.generateFillInstructions(snapshot, values);

      expect(result.instructions[0].type).toBe('click_button');
    });

    test('reports missing field', () => {
      const snapshot = parseSnapshot('[1] textbox "Username"');
      const values: FormFieldValue[] = [
        { field_name: 'NonExistent', value: 'value' },
      ];

      const result = handler.generateFillInstructions(snapshot, values);

      expect(result.success).toBe(false);
      expect(result.fields_failed).toContain('NonExistent');
      expect(result.validation_errors.length).toBe(1);
    });

    test('skips missing fields with option', () => {
      const snapshot = parseSnapshot('[1] textbox "Username"');
      const values: FormFieldValue[] = [
        { field_name: 'Username', value: 'john' },
        { field_name: 'NonExistent', value: 'value' },
      ];

      const result = handler.generateFillInstructions(snapshot, values, {
        skip_missing_fields: true,
      });

      expect(result.fields_filled).toContain('Username');
      expect(result.fields_failed).toContain('NonExistent');
    });

    test('validates disabled fields', () => {
      const snapshot = parseSnapshot('[1] textbox "Locked" disabled');
      const values: FormFieldValue[] = [
        { field_name: 'Locked', value: 'test' },
      ];

      const result = handler.generateFillInstructions(snapshot, values, {
        validate_before_fill: true,
      });

      expect(result.success).toBe(false);
      expect(result.validation_errors[0].message).toContain('disabled');
    });

    test('validates combobox options', () => {
      const snapshot = parseSnapshot(
        '[1] combobox "Size"\n  [2] option "Small"\n  [3] option "Large"'
      );
      const values: FormFieldValue[] = [
        { field_name: 'Size', value: 'Extra Large' }, // Invalid option
      ];

      const result = handler.generateFillInstructions(snapshot, values, {
        validate_before_fill: true,
      });

      expect(result.success).toBe(false);
      expect(result.validation_errors[0].type).toBe('invalid_option');
    });

    test('navigates to tab when specified', () => {
      const snapshot = parseSnapshot(
        '[1] tab "Basic Info"\n[2] tab "Advanced"\n[3] textbox "Name"'
      );
      const values: FormFieldValue[] = [
        { field_name: 'Name', value: 'Test' },
      ];

      const result = handler.generateFillInstructions(snapshot, values, {
        active_tab: 'Advanced',
      });

      expect(result.instructions[0].type).toBe('navigate_tab');
      expect(result.instructions[0].description).toContain('Advanced');
    });

    test('expands section when specified', () => {
      // Manually create snapshot with expanded=false (parseSnapshot doesn't support this)
      const elements = [
        { uid: 'ref1', role: 'button', name: 'Additional Options', raw: '', level: 0, expanded: false },
        { uid: 'ref2', role: 'textbox', name: 'Extra Field', raw: '', level: 0 },
      ];
      const byUid = new Map(elements.map(e => [e.uid, e]));
      const byRole = new Map<string, typeof elements>();
      elements.forEach(e => {
        if (!byRole.has(e.role)) byRole.set(e.role, []);
        byRole.get(e.role)!.push(e);
      });
      const snapshot: ParsedSnapshot = {
        url: '',
        title: '',
        elements,
        byUid,
        byRole,
      };
      const values: FormFieldValue[] = [
        { field_name: 'Extra Field', value: 'Value' },
      ];

      const result = handler.generateFillInstructions(snapshot, values, {
        active_section: 'Additional Options',
      });

      expect(result.instructions[0].type).toBe('expand_section');
    });

    test('provides summary message', () => {
      const snapshot = parseSnapshot('[1] textbox "Field1"\n[2] textbox "Field2"');
      const values: FormFieldValue[] = [
        { field_name: 'Field1', value: 'Value1' },
        { field_name: 'Field2', value: 'Value2' },
      ];

      const result = handler.generateFillInstructions(snapshot, values);

      expect(result.summary).toContain('2 fields');
    });
  });

  describe('generateSubmitInstruction()', () => {
    test('finds Save button', () => {
      const snapshot = parseSnapshot('[1] button "Save and Exit"\n[2] button "Cancel"');
      const instruction = handler.generateSubmitInstruction(snapshot);

      expect(instruction).toBeDefined();
      expect(instruction?.target_uid).toBe('1');
      expect(instruction?.description).toContain('Save');
    });

    test('finds Submit button', () => {
      const snapshot = parseSnapshot('[1] button "Submit Form"');
      const instruction = handler.generateSubmitInstruction(snapshot);

      expect(instruction).toBeDefined();
      expect(instruction?.description).toContain('Submit');
    });

    test('finds Create button', () => {
      const snapshot = parseSnapshot('[1] button "Create Resource"');
      const instruction = handler.generateSubmitInstruction(snapshot);

      expect(instruction).toBeDefined();
    });

    test('finds Apply button', () => {
      const snapshot = parseSnapshot('[1] button "Apply Changes"');
      const instruction = handler.generateSubmitInstruction(snapshot);

      expect(instruction).toBeDefined();
    });

    test('returns null when no submit button found', () => {
      const snapshot = parseSnapshot('[1] button "Cancel"\n[2] button "Help"');
      const instruction = handler.generateSubmitInstruction(snapshot);

      expect(instruction).toBeNull();
    });
  });

  describe('generateCancelInstruction()', () => {
    test('finds Cancel button', () => {
      const snapshot = parseSnapshot('[1] button "Cancel"');
      const instruction = handler.generateCancelInstruction(snapshot);

      expect(instruction).toBeDefined();
      expect(instruction?.description).toContain('Cancel');
    });

    test('finds Close button', () => {
      const snapshot = parseSnapshot('[1] button "Close Dialog"');
      const instruction = handler.generateCancelInstruction(snapshot);

      expect(instruction).toBeDefined();
    });

    test('finds Discard button', () => {
      const snapshot = parseSnapshot('[1] button "Discard Changes"');
      const instruction = handler.generateCancelInstruction(snapshot);

      expect(instruction).toBeDefined();
    });

    test('returns null when no cancel button found', () => {
      const snapshot = parseSnapshot('[1] button "Save"\n[2] button "Submit"');
      const instruction = handler.generateCancelInstruction(snapshot);

      expect(instruction).toBeNull();
    });
  });

  describe('field matching', () => {
    test('matches field by exact name', () => {
      const snapshot = parseSnapshot('[1] textbox "Email Address"');
      const values: FormFieldValue[] = [
        { field_name: 'Email Address', value: 'test@test.com' },
      ];

      const result = handler.generateFillInstructions(snapshot, values);
      expect(result.success).toBe(true);
    });

    test('matches field by partial name', () => {
      const snapshot = parseSnapshot('[1] textbox "Enter your email address"');
      const values: FormFieldValue[] = [
        { field_name: 'email', value: 'test@test.com' },
      ];

      const result = handler.generateFillInstructions(snapshot, values);
      expect(result.success).toBe(true);
    });

    test('matches field case-insensitively', () => {
      const snapshot = parseSnapshot('[1] textbox "USERNAME"');
      const values: FormFieldValue[] = [
        { field_name: 'username', value: 'john' },
      ];

      const result = handler.generateFillInstructions(snapshot, values);
      expect(result.success).toBe(true);
    });

    test('matches field by normalized name', () => {
      const snapshot = parseSnapshot('[1] textbox "User-Name"');
      const values: FormFieldValue[] = [
        { field_name: 'username', value: 'john' },
      ];

      const result = handler.generateFillInstructions(snapshot, values);
      expect(result.success).toBe(true);
    });
  });

  describe('instruction format', () => {
    test('fill_field instruction has correct properties', () => {
      const snapshot = parseSnapshot('[1] textbox "Name"');
      const result = handler.generateFillInstructions(snapshot, [
        { field_name: 'Name', value: 'Test' },
      ]);

      const instruction = result.instructions[0];
      expect(instruction.type).toBe('fill_field');
      expect(instruction.target_uid).toBe('1');
      expect(instruction.value).toBe('Test');
      expect(instruction.description).toContain('Name');
      expect(instruction.description).toContain('Test');
    });

    test('select_option instruction has correct properties', () => {
      const snapshot = parseSnapshot('[1] combobox "Type"');
      const result = handler.generateFillInstructions(snapshot, [
        { field_name: 'Type', value: 'Option A' },
      ]);

      const instruction = result.instructions[0];
      expect(instruction.type).toBe('select_option');
      expect(instruction.value).toBe('Option A');
    });

    test('toggle_checkbox instruction has correct properties', () => {
      const snapshot = parseSnapshot('[1] checkbox "Enable"');
      const result = handler.generateFillInstructions(snapshot, [
        { field_name: 'Enable', value: true },
      ]);

      const instruction = result.instructions[0];
      expect(instruction.type).toBe('toggle_checkbox');
      expect(instruction.value).toBe('true');
    });
  });

  describe('edge cases', () => {
    test('handles empty snapshot', () => {
      const snapshot = parseSnapshot('');
      const values: FormFieldValue[] = [
        { field_name: 'Field', value: 'Value' },
      ];

      const result = handler.generateFillInstructions(snapshot, values);
      expect(result.success).toBe(false);
    });

    test('handles empty values array', () => {
      const snapshot = parseSnapshot('[1] textbox "Field"');
      const result = handler.generateFillInstructions(snapshot, []);

      expect(result.success).toBe(true);
      expect(result.instructions.length).toBe(0);
    });

    test('handles special characters in field values', () => {
      const snapshot = parseSnapshot('[1] textbox "Description"');
      const values: FormFieldValue[] = [
        { field_name: 'Description', value: 'Test <script>alert(1)</script>' },
      ];

      const result = handler.generateFillInstructions(snapshot, values);
      expect(result.success).toBe(true);
      expect(result.instructions[0].value).toContain('<script>');
    });

    test('handles unicode in field values', () => {
      const snapshot = parseSnapshot('[1] textbox "Message"');
      const values: FormFieldValue[] = [
        { field_name: 'Message', value: '你好世界 🌍' },
      ];

      const result = handler.generateFillInstructions(snapshot, values);
      expect(result.success).toBe(true);
      expect(result.instructions[0].value).toBe('你好世界 🌍');
    });

    test('handles checkbox with string "true"', () => {
      const snapshot = parseSnapshot('[1] checkbox "Enable"');
      const values: FormFieldValue[] = [
        { field_name: 'Enable', value: 'true' },
      ];

      const result = handler.generateFillInstructions(snapshot, values);
      expect(result.instructions[0].description).toContain('Check');
    });

    test('handles checkbox with string "false"', () => {
      const snapshot = parseSnapshot('[1] checkbox "Enable"');
      const values: FormFieldValue[] = [
        { field_name: 'Enable', value: 'false' },
      ];

      const result = handler.generateFillInstructions(snapshot, values);
      expect(result.instructions[0].description).toContain('Uncheck');
    });
  });

  describe('complex form scenarios', () => {
    test('handles multi-section form', () => {
      const snapshot = parseSnapshot(`
[1] tab "Basic Info" selected
[2] tab "Advanced"
[3] textbox "Name"
[4] textbox "Email"
[5] button "Additional Options" expanded=false
[6] textbox "Extra Field"
[7] combobox "Type"
[8] checkbox "Active"
[9] button "Save"
[10] button "Cancel"
      `);

      const values: FormFieldValue[] = [
        { field_name: 'Name', value: 'Test User' },
        { field_name: 'Email', value: 'test@example.com' },
        { field_name: 'Type', value: 'Premium' },
        { field_name: 'Active', value: true },
      ];

      const result = handler.generateFillInstructions(snapshot, values);

      expect(result.fields_filled.length).toBe(4);
      expect(result.instructions.some(i => i.type === 'fill_field')).toBe(true);
      expect(result.instructions.some(i => i.type === 'select_option')).toBe(true);
      expect(result.instructions.some(i => i.type === 'toggle_checkbox')).toBe(true);
    });

    test('handles tab navigation then fill', () => {
      const snapshot = parseSnapshot(`
[1] tab "Step 1"
[2] tab "Step 2"
[3] textbox "Config Option"
      `);

      const values: FormFieldValue[] = [
        { field_name: 'Config Option', value: 'Value' },
      ];

      const result = handler.generateFillInstructions(snapshot, values, {
        active_tab: 'Step 2',
      });

      expect(result.instructions[0].type).toBe('navigate_tab');
      expect(result.instructions[1].type).toBe('fill_field');
    });
  });
});
