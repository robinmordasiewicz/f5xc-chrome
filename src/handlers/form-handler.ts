// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Form Handler
 *
 * Handles form field population and validation for F5 XC Console forms.
 * Supports various input types: textbox, select, checkbox, radio, listbox.
 */

import {
  FormMetadata,
  FormField,
  FormSection,
  InputType,
  SelectorDefinition,
  ElementMetadata,
} from '../types';
import { ParsedSnapshot, ParsedElement, getSnapshotParser } from '../mcp/snapshot-parser';
import { ChromeDevToolsAdapter, createFillInstruction, createClickInstruction } from '../mcp/chrome-devtools-adapter';

/**
 * Form field value definition
 */
export interface FormFieldValue {
  /** Field name/identifier */
  field_name: string;
  /** Value to set */
  value: string | boolean | string[];
  /** Field type hint */
  field_type?: InputType;
}

/**
 * Form fill options
 */
export interface FormFillOptions {
  /** Whether to validate fields before filling */
  validate_before_fill?: boolean;
  /** Whether to clear existing values first */
  clear_existing?: boolean;
  /** Delay between field operations (ms) */
  delay_between_fields?: number;
  /** Whether to skip fields that can't be found */
  skip_missing_fields?: boolean;
  /** Tab to activate (for multi-tab forms) */
  active_tab?: string;
  /** Section to focus on */
  active_section?: string;
}

/**
 * Form fill result
 */
export interface FormFillResult {
  /** Whether all fills succeeded */
  success: boolean;
  /** Fields that were filled */
  fields_filled: string[];
  /** Fields that failed */
  fields_failed: string[];
  /** Validation errors detected */
  validation_errors: FormValidationError[];
  /** Instructions generated for MCP execution */
  instructions: FormInstruction[];
  /** Summary message */
  summary: string;
}

/**
 * Form validation error
 */
export interface FormValidationError {
  /** Field name */
  field: string;
  /** Error message */
  message: string;
  /** Error type */
  type: 'required' | 'pattern' | 'min_length' | 'max_length' | 'invalid_option' | 'unknown';
}

/**
 * Form instruction for MCP execution
 */
export interface FormInstruction {
  /** Instruction type */
  type: 'navigate_tab' | 'expand_section' | 'fill_field' | 'click_button' | 'select_option' | 'toggle_checkbox';
  /** Target element UID (from snapshot) */
  target_uid?: string;
  /** Human-readable description */
  description: string;
  /** Value to set (for fill operations) */
  value?: string;
  /** Field metadata */
  field?: FormField;
  /** Whether instruction is required */
  required: boolean;
}

/**
 * Detected form field from snapshot
 */
export interface DetectedFormField {
  /** Element UID */
  uid: string;
  /** Field name/label */
  name: string;
  /** Input type */
  type: InputType;
  /** Current value */
  current_value?: string;
  /** Whether field appears required */
  required: boolean;
  /** Available options (for select/radio) */
  options?: string[];
  /** Placeholder text */
  placeholder?: string;
  /** Is field disabled */
  disabled: boolean;
}

/**
 * Form Handler class
 */
export class FormHandler {
  private adapter: ChromeDevToolsAdapter;

  constructor() {
    this.adapter = new ChromeDevToolsAdapter();
  }

