// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

/**
 * Pattern Matcher Utility
 *
 * Handles keyword extraction, synonym mapping, and entity recognition
 * for natural language command parsing.
 */

import {
  ActionVerb,
  ResourceType,
  WorkspaceId,
  ActionSynonyms,
  ResourceSynonyms,
} from '../types';

/**
 * Action verb synonyms mapping
 */
const ACTION_SYNONYMS: ActionSynonyms[] = [
  // Navigation actions
  {
    canonical: 'navigate',
    synonyms: ['go to', 'open', 'show', 'view', 'display', 'take me to', 'bring up'],
  },
  {
    canonical: 'list',
    synonyms: ['show me', 'find', 'search', 'get', 'fetch', 'retrieve', 'look for', 'what are'],
  },
  // CRUD actions
  {
    canonical: 'create',
    synonyms: ['add', 'new', 'make', 'set up', 'configure', 'deploy'],
  },
  {
    canonical: 'edit',
    synonyms: ['update', 'modify', 'change', 'adjust', 'configure'],
  },
  {
    canonical: 'delete',
    synonyms: ['remove', 'destroy', 'drop', 'eliminate', 'get rid of'],
  },
  // Resource operations
  {
    canonical: 'clone',
    synonyms: ['copy', 'duplicate', 'replicate'],
  },
  {
    canonical: 'enable',
    synonyms: ['activate', 'turn on', 'start'],
  },
  {
    canonical: 'disable',
    synonyms: ['deactivate', 'turn off', 'stop'],
  },
  // System actions
  {
    canonical: 'crawl',
    synonyms: ['scan', 'discover', 'map', 'index'],
  },
  {
    canonical: 'refresh',
    synonyms: ['reload', 'update', 'sync'],
  },
  {
    canonical: 'status',
    synonyms: ['check', 'verify', 'inspect', 'health'],
  },
  {
    canonical: 'login',
    synonyms: ['sign in', 'authenticate', 'log in'],
  },
  {
    canonical: 'logout',
    synonyms: ['sign out', 'log out', 'disconnect'],
  },
];

/**
 * Resource type synonyms mapping
 */
const RESOURCE_SYNONYMS: ResourceSynonyms[] = [
  // Load Balancing
  {
    canonical: 'http_loadbalancer',
    synonyms: [
      'http load balancer', 'http lb', 'load balancer', 'lb', 'http loadbalancer',
      'load balancers', 'lbs', 'http load balancers', 'http lbs',
    ],
    workspace_context: ['waap'],
  },
  {
    canonical: 'tcp_loadbalancer',
    synonyms: ['tcp load balancer', 'tcp lb', 'tcp loadbalancer'],
    workspace_context: ['waap'],
  },
  {
    canonical: 'origin_pool',
    synonyms: [
      'origin pool', 'origin pools', 'origins', 'backend pool', 'backend',
      'origin server', 'upstream', 'pool',
    ],
    workspace_context: ['waap'],
  },
  {
    canonical: 'health_check',
    synonyms: ['health check', 'health checks', 'healthcheck', 'health monitor'],
    workspace_context: ['waap'],
  },
  // Security
  {
    canonical: 'waf_policy',
    synonyms: ['waf', 'waf policy', 'web application firewall', 'firewall policy'],
    workspace_context: ['waap'],
  },
  {
    canonical: 'app_firewall',
    synonyms: [
      'app firewall', 'application firewall', 'firewall', 'app fw',
      'application fw', 'waf rules',
    ],
    workspace_context: ['waap'],
  },
  {
    canonical: 'service_policy',
    synonyms: ['service policy', 'service policies', 'policy', 'policies'],
    workspace_context: ['waap'],
  },
  {
    canonical: 'rate_limiter',
    synonyms: ['rate limiter', 'rate limit', 'rate limiting', 'throttle', 'throttling'],
    workspace_context: ['waap'],
  },
  {
    canonical: 'api_protection',
    synonyms: ['api protection', 'api security', 'api defense'],
    workspace_context: ['waap'],
  },
  {
    canonical: 'bot_defense',
    synonyms: ['bot defense', 'bot protection', 'anti-bot', 'bot mitigation'],
    workspace_context: ['bot'],
  },
  // DNS
  {
    canonical: 'dns_zone',
    synonyms: ['dns zone', 'zone', 'dns zones', 'domain zone'],
    workspace_context: ['dns'],
  },
  {
    canonical: 'dns_loadbalancer',
    synonyms: ['dns load balancer', 'dns lb', 'gslb', 'global load balancer'],
    workspace_context: ['dns'],
  },
  {
    canonical: 'dns_record',
    synonyms: ['dns record', 'record', 'dns entry', 'a record', 'cname'],
    workspace_context: ['dns'],
  },
  // Infrastructure
  {
    canonical: 'cloud_site',
    synonyms: ['cloud site', 'site', 'aws site', 'azure site', 'gcp site', 'cloud sites'],
    workspace_context: ['mcn'],
  },
  {
    canonical: 'namespace',
    synonyms: ['namespace', 'namespaces', 'ns'],
  },
  {
    canonical: 'certificate',
    synonyms: ['certificate', 'cert', 'ssl cert', 'tls cert', 'certificates'],
  },
  // CDN
  {
    canonical: 'cdn_distribution',
    synonyms: ['cdn distribution', 'cdn', 'distribution', 'cdn config'],
    workspace_context: ['cdn', 'waap'],
  },
  // Administration
  {
    canonical: 'user',
    synonyms: ['user', 'users', 'account', 'accounts'],
    workspace_context: ['admin'],
  },
  {
    canonical: 'group',
    synonyms: ['group', 'groups', 'user group', 'user groups'],
    workspace_context: ['admin'],
  },
  {
    canonical: 'role',
    synonyms: ['role', 'roles', 'permission', 'permissions'],
    workspace_context: ['admin'],
  },
  {
    canonical: 'api_credential',
    synonyms: ['api credential', 'api credentials', 'api key', 'api keys', 'credential', 'credentials'],
    workspace_context: ['admin'],
  },
  {
    canonical: 'service_credential',
    synonyms: ['service credential', 'service credentials', 'service account'],
    workspace_context: ['admin'],
  },
  // Navigation targets
  {
    canonical: 'workspace',
    synonyms: ['workspace', 'workspaces', 'section'],
  },
  {
    canonical: 'home',
    synonyms: ['home', 'homepage', 'main page', 'dashboard', 'landing'],
  },
  {
    canonical: 'overview',
    synonyms: ['overview', 'summary', 'dashboard'],
  },
  {
    canonical: 'security',
    synonyms: ['security overview', 'security dashboard', 'security summary'],
  },
  {
    canonical: 'performance',
    synonyms: ['performance overview', 'performance dashboard', 'metrics'],
  },
];

