#!/usr/bin/env node

// =============================================================================
// TEST SUITE RUNNER
// RTR-MRP Comprehensive Test Suite
// =============================================================================

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  outputDir: '__tests__/reports',
  colors: {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
  }
};

// =============================================================================
// UTILITIES
// =============================================================================

function log(message, color = 'reset') {
  console.log(`${CONFIG.colors[color]}${message}${CONFIG.colors.reset}`);
}

function createOutputDir() {
  const dir = path.join(process.cwd(), CONFIG.outputDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function runCommand(command, description) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Running: ${description}`, 'cyan');
  log('='.repeat(60), 'cyan');
  
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✓ ${description} completed`, 'green');
    return true;
  } catch (error) {
    log(`✗ ${description} failed`, 'red');
    return false;
  }
}

// =============================================================================
// TEST SUITES
// =============================================================================

const testSuites = {
  unit: {
    name: 'Unit Tests',
    command: 'npm test -- --testPathPattern="__tests__/unit" --coverage',
    description: 'Run unit tests with coverage'
  },
  integration: {
    name: 'Integration Tests',
    command: 'npm test -- --testPathPattern="__tests__/integration"',
    description: 'Run API integration tests'
  },
  stress: {
    name: 'Stress Tests',
    command: 'npm test -- --testPathPattern="__tests__/stress" --testTimeout=60000',
    description: 'Run stress and performance tests'
  },
  e2e: {
    name: 'E2E Tests',
    command: 'npx playwright test',
    description: 'Run end-to-end tests with Playwright'
  },
  all: {
    name: 'All Tests',
    command: 'npm test -- --coverage',
    description: 'Run all tests with coverage'
  }
};

// =============================================================================
// MAIN
// =============================================================================

function main() {
  const args = process.argv.slice(2);
  const suite = args[0] || 'all';
  
  log('\n' + '═'.repeat(60), 'blue');
  log('RTR-MRP TEST SUITE RUNNER', 'blue');
  log('═'.repeat(60), 'blue');
  
  createOutputDir();
  
  if (suite === 'help' || suite === '-h' || suite === '--help') {
    log('\nAvailable test suites:', 'yellow');
    Object.entries(testSuites).forEach(([key, value]) => {
      log(`  ${key.padEnd(15)} - ${value.name}`, 'cyan');
    });
    log('\nUsage: node run-tests.js [suite]', 'yellow');
    log('Example: node run-tests.js unit', 'yellow');
    return;
  }
  
  if (!testSuites[suite]) {
    log(`Unknown test suite: ${suite}`, 'red');
    log('Run with --help to see available suites', 'yellow');
    process.exit(1);
  }
  
  const testConfig = testSuites[suite];
  log(`\nRunning ${testConfig.name}...`, 'blue');
  
  const startTime = Date.now();
  const success = runCommand(testConfig.command, testConfig.description);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  log('\n' + '═'.repeat(60), 'blue');
  if (success) {
    log(`✓ ${testConfig.name} completed successfully in ${duration}s`, 'green');
  } else {
    log(`✗ ${testConfig.name} failed after ${duration}s`, 'red');
    process.exit(1);
  }
  log('═'.repeat(60) + '\n', 'blue');
}

main();
