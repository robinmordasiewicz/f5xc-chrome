/**
 * Authentication Handler
 *
 * Handles multi-provider authentication flows for F5 XC Console.
 * Supports Azure SSO, Google, Okta, SAML, native, and already_authenticated states.
 */

import {
  AuthState,
  AuthProvider,
  AuthStatus,
  AuthFlow,
  AuthFlowStep,
} from '../types';
import { ParsedSnapshot, getSnapshotParser } from '../mcp/snapshot-parser';

/**
 * URL patterns for detecting authentication provider
 */
const PROVIDER_URL_PATTERNS: Record<AuthProvider, RegExp[]> = {
  azure_sso: [
    /login\.microsoftonline\.com/,
    /microsoft\.com\/devicelogin/,
    /login\.live\.com/,
  ],
  google_sso: [
    /accounts\.google\.com/,
    /google\.com\/o\/oauth2/,
  ],
  okta_sso: [
    /\.okta\.com/,
    /oktapreview\.com/,
  ],
  saml: [
    /\/saml\//i,
    /\/sso\//i,
    /\/adfs\//i,
  ],
  native: [
    /\/login$/,
    /volterra\.(io|us)\/login/,
  ],
  already_authenticated: [],
  unknown: [],
};

/**
 * Text patterns for detecting authentication state
 */
const AUTH_STATE_PATTERNS: Record<AuthStatus, string[]> = {
  authenticated: [
    'Web App & API Protection',
    'Multi-Cloud Network Connect',
    'Administration',
    '/web/home',
    'workspace',
  ],
  login_required: [
    'Sign in',
    'Log in',
    'Enter your email',
    'Username',
    'Password',
  ],
  sso_redirect: [
    'Redirecting',
    'Please wait',
    'Loading',
  ],
  account_selection: [
    'Pick an account',
    'Choose an account',
    'Select an account',
    'Use another account',
  ],
  mfa_required: [
    'Verify your identity',
    'Two-factor',
    'Enter the code',
    'Authenticator',
    'MFA',
  ],
  session_expired: [
    'Session expired',
    'Session timed out',
    'Please sign in again',
    'Your session has ended',
  ],
  access_denied: [
    'Access denied',
    'Permission denied',
    'Unauthorized',
    'You do not have permission',
  ],
  connection_failed: [
    'Connection failed',
    'Unable to connect',
    'Network error',
    'Service unavailable',
  ],
  unknown: [],
};

/**
 * Authentication handler options
 */
export interface AuthHandlerOptions {
  /** Tenant URL */
  tenantUrl?: string;
  /** Timeout for auth operations in ms */
  timeout?: number;
  /** Whether to allow manual intervention prompts */
  allowManualIntervention?: boolean;
}

/**
 * Authentication detection result
 */
export interface AuthDetectionResult {
  /** Detected auth state */
  state: AuthState;
  /** Recommended next action */
  nextAction?: AuthFlowStep;
  /** Whether automation can continue */
  canContinue: boolean;
  /** Message for user if manual intervention needed */
  userMessage?: string;
}

/**
 * Authentication Handler class
 */
export class AuthHandler {
  private tenantUrl: string;
  private timeout: number;
  private allowManualIntervention: boolean;
  private parser = getSnapshotParser();

  constructor(options?: AuthHandlerOptions) {
    this.tenantUrl = options?.tenantUrl ?? 'https://f5-amer-ent.console.ves.volterra.io';
    this.timeout = options?.timeout ?? 30000;
    this.allowManualIntervention = options?.allowManualIntervention ?? true;
  }

  /**
   * Detect current authentication state from URL and page snapshot
   */
  detectAuthState(currentUrl: string, snapshot: ParsedSnapshot): AuthState {
    // First, check if we're on the console (authenticated)
    if (this.isAuthenticated(currentUrl, snapshot)) {
      return {
        status: 'authenticated',
        is_authenticated: true,
        provider: 'already_authenticated',
        requires_manual_intervention: false,
        current_url: currentUrl,
        detected_user: this.extractUsername(snapshot),
      };
    }

    // Detect provider from URL
    const provider = this.detectProvider(currentUrl);

    // Detect status from page content
    const status = this.detectStatus(currentUrl, snapshot);

    // Determine if manual intervention is required
    const requiresManual = this.requiresManualIntervention(status, provider);

    return {
      status,
      is_authenticated: false,
      provider,
      requires_manual_intervention: requiresManual,
      redirect_url: this.getExpectedRedirectUrl(currentUrl, provider),
      message: this.getStatusMessage(status, provider),
      current_url: currentUrl,
    };
  }

