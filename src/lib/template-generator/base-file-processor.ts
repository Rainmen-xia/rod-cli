/**
 * Base File Processor
 *
 * Handles basic file operations common to all template types:
 * - Directory creation and copying
 * - Template variable replacement
 * - README file intelligent merging
 * - MCP configuration copying
 * - Scripts and memory files handling
 */

import { promises as fs } from 'fs';
import path from 'path';
import { ScriptType } from '../../types/cli-config';
import { TemplateGenerationConfig } from '../template-generator';

export class BaseFileProcessor {
  constructor(private readonly templateBasePath: string) {}

  /**
   * Copy directory recursively with exclusions
   */
  async copyDirectoryRecursive(
    sourceDir: string,
    destDir: string,
    filesCreated: string[],
    excludeDirs: string[] = [],
    excludeFiles: string[] = []
  ): Promise<void> {
    try {
      await fs.access(sourceDir);
    } catch {
      return; // Source directory doesn't exist, skip
    }

    await fs.mkdir(destDir, { recursive: true });

    const entries = await fs.readdir(sourceDir);

    for (const entry of entries) {
      if (excludeDirs.includes(entry)) {
        continue; // Skip excluded directories
      }

      if (excludeFiles.includes(entry)) {
        continue; // Skip excluded files
      }

      const sourcePath = path.join(sourceDir, entry);
      const destPath = path.join(destDir, entry);

      const stat = await fs.stat(sourcePath);

      if (stat.isDirectory()) {
        await this.copyDirectoryRecursive(sourcePath, destPath, filesCreated, excludeDirs, excludeFiles);
      } else {
        await fs.copyFile(sourcePath, destPath);
        filesCreated.push(destPath);
      }
    }
  }

  /**
   * Process template variables in files
   */
  async processTemplateVariables(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    for (const filePath of [...filesCreated]) {
      try {
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          let content = await fs.readFile(filePath, 'utf8');

          // Replace template variables
          content = this.replacePlaceholders(content, config);

          await fs.writeFile(filePath, content, 'utf8');
        }
      } catch (error) {
        // Skip files that can't be read as text
      }
    }
  }

  /**
   * Preserve existing README content before template copying
   */
  async preserveExistingReadme(projectPath: string): Promise<string | null> {
    const readmePath = path.join(projectPath, 'README.md');

    try {
      const content = await fs.readFile(readmePath, 'utf8');
      return content.trim();
    } catch {
      return null; // README doesn't exist, which is fine
    }
  }

  /**
   * Handle template README.md by appending to existing README if needed
   */
  async handleTemplateReadme(
    templatePath: string,
    projectPath: string,
    filesCreated: string[],
    existingReadmeContent: string | null
  ): Promise<void> {
    const templateReadmePath = path.join(templatePath, 'README.md');
    const projectReadmePath = path.join(projectPath, 'README.md');

    try {
      // Check if template has README.md
      await fs.access(templateReadmePath);

      const templateReadmeContent = await fs.readFile(templateReadmePath, 'utf8');

      if (existingReadmeContent) {
        // Append template README to existing README with separator
        const separator = '\n\n---\n\n';
        const combinedContent = existingReadmeContent + separator + templateReadmeContent;
        await fs.writeFile(projectReadmePath, combinedContent, 'utf8');
      } else {
        // No existing README, just copy template README
        await fs.copyFile(templateReadmePath, projectReadmePath);
      }

      // Add to filesCreated if not already there
      if (!filesCreated.includes(projectReadmePath)) {
        filesCreated.push(projectReadmePath);
      }
    } catch {
      // Template doesn't have README.md, which is fine
    }
  }

  /**
   * Copy .mcp.json configuration file if it exists in the template
   */
  async copyMCPConfig(templatePath: string, projectPath: string, filesCreated: string[]): Promise<void> {
    const mcpSourcePath = path.join(templatePath, '.mcp.json');
    const mcpDestPath = path.join(projectPath, '.mcp.json');

    try {
      // Check if .mcp.json exists in the template
      await fs.access(mcpSourcePath);

      // Copy the file to project root
      await fs.copyFile(mcpSourcePath, mcpDestPath);
      filesCreated.push(mcpDestPath);
    } catch (error) {
      // .mcp.json doesn't exist in template, which is fine - not all templates need MCP
      // No error should be thrown, just skip silently
    }
  }

  /**
   * Copy scripts based on the selected script type
   */
  async copyScripts(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    const scriptsSourceDir = path.join(this.templateBasePath, 'scripts');
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
   * Copy memory files to destination directory
   */
  async copyMemoryFiles(memoryDestDir: string, filesCreated: string[]): Promise<void> {
    const memorySourceDir = path.join(this.templateBasePath, 'memory');

    try {
      // Check if memory directory exists
      await fs.access(memorySourceDir);
      await fs.mkdir(memoryDestDir, { recursive: true });

      const memoryFiles = await fs.readdir(memorySourceDir);

      for (const memoryFile of memoryFiles) {
        const sourcePath = path.join(memorySourceDir, memoryFile);
        const destPath = path.join(memoryDestDir, memoryFile);

        const stat = await fs.stat(sourcePath);
        if (stat.isFile()) {
          await fs.copyFile(sourcePath, destPath);
          filesCreated.push(destPath);
        }
      }
    } catch {
      // Memory directory doesn't exist, which is fine
    }
  }

  /**
   * Copy base template files to .specify/templates directory
   */
  async copyBaseTemplates(templatesDir: string, filesCreated: string[]): Promise<void> {
    // Copy template files directly from template directory (not commands subdirectory)
    const templateFiles = [
      'roadmap-template.md',
      'spec-template.md',
      'plan-template.md',
      'tasks-template.md'
    ];

    await fs.mkdir(templatesDir, { recursive: true });

    for (const templateFile of templateFiles) {
      const sourcePath = path.join(this.templateBasePath, templateFile);
      const destPath = path.join(templatesDir, templateFile);

      try {
        await fs.copyFile(sourcePath, destPath);
        filesCreated.push(destPath);
      } catch {
        // Template file doesn't exist, which is fine - skip it
      }
    }
  }

  /**
   * Create .specify directory structure with common content
   */
  async createSpecifyDirectory(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    const specifyDir = path.join(config.projectPath, '.specify');
    await fs.mkdir(specifyDir, { recursive: true });

    // Create templates subdirectory with base templates
    const templatesDir = path.join(specifyDir, 'templates');
    await this.copyBaseTemplates(templatesDir, filesCreated);

    // Create scripts subdirectory with scripts
    await this.copyScripts(config, filesCreated);

    // Create memory subdirectory with memory files
    const memoryDir = path.join(specifyDir, 'memory');
    await this.copyMemoryFiles(memoryDir, filesCreated);
  }

  /**
   * Replace placeholders in content with actual values
   */
  private replacePlaceholders(content: string, config: TemplateGenerationConfig): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const replacements: Record<string, string> = {
      '{{PROJECT_NAME}}': config.projectName,
      '{{AI_ASSISTANT}}': config.aiAssistant,
      '{{SCRIPT_TYPE}}': config.scriptType,
      '{{DATE}}': dateStr,
      '{{YEAR}}': now.getFullYear().toString(),
      '[项目名称]': config.projectName,
      '[Project Name]': config.projectName,
      '[创建时间]': dateStr,
      '[Creation Date]': dateStr
    };

    let result = content;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }

    return result;
  }

  /**
   * Check if directory exists
   */
  async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}