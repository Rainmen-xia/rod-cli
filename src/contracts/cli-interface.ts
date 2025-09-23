/**
 * CLI Interface Contracts
 * Defines the command-line interface for Spec Kit Node.js CLI
 */

export interface CLICommand {
  name: string;
  description: string;
  options: CLIOption[];
  handler: (args: CLIArgs) => Promise<void>;
}

export interface CLIOption {
  name: string;
  alias?: string;
  description: string;
  type: 'string' | 'boolean' | 'number';
  required?: boolean;
  default?: any;
  choices?: string[];
}

export interface CLIArgs {
  [key: string]: any;
}

// Init Command Contract
export interface InitCommandArgs extends CLIArgs {
  projectName?: string;
  ai?: 'claude' | 'copilot' | 'gemini' | 'cursor' | 'codebuddy';
  script?: 'node';
  template?: string; // Template name for internal templates
  here?: boolean;
  noGit?: boolean;
  skipTls?: boolean;
  ignoreAgentTools?: boolean;
  debug?: boolean;
}

// Check Command Contract  
export interface CheckCommandArgs extends CLIArgs {
  verbose?: boolean;
}

// Expected CLI Interface
export const CLI_COMMANDS: CLICommand[] = [
  {
    name: 'init',
    description: 'Initialize a new Specify project from the latest template',
    options: [
      {
        name: 'projectName',
        description: 'Name for your new project directory',
        type: 'string',
        required: false
      },
      {
        name: 'ai',
        description: 'AI assistant to use',
        type: 'string',
        choices: ['claude', 'copilot', 'gemini', 'cursor', 'codebuddy']
      },
      {
        name: 'script',
        description: 'Script type to use',
        type: 'string', 
        choices: ['sh', 'ps']
      },
      {
        name: 'workflow',
        description: 'Workflow mode to use',
        type: 'string',
        choices: ['legacy', 'roadmap'],
        default: 'roadmap'
      },
      {
        name: 'template',
        description: 'Template name to use (for internal templates)',
        type: 'string',
        required: false
      },
      {
        name: 'here',
        description: 'Initialize project in current directory',
        type: 'boolean',
        default: false
      },
      {
        name: 'noGit',
        description: 'Skip git repository initialization',
        type: 'boolean',
        default: false
      },
      {
        name: 'skipTls',
        description: 'Skip SSL/TLS verification',
        type: 'boolean',
        default: false
      },
      {
        name: 'ignoreAgentTools',
        description: 'Skip checks for AI agent tools',
        type: 'boolean',
        default: false
      },
      {
        name: 'debug',
        description: 'Show verbose diagnostic output',
        type: 'boolean',
        default: false
      }
    ],
    handler: async () => {
      // Implementation contract - must be fulfilled
      throw new Error('Not implemented');
    }
  },
  {
    name: 'check',
    description: 'Check that all required tools are installed',
    options: [
      {
        name: 'verbose',
        description: 'Show detailed output',
        type: 'boolean',
        default: false
      }
    ],
    handler: async () => {
      // Implementation contract - must be fulfilled
      throw new Error('Not implemented');
    }
  }
];

// Exit codes contract
export enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  INVALID_ARGS = 2,
  NETWORK_ERROR = 3,
  FILE_ERROR = 4,
  TOOL_MISSING = 5
}

// Output format contract
export interface CLIOutput {
  success: boolean;
  message?: string;
  data?: any;
  warnings?: string[];
  errors?: string[];
}