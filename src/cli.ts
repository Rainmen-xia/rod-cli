#!/usr/bin/env node

/**
 * Main CLI Entry Point
 *
 * ROD CLI - Rule-Oriented Development toolkit for specification-driven development
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { executeCheckCommand, getCheckCommandHelp } from './commands/check';
import {
  executeInitCommand,
  getInitCommandHelp,
  validateInitArgs,
} from './commands/init';
import { executeStartServerCommand } from './commands/start-server';
import { ExitCode } from './contracts/cli-interface';
import { AIAssistant } from './types/cli-config';

// Package information
import packageInfo from '../package.json';

// Create main program
const program = new Command();

program
  .name('rod')
  .description('ROD CLI - Rule-Oriented Development toolkit')
  .version(packageInfo.version, '-v, --version', 'Show version number')
  .helpOption('-h, --help', 'Show help information');

// Global error handler
process.on('uncaughtException', error => {
  console.error(chalk.red('Uncaught Exception:'), error.message);
  if (process.env.DEBUG || process.argv.includes('--debug')) {
    console.error(error.stack);
  }
  process.exit(ExitCode.GENERAL_ERROR);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection:'), reason);
  if (process.env.DEBUG || process.argv.includes('--debug')) {
    console.error('Promise:', promise);
  }
  process.exit(ExitCode.GENERAL_ERROR);
});

// Init command
program
  .command('init')
  .description(
    'Initialize a new ROD project with rule-oriented development structure'
  )
  .argument('[project-name]', 'Name for your new project directory')
  .option('--ai <assistant>', 'AI assistant to use', validateAIAssistant)
  .option('--template <name>', 'Template name to use (for internal templates)')
  .option('--no-git', 'Skip git repository initialization', false)
  .option('--skip-tls', 'Skip SSL/TLS verification', false)
  .option('--ignore-agent-tools', 'Skip checks for AI agent tools', false)
  .option('--debug', 'Show verbose diagnostic output', false)
  .action(async (projectName, options) => {
    try {
      // Build args from command line
      const args = {
        projectName,
        ai: options.ai as AIAssistant,
        script: undefined, // Always auto-detect
        template: options.template,
        here: !projectName, // If no project name, use current directory
        noGit: !options.git, // Commander negates no-git to git
        skipTls: options.skipTls,
        ignoreAgentTools: options.ignoreAgentTools,
        debug: options.debug,
      };

      // Validate arguments
      const validationErrors = await validateInitArgs(args);
      if (validationErrors.length > 0) {
        console.error(chalk.red('Invalid arguments:'));
        validationErrors.forEach(error => {
          console.error(chalk.red(`  • ${error}`));
        });
        console.error(chalk.gray('\nUse --help for usage information'));
        process.exit(ExitCode.INVALID_ARGS);
      }

      // Execute command
      await executeInitCommand(args);
    } catch (error) {
      const err = error as Error;

      if (
        err.message.includes('ENOTFOUND') ||
        err.message.includes('network')
      ) {
        console.error(
          chalk.red('Network error: Please check your internet connection')
        );
        process.exit(ExitCode.NETWORK_ERROR);
      } else if (
        err.message.includes('EACCES') ||
        err.message.includes('permission')
      ) {
        console.error(chalk.red('Permission error: Check file permissions'));
        process.exit(ExitCode.FILE_ERROR);
      } else {
        console.error(chalk.red('Command failed:'), err.message);
        if (options.debug) {
          console.error(chalk.gray('\nFull error:'));
          console.error(err.stack);
        }
        process.exit(ExitCode.GENERAL_ERROR);
      }
    }
  });

// Check command
program
  .command('check')
  .description('Check that all required tools are installed')
  .option('-v, --verbose', 'Show detailed output', false)
  .action(async options => {
    try {
      const args = {
        verbose: options.verbose,
      };

      await executeCheckCommand(args);
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('Check command failed:'), err.message);
      if (options.verbose) {
        console.error(chalk.gray('\nFull error:'));
        console.error(err.stack);
      }
      process.exit(ExitCode.GENERAL_ERROR);
    }
  });

// Start server command
program
  .command('start-server')
  .description('Start the AI agent server')
  .option('-p, --port <port>', 'Port number for the server', '3000')
  .action(async options => {
    try {
      executeStartServerCommand({
        port: parseInt(options.port, 10),
      });
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red('Start server command failed:'), err.message);
      process.exit(ExitCode.GENERAL_ERROR);
    }
  });

// Add custom help for commands
program.commands.forEach(cmd => {
  if (cmd.name() === 'init') {
    cmd.addHelpText('afterAll', getInitCommandHelp());
  } else if (cmd.name() === 'check') {
    cmd.addHelpText('afterAll', getCheckCommandHelp());
  }
});

// Enhanced help display
program.addHelpText(
  'beforeAll',
  chalk.blue(`
╔═══════════════════════════════════════╗
║             ROD CLI                   ║
║    Rule-Oriented Development          ║
╚═══════════════════════════════════════╝
`)
);

program.addHelpText(
  'after',
  `
Examples:
  ${chalk.gray('# Initialize a new ROD project')}
  ${chalk.cyan('rod init my-project --ai claude')}
  
  ${chalk.gray('# Initialize in current directory')}
  ${chalk.cyan('rod init --ai copilot')}
  
  ${chalk.gray('# Check system requirements')}
  ${chalk.cyan('rod check --verbose')}
  
  ${chalk.gray('# Start AI agent server')}
  ${chalk.cyan('rod start-server --port 3000')}

For more information, visit: ${chalk.blue('https://github.com/Rainmen-xia/rod-cli.git')}
`
);

// Validation functions
function validateAIAssistant(value: string): AIAssistant {
  const validValues = Object.values(AIAssistant);
  if (!validValues.includes(value as AIAssistant)) {
    throw new Error(
      `Invalid AI assistant '${value}'. Valid options: ${validValues.join(', ')}`
    );
  }
  return value as AIAssistant;
}

// function validateScriptType(value: string): ScriptType {
//   const validValues = Object.values(ScriptType);
//   if (!validValues.includes(value as ScriptType)) {
//     throw new Error(
//       `Invalid script type '${value}'. Valid options: ${validValues.join(', ')}`
//     );
//   }
//   return value as ScriptType;
// }

// Handle no command provided
if (process.argv.length <= 2) {
  program.help();
}

// Parse command line arguments
program.parse(process.argv);

// If no valid command was found, show help
const validCommands = program.commands.map(cmd => cmd.name());
const providedCommand = process.argv[2];

if (
  providedCommand &&
  !validCommands.includes(providedCommand) &&
  !providedCommand.startsWith('-')
) {
  console.error(chalk.red(`Unknown command: ${providedCommand}`));
  console.error(chalk.gray('Use --help to see available commands'));
  process.exit(ExitCode.INVALID_ARGS);
}
