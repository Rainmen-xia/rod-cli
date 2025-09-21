/**
 * NPM Template Manager Unit Tests
 *
 * Tests for the refactored NPMTemplateManager using global node_modules
 */

import { NPMTemplateManager } from '../../src/lib/npm-template-manager';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Mock execSync and fs for unit tests
jest.mock('child_process');
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn()
  }
}));

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockStat = fs.stat as jest.MockedFunction<typeof fs.stat>;
const mockReaddir = fs.readdir as jest.MockedFunction<typeof fs.readdir>;
const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;

describe('NPMTemplateManager Unit Tests', () => {
  let manager: NPMTemplateManager;
  const mockGlobalNodeModules = '/usr/local/lib/node_modules';

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new NPMTemplateManager('https://registry.npmjs.org');

    // Mock npm root -g command
    mockExecSync.mockReturnValue(mockGlobalNodeModules);
  });

  describe('getGlobalNodeModulesPath', () => {
    it('应该获取全局 node_modules 路径', async () => {
      mockExecSync.mockReturnValue('/custom/global/node_modules');

      const path = await (manager as any).getGlobalNodeModulesPath();

      expect(path).toBe('/custom/global/node_modules');
      expect(mockExecSync).toHaveBeenCalledWith('npm root -g', { encoding: 'utf8' });
    });

    it('应该缓存全局路径避免重复调用', async () => {
      // Call twice
      await (manager as any).getGlobalNodeModulesPath();
      await (manager as any).getGlobalNodeModulesPath();

      // Should only call execSync once
      expect(mockExecSync).toHaveBeenCalledTimes(1);
    });

    it('应该在获取路径失败时抛出错误', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      await expect((manager as any).getGlobalNodeModulesPath())
        .rejects.toThrow('Failed to get global node_modules path');
    });
  });

  describe('isTemplatePackageInstalled', () => {
    it('应该检查全局包是否已安装', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);

      const isInstalled = await manager.isTemplatePackageInstalled();

      expect(isInstalled).toBe(true);
      expect(mockStat).toHaveBeenCalledWith(
        path.join(mockGlobalNodeModules, '@tencent/rod-cli-templates')
      );
    });

    it('应该在包不存在时返回false', async () => {
      mockStat.mockRejectedValue(new Error('ENOENT'));

      const isInstalled = await manager.isTemplatePackageInstalled();

      expect(isInstalled).toBe(false);
    });
  });

  describe('isTemplateAvailable', () => {
    it('应该检查特定模板是否可用', async () => {
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);

      const isAvailable = await manager.isTemplateAvailable('pui');

      expect(isAvailable).toBe(true);
      expect(mockStat).toHaveBeenCalledWith(
        path.join(mockGlobalNodeModules, '@tencent/rod-cli-templates', 'pui')
      );
    });

    it('应该在模板不存在时返回false', async () => {
      mockStat.mockRejectedValue(new Error('ENOENT'));

      const isAvailable = await manager.isTemplateAvailable('nonexistent');

      expect(isAvailable).toBe(false);
    });
  });

  describe('getTemplatePath', () => {
    it('应该返回正确的模板路径', async () => {
      const templatePath = await manager.getTemplatePath('pui');

      expect(templatePath).toBe(
        path.join(mockGlobalNodeModules, '@tencent/rod-cli-templates', 'pui')
      );
    });
  });

  describe('getTemplatePackagePath', () => {
    it('应该返回正确的包路径', async () => {
      const packagePath = await manager.getTemplatePackagePath();

      expect(packagePath).toBe(
        path.join(mockGlobalNodeModules, '@tencent/rod-cli-templates')
      );
    });
  });

  describe('getAvailableTemplates', () => {
    it('应该返回可用模板列表', async () => {
      mockReaddir.mockResolvedValue(['pui', 'xdc', 'package.json', 'node_modules', '.hidden'] as any);
      mockStat
        .mockResolvedValueOnce({ isDirectory: () => true } as any)  // pui
        .mockResolvedValueOnce({ isDirectory: () => true } as any)  // xdc
        .mockResolvedValueOnce({ isDirectory: () => false } as any) // package.json
        .mockResolvedValueOnce({ isDirectory: () => true } as any)  // node_modules
        .mockResolvedValueOnce({ isDirectory: () => true } as any); // .hidden

      const templates = await manager.getAvailableTemplates();

      expect(templates).toEqual(['pui', 'xdc']);
    });

    it('应该在读取失败时返回空数组', async () => {
      mockReaddir.mockRejectedValue(new Error('ENOENT'));

      const templates = await manager.getAvailableTemplates();

      expect(templates).toEqual([]);
    });
  });

  describe('installTemplatePackage', () => {
    it('应该成功安装模板包', async () => {
      // Mock successful installation
      mockExecSync.mockReturnValueOnce(mockGlobalNodeModules); // npm root -g
      mockExecSync.mockReturnValueOnce(''); // npm install

      // Mock package verification
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);
      mockReadFile.mockResolvedValue(JSON.stringify({ version: '1.0.0' }));

      const result = await manager.installTemplatePackage({ templateName: 'pui' });

      expect(result.success).toBe(true);
      expect(result.version).toBe('1.0.0');
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install -g @tencent/rod-cli-templates@latest --registry=https://registry.npmjs.org',
        { stdio: 'pipe', timeout: 60000 }
      );
    });

    it('应该在安装失败时返回错误', async () => {
      mockExecSync.mockReturnValueOnce(mockGlobalNodeModules); // npm root -g
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Installation failed');
      });

      const result = await manager.installTemplatePackage({ templateName: 'pui' });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to install template package globally: Installation failed');
    });
  });

  describe('ensureTemplate', () => {
    it('应该使用已安装的模板包', async () => {
      // Mock package already installed
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);

      const result = await manager.ensureTemplate({ templateName: 'pui' });

      expect(result.success).toBe(true);
      expect(result.version).toBe('installed');
    });

    it('应该在模板不存在时返回可用模板列表', async () => {
      // Mock package installed but template not found
      mockStat
        .mockResolvedValueOnce({ isDirectory: () => true } as any)  // package exists
        .mockRejectedValueOnce(new Error('ENOENT'));               // template not found

      mockReaddir.mockResolvedValue(['pui', 'xdc'] as any);
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);

      const result = await manager.ensureTemplate({ templateName: 'nonexistent' });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Template \'nonexistent\' not found');
      expect(result.errors[0]).toContain('Available templates: pui, xdc');
    });

    it('应该在包未安装时自动安装', async () => {
      // Mock package not installed
      mockStat.mockRejectedValueOnce(new Error('ENOENT'));

      // Mock successful installation
      const installSpy = jest.spyOn(manager, 'installTemplatePackage')
        .mockResolvedValue({
          success: true,
          templatePath: '/path/to/template',
          packagePath: '/path/to/package',
          version: '1.0.0',
          errors: []
        });

      const result = await manager.ensureTemplate({ templateName: 'pui' });

      expect(result.success).toBe(true);
      expect(installSpy).toHaveBeenCalledWith({ templateName: 'pui' });

      installSpy.mockRestore();
    });
  });

  describe('getInstalledTemplates', () => {
    it('应该返回已安装的模板列表', async () => {
      const getAvailableSpy = jest.spyOn(manager, 'getAvailableTemplates')
        .mockResolvedValue(['pui', 'xdc']);

      const templates = await manager.getInstalledTemplates();

      expect(templates).toEqual(['pui', 'xdc']);
      expect(getAvailableSpy).toHaveBeenCalled();

      getAvailableSpy.mockRestore();
    });
  });
});