/**
 * CLI Template Workflow E2E Tests
 *
 * End-to-end tests for the complete CLI template workflow
 * These tests verify the real CLI behavior from user perspective
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

describe('CLI Template Workflow E2E Tests', () => {
  let tmpDir: string;
  let cliPath: string;

  beforeAll(async () => {
    // Build the CLI first
    try {
      execSync('npm run build', { cwd: process.cwd(), stdio: 'pipe' });
      cliPath = path.join(process.cwd(), 'dist', 'cli.js');
    } catch (error) {
      console.error('Failed to build CLI:', error);
      throw error;
    }
  });

  beforeEach(async () => {
    // Create temporary directory for each test
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rod-e2e-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('UC-001: 默认模板初始化项目 - E2E', () => {
    it('应该通过CLI命令成功创建默认ROD项目', async () => {
      const projectName = 'test-default-project';
      const projectPath = path.join(tmpDir, projectName);

      // Execute CLI command
      const command = `node "${cliPath}" init ${projectName} --ai claude`;

      try {
        const output = execSync(command, {
          cwd: tmpDir,
          encoding: 'utf8',
          stdio: 'pipe'
        });

        // Verify CLI output contains success message
        expect(output).toContain('Project initialized successfully');

        // Verify project structure
        expect(await fileExists(path.join(projectPath, '.specify'))).toBe(true);
        expect(await fileExists(path.join(projectPath, '.claude'))).toBe(true);
        expect(await fileExists(path.join(projectPath, '.claude-config.json'))).toBe(true);

        // Verify command files
        const commandsDir = path.join(projectPath, '.claude', 'commands');
        expect(await fileExists(path.join(commandsDir, 'module.md'))).toBe(true);
        expect(await fileExists(path.join(commandsDir, 'specify.md'))).toBe(true);

        // Verify .specify structure
        expect(await fileExists(path.join(projectPath, '.specify', 'templates'))).toBe(true);
        expect(await fileExists(path.join(projectPath, '.specify', 'scripts'))).toBe(true);
        expect(await fileExists(path.join(projectPath, '.specify', 'memory'))).toBe(true);

      } catch (error) {
        console.error('CLI command failed:', error);
        throw error;
      }
    });

    it('应该支持在当前目录初始化项目', async () => {
      const command = `node "${cliPath}" init --ai claude --here`;

      try {
        const output = execSync(command, {
          cwd: tmpDir,
          encoding: 'utf8',
          stdio: 'pipe'
        });

        expect(output).toContain('Project initialized successfully');
        expect(await fileExists(path.join(tmpDir, '.specify'))).toBe(true);
        expect(await fileExists(path.join(tmpDir, '.claude'))).toBe(true);

      } catch (error) {
        console.error('CLI command failed:', error);
        throw error;
      }
    });

    it('应该支持不同的AI助手', async () => {
      const testCases = [
        { ai: 'gemini', expectedDir: '.gemini', expectedExt: '.toml' },
        { ai: 'copilot', expectedDir: '.github/prompts', expectedExt: '.prompt.md' },
        { ai: 'cursor', expectedDir: '.cursor', expectedExt: '.md' },
        { ai: 'codebuddy', expectedDir: '.codebuddy', expectedExt: '.md' }
      ];

      for (const testCase of testCases) {
        const projectName = `test-${testCase.ai}-project`;
        const projectPath = path.join(tmpDir, projectName);
        const command = `node "${cliPath}" init ${projectName} --ai ${testCase.ai}`;

        try {
          const output = execSync(command, {
            cwd: tmpDir,
            encoding: 'utf8',
            stdio: 'pipe'
          });

          expect(output).toContain('Project initialized successfully');
          expect(await fileExists(path.join(projectPath, testCase.expectedDir))).toBe(true);

          // Check command file format
          const commandsPath = testCase.ai === 'copilot'
            ? path.join(projectPath, testCase.expectedDir)
            : path.join(projectPath, testCase.expectedDir, 'commands');

          const files = await fs.readdir(commandsPath);
          const hasCorrectExt = files.some(file => file.endsWith(testCase.expectedExt));
          expect(hasCorrectExt).toBe(true);

        } catch (error) {
          console.error(`CLI command failed for ${testCase.ai}:`, error);
          throw error;
        }
      }
    });
  });

  describe('UC-004: NPM安装失败处理 - E2E', () => {
    it('应该在模板参数无效时显示错误信息', async () => {
      const command = `node "${cliPath}" init test-project --template nonexistent --ai claude`;

      try {
        execSync(command, {
          cwd: tmpDir,
          encoding: 'utf8',
          stdio: 'pipe'
        });

        // Should not reach here - command should fail
        fail('Expected command to fail but it succeeded');

      } catch (error: any) {
        // Verify error output contains helpful information
        const errorOutput = error.stderr || error.stdout || error.message;
        expect(errorOutput).toContain('not found');
      }
    });
  });

  describe('CLI Help and Validation', () => {
    it('应该显示帮助信息', async () => {
      const command = `node "${cliPath}" init --help`;

      try {
        const output = execSync(command, {
          encoding: 'utf8',
          stdio: 'pipe'
        });

        expect(output).toContain('Initialize a new ROD project');
        expect(output).toContain('--ai');
        expect(output).toContain('--template');
        expect(output).toContain('Template behavior');
        expect(output).toContain('@tencent/rod-cli-templates');

      } catch (error) {
        console.error('Help command failed:', error);
        throw error;
      }
    });

    it('应该验证AI助手参数', async () => {
      const command = `node "${cliPath}" init test-project --ai invalid`;

      try {
        execSync(command, {
          cwd: tmpDir,
          encoding: 'utf8',
          stdio: 'pipe'
        });

        fail('Expected command to fail with invalid AI parameter');

      } catch (error: any) {
        const errorOutput = error.stderr || error.stdout || error.message;
        expect(errorOutput).toContain('Invalid AI assistant');
      }
    });
  });

  describe('Project Structure Validation', () => {
    it('应该生成符合规范的项目结构', async () => {
      const projectName = 'structure-test';
      const projectPath = path.join(tmpDir, projectName);
      const command = `node "${cliPath}" init ${projectName} --ai claude`;

      try {
        execSync(command, {
          cwd: tmpDir,
          encoding: 'utf8',
          stdio: 'pipe'
        });

        // Validate .specify structure
        const specifyStructure = [
          '.specify/templates/roadmap-template.md',
          '.specify/templates/spec-template.md',
          '.specify/templates/plan-template.md',
          '.specify/templates/tasks-template.md',
          '.specify/scripts/bash',
          '.specify/memory/constitution.md'
        ];

        for (const filePath of specifyStructure) {
          expect(await fileExists(path.join(projectPath, filePath))).toBe(true);
        }

        // Validate Claude structure
        const claudeStructure = [
          '.claude/commands/module.md',
          '.claude/commands/specify.md',
          '.claude/commands/plan.md',
          '.claude/commands/tasks.md',
          '.claude/commands/progress.md',
          '.claude-config.json'
        ];

        for (const filePath of claudeStructure) {
          expect(await fileExists(path.join(projectPath, filePath))).toBe(true);
        }

        // Validate config file content
        const configContent = await fs.readFile(
          path.join(projectPath, '.claude-config.json'),
          'utf8'
        );
        const config = JSON.parse(configContent);
        expect(config.assistant).toBe('claude');
        expect(config.features.specDriven).toBe(true);

      } catch (error) {
        console.error('Structure validation failed:', error);
        throw error;
      }
    });
  });
});

// Helper function to check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}