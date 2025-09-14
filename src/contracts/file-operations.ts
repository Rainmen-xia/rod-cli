/**
 * File Operations Contracts
 * Defines interfaces for file system operations
 */

// Project Initializer Contract
export interface ProjectInitializer {
  /**
   * Initialize project in specified directory
   */
  initializeProject(config: InitializationConfig): Promise<InitializationResult>;
  
  /**
   * Extract template ZIP to project directory
   */
  extractTemplate(
    zipPath: string, 
    projectPath: string,
    isCurrentDir: boolean
  ): Promise<ExtractionResult>;
  
  /**
   * Set executable permissions for shell scripts
   */
  setScriptPermissions(projectPath: string): Promise<PermissionResult>;
  
  /**
   * Initialize git repository
   */
  initializeGit(projectPath: string): Promise<GitInitResult>;
}

export interface InitializationConfig {
  projectName: string;
  projectPath: string;
  templatePath: string;
  aiAssistant: string;
  scriptType: string;
  skipGit: boolean;
  isCurrentDir: boolean;
}

export interface InitializationResult {
  success: boolean;
  projectPath: string;
  branchName?: string;
  filesCreated: string[];
  warnings: string[];
  errors: string[];
  executionTime: number;
  operations: any[];
  summary: any;
}

export interface ExtractionResult {
  extractedFiles: string[];
  totalFiles: number;
  totalSize: number;
  warnings: string[];
  errors: string[];
  operations: any[];
  skippedFiles: string[];
  conflictResolutions: any[];
}

export interface PermissionResult {
  modifiedFiles: string[];
  skippedFiles: string[];
  errors: any[];
  operations: any[];
}

export interface GitInitResult {
  success: boolean;
  repositoryPath: string;
  initialCommit: string;
  branchName: string;
  error?: string;
  operations: any[];
}

// File System Operations Contract
export interface FileSystemOperations {
  /**
   * Check if path exists and get info
   */
  pathExists(path: string): Promise<boolean>;
  
  /**
   * Create directory recursively
   */
  createDirectory(path: string): Promise<void>;
  
  /**
   * Copy file from source to destination
   */
  copyFile(source: string, destination: string): Promise<void>;
  
  /**
   * Move/rename file or directory
   */
  moveFile(source: string, destination: string): Promise<void>;
  
  /**
   * Delete file or directory
   */
  deleteFile(path: string): Promise<void>;
  
  /**
   * Set file permissions (Unix-like systems)
   */
  setPermissions(path: string, mode: number): Promise<void>;
  
  /**
   * Get file/directory stats
   */
  getStats(path: string): Promise<FileStats>;
  
  /**
   * List directory contents
   */
  listDirectory(path: string): Promise<DirectoryEntry[]>;
}

export interface FileStats {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  created: Date;
  modified: Date;
  permissions: number;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
}

// ZIP Operations Contract
export interface ZipOperations {
  /**
   * Extract ZIP file to destination directory
   */
  extractZip(zipPath: string, destination: string): Promise<ExtractionResult>;
  
  /**
   * List contents of ZIP file
   */
  listZipContents(zipPath: string): Promise<ZipEntry[]>;
  
  /**
   * Validate ZIP file integrity
   */
  validateZip(zipPath: string): Promise<boolean>;
}

export interface ZipEntry {
  name: string;
  size: number;
  compressedSize: number;
  isDirectory: boolean;
  lastModified: Date;
}

// Tool Checker Contract
export interface ToolChecker {
  /**
   * Check if a tool is available in PATH
   */
  checkTool(toolName: string): Promise<ToolCheckResult>;
  
  /**
   * Check multiple tools at once
   */
  checkTools(toolNames: string[]): Promise<ToolCheckResult[]>;
  
  /**
   * Get detailed system information
   */
  getSystemInfo(): Promise<SystemInfo>;
}

export interface ToolCheckResult {
  toolName: string;
  available: boolean;
  version?: string;
  path?: string;
  error?: string;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  npmVersion: string;
  gitVersion?: string;
  homeDirectory: string;
  currentDirectory: string;
}

// Error Types
export class FileOperationError extends Error {
  constructor(
    message: string,
    public operation: string,
    public path: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'FileOperationError';
  }
}

export class PermissionError extends Error {
  constructor(
    message: string,
    public path: string,
    public requiredPermission: string
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class ZipExtractionError extends Error {
  constructor(
    message: string,
    public zipPath: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ZipExtractionError';
  }
}

export interface FileError {
  path: string;
  operation: string;
  error: string;
  recoverable: boolean;
}