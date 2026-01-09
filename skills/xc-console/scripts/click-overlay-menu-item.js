/**
 * Click an item in an Angular CDK overlay menu
 *
 * Usage with mcp__chrome-devtools__evaluate_script:
 *   function: "<this script content>"
 *
 * This script handles the Angular CDK overlay pattern where menu items
 * are NOT visible in accessibility tree snapshots.
 *
 * @param {string} menuItemText - The text of the menu item to click
 * @returns {Object} Result object with success status
 */
(function clickOverlayMenuItem(menuItemText) {
  // Angular CDK renders overlays in a separate container
  const overlayContainer = document.querySelector('.cdk-overlay-container');

  if (!overlayContainer) {
    return {
      success: false,
      error: 'No overlay container found - menu may not be open',
      hint: 'Click the action menu button first'
    };
  }

  // Find all potential menu items in the overlay
  const selectors = [
    '[role="menuitem"]',
    '.mat-menu-item',
    '.cdk-menu-item',
    'button',
    '[role="option"]'
  ];

  const allItems = overlayContainer.querySelectorAll(selectors.join(', '));

  for (const item of allItems) {
    const itemText = item.textContent.trim();

    // Check if this item matches (case-insensitive partial match)
    if (itemText.toLowerCase().includes(menuItemText.toLowerCase())) {
      // Check if element is visible
      if (item.offsetParent === null && getComputedStyle(item).display === 'none') {
        continue; // Skip hidden elements
      }

      // Angular Material requires full mouse event sequence
      // Simple click() often doesn't trigger change detection
      const eventConfig = {
        bubbles: true,
        cancelable: true,
        view: window
      };

      const mousedown = new MouseEvent('mousedown', eventConfig);
      const mouseup = new MouseEvent('mouseup', eventConfig);
      const click = new MouseEvent('click', eventConfig);

      item.dispatchEvent(mousedown);
      item.dispatchEvent(mouseup);
      item.dispatchEvent(click);

      return {
        success: true,
        clicked: itemText,
        searchedFor: menuItemText,
        timestamp: new Date().toISOString()
      };
    }
  }

  // If not found, return helpful debug info
  const availableItems = Array.from(allItems)
    .map(item => item.textContent.trim())
    .filter(text => text.length > 0 && text.length < 50);

  return {
    success: false,
    error: 'Menu item not found: ' + menuItemText,
    availableItems: availableItems.slice(0, 10),
    hint: 'Check if the menu text matches exactly'
  };
})('${MENU_ITEM_TEXT}');
