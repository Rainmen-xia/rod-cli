/**
 * System Types
 * 
 * Defines interfaces for system information and tool checking
 */

import { AIAssistant } from './cli-config';

// Tool Check Result Interface
export interface ToolCheckResult {
  toolName: string;              // Tool name
  available: boolean;            // Whether tool is available
  version?: string;              // Version information (if obtainable)
  path?: string;                 // Path to executable
  error?: string;                // Error message if check failed
  installHint: string;           // Installation hint/command
  required: boolean;             // Whether tool is required
  priority: ToolPriority;        // Priority level
}

export enum ToolPriority {
  CRITICAL = 'critical',        // Required for basic functionality
  IMPORTANT = 'important',      // Required for full functionality
  OPTIONAL = 'optional',        // Nice to have
  AI_SPECIFIC = 'ai-specific'   // Required only for specific AI assistants
}

// System Check Interface
export interface SystemCheck {
  nodeVersion: string;           // Node.js version
  platform: string;             // Operating system platform
  tools: ToolCheckResult[];      // Tool check results
  overallStatus: CheckStatus;    // Overall system status
  summary: SystemCheckSummary;   // Summary of checks
  recommendations: string[];     // Recommended actions
}

export enum CheckStatus {
  PASS = 'pass',                // All required tools available
  WARNING = 'warning',          // Some optional tools missing
  FAIL = 'fail'                 // Critical tools missing
}

export interface SystemCheckSummary {
  totalTools: number;
  availableTools: number;
  missingCritical: number;
  missingImportant: number;
  missingOptional: number;
  platformSupported: boolean;
  nodeVersionSupported: boolean;
}

// System Information Interface
export interface SystemInfo {
  platform: string;             // OS platform (darwin, linux, win32)
  arch: string;                 // Architecture (x64, arm64, etc.)
  nodeVersion: string;          // Node.js version
  npmVersion: string;           // npm version
  gitVersion?: string;          // Git version (if available)
  homeDirectory: string;        // User home directory
  currentDirectory: string;     // Current working directory
  environment: EnvironmentInfo; // Environment details
  capabilities: SystemCapabilities; // System capabilities
}

export interface EnvironmentInfo {
  shell?: string;               // Current shell
  terminal?: string;            // Terminal emulator
  ci: boolean;                  // Running in CI environment
  container: boolean;           // Running in container
  wsl: boolean;                 // Running in WSL (Windows only)
  pathSeparator: string;        // Path separator for platform
  tempDirectory: string;        // Temporary directory
}

export interface SystemCapabilities {
  hasGit: boolean;
  hasDocker: boolean;
  hasSSH: boolean;
  canExecuteScripts: boolean;
  supportsSymlinks: boolean;
  supportsUnixPermissions: boolean;
}

// Tool Configuration
export interface ToolDefinition {
  name: string;
  displayName: string;
  command: string;              // Command to check if tool exists
  versionCommand?: string;      // Command to get version
  versionRegex?: string;        // Regex to extract version from output
  required: boolean;
  priority: ToolPriority;
  platforms: string[];          // Supported platforms
  aiAssistants?: AIAssistant[]; // AI assistants that require this tool
  installInstructions: PlatformInstructions;
}

export interface PlatformInstructions {
  darwin?: string;              // macOS install instructions
  linux?: string;               // Linux install instructions
  win32?: string;               // Windows install instructions
  default?: string;             // Default/universal instructions
}

