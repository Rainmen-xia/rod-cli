/**
 * Init Command Implementation
 * 
 * Handles project initialization with template download and setup
 */

import chalk from 'chalk';
import path from 'path';
import { InitCommandArgs } from '../contracts/cli-interface';
import { CLIConfig, AIAssistant, ScriptType, WorkflowMode } from '../types/cli-config';
import { ConfigManager } from '../lib/config-manager';
import { LocalTemplateGenerator, TemplateGenerationConfig } from '../lib/local-template-generator';
import { ToolChecker } from '../lib/tool-checker';

export class InitCommand {
  private configManager: ConfigManager;
  private templateGenerator: LocalTemplateGenerator;
  private toolChecker: ToolChecker;

  constructor() {
    this.configManager = new ConfigManager();
    this.templateGenerator = new LocalTemplateGenerator();
    this.toolChecker = new ToolChecker();
  }

  /**
   * Execute init command
   */
  async execute(args: InitCommandArgs): Promise<void> {
    try {
      console.log(chalk.blue('🚀 Initializing Spec Kit project...\n'));

      // Step 1: Validate arguments and create configuration
      const config = await this.createConfiguration(args);
      
      if (config.debug) {
        console.log(chalk.gray('Debug: Configuration created:'));
        console.log(chalk.gray(JSON.stringify(config, null, 2)));
        console.log();
      }

      // Step 2: Perform system checks (if not ignored)
      if (!config.ignoreAgentTools) {
        await this.performSystemChecks(config);
      }

      // Step 3: Generate template locally
      console.log(chalk.blue('📦 Generating project template...'));
      const templateConfig: TemplateGenerationConfig = {
        aiAssistant: config.aiAssistant,
        scriptType: config.scriptType,
        workflowMode: config.workflowMode,
        projectPath: config.projectPath,
        projectName: config.projectName
      };

      const result = await this.templateGenerator.generateTemplate(templateConfig);

      // Step 4: Display results
      if (result.success) {
        console.log(chalk.green('✅ Template generated successfully'));
        if (config.debug) {
          console.log(chalk.gray(`Debug: Generated ${result.totalFiles} files (${(result.totalSize / 1024).toFixed(1)} KB)`));
          console.log(chalk.gray('Debug: Files created:'));
          result.filesCreated.forEach(file => {
            console.log(chalk.gray(`  - ${path.relative(config.projectPath, file)}`));
          });
        }
      } else {
        throw new Error(`Template generation failed: ${result.errors.join(', ')}`);
      }

      // Show warnings if any
      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        result.warnings.forEach(warning => {
          console.log(chalk.yellow(`   ${warning}`));
        });
      }

      // Step 6: Add to recent projects
      if (result.success) {
        await this.configManager.addToRecent(config.projectPath);
        
        console.log(chalk.green('\n✨ Project initialized successfully!'));
        console.log(chalk.gray(`\nNext steps:`));
        console.log(chalk.gray(`  cd ${config.projectName || '.'}`));
        console.log(chalk.gray(`  # Start using your ${config.aiAssistant} assistant!`));
      } else {
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('\n❌ Initialization failed:'));
      console.error(chalk.red((error as Error).message));
      
      if (args.debug) {
        console.error(chalk.gray('\nDebug: Full error:'));
        console.error(error);
      }
      
      process.exit(1);
    }
  }

  /**
   * Create configuration from command line arguments
   */
  private async createConfiguration(args: InitCommandArgs): Promise<CLIConfig> {
    // Determine project name - use current directory name if --here is used
    const projectName = args.projectName || (args.here ? path.basename(process.cwd()) : undefined);
    
    // Convert command line args to config
    const configArgs = {
      projectName,
      ai: args.ai,
      script: args.script,
      workflow: args.workflow,
      projectPath: this.resolveProjectPath(projectName, args.here),
      noGit: args.noGit,
      skipTls: args.skipTls,
      ignoreAgentTools: args.ignoreAgentTools,
      debug: args.debug
    };

    const config = await this.configManager.createFromArgs(configArgs);

    // Validate configuration
    const validation = this.configManager.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      console.log(chalk.yellow('⚠️  Warnings:'));
      validation.warnings.forEach(warning => {
        console.log(chalk.yellow(`   ${warning}`));
      });
      console.log();
    }

    return config;
  }

  /**
   * Perform system checks
   */
  private async performSystemChecks(config: CLIConfig): Promise<void> {
    console.log(chalk.blue('🔍 Checking system requirements...'));
    
    const systemCheck = await this.toolChecker.performSystemCheck(config.aiAssistant);
    
    if (systemCheck.overallStatus === 'fail') {
      console.log(chalk.red('\n❌ System check failed:'));
      console.log(chalk.red('Missing critical tools:\n'));
      
      systemCheck.tools
        .filter(tool => !tool.available && tool.priority === 'critical')
        .forEach(tool => {
          console.log(chalk.red(`  ❌ ${tool.toolName}: ${tool.installHint}`));
        });
        
      console.log(chalk.red('\nPlease install the required tools and try again.'));
      console.log(chalk.gray('Or use --ignore-agent-tools to skip this check.'));
      process.exit(1);
    }

    if (systemCheck.overallStatus === 'warning') {
      console.log(chalk.yellow('\n⚠️  System check warnings:'));
      
      systemCheck.tools
        .filter(tool => !tool.available && tool.priority === 'important')
        .forEach(tool => {
          console.log(chalk.yellow(`  ⚠️  ${tool.toolName}: ${tool.installHint}`));
        });
        
      console.log(chalk.gray('\nSome features may not work optimally.\n'));
    } else {
      console.log(chalk.green('✅ System check passed\n'));
    }
  }


  /**
   * Resolve project path from arguments
   */
  private resolveProjectPath(projectName?: string, isCurrentDir?: boolean): string {
    return this.configManager.resolveProjectPath(projectName, isCurrentDir);
  }

  /**
   * Suggest AI assistant based on environment
   */
  async suggestAIAssistant(): Promise<{ ai: AIAssistant; reason: string }[]> {
    return this.configManager.getAISuggestions();
  }

  /**
   * Show interactive setup (for future enhancement)
   */
  async interactiveSetup(): Promise<InitCommandArgs> {
    // For now, just return sensible defaults
    // In the future, this could use inquirer.js for interactive prompts
    
    const suggestions = await this.suggestAIAssistant();
    const scriptType = this.configManager.autoDetectScriptType();
    
    return {
      ai: suggestions[0]?.ai || AIAssistant.CLAUDE,
      script: scriptType,
      here: false,
      noGit: false,
      skipTls: false,
      ignoreAgentTools: false,
      debug: false
    };
  }
}

