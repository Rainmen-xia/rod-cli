/**
 * Template Generator Module
 *
 * Main exports for the refactored template generation system
 */

// Export main classes and interfaces
export {
  LocalTemplateGenerator,
  TemplateGenerationConfig,
  GenerationResult,
  createLocalTemplateGenerator
} from '../template-generator';

// Export base processors
export { BaseFileProcessor } from './base-file-processor';
export { BaseAIProcessor, AIProcessorFactory } from './ai-processors';

// Export utility functions
export {
  validateConfig,
  calculateTotalSize,
  generateRoadmapWorkflow
} from './template-utils';

// Re-export specific AI processors if needed
export {
  ClaudeProcessor,
  CopilotProcessor,
  GeminiProcessor,
  CursorProcessor,
  CodebuddyProcessor
} from './ai-processors';