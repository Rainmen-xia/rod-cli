/**
 * UC-002: NPM模板首次安装使用 - Integration Test
 *
 * Tests the full workflow of first-time NPM template installation and usage
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { NPMTemplateManager, createNPMTemplateManager } from '@/lib/npm-template-manager';
import { LocalTemplateGenerator, createLocalTemplateGenerator } from '@/lib/template-generator';
import { AIAssistant, ScriptType, WorkflowMode } from '@/types/cli-config';

describe('UC-002: NPM Template First-time Installation', () => {
  let tempDir: string;
  let mockGlobalNodeModules: string;
  let npmTemplateManager: NPMTemplateManager;
  let templateGenerator: LocalTemplateGenerator;
  let originalNodeRoot: string;

  beforeAll(async () => {
    // Create temporary directory for testing
    tempDir = path.join(process.cwd(), 'temp-test-uc002');
    await fs.mkdir(tempDir, { recursive: true });

    // Create mock global node_modules directory
    mockGlobalNodeModules = path.join(tempDir, 'global-node-modules');
    await fs.mkdir(mockGlobalNodeModules, { recursive: true });

    // Store original npm root and override it
    try {
      originalNodeRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    } catch {
      originalNodeRoot = '/usr/local/lib/node_modules';
    }
  });

  afterAll(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    // Create fresh instances for each test
    npmTemplateManager = createNPMTemplateManager('https://mock-npm-registry.com');
    templateGenerator = createLocalTemplateGenerator();
  });

  describe('UC-002 Main Flow: First-time NPM Template Installation', () => {
    beforeEach(async () => {
      // Ensure template package is NOT installed (simulating first-time use)
      const templatePackagePath = path.join(mockGlobalNodeModules, '@tencent/rod-cli-templates');
      try {
        await fs.rm(templatePackagePath, { recursive: true, force: true });
      } catch {
        // Package doesn't exist - that's what we want
      }
    });

    test('Should detect NPM template package is not installed', async () => {
      // Mock npm root command to return our test directory
      const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
      mockExecSync.mockImplementation((...args: unknown[]) => {
        const command = args[0] as string;
        if (command === 'npm root -g') {
          return mockGlobalNodeModules;
        }
        throw new Error('Command not mocked');
      });

      const isInstalled = await npmTemplateManager.isTemplatePackageInstalled();
      expect(isInstalled).toBe(false);

      mockExecSync.mockRestore();
    });

    test('Should simulate global NPM package installation', async () => {
      // Create mock template package structure
      const templatePackagePath = path.join(mockGlobalNodeModules, '@tencent/rod-cli-templates');
      const puiTemplatePath = path.join(templatePackagePath, 'pui');

      await fs.mkdir(templatePackagePath, { recursive: true });
      await fs.mkdir(puiTemplatePath, { recursive: true });

      // Create package.json
      const packageJson = {
        name: '@tencent/rod-cli-templates',
        version: '1.0.0',
        description: 'ROD CLI Templates for internal use'
      };
      await fs.writeFile(
        path.join(templatePackagePath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create PUI template structure
      await createMockPUITemplate(puiTemplatePath);

      // Mock npm commands
      const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
      mockExecSync.mockImplementation((...args: unknown[]) => {
        const command = args[0] as string;
        if (command === 'npm root -g') {
          return mockGlobalNodeModules;
        }
        if (command.includes('npm install -g @tencent/rod-cli-templates')) {
          // Simulate successful installation (package already created above)
          return '';
        }
        throw new Error(`Unmocked command: ${command}`);
      });

      const installResult = await npmTemplateManager.installTemplatePackage({
        templateName: 'pui',
        registry: 'https://mock-npm-registry.com'
      });

      expect(installResult.success).toBe(true);
      expect(installResult.version).toBe('1.0.0');
      expect(installResult.templatePath).toContain('pui');
      expect(installResult.errors).toHaveLength(0);

      mockExecSync.mockRestore();
    });

    test('Should verify template availability after installation', async () => {
      // Setup mock installed package
      const templatePackagePath = path.join(mockGlobalNodeModules, '@tencent/rod-cli-templates');
      const puiTemplatePath = path.join(templatePackagePath, 'pui');

      await fs.mkdir(puiTemplatePath, { recursive: true });
      await createMockPUITemplate(puiTemplatePath);

      const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
      mockExecSync.mockReturnValue(mockGlobalNodeModules);

      const isAvailable = await npmTemplateManager.isTemplateAvailable('pui');
      expect(isAvailable).toBe(true);

      const availableTemplates = await npmTemplateManager.getAvailableTemplates();
      expect(availableTemplates).toContain('pui');

      mockExecSync.mockRestore();
    });

    test('Should generate project with PUI template commands', async () => {
      // Setup mock installed template
      const templatePackagePath = path.join(mockGlobalNodeModules, '@tencent/rod-cli-templates');
      const puiTemplatePath = path.join(templatePackagePath, 'pui');

      await fs.mkdir(puiTemplatePath, { recursive: true });
      await createMockPUITemplate(puiTemplatePath);

      const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
      mockExecSync.mockReturnValue(mockGlobalNodeModules);

      // Generate project with PUI template
      const projectPath = path.join(tempDir, 'test-pui-project');
      const result = await templateGenerator.generateTemplate({
        aiAssistant: AIAssistant.CLAUDE,
        scriptType: ScriptType.BASH,
        workflowMode: WorkflowMode.ROADMAP,
        projectPath,
        projectName: 'test-pui-project',
        templateName: 'pui'
      });

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Verify PUI-specific files were created
      const claudeCommandsDir = path.join(projectPath, '.claude', 'commands');
      expect(await fs.stat(claudeCommandsDir).then(s => s.isDirectory())).toBe(true);

      // Check for PUI-specific commands
      const componentCommand = path.join(claudeCommandsDir, 'component.md');
      const pageCommand = path.join(claudeCommandsDir, 'page.md');
      const optimizeCommand = path.join(claudeCommandsDir, 'optimize.md');

      expect(await fs.access(componentCommand).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(pageCommand).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(optimizeCommand).then(() => true).catch(() => false)).toBe(true);

      // Verify content of component command
      const componentContent = await fs.readFile(componentCommand, 'utf8');
      expect(componentContent).toContain('基于腾讯 PUI 组件库开发 React 组件');
      expect(componentContent).toContain('PUI 组件开发原则');

      mockExecSync.mockRestore();
    });
  });

  describe('UC-002 Error Scenarios', () => {
    test('Should handle NPM installation failure due to network issues', async () => {
      const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
      mockExecSync.mockImplementation((...args: unknown[]) => {
        const command = args[0] as string;
        if (command === 'npm root -g') {
          return mockGlobalNodeModules;
        }
        if (command.includes('npm install -g')) {
          throw new Error('ENETUNREACH: network is unreachable');
        }
        throw new Error(`Unmocked command: ${command}`);
      });

      const installResult = await npmTemplateManager.installTemplatePackage({
        templateName: 'pui',
        registry: 'https://npm.tencent.com'
      });

      expect(installResult.success).toBe(false);
      expect(installResult.errors).toHaveLength(1);
      expect(installResult.errors[0]).toContain('ENETUNREACH');

      mockExecSync.mockRestore();
    });

    test('Should handle template not found in package', async () => {
      // Setup mock package without pui template
      const templatePackagePath = path.join(mockGlobalNodeModules, '@tencent/rod-cli-templates');
      await fs.mkdir(templatePackagePath, { recursive: true });

      // Create only xdc template, not pui
      const xdcTemplatePath = path.join(templatePackagePath, 'xdc');
      await fs.mkdir(xdcTemplatePath, { recursive: true });

      const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
      mockExecSync.mockReturnValue(mockGlobalNodeModules);

      const result = await npmTemplateManager.ensureTemplate({
        templateName: 'pui'
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("Template 'pui' not found");
      expect(result.errors[0]).toContain('Available templates: xdc');

      mockExecSync.mockRestore();
    });

    test('Should handle global installation permission errors', async () => {
      const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
      mockExecSync.mockImplementation((...args: unknown[]) => {
        const command = args[0] as string;
        if (command === 'npm root -g') {
          return mockGlobalNodeModules;
        }
        if (command.includes('npm install -g')) {
          throw new Error('EACCES: permission denied');
        }
        throw new Error(`Unmocked command: ${command}`);
      });

      const installResult = await npmTemplateManager.installTemplatePackage({
        templateName: 'pui'
      });

      expect(installResult.success).toBe(false);
      expect(installResult.errors[0]).toContain('EACCES: permission denied');

      mockExecSync.mockRestore();
    });
  });

  describe('UC-002 CLI Integration', () => {
    test('Should integrate with CLI init command', async () => {
      // This test verifies the full CLI integration
      // In a real scenario, this would call the actual CLI command
      // For now, we test the components integration

      const templatePackagePath = path.join(mockGlobalNodeModules, '@tencent/rod-cli-templates');
      const puiTemplatePath = path.join(templatePackagePath, 'pui');

      await fs.mkdir(puiTemplatePath, { recursive: true });
      await createMockPUITemplate(puiTemplatePath);

      const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
      mockExecSync.mockReturnValue(mockGlobalNodeModules);

      // Simulate the CLI workflow
      const templateConfig = {
        templateName: 'pui'
      };

      // 1. Check if template package is installed
      const isPackageInstalled = await npmTemplateManager.isTemplatePackageInstalled();

      // 2. Ensure template (would install if not present)
      const ensureResult = await npmTemplateManager.ensureTemplate(templateConfig);
      expect(ensureResult.success).toBe(true);

      // 3. Generate project
      const projectPath = path.join(tempDir, 'cli-integration-test');
      const generateResult = await templateGenerator.generateTemplate({
        aiAssistant: AIAssistant.CLAUDE,
        scriptType: ScriptType.BASH,
        workflowMode: WorkflowMode.ROADMAP,
        projectPath,
        projectName: 'cli-integration-test',
        templateName: 'pui'
      });

      expect(generateResult.success).toBe(true);

      // Verify the complete project structure
      const claudeConfigPath = path.join(projectPath, '.claude-config.json');
      expect(await fs.access(claudeConfigPath).then(() => true).catch(() => false)).toBe(true);

      const configContent = await fs.readFile(claudeConfigPath, 'utf8');
      const claudeConfig = JSON.parse(configContent);
      expect(claudeConfig.internal.template).toBe('pui');
      expect(claudeConfig.internal.organization).toBe('tencent');

      mockExecSync.mockRestore();
    });
  });
});

/**
 * Helper function to create mock PUI template structure
 */
