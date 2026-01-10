// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * E2E Validation Script: Verify Resource Created
 *
 * Execute via mcp__chrome-devtools__evaluate_script
 * This script verifies that a resource with the given name exists in the current list view.
 *
 * Usage:
 *   mcp__chrome-devtools__evaluate_script({
 *     function: "<this_script_content>",
 *     args: [{ resourceName: "test-auto-http-lb-123456" }]
 *   })
 */

(function validateResourceCreated(args) {
  const resourceName = args?.resourceName || window.__testResourceName;

  if (!resourceName) {
    return {
      success: false,
      error: 'No resource name provided',
      timestamp: new Date().toISOString()
    };
  }

  // Find resource in table rows
  const tableRows = document.querySelectorAll('table tbody tr');
  const listItems = document.querySelectorAll('[data-testid*="row"], [role="row"]');
  const allRows = [...tableRows, ...listItems];

  let foundRow = null;
  let foundText = '';

  for (const row of allRows) {
    const rowText = row.textContent || '';
    if (rowText.includes(resourceName)) {
      foundRow = row;
      foundText = rowText.trim().substring(0, 100);
      break;
    }
  }

  // Extract resource details if found
  if (foundRow) {
    const cells = foundRow.querySelectorAll('td, [role="cell"]');
    const columns = Array.from(cells).map(cell => cell.textContent?.trim().substring(0, 50));

    return {
      success: true,
      found: true,
      resourceName: resourceName,
      resourceType: detectResourceType(),
      rowText: foundText,
      columns: columns,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
  }

  return {
    success: true,
    found: false,
    resourceName: resourceName,
    rowCount: allRows.length,
    url: window.location.href,
    message: 'Resource not found in list',
    timestamp: new Date().toISOString()
  };

  function detectResourceType() {
    const url = window.location.href;
    if (url.includes('http_loadbalancers')) return 'http_loadbalancer';
    if (url.includes('tcp_loadbalancers')) return 'tcp_loadbalancer';
    if (url.includes('origin_pools')) return 'origin_pool';
    if (url.includes('waf')) return 'waf_policy';
    if (url.includes('service_policies')) return 'service_policy';
    if (url.includes('dns_zones')) return 'dns_zone';
    return 'unknown';
  }
})();
