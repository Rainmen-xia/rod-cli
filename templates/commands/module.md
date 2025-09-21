---
description: 创建模块目录结构，为项目组织和开发提供基础架构
scripts:
  sh: .specify/scripts/bash/analyze-modules.sh --json "{ARGS}"
  ps: .specify/scripts/powershell/analyze-modules.ps1 -Json "{ARGS}"
---

快速创建模块目录结构，支持灵活的项目组织方式。

**用法示例：**
- `/module user-auth` - 创建单个模块
- `/module user-auth/login` - 创建嵌套模块
- `/module user-auth order-system` - 创建多个模块

**执行步骤：**
1. 创建 `specs/modules/` 基础目录
2. 为每个指定的模块创建目录结构
3. 输出创建结果和下一步指导

**下一步：**
进入模块目录执行 `/specify` 开始需求规范阶段。