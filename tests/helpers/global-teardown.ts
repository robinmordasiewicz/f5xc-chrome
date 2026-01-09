/**
 * Playwright Global Teardown
 *
 * Runs once after all tests to clean up resources
 * and finalize the test environment.
 */

import { FullConfig } from '@playwright/test';
import { getGlobalCleanupManager, resetGlobalCleanupManager } from './cleanup-manager';

async function globalTeardown(config: FullConfig): Promise<void> {
  console.log('[Global Teardown] Starting cleanup...');

  // Run cleanup manager to delete any remaining test resources
  const cleanup = getGlobalCleanupManager();
  const result = await cleanup.cleanup();

  console.log(`[Global Teardown] Cleanup results:`);
  console.log(`  Total: ${result.total}`);
  console.log(`  Successful: ${result.successful}`);
  console.log(`  Failed: ${result.failed}`);
  console.log(`  Skipped: ${result.skipped}`);

  if (result.errors.length > 0) {
    console.error('[Global Teardown] Cleanup errors:');
    for (const error of result.errors) {
      console.error(`  - ${error.resource.type}/${error.resource.name}: ${error.error}`);
    }
  }

  // Reset the global cleanup manager
  resetGlobalCleanupManager();

  console.log('[Global Teardown] Teardown complete');
}

export default globalTeardown;
