/**
 * Check Command Implementation
 * 
 * Handles system requirements and tool availability checking
 */

import chalk from 'chalk';
import { CheckCommandArgs } from '../contracts/cli-interface';
import { ToolChecker } from '../lib/tool-checker';
import { SystemCheckUtils } from '../types/system';
import { AIAssistant } from '../types/cli-config';

export class CheckCommand {
  private toolChecker: ToolChecker;

  constructor() {
    this.toolChecker = new ToolChecker();
  }

  /**
   * Execute check command
   */
  async execute(args: CheckCommandArgs): Promise<void> {
    try {
      console.log(chalk.blue('🔍 Checking system requirements...\n'));

      // Get system information
      const systemInfo = await this.toolChecker.getSystemInfo();
      
      // Perform comprehensive system check
      const systemCheck = await this.toolChecker.performSystemCheck();

      // Display system information
      this.displaySystemInfo(systemInfo, args.verbose);

      // Display tool check results
      this.displayToolResults(systemCheck, args.verbose);

      // Display overall status
      this.displayOverallStatus(systemCheck);

      // Display recommendations
      if (systemCheck.recommendations.length > 0) {
        this.displayRecommendations(systemCheck.recommendations);
      }

      // Exit with appropriate code
      if (systemCheck.overallStatus === 'fail') {
        process.exit(5); // TOOL_MISSING exit code
      } else if (systemCheck.overallStatus === 'warning') {
        process.exit(0); // Success but with warnings
      } else {
        process.exit(0); // Success
      }

    } catch (error) {
      console.error(chalk.red('❌ System check failed:'));
      console.error(chalk.red((error as Error).message));
      
      if (args.verbose) {
        console.error(chalk.gray('\nFull error:'));
        console.error(error);
      }
      
      process.exit(1);
    }
  }

  /**
   * Check specific AI assistant requirements
   */
  async checkAIAssistant(aiAssistant: AIAssistant, verbose?: boolean): Promise<void> {
    console.log(chalk.blue(`🔍 Checking requirements for ${aiAssistant}...\n`));

    const systemCheck = await this.toolChecker.performSystemCheck(aiAssistant);

    // Filter tools relevant to this AI assistant
    const relevantTools = systemCheck.tools.filter(tool => 
      tool.required || 
      (tool.priority === 'ai-specific' && 
       systemCheck.tools.find(t => t.toolName === tool.toolName))
    );

    this.displayToolResults({ ...systemCheck, tools: relevantTools }, verbose);
    this.displayOverallStatus(systemCheck);

    if (systemCheck.recommendations.length > 0) {
      this.displayRecommendations(systemCheck.recommendations);
    }
  }

  /**
   * Display system information
   */
  private displaySystemInfo(systemInfo: any, verbose?: boolean): void {
    console.log(chalk.bold('System Information:'));
    console.log(`  ${chalk.cyan('Platform:')} ${systemInfo.platform} (${systemInfo.arch})`);
    console.log(`  ${chalk.cyan('Node.js:')} ${systemInfo.nodeVersion}`);
    console.log(`  ${chalk.cyan('npm:')} ${systemInfo.npmVersion}`);
    
    if (systemInfo.gitVersion) {
      console.log(`  ${chalk.cyan('Git:')} ${systemInfo.gitVersion}`);
    }

    if (verbose && systemInfo.environment) {
      console.log(`  ${chalk.cyan('Shell:')} ${systemInfo.environment.shell || 'unknown'}`);
      console.log(`  ${chalk.cyan('Terminal:')} ${systemInfo.environment.terminal || 'unknown'}`);
      console.log(`  ${chalk.cyan('CI Environment:')} ${systemInfo.environment.ci ? 'Yes' : 'No'}`);
      console.log(`  ${chalk.cyan('Container:')} ${systemInfo.environment.container ? 'Yes' : 'No'}`);
      
      if (systemInfo.environment.wsl) {
        console.log(`  ${chalk.cyan('WSL:')} Yes`);
      }
    }
    
    console.log();
  }