  /**
   * Generate instructions to fill a form with the given values
   */
  generateFillInstructions(
    snapshot: ParsedSnapshot,
    values: FormFieldValue[],
    options: FormFillOptions = {}
  ): FormFillResult {
    const instructions: FormInstruction[] = [];
    const fieldsFilled: string[] = [];
    const fieldsFailed: string[] = [];
    const validationErrors: FormValidationError[] = [];

    // Detect form fields in the snapshot
    const detectedFields = this.detectFormFields(snapshot);

    // Handle tab navigation if specified
    if (options.active_tab) {
      const tabInstruction = this.generateTabInstruction(snapshot, options.active_tab);
      if (tabInstruction) {
        instructions.push(tabInstruction);
      }
    }

    // Handle section expansion if specified
    if (options.active_section) {
      const sectionInstruction = this.generateSectionInstruction(snapshot, options.active_section);
      if (sectionInstruction) {
        instructions.push(sectionInstruction);
      }
    }

    // Process each value
    for (const fieldValue of values) {
      const field = this.findMatchingField(detectedFields, fieldValue.field_name);

      if (!field) {
        if (options.skip_missing_fields) {
          console.warn(`Field not found: ${fieldValue.field_name}`);
          fieldsFailed.push(fieldValue.field_name);
          continue;
        } else {
          fieldsFailed.push(fieldValue.field_name);
          validationErrors.push({
            field: fieldValue.field_name,
            message: `Field not found in form`,
            type: 'unknown',
          });
          continue;
        }
      }

      // Validate value if requested
      if (options.validate_before_fill) {
        const error = this.validateFieldValue(field, fieldValue.value);
        if (error) {
          validationErrors.push(error);
          fieldsFailed.push(fieldValue.field_name);
          continue;
        }
      }

      // Generate instruction based on field type
      const instruction = this.generateFieldInstruction(field, fieldValue.value, options);
      if (instruction) {
        instructions.push(instruction);
        fieldsFilled.push(fieldValue.field_name);
      } else {
        fieldsFailed.push(fieldValue.field_name);
      }
    }

    const success = fieldsFailed.length === 0 && validationErrors.length === 0;
    const summary = success
      ? `Successfully generated instructions for ${fieldsFilled.length} fields`
      : `Generated instructions for ${fieldsFilled.length} fields, ${fieldsFailed.length} failed`;

    return {
      success,
      fields_filled: fieldsFilled,
      fields_failed: fieldsFailed,
      validation_errors: validationErrors,
      instructions,
      summary,
    };
  }

  /**
   * Detect form fields in a snapshot
   */
  detectFormFields(snapshot: ParsedSnapshot): DetectedFormField[] {
    const fields: DetectedFormField[] = [];

    for (const element of snapshot.elements) {
      const fieldType = this.elementRoleToInputType(element.role);

      if (fieldType) {
        fields.push({
          uid: element.uid,
          name: element.name ?? element.placeholder ?? `field_${element.uid}`,
          type: fieldType,
          current_value: element.value,
          required: this.detectRequired(element),
          options: this.detectOptions(element, snapshot),
          placeholder: element.placeholder,
          disabled: element.disabled ?? false,
        });
      }
    }

    return fields;
  }

  /**
   * Map element role to input type
   */
  private elementRoleToInputType(role: string): InputType | null {
    const roleMap: Record<string, InputType> = {
      textbox: 'textbox',
      searchbox: 'textbox',
      combobox: 'combobox',
      listbox: 'listbox',
      checkbox: 'checkbox',
      radio: 'radio',
      switch: 'switch',
      spinbutton: 'spinbutton',
    };

    return roleMap[role] ?? null;
  }

  /**
   * Detect if field is required
   */
  private detectRequired(element: ParsedElement): boolean {
    // Check for required indicators in name or description
    const text = `${element.name ?? ''} ${element.description ?? ''}`.toLowerCase();
    return text.includes('required') || text.includes('*');
  }

  /**
   * Detect available options for select/listbox fields
   */
  private detectOptions(element: ParsedElement, snapshot: ParsedSnapshot): string[] | undefined {
    if (element.role !== 'combobox' && element.role !== 'listbox') {
      return undefined;
    }

    // Look for option elements near this element (simplified approach)
    const options: string[] = [];
    const elementIndex = snapshot.elements.findIndex(e => e.uid === element.uid);

    // Look at subsequent elements at same or deeper level
    for (let i = elementIndex + 1; i < snapshot.elements.length && i < elementIndex + 20; i++) {
      const nextElement = snapshot.elements[i];

      if (nextElement.role === 'option' || nextElement.role === 'menuitem') {
        if (nextElement.name) {
          options.push(nextElement.name);
        }
      }

      // Stop if we've gone back to a shallower level
      if (nextElement.level <= element.level && nextElement.role !== 'option') {
        break;
      }
    }

    return options.length > 0 ? options : undefined;
  }

