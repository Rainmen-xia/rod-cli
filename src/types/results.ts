/**
 * Result Types
 * 
 * Defines interfaces for operation results and file operations
 */

// File Operation Types
export enum OperationType {
  CREATE = 'create',
  OVERWRITE = 'overwrite',
  SKIP = 'skip',
  CHMOD = 'chmod',
  DELETE = 'delete',
  COPY = 'copy',
  MOVE = 'move'
}

export interface FileOperation {
  path: string;                  // File path
  operation: OperationType;      // Operation type
  success: boolean;              // Whether operation succeeded
  error?: string;                // Error message if failed
  size?: number;                 // File size after operation
  permissions?: string;          // File permissions (Unix format)
  timestamp?: Date;              // When operation was performed
}

// Initialization Result Interface
export interface InitializationResult {
  success: boolean;              // Whether initialization succeeded
  projectPath: string;           // Project path
  branchName?: string;           // Created git branch (if applicable)
  filesCreated: string[];        // List of created files
  warnings: string[];            // Warning messages
  errors: string[];              // Error messages
  executionTime: number;         // Execution time in milliseconds
  operations: FileOperation[];   // Detailed file operations
  summary: InitializationSummary; // Summary statistics
}

export interface InitializationSummary {
  totalFiles: number;
  totalSize: number;             // Total size in bytes
  scriptsWithPermissions: number;
  gitInitialized: boolean;
  templateVersion: string;
  aiAssistant: string;
  scriptType: string;
}

// Extraction Result Interface
export interface ExtractionResult {
  extractedFiles: string[];
  totalFiles: number;
  totalSize: number;
  warnings: string[];
  errors: string[];
  operations: FileOperation[];
  skippedFiles: string[];        // Files that were skipped
  conflictResolutions: ConflictResolution[]; // How conflicts were resolved
}

export interface ConflictResolution {
  path: string;
  action: 'overwrite' | 'skip' | 'rename';
  originalName?: string;
  newName?: string;
  reason: string;
}

// Permission Result Interface
export interface PermissionResult {
  modifiedFiles: string[];
  skippedFiles: string[];
  errors: FileError[];
  operations: FileOperation[];
}

// Git Operation Result Interface
export interface GitInitResult {
  success: boolean;
  repositoryPath: string;
  initialCommit: string;
  branchName: string;
  error?: string;
  operations: GitOperation[];
}

export interface GitOperation {
  command: string;
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
}

// Generic Operation Result
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  warnings: string[];
  duration: number;
  metadata: Record<string, any>;
}

// Error Interface
export interface FileError {
  path: string;
  operation: string;
  error: string;
  recoverable: boolean;
  suggestedAction?: string;
  errorCode?: string;
}

// Progress Tracking
export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  message: string;
  stage: string;
  estimatedTimeRemaining?: number;
}

// Result Builders and Utilities
export class ResultBuilder {
  /**
   * Create a successful initialization result
   */
  static createSuccessfulInit(
    projectPath: string,
    operations: FileOperation[],
    summary: InitializationSummary,
    executionTime: number
  ): InitializationResult {
    return {
      success: true,
      projectPath,
      filesCreated: operations
        .filter(op => op.success && op.operation === OperationType.CREATE)
        .map(op => op.path),
      warnings: [],
      errors: [],
      executionTime,
      operations,
      summary
    };
  }

  /**
   * Create a failed initialization result
   */
  static createFailedInit(
    projectPath: string,
    errors: string[],
    operations: FileOperation[] = [],
    executionTime: number = 0
  ): InitializationResult {
    return {
      success: false,
      projectPath,
      filesCreated: [],
      warnings: [],
      errors,
      executionTime,
      operations,
      summary: {
        totalFiles: 0,
        totalSize: 0,
        scriptsWithPermissions: 0,
        gitInitialized: false,
        templateVersion: '',
        aiAssistant: '',
        scriptType: ''
      }
    };
  }

  /**
   * Create file operation record
   */
  static createFileOperation(
    path: string,
    operation: OperationType,
    success: boolean,
    error?: string,
    additionalInfo?: Partial<FileOperation>
  ): FileOperation {
    return {
      path,
      operation,
      success,
      error,
      timestamp: new Date(),
      ...additionalInfo
    };
  }

  /**
   * Create extraction result
   */
  static createExtractionResult(
    operations: FileOperation[],
    warnings: string[] = [],
    errors: string[] = []
  ): ExtractionResult {
    const extractedFiles = operations
      .filter(op => op.success && op.operation === OperationType.CREATE)
      .map(op => op.path);

    const skippedFiles = operations
      .filter(op => op.operation === OperationType.SKIP)
      .map(op => op.path);

    return {
      extractedFiles,
      totalFiles: extractedFiles.length,
      totalSize: operations.reduce((sum, op) => sum + (op.size || 0), 0),
      warnings,
      errors,
      operations,
      skippedFiles,
      conflictResolutions: []
    };
  }
}

