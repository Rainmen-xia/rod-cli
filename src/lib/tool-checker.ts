/**
 * Tool Checker
 * 
 * Handles system tool detection and validation
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

import {
  ToolCheckResult,
  SystemCheck,
  SystemInfo,
  ToolDefinition,
  ToolRegistry,
  CheckStatus,
  EnvironmentInfo,
  SystemCapabilities,
  ToolPriority,
  SystemCheckUtils
} from '../types/system';

import { AIAssistant } from '../types/cli-config';

export class ToolChecker {
  private cache: Map<string, ToolCheckResult> = new Map();
  private cacheTimeout = 300000; // 5 minutes

  /**
   * Check if a tool is available in PATH
   */
  async checkTool(toolName: string): Promise<ToolCheckResult> {
    // Check cache first
    const cached = this.getCachedResult(toolName);
    if (cached) {
      return cached;
    }

    const toolDef = ToolRegistry.getTool(toolName);
    if (!toolDef) {
      const result: ToolCheckResult = {
        toolName,
        available: false,
        error: 'Tool definition not found',
        installHint: `No installation instructions available for ${toolName}`,
        required: false,
        priority: ToolPriority.OPTIONAL
      };
      this.setCachedResult(toolName, result);
      return result;
    }

    try {
      // Check if tool exists in PATH
      const toolPath = await this.findToolInPath(toolDef.command);
      
      if (!toolPath) {
        const result: ToolCheckResult = {
          toolName: toolDef.name,
          available: false,
          error: `${toolDef.command} not found in PATH`,
          installHint: this.getInstallHint(toolDef),
          required: toolDef.required,
          priority: toolDef.priority
        };
        this.setCachedResult(toolName, result);
        return result;
      }

      // Get version if available
      let version: string | undefined;
      if (toolDef.versionCommand) {
        try {
          const versionOutput = await this.execCommand(toolDef.versionCommand);
          version = this.extractVersion(versionOutput, toolDef.versionRegex);
        } catch (error) {
          // Version check failed, but tool exists
        }
      }

      const result: ToolCheckResult = {
        toolName: toolDef.name,
        available: true,
        version,
        path: toolPath,
        installHint: this.getInstallHint(toolDef),
        required: toolDef.required,
        priority: toolDef.priority
      };

      this.setCachedResult(toolName, result);
      return result;

    } catch (error) {
      const err = error as Error;
      const result: ToolCheckResult = {
        toolName: toolDef.name,
        available: false,
        error: err.message,
        installHint: this.getInstallHint(toolDef),
        required: toolDef.required,
        priority: toolDef.priority
      };
      this.setCachedResult(toolName, result);
      return result;
    }
  }

  /**
   * Check multiple tools at once
   */
  async checkTools(toolNames: string[]): Promise<ToolCheckResult[]> {
    const results = await Promise.all(
      toolNames.map(toolName => this.checkTool(toolName))
    );
    return results;
  }

  /**
   * Get detailed system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    const [nodeVersion, npmVersion, gitVersion] = await Promise.all([
      this.getNodeVersion(),
      this.getNpmVersion(),
      this.getGitVersion()
    ]);

    const environment = await this.getEnvironmentInfo();
    const capabilities = await this.getSystemCapabilities();

    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion,
      npmVersion,
      gitVersion,
      homeDirectory: os.homedir(),
      currentDirectory: process.cwd(),
      environment,
      capabilities
    };
  }

  /**
   * Perform comprehensive system check
   */
  async performSystemCheck(aiAssistant?: AIAssistant): Promise<SystemCheck> {
    const systemInfo = await this.getSystemInfo();
    
    // Get tools to check based on platform and AI assistant
    const platformTools = ToolRegistry.getToolsForPlatform(systemInfo.platform);
    const aiTools = aiAssistant ? ToolRegistry.getToolsForAI(aiAssistant) : [];
    
    // Combine and deduplicate tools
    const allTools = [...platformTools, ...aiTools];
    const uniqueTools = Array.from(new Map(allTools.map(tool => [tool.name, tool])).values());
    
    // Check all tools
    const toolResults = await this.checkTools(uniqueTools.map(tool => tool.name));
    
    // Determine overall status
    const overallStatus = SystemCheckUtils.determineOverallStatus(toolResults);
    
    // Generate summary
    const summary = SystemCheckUtils.createSummary(toolResults, systemInfo);
    
    // Generate recommendations
    const recommendations = SystemCheckUtils.generateRecommendations(
      toolResults, 
      systemInfo, 
      aiAssistant
    );

    return {
      nodeVersion: systemInfo.nodeVersion,
      platform: systemInfo.platform,
      tools: toolResults,
      overallStatus,
      summary,
      recommendations
    };
  }

  /**
   * Check if system meets minimum requirements
   */
  async checkMinimumRequirements(): Promise<boolean> {
    const systemCheck = await this.performSystemCheck();
    return systemCheck.overallStatus !== CheckStatus.FAIL;
  }

  /**
   * Get recommendations for missing tools
   */
  async getInstallationRecommendations(aiAssistant?: AIAssistant): Promise<string[]> {
    const systemCheck = await this.performSystemCheck(aiAssistant);
    return systemCheck.recommendations;
  }

  /**
   * Clear tool check cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // Private helper methods

  private getCachedResult(toolName: string): ToolCheckResult | null {
    const cached = this.cache.get(toolName);
    if (!cached) return null;

    // Check if cache is still valid (has timestamp)
    const cacheTime = (cached as any)._cacheTime;
    if (cacheTime && Date.now() - cacheTime > this.cacheTimeout) {
      this.cache.delete(toolName);
      return null;
    }

    return cached;
  }

  private setCachedResult(toolName: string, result: ToolCheckResult): void {
    (result as any)._cacheTime = Date.now();
    this.cache.set(toolName, result);
  }

  private async findToolInPath(command: string): Promise<string | null> {
    try {
      const which = process.platform === 'win32' ? 'where' : 'which';
      const output = await this.execCommand(`${which} ${command}`);
      return output.split('\n')[0].trim() || null;
    } catch {
      return null;
    }
  }

  private async execCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Command failed: ${stderr || stdout}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  private extractVersion(output: string, regex?: string): string | undefined {
    if (!regex) {
      // Try to find version pattern automatically
      const versionMatch = output.match(/v?(\d+\.\d+\.\d+)/);
      return versionMatch ? versionMatch[1] : undefined;
    }

    const match = output.match(new RegExp(regex));
    return match ? match[1] : undefined;
  }

  private getInstallHint(toolDef: ToolDefinition): string {
    const platform = process.platform;
    const instructions = toolDef.installInstructions;
    
    return instructions[platform as keyof typeof instructions] || 
           instructions.default || 
           `Install ${toolDef.displayName}`;
  }

  private async getNodeVersion(): Promise<string> {
    return process.version;
  }

  private async getNpmVersion(): Promise<string> {
    try {
      return await this.execCommand('npm --version');
    } catch {
      return 'not available';
    }
  }

  private async getGitVersion(): Promise<string | undefined> {
    try {
      const output = await this.execCommand('git --version');
      return this.extractVersion(output, 'git version (\\d+\\.\\d+\\.\\d+)');
    } catch {
      return undefined;
    }
  }

  private async getEnvironmentInfo(): Promise<EnvironmentInfo> {
    const shell = process.env.SHELL || process.env.ComSpec;
    const terminal = process.env.TERM || process.env.TERM_PROGRAM;
    const ci = Boolean(
      process.env.CI || 
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.GITHUB_ACTIONS ||
      process.env.TRAVIS ||
      process.env.CIRCLECI
    );

    // Detect if running in container
    const container = await this.detectContainer();
    
    // Detect WSL
    const wsl = process.platform === 'linux' && Boolean(process.env.WSL_DISTRO_NAME);

    return {
      shell,
      terminal,
      ci,
      container,
      wsl,
      pathSeparator: path.sep,
      tempDirectory: os.tmpdir()
    };
  }

  private async detectContainer(): Promise<boolean> {
    try {
      // Check for container indicators
      if (process.env.DOCKER_CONTAINER || process.env.container) {
        return true;
      }

      // Check for Docker/container filesystem signatures
      if (process.platform === 'linux') {
        try {
          const cgroupContent = await fs.readFile('/proc/1/cgroup', 'utf8');
          if (cgroupContent.includes('docker') || cgroupContent.includes('containerd')) {
            return true;
          }
        } catch {
          // Ignore errors
        }

        try {
          await fs.access('/.dockerenv');
          return true;
        } catch {
          // Ignore errors
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  private async getSystemCapabilities(): Promise<SystemCapabilities> {
    const [hasGit, hasDocker, hasSSH] = await Promise.all([
      this.checkToolAvailable('git'),
      this.checkToolAvailable('docker'),
      this.checkToolAvailable('ssh')
    ]);

    // Check if we can execute scripts
    const canExecuteScripts = process.platform !== 'win32' || Boolean(process.env.ComSpec);

    // Check symlink support
    const supportsSymlinks = process.platform !== 'win32';

    // Check Unix permissions support
    const supportsUnixPermissions = process.platform !== 'win32';

    return {
      hasGit,
      hasDocker,
      hasSSH,
      canExecuteScripts,
      supportsSymlinks,
      supportsUnixPermissions
    };
  }

  private async checkToolAvailable(toolName: string): Promise<boolean> {
    try {
      await this.findToolInPath(toolName);
      return true;
    } catch {
      return false;
    }
  }
}

// Utility functions
export function createToolChecker(): ToolChecker {
  return new ToolChecker();
}

export async function quickSystemCheck(): Promise<boolean> {
  const checker = new ToolChecker();
  return checker.checkMinimumRequirements();
}

export async function getSystemSummary(): Promise<string> {
  const checker = new ToolChecker();
  const systemCheck = await checker.performSystemCheck();
  return SystemCheckUtils.formatResults(systemCheck);
}