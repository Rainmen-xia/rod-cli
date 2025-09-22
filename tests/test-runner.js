#!/usr/bin/env node

/**
 * Test Runner Script
 *
 * Provides convenient commands to run different types of tests
 */

const { execSync } = require('child_process');
const path = require('path');

const commands = {
  unit: 'jest --selectProjects unit',
  integration: 'jest --selectProjects integration',
  e2e: 'jest --selectProjects e2e',
  all: 'jest',
  coverage: 'jest --coverage',
  watch: 'jest --watch',
  'watch:unit': 'jest --selectProjects unit --watch',
  'watch:integration': 'jest --selectProjects integration --watch'
};

function showHelp() {
  console.log(`
ROD CLI Test Runner

Usage: node scripts/test-runner.js <command>

Available commands:
  unit                Run unit tests only
  integration         Run integration tests only
  e2e                 Run end-to-end tests only
  all                 Run all tests
  coverage            Run tests with coverage report
  watch               Run tests in watch mode
  watch:unit          Run unit tests in watch mode
  watch:integration   Run integration tests in watch mode
  help                Show this help message

Examples:
  node scripts/test-runner.js unit
  node scripts/test-runner.js coverage
  node scripts/test-runner.js watch:unit

Test Types:
  - Unit Tests:        Fast, isolated component tests with mocks
  - Integration Tests: Test component interactions and use cases
  - E2E Tests:         Full CLI workflow tests (slower)
`);
}

function runCommand(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    execSync(cmd, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  } catch (error) {
    console.error(`Command failed with exit code ${error.status}`);
    process.exit(error.status || 1);
  }
}

// Parse command line arguments
const command = process.argv[2];

if (!command || command === 'help' || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

if (!commands[command]) {
  console.error(`Unknown command: ${command}`);
  console.error(`Run 'node scripts/test-runner.js help' for available commands.`);
  process.exit(1);
}

runCommand(commands[command]);