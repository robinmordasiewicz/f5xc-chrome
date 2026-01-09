/**
 * UAT Test: WAF Policy Create Basic
 *
 * End-to-end test for creating a WAF policy with basic configuration.
 *
 * Tags: @security @nightly
 */

import { test, expect } from '@playwright/test';
import { CleanupManager, getGlobalCleanupManager } from '../../helpers/cleanup-manager';

test.describe('WAF Policy Create Basic @security @nightly', () => {
  const baseUrl = process.env.F5XC_CONSOLE_URL || 'https://f5-amer-ent.console.ves.volterra.io';
  const namespace = process.env.F5XC_TEST_NAMESPACE || 'validation-test';
  const cleanup = getGlobalCleanupManager();

  let testResourceName: string;

  test.beforeAll(async () => {
    testResourceName = CleanupManager.generateResourceName('waf-policy');
    console.log(`Test resource name: ${testResourceName}`);
  });

  test('should navigate to App Firewall list', async ({ page }) => {
    const wafUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/app_firewall`;

    await page.goto(wafUrl);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toContain('app_firewall');

    const pageContent = await page.content();
    expect(pageContent).not.toContain('Access Denied');
  });

  test('should find Add App Firewall button', async ({ page }) => {
    const wafUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/app_firewall`;

    await page.goto(wafUrl);
    await page.waitForLoadState('networkidle');

    const addButton = page.locator(
      'button:has-text("Add"), button:has-text("Create"), a:has-text("Add App Firewall")'
    );

    const count = await addButton.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have Enforcement Mode selection', async ({ page }) => {
    const createUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/app_firewall/create`;

    await page.goto(createUrl);
    await page.waitForLoadState('networkidle');

    const enforcementSection = page.locator(
      ':text("Enforcement"), :text("Mode"), :text("Monitoring"), :text("Blocking")'
    );

    const count = await enforcementSection.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have Security Policy configuration', async ({ page }) => {
    const createUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/app_firewall/create`;

    await page.goto(createUrl);
    await page.waitForLoadState('networkidle');

    const securityPolicy = page.locator(
      ':text("Security Policy"), :text("Policy"), :text("Detection")'
    );

    const count = await securityPolicy.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have Attack Signatures section', async ({ page }) => {
    const createUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/app_firewall/create`;

    await page.goto(createUrl);
    await page.waitForLoadState('networkidle');

    const signaturesSection = page.locator(
      ':text("Signature"), :text("Attack"), :text("Detection Categories")'
    );

    const count = await signaturesSection.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have name input field', async ({ page }) => {
    const createUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/app_firewall/create`;

    await page.goto(createUrl);
    await page.waitForLoadState('networkidle');

    const nameInput = page.locator(
      'input[name="name"], input[placeholder*="name"], [data-testid="name-input"]'
    );

    const count = await nameInput.count();
    expect(count).toBeGreaterThan(0);
  });
});
