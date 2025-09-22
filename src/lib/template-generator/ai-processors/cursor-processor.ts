/**
 * Cursor AI Processor
 *
 * Handles Cursor-specific file generation:
 * - .cursor/commands/ directory with .md files
 * - No separate configuration file needed
 */

import { promises as fs } from 'fs';
import path from 'path';
import { BaseAIProcessor } from './base-ai-processor';
import { TemplateGenerationConfig } from '../../template-generator';

export class CursorProcessor extends BaseAIProcessor {
  getDirectoryName(): string {
    return '.cursor';
  }

  async generateCommands(config: TemplateGenerationConfig, filesCreated: string[], templatePath?: string): Promise<void> {
    const cursorDir = path.join(config.projectPath, '.cursor');
    const commandsDir = path.join(cursorDir, 'commands');

    await this.ensureDirectory(commandsDir);

    const commandFiles = await this.getCommandFiles(templatePath);

    for (const commandFile of commandFiles) {
      const commandName = path.basename(commandFile, '.md');
      const content = await this.generateCommandFile(commandName, config, templatePath);

      const destPath = path.join(commandsDir, commandFile);
      await fs.writeFile(destPath, content, 'utf8');
      filesCreated.push(destPath);
    }
  }

  async generateConfig(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    // Cursor doesn't require a separate configuration file
    // Commands in .cursor/commands/ are automatically detected
  }
}