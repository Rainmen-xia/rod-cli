/**
 * Project Template Types
 * 
 * Defines interfaces for handling GitHub template downloads and project templates
 */

import { AIAssistant, ScriptType } from './cli-config';

// GitHub API Response Types
export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  assets: GitHubAsset[];
}

export interface GitHubAsset {
  id: number;
  name: string;
  label: string;
  content_type: string;
  state: string;
  size: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
  url: string;
}

// Project Template Interface
export interface ProjectTemplate {
  filename: string;              // ZIP file name
  size: number;                  // File size in bytes
  downloadUrl: string;           // Download URL
  releaseVersion: string;        // Release version number
  aiAssistant: AIAssistant;      // Corresponding AI assistant
  scriptType: ScriptType;        // Corresponding script type
  checksum?: string;             // Optional file checksum for verification
}

// Template metadata and validation
export interface TemplateMetadata {
  name: string;
  version: string;
  description: string;
  aiAssistant: AIAssistant;
  scriptType: ScriptType;
  size: number;
  downloadCount: number;
  lastUpdated: Date;
  features: string[];
  requirements: TemplateRequirements;
}

export interface TemplateRequirements {
  nodeVersion: string;
  npmVersion: string;
  gitRequired: boolean;
  platformSupport: string[];
}

// Template parsing and utilities
export class TemplateUtils {
  /**
   * Parse template filename to extract metadata
   * Expected format: spec-kit-template-{ai}-{script}-{version}.zip
   */
  static parseTemplateName(filename: string): TemplateNameInfo | null {
    const pattern = /^spec-kit-template-(.+)-(.+)-v(\d+\.\d+\.\d+)\.zip$/;
    const match = filename.match(pattern);
    
    if (!match) {
      return null;
    }

    const [, ai, script, version] = match;
    
    // Validate AI assistant
    if (!Object.values(AIAssistant).includes(ai as AIAssistant)) {
      return null;
    }
    
    // Validate script type
    if (!Object.values(ScriptType).includes(script as ScriptType)) {
      return null;
    }

    return {
      aiAssistant: ai as AIAssistant,
      scriptType: script as ScriptType,
      version,
      filename
    };
  }

  /**
   * Generate template filename from components
   */
  static generateTemplateName(
    ai: AIAssistant, 
    script: ScriptType, 
    version: string
  ): string {
    return `spec-kit-template-${ai}-${script}-v${version}.zip`;
  }

  /**
   * Validate template compatibility with system
   */
  static validateCompatibility(template: TemplateMetadata): CompatibilityResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check Node.js version
    const currentNodeVersion = process.version;
    if (!this.isVersionCompatible(currentNodeVersion, template.requirements.nodeVersion)) {
      errors.push(`Node.js ${template.requirements.nodeVersion} required, but ${currentNodeVersion} is installed`);
    }

    // Check platform support
    const currentPlatform = process.platform;
    if (!template.requirements.platformSupport.includes(currentPlatform)) {
      warnings.push(`Template may not be fully compatible with ${currentPlatform}`);
    }

    // Check template size
    if (template.size > 100 * 1024 * 1024) { // 100MB
      warnings.push('Large template size may slow down download');
    }

    return {
      compatible: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if version satisfies requirement
   */
  private static isVersionCompatible(current: string, required: string): boolean {
    // Simple version comparison (major.minor.patch)
    const currentParts = current.replace('v', '').split('.').map(Number);
    const requiredParts = required.replace('v', '').split('.').map(Number);

    // Check major version
    if (currentParts[0] < requiredParts[0]) return false;
    if (currentParts[0] > requiredParts[0]) return true;

    // Check minor version
    if (currentParts[1] < requiredParts[1]) return false;
    if (currentParts[1] > requiredParts[1]) return true;

    // Check patch version
    return currentParts[2] >= requiredParts[2];
  }

  /**
   * Sort templates by preference (latest version, popular downloads)
   */
  static sortTemplatesByPreference(templates: TemplateMetadata[]): TemplateMetadata[] {
    return templates.sort((a, b) => {
      // First by version (descending)
      const versionCompare = this.compareVersions(b.version, a.version);
      if (versionCompare !== 0) return versionCompare;

      // Then by download count (descending)
      return b.downloadCount - a.downloadCount;
    });
  }

  /**
   * Compare version strings
   */
  private static compareVersions(a: string, b: string): number {
    const aParts = a.replace('v', '').split('.').map(Number);
    const bParts = b.replace('v', '').split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;

      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }

    return 0;
  }

