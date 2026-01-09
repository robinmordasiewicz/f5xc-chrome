#!/usr/bin/env npx ts-node
/**
 * QA Report Generator
 *
 * Generates a comprehensive QA report in markdown format based on
 * test results, coverage data, and validation metrics.
 *
 * Usage:
 *   npx ts-node scripts/generate-qa-report.ts [options]
 *
 * Options:
 *   --output <path>     Output file path (default: qa-report.md)
 *   --include-coverage  Include detailed coverage breakdown
 *   --json              Output as JSON instead of markdown
 */

import { spawn, SpawnOptions } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestSuiteResult {
  name: string;
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

interface CoverageData {
  statements: { pct: number; covered: number; total: number };
  branches: { pct: number; covered: number; total: number };
  functions: { pct: number; covered: number; total: number };
  lines: { pct: number; covered: number; total: number };
}

interface QAReport {
  timestamp: string;
  version: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
  };
  coverage?: CoverageData;
  suites: TestSuiteResult[];
  typecheck: {
    success: boolean;
    errors: number;
  };
}

interface ReportOptions {
  output: string;
  includeCoverage: boolean;
  json: boolean;
}

function parseArgs(): ReportOptions {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  return {
    output: outputIndex >= 0 && args[outputIndex + 1] ? args[outputIndex + 1] : 'qa-report.md',
    includeCoverage: args.includes('--include-coverage'),
    json: args.includes('--json'),
  };
}

async function runCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const spawnOptions: SpawnOptions = {
      cwd: path.resolve(__dirname, '..'),
      shell: true,
    };

    const proc = spawn(command, args, spawnOptions);
    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        resolve(stdout + stderr); // Return combined output even on failure
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

function getVersion(): string {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'),
    );
    return packageJson.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function runTypeCheck(): Promise<{ success: boolean; errors: number }> {
  try {
    const output = await runCommand('npx', ['tsc', '--noEmit', '2>&1']);
    const errorMatch = output.match(/Found (\d+) errors?/);
    const errors = errorMatch ? parseInt(errorMatch[1], 10) : 0;
    return {
      success: errors === 0 && !output.includes('error TS'),
      errors,
    };
  } catch {
    return { success: false, errors: -1 };
  }
}

async function runTests(): Promise<{ summary: QAReport['summary']; suites: TestSuiteResult[] }> {
  try {
    const output = await runCommand('npx', [
      'jest',
      '--config',
      'tests/config/jest.config.ts',
      '--testPathPattern=tests/unit',
      '--json',
      '--outputFile=/dev/stdout',
      '2>/dev/null',
    ]);

    // Try to parse JSON output
    const jsonMatch = output.match(/\{[\s\S]*"numTotalTests"[\s\S]*\}/);
    if (jsonMatch) {
      const results = JSON.parse(jsonMatch[0]);
      const suites: TestSuiteResult[] = results.testResults.map(
        (suite: {
          name: string;
          assertionResults: { status: string }[];
          startTime: number;
          endTime: number;
        }) => ({
          name: path.basename(suite.name),
          tests: suite.assertionResults.length,
          passed: suite.assertionResults.filter((t: { status: string }) => t.status === 'passed')
            .length,
          failed: suite.assertionResults.filter((t: { status: string }) => t.status === 'failed')
            .length,
          skipped: suite.assertionResults.filter(
            (t: { status: string }) => t.status === 'pending' || t.status === 'skipped',
          ).length,
          duration: suite.endTime - suite.startTime,
        }),
      );

      return {
        summary: {
          totalTests: results.numTotalTests,
          passed: results.numPassedTests,
          failed: results.numFailedTests,
          skipped: results.numPendingTests,
          passRate:
            results.numTotalTests > 0
              ? (results.numPassedTests / results.numTotalTests) * 100
              : 0,
        },
        suites,
      };
    }

    // Fallback: parse text output
    const testMatch = output.match(/Tests:\s+(\d+) passed.*?(\d+) total/);
    if (testMatch) {
      return {
        summary: {
          totalTests: parseInt(testMatch[2], 10),
          passed: parseInt(testMatch[1], 10),
          failed: 0,
          skipped: 0,
          passRate: 100,
        },
        suites: [],
      };
    }

    return {
      summary: { totalTests: 0, passed: 0, failed: 0, skipped: 0, passRate: 0 },
      suites: [],
    };
  } catch (error) {
    console.error('Error running tests:', error);
    return {
      summary: { totalTests: 0, passed: 0, failed: 0, skipped: 0, passRate: 0 },
      suites: [],
    };
  }
}

