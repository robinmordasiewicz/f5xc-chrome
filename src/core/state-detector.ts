// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * State Detector
 *
 * Detects runtime state including:
 * - RBAC (Role-Based Access Control) permissions
 * - Subscription tier and feature availability
 * - Module initialization status
 */

import {
  PermissionState,
  PermissionLevel,
  SubscriptionTier,
  ModuleState,
  ConsoleState,
  PageState,
} from '../types';
import { ParsedSnapshot, ParsedElement, getSnapshotParser } from '../mcp/snapshot-parser';
import { getAuthHandler, AuthDetectionResult } from '../handlers/auth-handler';

/**
 * RBAC detection patterns
 */
const LOCKED_INDICATORS = {
  disabled_attributes: ['disabled', 'aria-disabled="true"'],
  css_classes: ['disabled', 'locked', 'readonly', 'ves-disabled'],
  tooltip_keywords: [
    'permission denied',
    'read-only',
    'not authorized',
    'contact administrator',
    'cannot access this feature',
  ],
};

/**
 * Subscription badge mappings
 */
const SUBSCRIPTION_BADGES: Record<string, { tier: SubscriptionTier; access: string }> = {
  'limited availability': {
    tier: 'enterprise',
    access: 'May require subscription upgrade or approval',
  },
  'early access': {
    tier: 'enterprise',
    access: 'May require opt-in or approval',
  },
  upgrade: {
    tier: 'enterprise',
    access: 'Requires higher tier subscription',
  },
  new: {
    tier: 'standard',
    access: 'Generally available',
  },
};

/**
 * Module initialization patterns
 */
const MODULE_INIT_PATTERNS = {
  enabled_indicators: [
    'This service is enabled',
    'Visit Service',
    'Explore',
  ],
  disabled_indicators: [
    'This service is not enabled',
    'Enable Service',
    'Initialize',
    'Get Started',
    'Set Up',
    'Not configured',
  ],
  empty_state_patterns: [
    'No data available',
    'Get started by',
    'Enable this service to',
  ],
};

/**
 * Known modules to detect
 */
const KNOWN_MODULES = [
  'client-side-defense',
  'web-app-scanning',
  'bot-defense',
  'data-intelligence',
  'account-protection',
  'authentication-intelligence',
  'api-discovery',
  'api-security',
];

/**
 * State detection options
 */
export interface StateDetectorOptions {
  /** Tenant URL */
  tenantUrl?: string;
}

/**
 * Internal permission level type for detection
 */
type DetectedPermissionLevel = 'full' | 'edit' | 'read_only' | 'none';

/**
 * Permission detection result
 */
export interface PermissionDetectionResult {
  /** Detected permission level */
  level: DetectedPermissionLevel;
  /** Locked actions found */
  lockedActions: string[];
  /** Available actions found */
  availableActions: string[];
  /** Is read-only mode */
  isReadOnly: boolean;
  /** Permission denial messages */
  denialMessages: string[];
}

/**
 * Subscription detection result
 */
export interface SubscriptionDetectionResult {
  /** Detected subscription tier */
  tier: SubscriptionTier;
  /** Available features */
  availableFeatures: string[];
  /** Restricted features */
  restrictedFeatures: string[];
  /** Badges found */
  badges: string[];
}

/**
 * Module detection result
 */
export interface ModuleDetectionResult {
  /** Module name */
  name: string;
  /** Whether module is enabled */
  enabled: boolean;
  /** Whether module requires initialization */
  requiresInit: boolean;
  /** Status text */
  statusText?: string;
}

/**
 * State Detector class
 */
export class StateDetector {
  private tenantUrl: string;
  private parser = getSnapshotParser();

  constructor(options?: StateDetectorOptions) {
    this.tenantUrl = options?.tenantUrl ?? 'https://f5-amer-ent.console.ves.volterra.io';
  }

  /**
   * Detect full console state from URL and snapshot
   */
  detectConsoleState(
    currentUrl: string,
    snapshot: ParsedSnapshot
  ): ConsoleState {
    const authHandler = getAuthHandler({ tenantUrl: this.tenantUrl });
    const authResult = authHandler.analyzeAuth(currentUrl, snapshot);

    const pageState = this.detectPageState(currentUrl, snapshot);
    const permissions = this.detectPermissions(snapshot);
    const modules = this.detectModules(snapshot);

    // Build permission state if permissions were detected
    const permissionState: PermissionState | undefined = {
      level: permissions.level,
      can_create: !permissions.lockedActions.includes('Add') && !permissions.lockedActions.includes('Create'),
      can_edit: !permissions.lockedActions.includes('Edit') && !permissions.lockedActions.includes('Edit Configuration'),
      can_delete: !permissions.lockedActions.includes('Delete'),
      can_clone: !permissions.lockedActions.includes('Clone') && !permissions.lockedActions.includes('Clone Object'),
      view_only: permissions.isReadOnly,
      locked_actions: permissions.lockedActions,
      available_actions: permissions.availableActions,
      detected_indicators: permissions.denialMessages,
    };

    // Build module states map
    const moduleStates: Record<string, ModuleState> = {};
    for (const m of modules) {
      moduleStates[m.name] = {
        module_id: m.name,
        name: m.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        status: m.enabled ? 'enabled' : (m.requiresInit ? 'pending_initialization' : 'disabled'),
        initialized: m.enabled,
        available_action: m.requiresInit ? 'enable' : (m.enabled ? 'explore' : 'configure'),
        badges: [],
        message: m.statusText,
      };
    }

    return {
      auth: authResult.state,
      page: pageState,
      permissions: permissionState,
      modules: moduleStates,
      captured_at: new Date().toISOString(),
      capture_method: 'snapshot',
    };
  }

