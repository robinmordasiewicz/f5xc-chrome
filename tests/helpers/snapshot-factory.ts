/**
 * Snapshot Factory
 *
 * Generates test snapshots for unit testing.
 * Provides builders for creating realistic accessibility tree snapshots.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Element builder for creating snapshot elements
 */
export interface ElementBuilder {
  uid: string;
  role: string;
  name?: string;
  value?: string;
  href?: string;
  focused?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  selected?: boolean;
  placeholder?: string;
  description?: string;
  level: number;
}

/**
 * Snapshot builder for creating complete snapshots
 */
export class SnapshotBuilder {
  private url?: string;
  private title?: string;
  private elements: ElementBuilder[] = [];
  private uidCounter = 1;

  /**
   * Set the page URL
   */
  withUrl(url: string): this {
    this.url = url;
    return this;
  }

  /**
   * Set the page title
   */
  withTitle(title: string): this {
    this.title = title;
    return this;
  }

  /**
   * Add an element to the snapshot
   */
  addElement(element: Omit<ElementBuilder, 'uid'> & { uid?: string }): this {
    const uid = element.uid ?? String(this.uidCounter++);
    this.elements.push({ ...element, uid } as ElementBuilder);
    return this;
  }

  /**
   * Add a button element
   */
  addButton(name: string, options: Partial<ElementBuilder> = {}): this {
    return this.addElement({
      role: 'button',
      name,
      level: options.level ?? 1,
      ...options,
    });
  }

  /**
   * Add a textbox element
   */
  addTextbox(name: string, options: Partial<ElementBuilder> = {}): this {
    return this.addElement({
      role: 'textbox',
      name,
      level: options.level ?? 1,
      ...options,
    });
  }

  /**
   * Add a link element
   */
  addLink(name: string, href: string, options: Partial<ElementBuilder> = {}): this {
    return this.addElement({
      role: 'link',
      name,
      href,
      level: options.level ?? 1,
      ...options,
    });
  }

  /**
   * Add a heading element
   */
  addHeading(name: string, options: Partial<ElementBuilder> = {}): this {
    return this.addElement({
      role: 'heading',
      name,
      level: options.level ?? 1,
      ...options,
    });
  }

  /**
   * Add a combobox element
   */
  addCombobox(name: string, options: Partial<ElementBuilder> = {}): this {
    return this.addElement({
      role: 'combobox',
      name,
      level: options.level ?? 1,
      ...options,
    });
  }

  /**
   * Add a checkbox element
   */
  addCheckbox(name: string, options: Partial<ElementBuilder> = {}): this {
    return this.addElement({
      role: 'checkbox',
      name,
      level: options.level ?? 1,
      ...options,
    });
  }

  /**
   * Add a radio element
   */
  addRadio(name: string, options: Partial<ElementBuilder> = {}): this {
    return this.addElement({
      role: 'radio',
      name,
      level: options.level ?? 1,
      ...options,
    });
  }

  /**
   * Add an alert element
   */
  addAlert(name: string, options: Partial<ElementBuilder> = {}): this {
    return this.addElement({
      role: 'alert',
      name,
      level: options.level ?? 1,
      ...options,
    });
  }

  /**
   * Add a tab element
   */
  addTab(name: string, options: Partial<ElementBuilder> = {}): this {
    return this.addElement({
      role: 'tab',
      name,
      level: options.level ?? 1,
      ...options,
    });
  }

  /**
   * Add an option element
   */
  addOption(name: string, options: Partial<ElementBuilder> = {}): this {
    return this.addElement({
      role: 'option',
      name,
      level: options.level ?? 2,
      ...options,
    });
  }

  /**
   * Build the snapshot as a string
   */
  build(): string {
    const lines: string[] = [];

    if (this.url) {
      lines.push(`- URL: ${this.url}`);
    }

    if (this.title) {
      lines.push(`- Title: ${this.title}`);
    }

    if (lines.length > 0) {
      lines.push('');
    }

    for (const element of this.elements) {
      const indent = '  '.repeat(element.level);
      let line = `${indent}[${element.uid}] ${element.role}`;

      if (element.name) {
        line += ` "${element.name}"`;
      }

      // Add properties
      const props: string[] = [];
      if (element.focused) props.push('focused');
      if (element.disabled) props.push('disabled');
      if (element.expanded !== undefined) props.push(`expanded="${element.expanded}"`);
      if (element.selected) props.push('selected');
      if (element.href) props.push(`href="${element.href}"`);
      if (element.value) props.push(`value="${element.value}"`);
      if (element.placeholder) props.push(`placeholder="${element.placeholder}"`);
      if (element.description) props.push(`description="${element.description}"`);

      if (props.length > 0) {
        line += ' ' + props.join(' ');
      }

      lines.push(line);
    }

    return lines.join('\n');
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.url = undefined;
    this.title = undefined;
    this.elements = [];
    this.uidCounter = 1;
    return this;
  }
}

/**
 * Load a fixture snapshot file
 */
export function loadSnapshotFixture(filename: string): string {
  const fixturePath = path.join(__dirname, '..', 'fixtures', 'snapshots', filename);
  return fs.readFileSync(fixturePath, 'utf-8');
}

/**
 * Create a minimal empty snapshot
 */
export function createEmptySnapshot(): string {
  return '';
}

/**
 * Create a login page snapshot
 */
export function createLoginPageSnapshot(): string {
  return loadSnapshotFixture('login-page.snapshot.txt');
}

/**
 * Create an authenticated home page snapshot
 */
export function createAuthenticatedHomeSnapshot(): string {
  return loadSnapshotFixture('authenticated-home.snapshot.txt');
}

/**
 * Create an HTTP LB list page snapshot
 */
export function createHttpLbListSnapshot(): string {
  return loadSnapshotFixture('http-lb-list.snapshot.txt');
}

/**
 * Create an HTTP LB form page snapshot
 */
export function createHttpLbFormSnapshot(): string {
  return loadSnapshotFixture('http-lb-form.snapshot.txt');
}

/**
 * Create a permission denied page snapshot
 */
export function createPermissionDeniedSnapshot(): string {
  return loadSnapshotFixture('permission-denied.snapshot.txt');
}

/**
 * Create a loading state snapshot
 */
export function createLoadingStateSnapshot(): string {
  return loadSnapshotFixture('loading-state.snapshot.txt');
}

/**
 * Create a simple snapshot with specific elements for testing
 */
export function createTestSnapshot(elements: Partial<ElementBuilder>[]): string {
  const builder = new SnapshotBuilder()
    .withUrl('https://test.console.ves.volterra.io/test')
    .withTitle('Test Page');

  for (const element of elements) {
    builder.addElement({
      role: element.role ?? 'generic',
      level: element.level ?? 0,
      ...element,
    });
  }

  return builder.build();
}

/**
 * Snapshot factory singleton
 */
export const snapshotFactory = {
  builder: () => new SnapshotBuilder(),
  empty: createEmptySnapshot,
  loginPage: createLoginPageSnapshot,
  authenticatedHome: createAuthenticatedHomeSnapshot,
  httpLbList: createHttpLbListSnapshot,
  httpLbForm: createHttpLbFormSnapshot,
  permissionDenied: createPermissionDeniedSnapshot,
  loadingState: createLoadingStateSnapshot,
  custom: createTestSnapshot,
};