// Utility functions for CLI integration
export async function executeInitCommand(args: InitCommandArgs): Promise<void> {
  const command = new InitCommand();
  await command.execute(args);
}

export async function validateInitArgs(args: InitCommandArgs): Promise<string[]> {
  const errors: string[] = [];

  // Validate AI assistant
  if (args.ai && !Object.values(AIAssistant).includes(args.ai as AIAssistant)) {
    errors.push(`Invalid AI assistant: ${args.ai}. Valid options: ${Object.values(AIAssistant).join(', ')}`);
  }

  // Validate script type
  if (args.script && !Object.values(ScriptType).includes(args.script as ScriptType)) {
    errors.push(`Invalid script type: ${args.script}. Valid options: ${Object.values(ScriptType).join(', ')}`);
  }

  // Validate workflow mode
  if (args.workflow && !Object.values(WorkflowMode).includes(args.workflow as WorkflowMode)) {
    errors.push(`Invalid workflow mode: ${args.workflow}. Valid options: ${Object.values(WorkflowMode).join(', ')}`);
  }

  // Validate project name (if not using current directory)
  if (!args.here && (!args.projectName || args.projectName.trim().length === 0)) {
    errors.push('Project name is required when not using --here flag');
  }

  // Check for conflicting flags
  if (args.here && args.projectName) {
    errors.push('Cannot specify project name when using --here flag');
  }

  return errors;
}

export function getInitCommandHelp(): string {
  return `
Initialize a new Spec Kit project

Usage:
  rod init [project-name] [options]
  rod init --here [options]

Options:
  --ai <assistant>          AI assistant to use (claude, copilot, gemini, cursor, codebuddy)
  --script <type>           Script type (sh, ps)
  --workflow <mode>         Workflow mode (legacy, roadmap) [default: roadmap]
  --here                    Initialize in current directory
  --no-git                  Skip git repository initialization
  --skip-tls                Skip SSL/TLS verification (not recommended)
  --ignore-agent-tools      Skip AI agent tool checks
  --debug                   Show verbose output

Examples:
  rod init my-project --ai claude
  rod init --here --ai copilot --script ps --workflow legacy
  rod init my-app --ai gemini --workflow roadmap
`;
}