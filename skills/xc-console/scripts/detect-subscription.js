/**
 * F5 XC Console - Subscription Tier Detection Script
 *
 * Execute via mcp__claude-in-chrome__javascript_tool
 * Detects subscription tier based on feature availability and badges
 *
 * Returns: { tier, badges, gatedFeatures, upgradePrompts }
 */

(function detectSubscription() {
  const results = {
    tier: 'unknown', // 'standard', 'advanced', 'enterprise', 'unknown'
    badges: [],
    gatedFeatures: [],
    upgradePrompts: [],
    availableFeatures: [],
    workspaceCards: []
  };

  const badgeTypes = {
    'Limited Availability': { tier: 'preview', access: 'limited' },
    'New': { tier: 'any', access: 'available' },
    'Early Access': { tier: 'preview', access: 'opt-in' },
    'Upgrade': { tier: 'gated', access: 'requires_upgrade' },
    'Premium': { tier: 'advanced', access: 'requires_upgrade' },
    'EA': { tier: 'early_access', access: 'opt-in' }
  };

  // Pattern 1: Detect workspace card badges on home page
  const workspaceLinks = document.querySelectorAll('a[href*="/web/workspaces/"]');
  workspaceLinks.forEach(link => {
    const cardInfo = {
      name: '',
      badges: [],
      href: link.getAttribute('href')
    };

    // Check children for badges and name
    const children = link.querySelectorAll('*');
    children.forEach(child => {
      const text = child.textContent.trim();

      // Skip icon placeholders
      if (text === 'filters active' || text.includes('icon')) return;

      // Check if it's a known badge
      if (badgeTypes[text]) {
        cardInfo.badges.push({
          text: text,
          ...badgeTypes[text]
        });
        results.badges.push({
          badge: text,
          location: 'workspace_card',
          workspace: cardInfo.name || 'unknown'
        });
      }
    });

    // Extract workspace name (typically in heading or strong element)
    const nameEl = link.querySelector('h2, h3, h4, strong, [class*="title"]');
    if (nameEl) {
      cardInfo.name = nameEl.textContent.trim();
    }

    if (cardInfo.name || cardInfo.badges.length > 0) {
      results.workspaceCards.push(cardInfo);
    }
  });

  // Pattern 2: Detect badges in workspace header (when inside a workspace)
  const workspaceHeader = document.querySelector('[class*="workspace-header"], [class*="sidebar-header"]');
  if (workspaceHeader) {
    Object.keys(badgeTypes).forEach(badgeText => {
      if (workspaceHeader.textContent.includes(badgeText)) {
        results.badges.push({
          badge: badgeText,
          location: 'workspace_header',
          ...badgeTypes[badgeText]
        });
      }
    });
  }

  // Pattern 3: Detect upgrade prompts
  const upgradeKeywords = ['Upgrade', 'Contact Sales', 'Not available in your plan',
    'Requires Advanced', 'Premium feature', 'Subscribe to'];

  const allText = document.body.innerText;
  upgradeKeywords.forEach(keyword => {
    if (allText.includes(keyword)) {
      results.upgradePrompts.push(keyword);
    }
  });

  // Pattern 4: Check for upgrade buttons
  const buttons = document.querySelectorAll('button, a');
  buttons.forEach(btn => {
    const text = btn.textContent.trim().toLowerCase();
    if (text.includes('upgrade') || text.includes('contact sales') || text.includes('get started')) {
      results.upgradePrompts.push({
        type: 'button',
        text: btn.textContent.trim(),
        href: btn.getAttribute('href')
      });
    }
  });

  // Pattern 5: Detect advanced feature availability
  const advancedFeatures = {
    'API Discovery': '[class*="api-discovery"], [data-testid*="api-discovery"]',
    'Bot Defense Advanced': '[class*="bot-defense-advanced"]',
    'L7 DDoS': '[class*="ddos"], [data-testid*="ddos"]',
    'Client-Side Defense': '[href*="client-side-defense"]',
    'Data Intelligence': '[href*="data-intelligence"]',
    'Account Protection': '[href*="account-protection"]'
  };

  Object.entries(advancedFeatures).forEach(([feature, selector]) => {
    const el = document.querySelector(selector);
    if (el) {
      results.availableFeatures.push(feature);
    }
  });

  // Pattern 6: Detect gated features by looking for disabled/locked advanced features
  const gatedPatterns = [
    { text: 'Enable API Discovery', feature: 'API Discovery', tier: 'advanced' },
    { text: 'Bot Defense Standard', feature: 'Bot Defense', tier: 'standard' },
    { text: 'Bot Defense Advanced', feature: 'Bot Defense Advanced', tier: 'advanced' }
  ];

  gatedPatterns.forEach(pattern => {
    if (allText.includes(pattern.text)) {
      results.gatedFeatures.push({
        feature: pattern.feature,
        currentTier: pattern.tier
      });
    }
  });

  // Determine tier based on collected data
  if (results.upgradePrompts.length > 3) {
    results.tier = 'standard';
  } else if (results.availableFeatures.includes('API Discovery') &&
             results.availableFeatures.includes('Bot Defense Advanced')) {
    results.tier = 'advanced';
  } else if (results.availableFeatures.length > 5) {
    results.tier = 'enterprise';
  }

  return results;
})();