async function getCoverage(): Promise<CoverageData | undefined> {
  try {
    const output = await runCommand('npx', [
      'jest',
      '--config',
      'tests/config/jest.config.ts',
      '--coverage',
      '--coverageReporters=json-summary',
      '--testPathPattern=tests/unit',
      '2>/dev/null',
    ]);

    const coveragePath = path.resolve(__dirname, '../coverage/coverage-summary.json');
    if (fs.existsSync(coveragePath)) {
      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
      return coverageData.total;
    }

    // Parse from text output as fallback
    const stmtMatch = output.match(/Statements\s+:\s+([\d.]+)%/);
    const branchMatch = output.match(/Branches\s+:\s+([\d.]+)%/);
    const funcMatch = output.match(/Functions\s+:\s+([\d.]+)%/);
    const lineMatch = output.match(/Lines\s+:\s+([\d.]+)%/);

    if (stmtMatch) {
      return {
        statements: { pct: parseFloat(stmtMatch[1]), covered: 0, total: 0 },
        branches: { pct: branchMatch ? parseFloat(branchMatch[1]) : 0, covered: 0, total: 0 },
        functions: { pct: funcMatch ? parseFloat(funcMatch[1]) : 0, covered: 0, total: 0 },
        lines: { pct: lineMatch ? parseFloat(lineMatch[1]) : 0, covered: 0, total: 0 },
      };
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function generateMarkdownReport(report: QAReport): string {
  const lines: string[] = [];

  lines.push('# QA Validation Report');
  lines.push('');
  lines.push(`**Generated:** ${report.timestamp}`);
  lines.push(`**Version:** ${report.version}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Tests | ${report.summary.totalTests} |`);
  lines.push(`| Passed | ${report.summary.passed} |`);
  lines.push(`| Failed | ${report.summary.failed} |`);
  lines.push(`| Skipped | ${report.summary.skipped} |`);
  lines.push(`| Pass Rate | ${report.summary.passRate.toFixed(2)}% |`);
  lines.push('');

  // TypeScript Check
  lines.push('## TypeScript Validation');
  lines.push('');
  if (report.typecheck.success) {
    lines.push('✅ TypeScript compilation passed with no errors.');
  } else {
    lines.push(`❌ TypeScript compilation failed with ${report.typecheck.errors} error(s).`);
  }
  lines.push('');

  // Coverage
  if (report.coverage) {
    lines.push('## Code Coverage');
    lines.push('');
    lines.push('| Category | Coverage |');
    lines.push('|----------|----------|');
    lines.push(`| Statements | ${report.coverage.statements.pct.toFixed(2)}% |`);
    lines.push(`| Branches | ${report.coverage.branches.pct.toFixed(2)}% |`);
    lines.push(`| Functions | ${report.coverage.functions.pct.toFixed(2)}% |`);
    lines.push(`| Lines | ${report.coverage.lines.pct.toFixed(2)}% |`);
    lines.push('');
  }

  // Test Suites
  if (report.suites.length > 0) {
    lines.push('## Test Suites');
    lines.push('');
    lines.push('| Suite | Tests | Passed | Failed | Duration |');
    lines.push('|-------|-------|--------|--------|----------|');
    for (const suite of report.suites) {
      const status = suite.failed === 0 ? '✅' : '❌';
      lines.push(
        `| ${status} ${suite.name} | ${suite.tests} | ${suite.passed} | ${suite.failed} | ${suite.duration}ms |`,
      );
    }
    lines.push('');
  }

  // Overall Status
  lines.push('## Overall Status');
  lines.push('');
  if (report.summary.failed === 0 && report.typecheck.success) {
    lines.push('🎉 **QA PASSED** - All validations successful!');
  } else {
    lines.push('❌ **QA FAILED** - See details above for failures.');
  }
  lines.push('');

  return lines.join('\n');
}

async function generateQAReport(): Promise<void> {
  const options = parseArgs();

  console.log('Generating QA Report...\n');

  // Collect data
  console.log('  Running TypeScript check...');
  const typecheck = await runTypeCheck();

  console.log('  Running tests...');
  const { summary, suites } = await runTests();

  let coverage: CoverageData | undefined;
  if (options.includeCoverage) {
    console.log('  Collecting coverage data...');
    coverage = await getCoverage();
  }

  const report: QAReport = {
    timestamp: new Date().toISOString(),
    version: getVersion(),
    summary,
    coverage,
    suites,
    typecheck,
  };

  // Generate output
  if (options.json) {
    const outputPath = options.output.endsWith('.json')
      ? options.output
      : options.output.replace(/\.md$/, '.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: ${outputPath}`);
  } else {
    const markdown = generateMarkdownReport(report);
    fs.writeFileSync(options.output, markdown);
    console.log(`\nReport saved to: ${options.output}`);
  }

  // Print summary
  console.log('\n--- Quick Summary ---');
  console.log(`Tests: ${summary.passed}/${summary.totalTests} passed (${summary.passRate.toFixed(1)}%)`);
  console.log(`TypeScript: ${typecheck.success ? 'PASS' : 'FAIL'}`);
  if (coverage) {
    console.log(`Coverage: ${coverage.lines.pct.toFixed(1)}% lines`);
  }
}

// Run the report generator
generateQAReport().catch((error) => {
  console.error('Report generation failed:', error);
  process.exit(1);
});
