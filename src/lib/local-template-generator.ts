/**
 * Local Template Generator
 * 
 * Generates project templates locally based on user configuration
 * instead of downloading from GitHub
 */

import { promises as fs } from 'fs';
import path from 'path';
import { AIAssistant, ScriptType } from '../types/cli-config';

export interface TemplateGenerationConfig {
  aiAssistant: AIAssistant;
  scriptType: ScriptType;
  projectPath: string;
  projectName: string;
}

export interface GenerationResult {
  success: boolean;
  filesCreated: string[];
  totalFiles: number;
  totalSize: number;
  errors: string[];
  warnings: string[];
}

export class LocalTemplateGenerator {
  private readonly templateBasePath: string;
  
  constructor(packageRoot?: string) {
    // Templates are stored in the npm package under templates/
    this.templateBasePath = packageRoot || path.join(__dirname, '../../templates');
  }

  /**
   * Generate project template locally based on configuration
   */
  async generateTemplate(config: TemplateGenerationConfig): Promise<GenerationResult> {
    const filesCreated: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalSize = 0;

    try {
      // Ensure project directory exists
      await fs.mkdir(config.projectPath, { recursive: true });

      // 1. Create .specify directory for common content
      await this.createSpecifyDirectory(config, filesCreated);

      // 2. Generate AI-specific command files (in AI-specific directory)
      await this.generateAICommands(config, filesCreated);

      // 5. Generate AI-specific configuration files
      await this.generateAIConfig(config, filesCreated);

      // Calculate total size
      for (const filePath of filesCreated) {
        try {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        } catch (error) {
          // File might not exist if generation failed
          warnings.push(`Could not stat file: ${filePath}`);
        }
      }

      return {
        success: true,
        filesCreated,
        totalFiles: filesCreated.length,
        totalSize,
        errors,
        warnings
      };

    } catch (error) {
      const err = error as Error;
      errors.push(`Template generation failed: ${err.message}`);
      
      return {
        success: false,
        filesCreated,
        totalFiles: filesCreated.length,
        totalSize,
        errors,
        warnings
      };
    }
  }

  /**
   * Get the AI-specific directory name for commands
   */
  private getAIDirectoryName(aiAssistant: AIAssistant): string {
    switch (aiAssistant) {
      case AIAssistant.CLAUDE:
        return '.claude';
      case AIAssistant.CURSOR:
        return '.cursor';
      case AIAssistant.GEMINI:
        return '.gemini';
      case AIAssistant.COPILOT:
        return '.github'; // Copilot uses .github/prompts
      case AIAssistant.CODEBUDDY:
        return '.codebuddy';
      default:
        return '.specify';
    }
  }

  /**
   * Create .specify directory with common content
   */
  private async createSpecifyDirectory(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    const specifyDir = path.join(config.projectPath, '.specify');
    await fs.mkdir(specifyDir, { recursive: true });

    // 1. Copy base templates
    await this.copyBaseTemplates(path.join(specifyDir, 'templates'), filesCreated);

    // 2. Copy scripts
    await this.copyScripts(config, filesCreated);

    // 3. Copy memory files
    await this.copyMemoryFiles(path.join(specifyDir, 'memory'), filesCreated);
  }

