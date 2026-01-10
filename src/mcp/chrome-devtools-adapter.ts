// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Chrome DevTools MCP Adapter
 *
 * Typed wrapper for chrome-devtools MCP server calls.
 * Provides a clean interface for browser automation operations.
 */

import { DeterministicSelector } from '../types';

/**
 * Navigation options
 */
export interface NavigationOptions {
  /** URL to navigate to */
  url: string;
  /** Navigation type */
  type?: 'url' | 'back' | 'forward' | 'reload';
  /** Whether to ignore cache on reload */
  ignoreCache?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Click options
 */
export interface ClickOptions {
  /** Element UID from snapshot */
  uid: string;
  /** Human-readable description */
  element?: string;
  /** Mouse button */
  button?: 'left' | 'right' | 'middle';
  /** Whether to double-click */
  doubleClick?: boolean;
}

/**
 * Fill options
 */
export interface FillOptions {
  /** Element UID from snapshot */
  uid: string;
  /** Value to fill */
  value: string;
}

/**
 * Wait options
 */
export interface WaitOptions {
  /** Text to wait for */
  text?: string;
  /** Text to wait for disappearance */
  textGone?: string;
  /** Time to wait in seconds */
  time?: number;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Screenshot options
 */
export interface ScreenshotOptions {
  /** Element UID for element screenshot */
  uid?: string;
  /** Element description */
  element?: string;
  /** Whether to capture full page */
  fullPage?: boolean;
  /** Output file path */
  filename?: string;
  /** Image format */
  type?: 'png' | 'jpeg';
}

/**
 * Form field for bulk fill
 */
export interface FormFieldInput {
  /** Element UID */
  ref: string;
  /** Field name */
  name: string;
  /** Field type */
  type: 'textbox' | 'checkbox' | 'radio' | 'combobox' | 'slider';
  /** Value to fill */
  value: string;
}

/**
 * Snapshot element from accessibility tree
 */
export interface SnapshotElement {
  /** Element UID */
  uid: string;
  /** Element role */
  role: string;
  /** Element name */
  name?: string;
  /** Element value */
  value?: string;
  /** Element description */
  description?: string;
  /** Whether element is focused */
  focused?: boolean;
  /** Element children */
  children?: SnapshotElement[];
}

/**
 * Page snapshot result
 */
export interface PageSnapshot {
  /** Raw snapshot text */
  raw: string;
  /** Parsed elements */
  elements: SnapshotElement[];
  /** Current URL */
  url?: string;
  /** Page title */
  title?: string;
}

/**
 * Page info
 */
export interface PageInfo {
  /** Page index */
  index: number;
  /** Page URL */
  url: string;
  /** Page title */
  title: string;
  /** Whether page is selected */
  selected?: boolean;
}

/**
 * Network request info
 */
export interface NetworkRequest {
  /** Request ID */
  reqid: number;
  /** Request URL */
  url: string;
  /** Request method */
  method: string;
  /** Response status */
  status?: number;
  /** Resource type */
  resourceType: string;
}

/**
 * Console message info
 */
export interface ConsoleMessage {
  /** Message ID */
  msgid: number;
  /** Message type */
  type: string;
  /** Message text */
  text: string;
  /** Source URL */
  source?: string;
  /** Line number */
  line?: number;
}

/**
 * Chrome DevTools MCP Adapter
 *
 * Note: This adapter provides typed interfaces for MCP calls.
 * The actual MCP calls are made by Claude using the mcp__chrome-devtools__* tools.
 * This class provides structure and validation for the parameters and responses.
 */
export class ChromeDevToolsAdapter {
  /**
   * Build navigation parameters
   */
  static buildNavigationParams(options: NavigationOptions): Record<string, unknown> {
    return {
      url: options.url,
      type: options.type ?? 'url',
      ignoreCache: options.ignoreCache,
      timeout: options.timeout,
    };
  }

  /**
   * Build click parameters
   */
  static buildClickParams(options: ClickOptions): Record<string, unknown> {
    return {
      uid: options.uid,
      element: options.element ?? `Element ${options.uid}`,
      button: options.button,
      doubleClick: options.doubleClick,
    };
  }

  /**
   * Build click parameters from a deterministic selector
   */
  static buildClickFromSelector(
    selector: DeterministicSelector,
    description?: string
  ): Record<string, unknown> {
    return {
      ref: selector.value,
      element: description ?? `Element with ${selector.type}: ${selector.value}`,
    };
  }

