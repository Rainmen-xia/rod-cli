/**
 * NPM Template Manager Tests
 */

import { NPMTemplateManager } from '../src/lib/npm-template-manager';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('NPMTemplateManager', () => {
  let tmpDir: string;
  let manager: NPMTemplateManager;

  beforeEach(async () => {
    // Create temporary directory for tests
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rod-test-'));
    manager = new NPMTemplateManager(tmpDir, 'https://registry.npmjs.org'); // Use public registry for tests
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getTemplatePath', () => {
    it('should return correct template path', () => {
      const templatePath = manager.getTemplatePath('test-template');
      expect(templatePath).toBe(path.join(tmpDir, 'test-template'));
    });
  });

  describe('isTemplateInstalled', () => {
    it('should return false for non-existent template', async () => {
      const isInstalled = await manager.isTemplateInstalled('non-existent');
      expect(isInstalled).toBe(false);
    });

    it('should return true for existing template directory', async () => {
      const templateDir = path.join(tmpDir, 'existing-template');
      await fs.mkdir(templateDir, { recursive: true });

      const isInstalled = await manager.isTemplateInstalled('existing-template');
      expect(isInstalled).toBe(true);
    });
  });

  describe('getInstalledTemplates', () => {
    it('should return empty array when no templates installed', async () => {
      const templates = await manager.getInstalledTemplates();
      expect(templates).toEqual([]);
    });

    it('should return list of installed templates', async () => {
      // Create mock template directories
      await fs.mkdir(path.join(tmpDir, 'template1'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'template2'), { recursive: true });

      // Create a file (should be ignored)
      await fs.writeFile(path.join(tmpDir, 'not-a-template.txt'), 'test');

      const templates = await manager.getInstalledTemplates();
      expect(templates.sort()).toEqual(['template1', 'template2']);
    });

    it('should ignore temporary directories', async () => {
      await fs.mkdir(path.join(tmpDir, 'template1'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, '.temp-template2-123'), { recursive: true });

      const templates = await manager.getInstalledTemplates();
      expect(templates).toEqual(['template1']);
    });
  });

  describe('removeTemplate', () => {
    it('should remove existing template', async () => {
      const templateDir = path.join(tmpDir, 'template-to-remove');
      await fs.mkdir(templateDir, { recursive: true });
      await fs.writeFile(path.join(templateDir, 'test.txt'), 'test content');

      const result = await manager.removeTemplate('template-to-remove');
      expect(result).toBe(true);

      const exists = await manager.isTemplateInstalled('template-to-remove');
      expect(exists).toBe(false);
    });

    it('should return true even if template does not exist', async () => {
      const result = await manager.removeTemplate('non-existent');
      expect(result).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached templates', async () => {
      // Create some template directories
      await fs.mkdir(path.join(tmpDir, 'template1'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'template2'), { recursive: true });

      await manager.clearCache();

      // Check that cache directory is gone or empty
      try {
        const entries = await fs.readdir(tmpDir);
        expect(entries).toEqual([]);
      } catch (error) {
        // Directory doesn't exist, which is also fine
        expect((error as any).code).toBe('ENOENT');
      }
    });
  });

  describe('ensureTemplate', () => {
    it('should return success for already installed template', async () => {
      // Create mock installed template
      const templateDir = path.join(tmpDir, 'existing-template');
      await fs.mkdir(templateDir, { recursive: true });

      const result = await manager.ensureTemplate({
        templateName: 'existing-template'
      });

      expect(result.success).toBe(true);
      expect(result.version).toBe('cached');
      expect(result.templatePath).toBe(templateDir);
    });

    // Note: We skip actual NPM installation tests as they require network access
    // and specific package availability. In a real environment, you might want to:
    // 1. Mock the execSync calls
    // 2. Create integration tests with a test NPM registry
    // 3. Use nock to mock HTTP requests if using npm API
  });
});