/**
 * Workspace name synonyms
 */
const WORKSPACE_SYNONYMS: Record<string, WorkspaceId[]> = {
  'waap': ['waap'],
  'web app': ['waap'],
  'api protection': ['waap'],
  'web application': ['waap'],
  'mcn': ['mcn'],
  'multi-cloud network': ['mcn'],
  'network connect': ['mcn'],
  'mac': ['mac'],
  'multi-cloud app': ['mac'],
  'app connect': ['mac'],
  'dns': ['dns'],
  'dns management': ['dns'],
  'cdn': ['cdn'],
  'content delivery': ['cdn'],
  'admin': ['admin'],
  'administration': ['admin'],
  'bot': ['bot'],
  'bot defense': ['bot'],
  'data intel': ['data_intel'],
  'data intelligence': ['data_intel'],
  'csd': ['csd'],
  'client side': ['csd'],
  'client-side defense': ['csd'],
  'scan': ['scan'],
  'scanning': ['scan'],
  'web app scanning': ['scan'],
  'nginx': ['nginx'],
  'nginx one': ['nginx'],
  'bigip': ['bigip'],
  'big-ip': ['bigip'],
  'ddos': ['ddos'],
  'routed ddos': ['ddos'],
  'observe': ['observe'],
  'observability': ['observe'],
  'account': ['account'],
  'account protection': ['account'],
  'auth': ['auth'],
  'authentication': ['auth'],
  'traffic': ['traffic'],
  'traffic insight': ['traffic'],
  'delegated': ['delegated'],
  'delegated access': ['delegated'],
  'shared': ['shared'],
  'shared config': ['shared'],
  'audit': ['audit'],
  'audit logs': ['audit'],
};

/**
 * Extract action verb from input text
 */
export function extractAction(input: string): { action: ActionVerb; confidence: number } | null {
  const normalizedInput = input.toLowerCase().trim();

  for (const mapping of ACTION_SYNONYMS) {
    // Check exact canonical match
    if (normalizedInput.startsWith(mapping.canonical)) {
      return { action: mapping.canonical, confidence: 1.0 };
    }

    // Check synonym matches
    for (const synonym of mapping.synonyms) {
      if (normalizedInput.includes(synonym)) {
        // Higher confidence for matches at the start
        const confidence = normalizedInput.startsWith(synonym) ? 0.95 : 0.8;
        return { action: mapping.canonical, confidence };
      }
    }
  }

  // Default to navigate for ambiguous inputs
  if (normalizedInput.match(/^(the|my|all|)\s*(load|http|tcp|waf|origin|dns|cdn|user|group)/i)) {
    return { action: 'list', confidence: 0.6 };
  }

  return null;
}

/**
 * Extract resource type from input text
 */