  /**
   * Detect page state from URL and snapshot
   */
  detectPageState(url: string, snapshot: ParsedSnapshot): PageState {
    return {
      url,
      title: snapshot.title ?? '',
      workspace: this.extractWorkspace(url),
      namespace: this.extractNamespace(url),
      page_type: this.detectPageType(url, snapshot),
      is_loading: this.isLoading(snapshot),
      has_error: this.hasError(snapshot),
      error_message: this.extractError(snapshot),
    };
  }

  /**
   * Detect RBAC permissions from page snapshot
   */
  detectPermissions(snapshot: ParsedSnapshot): PermissionDetectionResult {
    const lockedActions: string[] = [];
    const availableActions: string[] = [];
    const denialMessages: string[] = [];
    let isReadOnly = false;

    // Check for locked buttons/tabs
    const buttons = this.parser.findElements(snapshot, { role: 'button' });
    const tabs = this.parser.findElements(snapshot, { role: 'tab' });

    for (const element of [...buttons, ...tabs]) {
      if (this.isLockedElement(element, snapshot)) {
        lockedActions.push(element.name ?? 'unknown');
      } else {
        availableActions.push(element.name ?? 'unknown');
      }
    }

    // Check for view mode badge
    if (this.hasViewModeBadge(snapshot)) {
      isReadOnly = true;
    }

    // Check for permission denial tooltips
    const tooltips = this.parser.findElements(snapshot, { role: 'tooltip' });
    for (const tooltip of tooltips) {
      if (this.isPermissionDenialTooltip(tooltip)) {
        denialMessages.push(tooltip.name ?? '');
      }
    }

    // Check menu options for locked indicators
    const options = this.parser.findElements(snapshot, { role: 'option' });
    const menuItems = this.parser.findElements(snapshot, { role: 'menuitem' });

    for (const option of [...options, ...menuItems]) {
      if (this.isLockedMenuOption(option, snapshot)) {
        lockedActions.push(option.name ?? 'unknown');
      }
    }

    // Determine permission level
    const level = this.determinePermissionLevel(
      lockedActions,
      availableActions,
      isReadOnly
    );

    return {
      level,
      lockedActions: [...new Set(lockedActions)],
      availableActions: [...new Set(availableActions)],
      isReadOnly,
      denialMessages,
    };
  }

