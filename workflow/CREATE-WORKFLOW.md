# 创建新的工作流模板指导

本文档详细说明如何为 ROD CLI 创建自定义的工作流模板。

## 🎯 设计原则

创建新工作流模板应该遵循"工作流程优先"的设计原则：
1. **先定义工作流程** - 明确你的开发方法论和阶段划分
2. **再设计目录结构** - 基于工作流程确定需要的文件和命令
3. **最后实现功能** - 编写 AI 命令、脚本和模板文件
4. **持续优化完善** - 根据实际使用反馈迭代改进

## 📋 创建步骤

### 第一步：定义工作流程

创建 `workflow.md` 文件，详细描述你的工作流程：

```markdown
# [你的工作流名称] 工作流

## 工作流概述
- 目标技术栈：如 Vue3 + TypeScript、React Native、Spring Boot 等
- 适用场景：如企业级应用、移动端开发、微服务架构等
- 核心特色：如安全性要求、性能优化、特定业务流程等

## 工作流阶段定义

### 阶段 1: [阶段名称] (`/command1`)
- **目标**: 该阶段要达成的具体目标
- **输入**: 需要什么输入信息或前置条件
- **处理**: 具体执行什么操作和逻辑
- **输出**: 生成什么文件或状态变更
- **下一步**: 指导用户进行下一步操作

### 阶段 2: [阶段名称] (`/command2`)
[重复上述结构...]

## 特色功能和工具集成
- 专用工具集成：如 Figma MCP、特定测试框架等
- 质量保障：代码规范、测试策略、安全检查等
- 自动化支持：脚本工具、模板生成、状态同步等

## 与默认工作流的差异
明确说明与 ROD 默认工作流的不同之处和增强功能
```

### 第二步：基于工作流程设计目录结构

根据你在 `workflow.md` 中定义的阶段，设计模板目录结构：

```
your-workflow-template/
├── README.md                 # 模板说明（包含 workflow.md 的引用）
├── workflow.md              # 工作流程详细定义
├── commands/                # AI 助手命令（必需）
│   ├── command1.md          # 对应工作流阶段 1
│   ├── command2.md          # 对应工作流阶段 2
│   ├── command3.md          # 对应工作流阶段 3
│   └── ...                  # 其他阶段命令
├── spec-templates/         # 辅助commands生成指定的spec文档（推荐）
│   ├── spec-template.md     # 定制化的规范模板
│   ├── plan-template.md     # 定制化的设计模板
│   ├── tasks-template.md    # 定制化的任务模板
│   └── workflow.md          # 复制工作流程定义
├── scripts/                 # 自动化脚本（可选）
│   ├── common.js           # 通用工具函数
│   ├── analyze-modules.js   # 定制化的分析脚本
│   └── ...                 # 其他专用脚本
├── memory/                 # 项目宪法（可选）
│   └── constitution.md     # 工作流特定的开发约束
└── rules/                  # 规则文件（可选）
    └── workflow-rules.md   # 工作流特定规则
```

### 第三步：编写 AI 命令文件

为每个工作流阶段编写对应的 AI 命令文件，遵循以下格式：

```markdown
---
description: 命令的功能描述，对应 workflow.md 中的阶段说明
scripts:
  node: node .rod/scripts/your-script.js --json {ARGS}
---

[从 workflow.md 中复制该阶段的详细描述]

**执行步骤：**
1. **前置条件检查**
   - 检查必需的文件和环境
   - 验证上一阶段的输出

2. **加载模板**（如适用）
   - 加载 `.rod/spec-templates/xxx-template.md`
   - 基于工作流特点调整模板内容

3. **执行核心逻辑**
   - 实现 workflow.md 中定义的处理逻辑
   - 调用相关工具和集成

4. **生成输出**
   - 创建或更新相关文档
   - 输出到正确的 specs/ 目录结构

5. **下一步指导**
   - 指导用户执行后续命令
   - 提供质量检查建议

**重要说明：**
- 确保与 workflow.md 中的阶段定义保持一致
- 遵循 ROD 规范，输出到 specs/modules/ 目录结构
- 使用绝对路径进行所有文件操作
```