// Tool Registry
export class ToolRegistry {
  private static tools: ToolDefinition[] = [
    {
      name: 'node',
      displayName: 'Node.js',
      command: 'node',
      versionCommand: 'node --version',
      versionRegex: 'v(\\d+\\.\\d+\\.\\d+)',
      required: true,
      priority: ToolPriority.CRITICAL,
      platforms: ['darwin', 'linux', 'win32'],
      installInstructions: {
        darwin: 'brew install node',
        linux: 'curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs',
        win32: 'Download from https://nodejs.org/',
        default: 'Visit https://nodejs.org/ to download and install'
      }
    },
    {
      name: 'npm',
      displayName: 'npm',
      command: 'npm',
      versionCommand: 'npm --version',
      versionRegex: '(\\d+\\.\\d+\\.\\d+)',
      required: true,
      priority: ToolPriority.CRITICAL,
      platforms: ['darwin', 'linux', 'win32'],
      installInstructions: {
        default: 'npm is included with Node.js installation'
      }
    },
    {
      name: 'git',
      displayName: 'Git',
      command: 'git',
      versionCommand: 'git --version',
      versionRegex: 'git version (\\d+\\.\\d+\\.\\d+)',
      required: true,
      priority: ToolPriority.IMPORTANT,
      platforms: ['darwin', 'linux', 'win32'],
      installInstructions: {
        darwin: 'brew install git',
        linux: 'sudo apt-get install git',
        win32: 'Download from https://git-scm.com/',
        default: 'Visit https://git-scm.com/ to download and install'
      }
    },
    {
      name: 'claude-cli',
      displayName: 'Claude Code CLI',
      command: 'claude',
      versionCommand: 'claude --version',
      required: false,
      priority: ToolPriority.AI_SPECIFIC,
      platforms: ['darwin', 'linux', 'win32'],
      aiAssistants: [AIAssistant.CLAUDE],
      installInstructions: {
        default: 'Visit https://claude.ai/code for installation instructions'
      }
    },
    {
      name: 'gh',
      displayName: 'GitHub CLI',
      command: 'gh',
      versionCommand: 'gh --version',
      versionRegex: 'gh version (\\d+\\.\\d+\\.\\d+)',
      required: false,
      priority: ToolPriority.AI_SPECIFIC,
      platforms: ['darwin', 'linux', 'win32'],
      aiAssistants: [AIAssistant.COPILOT],
      installInstructions: {
        darwin: 'brew install gh',
        linux: 'sudo apt install gh',
        win32: 'Download from https://cli.github.com/',
        default: 'Visit https://cli.github.com/ for installation instructions'
      }
    }
  ];

  static getAllTools(): ToolDefinition[] {
    return [...this.tools];
  }

  static getRequiredTools(): ToolDefinition[] {
    return this.tools.filter(tool => tool.required);
  }

  static getToolsForAI(aiAssistant: AIAssistant): ToolDefinition[] {
    return this.tools.filter(tool => 
      tool.required || 
      (tool.aiAssistants && tool.aiAssistants.includes(aiAssistant))
    );
  }

  static getToolsForPlatform(platform: string): ToolDefinition[] {
    return this.tools.filter(tool => tool.platforms.includes(platform));
  }

  static getTool(name: string): ToolDefinition | undefined {
    return this.tools.find(tool => tool.name === name);
  }

  static addTool(tool: ToolDefinition): void {
    const existingIndex = this.tools.findIndex(t => t.name === tool.name);
    if (existingIndex >= 0) {
      this.tools[existingIndex] = tool;
    } else {
      this.tools.push(tool);
    }
  }
}

// System Check Utilities
export class SystemCheckUtils {
  /**
   * Determine overall system status from tool check results
   */
  static determineOverallStatus(tools: ToolCheckResult[]): CheckStatus {
    const criticalMissing = tools.some(tool => 
      tool.priority === ToolPriority.CRITICAL && !tool.available
    );
    
    if (criticalMissing) {
      return CheckStatus.FAIL;
    }

    const importantMissing = tools.some(tool => 
      tool.priority === ToolPriority.IMPORTANT && !tool.available
    );

    if (importantMissing) {
      return CheckStatus.WARNING;
    }

    return CheckStatus.PASS;
  }

  /**
   * Generate summary from tool check results
   */
  static createSummary(tools: ToolCheckResult[], systemInfo: SystemInfo): SystemCheckSummary {
    const availableTools = tools.filter(tool => tool.available).length;
    const missingCritical = tools.filter(tool => 
      tool.priority === ToolPriority.CRITICAL && !tool.available
    ).length;
    const missingImportant = tools.filter(tool => 
      tool.priority === ToolPriority.IMPORTANT && !tool.available
    ).length;
    const missingOptional = tools.filter(tool => 
      tool.priority === ToolPriority.OPTIONAL && !tool.available
    ).length;

    return {
      totalTools: tools.length,
      availableTools,
      missingCritical,
      missingImportant,
      missingOptional,
      platformSupported: this.isPlatformSupported(systemInfo.platform),
      nodeVersionSupported: this.isNodeVersionSupported(systemInfo.nodeVersion)
    };
  }

