# ROD CLI 项目路线图

**项目名称**: ROD CLI
**创建时间**: 2024-09-18
**最后更新**: 2024-09-18

## 项目概况

ROD CLI 是一个基于规则导向开发的命令行工具包，支持规范驱动的开发工作流，兼容多种 AI 助手。

## 当前待办事项

### 高优先级 TODO

#### 1. 自定义模板系统
**问题**: 当前模板太宽泛，很多业务场景只需要特定技术栈的模板
**需求**: 开发者自定义 command 模板功能

**架构设计**:
```
rod-cli/                    # 核心 CLI 包 (公共)
├── packages/
│   ├── rod-cli/           # 主包 -> npm: rod-cli
│   └── templates/         # 模板包集合
│       ├── public/        # 公开模板 -> npm: @rod-cli/templates-*
│       │   ├── react/     # @rod-cli/templates-react
│       │   ├── vue/       # @rod-cli/templates-vue
│       │   ├── api/       # @rod-cli/templates-api
│       │   └── ...
│       └── internal/      # 内部模板 -> npm: @tencent/rod-templates-*
│           ├── payment/   # @tencent/rod-templates-payment
│           ├── mm-api/    # @tencent/rod-templates-mm-api
│           └── ...
```

**发布策略**:
- **公共包**: `rod-cli` -> 开放 npm 仓库
- **公开模板**: `@rod-cli/templates-*` -> 开放 npm 仓库
- **内部模板**: `@tencent/rod-templates-*` -> 腾讯内部 npm 仓库

**实现方案**:
- 支持业务场景特定的模板（如 API 开发、前端组件等）
- 技术栈过滤（React、Vue、Express、Spring Boot 等）
- 权限控制的模板分发
- 自定义命令模板结构

**新增功能**:
```bash
rod template install <package>    # 安装模板包
rod template list [--scope=all]   # 列出可用模板 (默认只显示已安装)
rod template search <keyword>     # 搜索模板 (公开+已配置的私有源)
rod init --template=<name>         # 使用指定模板初始化
rod template create <name>         # 创建自定义模板
```

**目标时间**: 2024-10-31

#### 2. 模板定义格式
```yaml
# 示例: api-template.yaml
name: "API Development Template"
scenarios: ["api", "backend"]
tech_stack: ["node.js", "express"]

commands:
  specify:
    template: "api-spec.md"
  plan:
    template: "api-plan.md"
  tasks:
    template: "api-tasks.md"
```

## 已完成功能

- ✅ 核心 CLI 框架
- ✅ 多 AI 助手支持 (Claude/Copilot/Gemini/Cursor/Codebuddy)
- ✅ 本地模板生成
- ✅ 中文输入支持

## 实施计划

### 第一阶段: 架构重构 (2024-09-20 - 2024-09-30)
- **包拆分**:
  - 创建 monorepo 结构 (packages/)
  - 拆分核心 CLI 包和模板包
  - 设置 lerna 或 rush 管理多包
- **模板包结构**:
  - 设计模板包的标准格式
  - 创建 public 和 internal 目录结构
  - 实现模板包的发现和加载机制

### 第二阶段: 模板管理系统 (2024-10-01 - 2024-10-15)
- **模板管理命令**:
  - `rod template install/uninstall`
  - `rod template list/search`
  - 支持多 npm 源配置 (公开 + @tencent 域)
- **集成到 rod init**:
  - `--template` 参数支持
  - 模板变量替换引擎
  - 模板验证机制

### 第三阶段: 发布和生态 (2024-10-16 - 2024-10-31)
- **发布流程**:
  - 公开模板发布到 npm
  - 内部模板发布到 @tencent 域
  - CI/CD 自动化发布
- **示例模板包**:
  - @rod-cli/templates-react
  - @rod-cli/templates-api
  - @tencent/rod-templates-payment
- **文档和示例**:
  - 模板开发指南
  - 最佳实践文档

---

*最后更新: 2024-09-18 by rainmen-xia*