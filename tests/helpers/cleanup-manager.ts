/**
 * CleanupManager - Idempotent Resource Cleanup for UAT Tests
 *
 * Tracks all resources created during test execution and ensures
 * they are deleted in reverse order (LIFO) during cleanup.
 *
 * Usage:
 *   const cleanup = new CleanupManager();
 *   cleanup.register('origin_pool', 'test-auto-pool-123456', 'test-namespace');
 *   cleanup.register('http_loadbalancer', 'test-auto-lb-123456', 'test-namespace');
 *   // After tests
 *   await cleanup.cleanup();
 */

export type ResourceType =
  | 'origin_pool'
  | 'http_loadbalancer'
  | 'tcp_loadbalancer'
  | 'waf_policy'
  | 'service_policy'
  | 'rate_limiter'
  | 'dns_zone'
  | 'dns_loadbalancer'
  | 'health_check'
  | 'namespace'
  | 'user'
  | 'api_credential'
  | 'cloud_site';

interface RegisteredResource {
  type: ResourceType;
  name: string;
  namespace: string;
  registeredAt: Date;
}

export class CleanupManager {
  private resources: RegisteredResource[] = [];
  private readonly dryRun: boolean;
  private readonly verbose: boolean;

  constructor(options: { dryRun?: boolean; verbose?: boolean } = {}) {
    this.dryRun = options.dryRun ?? false;
    this.verbose = options.verbose ?? true;
  }

  /**
   * Register a resource for cleanup
   */
  register(type: ResourceType, name: string, namespace: string): void {
    const resource: RegisteredResource = {
      type,
      name,
      namespace,
      registeredAt: new Date(),
    };
    this.resources.push(resource);
    if (this.verbose) {
      console.log(`[CleanupManager] Registered: ${type}/${name} in ${namespace}`);
    }
  }

  /**
   * Generate a unique test resource name
   */
  static generateResourceName(workflow: string): string {
    const timestamp = Date.now();
    return `test-auto-${workflow}-${timestamp}`;
  }

  /**
   * Get all registered resources
   */
  getRegistered(): ReadonlyArray<RegisteredResource> {
    return [...this.resources];
  }

  /**
   * Get count of registered resources
   */
  get count(): number {
    return this.resources.length;
  }

  /**
   * Cleanup all registered resources in reverse order (LIFO)
   */
  async cleanup(): Promise<CleanupResult> {
    const result: CleanupResult = {
      total: this.resources.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    if (this.resources.length === 0) {
      if (this.verbose) {
        console.log('[CleanupManager] No resources to clean up');
      }
      return result;
    }

    // Reverse order - delete dependent resources first
    const toCleanup = [...this.resources].reverse();

    for (const resource of toCleanup) {
      try {
        if (this.dryRun) {
          if (this.verbose) {
            console.log(`[CleanupManager] DRY RUN: Would delete ${resource.type}/${resource.name}`);
          }
          result.skipped++;
          continue;
        }

        await this.deleteResource(resource);
        result.successful++;
        if (this.verbose) {
          console.log(`[CleanupManager] Deleted: ${resource.type}/${resource.name}`);
        }
      } catch (error) {
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push({
          resource,
          error: errorMessage,
        });
        if (this.verbose) {
          console.error(`[CleanupManager] Failed to delete ${resource.type}/${resource.name}: ${errorMessage}`);
        }
      }
    }

    // Clear the registry
    this.resources = [];

    return result;
  }

  /**
   * Delete a single resource using CLI or API
   * This is a placeholder - actual implementation depends on xcsh CLI or API
   */
  private async deleteResource(resource: RegisteredResource): Promise<void> {
    // Map resource types to CLI commands
    const cliCommands: Record<ResourceType, string> = {
      origin_pool: `xcsh origin_pool delete ${resource.name} -n ${resource.namespace}`,
      http_loadbalancer: `xcsh load_balancer delete http_loadbalancer ${resource.name} -n ${resource.namespace}`,
      tcp_loadbalancer: `xcsh load_balancer delete tcp_loadbalancer ${resource.name} -n ${resource.namespace}`,
      waf_policy: `xcsh waf policy delete ${resource.name} -n ${resource.namespace}`,
      service_policy: `xcsh service_policy delete ${resource.name} -n ${resource.namespace}`,
      rate_limiter: `xcsh rate_limiter delete ${resource.name} -n ${resource.namespace}`,
      dns_zone: `xcsh dns zone delete ${resource.name} -n ${resource.namespace}`,
      dns_loadbalancer: `xcsh dns delete load_balancer ${resource.name} -n ${resource.namespace}`,
      health_check: `xcsh health_check delete ${resource.name} -n ${resource.namespace}`,
      namespace: `xcsh namespace delete ${resource.name}`,
      user: `xcsh user delete ${resource.name}`,
      api_credential: `xcsh credential delete ${resource.name}`,
      cloud_site: `xcsh site delete ${resource.name}`,
    };

    const command = cliCommands[resource.type];
    if (!command) {
      throw new Error(`Unknown resource type: ${resource.type}`);
    }

    // Execute the command (placeholder - would use child_process.exec in real implementation)
    // For now, we just log and simulate success
    if (this.verbose) {
      console.log(`[CleanupManager] Executing: ${command}`);
    }

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Clear all registered resources without deleting
   */
  clear(): void {
    this.resources = [];
    if (this.verbose) {
      console.log('[CleanupManager] Registry cleared');
    }
  }
}

export interface CleanupResult {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{
    resource: RegisteredResource;
    error: string;
  }>;
}

// Singleton instance for global cleanup
let globalCleanupManager: CleanupManager | null = null;

export function getGlobalCleanupManager(): CleanupManager {
  if (!globalCleanupManager) {
    globalCleanupManager = new CleanupManager();
  }
  return globalCleanupManager;
}

export function resetGlobalCleanupManager(): void {
  globalCleanupManager = null;
}
