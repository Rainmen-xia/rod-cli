# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ROD CLI is a TypeScript-based Command Line Interface for Rule-Oriented Development toolkit. It enables specification-driven development with support for multiple AI assistants (Claude, Copilot, Gemini, Cursor) and generates local project templates without network dependencies.

## Essential Commands

### Development
- `npm run dev -- <command> <args>` - Run CLI in development mode using ts-node
- `npm run build` - Compile TypeScript to JavaScript in dist/
- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode  
- `npm run test:coverage` - Generate test coverage report

### Code Quality
- `npm run lint` - Run ESLint on TypeScript files
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier

### Testing Specific Components
- `npm test -- --testNamePattern="InitCommand"` - Run specific test suite
- Tests located in `tests/` directory with setup in `tests/setup.ts`

## Architecture

### Core Structure
```
src/
├── cli.ts                    # Main CLI entry point with Commander.js
├── commands/                 # Command implementations
│   ├── init.ts              # Project initialization (primary command)
│   └── check.ts             # System validation
├── lib/                     # Core business logic
│   ├── local-template-generator.ts  # Local template generation (no network)
│   ├── config-manager.ts    # Configuration management
│   └── tool-checker.ts      # System tool validation
├── types/                   # TypeScript definitions
│   ├── cli-config.ts        # Main config types and validation
│   ├── project-template.ts  # Template generation types
│   └── results.ts           # Result formatting types
└── contracts/               # Interface contracts
    ├── cli-interface.ts     # CLI operation contracts
    └── file-operations.ts   # File system contracts
```

### Key Design Patterns
- **Local Template Generation**: Creates project templates locally instead of downloading from GitHub
- **Contract-based Design**: All major operations defined through TypeScript interfaces
- **Configuration Builder Pattern**: `CLIConfigBuilder` for type-safe configuration construction
- **Enumerated Types**: `AIAssistant` and `ScriptType` enums for validation

### Path Resolution
- Uses `@/` path mapping pointing to `src/` directory
- TypeScript baseUrl set to `./src` for clean imports
- Project supports absolute path requirements (validates with `isAbsolutePath()`)

## Key Functionality

### Primary Commands
1. **`rod init`** - Initialize new ROD project with AI assistant support
2. **`rod check`** - Validate system requirements and tool availability

### AI Assistant Support
- Claude: Generates `.claude-config.json`
- GitHub Copilot: Creates `COPILOT.md` guide
- Gemini: Produces `.gemini-config.json`
- Cursor: Generates `CURSOR.md` guide

### Script Generation
- Bash (`sh`): POSIX-compatible scripts for Unix/Linux/macOS
- PowerShell (`ps`): Cross-platform PowerShell scripts

## Testing Strategy

- **Test-Driven Development**: Red-Green-Refactor cycle enforced
- **Jest Configuration**: Uses ts-jest preset with 30s timeout
- **Coverage Requirements**: Targets >90% coverage
- **Test Structure**: Contract tests, unit tests, integration tests, performance tests
- **Module Aliases**: `@/` mapping supported in tests

## Development Guidelines

### Error Handling
- Uses `ExitCode` enum for consistent exit codes
- Network errors, permission errors, and general errors handled separately
- Debug mode available via `--debug` flag

### Configuration Validation
- All CLI arguments validated through `validateInitArgs()`
- Type-safe configuration using TypeScript enums
- Builder pattern for complex configuration construction

### File Operations
- Local template generation eliminates network dependencies
- Cross-platform path handling for Windows/Unix systems
- Permission management for generated scripts