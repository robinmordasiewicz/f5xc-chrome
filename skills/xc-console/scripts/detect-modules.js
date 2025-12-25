/**
 * F5 XC Console - Module Initialization Detection Script
 *
 * Execute via mcp__claude-in-chrome__javascript_tool
 * Detects module/workspace initialization states
 *
 * Returns: { modules: { [name]: { initialized, needsInit, status, indicators } } }
 */

(function detectModules() {
  const results = {
    currentWorkspace: '',
    isAboutPage: false,
    serviceStatus: 'unknown',
    modules: {},
    indicators: []
  };

  // Detect current workspace from URL or header
  const url = window.location.href;
  const workspaceMatch = url.match(/\/workspaces\/([^\/]+)/);
  if (workspaceMatch) {
    results.currentWorkspace = workspaceMatch[1];
  }

  // Check if on About page
  results.isAboutPage = url.includes('/workspace-info/about');

  // Pattern 1: Detect service status text
  const statusPatterns = {
    enabled: ['This service is enabled', 'Service is active', 'Enabled'],
    disabled: ['This service is not enabled', 'Service is disabled', 'Not enabled', 'Enable Service']
  };

  const pageText = document.body.innerText;

  // Check for enabled status
  statusPatterns.enabled.forEach(pattern => {
    if (pageText.includes(pattern)) {
      results.serviceStatus = 'enabled';
      results.indicators.push({
        type: 'status_text',
        text: pattern,
        status: 'enabled'
      });
    }
  });

  // Check for disabled status (takes precedence if found)
  statusPatterns.disabled.forEach(pattern => {
    if (pageText.includes(pattern)) {
      results.serviceStatus = 'disabled';
      results.indicators.push({
        type: 'status_text',
        text: pattern,
        status: 'disabled'
      });
    }
  });

  // Pattern 2: Detect Visit Service vs Enable Service buttons
  const buttons = document.querySelectorAll('button, a[role="button"]');
  buttons.forEach(btn => {
    const text = btn.textContent.trim();

    if (text === 'Visit Service' || text === 'Explore') {
      results.serviceStatus = 'enabled';
      results.indicators.push({
        type: 'action_button',
        text: text,
        status: 'enabled'
      });
    }

    if (text === 'Enable Service' || text === 'Enable' || text === 'Initialize' || text === 'Get Started') {
      results.serviceStatus = 'disabled';
      results.indicators.push({
        type: 'action_button',
        text: text,
        status: 'disabled'
      });
    }
  });

  // Pattern 3: Detect Workspace Services table status
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    const rows = table.querySelectorAll('tbody tr, tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      let moduleName = '';
      let moduleStatus = '';
      let moduleAction = '';

      cells.forEach((cell, index) => {
        const text = cell.textContent.trim();

        // First cell often contains name
        if (index === 0 || cell.querySelector('a, [class*="link"]')) {
          const linkText = cell.querySelector('a, [class*="link"]')?.textContent.trim();
          if (linkText) moduleName = linkText;
        }

        // Check for status indicators
        if (text === 'Enabled' || text.includes('●') && text.includes('Enabled')) {
          moduleStatus = 'enabled';
        }
        if (text === 'Disabled' || text === 'Not Enabled') {
          moduleStatus = 'disabled';
        }

        // Check for action buttons in cell
        const actionBtn = cell.querySelector('button');
        if (actionBtn) {
          moduleAction = actionBtn.textContent.trim();
        }
      });

      if (moduleName && moduleStatus) {
        results.modules[moduleName] = {
          initialized: moduleStatus === 'enabled',
          needsInit: moduleStatus === 'disabled',
          status: moduleStatus,
          action: moduleAction
        };
      }
    });
  });

  // Pattern 4: Detect empty states indicating uninitialized module
  const emptyStatePatterns = [
    'No data available',
    'Get started by',
    'Enable this service to',
    'No items found',
    'Create your first'
  ];

  emptyStatePatterns.forEach(pattern => {
    if (pageText.includes(pattern)) {
      results.indicators.push({
        type: 'empty_state',
        text: pattern,
        status: 'possibly_uninitialized'
      });
    }
  });

  // Pattern 5: Check workspace cards for initialization indicators (home page)
  const workspaceCards = document.querySelectorAll('[class*="workspace-card"], [class*="service-card"]');
  workspaceCards.forEach(card => {
    const name = card.querySelector('h2, h3, h4, [class*="title"]')?.textContent.trim();
    const hasSetupBtn = card.querySelector('button')?.textContent.includes('Set Up');
    const isGrayed = card.classList.contains('disabled') ||
                     card.classList.contains('inactive') ||
                     card.style.opacity < 1;

    if (name) {
      results.modules[name] = results.modules[name] || {};
      results.modules[name].hasSetupButton = hasSetupBtn;
      results.modules[name].isGrayed = isGrayed;
      results.modules[name].needsInit = hasSetupBtn || isGrayed;
    }
  });

  // Pattern 6: Detect initialization required from Terms acceptance
  if (pageText.includes('Terms and Conditions') && pageText.includes('enabling this service')) {
    results.indicators.push({
      type: 'terms_required',
      status: 'init_pending'
    });
  }

  return results;
})();
