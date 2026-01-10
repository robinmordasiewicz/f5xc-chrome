// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for F5 XC Console Automation Tests
 *
 * Projects:
 * - integration: Read-only navigation tests (no resource creation)
 * - uat: Full workflow tests with resource creation and cleanup
 */
export default defineConfig({
  testDir: '..',
  fullyParallel: false, // Run tests sequentially for console automation
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for browser automation
  reporter: [
    ['html', { outputFolder: '../reports/playwright' }],
    ['list']
  ],

  use: {
    baseURL: process.env.F5XC_CONSOLE_URL || 'https://f5-amer-ent.console.ves.volterra.io',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },

  projects: [
    {
      name: 'integration',
      testDir: './integration',
      testMatch: '**/*.test.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'uat',
      testDir: './uat',
      testMatch: '**/*.uat.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
      // UAT tests depend on integration passing
      dependencies: ['integration'],
    },
  ],

  // Global setup/teardown for authentication
  globalSetup: require.resolve('../helpers/global-setup.ts'),
  globalTeardown: require.resolve('../helpers/global-teardown.ts'),

  // Timeout configurations
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 10000,
  },
});