async function createMockPUITemplate(templatePath: string): Promise<void> {
  // Create commands directory
  const commandsDir = path.join(templatePath, 'commands');
  await fs.mkdir(commandsDir, { recursive: true });

  // Create component.md command
  const componentCommand = `---
description: 基于腾讯 PUI 组件库开发 React 组件，提供完整的组件实现和文档
---

在当前项目中创建符合 PUI 设计规范的 React 组件，提供完整的组件代码、类型定义和使用示例。

**适配 PUI 组件库：基于腾讯内部 PUI 设计系统进行组件开发**

执行步骤：

1. 分析用户提供的组件需求：{ARGS}
2. 确定组件类型和功能特性
3. 检查项目结构，确保在 src/components/ 目录中创建组件
4. 生成完整的组件实现

**PUI 组件开发原则**：
- 遵循腾讯 PUI 设计系统规范
- 使用 TypeScript 确保类型安全
- 支持主题定制和国际化
- 提供完整的组件文档和示例`;

  await fs.writeFile(path.join(commandsDir, 'component.md'), componentCommand);

  // Create page.md command
  const pageCommand = `---
description: 基于腾讯 PUI 组件库开发完整的前端页面，包括布局、状态管理和用户交互
---

在当前项目中创建符合 PUI 设计规范的完整前端页面。

**适配 PUI 前端架构：基于 React + PUI + Zustand 技术栈进行页面开发**`;

  await fs.writeFile(path.join(commandsDir, 'page.md'), pageCommand);

  // Create optimize.md command
  const optimizeCommand = `---
description: 全面优化基于腾讯 PUI 组件库的前端项目，提升性能、代码质量和用户体验
---

分析并优化当前 PUI 前端项目。

**适配 PUI 前端优化：基于 React + PUI + Vite 技术栈的全面优化策略**`;

  await fs.writeFile(path.join(commandsDir, 'optimize.md'), optimizeCommand);

  // Create scripts directory (optional for PUI template)
  const scriptsDir = path.join(templatePath, 'scripts', 'bash');
  await fs.mkdir(scriptsDir, { recursive: true });

  // Create a sample script
  const sampleScript = `#!/bin/bash
# PUI specific build script
echo "Building PUI project..."
npm run build`;

  await fs.writeFile(path.join(scriptsDir, 'build.sh'), sampleScript);

  // Create memory directory (optional)
  const memoryDir = path.join(templatePath, 'memory');
  await fs.mkdir(memoryDir, { recursive: true });

  const constitutionContent = `# PUI Project Constitution

This project follows the PUI design system standards and practices.

## Core Principles
1. Consistency with PUI design language
2. TypeScript-first development
3. Responsive design standards
4. Performance optimization
`;

  await fs.writeFile(path.join(memoryDir, 'constitution.md'), constitutionContent);

  // Create README for the template
  const readmeContent = `# PUI Template

This template provides scaffolding for projects using Tencent's PUI design system.

## Features
- React components following PUI standards
- TypeScript configuration
- Zustand state management
- Vite build system
`;

  await fs.writeFile(path.join(templatePath, 'README.md'), readmeContent);
}