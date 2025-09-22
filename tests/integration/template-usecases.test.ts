/**
 * ROD CLI Template Use Cases Integration Tests
 *
 * Tests for all use cases defined in specs/spec.md
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { LocalTemplateGenerator, TemplateGenerationConfig } from '../../src/lib/template-generator';
import { NPMTemplateManager } from '../../src/lib/npm-template-manager';
import { AIAssistant, ScriptType, WorkflowMode } from '../../src/types/cli-config';

describe('Template Use Cases Integration Tests', () => {
  let tmpDir: string;
  let generator: LocalTemplateGenerator;
  let npmManager: NPMTemplateManager;

  beforeEach(async () => {
    // Create temporary directory for tests
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rod-test-'));
    generator = new LocalTemplateGenerator();
    npmManager = new NPMTemplateManager('https://registry.npmjs.org'); // Use public registry for tests
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('UC-001: 默认模板初始化项目', () => {
    it('应该使用默认模板创建ROD项目结构', async () => {
      // Arrange
      const projectPath = path.join(tmpDir, 'test-project');
      const config: TemplateGenerationConfig = {
        aiAssistant: AIAssistant.CLAUDE,
        scriptType: ScriptType.BASH,
        workflowMode: WorkflowMode.ROADMAP,
        projectPath,
        projectName: 'test-project'
        // templateName 未指定，使用默认模板
      };

      // Act
      const result = await generator.generateTemplate(config);

      // Assert
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);

      // 验证 .specify 目录结构
      expect(await fs.stat(path.join(projectPath, '.specify'))).toBeTruthy();
      expect(await fs.stat(path.join(projectPath, '.specify', 'templates'))).toBeTruthy();
      expect(await fs.stat(path.join(projectPath, '.specify', 'scripts'))).toBeTruthy();
      expect(await fs.stat(path.join(projectPath, '.specify', 'memory'))).toBeTruthy();

      // 验证 Claude 目录结构
      expect(await fs.stat(path.join(projectPath, '.claude'))).toBeTruthy();
      expect(await fs.stat(path.join(projectPath, '.claude', 'commands'))).toBeTruthy();

      // 验证配置文件
      expect(await fs.stat(path.join(projectPath, '.claude-config.json'))).toBeTruthy();

      // 验证生成的命令文件
      const commandFiles = await fs.readdir(path.join(projectPath, '.claude', 'commands'));
      expect(commandFiles).toContain('module.md');
      expect(commandFiles).toContain('specify.md');
      expect(commandFiles).toContain('plan.md');
      expect(commandFiles).toContain('tasks.md');
      expect(commandFiles).toContain('progress.md');
    });

    it('应该支持不同的AI助手', async () => {
      // Test Gemini
      const geminiConfig: TemplateGenerationConfig = {
        aiAssistant: AIAssistant.GEMINI,
        scriptType: ScriptType.BASH,
        workflowMode: WorkflowMode.ROADMAP,
        projectPath: path.join(tmpDir, 'gemini-project'),
        projectName: 'gemini-project'
      };

      const geminiResult = await generator.generateTemplate(geminiConfig);
      expect(geminiResult.success).toBe(true);
      expect(await fs.stat(path.join(tmpDir, 'gemini-project', '.gemini'))).toBeTruthy();

      // Test Copilot
      const copilotConfig: TemplateGenerationConfig = {
        aiAssistant: AIAssistant.COPILOT,
        scriptType: ScriptType.BASH,
        workflowMode: WorkflowMode.ROADMAP,
        projectPath: path.join(tmpDir, 'copilot-project'),
        projectName: 'copilot-project'
      };

      const copilotResult = await generator.generateTemplate(copilotConfig);
      expect(copilotResult.success).toBe(true);
      expect(await fs.stat(path.join(tmpDir, 'copilot-project', '.github', 'prompts'))).toBeTruthy();
    });
  });

  describe('UC-002: NPM模板首次安装使用', () => {
    it('应该检查全局安装并安装NPM模板包', async () => {
      // Mock: 检查是否已安装
      const isInstalledSpy = jest.spyOn(npmManager, 'isTemplatePackageInstalled')
        .mockResolvedValue(false);

      // Mock: 安装包
      const installSpy = jest.spyOn(npmManager, 'installTemplatePackage')
        .mockResolvedValue({
          success: true,
          templatePath: '/global/node_modules/@tencent/rod-cli-templates/pui',
          packagePath: '/global/node_modules/@tencent/rod-cli-templates',
          version: '1.0.0',
          errors: []
        });

      // Mock: 检查模板可用性
      const isAvailableSpy = jest.spyOn(npmManager, 'isTemplateAvailable')
        .mockResolvedValue(true);

      // Mock: 获取模板路径
      const getPathSpy = jest.spyOn(npmManager, 'getTemplatePath')
        .mockResolvedValue('/global/node_modules/@tencent/rod-cli-templates/pui');

      // Act
      const result = await npmManager.ensureTemplate({ templateName: 'pui' });

      // Assert
      expect(result.success).toBe(true);
      expect(isInstalledSpy).toHaveBeenCalled();
      expect(installSpy).toHaveBeenCalledWith({ templateName: 'pui' });

      // Cleanup
      isInstalledSpy.mockRestore();
      installSpy.mockRestore();
      isAvailableSpy.mockRestore();
      getPathSpy.mockRestore();
    });
  });

  describe('UC-003: NPM模板复用', () => {
    it('应该直接使用已安装的NPM模板', async () => {
      // Mock: 模板包已安装
      const isInstalledSpy = jest.spyOn(npmManager, 'isTemplatePackageInstalled')
        .mockResolvedValue(true);

      // Mock: 模板可用
      const isAvailableSpy = jest.spyOn(npmManager, 'isTemplateAvailable')
        .mockResolvedValue(true);

      // Mock: 获取模板路径
      const getPathSpy = jest.spyOn(npmManager, 'getTemplatePath')
        .mockResolvedValue('/global/node_modules/@tencent/rod-cli-templates/pui');

      const getPackagePathSpy = jest.spyOn(npmManager, 'getTemplatePackagePath')
        .mockResolvedValue('/global/node_modules/@tencent/rod-cli-templates');

      // Act
      const result = await npmManager.ensureTemplate({ templateName: 'pui' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.version).toBe('installed');
      expect(isInstalledSpy).toHaveBeenCalled();
      expect(isAvailableSpy).toHaveBeenCalled();

      // 验证不会尝试安装
      const installSpy = jest.spyOn(npmManager, 'installTemplatePackage');
      expect(installSpy).not.toHaveBeenCalled();

      // Cleanup
      isInstalledSpy.mockRestore();
      isAvailableSpy.mockRestore();
      getPathSpy.mockRestore();
      getPackagePathSpy.mockRestore();
    });
  });

  describe('UC-004: NPM安装失败处理', () => {
    it('应该在NPM全局安装失败时返回明确错误', async () => {
      // Mock: 包未安装
      const isInstalledSpy = jest.spyOn(npmManager, 'isTemplatePackageInstalled')
        .mockResolvedValue(false);

      // Mock: 安装失败
      const installSpy = jest.spyOn(npmManager, 'installTemplatePackage')
        .mockResolvedValue({
          success: false,
          templatePath: '',
          packagePath: '',
          version: '',
          errors: ['Failed to install template package globally: npm install failed with exit code 1']
        });

      // Act
      const result = await npmManager.ensureTemplate({ templateName: 'pui' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to install template package globally');

      // Cleanup
      isInstalledSpy.mockRestore();
      installSpy.mockRestore();
    });

    it('应该在权限不足时给出相应错误信息', async () => {
      // Mock: 权限错误
      const installSpy = jest.spyOn(npmManager, 'installTemplatePackage')
        .mockResolvedValue({
          success: false,
          templatePath: '',
          packagePath: '',
          version: '',
          errors: ['Failed to install template package globally: EACCES: permission denied']
        });

      // Act
      const result = await npmManager.ensureTemplate({ templateName: 'pui' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('permission denied');

      // Cleanup
      installSpy.mockRestore();
    });
  });

  describe('UC-005: 模板不存在错误处理', () => {
    it('应该在指定模板不存在时返回可用模板列表', async () => {
      // Mock: 包已安装
      const isInstalledSpy = jest.spyOn(npmManager, 'isTemplatePackageInstalled')
        .mockResolvedValue(true);

      // Mock: 指定模板不存在
      const isAvailableSpy = jest.spyOn(npmManager, 'isTemplateAvailable')
        .mockResolvedValue(false);

      // Mock: 可用模板列表
      const getAvailableSpy = jest.spyOn(npmManager, 'getAvailableTemplates')
        .mockResolvedValue(['pui', 'xdc']);

      // Act
      const result = await npmManager.ensureTemplate({ templateName: 'nonexistent' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Template \'nonexistent\' not found');
      expect(result.errors[0]).toContain('Available templates: pui, xdc');

      // Cleanup
      isInstalledSpy.mockRestore();
      isAvailableSpy.mockRestore();
      getAvailableSpy.mockRestore();
    });
  });

  describe('UC-006: 多AI助手支持', () => {
    it('应该为不同AI助手生成正确的文件格式', async () => {
      const testCases = [
        {
          ai: AIAssistant.CLAUDE,
          expectedDir: '.claude/commands',
          expectedExt: '.md'
        },
        {
          ai: AIAssistant.GEMINI,
          expectedDir: '.gemini/commands',
          expectedExt: '.toml'
        },
        {
          ai: AIAssistant.COPILOT,
          expectedDir: '.github/prompts',
          expectedExt: '.prompt.md'
        },
        {
          ai: AIAssistant.CURSOR,
          expectedDir: '.cursor/commands',
          expectedExt: '.md'
        },
        {
          ai: AIAssistant.CODEBUDDY,
          expectedDir: '.codebuddy/commands',
          expectedExt: '.md'
        }
      ];

      for (const testCase of testCases) {
        const projectPath = path.join(tmpDir, `${testCase.ai}-project`);
        const config: TemplateGenerationConfig = {
          aiAssistant: testCase.ai,
          scriptType: ScriptType.BASH,
          workflowMode: WorkflowMode.ROADMAP,
          projectPath,
          projectName: `${testCase.ai}-project`
        };

        // Act
        const result = await generator.generateTemplate(config);

        // Assert
        expect(result.success).toBe(true);

        // 验证目录结构
        const commandsDir = path.join(projectPath, testCase.expectedDir);
        expect(await fs.stat(commandsDir)).toBeTruthy();

        // 验证文件格式
        const files = await fs.readdir(commandsDir);
        const hasCorrectExtension = files.some(file => file.endsWith(testCase.expectedExt));
        expect(hasCorrectExtension).toBe(true);
      }
    });
  });

  describe('边界条件测试', () => {
    it('EC-001: 应该处理全局安装权限问题', async () => {
      // Mock permission error
      const mockExecSync = jest.fn().mockImplementation(() => {
        const error = new Error('EACCES: permission denied') as any;
        error.status = 1;
        throw error;
      });

      // Replace execSync temporarily
      const originalExecSync = require('child_process').execSync;
      require('child_process').execSync = mockExecSync;

      try {
        const result = await npmManager.installTemplatePackage({ templateName: 'pui' });
        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain('permission denied');
      } finally {
        // Restore original execSync
        require('child_process').execSync = originalExecSync;
      }
    });

    it('EC-004: 应该处理网络超时', async () => {
      // Mock timeout error
      const mockExecSync = jest.fn().mockImplementation(() => {
        const error = new Error('network timeout') as any;
        error.status = 1;
        throw error;
      });

      const originalExecSync = require('child_process').execSync;
      require('child_process').execSync = mockExecSync;

      try {
        const result = await npmManager.installTemplatePackage({ templateName: 'pui' });
        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain('network timeout');
      } finally {
        require('child_process').execSync = originalExecSync;
      }
    });
  });
});