// Result Analysis Utilities
export class ResultAnalyzer {
  /**
   * Analyze initialization result and provide insights
   */
  static analyzeInitialization(result: InitializationResult): ResultAnalysis {
    const analysis: ResultAnalysis = {
      overallHealth: result.success ? 'success' : 'failed',
      criticalIssues: [],
      recommendations: [],
      metrics: {},
      riskFactors: []
    };

    // Analyze execution time
    if (result.executionTime > 30000) { // More than 30 seconds
      analysis.recommendations.push('Consider optimizing template size or network connection');
    }

    // Analyze file operations
    const failedOps = result.operations.filter(op => !op.success);
    if (failedOps.length > 0) {
      analysis.criticalIssues.push(`${failedOps.length} file operations failed`);
    }

    // Analyze warnings
    if (result.warnings.length > 0) {
      analysis.riskFactors.push(`${result.warnings.length} warnings generated`);
    }

    // Calculate metrics
    analysis.metrics = {
      successRate: result.operations.length > 0 
        ? (result.operations.filter(op => op.success).length / result.operations.length) * 100 
        : 0,
      avgFileSize: result.summary.totalFiles > 0 
        ? result.summary.totalSize / result.summary.totalFiles 
        : 0,
      executionTimePerFile: result.summary.totalFiles > 0 
        ? result.executionTime / result.summary.totalFiles 
        : 0
    };

    return analysis;
  }

  /**
   * Check if result indicates complete success
   */
  static isCompleteSuccess(result: InitializationResult): boolean {
    return result.success && 
           result.errors.length === 0 && 
           result.operations.every(op => op.success);
  }

  /**
   * Extract actionable insights from errors
   */
  static extractActionableInsights(errors: FileError[]): string[] {
    const insights: string[] = [];
    const errorTypes = new Map<string, number>();

    errors.forEach(error => {
      const type = error.errorCode || 'unknown';
      errorTypes.set(type, (errorTypes.get(type) || 0) + 1);

      if (error.suggestedAction) {
        insights.push(error.suggestedAction);
      }
    });

    // Add general insights based on error patterns
    if (errorTypes.has('EACCES')) {
      insights.push('Consider running with appropriate permissions or checking file ownership');
    }

    if (errorTypes.has('ENOSPC')) {
      insights.push('Free up disk space and try again');
    }

    if (errorTypes.has('ENOTDIR')) {
      insights.push('Check that parent directories exist and are accessible');
    }

    return [...new Set(insights)]; // Remove duplicates
  }
}

// Result Formatting
export class ResultFormatter {
  /**
   * Format initialization result for console output
   */
  static formatForConsole(result: InitializationResult): string {
    const lines: string[] = [];

    if (result.success) {
      lines.push('✅ Project initialization completed successfully');
      lines.push(`📁 Project created at: ${result.projectPath}`);
      lines.push(`📊 ${result.summary.totalFiles} files created (${this.formatBytes(result.summary.totalSize)})`);
      
      if (result.summary.gitInitialized) {
        lines.push('🔧 Git repository initialized');
      }
      
      if (result.summary.scriptsWithPermissions > 0) {
        lines.push(`🔒 Set executable permissions on ${result.summary.scriptsWithPermissions} scripts`);
      }
    } else {
      lines.push('❌ Project initialization failed');
      result.errors.forEach(error => lines.push(`   • ${error}`));
    }

    if (result.warnings.length > 0) {
      lines.push('⚠️  Warnings:');
      result.warnings.forEach(warning => lines.push(`   • ${warning}`));
    }

    lines.push(`⏱️  Completed in ${result.executionTime}ms`);

    return lines.join('\n');
  }

  /**
   * Format bytes in human readable format
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Create JSON summary for programmatic use
   */
  static toJsonSummary(result: InitializationResult): object {
    return {
      success: result.success,
      projectPath: result.projectPath,
      summary: result.summary,
      statistics: {
        filesCreated: result.filesCreated.length,
        warnings: result.warnings.length,
        errors: result.errors.length,
        executionTime: result.executionTime
      },
      hasWarnings: result.warnings.length > 0,
      hasErrors: result.errors.length > 0
    };
  }
}

// Supporting interfaces
export interface ResultAnalysis {
  overallHealth: 'success' | 'warning' | 'failed';
  criticalIssues: string[];
  recommendations: string[];
  metrics: Record<string, number>;
  riskFactors: string[];
}