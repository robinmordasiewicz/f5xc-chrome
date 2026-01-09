/**
 * E2E Validation Script: Verify Resource Deleted
 *
 * Execute via mcp__chrome-devtools__evaluate_script
 * This script verifies that a resource with the given name no longer exists in the list view.
 *
 * Usage:
 *   mcp__chrome-devtools__evaluate_script({
 *     function: "<this_script_content>",
 *     args: [{ resourceName: "test-auto-http-lb-123456" }]
 *   })
 */

(function validateResourceDeleted(args) {
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

  for (const row of allRows) {
    const rowText = row.textContent || '';
    if (rowText.includes(resourceName)) {
      foundRow = row;
      break;
    }
  }

  if (foundRow) {
    return {
      success: true,
      deleted: false,
      resourceName: resourceName,
      message: 'Resource still exists in list',
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
  }

  return {
    success: true,
    deleted: true,
    resourceName: resourceName,
    message: 'Resource successfully deleted',
    rowCount: allRows.length,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
})();
