/**
 * Codebuddy AI Processor
 *
 * Handles Codebuddy-specific file generation:
 * - .codebuddy/commands/ directory with .md files
 * - No separate configuration file needed
 */

import { promises as fs } from 'fs';
import path from 'path';
import { BaseAIProcessor } from './base-ai-processor';
import { TemplateGenerationConfig } from '../../template-generator';

export class CodebuddyProcessor extends BaseAIProcessor {
  getDirectoryName(): string {
    return '.codebuddy';
  }

  async generateCommands(config: TemplateGenerationConfig, filesCreated: string[], templatePath?: string): Promise<void> {
    const codebuddyDir = path.join(config.projectPath, '.codebuddy');
    const commandsDir = path.join(codebuddyDir, 'commands');

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
    // Codebuddy doesn't require a separate configuration file
    // Commands in .codebuddy/commands/ are automatically detected
  }
}