### 第四步：创建文档模板

基于工作流的特殊需求，定制化文档模板：

**spec-template.md 定制要点：**
- 包含工作流特定的需求格式
- 添加技术栈相关的验收标准模板
- 集成特定业务领域的规范要求

**plan-template.md 定制要点：**
- 预定义技术栈的架构选择
- 包含工作流特有的设计模式
- 集成专用工具和框架的使用指导

**tasks-template.md 定制要点：**
- 反映工作流的开发实践（如 TDD、安全检查等）
- 包含技术栈特定的任务类型
- 集成质量保障和测试策略

### 第五步：实现支持脚本

如果工作流需要特殊的自动化支持，创建 Node.js 脚本：

```javascript
#!/usr/bin/env node
/**
 * [脚本功能描述] - 支持 workflow.md 中定义的 [具体阶段]
 */

const fs = require('fs');
const path = require('path');
const { getRepoRoot, getFeaturePaths } = require('./common');

// 实现工作流特定的逻辑
// 注意：只使用 Node.js 内置模块，不依赖第三方包

async function main() {
  // 脚本实现逻辑
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
```

### 第六步：编写项目宪法

创建 `memory/constitution.md`，定义工作流特定的开发约束：

```markdown
# [工作流名称] 项目宪法

## 核心原则
基于 workflow.md 定义的开发理念和原则

## 技术约束
- [技术栈] 特定的技术规范和限制
- 依赖管理策略
- 性能和安全要求

## 工作流约束
- 阶段执行顺序要求
- 质量门禁标准
- 文档完整性要求

## 质量保障
- 测试覆盖率要求
- 代码审查标准
- 部署前检查清单
```

## 🔧 模板测试和验证

### 本地测试步骤

1. **创建测试项目**
   ```bash
   # 将你的模板放在 packages/internal-templates/your-template/
   cd packages/internal-templates/
   mkdir your-template
   # 按照上述结构创建文件
   ```

2. **生成测试项目**
   ```bash
   cd ../../
   npm run build
   npm run dev -- init test-your-template --template your-template --ai claude
   ```

3. **验证生成结果**
   ```bash
   cd test-your-template
   # 检查 .rod/ 目录结构
   # 验证 AI 命令是否正确生成
   # 测试 workflow.md 是否被正确复制
   ```

### 质量检查清单

- [ ] `workflow.md` 定义清晰，阶段划分合理
- [ ] 目录结构符合 ROD 规范要求
- [ ] 所有 AI 命令文件包含完整的 Front Matter
- [ ] 命令实现与 workflow.md 中的阶段定义一致
- [ ] 生成的项目包含正确的 `.rod/` 目录结构
- [ ] 文档模板体现工作流的特色和要求
- [ ] 脚本使用 Node.js 内置模块，无外部依赖
- [ ] 本地测试生成正确的项目结构

## 📚 参考示例

查看现有的内部模板作为参考：

- **PUI 模板** (`packages/internal-templates/pui/`)
  - 技术栈：Vue3 + TDesign + 微信支付组件库
  - 工作流：5 阶段 + Figma 集成 + 组件库优先级
  - 特色：支付安全、组件映射、设计还原

## 🎯 进阶定制

### 工作流继承

新工作流可以继承默认工作流的基础能力：
- 复用 `module`、`specify`、`plan`、`tasks`、`progress` 基础流程
- 在此基础上添加或替换特定阶段
- 扩展模板内容和脚本功能

### MCP 工具集成

如果工作流需要集成特定的 MCP 工具：
- 在 `workflow.md` 中说明 MCP 工具的作用
- 在 AI 命令中添加 MCP 调用指导
- 在模板根目录提供 `.mcp.json` 配置文件

### 企业级扩展

在企业环境中，可以进一步定制：
- 集成企业内部工具和系统
- 添加合规检查和安全扫描
- 定制化部署和监控流程
- 集成企业级的项目管理工具

---

**重要提醒：**
创建新工作流模板时，始终以 `workflow.md` 为核心，确保所有其他文件都服务于工作流程的实现。这样可以保证工作流的一致性和可维护性。
