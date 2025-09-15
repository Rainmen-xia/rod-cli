# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

ROD CLI 是一个基于 TypeScript 的命令行界面，用于规则导向开发工具包。它支持规范驱动的开发，兼容多种 AI 助手（Claude、Copilot、Gemini、Cursor），并能在本地生成项目模板，无需网络依赖。

## 基本命令

### 开发命令
- `npm run dev -- <command> <args>` - 使用 ts-node 在开发模式下运行 CLI
- `npm run build` - 将 TypeScript 编译为 JavaScript 输出到 dist/
- `npm test` - 运行 Jest 测试套件
- `npm run test:watch` - 以监视模式运行测试
- `npm run test:coverage` - 生成测试覆盖率报告

### 代码质量
- `npm run lint` - 对 TypeScript 文件运行 ESLint
- `npm run lint:fix` - 自动修复 ESLint 问题
- `npm run format` - 使用 Prettier 格式化代码

### 特定组件测试
- `npm test -- --testNamePattern="InitCommand"` - 运行特定测试套件
- 测试文件位于 `tests/` 目录，设置文件为 `tests/setup.ts`

## 架构

### 核心结构
```
src/
├── cli.ts                    # Commander.js 主 CLI 入口点
├── commands/                 # 命令实现
│   ├── init.ts              # 项目初始化（主要命令）
│   └── check.ts             # 系统验证
├── lib/                     # 核心业务逻辑
│   ├── local-template-generator.ts  # 本地模板生成（无网络依赖）
│   ├── config-manager.ts    # 配置管理
│   └── tool-checker.ts      # 系统工具验证
├── types/                   # TypeScript 类型定义
│   ├── cli-config.ts        # 主配置类型和验证
│   ├── project-template.ts  # 模板生成类型
│   └── results.ts           # 结果格式化类型
└── contracts/               # 接口契约
    ├── cli-interface.ts     # CLI 操作契约
    └── file-operations.ts   # 文件系统契约
```

### 关键设计模式
- **本地模板生成**：在本地创建项目模板，而非从 GitHub 下载
- **基于契约的设计**：所有主要操作通过 TypeScript 接口定义
- **配置构建器模式**：`CLIConfigBuilder` 提供类型安全的配置构建
- **枚举类型**：`AIAssistant` 和 `ScriptType` 枚举用于验证

### 路径解析
- 使用 `@/` 路径映射指向 `src/` 目录
- TypeScript baseUrl 设置为 `./src` 以便清晰导入
- 项目支持绝对路径要求（通过 `isAbsolutePath()` 验证）

## 主要功能

### 主要命令
1. **`rod init`** - 初始化新的 ROD 项目，支持 AI 助手
2. **`rod check`** - 验证系统要求和工具可用性

### AI 助手支持
- **Claude**：生成 `.claude-config.json` 配置文件 + `.claude/commands/` 目录（包含 .md 格式命令）
- **GitHub Copilot**：创建 `.github/prompts/` 目录（包含 .prompt.md 格式文件）
- **Gemini**：生成 `.gemini-config.json` 配置文件 + `.gemini/commands/` 目录（包含 .toml 格式命令）
- **Cursor**：创建 `.cursor/commands/` 目录（包含 .md 格式命令，无额外配置文件）
- **Codebuddy**：创建 `.codebuddy/commands/` 目录（包含 .md 格式命令，无额外配置文件）

**所有AI助手共享**：`.specify/` 目录包含通用内容（templates、scripts、memory）

### 脚本生成
- Bash (`sh`)：适用于 Unix/Linux/macOS 的 POSIX 兼容脚本
- PowerShell (`ps`)：跨平台 PowerShell 脚本

## 测试策略

- **测试驱动开发**：强制执行红-绿-重构循环
- **Jest 配置**：使用 ts-jest 预设，超时时间 30 秒
- **覆盖率要求**：目标 >90% 覆盖率
- **测试结构**：契约测试、单元测试、集成测试、性能测试
- **模块别名**：测试中支持 `@/` 映射

## 开发指南

### 错误处理
- 使用 `ExitCode` 枚举提供一致的退出代码
- 网络错误、权限错误和一般错误分别处理
- 通过 `--debug` 标志提供调试模式

### 配置验证
- 所有 CLI 参数通过 `validateInitArgs()` 验证
- 使用 TypeScript 枚举进行类型安全配置
- 复杂配置构建采用构建器模式

### 文件操作
- 本地模板生成消除网络依赖
- 跨平台路径处理支持 Windows/Unix 系统
- 生成脚本的权限管理