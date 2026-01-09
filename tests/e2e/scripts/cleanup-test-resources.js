/**
 * E2E Validation Script: Find and Report Orphaned Test Resources
 *
 * Execute via mcp__chrome-devtools__evaluate_script
 * This script finds any test resources that may have been left behind.
 *
 * Test resources are identified by the prefix "test-auto-" in their names.
 *
 * Usage:
 *   mcp__chrome-devtools__evaluate_script({
 *     function: "<this_script_content>"
 *   })
 */

(function cleanupTestResources() {
  const TEST_RESOURCE_PREFIX = 'test-auto-';

  // Find all table rows
  const tableRows = document.querySelectorAll('table tbody tr');
  const listItems = document.querySelectorAll('[data-testid*="row"], [role="row"]');
  const allRows = [...tableRows, ...listItems];

  const orphanedResources = [];

  for (const row of allRows) {
    const rowText = row.textContent || '';

    if (rowText.includes(TEST_RESOURCE_PREFIX)) {
      // Extract resource name
      const nameMatch = rowText.match(/test-auto-[a-z0-9-]+/i);
      const resourceName = nameMatch ? nameMatch[0] : 'unknown';

      // Find action buttons/menu for this row
      const actionMenu = row.querySelector(
        'button[aria-label*="action" i], ' +
        'button[aria-label*="menu" i], ' +
        '[data-testid*="action"], ' +
        'button:has-text("⋮")'
      );

      const deleteButton = row.querySelector(
        'button[aria-label*="delete" i], ' +
        '[data-testid*="delete"], ' +
        'button:has-text("Delete")'
      );

      orphanedResources.push({
        name: resourceName,
        rowText: rowText.trim().substring(0, 100),
        hasActionMenu: !!actionMenu,
        hasDeleteButton: !!deleteButton,
        rowIndex: Array.from(allRows).indexOf(row)
      });
    }
  }

  // Detect resource type from URL
  const url = window.location.href;
  let resourceType = 'unknown';
  if (url.includes('http_loadbalancers')) resourceType = 'http_loadbalancer';
  else if (url.includes('tcp_loadbalancers')) resourceType = 'tcp_loadbalancer';
  else if (url.includes('origin_pools')) resourceType = 'origin_pool';
  else if (url.includes('waf')) resourceType = 'waf_policy';
  else if (url.includes('service_policies')) resourceType = 'service_policy';
  else if (url.includes('dns_zones')) resourceType = 'dns_zone';

  return {
    found: orphanedResources.length > 0,
    count: orphanedResources.length,
    resourceType: resourceType,
    resources: orphanedResources,
    currentUrl: url,
    message: orphanedResources.length > 0
      ? `Found ${orphanedResources.length} orphaned test resource(s) to clean up`
      : 'No orphaned test resources found',
    cleanupRequired: orphanedResources.length > 0,
    timestamp: new Date().toISOString()
  };
})();
