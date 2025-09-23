/**
 * Base AI Processor
 *
 * Abstract base class for all AI-specific processors.
 * Provides common functionality and defines the interface that
 * all AI processors must implement.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { AIAssistant, ScriptType } from '../../../types/cli-config';
import { TemplateGenerationConfig } from '../../template-generator';

export abstract class BaseAIProcessor {
  constructor(protected readonly templateBasePath: string) {}

  /**
   * Generate AI-specific command files
   * Must be implemented by each AI processor
   */
  abstract generateCommands(config: TemplateGenerationConfig, filesCreated: string[], templatePath?: string): Promise<void>;

  /**
   * Generate AI-specific configuration files
   * Must be implemented by each AI processor
   */
  abstract generateConfig(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void>;

  /**
   * Get the directory name for this AI assistant
   */
  abstract getDirectoryName(): string;

  /**
   * Get AI-specific command files from templates or internal template
   */
  protected async getCommandFiles(templatePath?: string): Promise<string[]> {
    const commandsDir = templatePath
      ? path.join(templatePath, 'commands')
      : path.join(this.templateBasePath, 'commands');

    try {
      const files = await fs.readdir(commandsDir);
      return files.filter(file => file.endsWith('.md'));
    } catch {
      return [];
    }
  }

  /**
   * Generate command file content with AI-specific formatting
   */
  protected async generateCommandFile(command: string, config: TemplateGenerationConfig, templatePath?: string): Promise<string> {
    const commandPath = templatePath
      ? path.join(templatePath, 'commands', `${command}.md`)
      : path.join(this.templateBasePath, 'commands', `${command}.md`);

    try {
      let content = await fs.readFile(commandPath, 'utf8');

      // Clean frontmatter
      content = this.cleanFrontmatter(content);

      // Replace placeholders
      content = this.replacePlaceholders(content, config);

      // Replace script placeholders
      content = this.replaceScriptPlaceholder(content, config.scriptType);

      // Add AI-specific metadata and instructions
      content = this.addAIMetadata(content, config.aiAssistant);

      // Convert to AI-specific format
      content = this.convertToAIFormat(content, config.aiAssistant);

      return content;
    } catch (error) {
      throw new Error(`Failed to generate ${command} command: ${(error as Error).message}`);
    }
  }

  /**
   * Replace placeholders in content with actual values
   */
  protected replacePlaceholders(content: string, config: TemplateGenerationConfig): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const replacements: Record<string, string> = {
      '{{PROJECT_NAME}}': config.projectName,
      '{{AI_ASSISTANT}}': config.aiAssistant,
      '{{SCRIPT_TYPE}}': config.scriptType,
      '{{DATE}}': dateStr,
      '{{YEAR}}': now.getFullYear().toString()
    };

    let result = content;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }

    return result;
  }

  /**
   * Replace script type placeholder with actual script extension
   */
  protected replaceScriptPlaceholder(content: string, scriptType: ScriptType): string {
    // Always use Node.js scripts (.js extension)
    return content.replace(/\{\{SCRIPT_EXT\}\}/g, 'js');
  }

  /**
   * Clean frontmatter from content
   */
  protected cleanFrontmatter(content: string): string {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    return content.replace(frontmatterRegex, '');
  }

  /**
   * Add AI-specific metadata to content
   */
  protected addAIMetadata(content: string, aiAssistant: AIAssistant): string {
    const instructions = this.getAIInstructions(aiAssistant);
    return `${instructions}\n\n${content}`;
  }

  /**
   * Get AI-specific instructions
   */
  protected getAIInstructions(aiAssistant: AIAssistant): string {
    const baseInstructions = `您是一个专业的软件开发助手，专门协助基于规格驱动的开发工作流程。`;

    switch (aiAssistant) {
      case AIAssistant.CLAUDE:
        return `${baseInstructions}\n\n请严格按照ROD(Rule-Oriented Development)方法论工作，始终基于项目规格和现有代码进行分析和开发。`;

      case AIAssistant.COPILOT:
        return `${baseInstructions}\n\n# GitHub Copilot Instructions\n请遵循ROD开发流程，确保代码质量和规格一致性。`;

      case AIAssistant.GEMINI:
        return `${baseInstructions}\n\n使用ROD方法论，专注于规格分析和代码实现的一致性。`;

      case AIAssistant.CURSOR:
        return `${baseInstructions}\n\n遵循ROD工作流，确保每个开发步骤都有明确的规格支持。`;

      case AIAssistant.CODEBUDDY:
        return `${baseInstructions}\n\n采用ROD开发模式，注重规格驱动的开发过程。`;

      default:
        return baseInstructions;
    }
  }

  /**
   * Convert content to AI-specific format
   */
  protected convertToAIFormat(content: string, aiAssistant: AIAssistant): string {
    switch (aiAssistant) {
      case AIAssistant.GEMINI:
        return this.convertToTomlFormat(content);
      default:
        return content; // Markdown format for others
    }
  }

  /**
   * Convert markdown content to TOML format for Gemini
   */
  protected convertToTomlFormat(content: string): string {
    // Extract title and content
    const titleMatch = content.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1] : 'Command';

    // Remove title from content
    const bodyContent = content.replace(/^#\s+.+$/m, '').trim();

    return `[command]
name = "${title}"
description = "${title}"

[content]
text = """
${bodyContent}
"""`;
  }

  /**
   * Get argument format for AI assistant
   */
  protected getArgumentFormat(aiAssistant: AIAssistant): string {
    switch (aiAssistant) {
      case AIAssistant.COPILOT:
        return '<arguments>';
      default:
        return '[arguments]';
    }
  }

  /**
   * Rewrite paths to use .specify directory
   */
  protected rewritePaths(content: string): string {
    // Rewrite paths to point to .specify directory
    content = content.replace(/specs\//g, '.specify/templates/');
    content = content.replace(/templates\//g, '.specify/templates/');
    content = content.replace(/scripts\//g, '.specify/scripts/');
    content = content.replace(/memory\//g, '.specify/memory/');

    return content;
  }

  /**
   * Create directory if it doesn't exist
   */
  protected async ensureDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  /**
   * Check if directory exists
   */
  protected async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}