  /**
   * Filter templates by criteria
   */
  static filterTemplates(
    templates: TemplateMetadata[],
    criteria: TemplateFilterCriteria
  ): TemplateMetadata[] {
    return templates.filter(template => {
      if (criteria.aiAssistant && template.aiAssistant !== criteria.aiAssistant) {
        return false;
      }

      if (criteria.scriptType && template.scriptType !== criteria.scriptType) {
        return false;
      }

      if (criteria.maxSize && template.size > criteria.maxSize) {
        return false;
      }

      if (criteria.minVersion && this.compareVersions(template.version, criteria.minVersion) < 0) {
        return false;
      }

      if (criteria.features && !criteria.features.every(feature => 
        template.features.includes(feature)
      )) {
        return false;
      }

      return true;
    });
  }
}

// Supporting interfaces
export interface TemplateNameInfo {
  aiAssistant: AIAssistant;
  scriptType: ScriptType;
  version: string;
  filename: string;
}

export interface CompatibilityResult {
  compatible: boolean;
  errors: string[];
  warnings: string[];
}

export interface TemplateFilterCriteria {
  aiAssistant?: AIAssistant;
  scriptType?: ScriptType;
  maxSize?: number;
  minVersion?: string;
  features?: string[];
}

// Template factory for creating templates from GitHub assets
export class TemplateFactory {
  /**
   * Create ProjectTemplate from GitHub asset
   */
  static fromGitHubAsset(asset: GitHubAsset, releaseVersion: string): ProjectTemplate | null {
    const nameInfo = TemplateUtils.parseTemplateName(asset.name);
    if (!nameInfo) {
      return null;
    }

    return {
      filename: asset.name,
      size: asset.size,
      downloadUrl: asset.browser_download_url,
      releaseVersion,
      aiAssistant: nameInfo.aiAssistant,
      scriptType: nameInfo.scriptType
    };
  }

  /**
   * Create TemplateMetadata from ProjectTemplate and additional info
   */
  static createMetadata(
    template: ProjectTemplate,
    additionalInfo: Partial<TemplateMetadata> = {}
  ): TemplateMetadata {
    return {
      name: template.filename,
      version: template.releaseVersion,
      description: additionalInfo.description || `Template for ${template.aiAssistant} with ${template.scriptType} scripts`,
      aiAssistant: template.aiAssistant,
      scriptType: template.scriptType,
      size: template.size,
      downloadCount: additionalInfo.downloadCount || 0,
      lastUpdated: additionalInfo.lastUpdated || new Date(),
      features: additionalInfo.features || [],
      requirements: additionalInfo.requirements || {
        nodeVersion: '18.0.0',
        npmVersion: '8.0.0',
        gitRequired: true,
        platformSupport: ['darwin', 'linux', 'win32']
      }
    };
  }
}

// Template cache interface
export interface TemplateCache {
  get(key: string): ProjectTemplate | null;
  set(key: string, template: ProjectTemplate, ttl?: number): void;
  has(key: string): boolean;
  clear(): void;
  size(): number;
}

// Simple in-memory template cache implementation
export class InMemoryTemplateCache implements TemplateCache {
  private cache = new Map<string, { template: ProjectTemplate; expires: number }>();

  get(key: string): ProjectTemplate | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.template;
  }

  set(key: string, template: ProjectTemplate, ttl: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      template,
      expires: Date.now() + ttl
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // Clean expired entries first
    for (const [key, entry] of this.cache.entries()) {
      if (Date.now() > entry.expires) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}