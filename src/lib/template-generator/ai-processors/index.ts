/**
 * AI Processors Export and Factory
 *
 * Provides a factory for creating AI processors and exports all processor classes
 */

import { AIAssistant } from '../../../types/cli-config';
import { BaseAIProcessor } from './base-ai-processor';
import { ClaudeProcessor } from './claude-processor';
import { CopilotProcessor } from './copilot-processor';
import { GeminiProcessor } from './gemini-processor';
import { CursorProcessor } from './cursor-processor';
import { CodebuddyProcessor } from './codebuddy-processor';

// Export all processor classes
export { BaseAIProcessor } from './base-ai-processor';
export { ClaudeProcessor } from './claude-processor';
export { CopilotProcessor } from './copilot-processor';
export { GeminiProcessor } from './gemini-processor';
export { CursorProcessor } from './cursor-processor';
export { CodebuddyProcessor } from './codebuddy-processor';

/**
 * Factory for creating AI processors
 */
export class AIProcessorFactory {
  static create(aiAssistant: AIAssistant, templateBasePath: string): BaseAIProcessor {
    switch (aiAssistant) {
      case AIAssistant.CLAUDE:
        return new ClaudeProcessor(templateBasePath);

      case AIAssistant.COPILOT:
        return new CopilotProcessor(templateBasePath);

      case AIAssistant.GEMINI:
        return new GeminiProcessor(templateBasePath);

      case AIAssistant.CURSOR:
        return new CursorProcessor(templateBasePath);

      case AIAssistant.CODEBUDDY:
        return new CodebuddyProcessor(templateBasePath);

      default:
        throw new Error(`Unsupported AI assistant: ${aiAssistant}`);
    }
  }
}