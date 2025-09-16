---
description: 分析业务需求并创建规范化的模块目录结构，为大型项目建立可迭代的开发架构
scripts:
  sh: .specify/scripts/bash/analyze-modules.sh --json "{ARGS}"
  ps: .specify/scripts/powershell/analyze-modules.ps1 -Json "{ARGS}"
---

基于业务需求进行模块化分析，创建标准的目录结构，为后续的specify/plan/tasks流程提供清晰的工作路径。

**核心职责：架构分析 + 目录创建，不产生任何内容文件**

执行步骤：

1. 运行 `{SCRIPT}` 获取当前项目结构和已有模块信息
2. 分析用户提供的业务需求：
   - 识别核心业务领域（如用户管理、订单处理、支付系统）
   - 分析各领域内的功能模块（如登录、注册、权限管理）
   - 确定模块间的依赖关系和优先级
   - 评估模块的复杂度和开发顺序

3. 设计模块目录架构：
   ```
   specs/modules/
   ├── user-management/           # 领域模块
   │   └── modules/
   │       ├── authentication/   # 功能模块
   │       ├── registration/     # 功能模块
   │       └── profile/          # 功能模块
   ├── order-system/             # 领域模块  
   │   └── modules/
   │       ├── cart/             # 功能模块
   │       └── checkout/         # 功能模块
   ```

4. **仅创建目录结构**：
   - 创建所有必要的模块目录
   - 不创建任何内容文件（spec.md、plan.md、tasks.md等）
   - 所有内容文件由后续的specify/plan/tasks命令负责创建

5. 输出模块架构分析报告（控制台输出，不写入文件）：
   - 模块清单和职责边界
   - 推荐的开发优先级和依赖关系
   - 下一步的工作指导

**模块命名规范**：
- 使用小写字母和连字符（kebab-case）
- 领域模块名反映业务领域（如user-management, payment-system）
- 功能模块名反映具体功能（如authentication, profile-management）

**目录结构规范**：
- 每个领域模块下必须有modules/子目录
- 支持无限层级嵌套（复杂功能可继续拆分）
- 保持目录结构的一致性和可预测性

**与后续流程的衔接**：
- 目录创建完成后，用户可进入任意模块目录执行`/specify`
- 每个模块独立完成specify→plan→tasks→progress完整周期
- 支持多模块并行开发和迭代

**完成模块创建后的指导：**

**✅ 模块架构创建完成！**

**下一步建议：**
- 选择核心模块，进入模块目录执行 `/specify` 开始需求规范
- 建议按依赖关系顺序：基础模块 → 核心模块 → 扩展模块
- 每个模块完成完整开发周期后再开始下一个模块

**重要提醒：**
- 本命令只负责目录结构创建，不产生内容文件
- 所有spec.md、plan.md、tasks.md等文件由后续命令创建
- 支持随时调整模块结构，添加或重组模块目录

使用绝对路径进行所有目录操作，确保模块结构的准确性。