// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Click the action menu (⋮) button for a specific resource row
 *
 * Usage with mcp__chrome-devtools__evaluate_script:
 *   function: "<this script content>"
 *
 * This opens the dropdown menu. After calling this, use click-overlay-menu-item.js
 * to select an option from the opened menu.
 *
 * @param {string} resourceName - The name of the resource to act on
 * @returns {Object} Result object with success status
 */
(function clickRowActionMenu(resourceName) {
  // Find all table rows
  const tableRows = document.querySelectorAll('table tbody tr');
  const ariaRows = document.querySelectorAll('[role="row"]');
  const allRows = [...new Set([...tableRows, ...ariaRows])];

  for (const row of allRows) {
    const rowText = row.textContent || '';

    if (rowText.includes(resourceName)) {
      // Find the action menu button in this row
      // F5 XC uses various patterns for action buttons
      const actionBtnSelectors = [
        'button[aria-haspopup="menu"]',
        'button[aria-haspopup="true"]',
        'button[aria-label*="action" i]',
        'button[aria-label*="menu" i]',
        '[data-testid*="action"]',
        '.action-menu-trigger',
        'button:last-child' // Often the last button in a row
      ];

      let actionBtn = null;
      for (const selector of actionBtnSelectors) {
        actionBtn = row.querySelector(selector);
        if (actionBtn) break;
      }

      if (actionBtn) {
        // Click to open the dropdown
        actionBtn.click();

        return {
          success: true,
          resourceName: resourceName,
          actionButton: actionBtn.outerHTML.substring(0, 100),
          hint: 'Menu should now be open - use click-overlay-menu-item.js next'
        };
      }

      return {
        success: false,
        error: 'Row found but no action button detected',
        resourceName: resourceName,
        hint: 'The row may not have an action menu'
      };
    }
  }

  return {
    success: false,
    error: 'Resource not found in list: ' + resourceName,
    totalRows: allRows.length,
    hint: 'Check if the resource name is correct'
  };
})('${RESOURCE_NAME}');
