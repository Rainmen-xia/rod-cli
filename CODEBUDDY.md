# ROD CLI - Rule-Oriented Development

## Project Overview

ROD CLI is a TypeScript-based command-line tool for rule-oriented development that generates local project templates for specification-driven development with AI assistant support. It supports multiple AI assistants (Claude, Copilot, Gemini, Cursor, Codebuddy) and generates templates locally without network dependencies.

## Development Commands

### Core Development
```bash
# Development mode with ts-node
npm run dev -- <command> <args>
npm run dev -- init test-project --ai claude --debug

# Build TypeScript to JavaScript
npm run build

# Clean build artifacts
npm run clean
```

### Testing
```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test suite
npm test -- --testNamePattern="InitCommand"
```

### Code Quality
```bash
# Lint TypeScript files
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

## Architecture Overview

### Core Structure
```
src/
├── cli.ts                    # Commander.js main entry point
├── commands/                 # Command implementations
│   ├── init.ts              # Project initialization (main command)
│   └── check.ts             # System verification
├── lib/                     # Core business logic
│   ├── local-template-generator.ts  # Local template generation (no network)
│   ├── config-manager.ts    # Configuration management
│   └── tool-checker.ts      # System tool verification
├── types/                   # TypeScript type definitions
│   ├── cli-config.ts        # Main config types with validation
│   ├── project-template.ts  # Template generation types
│   └── results.ts           # Result formatting types
└── contracts/               # Interface contracts
    ├── cli-interface.ts     # CLI operation contracts
    └── file-operations.ts   # File system contracts
```

### Key Design Patterns

- **Local Template Generation**: Creates project templates locally instead of downloading from GitHub
- **Contract-Based Design**: All major operations defined through TypeScript interfaces
- **Configuration Builder Pattern**: `CLIConfigBuilder` provides type-safe configuration building
- **Enum-Based Validation**: `AIAssistant`, `ScriptType`, and `WorkflowMode` enums for type safety

### Template System

The tool generates different directory structures based on AI assistant:

- **Claude**: `.claude-config.json` + `.claude/commands/` (markdown commands)
- **GitHub Copilot**: `.github/prompts/` (prompt.md files)
- **Gemini**: `.gemini-config.json` + `.gemini/commands/` (toml commands)
- **Cursor**: `.cursor/commands/` (markdown commands, no config file)
- **Codebuddy**: `.codebuddy/commands/` (markdown commands, no config file)

All AI assistants share the `.specify/` directory containing templates, scripts, and memory.

## Main Commands

### `rod init`
Initialize new ROD project with AI assistant support.

**Key options:**
- `--ai <assistant>`: claude, copilot, gemini, cursor, codebuddy
- `--debug`: Show verbose diagnostic output
- `--no-git`: Skip git repository initialization
- `--ignore-agent-tools`: Skip AI tool verification

### `rod check`
Verify system requirements and tool availability.

**Options:**
- `--verbose`: Show detailed system information including paths

## Configuration System

### Path Resolution
- Uses `@/` path mapping pointing to `src/` directory
- TypeScript baseUrl set to `./src` for clean imports
- Absolute path requirements validated via `isAbsolutePath()`

### Validation
- All CLI arguments validated through `validateInitArgs()`
- TypeScript enums provide type-safe configuration
- Complex configuration uses builder pattern via `CLIConfigBuilder`

## Testing Strategy

- **Test-Driven Development**: Enforced red-green-refactor cycle
- **Jest Configuration**: Uses ts-jest preset with 30-second timeout
- **Coverage Target**: >90% coverage requirement
- **Test Structure**: Contract, unit, integration, and performance tests
- **Module Aliases**: `@/` mapping supported in tests via `moduleNameMapping`

## Error Handling

- **Exit Codes**: Uses `ExitCode` enum for consistent exit codes
  - `GENERAL_ERROR`: General failures
  - `NETWORK_ERROR`: Network-related issues
  - `FILE_ERROR`: File permission/access issues
  - `INVALID_ARGS`: Invalid command arguments
- **Debug Mode**: Available via `--debug` flag for verbose error output
- **Global Error Handlers**: Uncaught exceptions and unhandled rejections handled

## Local Template Generation

Revolutionary approach that eliminates network dependencies:

```typescript
const generator = new LocalTemplateGenerator()
await generator.generateTemplate({
  aiAssistant: 'claude',
  scriptType: 'sh',
  projectPath: './my-project'
})
```

**Advantages over GitHub downloads:**
- ✅ No network dependency
- ✅ Works in enterprise/restricted networks  
- ✅ 4x faster initialization
- ✅ 100% reliable offline operation
- ✅ Instant template updates

## Development Workflow

1. **Local Development**: Use `npm run dev` for ts-node execution
2. **Testing**: Follow TDD with `npm run test:watch`
3. **Code Quality**: Run `npm run lint` and `npm run format` before commits
4. **Building**: Use `npm run build` to compile TypeScript
5. **Debugging**: Add `--debug` flag to any command for verbose output

## TypeScript Configuration

- **Target**: ES2020 with CommonJS modules
- **Strict Mode**: Enabled for maximum type safety
- **Path Mapping**: `@/*` maps to `src/*` for clean imports
- **Declaration Files**: Generated with source maps for debugging
- **Module Resolution**: Node-style resolution with synthetic default imports

## ESLint Configuration

- **Parser**: TypeScript ESLint parser with project-aware rules
- **Rules**: Strict TypeScript rules with type checking
- **Ignored Patterns**: `dist/`, `node_modules/`, and config files
- **Environment**: Node.js and Jest globals enabled