  /**
   * Copy base template files (spec, plan, tasks templates)
   */
  private async copyBaseTemplates(templatesDir: string, filesCreated: string[]): Promise<void> {
    await fs.mkdir(templatesDir, { recursive: true });

    const baseTemplates = [
      'spec-template.md',
      'plan-template.md', 
      'tasks-template.md',
      'agent-file-template.md'
    ];

    for (const template of baseTemplates) {
      const sourcePath = path.join(this.templateBasePath, template);
      const destPath = path.join(templatesDir, template);
      
      try {
        await fs.copyFile(sourcePath, destPath);
        filesCreated.push(destPath);
      } catch (error) {
        throw new Error(`Failed to copy base template ${template}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Generate AI-specific command files
   */
  private async generateAICommands(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    // Commands go in AI-specific directories
    const aiDir = this.getAIDirectoryName(config.aiAssistant);
    const commandsSubdir = config.aiAssistant === AIAssistant.COPILOT ? 'prompts' : 'commands';
    const commandsDir = path.join(config.projectPath, aiDir, commandsSubdir);
    await fs.mkdir(commandsDir, { recursive: true });

    const commands = ['specify', 'plan', 'tasks'];
    
    for (const command of commands) {
      const commandContent = await this.generateCommandFile(command, config);
      
      // Different file extensions based on AI assistant
      let filename: string;
      switch (config.aiAssistant) {
        case AIAssistant.GEMINI:
          filename = `${command}.toml`;
          break;
        case AIAssistant.COPILOT:
          filename = `${command}.prompt.md`;
          break;
        default: // CLAUDE, CURSOR, CODEBUDDY
          filename = `${command}.md`;
          break;
      }
      
      const destPath = path.join(commandsDir, filename);
      await fs.writeFile(destPath, commandContent, 'utf8');
      filesCreated.push(destPath);
    }
  }

  /**
   * Generate individual command file content
   */
  private async generateCommandFile(command: string, config: TemplateGenerationConfig): Promise<string> {
    const templatePath = path.join(this.templateBasePath, 'commands', `${command}.md`);
    
    try {
      let content = await fs.readFile(templatePath, 'utf8');
      
      // Replace script references with the appropriate script type
      const scriptExtension = config.scriptType === ScriptType.BASH ? 'sh' : 'ps1';
      const scriptPath = `.specify/scripts/${config.scriptType === ScriptType.BASH ? 'bash' : 'powershell'}`;
      
      // Update script references in the template
      content = content.replace(
        /scripts\/bash\/([^.]+)\.sh/g, 
        `${scriptPath}/$1.${scriptExtension}`
      );
      
      content = content.replace(
        /scripts\/powershell\/([^.]+)\.ps1/g,
        `${scriptPath}/$1.${scriptExtension}`
      );

      // Replace all placeholders
      content = this.replacePlaceholders(content, config);

      // Convert to AI-specific format
      content = this.convertToAIFormat(content, config.aiAssistant);
      
      return content;
      
    } catch (error) {
      throw new Error(`Failed to generate ${command} command: ${(error as Error).message}`);
    }
  }

  /**
   * Replace placeholders with appropriate values based on configuration
   */
  private replaceScriptPlaceholder(content: string, scriptType: ScriptType): string {
    // Parse frontmatter to extract script paths
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return content;
    }

    const frontmatter = frontmatterMatch[1];
    const scriptKey = scriptType === ScriptType.BASH ? 'sh' : 'ps';
    
    // Extract script path for the current script type
    const scriptPathMatch = frontmatter.match(new RegExp(`${scriptKey}:\\s*(.+)`));
    if (!scriptPathMatch) {
      return content;
    }

    let scriptPath = scriptPathMatch[1].trim();
    
    // Convert script path to .specify format
    scriptPath = scriptPath.replace(/^scripts\//, '.specify/scripts/');
    
    // Replace {SCRIPT} placeholder with the actual script path
    return content.replace(/\{SCRIPT\}/g, scriptPath);
  }

  /**
   * Replace all placeholders in content
   */
  private replacePlaceholders(content: string, config: TemplateGenerationConfig): string {
    let result = content;
    
    // Replace {SCRIPT} with appropriate script path
    result = this.replaceScriptPlaceholder(result, config.scriptType);
    
    // Replace {ARGS} with appropriate argument format based on AI assistant
    const argsFormat = this.getArgumentFormat(config.aiAssistant);
    result = result.replace(/\{ARGS\}/g, argsFormat);
    
    // Replace __AGENT__ with the actual agent name
    result = result.replace(/__AGENT__/g, config.aiAssistant);
    
    // Apply path rewrites (convert relative paths to .specify paths)
    result = this.rewritePaths(result);
    
    // Clean up frontmatter (remove scripts section)
    result = this.cleanFrontmatter(result);
    
    return result;
  }

  /**
   * Remove scripts section from frontmatter to clean up the generated command files
   */
  private cleanFrontmatter(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let inFrontmatter = false;
    let inScriptsSection = false;
    let dashCount = 0;

    for (const line of lines) {
      if (line === '---') {
        dashCount++;
        if (dashCount === 1) {
          inFrontmatter = true;
        } else if (dashCount === 2) {
          inFrontmatter = false;
        }
        result.push(line);
        continue;
      }

      if (inFrontmatter) {
        if (line === 'scripts:') {
          inScriptsSection = true;
          continue; // Skip the scripts: line
        } else if (line.match(/^[a-zA-Z].*:/) && inScriptsSection) {
          // New top-level section, stop skipping
          inScriptsSection = false;
        }

        if (inScriptsSection && line.match(/^\s/)) {
          // Skip indented lines under scripts section
          continue;
        }
      }

      result.push(line);
    }

    return result.join('\n');
  }

  /**
   * Get argument format for different AI assistants
   */
  private getArgumentFormat(aiAssistant: AIAssistant): string {
    switch (aiAssistant) {
      case AIAssistant.GEMINI:
        return '{{args}}';
      default:
        return '$ARGUMENTS';
    }
  }

  /**
   * Rewrite paths to use .specify format
   */
  private rewritePaths(content: string): string {
    return content
      .replace(/(?<!\.specify\/)memory\//g, '.specify/memory/')
      .replace(/(?<!\.specify\/)scripts\//g, '.specify/scripts/')
      .replace(/(?<!\.specify\/)templates\//g, '.specify/templates/');
  }

  /**
   * Convert content to AI-specific format
   */
  private convertToAIFormat(content: string, aiAssistant: AIAssistant): string {
    switch (aiAssistant) {
      case AIAssistant.GEMINI:
        return this.convertToTomlFormat(content, aiAssistant);
      default:
        // For claude, cursor, codebuddy, copilot - add AI-specific metadata
        return this.addAIMetadata(content, aiAssistant);
    }
  }

  /**
   * Convert markdown content to TOML format for Gemini
   */
  private convertToTomlFormat(content: string, aiAssistant: AIAssistant): string {
    // Extract description from frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    let description = '';
    
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const descMatch = frontmatter.match(/description:\s*(.+)/);
      if (descMatch) {
        description = descMatch[1].trim();
      }
    }

    // Extract body (everything after frontmatter)
    const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n\n([\s\S]*)$/);
    const body = bodyMatch ? bodyMatch[1] : content;

    // Format as TOML
    return `description = "${description}"\n\nprompt = """\n${body}\n"""`;
  }

  /**
   * Copy scripts based on the selected script type
   */
  private async copyScripts(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    const scriptsSourceDir = path.join(__dirname, '../../scripts');
    // Scripts always go in .specify directory
    const scriptsDestDir = path.join(config.projectPath, '.specify', 'scripts');
    
    // Copy the selected script type
    const scriptSubdir = config.scriptType === ScriptType.BASH ? 'bash' : 'powershell';
    const sourceDir = path.join(scriptsSourceDir, scriptSubdir);
    const destDir = path.join(scriptsDestDir, scriptSubdir);
    
    await fs.mkdir(destDir, { recursive: true });
    
    const scriptFiles = await fs.readdir(sourceDir);
    
    for (const scriptFile of scriptFiles) {
      const sourcePath = path.join(sourceDir, scriptFile);
      const destPath = path.join(destDir, scriptFile);
      
      await fs.copyFile(sourcePath, destPath);
      filesCreated.push(destPath);
      
      // Set executable permissions for bash scripts on Unix systems
      if (config.scriptType === ScriptType.BASH && process.platform !== 'win32') {
        await fs.chmod(destPath, 0o755);
      }
    }
  }

  /**
   * Copy memory/constitution files
   */
  private async copyMemoryFiles(memoryDestDir: string, filesCreated: string[]): Promise<void> {
    const memorySourceDir = path.join(__dirname, '../../memory');
    
    await fs.mkdir(memoryDestDir, { recursive: true });
    
    const memoryFiles = await fs.readdir(memorySourceDir);
    
    for (const memoryFile of memoryFiles) {
      const sourcePath = path.join(memorySourceDir, memoryFile);
      const destPath = path.join(memoryDestDir, memoryFile);
      
      await fs.copyFile(sourcePath, destPath);
      filesCreated.push(destPath);
    }
  }

  /**
   * Generate AI-specific configuration files
   */
  private async generateAIConfig(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    // Generate AI-specific configuration based on the selected assistant
    switch (config.aiAssistant) {
      case AIAssistant.CLAUDE:
        await this.generateClaudeConfig(config, filesCreated);
        break;
      case AIAssistant.COPILOT:
        // Copilot doesn't generate additional config files
        break;
      case AIAssistant.GEMINI:
        await this.generateGeminiConfig(config, filesCreated);
        break;
      case AIAssistant.CURSOR:
        // Cursor doesn't generate additional config files
        break;
      case AIAssistant.CODEBUDDY:
        // Codebuddy doesn't generate additional config files
        break;
    }
  }

  /**
   * Add AI-specific metadata to command files
   */
  private addAIMetadata(content: string, aiAssistant: AIAssistant): string {
    // Add AI-specific instructions or metadata
    const aiInstructions = this.getAIInstructions(aiAssistant);
    
    if (aiInstructions) {
      // Insert AI-specific instructions after the frontmatter
      const frontmatterEnd = content.indexOf('---', 3);
      if (frontmatterEnd !== -1) {
        const beforeFrontmatter = content.substring(0, frontmatterEnd + 3);
        const afterFrontmatter = content.substring(frontmatterEnd + 3);
        
        return beforeFrontmatter + '\n\n' + aiInstructions + afterFrontmatter;
      }
    }
    
    return content;
  }

  /**
   * Get AI-specific instructions
   */
  private getAIInstructions(aiAssistant: AIAssistant): string {
    switch (aiAssistant) {
      case AIAssistant.CLAUDE:
        return `<!-- Instructions for Claude Code -->
<!-- This command is optimized for Claude Code. Use the built-in file operations and avoid external tools when possible. -->`;
        
      case AIAssistant.COPILOT:
        return `<!-- Instructions for GitHub Copilot -->
<!-- This command works with GitHub Copilot Chat. Use @workspace commands for better context. -->`;
        
      case AIAssistant.GEMINI:
        return `<!-- Instructions for Gemini CLI -->
<!-- This command is designed for use with Gemini CLI. Ensure proper context and file references. -->`;
        
      case AIAssistant.CURSOR:
        return `<!-- Instructions for Cursor -->
<!-- This command is optimized for Cursor IDE. Use Ctrl+K or Cmd+K for code generation. -->`;
        
      case AIAssistant.CODEBUDDY:
        return `<!-- Instructions for Codebuddy -->
<!-- This command is designed for use with Codebuddy. Follow codebuddy's best practices for code assistance. -->`;
        
      default:
        return '';
    }
  }

  /**
   * Generate Claude-specific configuration
   */
  private async generateClaudeConfig(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    const claudeConfig = {
      assistant: 'claude',
      scriptType: config.scriptType,
      features: {
        specDriven: true,
        fileOperations: true,
        codeGeneration: true
      }
    };

    const configPath = path.join(config.projectPath, '.claude-config.json');
    await fs.writeFile(configPath, JSON.stringify(claudeConfig, null, 2), 'utf8');
    filesCreated.push(configPath);
  }


  /**
   * Generate Gemini-specific configuration
   */
  private async generateGeminiConfig(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    const geminiConfig = {
      assistant: 'gemini',
      scriptType: config.scriptType,
      specDriven: true
    };

    const configPath = path.join(config.projectPath, '.gemini-config.json');
    await fs.writeFile(configPath, JSON.stringify(geminiConfig, null, 2), 'utf8');
    filesCreated.push(configPath);
  }

}

// Utility function
export function createLocalTemplateGenerator(packageRoot?: string): LocalTemplateGenerator {
  return new LocalTemplateGenerator(packageRoot);
}