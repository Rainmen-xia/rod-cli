/**
 * CLI Configuration Types
 * 
 * Defines the configuration interfaces and validation for CLI operations
 */

// AI Assistant Types
export enum AIAssistant {
  CLAUDE = 'claude',
  COPILOT = 'copilot',
  GEMINI = 'gemini',
  CURSOR = 'cursor'
}

// Script Type Enumeration
export enum ScriptType {
  BASH = 'sh',
  POWERSHELL = 'ps'
}

// Main CLI Configuration Interface
export interface CLIConfig {
  projectName: string;           // Project name
  aiAssistant: AIAssistant;      // Selected AI assistant
  scriptType: ScriptType;        // Script type
  projectPath: string;           // Project path (absolute)
  skipGit: boolean;              // Skip git initialization
  skipTls: boolean;              // Skip TLS verification
  ignoreAgentTools: boolean;     // Ignore agent tool checks
  debug: boolean;                // Debug mode
}

// Configuration validation result
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Configuration builder for easier creation
export class CLIConfigBuilder {
  private config: Partial<CLIConfig> = {
    skipGit: false,
    skipTls: false,
    ignoreAgentTools: false,
    debug: false
  };

  setProjectName(name: string): CLIConfigBuilder {
    this.config.projectName = name;
    return this;
  }

  setAIAssistant(ai: AIAssistant): CLIConfigBuilder {
    this.config.aiAssistant = ai;
    return this;
  }

  setScriptType(script: ScriptType): CLIConfigBuilder {
    this.config.scriptType = script;
    return this;
  }

  setProjectPath(path: string): CLIConfigBuilder {
    this.config.projectPath = path;
    return this;
  }

  setSkipGit(skip: boolean): CLIConfigBuilder {
    this.config.skipGit = skip;
    return this;
  }

  setSkipTls(skip: boolean): CLIConfigBuilder {
    this.config.skipTls = skip;
    return this;
  }

  setIgnoreAgentTools(ignore: boolean): CLIConfigBuilder {
    this.config.ignoreAgentTools = ignore;
    return this;
  }

  setDebug(debug: boolean): CLIConfigBuilder {
    this.config.debug = debug;
    return this;
  }

  build(): CLIConfig {
    const validation = validateCLIConfig(this.config as CLIConfig);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    return this.config as CLIConfig;
  }
}

// Configuration validation functions
export function validateCLIConfig(config: Partial<CLIConfig>): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate project name
  if (!config.projectName) {
    errors.push('Project name is required');
  } else if (!isValidProjectName(config.projectName)) {
    errors.push('Project name contains invalid characters');
  }

  // Validate AI assistant
  if (!config.aiAssistant) {
    errors.push('AI assistant selection is required');
  } else if (!Object.values(AIAssistant).includes(config.aiAssistant)) {
    errors.push(`Invalid AI assistant: ${config.aiAssistant}`);
  }

  // Validate script type (optional - will be auto-detected if not provided)
  if (config.scriptType && !Object.values(ScriptType).includes(config.scriptType)) {
    errors.push(`Invalid script type: ${config.scriptType}`);
  }

  // Validate project path
  if (!config.projectPath) {
    errors.push('Project path is required');
  } else if (!isAbsolutePath(config.projectPath)) {
    errors.push('Project path must be absolute');
  }

  // Add warnings
  if (config.skipTls) {
    warnings.push('TLS verification is disabled - this reduces security');
  }

  if (config.ignoreAgentTools) {
    warnings.push('Agent tool checks are disabled - some features may not work');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Helper validation functions
export function isValidProjectName(name: string): boolean {
  // Project name should be valid directory name
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  return !invalidChars.test(name) && name.trim().length > 0;
}

export function isAbsolutePath(path: string): boolean {
  // Check for absolute path on both Windows and Unix-like systems
  return /^([A-Za-z]:[\\/]|\/|\\\\)/.test(path);
}

export function getSupportedAIAssistants(): AIAssistant[] {
  return Object.values(AIAssistant);
}

export function getSupportedScriptTypes(): ScriptType[] {
  return Object.values(ScriptType);
}

// Default configuration factory
export function createDefaultConfig(): Partial<CLIConfig> {
  return {
    skipGit: false,
    skipTls: false,
    ignoreAgentTools: false,
    debug: false
  };
}

// Configuration utilities
export class ConfigUtils {
  static fromCommandLineArgs(args: Record<string, any>): Partial<CLIConfig> {
    return {
      projectName: args.projectName,
      aiAssistant: args.ai as AIAssistant,
      scriptType: args.script as ScriptType,
      projectPath: args.projectPath,
      skipGit: Boolean(args.noGit),
      skipTls: Boolean(args.skipTls),
      ignoreAgentTools: Boolean(args.ignoreAgentTools),
      debug: Boolean(args.debug)
    };
  }

  static toDisplayString(config: CLIConfig): string {
    return [
      `Project: ${config.projectName}`,
      `AI Assistant: ${config.aiAssistant}`,
      `Script Type: ${config.scriptType}`,
      `Path: ${config.projectPath}`,
      `Skip Git: ${config.skipGit}`,
      `Debug: ${config.debug}`
    ].join('\n');
  }

  static getTemplateFileName(config: CLIConfig, version: string): string {
    return `spec-kit-template-${config.aiAssistant}-${config.scriptType}-${version}.zip`;
  }
}