/**
 * GitHub Copilot Processor
 *
 * Handles GitHub Copilot-specific file generation:
 * - .github/prompts/ directory with .prompt.md files
 */

import { promises as fs } from 'fs';
import path from 'path';
import { BaseAIProcessor } from './base-ai-processor';
import { TemplateGenerationConfig } from '../../template-generator';

export class CopilotProcessor extends BaseAIProcessor {
  getDirectoryName(): string {
    return '.github';
  }

  async generateCommands(config: TemplateGenerationConfig, filesCreated: string[], templatePath?: string): Promise<void> {
    const githubDir = path.join(config.projectPath, '.github');
    const promptsDir = path.join(githubDir, 'prompts');

    await this.ensureDirectory(promptsDir);

    const commandFiles = await this.getCommandFiles(templatePath);

    for (const commandFile of commandFiles) {
      const commandName = path.basename(commandFile, '.md');
      let content = await this.generateCommandFile(commandName, config, templatePath);

      // Convert to Copilot prompt format
      content = this.convertToCopilotFormat(content);

      const destPath = path.join(promptsDir, `${commandName}.prompt.md`);
      await fs.writeFile(destPath, content, 'utf8');
      filesCreated.push(destPath);
    }
  }

  async generateConfig(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    // GitHub Copilot doesn't require a separate configuration file
    // The prompts in .github/prompts/ are automatically detected
  }

  /**
   * Convert content to Copilot-specific prompt format
   */
  private convertToCopilotFormat(content: string): string {
    // Add Copilot-specific prompt headers
    const promptHeader = `---
title: ROD Development Assistant
description: Assists with rule-oriented development workflow
authors:
  - ROD CLI
tags:
  - development
  - specifications
  - architecture
---

`;

    // Replace argument format for Copilot
    content = content.replace(/\[([^\]]+)\]/g, '<$1>');

    return promptHeader + content;
  }
}