export function extractResource(input: string): { resource: ResourceType; confidence: number; workspace?: WorkspaceId } | null {
  const normalizedInput = input.toLowerCase().trim();

  let bestMatch: { resource: ResourceType; confidence: number; workspace?: WorkspaceId } | null = null;
  let bestLength = 0;

  for (const mapping of RESOURCE_SYNONYMS) {
    // Check canonical match
    if (normalizedInput.includes(mapping.canonical.replace(/_/g, ' '))) {
      const matchLength = mapping.canonical.length;
      if (matchLength > bestLength) {
        bestMatch = {
          resource: mapping.canonical,
          confidence: 0.95,
          workspace: mapping.workspace_context?.[0],
        };
        bestLength = matchLength;
      }
    }

    // Check synonym matches
    for (const synonym of mapping.synonyms) {
      if (normalizedInput.includes(synonym)) {
        const matchLength = synonym.length;
        // Prefer longer matches (more specific)
        if (matchLength > bestLength) {
          bestMatch = {
            resource: mapping.canonical,
            confidence: 0.85,
            workspace: mapping.workspace_context?.[0],
          };
          bestLength = matchLength;
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Extract workspace from input text
 */
export function extractWorkspace(input: string): { workspace: WorkspaceId; confidence: number } | null {
  const normalizedInput = input.toLowerCase().trim();

  for (const [pattern, workspaces] of Object.entries(WORKSPACE_SYNONYMS)) {
    if (normalizedInput.includes(pattern)) {
      return { workspace: workspaces[0], confidence: 0.9 };
    }
  }

  return null;
}

/**
 * Extract namespace from input text
 */
export function extractNamespace(input: string): { namespace: string; confidence: number } | null {
  const normalizedInput = input.toLowerCase();

  // Pattern: "in <namespace> namespace" or "namespace <namespace>"
  const patterns = [
    /(?:in|within|for)\s+(?:the\s+)?([a-z0-9][-a-z0-9]*)\s+namespace/i,
    /namespace\s+([a-z0-9][-a-z0-9]*)/i,
    /(?:in|within|for)\s+([a-z0-9][-a-z0-9]*)\s*$/i,
    /ns[:\s]+([a-z0-9][-a-z0-9]*)/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedInput.match(pattern);
    if (match?.[1]) {
      return { namespace: match[1], confidence: 0.9 };
    }
  }

  return null;
}

/**
 * Extract resource name from input text
 */
export function extractResourceName(input: string): { name: string; confidence: number } | null {
  const normalizedInput = input.trim();

  // Pattern: "named <name>" or "called <name>" or "<resource> <name>"
  const patterns = [
    /(?:named|called)\s+["']?([a-zA-Z0-9][-a-zA-Z0-9_.]*)["']?/i,
    /(?:load balancer|lb|origin pool|waf|firewall)\s+["']?([a-zA-Z0-9][-a-zA-Z0-9_.]*)["']?/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedInput.match(pattern);
    if (match?.[1]) {
      return { name: match[1], confidence: 0.85 };
    }
  }

  return null;
}

/**
 * Tokenize input for analysis
 */
export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * Calculate similarity between two strings (Jaccard similarity)
 */
export function similarity(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));

  const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);

  return intersection.size / union.size;
}

/**
 * Find best matching synonym from a list
 */
export function findBestMatch(input: string, candidates: string[]): { match: string; score: number } | null {
  let bestMatch: string | null = null;
  let bestScore = 0;

  const normalizedInput = input.toLowerCase();

  for (const candidate of candidates) {
    // Exact match
    if (normalizedInput.includes(candidate.toLowerCase())) {
      return { match: candidate, score: 1.0 };
    }

    // Similarity match
    const score = similarity(input, candidate);
    if (score > bestScore && score > 0.3) {
      bestMatch = candidate;
      bestScore = score;
    }
  }

  return bestMatch ? { match: bestMatch, score: bestScore } : null;
}

/**
 * Get all action synonyms for a canonical action
 */
export function getActionSynonyms(action: ActionVerb): string[] {
  const mapping = ACTION_SYNONYMS.find(m => m.canonical === action);
  return mapping ? [mapping.canonical, ...mapping.synonyms] : [action];
}

/**
 * Get all resource synonyms for a canonical resource
 */
export function getResourceSynonyms(resource: ResourceType): string[] {
  const mapping = RESOURCE_SYNONYMS.find(m => m.canonical === resource);
  return mapping ? [mapping.canonical.replace(/_/g, ' '), ...mapping.synonyms] : [resource];
}

/**
 * Normalize action verb to canonical form
 */
export function normalizeAction(input: string): ActionVerb | null {
  const result = extractAction(input);
  return result?.action ?? null;
}

/**
 * Normalize resource type to canonical form
 */
export function normalizeResource(input: string): ResourceType | null {
  const result = extractResource(input);
  return result?.resource ?? null;
}
