/**
 * Local Template Generator
 * 
 * Generates project templates locally based on user configuration
 * instead of downloading from GitHub
 */

import { promises as fs } from 'fs';
import path from 'path';
import { AIAssistant, ScriptType, WorkflowMode } from '../types/cli-config';
import { NPMTemplateManager, NPMTemplateConfig, createNPMTemplateManager } from './npm-template-manager';

export interface TemplateGenerationConfig {
  aiAssistant: AIAssistant;
  scriptType: ScriptType;
  workflowMode: WorkflowMode;
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

  constructor(packageRoot?: string, npmRegistry?: string) {
    // Templates are stored in the npm package under templates/
    this.templateBasePath = packageRoot || path.join(__dirname, '../../templates');
    // Internal templates path (updated structure) - for backward compatibility
    this.internalTemplatePath = path.join(__dirname, '../../packages/internal-templates');
    // NPM template manager for dynamic template installation
    this.npmTemplateManager = createNPMTemplateManager(npmRegistry);
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
   * Validate if a template exists in NPM cache
   */
  private async validateTemplate(templateName: string): Promise<boolean> {
    // Check if NPM template is available
    return await this.npmTemplateManager.isTemplateAvailable(templateName);
  }

  /**
   * Get the template base path for a specific template
   */
  private async getTemplateBasePath(templateName?: string): Promise<string> {
    if (!templateName) {
      return this.templateBasePath;
    }

    // Check if it's an NPM template
    const isTemplateAvailable = await this.npmTemplateManager.isTemplateAvailable(templateName);
    if (isTemplateAvailable) {
      return await this.npmTemplateManager.getTemplatePath(templateName);
    }

    // Default to standard template path
    return this.templateBasePath;
  }

  /**
   * Ensure NPM template is installed if needed
   */
  private async ensureNPMTemplate(templateName: string): Promise<void> {
    // Check if template is already installed locally
    const isInstalled = await this.npmTemplateManager.isTemplateAvailable(templateName);

    if (!isInstalled) {
      // Try to install from NPM
      const npmConfig: NPMTemplateConfig = {
        templateName,
        // Use default package naming convention: @tencent/rod-templates-{templateName}
      };

      const result = await this.npmTemplateManager.ensureTemplate(npmConfig);

      if (!result.success) {
        throw new Error(`Failed to install template '${templateName}': ${result.errors.join(', ')}`);
      }
    }
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
   * Generate from internal template
   */
  private async generateFromInternalTemplate(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    // Get NPM template path from NPM template manager
    const templatePath = await this.npmTemplateManager.getTemplatePath(config.templateName!);

    // Copy entire internal template structure (excluding commands, scripts, memory - these are handled separately)
    await this.copyDirectoryRecursive(templatePath, config.projectPath, filesCreated, ['commands', 'scripts', 'memory']);

    // Process template variables in copied files
    await this.processTemplateVariables(config, filesCreated);

    // Generate .specify directory with internal template specific content
    await this.generateInternalTemplateSpecifyDirectory(config, filesCreated);

    // Generate AI-specific command files from internal template commands
    await this.generateInternalTemplateAICommands(config, filesCreated);

    // Generate AI-specific configuration files
    await this.generateInternalTemplateAIConfigFile(config, filesCreated);
  }

  /**
   * Generate default template (existing behavior)
   */
  private async generateDefaultTemplate(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    // 1. Create .specify directory for common content
    await this.createSpecifyDirectory(config, filesCreated);

    // 2. Generate AI-specific command files (in AI-specific directory)
    await this.generateAICommands(config, filesCreated);

    // 3. Generate AI-specific configuration files
    await this.generateAIConfig(config, filesCreated);

    // 4. Generate workflow-specific content based on mode
    if (config.workflowMode === WorkflowMode.ROADMAP) {
      await this.generateRoadmapWorkflow(config, filesCreated);
    }
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectoryRecursive(sourceDir: string, destDir: string, filesCreated: string[], excludeDirs: string[] = []): Promise<void> {
    const entries = await fs.readdir(sourceDir);

    for (const entry of entries) {
      // Skip excluded directories
      if (excludeDirs.includes(entry)) {
        continue;
      }

      const sourcePath = path.join(sourceDir, entry);
      const destPath = path.join(destDir, entry);

      const stat = await fs.stat(sourcePath);

      if (stat.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        await this.copyDirectoryRecursive(sourcePath, destPath, filesCreated, excludeDirs);
      } else {
        await fs.copyFile(sourcePath, destPath);
        filesCreated.push(destPath);
      }
    }
  }

  /**
   * Process template variables in copied files
   */
  private async processTemplateVariables(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    // Process markdown, text, and source code files for variable replacement
    for (const filePath of filesCreated) {
      if (filePath.endsWith('.md') || filePath.endsWith('.txt') || filePath.endsWith('.json') ||
          filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.yml') ||
          filePath.endsWith('.yaml') || filePath.endsWith('.tsx') || filePath.endsWith('.html') ||
          filePath.endsWith('.scss')) {
        try {
          let content = await fs.readFile(filePath, 'utf8');

          // Replace common variables
          content = content.replace(/\{\{PROJECT_NAME\}\}/g, config.projectName);
          content = content.replace(/\{\{AI_ASSISTANT\}\}/g, config.aiAssistant);
          content = content.replace(/\{\{SCRIPT_TYPE\}\}/g, config.scriptType);

          await fs.writeFile(filePath, content, 'utf8');
        } catch (error) {
          // Skip files that can't be processed as text
        }
      }
    }
  }

  /**
   * Generate .specify directory with internal template specific content
   */
  private async generateInternalTemplateSpecifyDirectory(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    const specifyDir = path.join(config.projectPath, '.specify');
    await fs.mkdir(specifyDir, { recursive: true });

    // Copy templates directory from internal template (now at root level)
    const templateBasePath = await this.npmTemplateManager.getTemplatePath(config.templateName!);
    const internalTemplatesDir = path.join(templateBasePath, 'templates');
    const projectTemplatesDir = path.join(specifyDir, 'templates');

    if (await this.directoryExists(internalTemplatesDir)) {
      await fs.mkdir(projectTemplatesDir, { recursive: true });
      await this.copyDirectoryRecursive(internalTemplatesDir, projectTemplatesDir, filesCreated);
    } else {
      // Fallback to base templates if internal template doesn't have templates
      await this.copyBaseTemplates(projectTemplatesDir, filesCreated);
    }

    // Copy memory files from internal template if they exist, otherwise use default
    const internalMemoryDir = path.join(templateBasePath, 'memory');
    const projectMemoryDir = path.join(specifyDir, 'memory');

    if (await this.directoryExists(internalMemoryDir)) {
      await fs.mkdir(projectMemoryDir, { recursive: true });
      await this.copyDirectoryRecursive(internalMemoryDir, projectMemoryDir, filesCreated);
    } else {
      // Copy memory files from default template (shared across all templates)
      await this.copyMemoryFiles(projectMemoryDir, filesCreated);
    }

    // Copy scripts from internal template if they exist, otherwise use default
    await this.copyInternalScripts(config, filesCreated);
  }

  /**
   * Copy scripts from internal template if available, otherwise use default
   */
  private async copyInternalScripts(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    const scriptsDestDir = path.join(config.projectPath, '.specify', 'scripts');
    const templateBasePath = await this.npmTemplateManager.getTemplatePath(config.templateName!);
    const internalScriptsDir = path.join(templateBasePath, 'scripts');

    if (await this.directoryExists(internalScriptsDir)) {
      // Copy scripts from internal template
      const scriptSubdir = config.scriptType === ScriptType.BASH ? 'bash' : 'powershell';
      const sourceDir = path.join(internalScriptsDir, scriptSubdir);
      const destDir = path.join(scriptsDestDir, scriptSubdir);

      if (await this.directoryExists(sourceDir)) {
        await fs.mkdir(destDir, { recursive: true });
        await this.copyDirectoryRecursive(sourceDir, destDir, filesCreated);

        // Set executable permissions for bash scripts on Unix systems
        if (config.scriptType === ScriptType.BASH && process.platform !== 'win32') {
          const scriptFiles = await fs.readdir(destDir);
          for (const scriptFile of scriptFiles) {
            const scriptPath = path.join(destDir, scriptFile);
            await fs.chmod(scriptPath, 0o755);
          }
        }
      } else {
        // Fall back to default scripts
        await this.copyScripts(config, filesCreated);
      }
    } else {
      // Copy scripts based on script type from default location
      await this.copyScripts(config, filesCreated);
    }
  }

  /**
   * Generate AI-specific commands from internal template commands
   */
  private async generateInternalTemplateAICommands(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    // Create AI-specific directory and commands
    const aiDir = this.getAIDirectoryName(config.aiAssistant);
    const commandsSubdir = config.aiAssistant === AIAssistant.COPILOT ? 'prompts' : 'commands';
    const commandsDir = path.join(config.projectPath, aiDir, commandsSubdir);
    await fs.mkdir(commandsDir, { recursive: true });

    // Get internal template commands (now at root level)
    const templateBasePath = await this.npmTemplateManager.getTemplatePath(config.templateName!);
    const internalCommandsDir = path.join(templateBasePath, 'commands');

    if (await this.directoryExists(internalCommandsDir)) {
      const commandFiles = await fs.readdir(internalCommandsDir);

      for (const commandFile of commandFiles) {
        if (commandFile.endsWith('.md')) {
          const commandName = commandFile.replace('.md', '');
          const sourcePath = path.join(internalCommandsDir, commandFile);
          let content = await fs.readFile(sourcePath, 'utf8');

          // Replace placeholders
          content = this.replacePlaceholders(content, config);

          // Convert to AI-specific format
          content = this.convertToAIFormat(content, config.aiAssistant);

          // Generate filename based on AI assistant
          let filename: string;
          switch (config.aiAssistant) {
            case AIAssistant.GEMINI:
              filename = `${commandName}.toml`;
              break;
            case AIAssistant.COPILOT:
              filename = `${commandName}.prompt.md`;
              break;
            default: // CLAUDE, CURSOR, CODEBUDDY
              filename = `${commandName}.md`;
              break;
          }

          const destPath = path.join(commandsDir, filename);
          await fs.writeFile(destPath, content, 'utf8');
          filesCreated.push(destPath);
        }
      }
    }
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Generate internal template specific commands
   */
  private async generateInternalTemplateCommands(config: TemplateGenerationConfig, commandsDir: string, filesCreated: string[]): Promise<void> {
    let commands: string[] = [];

    // Define commands based on template type
    switch (config.templateName) {
      case 'pui':
        commands = ['component', 'page', 'optimize'];
        break;
      case 'mm-api':
        commands = ['api-design'];
        break;
      default:
        commands = ['component', 'page']; // default commands
    }

    for (const command of commands) {
      const commandContent = await this.generateInternalTemplateCommandFile(command, config);

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
   * Generate internal template command file content
   */
  private async generateInternalTemplateCommandFile(command: string, config: TemplateGenerationConfig): Promise<string> {
    // For PUI template, use the pre-created command files
    if (config.templateName === 'pui') {
      const commandTemplates: { [key: string]: string } = {
        component: this.getPUIComponentCommand(),
        page: this.getPUIPageCommand(),
        optimize: this.getPUIOptimizeCommand()
      };

      let content = commandTemplates[command] || commandTemplates.component;

      // Replace placeholders
      content = this.replacePlaceholders(content, config);

      // Convert to AI-specific format
      content = this.convertToAIFormat(content, config.aiAssistant);

      return content;
    }

    // For other templates, generate basic commands
    return this.generateBasicInternalCommand(command, config);
  }

  /**
   * Generate AI-specific config file for internal templates
   */
  private async generateInternalTemplateAIConfigFile(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    switch (config.aiAssistant) {
      case AIAssistant.CLAUDE:
        await this.generateInternalClaudeConfig(config, filesCreated);
        break;
      case AIAssistant.GEMINI:
        await this.generateInternalGeminiConfig(config, filesCreated);
        break;
      // Other AI assistants don't need additional config files
    }
  }

  /**
   * Generate Claude config for internal templates
   */
  private async generateInternalClaudeConfig(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    const claudeConfig = {
      assistant: 'claude',
      scriptType: config.scriptType,
      features: {
        specDriven: true,
        fileOperations: true,
        codeGeneration: true
      },
      internal: {
        template: config.templateName,
        organization: 'tencent'
      }
    };

    const configPath = path.join(config.projectPath, '.claude-config.json');
    await fs.writeFile(configPath, JSON.stringify(claudeConfig, null, 2), 'utf8');
    filesCreated.push(configPath);
  }

  /**
   * Generate Gemini config for internal templates
   */
  private async generateInternalGeminiConfig(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    const geminiConfig = {
      assistant: 'gemini',
      scriptType: config.scriptType,
      specDriven: true,
      internal: {
        template: config.templateName,
        organization: 'tencent'
      }
    };

    const configPath = path.join(config.projectPath, '.gemini-config.json');
    await fs.writeFile(configPath, JSON.stringify(geminiConfig, null, 2), 'utf8');
    filesCreated.push(configPath);
  }

  /**
   * Get PUI component command template
   */
  private getPUIComponentCommand(): string {
    return `---
description: 基于腾讯 PUI 组件库开发 React 组件，提供完整的组件实现和文档
---

在当前项目中创建符合 PUI 设计规范的 React 组件，提供完整的组件代码、类型定义和使用示例。

**适配 PUI 组件库：基于腾讯内部 PUI 设计系统进行组件开发**

执行步骤：

1. 分析用户提供的组件需求：{ARGS}
2. 确定组件类型和功能特性：
   - 基础组件：Button, Input, Select, Checkbox, Radio, Switch
   - 布局组件：Layout, Grid, Space, Divider
   - 导航组件：Menu, Breadcrumb, Pagination, Steps
   - 数据展示：Table, List, Card, Collapse, Tooltip
   - 反馈组件：Alert, Message, Modal, Drawer, Progress
   - 表单组件：Form, DatePicker, TimePicker, Upload, Cascader

3. 检查项目结构，确保在 src/components/ 目录中创建组件
4. 生成完整的组件实现：
   - 创建组件主文件 (index.tsx)
   - 定义 TypeScript 接口和类型
   - 实现响应式样式 (index.module.scss)
   - 编写组件文档 (README.md)

**PUI 组件开发原则**：
- 遵循腾讯 PUI 设计系统规范
- 使用 TypeScript 确保类型安全
- 支持主题定制和国际化
- 提供完整的组件文档和示例

**完成组件开发后的指导：**

**✅ PUI 组件开发完成！**

**下一步建议：**
- 在项目中导入并使用新组件
- 运行 \`npm test\` 确保组件测试通过
- 检查组件是否符合 PUI 设计规范
- 考虑是否需要添加到组件库文档中`;
  }

  /**
   * Get PUI page command template
   */
  private getPUIPageCommand(): string {
    return `---
description: 基于腾讯 PUI 组件库开发完整的前端页面，包括布局、状态管理和用户交互
---

在当前项目中创建符合 PUI 设计规范的完整前端页面，包括页面布局、数据流、状态管理和用户交互功能。

**适配 PUI 前端架构：基于 React + PUI + Zustand 技术栈进行页面开发**

执行步骤：

1. 分析用户提供的页面需求：{ARGS}
2. 确定页面类型和功能特性：
   - 列表页面：数据表格、搜索筛选、分页处理
   - 详情页面：信息展示、标签页切换、操作按钮
   - 表单页面：表单验证、分步骤表单、文件上传
   - 数据可视化：图表展示、实时数据、交互操作

3. 检查项目结构，在 src/components/pages/ 目录中创建页面组件
4. 生成完整的页面实现：
   - 创建页面组件 (PageName/index.tsx)
   - 设计 Zustand 状态管理 (stores/pageStore.ts)
   - 实现 API 服务层 (services/pageService.ts)
   - 配置页面样式 (PageName/index.module.scss)

**PUI 页面开发原则**：
- 遵循腾讯 PUI 设计系统的布局规范
- 使用响应式设计适配不同屏幕尺寸
- 实现友好的加载和错误状态提示
- 确保页面的可访问性和性能优化

**完成页面开发后的指导：**

**✅ PUI 页面开发完成！**

**下一步建议：**
- 配置页面路由 (React Router)
- 运行 \`npm run dev\` 预览页面效果
- 测试页面在不同屏幕尺寸下的表现
- 检查页面的加载性能和用户体验`;
  }

  /**
   * Get PUI optimize command template
   */
  private getPUIOptimizeCommand(): string {
    return `---
description: 全面优化基于腾讯 PUI 组件库的前端项目，提升性能、代码质量和用户体验
---

分析并优化当前 PUI 前端项目，提供性能优化、代码质量改进和用户体验提升的具体实施方案。

**适配 PUI 前端优化：基于 React + PUI + Vite 技术栈的全面优化策略**

执行步骤：

1. 分析用户提供的优化需求和现状：{ARGS}
2. 诊断项目中的潜在问题：
   - 性能瓶颈：组件渲染、打包体积、加载速度
   - 代码质量：TypeScript 类型、组件设计、重复代码
   - 用户体验：加载状态、错误处理、响应式设计
   - 构建优化：Vite 配置、代码分割、资源优化

3. 检查项目结构和配置文件
4. 提供针对性的优化方案：
   - 性能优化实现代码
   - 构建配置优化
   - 代码重构建议
   - 用户体验改进方案

**PUI 项目优化重点**：
- 基于 PUI 组件库的性能最佳实践
- Zustand 状态管理优化策略
- Vite 构建工具配置优化
- TypeScript 严格模式和类型安全

**完成项目优化后的指导：**

**✅ PUI 项目优化完成！**

**下一步建议：**
- 运行 \`npm run build\` 检查打包体积
- 使用 \`npm run preview\` 测试生产版本性能
- 执行 \`npm run lint\` 确保代码质量
- 运行性能测试工具验证优化效果`;
  }

  /**
   * Generate basic internal command for non-PUI templates
   */
  private generateBasicInternalCommand(command: string, config: TemplateGenerationConfig): string {
    return `---
description: ${config.templateName} 模板的 ${command} 命令
---

基于 ${config.templateName} 模板执行 ${command} 相关操作。

执行步骤：

1. 分析用户需求：{ARGS}
2. 基于 ${config.templateName} 模板特性进行处理
3. 生成相应的代码和文档

**完成后的指导：**

**✅ 操作完成！**

**下一步建议：**
- 检查生成的代码是否符合预期
- 运行相关测试确保功能正常
- 根据需要进行进一步调整`;
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
      'roadmap-template.md',
      'spec-template.md',
      'plan-template.md',
      'tasks-template.md'
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

    // Choose commands based on workflow mode
    const commands = config.workflowMode === WorkflowMode.ROADMAP
      ? ['module', 'specify', 'plan', 'tasks', 'progress']
      : ['specify', 'plan', 'tasks'];
    
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
      
      // Templates already have correct .specify/ paths, no script reference updates needed

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

    const scriptPath = scriptPathMatch[1].trim();
    
    // Script path is already in .specify format from template, no conversion needed
    
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
    // Since templates already use .specify/ prefix, no additional rewriting needed
    return content;
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
  private convertToTomlFormat(content: string, _aiAssistant: AIAssistant): string {
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
    const memorySourceDir = path.join(this.templateBasePath, 'memory');
    
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

  /**
   * Generate roadmap workflow structure
   */
  private async generateRoadmapWorkflow(config: TemplateGenerationConfig, filesCreated: string[]): Promise<void> {
    const specsDir = path.join(config.projectPath, 'specs');
    await fs.mkdir(specsDir, { recursive: true });

    // Create initial roadmap from template
    const roadmapSourcePath = path.join(this.templateBasePath, 'roadmap-template.md');
    const roadmapDestPath = path.join(specsDir, 'roadmap.md');
    
    try {
      let roadmapContent = await fs.readFile(roadmapSourcePath, 'utf8');
      
      // Replace project name placeholder
      roadmapContent = roadmapContent.replace(/\[项目名称\]/g, config.projectName);
      roadmapContent = roadmapContent.replace(/\[Project Name\]/g, config.projectName);
      
      // Add creation timestamp
      const now = new Date().toISOString().split('T')[0];
      roadmapContent = roadmapContent.replace(/\[创建时间\]/g, now);
      roadmapContent = roadmapContent.replace(/\[Creation Date\]/g, now);
      
      await fs.writeFile(roadmapDestPath, roadmapContent, 'utf8');
      filesCreated.push(roadmapDestPath);
    } catch (error) {
      throw new Error(`Failed to generate roadmap: ${(error as Error).message}`);
    }

    // Create modules directory structure
    const modulesDir = path.join(specsDir, 'modules');
    await fs.mkdir(modulesDir, { recursive: true });
    filesCreated.push(modulesDir);
    
    // Create README for modules directory
    const modulesReadmeContent = `# 模块目录\n\n此目录包含项目的各个模块规范。每个模块应包含以下文件：\n\n- \`spec.md\` - 规格说明\n- \`plan.md\` - 设计文档\n- \`tasks.md\` - 任务清单\n\n## 模块结构\n\n模块可以是递归的，即模块内可以包含子模块，通过 \`modules/\` 子目录实现。\n\n## 使用说明\n\n1. 使用 \`/module <模块名>\` 创建新模块\n2. 使用 \`/specify\` 分析规格\n3. 使用 \`/plan\` 生成设计文档\n4. 使用 \`/tasks\` 创建任务清单\n5. 使用 \`/progress\` 同步进度到roadmap\n`;
    
    const modulesReadmePath = path.join(modulesDir, 'README.md');
    await fs.writeFile(modulesReadmePath, modulesReadmeContent, 'utf8');
    filesCreated.push(modulesReadmePath);
  }

}

// Utility function
export function createLocalTemplateGenerator(packageRoot?: string, npmRegistry?: string): LocalTemplateGenerator {
  return new LocalTemplateGenerator(packageRoot, npmRegistry);
}