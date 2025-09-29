# ROD CLI 设计文档

## 项目概述

ROD CLI 是一个基于 TypeScript 的命令行工具，用于规则导向开发(Rule-Oriented Development)。支持多种 AI 助手集成，提供本地模板生成和项目初始化功能。

**核心特性：**
- 支持 5 种 AI 助手（Claude、Copilot、Gemini、Cursor、Codebuddy）
- 本地模板生成，无网络依赖
- 模块化架构设计
- 企业内部模板支持

## 目录结构

```
rod-cli/
├── src/                          # 源代码
│   ├── cli.ts                    # CLI 入口点（Commander.js）
│   ├── commands/                 # 命令实现
│   │   ├── init.ts              # 项目初始化
│   │   └── check.ts             # 系统检查
│   ├── lib/                     # 核心业务逻辑
│   │   ├── template-generator.ts         # 主模板生成器
│   │   ├── template-generator/           # 模板生成子系统
│   │   │   ├── ai-processors/           # AI 助手处理器
│   │   │   ├── base-file-processor.ts   # 基础文件处理
│   │   │   └── template-utils.ts        # 工具函数
│   │   ├── npm-template-manager.ts      # NPM 模板管理
│   │   ├── config-manager.ts            # 配置管理
│   │   └── tool-checker.ts              # 工具检查
│   ├── types/                   # TypeScript 类型定义
│   │   ├── cli-config.ts        # CLI 配置类型
│   │   ├── project-template.ts  # 项目模板类型
│   │   └── results.ts           # 结果类型
│   └── contracts/               # 接口契约
│       ├── cli-interface.ts     # CLI 操作契约
│       ├── file-operations.ts   # 文件操作契约
│       └── github-api.ts        # GitHub API 契约
├── workflow/                    # 默认模板（外网通用）
├── packages/internal-templates/ # 内部模板（内网专用）
├── specs/                       # 规范文档
├── tests/                       # 测试套件
│   ├── unit/                    # 单元测试
│   ├── integration/             # 集成测试
│   └── e2e/                     # 端到端测试
└── memory/                      # 项目记忆文件
```

## 架构设计

### 核心架构

```
CLI Entry (cli.ts)
    ↓
Commands Layer (commands/)
    ↓
Business Logic (lib/)
    ↓
Template Generators & Processors
    ↓
File System & External APIs
```

### 关键组件

#### 1. CLI 层 (`cli.ts:27-143`)
- **Commander.js** 主程序配置
- 全局错误处理
- 参数验证和路由

#### 2. 命令层 (`commands/`)
- **init.ts**: 项目初始化命令
- **check.ts**: 系统要求检查命令

#### 3. 模板生成系统 (`lib/template-generator/`)
- **LocalTemplateGenerator**: 主生成器协调器
- **AI Processors**: 各 AI 助手的专用处理器
- **BaseFileProcessor**: 基础文件操作

#### 4. 配置管理 (`types/cli-config.ts`)
- **AIAssistant 枚举**: claude | copilot | gemini | cursor | codebuddy
- **CLIConfigBuilder**: 构建器模式配置创建
- **类型安全验证**: 路径、项目名等验证

### 设计模式

#### 1. 构建器模式
```typescript
// src/types/cli-config.ts:41-98
class CLIConfigBuilder {
  setProjectName(name: string): CLIConfigBuilder
  setAIAssistant(ai: AIAssistant): CLIConfigBuilder
  build(): CLIConfig
}
```

#### 2. 工厂模式
```typescript
// AI 处理器工厂
AIProcessorFactory.createProcessor(aiAssistant: AIAssistant)
```

#### 3. 契约式设计
- 所有主要操作通过 TypeScript 接口定义
- 清晰的职责边界和依赖关系

## 模板系统

### 双模板架构

1. **默认模板** (`workflow/`): 外网通用模板
2. **内部模板** (`packages/internal-templates/`): 企业内网专用

### AI 助手支持

| AI 助手 | 配置文件 | 命令目录 | 格式 |
|---------|----------|----------|------|
| Claude | `.claude-config.json` | `.claude/commands/` | `.md` |
| Copilot | 无 | `.github/prompts/` | `.prompt.md` |
| Gemini | `.gemini-config.json` | `.gemini/commands/` | `.toml` |
| Cursor | 无 | `.cursor/commands/` | `.md` |
| Codebuddy | 无 | `.codebuddy/commands/` | `.md` |

### 生成的目录结构
```
项目目录/
├── .rod/                    # ROD 核心目录
│   ├── spec-templates/      # 文档模板
│   ├── scripts/            # 脚本文件
│   └── memory/             # 记忆文件
├── .[ai-assistant]/        # AI 助手配置
└── .git/                   # Git 仓库（可选）
```

## 技术栈

### 核心依赖
- **TypeScript 5.2+**: 类型安全和现代 JS 特性
- **Commander.js 11.0**: CLI 命令解析
- **Chalk 4.1**: 终端彩色输出

### 开发工具
- **Jest 29.7**: 测试框架
- **ESLint + TypeScript**: 代码质量
- **Prettier**: 代码格式化

### 路径解析
- **BaseURL**: `./src`
- **路径映射**: `@/*` → `src/*`
- **绝对路径**: 支持跨平台路径处理

## 关键特性

### 1. 本地生成
- 无网络依赖的模板生成
- 预置模板文件
- 动态内容生成

### 2. 类型安全
- 完整的 TypeScript 类型定义
- 编译时错误检查
- IDE 智能提示

### 3. 错误处理
- 分类错误码 (`ExitCode` 枚举)
- 全局异常捕获
- 调试模式支持

### 4. 扩展性
- 插件化 AI 处理器
- 模块化架构
- 易于添加新 AI 助手

## 构建和部署

### NPM 脚本
```json
{
  "build": "tsc",
  "dev": "ts-node src/cli.ts",
  "test": "jest",
  "lint": "eslint src/**/*.ts"
}
```

### 发布配置
- **入口点**: `dist/cli.js`
- **二进制命令**: `rod`
- **Node.js 要求**: >=18.0.0