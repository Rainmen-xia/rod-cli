/**
 * Config Manager
 * 
 * Handles configuration management, validation, and persistence
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

import {
  CLIConfig,
  AIAssistant,
  ScriptType,
  WorkflowMode,
  CLIConfigBuilder,
  validateCLIConfig,
  ConfigValidationResult,
  ConfigUtils,
  createDefaultConfig
} from '../types/cli-config';

// Configuration persistence
export interface ConfigPersistence {
  save(config: CLIConfig, location?: string): Promise<void>;
  load(location?: string): Promise<CLIConfig | null>;
  exists(location?: string): Promise<boolean>;
  remove(location?: string): Promise<void>;
}

// Configuration profiles
export interface ConfigProfile {
  name: string;
  description: string;
  config: Partial<CLIConfig>;
  tags: string[];
  createdAt: Date;
  lastUsed?: Date;
}

// Global configuration settings
export interface GlobalConfig {
  defaultAI?: AIAssistant;
  defaultScript?: ScriptType;
  defaultWorkflow?: WorkflowMode;
  skipGitByDefault: boolean;
  debugMode: boolean;
  profiles: ConfigProfile[];
  recentProjects: string[];
  preferences: UserPreferences;
}

export interface UserPreferences {
  autoUpdate: boolean;
  showProgressBars: boolean;
  verboseOutput: boolean;
  preferredDownloadDir?: string;
  maxConcurrentDownloads: number;
  cacheTimeout: number; // in minutes
}

// Main ConfigManager class
export class ConfigManager {
  private configDir: string;
  private globalConfigPath: string;
  private globalConfig: GlobalConfig | null = null;

  constructor(configDir?: string) {
    this.configDir = configDir || path.join(os.homedir(), '.rod');
    this.globalConfigPath = path.join(this.configDir, 'config.json');
  }

  /**
   * Create configuration from command line arguments
   */
  async createFromArgs(args: Record<string, any>): Promise<CLIConfig> {
    const partialConfig = ConfigUtils.fromCommandLineArgs(args);
    
    // Fill in missing values with defaults or global config
    await this.loadGlobalConfig();
    const defaults = this.getDefaultsFromGlobalConfig();
    
    const builder = new CLIConfigBuilder();
    
    // Apply defaults first
    if (defaults.aiAssistant) builder.setAIAssistant(defaults.aiAssistant);
    if (defaults.scriptType) builder.setScriptType(defaults.scriptType);
    else builder.setScriptType(this.autoDetectScriptType()); // Auto-detect if not set
    if (defaults.workflowMode) builder.setWorkflowMode(defaults.workflowMode);
    builder.setSkipGit(defaults.skipGit || false);
    builder.setDebug(defaults.debug || false);
    builder.setSkipTls(false);
    builder.setIgnoreAgentTools(false);
    
    // Apply user-provided values
    if (partialConfig.projectName) {
      builder.setProjectName(partialConfig.projectName);
    }
    
    if (partialConfig.aiAssistant) {
      builder.setAIAssistant(partialConfig.aiAssistant);
    }
    
    if (partialConfig.scriptType) {
      builder.setScriptType(partialConfig.scriptType);
    } else {
      // Always auto-detect if no script type provided
      builder.setScriptType(this.autoDetectScriptType());
    }
    
    if (partialConfig.workflowMode) {
      builder.setWorkflowMode(partialConfig.workflowMode);
      
      // In roadmap mode, always auto-detect script type for simplicity
      if (partialConfig.workflowMode === WorkflowMode.ROADMAP && !partialConfig.scriptType) {
        builder.setScriptType(this.autoDetectScriptType());
      }
    }
    
    if (partialConfig.projectPath) {
      builder.setProjectPath(partialConfig.projectPath);
    }
    
    if (partialConfig.skipGit !== undefined) {
      builder.setSkipGit(partialConfig.skipGit);
    }
    
    if (partialConfig.skipTls !== undefined) {
      builder.setSkipTls(partialConfig.skipTls);
    }
    
    if (partialConfig.ignoreAgentTools !== undefined) {
      builder.setIgnoreAgentTools(partialConfig.ignoreAgentTools);
    }
    
    if (partialConfig.debug !== undefined) {
      builder.setDebug(partialConfig.debug);
    }

    return builder.build();
  }

  /**
   * Validate configuration
   */
  validateConfig(config: Partial<CLIConfig>): ConfigValidationResult {
    return validateCLIConfig(config);
  }

  /**
   * Resolve project path based on configuration
   */
  resolveProjectPath(projectName?: string, isCurrentDir?: boolean): string {
    if (isCurrentDir) {
      return process.cwd();
    }
    
    if (!projectName) {
      throw new Error('Project name is required when not using current directory');
    }
    
    return path.resolve(process.cwd(), projectName);
  }

  /**
   * Auto-detect script type based on platform
   */
  autoDetectScriptType(): ScriptType {
    // Auto-detect based on platform
    // Windows: PowerShell, Others (macOS, Linux): Bash
    return process.platform === 'win32' ? ScriptType.POWERSHELL : ScriptType.BASH;
  }

  /**
   * Get AI assistant suggestions based on environment
   */
  getAISuggestions(): { ai: AIAssistant; reason: string }[] {
    const suggestions: { ai: AIAssistant; reason: string }[] = [];
    
    // Check for various AI tools in environment
    if (process.env.CLAUDE_API_KEY || this.isToolInstalled('claude')) {
      suggestions.push({
        ai: AIAssistant.CLAUDE,
        reason: 'Claude CLI detected or API key found'
      });
    }
    
    if (process.env.GITHUB_TOKEN || this.isToolInstalled('gh')) {
      suggestions.push({
        ai: AIAssistant.COPILOT,
        reason: 'GitHub CLI or token detected'
      });
    }
    
    if (this.isToolInstalled('cursor')) {
      suggestions.push({
        ai: AIAssistant.CURSOR,
        reason: 'Cursor IDE detected'
      });
    }
    
    // Default suggestion
    if (suggestions.length === 0) {
      suggestions.push({
        ai: AIAssistant.CLAUDE,
        reason: 'Recommended for general use'
      });
    }
    
    return suggestions;
  }

  // Global configuration management

  /**
   * Load global configuration
   */
  async loadGlobalConfig(): Promise<GlobalConfig> {
    if (this.globalConfig) {
      return this.globalConfig;
    }

    try {
      await fs.mkdir(this.configDir, { recursive: true });
      
      const configExists = await fs.access(this.globalConfigPath).then(() => true).catch(() => false);
      if (!configExists) {
        this.globalConfig = this.createDefaultGlobalConfig();
        await this.saveGlobalConfig();
        return this.globalConfig;
      }

      const configData = await fs.readFile(this.globalConfigPath, 'utf8');
      const parsed = JSON.parse(configData);
      
      // Merge with defaults to handle new properties
      this.globalConfig = {
        ...this.createDefaultGlobalConfig(),
        ...parsed,
        profiles: parsed.profiles?.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          lastUsed: p.lastUsed ? new Date(p.lastUsed) : undefined
        })) || []
      };

      return this.globalConfig!;
    } catch (error) {
      console.warn(`Failed to load global config: ${error}`);
      this.globalConfig = this.createDefaultGlobalConfig();
      return this.globalConfig;
    }
  }

  /**
   * Save global configuration
   */
  async saveGlobalConfig(): Promise<void> {
    if (!this.globalConfig) {
      return;
    }

    try {
      await fs.mkdir(this.configDir, { recursive: true });
      const configData = JSON.stringify(this.globalConfig, null, 2);
      await fs.writeFile(this.globalConfigPath, configData, 'utf8');
    } catch (error) {
      console.warn(`Failed to save global config: ${error}`);
    }
  }

  /**
   * Update global configuration
   */
  async updateGlobalConfig(updates: Partial<GlobalConfig>): Promise<void> {
    await this.loadGlobalConfig();
    if (this.globalConfig) {
      this.globalConfig = { ...this.globalConfig, ...updates };
      await this.saveGlobalConfig();
    }
  }

  // Profile management

  /**
   * Save configuration as profile
   */
  async saveProfile(name: string, config: Partial<CLIConfig>, description?: string): Promise<void> {
    await this.loadGlobalConfig();
    
    const profile: ConfigProfile = {
      name,
      description: description || `Profile for ${config.aiAssistant || 'default'} projects`,
      config,
      tags: [],
      createdAt: new Date()
    };

    // Remove existing profile with same name
    if (this.globalConfig) {
      this.globalConfig.profiles = this.globalConfig.profiles.filter(p => p.name !== name);
      
      // Add new profile
      this.globalConfig.profiles.push(profile);
    }
    
    await this.saveGlobalConfig();
  }

  /**
   * Load configuration from profile
   */
  async loadProfile(name: string): Promise<Partial<CLIConfig> | null> {
    await this.loadGlobalConfig();
    
    if (!this.globalConfig) return null;
    
    const profile = this.globalConfig.profiles.find(p => p.name === name);
    if (!profile) {
      return null;
    }

    // Update last used timestamp
    profile.lastUsed = new Date();
    await this.saveGlobalConfig();
    
    return profile.config;
  }

  /**
   * List all profiles
   */
  async listProfiles(): Promise<ConfigProfile[]> {
    await this.loadGlobalConfig();
    return [...this.globalConfig!.profiles];
  }

  /**
   * Delete profile
   */
  async deleteProfile(name: string): Promise<boolean> {
    await this.loadGlobalConfig();
    
    const initialLength = this.globalConfig!.profiles.length;
    this.globalConfig!.profiles = this.globalConfig!.profiles.filter(p => p.name !== name);
    
    const deleted = this.globalConfig!.profiles.length < initialLength;
    if (deleted) {
      await this.saveGlobalConfig();
    }
    
    return deleted;
  }

  // Recent projects tracking

  /**
   * Add project to recent list
   */
  async addToRecent(projectPath: string): Promise<void> {
    await this.loadGlobalConfig();
    
    // Remove if already exists
    this.globalConfig!.recentProjects = this.globalConfig!.recentProjects.filter(p => p !== projectPath);
    
    // Add to beginning
    this.globalConfig!.recentProjects.unshift(projectPath);
    
    // Keep only last 10
    this.globalConfig!.recentProjects = this.globalConfig!.recentProjects.slice(0, 10);
    
    await this.saveGlobalConfig();
  }

  /**
   * Get recent projects
   */
  async getRecentProjects(): Promise<string[]> {
    await this.loadGlobalConfig();
    return [...this.globalConfig!.recentProjects];
  }

  // Private helper methods

  private createDefaultGlobalConfig(): GlobalConfig {
    return {
      skipGitByDefault: false,
      debugMode: false,
      profiles: [],
      recentProjects: [],
      preferences: {
        autoUpdate: true,
        showProgressBars: true,
        verboseOutput: false,
        maxConcurrentDownloads: 3,
        cacheTimeout: 60
      }
    };
  }

  private getDefaultsFromGlobalConfig(): Partial<CLIConfig> {
    if (!this.globalConfig) {
      return createDefaultConfig();
    }

    return {
      aiAssistant: this.globalConfig.defaultAI,
      scriptType: this.globalConfig.defaultScript,
      workflowMode: this.globalConfig.defaultWorkflow,
      skipGit: this.globalConfig.skipGitByDefault,
      debug: this.globalConfig.debugMode,
      skipTls: false,
      ignoreAgentTools: false
    };
  }

  private isToolInstalled(toolName: string): boolean {
    // Simple check - in real implementation, would use ToolChecker
    try {
      require('child_process').execSync(`${toolName} --version`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

// File-based configuration persistence
export class FileConfigPersistence implements ConfigPersistence {
  constructor(private baseDir: string = process.cwd()) {}

  async save(config: CLIConfig, location?: string): Promise<void> {
    const configPath = location || path.join(this.baseDir, '.rod-config.json');
    const configData = JSON.stringify(config, null, 2);
    await fs.writeFile(configPath, configData, 'utf8');
  }

  async load(location?: string): Promise<CLIConfig | null> {
    const configPath = location || path.join(this.baseDir, '.rod-config.json');
    
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      return JSON.parse(configData) as CLIConfig;
    } catch {
      return null;
    }
  }

  async exists(location?: string): Promise<boolean> {
    const configPath = location || path.join(this.baseDir, '.rod-config.json');
    return fs.access(configPath).then(() => true).catch(() => false);
  }

  async remove(location?: string): Promise<void> {
    const configPath = location || path.join(this.baseDir, '.rod-config.json');
    try {
      await fs.unlink(configPath);
    } catch {
      // Ignore errors
    }
  }
}

// Utility functions
export function createConfigManager(configDir?: string): ConfigManager {
  return new ConfigManager(configDir);
}

export function createFileConfigPersistence(baseDir?: string): FileConfigPersistence {
  return new FileConfigPersistence(baseDir);
}

export async function autoConfigureForEnvironment(): Promise<Partial<CLIConfig>> {
  const manager = new ConfigManager();
  const suggestions = manager.getAISuggestions();
  const scriptType = manager.autoDetectScriptType();
  
  return {
    aiAssistant: suggestions[0]?.ai,
    scriptType,
    skipGit: false,
    debug: false,
    skipTls: false,
    ignoreAgentTools: false
  };
}