  /**
   * Check if user is authenticated
   */
  private isAuthenticated(url: string, snapshot: ParsedSnapshot): boolean {
    // Check URL patterns for authenticated state
    if (url.includes('/web/home') || url.includes('/web/workspaces')) {
      return true;
    }

    // Check for authenticated page elements
    const authIndicators = AUTH_STATE_PATTERNS.authenticated;
    for (const indicator of authIndicators) {
      if (this.parser.hasText(snapshot, indicator)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect authentication provider from URL
   */
  private detectProvider(url: string): AuthProvider {
    for (const [provider, patterns] of Object.entries(PROVIDER_URL_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(url)) {
          return provider as AuthProvider;
        }
      }
    }
    return 'unknown';
  }

  /**
   * Detect authentication status from page content
   */
  private detectStatus(url: string, snapshot: ParsedSnapshot): AuthStatus {
    // Check each status pattern
    for (const [status, patterns] of Object.entries(AUTH_STATE_PATTERNS)) {
      if (status === 'unknown') continue;

      for (const pattern of patterns) {
        if (this.parser.hasText(snapshot, pattern)) {
          return status as AuthStatus;
        }
      }
    }

    // Check URL for login indicators
    if (url.includes('/login') || url.includes('/signin')) {
      return 'login_required';
    }

    return 'unknown';
  }

  /**
   * Determine if manual intervention is required
   */
  private requiresManualIntervention(
    status: AuthStatus,
    provider: AuthProvider
  ): boolean {
    // These states always require manual intervention
    const manualStates: AuthStatus[] = [
      'mfa_required',
      'account_selection',
      'access_denied',
    ];

    if (manualStates.includes(status)) {
      return true;
    }

    // SSO providers may require manual intervention
    if (provider !== 'native' && provider !== 'already_authenticated') {
      if (status === 'login_required') {
        return true; // SSO login typically needs user interaction
      }
    }

    return false;
  }

  /**
   * Get expected redirect URL after authentication
   */
  private getExpectedRedirectUrl(
    currentUrl: string,
    provider: AuthProvider
  ): string | undefined {
    if (provider === 'already_authenticated') {
      return undefined;
    }

    // Default redirect is to home
    return `${this.tenantUrl}/web/home`;
  }

  /**
   * Get human-readable status message
   */
  private getStatusMessage(status: AuthStatus, provider: AuthProvider): string {
    const messages: Record<AuthStatus, string> = {
      authenticated: 'Successfully authenticated',
      login_required: `Authentication required via ${provider}`,
      sso_redirect: 'Waiting for SSO redirect to complete',
      account_selection: 'Please select an account to continue',
      mfa_required: 'Multi-factor authentication required - please complete MFA',
      session_expired: 'Session expired - please log in again',
      access_denied: 'Access denied - check your permissions',
      connection_failed: 'Connection failed - please check network',
      unknown: 'Unknown authentication state',
    };

    return messages[status];
  }

  /**
   * Extract username from authenticated page
   */
  private extractUsername(snapshot: ParsedSnapshot): string | undefined {
    // Look for user menu or profile elements
    const userElements = this.parser.findElements(snapshot, {
      role: 'button',
      name: '@',
      partial: true,
    });

    if (userElements.length > 0 && userElements[0].name) {
      return userElements[0].name;
    }

    return undefined;
  }

  /**
   * Analyze authentication and recommend next action
   */
  analyzeAuth(currentUrl: string, snapshot: ParsedSnapshot): AuthDetectionResult {
    const state = this.detectAuthState(currentUrl, snapshot);

    // Already authenticated - can continue
    if (state.is_authenticated) {
      return {
        state,
        canContinue: true,
      };
    }

    // Needs manual intervention
    if (state.requires_manual_intervention) {
      return {
        state,
        canContinue: false,
        userMessage: this.buildManualInterventionMessage(state),
      };
    }

    // Build next action
    const nextAction = this.buildNextAction(state, snapshot);

    return {
      state,
      nextAction,
      canContinue: !state.requires_manual_intervention,
    };
  }

  /**
   * Build manual intervention message for user
   */
  private buildManualInterventionMessage(state: AuthState): string {
    switch (state.status) {
      case 'mfa_required':
        return 'Please complete multi-factor authentication in the browser, then say "continue" when done.';
      case 'account_selection':
        return 'Please select an account in the browser, then say "continue" when done.';
      case 'access_denied':
        return 'Access denied. Please verify you have the correct permissions for this tenant.';
      case 'session_expired':
        return 'Your session has expired. Please log in again and say "continue" when done.';
      default:
        return `Authentication required: ${state.message}. Please complete authentication and say "continue" when done.`;
    }
  }

  /**
   * Build next action for automated flow
   */
  private buildNextAction(
    state: AuthState,
    snapshot: ParsedSnapshot
  ): AuthFlowStep | undefined {
    switch (state.status) {
      case 'login_required':
        // Look for login button or form
        if (this.parser.hasButton(snapshot, 'Sign in') ||
            this.parser.hasButton(snapshot, 'Log in')) {
          return {
            step: 1,
            description: 'Click sign in button',
            action: 'click',
            target: 'Sign in button',
            expected_result: 'SSO redirect or login form',
            timeout_ms: this.timeout,
            skippable: false,
          };
        }
        break;

      case 'sso_redirect':
        return {
          step: 1,
          description: 'Wait for SSO redirect',
          action: 'wait',
          expected_result: 'Redirect to console or identity provider',
          timeout_ms: this.timeout,
          skippable: false,
        };

      default:
        return undefined;
    }

    return undefined;
  }

  /**
   * Get authentication flow for a provider
   */
  getAuthFlow(provider: AuthProvider): AuthFlow {
    const commonSteps: AuthFlowStep[] = [
      {
        step: 1,
        description: 'Navigate to tenant login',
        action: 'navigate',
        target: `${this.tenantUrl}/login`,
        expected_result: 'Login page loaded',
        timeout_ms: 10000,
        skippable: false,
      },
      {
        step: 2,
        description: 'Detect authentication provider',
        action: 'detect',
        expected_result: 'Provider identified',
        timeout_ms: 5000,
        skippable: false,
      },
    ];

    const providerSteps: Record<AuthProvider, AuthFlowStep[]> = {
      azure_sso: [
        ...commonSteps,
        {
          step: 3,
          description: 'Wait for Azure SSO redirect',
          action: 'wait',
          expected_result: 'Microsoft login page',
          timeout_ms: 15000,
          skippable: false,
        },
        {
          step: 4,
          description: 'User completes Azure authentication',
          action: 'prompt_user',
          expected_result: 'User logged in via Azure',
          timeout_ms: 120000,
          skippable: false,
        },
      ],
      google_sso: [
        ...commonSteps,
        {
          step: 3,
          description: 'Wait for Google SSO redirect',
          action: 'wait',
          expected_result: 'Google login page',
          timeout_ms: 15000,
          skippable: false,
        },
        {
          step: 4,
          description: 'User completes Google authentication',
          action: 'prompt_user',
          expected_result: 'User logged in via Google',
          timeout_ms: 120000,
          skippable: false,
        },
      ],
      okta_sso: [
        ...commonSteps,
        {
          step: 3,
          description: 'Wait for Okta SSO redirect',
          action: 'wait',
          expected_result: 'Okta login page',
          timeout_ms: 15000,
          skippable: false,
        },
        {
          step: 4,
          description: 'User completes Okta authentication',
          action: 'prompt_user',
          expected_result: 'User logged in via Okta',
          timeout_ms: 120000,
          skippable: false,
        },
      ],
      saml: [
        ...commonSteps,
        {
          step: 3,
          description: 'Wait for SAML redirect',
          action: 'wait',
          expected_result: 'Identity provider login page',
          timeout_ms: 15000,
          skippable: false,
        },
        {
          step: 4,
          description: 'User completes SAML authentication',
          action: 'prompt_user',
          expected_result: 'User logged in via SAML',
          timeout_ms: 120000,
          skippable: false,
        },
      ],
      native: [
        ...commonSteps,
        {
          step: 3,
          description: 'Fill username',
          action: 'click',
          target: 'Username field',
          expected_result: 'Username entered',
          timeout_ms: 5000,
          skippable: false,
        },
        {
          step: 4,
          description: 'Fill password',
          action: 'click',
          target: 'Password field',
          expected_result: 'Password entered',
          timeout_ms: 5000,
          skippable: false,
        },
        {
          step: 5,
          description: 'Click login button',
          action: 'click',
          target: 'Login button',
          expected_result: 'Login submitted',
          timeout_ms: 5000,
          skippable: false,
        },
      ],
      already_authenticated: [],
      unknown: commonSteps,
    };

    return {
      provider,
      steps: providerSteps[provider],
      url_patterns: PROVIDER_URL_PATTERNS[provider].map(r => r.source),
      success_indicators: AUTH_STATE_PATTERNS.authenticated,
      failure_indicators: [
        ...AUTH_STATE_PATTERNS.access_denied,
        ...AUTH_STATE_PATTERNS.connection_failed,
      ],
    };
  }

  /**
   * Check if authentication is needed
   */
  needsAuthentication(url: string, snapshot: ParsedSnapshot): boolean {
    const state = this.detectAuthState(url, snapshot);
    return !state.is_authenticated;
  }

  /**
   * Get the tenant URL
   */
  getTenantUrl(): string {
    return this.tenantUrl;
  }

  /**
   * Set the tenant URL
   */
  setTenantUrl(url: string): void {
    this.tenantUrl = url;
  }
}

/**
 * Singleton instance
 */
let defaultHandler: AuthHandler | null = null;

/**
 * Get the default auth handler instance
 */
export function getAuthHandler(options?: AuthHandlerOptions): AuthHandler {
  if (!defaultHandler) {
    defaultHandler = new AuthHandler(options);
  }
  return defaultHandler;
}

/**
 * Reset the default handler (useful for testing)
 */
export function resetAuthHandler(): void {
  defaultHandler = null;
}
