/**
 * Claude AI Processor
 *
 * Handles Claude-specific file generation:
 * - .claude/commands/ directory with .md files
 * - .claude-config.json configuration file
 */

import { promises as fs } from 'fs';
import path from 'path';
import { BaseAIProcessor } from './base-ai-processor';
import { TemplateGenerationConfig } from '../../template-generator';

export class ClaudeProcessor extends BaseAIProcessor {
  getDirectoryName(): string {
    return '.claude';
  }

  async generateCommands(config: TemplateGenerationConfig, filesCreated: string[], templatePath?: string): Promise<void> {
    const claudeDir = path.join(config.projectPath, '.claude');
    const commandsDir = path.join(claudeDir, 'commands');

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
    const configPath = path.join(config.projectPath, '.claude-config.json');

    const configContent = {
      version: "1.0",
      projectName: config.projectName,
      description: `ROD project initialized with Claude assistant`,
      workingDirectory: ".",
      commands: {
        directory: ".claude/commands"
      },
      rules: [
        "严格按照ROD(Rule-Oriented Development)方法论工作",
        "始终基于项目规格文件进行开发",
        "确保代码实现与规格文档的一致性",
        "使用.specify目录中的模板和工具",
        "遵循项目的代码规范和架构设计"
      ],
      templates: {
        directory: ".specify/templates"
      },
      scripts: {
        directory: ".specify/scripts"
      },
      memory: {
        directory: ".specify/memory"
      }
    };

    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2), 'utf8');
    filesCreated.push(configPath);
  }
}