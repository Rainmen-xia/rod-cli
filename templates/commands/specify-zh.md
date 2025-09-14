---
description: 从自然语言功能描述创建或更新功能规范。
scripts:
  sh: scripts/bash/create-new-feature.sh --json "{ARGS}"
  ps: scripts/powershell/create-new-feature.ps1 -Json "{ARGS}"
---

根据作为参数提供的功能描述，执行以下操作：

1. 从代码库根目录运行脚本 `{SCRIPT}` 并解析其JSON输出以获取 BRANCH_NAME 和 SPEC_FILE。所有文件路径必须是绝对路径。
2. 加载 `templates/spec-template.md` 以了解所需的章节结构。
3. 使用模板结构将规范写入 SPEC_FILE，用从功能描述（参数）中派生的具体细节替换占位符，同时保持章节顺序和标题。
4. 报告完成情况，包括分支名称、规范文件路径以及准备进入下一阶段的状态。

注意：脚本会创建并切换到新分支，并在写入之前初始化规范文件。