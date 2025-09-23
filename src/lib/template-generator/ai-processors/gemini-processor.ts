/**
 * Gemini AI Processor
 *
 * Handles Gemini-specific file generation:
 * - .gemini/commands/ directory with .toml files
 * - .gemini-config.json configuration file
 */

import { promises as fs } from 'fs';
import path from 'path';
import { BaseAIProcessor } from './base-ai-processor';
import { TemplateGenerationConfig } from '../../template-generator';

export class GeminiProcessor extends BaseAIProcessor {
  getDirectoryName(): string {
    return '.gemini';
  }

  async generateCommands(config: TemplateGenerationConfig, filesCreated: string[], templatePath?: string): Promise<void> {
    const geminiDir = path.join(config.projectPath, '.gemini');
    const commandsDir = path.join(geminiDir, 'commands');

    await this.ensureDirectory(commandsDir);

    const commandFiles = await this.getCommandFiles(templatePath);

    for (const commandFile of commandFiles) {
      const commandName = path.basename(commandFile, '.md');
      const content = await this.generateCommandFile(commandName, config, templatePath);

      // Content is already converted to TOML format in base class
      const destPath = path.join(commandsDir, `${commandName}.toml`);
      await fs.writeFile(destPath, content, 'utf8');
      filesCreated.push(destPath);
    }
  }

  async generateConfig(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    const configPath = path.join(config.projectPath, '.gemini-config.json');

    const configContent = {
      version: "1.0",
      projectName: config.projectName,
      description: `ROD project initialized with Gemini assistant`,
      workingDirectory: ".",
      commands: {
        directory: ".gemini/commands",
        format: "toml"
      },
      rules: [
        "严格按照ROD(Rule-Oriented Development)方法论工作",
        "始终基于项目规格文件进行开发",
        "确保代码实现与规格文档的一致性",
        "使用.rod目录中的模板和工具",
        "遵循项目的代码规范和架构设计"
      ],
      templates: {
        directory: ".rod/spec-templates"
      },
      scripts: {
        directory: ".rod/scripts"
      },
      memory: {
        directory: ".rod/memory"
      },
      gemini: {
        model: "gemini-pro",
        temperature: 0.1,
        maxTokens: 4096
      }
    };

    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2), 'utf8');
    filesCreated.push(configPath);
  }
}