  /**
   * Find a field matching the given name
   */
  private findMatchingField(
    fields: DetectedFormField[],
    fieldName: string
  ): DetectedFormField | undefined {
    const nameLower = fieldName.toLowerCase();

    // Try exact match first
    let match = fields.find(f => f.name.toLowerCase() === nameLower);
    if (match) return match;

    // Try partial match
    match = fields.find(f => f.name.toLowerCase().includes(nameLower));
    if (match) return match;

    // Try matching by normalized name
    const normalizedName = nameLower.replace(/[^a-z0-9]/g, '');
    match = fields.find(f => {
      const normalizedFieldName = f.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return normalizedFieldName.includes(normalizedName) || normalizedName.includes(normalizedFieldName);
    });

    return match;
  }

  /**
   * Validate a field value
   */
  private validateFieldValue(
    field: DetectedFormField,
    value: string | boolean | string[]
  ): FormValidationError | null {
    // Check if field is disabled
    if (field.disabled) {
      return {
        field: field.name,
        message: 'Field is disabled',
        type: 'unknown',
      };
    }

    // For select fields, check if value is in options
    if (field.options && typeof value === 'string') {
      const optionsLower = field.options.map(o => o.toLowerCase());
      if (!optionsLower.includes(value.toLowerCase())) {
        return {
          field: field.name,
          message: `Invalid option: ${value}. Available options: ${field.options.join(', ')}`,
          type: 'invalid_option',
        };
      }
    }

    return null;
  }

  /**
   * Generate instruction for filling a field
   */
  private generateFieldInstruction(
    field: DetectedFormField,
    value: string | boolean | string[],
    options: FormFillOptions
  ): FormInstruction | null {
    switch (field.type) {
      case 'textbox':
      case 'spinbutton':
        return {
          type: 'fill_field',
          target_uid: field.uid,
          description: `Fill "${field.name}" with "${value}"`,
          value: String(value),
          required: field.required,
        };

      case 'combobox':
      case 'listbox':
      case 'select':
        return {
          type: 'select_option',
          target_uid: field.uid,
          description: `Select "${value}" in "${field.name}"`,
          value: String(value),
          required: field.required,
        };

      case 'checkbox':
      case 'switch':
        const shouldCheck = typeof value === 'boolean' ? value : value === 'true';
        return {
          type: 'toggle_checkbox',
          target_uid: field.uid,
          description: `${shouldCheck ? 'Check' : 'Uncheck'} "${field.name}"`,
          value: String(shouldCheck),
          required: field.required,
        };

      case 'radio':
        return {
          type: 'click_button',
          target_uid: field.uid,
          description: `Select radio option "${field.name}"`,
          required: field.required,
        };

      default:
        return null;
    }
  }

  /**
   * Generate tab navigation instruction
   */
  private generateTabInstruction(
    snapshot: ParsedSnapshot,
    tabName: string
  ): FormInstruction | null {
    const tabNameLower = tabName.toLowerCase();

    // Find tab element
    const tabElement = snapshot.elements.find(
      e => e.role === 'tab' && e.name?.toLowerCase().includes(tabNameLower)
    );

    if (!tabElement) {
      return null;
    }

    return {
      type: 'navigate_tab',
      target_uid: tabElement.uid,
      description: `Navigate to "${tabName}" tab`,
      required: true,
    };
  }

  /**
   * Generate section expansion instruction
   */
  private generateSectionInstruction(
    snapshot: ParsedSnapshot,
    sectionName: string
  ): FormInstruction | null {
    const sectionNameLower = sectionName.toLowerCase();

    // Find expandable section (button with expanded state)
    const sectionElement = snapshot.elements.find(
      e =>
        (e.role === 'button' || e.role === 'heading') &&
        e.name?.toLowerCase().includes(sectionNameLower) &&
        e.expanded === false
    );

    if (!sectionElement) {
      return null;
    }

    return {
      type: 'expand_section',
      target_uid: sectionElement.uid,
      description: `Expand "${sectionName}" section`,
      required: true,
    };
  }

