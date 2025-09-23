# ROD 默认工作流模板

## 概述

这是 ROD CLI 的默认工作流模板，为规范驱动开发提供通用的项目初始化支持。此模板适用于大多数软件开发项目，提供标准的五阶段开发工作流。

> 📚 **详细工作流程说明**: 查看 [WORKFLOW.md](./WORKFLOW.md) 了解完整的 ROD 规范驱动开发方法论和实践指导

## 工作流模板结构

```
workflow/
├── commands/              # AI 助手命令（必需）
│   ├── module.md          # 创建新模块
│   ├── specify.md         # 功能规范定义
│   ├── plan.md           # 技术方案设计
│   ├── tasks.md          # 任务分解和执行
│   └── progress.md       # 进度同步管理
├── memory/               # 项目宪法（必需）
│   └── constitution.md   # ROD 开发原则和约束
├── scripts/              # Node.js 自动化脚本（必需）
│   ├── analyze-modules.js    # 模块分析工具
│   ├── check-module-status.js # 模块状态检查
│   ├── create-module.js      # 模块创建脚本
│   ├── create-module-spec.js # 模块规范生成
│   ├── generate-module-tasks.js # 任务生成
│   ├── sync-progress.js      # 进度同步
│   ├── common.js            # 通用工具函数
│   └── ...                  # 其他辅助脚本
└── spec-templates/        # 规范文档模板（必需）
    ├── spec-template.md      # 功能规范模板
    ├── plan-template.md      # 技术设计模板
    ├── tasks-template.md     # 任务规划模板
    ├── roadmap-template.md   # 项目路线图模板
    └── WORKFLOW.md          # 详细工作流程说明
```

## ROD 五阶段工作流

此默认模板实现标准的 ROD 开发工作流，适用于各种技术栈和项目类型：

### 1. 🏗️ 模块初始化 (`/module`)
- **命令**: `module.md`
- **作用**: 创建新的功能模块目录结构
- **输出**: `specs/modules/{模块名}/` 目录和基础文件
- **适用**: 所有项目类型的模块化开发

### 2. 📋 需求规范 (`/specify`)
- **命令**: `specify.md`
- **作用**: 基于 `spec-template.md` 创建详细的功能规范
- **输出**: `spec.md` - 包含业务需求和验收标准
- **适用**: 功能设计阶段，明确需求边界

### 3. 🎯 技术设计 (`/plan`)
- **命令**: `plan.md`
- **作用**: 基于 `plan-template.md` 生成技术实现方案
- **输出**: `plan.md` - 包含架构设计和技术决策
- **适用**: 技术方案设计，架构规划

### 4. ✅ 任务执行 (`/tasks`)
- **命令**: `tasks.md`
- **作用**: 基于 `tasks-template.md` 分解开发任务
- **输出**: `tasks.md` - 包含具体的开发和测试任务
- **适用**: 开发实施阶段，任务管理

### 5. 🔄 进度同步 (`/progress`)
- **命令**: `progress.md`
- **作用**: 同步模块进度到项目路线图
- **输出**: 更新 `specs/roadmap.md` 项目整体状态
- **适用**: 项目管理，进度跟踪

## 通用设计原则

### 技术栈无关性
- 支持前端、后端、移动端、桌面应用等各种项目
- 不绑定特定技术栈或框架
- 通过模板参数适配不同技术环境

### 模块化架构
- 支持大型项目的模块化开发
- 清晰的模块边界和依赖关系
- 递归模块结构，支持子模块

### 增量开发
- 每个阶段独立完成，可逐步推进
- 支持迭代开发和敏捷方法
- 清晰的检查点和质量门禁

## 使用说明

### 自动应用场景
此默认工作流模板在以下情况下自动使用：

1. **标准项目初始化**
   ```bash
   rod init my-project --ai claude
   ```

2. **无指定模板时的默认选择**
   ```bash
   rod init --ai claude  # 在当前目录初始化
   ```

### 生成的项目结构
使用默认模板初始化后，将生成以下结构：
```
my-project/
├── .rod/
│   ├── spec-templates/    # 复制的规范文档模板
│   │   ├── spec-template.md
│   │   ├── plan-template.md
│   │   ├── tasks-template.md
│   │   ├── roadmap-template.md
│   │   └── WORKFLOW.md   # 详细工作流程说明
│   ├── scripts/          # 工作流脚本
│   └── memory/           # 项目宪法
├── .claude/              # Claude AI 命令（如选择 Claude）
│   └── commands/
├── specs/                # 项目规范目录
│   ├── roadmap.md       # 项目路线图
│   └── modules/         # 模块目录
└── README.md            # 项目说明
```

### 与专用模板的区别
- **默认模板**: 通用工作流，适用于各种项目类型
- **专用模板** (如 PUI): 针对特定技术栈定制，包含专用命令和模板

### 适用项目类型
- Web 应用 (前端/后端/全栈)
- 移动应用 (iOS/Android/跨平台)
- 桌面应用 (Electron/Qt/Swing 等)
- 服务端应用 (API/微服务/单体应用)
- 命令行工具和脚本
- 数据处理和分析项目
- 其他软件开发项目

## 📚 相关文档

- **[详细工作流程说明](./WORKFLOW.md)** - 完整的 ROD 规范驱动开发方法论
- **[创建新工作流指导](./CREATE-WORKFLOW.md)** - 如何创建自定义工作流模板
- **[模板技术规范](./TEMPLATE-SPECIFICATIONS.md)** - 模板开发的技术标准和规范

---

**开始使用**: 运行 `rod init your-project --ai claude` 开始使用 ROD 工作流开发你的项目。