  /**
   * Display tool check results
   */
  private displayToolResults(systemCheck: any, verbose?: boolean): void {
    console.log(chalk.bold('Tool Availability:'));

    // Group tools by availability
    const availableTools = systemCheck.tools.filter((tool: any) => tool.available);
    const missingTools = systemCheck.tools.filter((tool: any) => !tool.available);

    // Display available tools
    if (availableTools.length > 0) {
      console.log(chalk.green('\n  ✅ Available:'));
      availableTools.forEach((tool: any) => {
        const version = tool.version ? chalk.gray(` (${tool.version})`) : '';
        const path = verbose && tool.path ? chalk.gray(` - ${tool.path}`) : '';
        console.log(`    ${tool.toolName}${version}${path}`);
      });
    }

    // Display missing tools
    if (missingTools.length > 0) {
      console.log(chalk.red('\n  ❌ Missing:'));
      missingTools.forEach((tool: any) => {
        const priority = this.formatPriority(tool.priority);
        const hint = verbose ? chalk.gray(` - ${tool.installHint}`) : '';
        console.log(`    ${tool.toolName}${priority}${hint}`);
      });
    }

    console.log();
  }

  /**
   * Display overall system status
   */
  private displayOverallStatus(systemCheck: any): void {
    console.log(chalk.bold('Overall Status:'));
    
    switch (systemCheck.overallStatus) {
      case 'pass':
        console.log(chalk.green('  ✅ All required tools are available'));
        break;
      case 'warning':
        console.log(chalk.yellow('  ⚠️  Some recommended tools are missing'));
        console.log(chalk.gray('     Basic functionality will work, but some features may be limited'));
        break;
      case 'fail':
        console.log(chalk.red('  ❌ Critical tools are missing'));
        console.log(chalk.gray('     Please install required tools before proceeding'));
        break;
    }

    // Display summary statistics
    if (systemCheck.summary) {
      const { availableTools, totalTools, missingCritical, missingImportant } = systemCheck.summary;
      console.log(chalk.gray(`     ${availableTools}/${totalTools} tools available`));
      
      if (missingCritical > 0) {
        console.log(chalk.red(`     ${missingCritical} critical tools missing`));
      }
      
      if (missingImportant > 0) {
        console.log(chalk.yellow(`     ${missingImportant} important tools missing`));
      }
    }

    console.log();
  }

  /**
   * Display recommendations
   */
  private displayRecommendations(recommendations: string[]): void {
    console.log(chalk.bold('Recommendations:'));
    recommendations.forEach(rec => {
      console.log(`  ${chalk.cyan('•')} ${rec}`);
    });
    console.log();
  }

  /**
   * Format tool priority for display
   */
  private formatPriority(priority: string): string {
    switch (priority) {
      case 'critical':
        return chalk.red(' [CRITICAL]');
      case 'important':
        return chalk.yellow(' [IMPORTANT]');
      case 'ai-specific':
        return chalk.blue(' [AI-SPECIFIC]');
      default:
        return '';
    }
  }

  /**
   * Display quick status summary
   */
  async quickCheck(): Promise<boolean> {
    const isReady = await this.toolChecker.checkMinimumRequirements();
    
    if (isReady) {
      console.log(chalk.green('✅ System is ready for Spec Kit'));
    } else {
      console.log(chalk.red('❌ System requirements not met'));
    }
    
    return isReady;
  }
}

// Utility functions for CLI integration
export async function executeCheckCommand(args: CheckCommandArgs): Promise<void> {
  const command = new CheckCommand();
  await command.execute(args);
}

export async function quickSystemCheck(): Promise<boolean> {
  const command = new CheckCommand();
  return command.quickCheck();
}

export async function checkAIAssistantRequirements(
  aiAssistant: AIAssistant, 
  verbose?: boolean
): Promise<void> {
  const command = new CheckCommand();
  await command.checkAIAssistant(aiAssistant, verbose);
}

export function getCheckCommandHelp(): string {
  return `
Check system requirements and tool availability

Usage:
  spec-kit check [options]

Options:
  --verbose, -v         Show detailed information including paths and install hints

Examples:
  spec-kit check                    # Basic system check
  spec-kit check --verbose         # Detailed system check

Exit Codes:
  0    All requirements met (or warnings only)
  1    General error
  5    Critical tools missing
`;
}