  /**
   * Check if an element is locked (RBAC restricted)
   */
  private isLockedElement(element: ParsedElement, snapshot: ParsedSnapshot): boolean {
    // Check for "Locked" text in element name
    if (element.name?.toLowerCase().includes('locked')) {
      return true;
    }

    // Check for disabled state
    if (element.disabled) {
      return true;
    }

    // Check for locked indicator in element children by looking at adjacent elements
    const elementIndex = snapshot.elements.indexOf(element);
    if (elementIndex > 0) {
      const prevElement = snapshot.elements[elementIndex - 1];
      if (prevElement.name?.toLowerCase() === 'locked') {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for view mode badge indicating read-only
   */
  private hasViewModeBadge(snapshot: ParsedSnapshot): boolean {
    // Look for "View" badge in regions
    const regions = this.parser.findElements(snapshot, { role: 'region' });

    for (const region of regions) {
      // Check if region starts with "View" indicator
      const regionIndex = snapshot.elements.indexOf(region);
      if (regionIndex >= 0 && regionIndex < snapshot.elements.length - 1) {
        const nextElement = snapshot.elements[regionIndex + 1];
        if (nextElement.name?.toLowerCase() === 'view') {
          return true;
        }
      }
    }

    // Also check for direct "View" text that might indicate read-only mode
    return this.parser.hasText(snapshot, 'View Configuration') ||
           this.parser.hasText(snapshot, 'Read Only');
  }

  /**
   * Check if tooltip indicates permission denial
   */
  private isPermissionDenialTooltip(tooltip: ParsedElement): boolean {
    const text = (tooltip.name ?? '').toLowerCase();
    return LOCKED_INDICATORS.tooltip_keywords.some(keyword =>
      text.includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if menu option is locked
   */
  private isLockedMenuOption(option: ParsedElement, snapshot: ParsedSnapshot): boolean {
    // Check for "Locked" in option name
    if (option.name?.toLowerCase().includes('locked')) {
      return true;
    }

    // Look for locked sibling
    const optionIndex = snapshot.elements.indexOf(option);
    if (optionIndex > 0) {
      const prevElement = snapshot.elements[optionIndex - 1];
      if (prevElement.name?.toLowerCase() === 'locked' &&
          prevElement.role === 'generic') {
        return true;
      }
    }

    return false;
  }

  /**
   * Determine permission level from detected state
   */
  private determinePermissionLevel(
    lockedActions: string[],
    availableActions: string[],
    isReadOnly: boolean
  ): DetectedPermissionLevel {
    if (isReadOnly) {
      return 'read_only';
    }

    if (lockedActions.length === 0 && availableActions.length > 0) {
      return 'full';
    }

    if (lockedActions.length > 0 && availableActions.length > 0) {
      // Some actions available, some locked - determine if edit or restricted
      const hasCreateLocked = lockedActions.some(a =>
        a.toLowerCase().includes('add') || a.toLowerCase().includes('create')
      );
      const hasDeleteLocked = lockedActions.some(a =>
        a.toLowerCase().includes('delete')
      );

      // If can't create or delete, likely edit-only
      if (hasCreateLocked || hasDeleteLocked) {
        return 'edit';
      }
      return 'edit';
    }

    if (lockedActions.length > 0 && availableActions.length === 0) {
      return 'read_only';
    }

    return 'none';
  }

  /**
   * Detect subscription tier and features
   */
  detectSubscription(snapshot: ParsedSnapshot): SubscriptionDetectionResult {
    const badges: string[] = [];
    const availableFeatures: string[] = [];
    const restrictedFeatures: string[] = [];
    let tier: SubscriptionTier = 'standard';

    // Scan for subscription badges
    const links = this.parser.findElements(snapshot, { role: 'link' });
    const generics = this.parser.findElements(snapshot, { role: 'generic' });

    for (const element of [...links, ...generics]) {
      const text = (element.name ?? '').toLowerCase();

      for (const [badge, info] of Object.entries(SUBSCRIPTION_BADGES)) {
        if (text.includes(badge)) {
          badges.push(badge);
          if (info.tier === 'enterprise' && tier !== 'enterprise') {
            tier = 'enterprise';
          }
        }
      }
    }

    // Check for upgrade prompts
    const upgradePatterns = [
      'upgrade',
      'contact sales',
      'not available in your plan',
      'requires advanced subscription',
      'premium feature',
    ];

    for (const pattern of upgradePatterns) {
      if (this.parser.hasText(snapshot, pattern)) {
        // Found upgrade prompt - indicates restricted feature
        tier = 'standard'; // User is on standard, feature requires upgrade
        badges.push('upgrade required');
        break;
      }
    }

    // Detect available features based on page content
    const featureIndicators: Record<string, string[]> = {
      'api_discovery': ['API Discovery', 'Enable API Discovery'],
      'bot_defense': ['Bot Defense', 'Bot Mitigation'],
      'ddos_protection': ['DDoS', 'L7 DDoS Protection'],
      'client_side_defense': ['Client-Side Defense', 'CSD'],
      'waf': ['WAF', 'Web Application Firewall', 'App Firewall'],
    };

    for (const [feature, indicators] of Object.entries(featureIndicators)) {
      const hasFeature = indicators.some(ind => this.parser.hasText(snapshot, ind));
      if (hasFeature) {
        // Check if it's available or restricted
        const isRestricted = this.parser.hasText(snapshot, `Enable ${indicators[0]}`) ||
                           this.parser.hasText(snapshot, 'Upgrade');
        if (isRestricted) {
          restrictedFeatures.push(feature);
        } else {
          availableFeatures.push(feature);
        }
      }
    }

    return {
      tier,
      availableFeatures,
      restrictedFeatures,
      badges: [...new Set(badges)],
    };
  }

  /**
   * Detect module initialization states
   */
  detectModules(snapshot: ParsedSnapshot): ModuleDetectionResult[] {
    const results: ModuleDetectionResult[] = [];

    for (const moduleName of KNOWN_MODULES) {
      const moduleResult = this.detectModuleState(moduleName, snapshot);
      if (moduleResult) {
        results.push(moduleResult);
      }
    }

    return results;
  }

  /**
   * Detect single module state
   */
  private detectModuleState(
    moduleName: string,
    snapshot: ParsedSnapshot
  ): ModuleDetectionResult | null {
    // Check if module is mentioned in snapshot
    const moduleNameVariants = [
      moduleName,
      moduleName.replace(/-/g, ' '),
      moduleName.replace(/-/g, ''),
    ];

    let found = false;
    let enabled = false;
    let requiresInit = false;
    let statusText: string | undefined;

    for (const variant of moduleNameVariants) {
      if (this.parser.hasText(snapshot, variant)) {
        found = true;
        break;
      }
    }

    if (!found) {
      return null;
    }

    // Check for enabled indicators
    for (const indicator of MODULE_INIT_PATTERNS.enabled_indicators) {
      if (this.parser.hasText(snapshot, indicator)) {
        enabled = true;
        statusText = indicator;
        break;
      }
    }

    // Check for disabled/init required indicators
    if (!enabled) {
      for (const indicator of MODULE_INIT_PATTERNS.disabled_indicators) {
        if (this.parser.hasText(snapshot, indicator)) {
          requiresInit = true;
          statusText = indicator;
          break;
        }
      }
    }

    // Check for empty state patterns
    if (!enabled && !requiresInit) {
      for (const pattern of MODULE_INIT_PATTERNS.empty_state_patterns) {
        if (this.parser.hasText(snapshot, pattern)) {
          requiresInit = true;
          statusText = pattern;
          break;
        }
      }
    }

    return {
      name: moduleName,
      enabled,
      requiresInit,
      statusText,
    };
  }

  /**
   * Extract workspace from URL
   */
  private extractWorkspace(url: string): string | undefined {
    const match = url.match(/\/workspaces\/([^/]+)/);
    return match?.[1];
  }

  /**
   * Extract namespace from URL
   */
  private extractNamespace(url: string): string | undefined {
    const match = url.match(/\/namespaces\/([^/]+)/);
    return match?.[1];
  }

  /**
   * Detect page type from URL and content
   */
  private detectPageType(url: string, snapshot: ParsedSnapshot): string {
    if (url.includes('/home')) return 'home';
    if (url.includes('/create')) return 'form';
    if (url.includes('/edit')) return 'form';
    if (url.includes('/manage/')) return 'list';
    if (url.includes('/overview/')) return 'overview';
    if (url.includes('/workspaces/') && url.includes('/about')) return 'about';
    if (url.includes('/workspaces/')) return 'workspace';
    if (url.includes('/login')) return 'login';
    return 'unknown';
  }

  /**
   * Check if page is loading
   */
  private isLoading(snapshot: ParsedSnapshot): boolean {
    return (
      this.parser.hasText(snapshot, 'Loading') ||
      this.parser.hasText(snapshot, 'Please wait') ||
      this.parser.hasText(snapshot, 'Fetching')
    );
  }

  /**
   * Check if page has error
   */
  private hasError(snapshot: ParsedSnapshot): boolean {
    return (
      this.parser.hasText(snapshot, 'Error') ||
      this.parser.hasText(snapshot, 'Failed') ||
      this.parser.hasText(snapshot, 'not found') ||
      this.parser.hasText(snapshot, 'Something went wrong')
    );
  }

  /**
   * Extract error message from page
   */
  private extractError(snapshot: ParsedSnapshot): string | undefined {
    const errorPatterns = ['error', 'failed', 'not found', 'something went wrong'];

    for (const pattern of errorPatterns) {
      const errorElements = this.parser.findElements(snapshot, {
        text: pattern,
        partial: true,
        caseInsensitive: true,
      });

      if (errorElements.length > 0) {
        return errorElements[0].name;
      }
    }

    return undefined;
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
let defaultDetector: StateDetector | null = null;

/**
 * Get the default state detector instance
 */
export function getStateDetector(options?: StateDetectorOptions): StateDetector {
  if (!defaultDetector) {
    defaultDetector = new StateDetector(options);
  }
  return defaultDetector;
}

/**
 * Reset the default detector (useful for testing)
 */
export function resetStateDetector(): void {
  defaultDetector = null;
}

/**
 * Quick function to detect permissions from snapshot
 */
export function detectPermissions(
  snapshot: ParsedSnapshot
): PermissionDetectionResult {
  return getStateDetector().detectPermissions(snapshot);
}

/**
 * Quick function to detect subscription from snapshot
 */
export function detectSubscription(
  snapshot: ParsedSnapshot
): SubscriptionDetectionResult {
  return getStateDetector().detectSubscription(snapshot);
}

/**
 * Quick function to detect modules from snapshot
 */
export function detectModules(
  snapshot: ParsedSnapshot
): ModuleDetectionResult[] {
  return getStateDetector().detectModules(snapshot);
}

/**
 * Quick function to detect full console state
 */
export function detectConsoleState(
  url: string,
  snapshot: ParsedSnapshot
): ConsoleState {
  return getStateDetector().detectConsoleState(url, snapshot);
}
