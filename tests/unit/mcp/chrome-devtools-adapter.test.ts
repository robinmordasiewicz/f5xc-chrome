// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Chrome DevTools Adapter Tests
 *
 * Unit tests for the ChromeDevToolsAdapter class and instruction helpers.
 * Tests parameter building, snapshot parsing, and instruction generation.
 */

import {
  ChromeDevToolsAdapter,
  NavigationOptions,
  ClickOptions,
  FillOptions,
  WaitOptions,
  ScreenshotOptions,
  FormFieldInput,
  createNavigationInstruction,
  createClickInstruction,
  createFillInstruction,
  createSnapshotInstruction,
  createWaitInstruction,
} from '../../../src/mcp/chrome-devtools-adapter';
import type { DeterministicSelector } from '../../../src/types';

describe('Chrome DevTools Adapter', () => {
  describe('ChromeDevToolsAdapter.buildNavigationParams()', () => {
    test('builds params with URL only', () => {
      const options: NavigationOptions = {
        url: 'https://example.com',
      };

      const params = ChromeDevToolsAdapter.buildNavigationParams(options);

      expect(params.url).toBe('https://example.com');
      expect(params.type).toBe('url');
      expect(params.ignoreCache).toBeUndefined();
      expect(params.timeout).toBeUndefined();
    });

    test('builds params with all options', () => {
      const options: NavigationOptions = {
        url: 'https://example.com/page',
        type: 'url',
        ignoreCache: true,
        timeout: 30000,
      };

      const params = ChromeDevToolsAdapter.buildNavigationParams(options);

      expect(params.url).toBe('https://example.com/page');
      expect(params.type).toBe('url');
      expect(params.ignoreCache).toBe(true);
      expect(params.timeout).toBe(30000);
    });

    test('builds params for back navigation', () => {
      const options: NavigationOptions = {
        url: '',
        type: 'back',
      };

      const params = ChromeDevToolsAdapter.buildNavigationParams(options);
      expect(params.type).toBe('back');
    });

    test('builds params for forward navigation', () => {
      const options: NavigationOptions = {
        url: '',
        type: 'forward',
      };

      const params = ChromeDevToolsAdapter.buildNavigationParams(options);
      expect(params.type).toBe('forward');
    });

    test('builds params for reload', () => {
      const options: NavigationOptions = {
        url: '',
        type: 'reload',
        ignoreCache: true,
      };

      const params = ChromeDevToolsAdapter.buildNavigationParams(options);

      expect(params.type).toBe('reload');
      expect(params.ignoreCache).toBe(true);
    });
  });

  describe('ChromeDevToolsAdapter.buildClickParams()', () => {
    test('builds params with UID only', () => {
      const options: ClickOptions = {
        uid: 'ref123',
      };

      const params = ChromeDevToolsAdapter.buildClickParams(options);

      expect(params.uid).toBe('ref123');
      expect(params.element).toBe('Element ref123');
      expect(params.button).toBeUndefined();
      expect(params.doubleClick).toBeUndefined();
    });

    test('builds params with all options', () => {
      const options: ClickOptions = {
        uid: 'btn_submit',
        element: 'Submit Button',
        button: 'left',
        doubleClick: false,
      };

      const params = ChromeDevToolsAdapter.buildClickParams(options);

      expect(params.uid).toBe('btn_submit');
      expect(params.element).toBe('Submit Button');
      expect(params.button).toBe('left');
      expect(params.doubleClick).toBe(false);
    });

    test('builds params for right-click', () => {
      const options: ClickOptions = {
        uid: 'context_menu',
        button: 'right',
      };

      const params = ChromeDevToolsAdapter.buildClickParams(options);
      expect(params.button).toBe('right');
    });

    test('builds params for double-click', () => {
      const options: ClickOptions = {
        uid: 'edit_cell',
        doubleClick: true,
      };

      const params = ChromeDevToolsAdapter.buildClickParams(options);
      expect(params.doubleClick).toBe(true);
    });

    test('builds params for middle-click', () => {
      const options: ClickOptions = {
        uid: 'link',
        button: 'middle',
      };

      const params = ChromeDevToolsAdapter.buildClickParams(options);
      expect(params.button).toBe('middle');
    });
  });

  describe('ChromeDevToolsAdapter.buildClickFromSelector()', () => {
    test('builds params from text_match selector', () => {
      const selector: DeterministicSelector = {
        type: 'text_match',
        value: 'Submit',
        confidence: 0.75,
      };

      const params = ChromeDevToolsAdapter.buildClickFromSelector(selector);

      expect(params.ref).toBe('Submit');
      expect(params.element).toBe('Element with text_match: Submit');
    });

    test('builds params from ref selector', () => {
      const selector: DeterministicSelector = {
        type: 'ref',
        value: 'ref123',
        confidence: 0.1,
      };

      const params = ChromeDevToolsAdapter.buildClickFromSelector(selector);

      expect(params.ref).toBe('ref123');
      expect(params.element).toBe('Element with ref: ref123');
    });

    test('builds params with custom description', () => {
      const selector: DeterministicSelector = {
        type: 'aria_label',
        value: 'Close Dialog',
        confidence: 0.9,
      };

      const params = ChromeDevToolsAdapter.buildClickFromSelector(
        selector,
        'Close button in modal'
      );

      expect(params.ref).toBe('Close Dialog');
      expect(params.element).toBe('Close button in modal');
    });

    test('handles all selector types', () => {
      const selectorTypes: DeterministicSelector['type'][] = [
        'name',
        'aria_label',
        'href_path',
        'text_match',
        'placeholder',
        'css',
        'ref',
      ];

      selectorTypes.forEach(type => {
        const selector: DeterministicSelector = {
          type,
          value: 'test-value',
          confidence: 0.5,
        };

        const params = ChromeDevToolsAdapter.buildClickFromSelector(selector);
        expect(params.ref).toBe('test-value');
        expect(params.element).toContain(type);
      });
    });
  });

  describe('ChromeDevToolsAdapter.buildFillParams()', () => {
    test('builds params correctly', () => {
      const options: FillOptions = {
        uid: 'input_email',
        value: 'test@example.com',
      };

      const params = ChromeDevToolsAdapter.buildFillParams(options);

      expect(params.uid).toBe('input_email');
      expect(params.value).toBe('test@example.com');
    });

    test('handles empty value', () => {
      const options: FillOptions = {
        uid: 'input_clear',
        value: '',
      };

      const params = ChromeDevToolsAdapter.buildFillParams(options);
      expect(params.value).toBe('');
    });

    test('handles special characters in value', () => {
      const options: FillOptions = {
        uid: 'input_password',
        value: 'P@ssw0rd!#$%',
      };

      const params = ChromeDevToolsAdapter.buildFillParams(options);
      expect(params.value).toBe('P@ssw0rd!#$%');
    });

    test('handles unicode in value', () => {
      const options: FillOptions = {
        uid: 'input_name',
        value: '日本語テスト',
      };

      const params = ChromeDevToolsAdapter.buildFillParams(options);
      expect(params.value).toBe('日本語テスト');
    });
  });

  describe('ChromeDevToolsAdapter.buildWaitParams()', () => {
    test('builds params for text wait', () => {
      const options: WaitOptions = {
        text: 'Loading complete',
      };

      const params = ChromeDevToolsAdapter.buildWaitParams(options);

      expect(params.text).toBe('Loading complete');
      expect(params.textGone).toBeUndefined();
      expect(params.time).toBeUndefined();
    });

    test('builds params for textGone wait', () => {
      const options: WaitOptions = {
        textGone: 'Please wait...',
      };

      const params = ChromeDevToolsAdapter.buildWaitParams(options);

      expect(params.textGone).toBe('Please wait...');
      expect(params.text).toBeUndefined();
    });

    test('builds params for time wait', () => {
      const options: WaitOptions = {
        time: 2,
      };

      const params = ChromeDevToolsAdapter.buildWaitParams(options);

      expect(params.time).toBe(2);
    });

    test('builds params with combined options', () => {
      const options: WaitOptions = {
        text: 'Success',
        time: 5,
      };

      const params = ChromeDevToolsAdapter.buildWaitParams(options);

      expect(params.text).toBe('Success');
      expect(params.time).toBe(5);
    });

    test('returns empty object for empty options', () => {
      const options: WaitOptions = {};
      const params = ChromeDevToolsAdapter.buildWaitParams(options);

      expect(Object.keys(params).length).toBe(0);
    });
  });

  describe('ChromeDevToolsAdapter.buildScreenshotParams()', () => {
    test('builds params for viewport screenshot', () => {
      const options: ScreenshotOptions = {};

      const params = ChromeDevToolsAdapter.buildScreenshotParams(options);

      expect(params.uid).toBeUndefined();
      expect(params.fullPage).toBeUndefined();
    });

    test('builds params for full page screenshot', () => {
      const options: ScreenshotOptions = {
        fullPage: true,
        filename: 'full-page.png',
        type: 'png',
      };

      const params = ChromeDevToolsAdapter.buildScreenshotParams(options);

      expect(params.fullPage).toBe(true);
      expect(params.filePath).toBe('full-page.png');
      expect(params.format).toBe('png');
    });

    test('builds params for element screenshot', () => {
      const options: ScreenshotOptions = {
        uid: 'ref_chart',
        element: 'Chart container',
        type: 'jpeg',
      };

      const params = ChromeDevToolsAdapter.buildScreenshotParams(options);

      expect(params.uid).toBe('ref_chart');
      expect(params.element).toBe('Chart container');
      expect(params.format).toBe('jpeg');
    });
  });

  describe('ChromeDevToolsAdapter.buildFormFillParams()', () => {
    test('builds params for single field', () => {
      const fields: FormFieldInput[] = [
        { ref: 'ref_email', name: 'Email', type: 'textbox', value: 'test@test.com' },
      ];

      const params = ChromeDevToolsAdapter.buildFormFillParams(fields);

      expect(params.elements).toHaveLength(1);
      expect((params.elements as Array<{ uid: string; value: string }>)[0]).toEqual({
        uid: 'ref_email',
        value: 'test@test.com',
      });
    });

    test('builds params for multiple fields', () => {
      const fields: FormFieldInput[] = [
        { ref: 'ref_name', name: 'Name', type: 'textbox', value: 'John Doe' },
        { ref: 'ref_email', name: 'Email', type: 'textbox', value: 'john@example.com' },
        { ref: 'ref_agree', name: 'Terms', type: 'checkbox', value: 'true' },
      ];

      const params = ChromeDevToolsAdapter.buildFormFillParams(fields);

      expect(params.elements).toHaveLength(3);
      const elements = params.elements as Array<{ uid: string; value: string }>;
      expect(elements[0].uid).toBe('ref_name');
      expect(elements[1].uid).toBe('ref_email');
      expect(elements[2].uid).toBe('ref_agree');
    });

    test('builds params for empty field list', () => {
      const fields: FormFieldInput[] = [];
      const params = ChromeDevToolsAdapter.buildFormFillParams(fields);

      expect(params.elements).toHaveLength(0);
    });

    test('handles all field types', () => {
      const fields: FormFieldInput[] = [
        { ref: 'ref1', name: 'Text', type: 'textbox', value: 'text value' },
        { ref: 'ref2', name: 'Check', type: 'checkbox', value: 'true' },
        { ref: 'ref3', name: 'Radio', type: 'radio', value: 'option1' },
        { ref: 'ref4', name: 'Combo', type: 'combobox', value: 'selection' },
        { ref: 'ref5', name: 'Slider', type: 'slider', value: '50' },
      ];

      const params = ChromeDevToolsAdapter.buildFormFillParams(fields);
      expect(params.elements).toHaveLength(5);
    });
  });

  describe('ChromeDevToolsAdapter.buildEvaluateParams()', () => {
    test('builds params for simple script', () => {
      const script = '() => document.title';
      const params = ChromeDevToolsAdapter.buildEvaluateParams(script);

      expect(params.function).toBe(script);
      expect(params.element).toBeUndefined();
      expect(params.ref).toBeUndefined();
    });

    test('builds params for script with element', () => {
      const script = '(el) => el.innerText';
      const params = ChromeDevToolsAdapter.buildEvaluateParams(script, 'ref123');

      expect(params.function).toBe(script);
      expect(params.element).toBe('Element ref123');
      expect(params.ref).toBe('ref123');
    });

    test('handles async script', () => {
      const script = 'async () => { await fetch("/api"); return true; }';
      const params = ChromeDevToolsAdapter.buildEvaluateParams(script);

      expect(params.function).toBe(script);
    });

    test('handles complex script', () => {
      const script = `() => {
        const items = document.querySelectorAll('.item');
        return Array.from(items).map(el => el.textContent);
      }`;
      const params = ChromeDevToolsAdapter.buildEvaluateParams(script);

      expect(params.function).toBe(script);
    });
  });

  describe('ChromeDevToolsAdapter.buildSelectParams()', () => {
    test('builds params for single selection', () => {
      const params = ChromeDevToolsAdapter.buildSelectParams(
        'ref_country',
        ['USA']
      );

      expect(params.ref).toBe('ref_country');
      expect(params.values).toEqual(['USA']);
      expect(params.element).toBe('Select ref_country');
    });

    test('builds params for multiple selection', () => {
      const params = ChromeDevToolsAdapter.buildSelectParams(
        'ref_tags',
        ['tag1', 'tag2', 'tag3'],
        'Tags dropdown'
      );

      expect(params.ref).toBe('ref_tags');
      expect(params.values).toEqual(['tag1', 'tag2', 'tag3']);
      expect(params.element).toBe('Tags dropdown');
    });

    test('builds params with custom description', () => {
      const params = ChromeDevToolsAdapter.buildSelectParams(
        'ref_size',
        ['medium'],
        'Size selector'
      );

      expect(params.element).toBe('Size selector');
    });
  });

  describe('ChromeDevToolsAdapter.buildHoverParams()', () => {
    test('builds params without description', () => {
      const params = ChromeDevToolsAdapter.buildHoverParams('ref_menu');

      expect(params.ref).toBe('ref_menu');
      expect(params.element).toBe('Element ref_menu');
    });

    test('builds params with description', () => {
      const params = ChromeDevToolsAdapter.buildHoverParams(
        'ref_tooltip',
        'Info tooltip trigger'
      );

      expect(params.ref).toBe('ref_tooltip');
      expect(params.element).toBe('Info tooltip trigger');
    });
  });

  describe('ChromeDevToolsAdapter.buildKeyPressParams()', () => {
    test('builds params for simple key', () => {
      const params = ChromeDevToolsAdapter.buildKeyPressParams('Enter');
      expect(params.key).toBe('Enter');
    });

    test('builds params for key combination', () => {
      const params = ChromeDevToolsAdapter.buildKeyPressParams('Control+A');
      expect(params.key).toBe('Control+A');
    });

    test('handles various keys', () => {
      const keys = ['Tab', 'Escape', 'ArrowDown', 'Control+Shift+S', 'Meta+V'];
      keys.forEach(key => {
        const params = ChromeDevToolsAdapter.buildKeyPressParams(key);
        expect(params.key).toBe(key);
      });
    });
  });

  describe('ChromeDevToolsAdapter.buildTypeParams()', () => {
    test('builds params for basic typing', () => {
      const params = ChromeDevToolsAdapter.buildTypeParams('ref_input', 'Hello World');

      expect(params.ref).toBe('ref_input');
      expect(params.element).toBe('Element ref_input');
      expect(params.text).toBe('Hello World');
      expect(params.slowly).toBeUndefined();
      expect(params.submit).toBeUndefined();
    });

    test('builds params for slow typing', () => {
      const params = ChromeDevToolsAdapter.buildTypeParams(
        'ref_search',
        'query',
        { slowly: true }
      );

      expect(params.slowly).toBe(true);
    });

    test('builds params with submit', () => {
      const params = ChromeDevToolsAdapter.buildTypeParams(
        'ref_search',
        'search term',
        { submit: true }
      );

      expect(params.submit).toBe(true);
    });

    test('builds params with all options', () => {
      const params = ChromeDevToolsAdapter.buildTypeParams(
        'ref_field',
        'value',
        { slowly: true, submit: true }
      );

      expect(params.slowly).toBe(true);
      expect(params.submit).toBe(true);
    });
  });

  describe('ChromeDevToolsAdapter.parseSnapshotPreview()', () => {
    test('extracts UIDs from simple snapshot', () => {
      const raw = '[1] button "Submit"\n[2] link "Home"';
      const uids = ChromeDevToolsAdapter.parseSnapshotPreview(raw);

      expect(uids).toEqual(['1', '2']);
    });

    test('extracts UIDs from complex snapshot', () => {
      const raw = `[1] navigation
  [2] link "Home"
  [3] link "Settings"
[4] main
  [5] heading "Dashboard"
  [6] button "Add Item"`;

      const uids = ChromeDevToolsAdapter.parseSnapshotPreview(raw);
      expect(uids).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    test('returns empty array for snapshot without UIDs', () => {
      const raw = 'navigation\n  link "Home"';
      const uids = ChromeDevToolsAdapter.parseSnapshotPreview(raw);

      expect(uids).toEqual([]);
    });

    test('handles empty snapshot', () => {
      const uids = ChromeDevToolsAdapter.parseSnapshotPreview('');
      expect(uids).toEqual([]);
    });

    test('extracts UIDs with various formats', () => {
      const raw = '[10] [20] [30] elements [40] mixed [50]';
      const uids = ChromeDevToolsAdapter.parseSnapshotPreview(raw);

      expect(uids).toEqual(['10', '20', '30', '40', '50']);
    });
  });

  describe('ChromeDevToolsAdapter.getToolName()', () => {
    test('formats tool name correctly', () => {
      expect(ChromeDevToolsAdapter.getToolName('navigate_page'))
        .toBe('mcp__chrome-devtools__navigate_page');
    });

    test('formats various action names', () => {
      const actions = [
        'take_snapshot',
        'click',
        'fill',
        'wait_for',
        'evaluate_script',
      ];

      actions.forEach(action => {
        expect(ChromeDevToolsAdapter.getToolName(action))
          .toBe(`mcp__chrome-devtools__${action}`);
      });
    });
  });

  describe('ChromeDevToolsAdapter.getAvailableTools()', () => {
    test('returns list of available tools', () => {
      const tools = ChromeDevToolsAdapter.getAvailableTools();

      expect(tools).toContain('navigate_page');
      expect(tools).toContain('take_snapshot');
      expect(tools).toContain('take_screenshot');
      expect(tools).toContain('click');
      expect(tools).toContain('fill');
      expect(tools).toContain('fill_form');
      expect(tools).toContain('hover');
      expect(tools).toContain('select_option');
      expect(tools).toContain('press_key');
      expect(tools).toContain('browser_type');
      expect(tools).toContain('wait_for');
      expect(tools).toContain('evaluate_script');
    });

    test('returns comprehensive tool list', () => {
      const tools = ChromeDevToolsAdapter.getAvailableTools();

      expect(tools.length).toBeGreaterThanOrEqual(20);
      expect(tools).toContain('list_pages');
      expect(tools).toContain('select_page');
      expect(tools).toContain('new_page');
      expect(tools).toContain('close_page');
      expect(tools).toContain('list_network_requests');
      expect(tools).toContain('get_network_request');
      expect(tools).toContain('list_console_messages');
      expect(tools).toContain('get_console_message');
      expect(tools).toContain('handle_dialog');
      expect(tools).toContain('drag');
      expect(tools).toContain('resize_page');
      expect(tools).toContain('emulate');
    });
  });

  describe('createNavigationInstruction()', () => {
    test('creates navigation instruction', () => {
      const instruction = createNavigationInstruction('https://example.com');

      expect(instruction).toContain('Navigate to https://example.com');
      expect(instruction).toContain('mcp__chrome-devtools__navigate_page');
    });

    test('handles various URLs', () => {
      const urls = [
        'https://example.com',
        'https://example.com/path/to/page',
        'https://example.com?query=value',
        '/relative/path',
      ];

      urls.forEach(url => {
        const instruction = createNavigationInstruction(url);
        expect(instruction).toContain(url);
      });
    });
  });

  describe('createClickInstruction()', () => {
    test('creates click instruction', () => {
      const instruction = createClickInstruction('ref123', 'Submit Button');

      expect(instruction).toContain('Click on Submit Button');
      expect(instruction).toContain('uid: ref123');
      expect(instruction).toContain('mcp__chrome-devtools__click');
    });

    test('handles various descriptions', () => {
      const instruction = createClickInstruction('btn_ok', 'OK button in dialog');

      expect(instruction).toContain('OK button in dialog');
      expect(instruction).toContain('btn_ok');
    });
  });

  describe('createFillInstruction()', () => {
    test('creates fill instruction', () => {
      const instruction = createFillInstruction('input_email', 'test@example.com');

      expect(instruction).toContain('Fill input_email');
      expect(instruction).toContain('"test@example.com"');
      expect(instruction).toContain('mcp__chrome-devtools__fill');
    });

    test('handles special characters in value', () => {
      const instruction = createFillInstruction('input_pass', 'P@ss!word');
      expect(instruction).toContain('"P@ss!word"');
    });
  });

  describe('createSnapshotInstruction()', () => {
    test('creates snapshot instruction', () => {
      const instruction = createSnapshotInstruction();

      expect(instruction).toContain('Take a page snapshot');
      expect(instruction).toContain('mcp__chrome-devtools__take_snapshot');
      expect(instruction).toContain('current page state');
    });
  });

  describe('createWaitInstruction()', () => {
    test('creates wait instruction', () => {
      const instruction = createWaitInstruction('loading spinner to disappear');

      expect(instruction).toContain('Wait for loading spinner to disappear');
      expect(instruction).toContain('mcp__chrome-devtools__wait_for');
    });

    test('handles various conditions', () => {
      const conditions = [
        'page to load',
        'button to become enabled',
        'error message',
        '2 seconds',
      ];

      conditions.forEach(condition => {
        const instruction = createWaitInstruction(condition);
        expect(instruction).toContain(condition);
      });
    });
  });

  describe('edge cases', () => {
    test('handles empty strings in parameters', () => {
      const fillParams = ChromeDevToolsAdapter.buildFillParams({
        uid: '',
        value: '',
      });
      expect(fillParams.uid).toBe('');
      expect(fillParams.value).toBe('');
    });

    test('handles very long strings', () => {
      const longValue = 'A'.repeat(10000);
      const fillParams = ChromeDevToolsAdapter.buildFillParams({
        uid: 'ref',
        value: longValue,
      });
      expect(fillParams.value).toBe(longValue);
    });

    test('handles special characters in UIDs', () => {
      const clickParams = ChromeDevToolsAdapter.buildClickParams({
        uid: 'ref_with-special.chars:123',
      });
      expect(clickParams.uid).toBe('ref_with-special.chars:123');
    });

    test('handles newlines in values', () => {
      const fillParams = ChromeDevToolsAdapter.buildFillParams({
        uid: 'textarea',
        value: 'Line 1\nLine 2\nLine 3',
      });
      expect(fillParams.value).toContain('\n');
    });
  });

  describe('type safety', () => {
    test('NavigationOptions type allows valid values', () => {
      const validOptions: NavigationOptions[] = [
        { url: 'https://test.com' },
        { url: '', type: 'back' },
        { url: '', type: 'forward' },
        { url: 'https://test.com', type: 'reload', ignoreCache: true },
        { url: 'https://test.com', timeout: 5000 },
      ];

      validOptions.forEach(opt => {
        expect(() => ChromeDevToolsAdapter.buildNavigationParams(opt)).not.toThrow();
      });
    });

    test('ClickOptions type allows valid button values', () => {
      const buttons: Array<'left' | 'right' | 'middle'> = ['left', 'right', 'middle'];
      buttons.forEach(button => {
        const params = ChromeDevToolsAdapter.buildClickParams({
          uid: 'ref',
          button,
        });
        expect(params.button).toBe(button);
      });
    });

    test('ScreenshotOptions type allows valid format values', () => {
      const formats: Array<'png' | 'jpeg'> = ['png', 'jpeg'];
      formats.forEach(type => {
        const params = ChromeDevToolsAdapter.buildScreenshotParams({ type });
        expect(params.format).toBe(type);
      });
    });
  });
});