  /**
   * Generate recommendations based on check results
   */
  static generateRecommendations(
    tools: ToolCheckResult[], 
    systemInfo: SystemInfo,
    aiAssistant?: AIAssistant
  ): string[] {
    const recommendations: string[] = [];

    // Critical tools
    const missingCritical = tools.filter(tool => 
      tool.priority === ToolPriority.CRITICAL && !tool.available
    );
    
    if (missingCritical.length > 0) {
      recommendations.push('Install missing critical tools before proceeding:');
      missingCritical.forEach(tool => {
        const instruction = this.getInstallInstruction(tool, systemInfo.platform);
        recommendations.push(`  • ${tool.toolName}: ${instruction}`);
      });
    }

    // Important tools
    const missingImportant = tools.filter(tool => 
      tool.priority === ToolPriority.IMPORTANT && !tool.available
    );
    
    if (missingImportant.length > 0) {
      recommendations.push('Consider installing these important tools:');
      missingImportant.forEach(tool => {
        const instruction = this.getInstallInstruction(tool, systemInfo.platform);
        recommendations.push(`  • ${tool.toolName}: ${instruction}`);
      });
    }

    // AI-specific tools
    if (aiAssistant) {
      const missingAITools = tools.filter(tool => 
        tool.priority === ToolPriority.AI_SPECIFIC && 
        !tool.available &&
        ToolRegistry.getTool(tool.toolName)?.aiAssistants?.includes(aiAssistant)
      );

      if (missingAITools.length > 0) {
        recommendations.push(`For ${aiAssistant} integration, install:`);
        missingAITools.forEach(tool => {
          const instruction = this.getInstallInstruction(tool, systemInfo.platform);
          recommendations.push(`  • ${tool.toolName}: ${instruction}`);
        });
      }
    }

    // Node.js version check
    if (!this.isNodeVersionSupported(systemInfo.nodeVersion)) {
      recommendations.push(`Upgrade Node.js to version 18.0.0 or higher (current: ${systemInfo.nodeVersion})`);
    }

    // Platform-specific recommendations
    if (systemInfo.platform === 'win32') {
      recommendations.push('Consider using Windows Subsystem for Linux (WSL) for better compatibility');
    }

    return recommendations;
  }

  private static getInstallInstruction(tool: ToolCheckResult, platform: string): string {
    const toolDef = ToolRegistry.getTool(tool.toolName);
    if (!toolDef) return tool.installHint;

    const instructions = toolDef.installInstructions;
    return instructions[platform as keyof PlatformInstructions] || 
           instructions.default || 
           tool.installHint;
  }

  private static isPlatformSupported(platform: string): boolean {
    return ['darwin', 'linux', 'win32'].includes(platform);
  }

  private static isNodeVersionSupported(version: string): boolean {
    const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
    return majorVersion >= 18;
  }

  /**
   * Format system check results for display
   */
  static formatResults(systemCheck: SystemCheck): string {
    const lines: string[] = [];
    
    lines.push('System Check Results:');
    lines.push(`Node.js: ${systemCheck.nodeVersion}`);
    lines.push(`Platform: ${systemCheck.platform}`);
    lines.push('');

    // Group tools by status
    const available = systemCheck.tools.filter(t => t.available);
    const missing = systemCheck.tools.filter(t => !t.available);

    if (available.length > 0) {
      lines.push('✅ Available Tools:');
      available.forEach(tool => {
        const versionInfo = tool.version ? ` (${tool.version})` : '';
        lines.push(`   ${tool.toolName}${versionInfo}`);
      });
      lines.push('');
    }

    if (missing.length > 0) {
      lines.push('❌ Missing Tools:');
      missing.forEach(tool => {
        const priority = tool.priority === ToolPriority.CRITICAL ? ' [CRITICAL]' : 
                        tool.priority === ToolPriority.IMPORTANT ? ' [IMPORTANT]' : '';
        lines.push(`   ${tool.toolName}${priority}`);
      });
      lines.push('');
    }

    if (systemCheck.recommendations.length > 0) {
      lines.push('Recommendations:');
      systemCheck.recommendations.forEach(rec => lines.push(`• ${rec}`));
    }

    return lines.join('\n');
  }
}