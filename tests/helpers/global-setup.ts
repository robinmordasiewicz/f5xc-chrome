// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Playwright Global Setup
 *
 * Runs once before all tests to set up authentication state
 * and prepare the test environment.
 */

import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig): Promise<void> {
  console.log('[Global Setup] Starting test environment setup...');

  // Verify environment variables
  const requiredEnvVars = [
    'F5XC_CONSOLE_URL',
  ];

  const optionalEnvVars = [
    'F5XC_TEST_NAMESPACE',
    'F5XC_AUTH_METHOD', // 'sso' | 'credentials'
  ];

  // Check required environment variables
  const missing = requiredEnvVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.warn(`[Global Setup] Warning: Missing optional env vars: ${missing.join(', ')}`);
    console.log('[Global Setup] Using default console URL');
  }

  // Set defaults
  if (!process.env.F5XC_CONSOLE_URL) {
    process.env.F5XC_CONSOLE_URL = 'https://f5-amer-ent.console.ves.volterra.io';
  }

  if (!process.env.F5XC_TEST_NAMESPACE) {
    process.env.F5XC_TEST_NAMESPACE = 'validation-test';
  }

  console.log(`[Global Setup] Console URL: ${process.env.F5XC_CONSOLE_URL}`);
  console.log(`[Global Setup] Test Namespace: ${process.env.F5XC_TEST_NAMESPACE}`);

  // Note: Authentication is handled by existing browser session
  // since we use Chrome DevTools MCP for automation
  console.log('[Global Setup] Authentication: Using existing browser session');

  console.log('[Global Setup] Setup complete');
}

export default globalSetup;