  /**
   * Build fill parameters
   */
  static buildFillParams(options: FillOptions): Record<string, unknown> {
    return {
      uid: options.uid,
      value: options.value,
    };
  }

  /**
   * Build wait parameters
   */
  static buildWaitParams(options: WaitOptions): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    if (options.text) params.text = options.text;
    if (options.textGone) params.textGone = options.textGone;
    if (options.time) params.time = options.time;

    return params;
  }

  /**
   * Build screenshot parameters
   */
  static buildScreenshotParams(options: ScreenshotOptions): Record<string, unknown> {
    return {
      uid: options.uid,
      element: options.element,
      fullPage: options.fullPage,
      filePath: options.filename,
      format: options.type,
    };
  }

  /**
   * Build form fill parameters for multiple fields
   */
  static buildFormFillParams(fields: FormFieldInput[]): Record<string, unknown> {
    return {
      elements: fields.map(field => ({
        uid: field.ref,
        value: field.value,
      })),
    };
  }

  /**
   * Build evaluate script parameters
   */
  static buildEvaluateParams(
    script: string,
    elementUid?: string
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {
      function: script,
    };

    if (elementUid) {
      params.element = `Element ${elementUid}`;
      params.ref = elementUid;
    }

    return params;
  }

  /**
   * Build select option parameters
   */
  static buildSelectParams(
    uid: string,
    values: string[],
    description?: string
  ): Record<string, unknown> {
    return {
      ref: uid,
      element: description ?? `Select ${uid}`,
      values,
    };
  }

  /**
   * Build hover parameters
   */
  static buildHoverParams(uid: string, description?: string): Record<string, unknown> {
    return {
      ref: uid,
      element: description ?? `Element ${uid}`,
    };
  }

  /**
   * Build key press parameters
   */
  static buildKeyPressParams(key: string): Record<string, unknown> {
    return { key };
  }

  /**
   * Build type parameters
   */
  static buildTypeParams(
    uid: string,
    text: string,
    options?: { slowly?: boolean; submit?: boolean }
  ): Record<string, unknown> {
    return {
      ref: uid,
      element: `Element ${uid}`,
      text,
      slowly: options?.slowly,
      submit: options?.submit,
    };
  }

  /**
   * Parse raw snapshot text into structured elements
   * This is a simplified parser - the actual parsing happens in snapshot-parser.ts
   */
  static parseSnapshotPreview(raw: string): string[] {
    // Extract element identifiers from snapshot text
    const elements: string[] = [];
    const uidPattern = /\[(\d+)\]/g;
    let match;

    while ((match = uidPattern.exec(raw)) !== null) {
      elements.push(match[1]);
    }

    return elements;
  }

  /**
   * Format MCP tool name
   */
  static getToolName(action: string): string {
    return `mcp__chrome-devtools__${action}`;
  }

  /**
   * Get the list of available MCP tools
   */
  static getAvailableTools(): string[] {
    return [
      'navigate_page',
      'take_snapshot',
      'take_screenshot',
      'click',
      'fill',
      'fill_form',
      'hover',
      'select_option',
      'press_key',
      'browser_type',
      'wait_for',
      'evaluate_script',
      'list_pages',
      'select_page',
      'new_page',
      'close_page',
      'list_network_requests',
      'get_network_request',
      'list_console_messages',
      'get_console_message',
      'handle_dialog',
      'drag',
      'resize_page',
      'emulate',
    ];
  }
}

/**
 * Helper type for MCP tool response
 */
export interface MCPToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Create a navigation instruction for Claude
 */
export function createNavigationInstruction(url: string): string {
  return `Navigate to ${url} using mcp__chrome-devtools__navigate_page`;
}

/**
 * Create a click instruction for Claude
 */
export function createClickInstruction(uid: string, description: string): string {
  return `Click on ${description} (uid: ${uid}) using mcp__chrome-devtools__click`;
}

/**
 * Create a fill instruction for Claude
 */
export function createFillInstruction(uid: string, value: string): string {
  return `Fill ${uid} with "${value}" using mcp__chrome-devtools__fill`;
}

/**
 * Create a snapshot instruction for Claude
 */
export function createSnapshotInstruction(): string {
  return 'Take a page snapshot using mcp__chrome-devtools__take_snapshot to see current page state';
}

/**
 * Create a wait instruction for Claude
 */
export function createWaitInstruction(condition: string): string {
  return `Wait for ${condition} using mcp__chrome-devtools__wait_for`;
}