  /**
   * Generate submit form instruction
   */
  generateSubmitInstruction(snapshot: ParsedSnapshot): FormInstruction | null {
    // Look for submit button
    const submitButton = snapshot.elements.find(e => {
      if (e.role !== 'button') return false;
      const name = (e.name ?? '').toLowerCase();
      return (
        name.includes('save') ||
        name.includes('submit') ||
        name.includes('create') ||
        name.includes('apply')
      );
    });

    if (!submitButton) {
      return null;
    }

    return {
      type: 'click_button',
      target_uid: submitButton.uid,
      description: `Click "${submitButton.name}" button to submit form`,
      required: true,
    };
  }

  /**
   * Generate cancel form instruction
   */
  generateCancelInstruction(snapshot: ParsedSnapshot): FormInstruction | null {
    // Look for cancel button
    const cancelButton = snapshot.elements.find(e => {
      if (e.role !== 'button') return false;
      const name = (e.name ?? '').toLowerCase();
      return name.includes('cancel') || name.includes('close') || name.includes('discard');
    });

    if (!cancelButton) {
      return null;
    }

    return {
      type: 'click_button',
      target_uid: cancelButton.uid,
      description: `Click "${cancelButton.name}" button to cancel form`,
      required: true,
    };
  }

  /**
   * Detect validation errors on the page
   */
  detectValidationErrors(snapshot: ParsedSnapshot): FormValidationError[] {
    const errors: FormValidationError[] = [];

    // Look for error elements
    for (const element of snapshot.elements) {
      const isError =
        element.role === 'alert' ||
        element.name?.toLowerCase().includes('error') ||
        element.description?.toLowerCase().includes('error') ||
        element.description?.toLowerCase().includes('required') ||
        element.description?.toLowerCase().includes('invalid');

      if (isError && element.name) {
        errors.push({
          field: 'unknown', // Would need more context to determine field
          message: element.name,
          type: 'unknown',
        });
      }
    }

    return errors;
  }

  /**
   * Convert form instructions to MCP instructions
   */
  toMcpInstructions(instructions: FormInstruction[]): string[] {
    return instructions.map(inst => {
      switch (inst.type) {
        case 'fill_field':
          return createFillInstruction(inst.target_uid!, inst.value!);

        case 'select_option':
          // For combobox, we typically click then select
          return `Click on ${inst.description}, then select option "${inst.value}"`;

        case 'toggle_checkbox':
          return createClickInstruction(inst.target_uid!, inst.description);

        case 'click_button':
        case 'navigate_tab':
        case 'expand_section':
          return createClickInstruction(inst.target_uid!, inst.description);

        default:
          return inst.description;
      }
    });
  }

  /**
   * Get form structure from metadata
   */
  describeFormStructure(metadata: FormMetadata): string {
    const parts: string[] = ['Form structure:'];

    if (metadata.tabs && metadata.tabs.length > 0) {
      parts.push(`  Tabs: ${metadata.tabs.join(', ')}`);
    }

    if (metadata.sections) {
      parts.push('  Sections:');
      for (const [name, section] of Object.entries(metadata.sections)) {
        const fieldCount = Object.keys(section.fields).length;
        parts.push(`    - ${name}: ${fieldCount} fields`);
      }
    }

    if (metadata.fields) {
      parts.push(`  Fields: ${Object.keys(metadata.fields).length}`);
    }

    return parts.join('\n');
  }
}

// Singleton instance
let formHandlerInstance: FormHandler | null = null;

/**
 * Get the singleton form handler instance
 */
export function getFormHandler(): FormHandler {
  if (!formHandlerInstance) {
    formHandlerInstance = new FormHandler();
  }
  return formHandlerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetFormHandler(): void {
  formHandlerInstance = null;
}

/**
 * Generate instructions to fill a form
 */
export function generateFormFillInstructions(
  snapshot: ParsedSnapshot,
  values: FormFieldValue[],
  options?: FormFillOptions
): FormFillResult {
  const handler = getFormHandler();
  return handler.generateFillInstructions(snapshot, values, options);
}

/**
 * Detect form fields in a snapshot
 */
export function detectFormFields(snapshot: ParsedSnapshot): DetectedFormField[] {
  const handler = getFormHandler();
  return handler.detectFormFields(snapshot);
}
