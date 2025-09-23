/**
 * Local Template Generator (Refactored)
 *
 * Simplified main coordinator for template generation.
 * Delegates specific tasks to specialized processors.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { AIAssistant, ScriptType } from '../types/cli-config';
import { NPMTemplateManager, createNPMTemplateManager } from './npm-template-manager';
import { BaseFileProcessor } from './template-generator/base-file-processor';
import { AIProcessorFactory } from './template-generator/ai-processors';
import { validateConfig, calculateTotalSize, generateRoadmapWorkflow } from './template-generator/template-utils';

export interface TemplateGenerationConfig {
  aiAssistant: AIAssistant;
  scriptType: ScriptType;
  projectPath: string;
  projectName: string;
  templateName?: string; // Optional template name for internal templates
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
  private readonly internalTemplatePath: string;
  private readonly npmTemplateManager: NPMTemplateManager;
  private readonly fileProcessor: BaseFileProcessor;

  constructor(packageRoot?: string, npmRegistry?: string) {
    // Templates are stored in the npm package under templates/
    this.templateBasePath = packageRoot || path.join(__dirname, '../../templates');
    // Internal templates path (updated structure) - for backward compatibility
    this.internalTemplatePath = path.join(__dirname, '../../packages/internal-templates');
    // NPM template manager for dynamic template installation
    this.npmTemplateManager = createNPMTemplateManager(npmRegistry);
    // File processor for basic operations
    this.fileProcessor = new BaseFileProcessor(this.templateBasePath);
  }

  /**
   * Check if internal templates package exists
   */
  async hasInternalTemplates(): Promise<boolean> {
    try {
      await fs.access(this.internalTemplatePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get list of available internal templates (local)
   */
  async getInternalTemplates(): Promise<string[]> {
    try {
      if (!(await this.hasInternalTemplates())) {
        return [];
      }
      const entries = await fs.readdir(this.internalTemplatePath);
      const templates: string[] = [];

      for (const entry of entries) {
        const entryPath = path.join(this.internalTemplatePath, entry);
        const stat = await fs.stat(entryPath);
        if (stat.isDirectory()) {
          templates.push(entry);
        }
      }

      return templates;
    } catch {
      return [];
    }
  }

  /**
   * Get list of all available templates (local + npm)
   */
  async getAllAvailableTemplates(): Promise<{ local: string[]; npm: string[] }> {
    const localTemplates = await this.getInternalTemplates();
    const npmTemplates = await this.npmTemplateManager.getInstalledTemplates();

    return {
      local: localTemplates,
      npm: npmTemplates
    };
  }

  /**
   * Ensure NPM template is installed if needed
   */
  private async ensureNPMTemplate(templateName: string): Promise<void> {
    // Check if template is already installed locally
    const installedTemplates = await this.npmTemplateManager.getInstalledTemplates();

    if (!installedTemplates.includes(templateName)) {
      // Template not found locally, try to install it
      const result = await this.npmTemplateManager.installTemplatePackage({ templateName });
      const success = result.success;
      if (!success) {
        throw new Error(`Failed to install NPM template package for template: ${templateName}`);
      }
    }
  }

  /**
   * Main template generation method
   */
  async generateTemplate(config: TemplateGenerationConfig): Promise<GenerationResult> {
    // Validate configuration
    validateConfig(config);

    const filesCreated: string[] = [];
    const errors: string[] = [];
    let warnings: string[] = [];

    try {
      // Validate and ensure template if specified
      if (config.templateName) {
        // Try to install/ensure NPM template
        await this.ensureNPMTemplate(config.templateName);
      }

      // Ensure project directory exists
      await fs.mkdir(config.projectPath, { recursive: true });

      // Use internal template if specified, otherwise use default behavior
      if (config.templateName) {
        await this.generateFromInternalTemplate(config, filesCreated);
      } else {
        // Default template generation (existing behavior)
        await this.generateDefaultTemplate(config, filesCreated);
      }

      // Calculate total size
      const sizeResult = await calculateTotalSize(filesCreated);
      warnings = warnings.concat(sizeResult.warnings);

      return {
        success: true,
        filesCreated,
        totalFiles: filesCreated.length,
        totalSize: sizeResult.totalSize,
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
        totalSize: 0,
        errors,
        warnings
      };
    }
  }

  /**
   * Generate from internal template (NPM template)
   */
  private async generateFromInternalTemplate(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    // Get NPM template path from NPM template manager
    const templatePath = await this.npmTemplateManager.getTemplatePath(config.templateName!);

    // Save existing README content before copying template files
    const existingReadmeContent = await this.fileProcessor.preserveExistingReadme(config.projectPath);

    // Copy entire internal template structure (excluding commands, scripts, memory, templates, rules - these are handled separately)
    await this.fileProcessor.copyDirectoryRecursive(
      templatePath,
      config.projectPath,
      filesCreated,
      ['commands', 'scripts', 'memory', 'templates', 'rules']
    );

    // Process template variables in copied files
    await this.fileProcessor.processTemplateVariables(config, filesCreated);

    // Handle README.md by appending to existing README or keeping the template one
    await this.fileProcessor.handleTemplateReadme(templatePath, config.projectPath, filesCreated, existingReadmeContent);

    // Copy .mcp.json if it exists in the template
    await this.fileProcessor.copyMCPConfig(templatePath, config.projectPath, filesCreated);

    // Generate .specify directory with internal template specific content
    await this.generateInternalTemplateSpecifyDirectory(config, templatePath, filesCreated);

    // Generate AI-specific files
    await this.generateAISpecificFiles(config, filesCreated, templatePath);
  }

  /**
   * Generate default template (existing behavior)
   */
  private async generateDefaultTemplate(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    // 1. Create .specify directory for common content
    await this.fileProcessor.createSpecifyDirectory(config, filesCreated);

    // 2. Generate AI-specific files
    await this.generateAISpecificFiles(config, filesCreated);

    // 3. Generate roadmap workflow content
    await generateRoadmapWorkflow(
      config.projectPath,
      config.projectName,
      this.templateBasePath,
      filesCreated
    );
  }

  /**
   * Generate .specify directory with internal template specific content
   */
  private async generateInternalTemplateSpecifyDirectory(
    config: TemplateGenerationConfig,
    templatePath: string,
    filesCreated: string[]
  ): Promise<void> {
    const specifyDir = path.join(config.projectPath, '.specify');
    await fs.mkdir(specifyDir, { recursive: true });

    // Copy template-specific templates to templates directory
    const templatesDir = path.join(specifyDir, 'templates');
    await this.copyInternalTemplateFiles(templatePath, templatesDir, filesCreated);

    // Copy scripts (from internal template if exists, otherwise from default)
    await this.copyInternalScripts(config, templatePath, filesCreated);

    // Copy memory files (from internal template if exists, otherwise from default)
    await this.copyInternalMemoryFiles(templatePath, specifyDir, filesCreated);
  }

  /**
   * Copy internal template templates to .specify/templates
   */
  private async copyInternalTemplateFiles(templatePath: string, templatesDir: string, filesCreated: string[]): Promise<void> {
    const templatesSourceDir = path.join(templatePath, 'templates');

    await fs.mkdir(templatesDir, { recursive: true });

    try {
      // Try to use internal template's own templates directory
      await fs.access(templatesSourceDir);

      const templateFiles = await fs.readdir(templatesSourceDir);

      for (const templateFile of templateFiles) {
        const sourcePath = path.join(templatesSourceDir, templateFile);

        const stat = await fs.stat(sourcePath);
        if (stat.isFile() && templateFile.endsWith('.md')) {
          const destPath = path.join(templatesDir, templateFile);
          await fs.copyFile(sourcePath, destPath);
          filesCreated.push(destPath);
        }
      }
    } catch {
      // If templates directory doesn't exist, use default templates
      // Do NOT convert commands to templates - they serve different purposes
      await this.fileProcessor.copyBaseTemplates(templatesDir, filesCreated);
    }
  }

  /**
   * Copy scripts from internal template or default
   */
  private async copyInternalScripts(config: TemplateGenerationConfig, templatePath: string, filesCreated: string[]): Promise<void> {
    const internalScriptsDir = path.join(templatePath, 'scripts');

    try {
      await fs.access(internalScriptsDir);

      // Internal template has scripts, use them
      const scriptsDestDir = path.join(config.projectPath, '.specify', 'scripts');

      // For Node.js scripts, copy directly from scripts directory (no subdirectory)
      const sourceDir = internalScriptsDir;
      const destDir = scriptsDestDir;

      await fs.mkdir(destDir, { recursive: true });

      const scriptFiles = await fs.readdir(sourceDir);

      for (const scriptFile of scriptFiles) {
        const sourcePath = path.join(sourceDir, scriptFile);
        const destPath = path.join(destDir, scriptFile);

        await fs.copyFile(sourcePath, destPath);
        filesCreated.push(destPath);

        // Set executable permissions for Node.js scripts on Unix systems
        if (scriptFile.endsWith('.js') && process.platform !== 'win32') {
          await fs.chmod(destPath, 0o755);
        }
      }
    } catch (error) {
      // Internal template doesn't have scripts, use default
      await this.fileProcessor.copyScripts(config, filesCreated);
    }
  }

  /**
   * Copy memory files from internal template or default
   */
  private async copyInternalMemoryFiles(templatePath: string, specifyDir: string, filesCreated: string[]): Promise<void> {
    const internalMemoryDir = path.join(templatePath, 'memory');
    const memoryDestDir = path.join(specifyDir, 'memory');

    try {
      await fs.access(internalMemoryDir);
      // Internal template has memory files, use them
      await fs.mkdir(memoryDestDir, { recursive: true });

      const memoryFiles = await fs.readdir(internalMemoryDir);
      for (const memoryFile of memoryFiles) {
        const sourcePath = path.join(internalMemoryDir, memoryFile);
        const destPath = path.join(memoryDestDir, memoryFile);

        const stat = await fs.stat(sourcePath);
        if (stat.isFile()) {
          await fs.copyFile(sourcePath, destPath);
          filesCreated.push(destPath);
        }
      }
    } catch {
      // Internal template doesn't have memory files, use default
      await this.fileProcessor.copyMemoryFiles(memoryDestDir, filesCreated);
    }
  }

  /**
   * Generate AI-specific files (commands and configuration)
   */
  private async generateAISpecificFiles(config: TemplateGenerationConfig, filesCreated: string[], templatePath?: string): Promise<void> {
    // Create AI processor using factory
    const aiProcessor = AIProcessorFactory.create(config.aiAssistant, this.templateBasePath);

    // Generate AI-specific command files
    await aiProcessor.generateCommands(config, filesCreated, templatePath);

    // Generate AI-specific configuration files
    await aiProcessor.generateConfig(config, filesCreated);
  }
}

// Utility function
export function createLocalTemplateGenerator(packageRoot?: string, npmRegistry?: string): LocalTemplateGenerator {
  return new LocalTemplateGenerator(packageRoot, npmRegistry);
}