// Copyright (c) 2026 Robin Mordasiewicz. MIT License.

#!/usr/bin/env npx ts-node
/**
 * QA Pipeline Script
 *
 * Automated quality assurance pipeline that runs all validation stages
 * in sequence with proper error handling and reporting.
 *
 * Usage:
 *   npx ts-node scripts/qa-pipeline.ts [options]
 *
 * Options:
 *   --skip-typecheck    Skip TypeScript compilation check
 *   --skip-unit         Skip unit tests
 *   --skip-integration  Skip integration tests
 *   --skip-coverage     Skip coverage report
 *   --include-uat       Include UAT simulations (requires browser)
 *   --verbose           Show detailed output
 *   --json              Output results as JSON
 */

import { spawn, SpawnOptions } from 'child_process';
import * as path from 'path';

interface StageResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  output?: string;
  error?: string;
}

interface PipelineResult {
  success: boolean;
  totalDuration: number;
  stages: StageResult[];
  summary: {
    passed: number;
    failed: number;
    skipped: number;
  };
}

interface PipelineOptions {
  skipTypecheck: boolean;
  skipUnit: boolean;
  skipIntegration: boolean;
  skipCoverage: boolean;
  includeUat: boolean;
  verbose: boolean;
  json: boolean;
}

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color?: keyof typeof COLORS): void {
  if (color && COLORS[color]) {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
  } else {
    console.log(message);
  }
}

function parseArgs(): PipelineOptions {
  const args = process.argv.slice(2);
  return {
    skipTypecheck: args.includes('--skip-typecheck'),
    skipUnit: args.includes('--skip-unit'),
    skipIntegration: args.includes('--skip-integration'),
    skipCoverage: args.includes('--skip-coverage'),
    includeUat: args.includes('--include-uat'),
    verbose: args.includes('--verbose'),
    json: args.includes('--json'),
  };
}

async function runCommand(
  command: string,
  args: string[],
  options: PipelineOptions,
): Promise<{ success: boolean; output: string; error: string }> {
  return new Promise((resolve) => {
    const spawnOptions: SpawnOptions = {
      cwd: path.resolve(__dirname, '..'),
      shell: true,
      stdio: options.verbose ? 'inherit' : 'pipe',
    };

    const proc = spawn(command, args, spawnOptions);
    let stdout = '';
    let stderr = '';

    if (!options.verbose && proc.stdout && proc.stderr) {
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        output: stdout,
        error: stderr,
      });
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        output: stdout,
        error: err.message,
      });
    });
  });
}

async function runStage(
  name: string,
  command: string,
  args: string[],
  options: PipelineOptions,
  skip: boolean,
): Promise<StageResult> {
  if (skip) {
    if (!options.json) {
      log(`  ⏭️  ${name}: SKIPPED`, 'yellow');
    }
    return {
      name,
      status: 'skipped',
      duration: 0,
    };
  }

  const startTime = Date.now();
  if (!options.json) {
    log(`  🔄 ${name}: Running...`, 'cyan');
  }

  const result = await runCommand(command, args, options);
  const duration = Date.now() - startTime;

  if (result.success) {
    if (!options.json) {
      log(`  ✅ ${name}: PASSED (${(duration / 1000).toFixed(2)}s)`, 'green');
    }
    return {
      name,
      status: 'passed',
      duration,
      output: result.output,
    };
  } else {
    if (!options.json) {
      log(`  ❌ ${name}: FAILED (${(duration / 1000).toFixed(2)}s)`, 'red');
      if (result.error && options.verbose) {
        console.error(result.error);
      }
    }
    return {
      name,
      status: 'failed',
      duration,
      output: result.output,
      error: result.error,
    };
  }
}

async function runQAPipeline(): Promise<PipelineResult> {
  const options = parseArgs();
  const startTime = Date.now();
  const stages: StageResult[] = [];

  if (!options.json) {
    log('\n╔════════════════════════════════════════════════════════════════╗', 'bright');
    log('║              F5 XC Console - QA Pipeline                       ║', 'bright');
    log('╚════════════════════════════════════════════════════════════════╝\n', 'bright');
  }

  // Stage 1: TypeScript Compilation Check
  if (!options.json) {
    log('📋 Stage 1: TypeScript Compilation', 'blue');
  }
  stages.push(
    await runStage(
      'TypeScript Check',
      'npx',
      ['tsc', '--noEmit'],
      options,
      options.skipTypecheck,
    ),
  );

  // Stage 2: Unit Tests
  if (!options.json) {
    log('\n📋 Stage 2: Unit Tests', 'blue');
  }
  stages.push(
    await runStage(
      'Unit Tests',
      'npx',
      ['jest', '--config', 'tests/config/jest.config.ts', '--testPathPattern=tests/unit'],
      options,
      options.skipUnit,
    ),
  );

  // Stage 3: Integration Tests
  if (!options.json) {
    log('\n📋 Stage 3: Integration Tests', 'blue');
  }
  stages.push(
    await runStage(
      'Integration Tests',
      'npx',
      ['jest', '--config', 'tests/config/jest.config.ts', '--testPathPattern=tests/integration'],
      options,
      options.skipIntegration,
    ),
  );

  // Stage 4: Coverage Report
  if (!options.json) {
    log('\n📋 Stage 4: Coverage Report', 'blue');
  }
  stages.push(
    await runStage(
      'Coverage Report',
      'npx',
      [
        'jest',
        '--config',
        'tests/config/jest.config.ts',
        '--coverage',
        '--coverageReporters=text-summary',
        '--testPathPattern=tests/unit',
      ],
      options,
      options.skipCoverage,
    ),
  );

  // Stage 5: UAT Simulations (optional)
  if (options.includeUat) {
    if (!options.json) {
      log('\n📋 Stage 5: UAT Simulations', 'blue');
    }
    stages.push(
      await runStage(
        'UAT Simulations',
        'npx',
        ['playwright', 'test', '--project=uat'],
        options,
        false,
      ),
    );
  }

  const totalDuration = Date.now() - startTime;
  const summary = {
    passed: stages.filter((s) => s.status === 'passed').length,
    failed: stages.filter((s) => s.status === 'failed').length,
    skipped: stages.filter((s) => s.status === 'skipped').length,
  };

  const result: PipelineResult = {
    success: summary.failed === 0,
    totalDuration,
    stages,
    summary,
  };

  // Output results
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    log('\n════════════════════════════════════════════════════════════════', 'bright');
    log('                         SUMMARY                                  ', 'bright');
    log('════════════════════════════════════════════════════════════════\n', 'bright');

    log(`  ✅ Passed:  ${summary.passed}`, 'green');
    log(`  ❌ Failed:  ${summary.failed}`, summary.failed > 0 ? 'red' : 'green');
    log(`  ⏭️  Skipped: ${summary.skipped}`, 'yellow');
    log(`  ⏱️  Total Time: ${(totalDuration / 1000).toFixed(2)}s\n`);

    if (result.success) {
      log('🎉 QA Pipeline PASSED - All stages successful!\n', 'green');
    } else {
      log('💥 QA Pipeline FAILED - Check failed stages above.\n', 'red');

      // Show failed stage details
      const failedStages = stages.filter((s) => s.status === 'failed');
      for (const stage of failedStages) {
        log(`\nFailed Stage: ${stage.name}`, 'red');
        if (stage.error) {
          console.error(stage.error);
        }
      }
    }
  }

  return result;
}

// Run the pipeline
runQAPipeline()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Pipeline error:', error);
    process.exit(1);
  });
