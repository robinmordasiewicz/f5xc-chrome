/**
 * F5 XC Console - RBAC Permission Detection Script
 *
 * Execute via mcp__claude-in-chrome__javascript_tool
 * Detects read-only vs editable permissions based on DOM patterns
 *
 * Returns: { canEdit, canDelete, canCreate, canClone, viewOnly, indicators }
 */

(function detectPermissions() {
  const results = {
    canEdit: true,
    canDelete: true,
    canCreate: true,
    canClone: true,
    viewOnly: false,
    indicators: [],
    lockedActions: [],
    availableActions: []
  };

  // Pattern 1: Check for "View" badge indicating read-only mode
  const viewBadges = document.querySelectorAll('[class*="badge"], [class*="chip"], [class*="tag"]');
  viewBadges.forEach(badge => {
    if (badge.textContent.trim() === 'View') {
      results.viewOnly = true;
      results.canEdit = false;
      results.indicators.push({
        type: 'view_badge',
        element: badge.tagName,
        location: badge.closest('[role="dialog"]') ? 'dialog' : 'page'
      });
    }
  });

  // Pattern 2: Check for "Locked" indicators in buttons/tabs
  const allElements = document.querySelectorAll('button, [role="tab"], [role="option"], [role="menuitem"]');
  allElements.forEach(el => {
    const children = el.children;
    let hasLocked = false;
    let actionName = '';

    for (let i = 0; i < children.length; i++) {
      const text = children[i].textContent.trim();
      if (text === 'Locked') {
        hasLocked = true;
      } else if (text && text !== 'filters active' && !text.includes('icon')) {
        actionName = text;
      }
    }

    if (hasLocked && actionName) {
      results.lockedActions.push(actionName);
      results.indicators.push({
        type: 'locked_button',
        action: actionName,
        element: el.tagName,
        role: el.getAttribute('role')
      });

      // Update specific permissions based on action name
      if (actionName.includes('Edit') || actionName.includes('Configuration')) {
        results.canEdit = false;
      }
      if (actionName.includes('Delete')) {
        results.canDelete = false;
      }
      if (actionName.includes('Add') || actionName.includes('Create')) {
        results.canCreate = false;
      }
      if (actionName.includes('Clone')) {
        results.canClone = false;
      }
    } else if (actionName && !hasLocked) {
      results.availableActions.push(actionName);
    }
  });

  // Pattern 3: Check for permission denial tooltips
  const tooltips = document.querySelectorAll('[role="tooltip"], [class*="tooltip"]');
  tooltips.forEach(tooltip => {
    const text = tooltip.textContent.toLowerCase();
    const denialKeywords = ['permission denied', 'not authorized', 'cannot access', 'contact your administrator', 'current role'];

    if (denialKeywords.some(keyword => text.includes(keyword))) {
      results.indicators.push({
        type: 'permission_tooltip',
        text: tooltip.textContent.substring(0, 100)
      });
    }
  });

  // Pattern 4: Check for disabled attributes
  const disabledElements = document.querySelectorAll('[disabled], [aria-disabled="true"]');
  disabledElements.forEach(el => {
    const text = el.textContent.trim();
    if (text && text.length < 50) {
      results.indicators.push({
        type: 'disabled_element',
        text: text,
        element: el.tagName
      });
    }
  });

  // Pattern 5: Check for locked CSS classes
  const lockedByClass = document.querySelectorAll('.disabled, .locked, .readonly, .ves-disabled');
  lockedByClass.forEach(el => {
    const text = el.textContent.trim();
    if (text && text.length < 50) {
      results.indicators.push({
        type: 'locked_class',
        text: text,
        className: el.className
      });
    }
  });

  // Determine overall view-only status
  if (results.lockedActions.length > 0 &&
      results.lockedActions.some(a => a.includes('Edit') || a.includes('Delete') || a.includes('Add'))) {
    results.viewOnly = true;
  }

  return results;
})();
