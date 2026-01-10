// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Verify a resource exists in the current list view
 *
 * Usage with mcp__chrome-devtools__evaluate_script:
 *   function: "<this script content>"
 *
 * @param {string} resourceName - The name of the resource to find
 * @returns {Object} Result object with found status and details
 */
(function verifyResourceExists(resourceName) {
  // Find all table rows (works with F5 XC console tables)
  const tableRows = document.querySelectorAll('table tbody tr');
  const ariaRows = document.querySelectorAll('[role="row"]');
  const allRows = [...new Set([...tableRows, ...ariaRows])];

  for (const row of allRows) {
    const rowText = row.textContent || '';

    if (rowText.includes(resourceName)) {
      // Extract additional info from the row
      const cells = row.querySelectorAll('td, [role="gridcell"], [role="cell"]');
      const cellData = Array.from(cells).map(cell => cell.textContent.trim());

      return {
        found: true,
        name: resourceName,
        rowData: cellData.slice(0, 5), // First 5 columns
        rowIndex: Array.from(allRows).indexOf(row)
      };
    }
  }

  // Get total item count from page
  const countMatch = document.body.textContent.match(/(\d+)\s*items?/i);
  const itemCount = countMatch ? parseInt(countMatch[1]) : allRows.length;

  return {
    found: false,
    name: resourceName,
    totalItemsInList: itemCount,
    hint: 'Resource may not exist or page needs refresh'
  };
})('${RESOURCE_NAME}');
