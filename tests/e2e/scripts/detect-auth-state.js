// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * E2E Validation Script: Detect Authentication State
 *
 * Execute via mcp__chrome-devtools__evaluate_script
 * This script detects the current authentication state of the browser session.
 *
 * Usage:
 *   mcp__chrome-devtools__evaluate_script({
 *     function: "<this_script_content>"
 *   })
 */

(function detectAuthState() {
  const url = window.location.href;
  const pageContent = document.body.innerText || '';

  const authIndicators = {
    // Login page indicators
    isLoginPage: url.includes('/login') ||
                 url.includes('/auth') ||
                 url.includes('/signin') ||
                 pageContent.includes('Sign In') ||
                 pageContent.includes('Log In') ||
                 pageContent.includes('Enter your email'),

    // SSO provider indicators
    isSSOPage: url.includes('microsoftonline.com') ||
               url.includes('login.microsoft.com') ||
               url.includes('okta.com') ||
               url.includes('accounts.google.com') ||
               url.includes('login.salesforce.com'),

    // SSO provider detection
    ssoProvider: detectSSOProvider(url),

    // Authenticated state indicators
    isAuthenticated: (url.includes('/web/home') ||
                     url.includes('/web/workspaces') ||
                     url.includes('/web/dashboard')) &&
                     !pageContent.includes('Access Denied'),

    // Console content indicators
    hasConsoleContent: pageContent.includes('Web App & API Protection') ||
                       pageContent.includes('Multi-Cloud Network Connect') ||
                       pageContent.includes('DNS Management') ||
                       document.querySelector('[data-testid*="workspace"]') !== null,

    // Error indicators
    hasAccessDenied: pageContent.includes('Access Denied') ||
                     pageContent.includes('Unauthorized') ||
                     pageContent.includes('403'),

    hasNetworkError: pageContent.includes('Network Error') ||
                     pageContent.includes('Failed to fetch') ||
                     pageContent.includes('Unable to connect'),

    // Page info
    currentUrl: url,
    pageTitle: document.title,
    timestamp: new Date().toISOString()
  };

  // Determine authentication state
  let state = 'unknown';
  let message = '';

  if (authIndicators.hasAccessDenied) {
    state = 'access_denied';
    message = 'Access denied - check permissions or re-authenticate';
  } else if (authIndicators.hasNetworkError) {
    state = 'network_error';
    message = 'Network error - check connectivity';
  } else if (authIndicators.isSSOPage) {
    state = 'sso_required';
    message = `SSO authentication required (${authIndicators.ssoProvider})`;
  } else if (authIndicators.isLoginPage) {
    state = 'login_required';
    message = 'Login required - enter credentials';
  } else if (authIndicators.isAuthenticated && authIndicators.hasConsoleContent) {
    state = 'authenticated';
    message = 'Session authenticated and active';
  } else if (authIndicators.isAuthenticated) {
    state = 'authenticated_partial';
    message = 'Session authenticated but content not loaded';
  }

  function detectSSOProvider(url) {
    if (url.includes('microsoftonline.com') || url.includes('login.microsoft')) {
      return 'azure';
    } else if (url.includes('okta.com')) {
      return 'okta';
    } else if (url.includes('accounts.google.com')) {
      return 'google';
    } else if (url.includes('login.salesforce.com')) {
      return 'salesforce';
    }
    return null;
  }

  return {
    state,
    message,
    ...authIndicators
  };
})();
