/**
 * Snapshot Parser Unit Tests
 *
 * Tests for accessibility tree snapshot parsing and element finding.
 */

import {
  SnapshotParser,
  ParsedSnapshot,
  ParsedElement,
  getSnapshotParser,
  resetSnapshotParser,
  parseSnapshot,
} from '../../../src/mcp/snapshot-parser';
import {
  snapshotFactory,
  createTestSnapshot,
  SnapshotBuilder,
} from '../../helpers/snapshot-factory';

describe('Snapshot Parser', () => {
  let parser: SnapshotParser;

  beforeEach(() => {
    resetSnapshotParser();
    parser = new SnapshotParser();
  });

  afterAll(() => {
    resetSnapshotParser();
  });

  describe('parse()', () => {
    describe('basic parsing', () => {
      test('parses empty snapshot', () => {
        const result = parser.parse('');
        expect(result.elements).toHaveLength(0);
        expect(result.byUid.size).toBe(0);
        expect(result.byRole.size).toBe(0);
      });

      test('parses snapshot with URL', () => {
        const snapshot = '- URL: https://example.com/test\n[1] button "Submit"';
        const result = parser.parse(snapshot);
        expect(result.url).toBe('https://example.com/test');
      });

      test('parses snapshot with title', () => {
        const snapshot = '- Title: Test Page\n[1] button "Submit"';
        const result = parser.parse(snapshot);
        expect(result.title).toBe('Test Page');
      });

      test('parses snapshot with URL and title', () => {
        const snapshot = new SnapshotBuilder()
          .withUrl('https://example.com')
          .withTitle('Example Page')
          .addButton('Click Me')
          .build();
        const result = parser.parse(snapshot);
        expect(result.url).toBe('https://example.com');
        expect(result.title).toBe('Example Page');
      });

      test('parses single element', () => {
        const snapshot = '[1] button "Submit"';
        const result = parser.parse(snapshot);
        expect(result.elements).toHaveLength(1);
        expect(result.elements[0].uid).toBe('1');
        expect(result.elements[0].role).toBe('button');
        expect(result.elements[0].name).toBe('Submit');
      });

      test('parses multiple elements', () => {
        const snapshot = new SnapshotBuilder()
          .addButton('Submit')
          .addTextbox('Username')
          .addLink('Home', '/home')
          .build();
        const result = parser.parse(snapshot);
        expect(result.elements).toHaveLength(3);
      });

      test('indexes elements by UID', () => {
        const snapshot = '[uid1] button "First"\n[uid2] button "Second"';
        const result = parser.parse(snapshot);
        expect(result.byUid.get('uid1')?.name).toBe('First');
        expect(result.byUid.get('uid2')?.name).toBe('Second');
      });

      test('indexes elements by role', () => {
        const snapshot = new SnapshotBuilder()
          .addButton('Button 1')
          .addButton('Button 2')
          .addTextbox('Input')
          .build();
        const result = parser.parse(snapshot);
        expect(result.byRole.get('button')).toHaveLength(2);
        expect(result.byRole.get('textbox')).toHaveLength(1);
      });

      test('skips empty lines', () => {
        const snapshot = '[1] button "First"\n\n\n[2] button "Second"';
        const result = parser.parse(snapshot);
        expect(result.elements).toHaveLength(2);
      });

      test('tracks focused element', () => {
        const snapshot = '[1] button "Normal"\n[2] textbox "Focused" focused';
        const result = parser.parse(snapshot);
        expect(result.focusedUid).toBe('2');
      });
    });

    describe('element property parsing', () => {
      test('parses element with focused property', () => {
        const snapshot = '[1] textbox "Input" focused';
        const result = parser.parse(snapshot);
        expect(result.elements[0].focused).toBe(true);
      });

      test('parses element with disabled property', () => {
        const snapshot = '[1] button "Disabled" disabled';
        const result = parser.parse(snapshot);
        expect(result.elements[0].disabled).toBe(true);
      });

      test('parses element with expanded property', () => {
        const snapshot = '[1] combobox "Dropdown" expanded';
        const result = parser.parse(snapshot);
        expect(result.elements[0].expanded).toBe(true);
      });

      test('parses element with selected property', () => {
        const snapshot = '[1] option "Option 1" selected';
        const result = parser.parse(snapshot);
        expect(result.elements[0].selected).toBe(true);
      });

      test('parses element with href', () => {
        const snapshot = '[1] link "Home" href="/home"';
        const result = parser.parse(snapshot);
        expect(result.elements[0].href).toBe('/home');
      });

      test('parses element with value', () => {
        const snapshot = '[1] textbox "Username" value="john"';
        const result = parser.parse(snapshot);
        expect(result.elements[0].value).toBe('john');
      });

      test('parses element with placeholder', () => {
        const snapshot = '[1] textbox "Email" placeholder="Enter email"';
        const result = parser.parse(snapshot);
        expect(result.elements[0].placeholder).toBe('Enter email');
      });

      test('parses element with description', () => {
        const snapshot = '[1] button "Submit" description="Submit the form"';
        const result = parser.parse(snapshot);
        expect(result.elements[0].description).toBe('Submit the form');
      });

      test('parses element with multiple properties', () => {
        const snapshot = '[1] textbox "Search" focused placeholder="Search..." value="test"';
        const result = parser.parse(snapshot);
        const element = result.elements[0];
        expect(element.focused).toBe(true);
        expect(element.placeholder).toBe('Search...');
        expect(element.value).toBe('test');
      });

      test('calculates indentation level', () => {
        const snapshot = '[1] group "Parent"\n  [2] button "Child"\n    [3] text "Grandchild"';
        const result = parser.parse(snapshot);
        expect(result.elements[0].level).toBe(0);
        expect(result.elements[1].level).toBe(1);
        expect(result.elements[2].level).toBe(2);
      });

      test('preserves raw line', () => {
        const line = '[1] button "Submit" disabled';
        const result = parser.parse(line);
        expect(result.elements[0].raw).toBe(line);
      });
    });

    describe('login page fixture parsing', () => {
      test('parses login page fixture', () => {
        const snapshot = snapshotFactory.loginPage();
        const result = parser.parse(snapshot);
        expect(result.elements.length).toBeGreaterThan(0);
        expect(result.url).toBeDefined();
      });

      test('finds sign in button on login page', () => {
        const snapshot = snapshotFactory.loginPage();
        const result = parser.parse(snapshot);
        const signInButtons = result.elements.filter(
          e => e.role === 'button' && e.name?.includes('Sign In')
        );
        expect(signInButtons.length).toBeGreaterThan(0);
      });

      test('finds password field on login page', () => {
        const snapshot = snapshotFactory.loginPage();
        const result = parser.parse(snapshot);
        const passwordFields = result.elements.filter(
          e => e.role === 'textbox' && e.name?.toLowerCase().includes('password')
        );
        expect(passwordFields.length).toBeGreaterThan(0);
      });
    });
  });

  describe('findByUid()', () => {
    test('finds element by UID', () => {
      const snapshot = '[abc123] button "Submit"';
      const parsed = parser.parse(snapshot);
      const element = parser.findByUid(parsed, 'abc123');
      expect(element?.name).toBe('Submit');
    });

    test('returns undefined for non-existent UID', () => {
      const snapshot = '[1] button "Submit"';
      const parsed = parser.parse(snapshot);
      const element = parser.findByUid(parsed, 'nonexistent');
      expect(element).toBeUndefined();
    });
  });

  describe('findByRole()', () => {
    test('finds all elements by role', () => {
      const snapshot = new SnapshotBuilder()
        .addButton('Button 1')
        .addButton('Button 2')
        .addTextbox('Input')
        .build();
      const parsed = parser.parse(snapshot);
      const buttons = parser.findByRole(parsed, 'button');
      expect(buttons).toHaveLength(2);
    });

    test('returns empty array for non-existent role', () => {
      const snapshot = '[1] button "Submit"';
      const parsed = parser.parse(snapshot);
      const checkboxes = parser.findByRole(parsed, 'checkbox');
      expect(checkboxes).toHaveLength(0);
    });
  });

  describe('findByText()', () => {
    let parsed: ParsedSnapshot;

    beforeEach(() => {
      const snapshot = new SnapshotBuilder()
        .addButton('Submit Form')
        .addButton('Cancel')
        .addLink('Go to Home', '/home')
        .build();
      parsed = parser.parse(snapshot);
    });

    test('finds element by exact text (case insensitive by default)', () => {
      const elements = parser.findByText(parsed, 'submit form');
      expect(elements).toHaveLength(1);
      expect(elements[0].name).toBe('Submit Form');
    });

    test('finds element by partial text', () => {
      const elements = parser.findByText(parsed, 'Submit');
      expect(elements).toHaveLength(1);
    });

    test('finds element with case sensitivity', () => {
      const elements = parser.findByText(parsed, 'submit form', { caseInsensitive: false });
      expect(elements).toHaveLength(0);
    });

    test('finds element with exact match', () => {
      const elements = parser.findByText(parsed, 'Submit', { partial: false });
      expect(elements).toHaveLength(0); // "Submit Form" != "Submit"
    });

    test('returns empty array for no matches', () => {
      const elements = parser.findByText(parsed, 'NonExistent');
      expect(elements).toHaveLength(0);
    });
  });

  describe('findByHref()', () => {
    let parsed: ParsedSnapshot;

    beforeEach(() => {
      const snapshot = new SnapshotBuilder()
        .addLink('Home', '/home')
        .addLink('Settings', '/settings/profile')
        .addLink('External', 'https://example.com')
        .build();
      parsed = parser.parse(snapshot);
    });

    test('finds link by partial href', () => {
      const elements = parser.findByHref(parsed, '/home');
      expect(elements).toHaveLength(1);
      expect(elements[0].name).toBe('Home');
    });

    test('finds link by partial href match', () => {
      const elements = parser.findByHref(parsed, 'settings');
      expect(elements).toHaveLength(1);
    });

    test('finds link by exact href', () => {
      const elements = parser.findByHref(parsed, '/settings/profile', { partial: false });
      expect(elements).toHaveLength(1);
    });

    test('returns empty array for no matches', () => {
      const elements = parser.findByHref(parsed, '/nonexistent');
      expect(elements).toHaveLength(0);
    });
  });

  describe('findByPlaceholder()', () => {
    let parsed: ParsedSnapshot;

    beforeEach(() => {
      const snapshot = '[1] textbox "Email" placeholder="Enter your email"\n[2] textbox "Name" placeholder="Your name"';
      parsed = parser.parse(snapshot);
    });

    test('finds element by placeholder (case insensitive)', () => {
      const elements = parser.findByPlaceholder(parsed, 'enter your email');
      expect(elements).toHaveLength(1);
    });

    test('finds element by partial placeholder', () => {
      const elements = parser.findByPlaceholder(parsed, 'email');
      expect(elements).toHaveLength(1);
    });

    test('finds element with case sensitivity', () => {
      const elements = parser.findByPlaceholder(parsed, 'enter your email', { caseInsensitive: false });
      expect(elements).toHaveLength(0);
    });

    test('returns empty array for no matches', () => {
      const elements = parser.findByPlaceholder(parsed, 'nonexistent');
      expect(elements).toHaveLength(0);
    });
  });

  describe('findElement()', () => {
    let parsed: ParsedSnapshot;

    beforeEach(() => {
      const snapshot = new SnapshotBuilder()
        .addButton('Submit')
        .addButton('Cancel')
        .addTextbox('Username')
        .addLink('Home', '/home')
        .build();
      parsed = parser.parse(snapshot);
    });

    test('finds single element by role', () => {
      const element = parser.findElement(parsed, { role: 'textbox' });
      expect(element?.name).toBe('Username');
    });

    test('finds element by role and name', () => {
      const element = parser.findElement(parsed, { role: 'button', name: 'Submit' });
      expect(element?.name).toBe('Submit');
    });

    test('returns first matching element', () => {
      const element = parser.findElement(parsed, { role: 'button' });
      expect(element?.name).toBe('Submit');
    });

    test('returns undefined for no matches', () => {
      const element = parser.findElement(parsed, { role: 'checkbox' });
      expect(element).toBeUndefined();
    });
  });

  describe('findElements()', () => {
    let parsed: ParsedSnapshot;

    beforeEach(() => {
      const snapshot = new SnapshotBuilder()
        .addButton('Submit Form')
        .addButton('Cancel Form')
        .addTextbox('Username')
        .addLink('Home', '/home')
        .build();
      parsed = parser.parse(snapshot);
    });

    test('finds all elements by role', () => {
      const elements = parser.findElements(parsed, { role: 'button' });
      expect(elements).toHaveLength(2);
    });

    test('finds elements by partial name', () => {
      const elements = parser.findElements(parsed, { name: 'Form', partial: true });
      expect(elements).toHaveLength(2);
    });

    test('finds elements by text (alias for name)', () => {
      const elements = parser.findElements(parsed, { text: 'Form', partial: true });
      expect(elements).toHaveLength(2);
    });

    test('finds elements by href', () => {
      const elements = parser.findElements(parsed, { href: '/home' });
      expect(elements).toHaveLength(1);
    });

    test('combines multiple criteria', () => {
      const elements = parser.findElements(parsed, {
        role: 'button',
        name: 'Submit',
        partial: true,
      });
      expect(elements).toHaveLength(1);
    });

    test('returns empty array for no matches', () => {
      const elements = parser.findElements(parsed, {
        role: 'button',
        name: 'NonExistent',
      });
      expect(elements).toHaveLength(0);
    });
  });

  describe('findBySelector()', () => {
    let parsed: ParsedSnapshot;

    beforeEach(() => {
      const snapshot = '[ref1] button "Submit"\n[ref2] link "Home" href="/home"\n[ref3] textbox "Email" placeholder="Enter email"';
      parsed = parser.parse(snapshot);
    });

    test('finds element by ref selector', () => {
      const element = parser.findBySelector(parsed, { type: 'ref', value: 'ref1', confidence: 1.0 });
      expect(element?.name).toBe('Submit');
    });

    test('finds element by text_match selector', () => {
      const element = parser.findBySelector(parsed, { type: 'text_match', value: 'Submit', confidence: 0.8 });
      expect(element?.name).toBe('Submit');
    });

    test('finds element by aria_label selector', () => {
      const element = parser.findBySelector(parsed, { type: 'aria_label', value: 'Home', confidence: 0.9 });
      expect(element?.name).toBe('Home');
    });

    test('finds element by href_path selector', () => {
      const element = parser.findBySelector(parsed, { type: 'href_path', value: '/home', confidence: 0.85 });
      expect(element?.name).toBe('Home');
    });

    test('finds element by placeholder selector', () => {
      const element = parser.findBySelector(parsed, { type: 'placeholder', value: 'Enter email', confidence: 0.75 });
      expect(element?.name).toBe('Email');
    });

    test('handles css selector with text fallback', () => {
      const element = parser.findBySelector(parsed, { type: 'css', value: 'Submit', confidence: 0.7 });
      expect(element?.name).toBe('Submit');
    });

    test('handles name selector with text fallback', () => {
      const element = parser.findBySelector(parsed, { type: 'name', value: 'Submit', confidence: 1.0 });
      expect(element?.name).toBe('Submit');
    });

    test('returns undefined for non-matching selector', () => {
      const element = parser.findBySelector(parsed, { type: 'ref', value: 'nonexistent', confidence: 1.0 });
      expect(element).toBeUndefined();
    });
  });

  describe('helper methods', () => {
    let parsed: ParsedSnapshot;

    beforeEach(() => {
      const snapshot = new SnapshotBuilder()
        .addButton('Submit')
        .addButton('Cancel')
        .addLink('Home', '/home')
        .addLink('Settings', '/settings')
        .addTextbox('Username')
        .addTextbox('Password')
        .addCheckbox('Remember Me')
        .addCombobox('Country')
        .build();
      parsed = parser.parse(snapshot);
    });

    test('getButtons returns all buttons', () => {
      const buttons = parser.getButtons(parsed);
      expect(buttons).toHaveLength(2);
      expect(buttons.every(b => b.role === 'button')).toBe(true);
    });

    test('getLinks returns all links', () => {
      const links = parser.getLinks(parsed);
      expect(links).toHaveLength(2);
      expect(links.every(l => l.role === 'link')).toBe(true);
    });

    test('getTextboxes returns all textboxes', () => {
      const textboxes = parser.getTextboxes(parsed);
      expect(textboxes).toHaveLength(2);
      expect(textboxes.every(t => t.role === 'textbox')).toBe(true);
    });

    test('getCheckboxes returns all checkboxes', () => {
      const checkboxes = parser.getCheckboxes(parsed);
      expect(checkboxes).toHaveLength(1);
    });

    test('getComboboxes returns all comboboxes', () => {
      const comboboxes = parser.getComboboxes(parsed);
      expect(comboboxes).toHaveLength(1);
    });
  });

  describe('getFocusedElement()', () => {
    test('returns focused element by focusedUid', () => {
      const snapshot = '[1] button "Normal"\n[2] textbox "Focused" focused';
      const parsed = parser.parse(snapshot);
      const focused = parser.getFocusedElement(parsed);
      expect(focused?.name).toBe('Focused');
    });

    test('returns focused element from elements array', () => {
      const snapshot = '[1] textbox "Input" focused';
      const parsed = parser.parse(snapshot);
      // Clear focusedUid to test fallback
      parsed.focusedUid = undefined;
      const focused = parser.getFocusedElement(parsed);
      expect(focused?.name).toBe('Input');
    });

    test('returns undefined when no focused element', () => {
      const snapshot = '[1] button "Submit"\n[2] textbox "Input"';
      const parsed = parser.parse(snapshot);
      const focused = parser.getFocusedElement(parsed);
      expect(focused).toBeUndefined();
    });
  });

  describe('hasText()', () => {
    let parsed: ParsedSnapshot;

    beforeEach(() => {
      const snapshot = new SnapshotBuilder()
        .addButton('Submit Form')
        .addLink('Home', '/home')
        .build();
      parsed = parser.parse(snapshot);
    });

    test('returns true when text exists', () => {
      expect(parser.hasText(parsed, 'Submit')).toBe(true);
    });

    test('returns false when text does not exist', () => {
      expect(parser.hasText(parsed, 'NonExistent')).toBe(false);
    });
  });

  describe('hasButton()', () => {
    let parsed: ParsedSnapshot;

    beforeEach(() => {
      const snapshot = new SnapshotBuilder()
        .addButton('Submit Form')
        .addButton('Cancel')
        .build();
      parsed = parser.parse(snapshot);
    });

    test('returns true when button exists (case insensitive)', () => {
      expect(parser.hasButton(parsed, 'submit')).toBe(true);
    });

    test('returns true for partial match', () => {
      expect(parser.hasButton(parsed, 'Form')).toBe(true);
    });

    test('returns false when button does not exist', () => {
      expect(parser.hasButton(parsed, 'NonExistent')).toBe(false);
    });
  });

  describe('hasLink()', () => {
    let parsed: ParsedSnapshot;

    beforeEach(() => {
      const snapshot = new SnapshotBuilder()
        .addLink('Home', '/home')
        .addLink('Settings', '/settings')
        .build();
      parsed = parser.parse(snapshot);
    });

    test('returns true when link exists', () => {
      expect(parser.hasLink(parsed, '/home')).toBe(true);
    });

    test('returns true for partial href match', () => {
      expect(parser.hasLink(parsed, 'settings')).toBe(true);
    });

    test('returns false when link does not exist', () => {
      expect(parser.hasLink(parsed, '/nonexistent')).toBe(false);
    });
  });

  describe('singleton pattern', () => {
    test('getSnapshotParser returns same instance', () => {
      const parser1 = getSnapshotParser();
      const parser2 = getSnapshotParser();
      expect(parser1).toBe(parser2);
    });

    test('resetSnapshotParser clears singleton', () => {
      const parser1 = getSnapshotParser();
      resetSnapshotParser();
      const parser2 = getSnapshotParser();
      expect(parser1).not.toBe(parser2);
    });
  });

  describe('parseSnapshot() function', () => {
    test('parses snapshot using singleton', () => {
      const snapshot = '[1] button "Submit"';
      const result = parseSnapshot(snapshot);
      expect(result.elements).toHaveLength(1);
      expect(result.elements[0].name).toBe('Submit');
    });

    test('returns same result as parser.parse()', () => {
      const snapshot = new SnapshotBuilder()
        .withUrl('https://example.com')
        .addButton('Submit')
        .build();

      const functionResult = parseSnapshot(snapshot);
      const methodResult = new SnapshotParser().parse(snapshot);

      expect(functionResult.url).toBe(methodResult.url);
      expect(functionResult.elements.length).toBe(methodResult.elements.length);
    });
  });

  describe('determinism verification', () => {
    test('parse returns consistent results for same input', () => {
      const snapshot = snapshotFactory.loginPage();
      const results = Array(10).fill(null).map(() => parser.parse(snapshot));

      const firstResult = results[0];
      results.forEach(result => {
        expect(result.elements.length).toBe(firstResult.elements.length);
        expect(result.url).toBe(firstResult.url);
        expect(result.title).toBe(firstResult.title);
      });
    });

    test('findByText returns consistent results', () => {
      const snapshot = new SnapshotBuilder()
        .addButton('Submit Form')
        .addButton('Cancel')
        .build();
      const parsed = parser.parse(snapshot);

      const results = Array(10).fill(null).map(() => parser.findByText(parsed, 'Submit'));

      results.forEach(result => {
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Submit Form');
      });
    });
  });

  describe('edge cases', () => {
    test('handles element without name', () => {
      const snapshot = '[1] button';
      const result = parser.parse(snapshot);
      expect(result.elements).toHaveLength(1);
      expect(result.elements[0].name).toBeUndefined();
    });

    test('handles malformed lines gracefully', () => {
      const snapshot = 'not a valid element\n[1] button "Valid"';
      const result = parser.parse(snapshot);
      expect(result.elements).toHaveLength(1);
      expect(result.elements[0].name).toBe('Valid');
    });

    test('handles special characters in name', () => {
      const snapshot = '[1] button "Submit & Continue"';
      const result = parser.parse(snapshot);
      expect(result.elements[0].name).toBe('Submit & Continue');
    });

    test('handles unicode in name', () => {
      const snapshot = '[1] button "日本語テスト"';
      const result = parser.parse(snapshot);
      expect(result.elements[0].name).toBe('日本語テスト');
    });

    test('handles very long snapshot', () => {
      const builder = new SnapshotBuilder().withUrl('https://example.com');
      for (let i = 0; i < 100; i++) {
        builder.addButton(`Button ${i}`);
      }
      const snapshot = builder.build();
      const result = parser.parse(snapshot);
      expect(result.elements).toHaveLength(100);
    });

    test('handles deeply nested elements', () => {
      const snapshot = Array(10)
        .fill(null)
        .map((_, i) => ' '.repeat(i * 2) + `[${i}] group "Level ${i}"`)
        .join('\n');
      const result = parser.parse(snapshot);
      expect(result.elements).toHaveLength(10);
      expect(result.elements[9].level).toBe(9);
    });
  });
});
