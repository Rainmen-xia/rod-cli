/**
 * NPM Template Manager
 *
 * Manages dynamic installation and discovery of template packages from internal npm registry
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

export interface NPMTemplateConfig {
  templateName: string;
  registry?: string; // Internal npm registry URL
  packageName?: string; // Custom package name, defaults to `rod-templates-${templateName}`
  version?: string; // Specific version, defaults to 'latest'
}

export interface TemplateInstallResult {
  success: boolean;
  templatePath: string;
  packagePath: string;
  version: string;
  errors: string[];
}

export class NPMTemplateManager {
  private readonly defaultRegistry: string;
  private globalNodeModulesPath: string | null = null;

  constructor(defaultRegistry?: string) {
    this.defaultRegistry = defaultRegistry || 'https://npm.tencent.com'; // Internal npm registry
  }

  /**
   * Get global node_modules path
   */
  private async getGlobalNodeModulesPath(): Promise<string> {
    if (!this.globalNodeModulesPath) {
      try {
        const result = execSync('npm root -g', { encoding: 'utf8' });
        this.globalNodeModulesPath = result.trim();
      } catch (error) {
        throw new Error('Failed to get global node_modules path: ' + (error as Error).message);
      }
    }
    return this.globalNodeModulesPath;
  }

  /**
   * Check if template package is installed globally
   */
  async isTemplatePackageInstalled(): Promise<boolean> {
    try {
      const globalNodeModules = await this.getGlobalNodeModulesPath();
      const packagePath = path.join(globalNodeModules, '@tencent/rod-cli-templates');
      const stat = await fs.stat(packagePath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if specific template exists in the global package
   */
  async isTemplateAvailable(templateName: string): Promise<boolean> {
    try {
      const templatePath = await this.getTemplatePath(templateName);
      const stat = await fs.stat(templatePath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get the path for a specific template in global package
   */
  async getTemplatePath(templateName: string): Promise<string> {
    const globalNodeModules = await this.getGlobalNodeModulesPath();
    return path.join(globalNodeModules, '@tencent/rod-cli-templates', templateName);
  }

  /**
   * Get the path to the global templates package
   */
  async getTemplatePackagePath(): Promise<string> {
    const globalNodeModules = await this.getGlobalNodeModulesPath();
    return path.join(globalNodeModules, '@tencent/rod-cli-templates');
  }

  /**
   * Install template package globally
   */
  async installTemplatePackage(config: NPMTemplateConfig): Promise<TemplateInstallResult> {
    const errors: string[] = [];
    const packageName = '@tencent/rod-cli-templates';
    const registry = config.registry || this.defaultRegistry;
    const version = config.version || 'latest';

    try {
      console.log(chalk.blue(`📦 Installing template package ${packageName}@${version} globally...`));

      // Install package globally
      const installCmd = `npm install -g ${packageName}@${version} --registry=${registry}`;

      execSync(installCmd, {
        stdio: 'pipe',
        timeout: 60000 // 60 second timeout
      });

      // Verify installation
      const isInstalled = await this.isTemplatePackageInstalled();
      if (!isInstalled) {
        throw new Error(`Package ${packageName} not found after global installation`);
      }

      // Get package version
      const packagePath = await this.getTemplatePackagePath();
      const packageJsonPath = path.join(packagePath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      const actualVersion = packageJson.version;

      console.log(chalk.green(`✅ Template package ${packageName}@${actualVersion} installed globally`));

      const templatePath = await this.getTemplatePath(config.templateName);
      return {
        success: true,
        templatePath,
        packagePath,
        version: actualVersion,
        errors
      };

    } catch (error) {
      const err = error as Error;
      errors.push(`Failed to install template package globally: ${err.message}`);

      return {
        success: false,
        templatePath: '',
        packagePath: '',
        version: '',
        errors
      };
    }
  }

  /**
   * Get list of available templates in the global package
   */
  async getAvailableTemplates(): Promise<string[]> {
    try {
      const packagePath = await this.getTemplatePackagePath();
      const entries = await fs.readdir(packagePath);
      const templates: string[] = [];

      for (const entry of entries) {
        const entryPath = path.join(packagePath, entry);
        const stat = await fs.stat(entryPath);
        // Only include directories that are not node_modules, package.json, etc.
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          templates.push(entry);
        }
      }

      return templates;
    } catch {
      return [];
    }
  }

  /**
   * Ensure template is available (install package if not already installed)
   */
  async ensureTemplate(config: NPMTemplateConfig): Promise<TemplateInstallResult> {
    // Check if template package is installed globally
    const isPackageInstalled = await this.isTemplatePackageInstalled();

    if (isPackageInstalled) {
      // Check if specific template exists in the package
      const isTemplateAvailable = await this.isTemplateAvailable(config.templateName);

      if (isTemplateAvailable) {
        // Template available, return success
        const templatePath = await this.getTemplatePath(config.templateName);
        const packagePath = await this.getTemplatePackagePath();

        return {
          success: true,
          templatePath,
          packagePath,
          version: 'installed',
          errors: []
        };
      } else {
        // Package installed but template not found
        const availableTemplates = await this.getAvailableTemplates();
        return {
          success: false,
          templatePath: '',
          packagePath: '',
          version: '',
          errors: [`Template '${config.templateName}' not found. Available templates: ${availableTemplates.join(', ')}`]
        };
      }
    }

    // Install template package globally
    return await this.installTemplatePackage(config);
  }

  /**
   * Get list of installed templates (alias for getAvailableTemplates)
   */
  async getInstalledTemplates(): Promise<string[]> {
    return await this.getAvailableTemplates();
  }
}

// Utility function
export function createNPMTemplateManager(registry?: string): NPMTemplateManager {
  return new NPMTemplateManager(registry);
}