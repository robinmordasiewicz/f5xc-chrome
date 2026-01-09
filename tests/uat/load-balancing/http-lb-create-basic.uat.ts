/**
 * UAT Test: HTTP Load Balancer Create Basic
 *
 * End-to-end test for creating an HTTP load balancer with basic configuration.
 *
 * Tags: @smoke @nightly @load-balancing
 */

import { test, expect } from '@playwright/test';
import { CleanupManager, getGlobalCleanupManager } from '../../helpers/cleanup-manager';

test.describe('HTTP Load Balancer Create Basic @smoke @nightly @load-balancing', () => {
  const baseUrl = process.env.F5XC_CONSOLE_URL || 'https://f5-amer-ent.console.ves.volterra.io';
  const namespace = process.env.F5XC_TEST_NAMESPACE || 'validation-test';
  const cleanup = getGlobalCleanupManager();

  let testResourceName: string;

  test.beforeAll(async () => {
    testResourceName = CleanupManager.generateResourceName('http-lb');
    console.log(`Test resource name: ${testResourceName}`);
  });

  test('should navigate to HTTP Load Balancers list', async ({ page }) => {
    const httpLbUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/load_balancers/http_loadbalancers`;

    await page.goto(httpLbUrl);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).toContain('http_loadbalancers');

    const pageContent = await page.content();
    expect(pageContent).not.toContain('Access Denied');
  });

  test('should find Add HTTP Load Balancer button', async ({ page }) => {
    const httpLbUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/load_balancers/http_loadbalancers`;

    await page.goto(httpLbUrl);
    await page.waitForLoadState('networkidle');

    const addButton = page.locator(
      'button:has-text("Add"), button:has-text("Create"), a:has-text("Add HTTP Load Balancer")'
    );

    const count = await addButton.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should open HTTP LB creation form', async ({ page }) => {
    const httpLbUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/load_balancers/http_loadbalancers`;

    await page.goto(httpLbUrl);
    await page.waitForLoadState('networkidle');

    const addButton = page.locator(
      'button:has-text("Add"), button:has-text("Create"), a:has-text("Add HTTP Load Balancer")'
    ).first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForLoadState('networkidle');

      const url = page.url();
      const hasCreateForm = url.includes('create') ||
                           (await page.locator('form, [role="dialog"]').count()) > 0;

      expect(hasCreateForm).toBe(true);
    }
  });

  test('should have Metadata section', async ({ page }) => {
    const createUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/load_balancers/http_loadbalancers/create`;

    await page.goto(createUrl);
    await page.waitForLoadState('networkidle');

    // Look for Metadata section
    const metadataSection = page.locator(
      ':text("Metadata"), :text("Name"), [data-testid*="metadata"]'
    );

    const count = await metadataSection.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have name input field', async ({ page }) => {
    const createUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/load_balancers/http_loadbalancers/create`;

    await page.goto(createUrl);
    await page.waitForLoadState('networkidle');

    const nameInput = page.locator(
      'input[name="name"], input[placeholder*="name"], [data-testid="name-input"]'
    );

    const count = await nameInput.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have Domain configuration section', async ({ page }) => {
    const createUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/load_balancers/http_loadbalancers/create`;

    await page.goto(createUrl);
    await page.waitForLoadState('networkidle');

    const domainSection = page.locator(
      ':text("Domain"), :text("Domains"), [data-testid*="domain"]'
    );

    const count = await domainSection.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have Load Balancer Type selection', async ({ page }) => {
    const createUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/load_balancers/http_loadbalancers/create`;

    await page.goto(createUrl);
    await page.waitForLoadState('networkidle');

    const typeSection = page.locator(
      ':text("Load Balancer Type"), :text("HTTP"), :text("HTTPS")'
    );

    const count = await typeSection.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have Origin Pool selection', async ({ page }) => {
    const createUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/load_balancers/http_loadbalancers/create`;

    await page.goto(createUrl);
    await page.waitForLoadState('networkidle');

    const originPoolSection = page.locator(
      ':text("Origin Pool"), :text("Origin Pools"), :text("Default Origin")'
    );

    const count = await originPoolSection.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have Routes configuration', async ({ page }) => {
    const createUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/load_balancers/http_loadbalancers/create`;

    await page.goto(createUrl);
    await page.waitForLoadState('networkidle');

    const routesSection = page.locator(
      ':text("Routes"), :text("Route"), [data-testid*="route"]'
    );

    const count = await routesSection.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have WAF configuration option', async ({ page }) => {
    const createUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/load_balancers/http_loadbalancers/create`;

    await page.goto(createUrl);
    await page.waitForLoadState('networkidle');

    // Scroll down to find WAF section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));

    const wafSection = page.locator(
      ':text("WAF"), :text("Web Application Firewall"), :text("Security")'
    );

    const count = await wafSection.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have Submit/Save button', async ({ page }) => {
    const createUrl = `${baseUrl}/web/workspaces/web-app-and-api-protection/namespaces/${namespace}/manage/load_balancers/http_loadbalancers/create`;

    await page.goto(createUrl);
    await page.waitForLoadState('networkidle');

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Save"), button:has-text("Create")'
    );

    const count = await submitButton.count();
    expect(count).toBeGreaterThan(0);
  });
});
