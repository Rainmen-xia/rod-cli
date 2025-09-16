# 实现计划: [功能]

<!-- VARIANT:sh - 为你的AI助手运行 `/scripts/bash/update-agent-context.sh __AGENT__` -->
<!-- VARIANT:ps - 为你的AI助手运行 `/scripts/powershell/update-agent-context.ps1 -AgentType __AGENT__` -->

**分支**: `[###-功能名称]` | **日期**: [日期] | **规范**: [链接]
**输入**: 来自 `/specs/[###-功能名称]/spec.md` 的功能规范

## 执行流程 (/plan命令范围)
```
1. 从输入路径加载功能规范
   → 如果未找到: ERROR "在{路径}处没有找到功能规范"
2. 填写技术上下文(扫描需要澄清的内容)
   → 从上下文检测项目类型(web=前端+后端, mobile=应用+API)
   → 基于项目类型设置结构决策
3. 评估下面的宪法检查部分
   → 如果存在违规: 在复杂性跟踪中记录
   → 如果无法证明必要性: ERROR "请先简化方法"
   → 更新进度跟踪: 初始宪法检查
4. 执行阶段0 → research.md
   → 如果仍有需要澄清的内容: ERROR "解决未知问题"
5. 执行阶段1 → contracts, data-model.md, quickstart.md, 特定代理模板文件(例如Claude Code的`CLAUDE.md`、GitHub Copilot的`.github/copilot-instructions.md`或Gemini CLI的`GEMINI.md`)
6. 重新评估宪法检查部分
   → 如果出现新违规: 重构设计，返回阶段1
   → 更新进度跟踪: 设计后宪法检查
7. 规划阶段2 → 描述任务生成方法(不要创建tasks.md)
8. 停止 - 准备好执行/tasks命令
```

**重要**: /plan命令在步骤7停止。阶段2-4由其他命令执行:
- 阶段2: /tasks命令创建tasks.md
- 阶段3-4: 实现执行(手动或通过工具)

## 摘要
[从功能规范中提取: 主要需求 + 来自研究的技术方法]

## 技术上下文
**语言/版本**: [例如, Python 3.11, Swift 5.9, Rust 1.75 或 需要澄清]  
**主要依赖**: [例如, FastAPI, UIKit, LLVM 或 需要澄清]  
**存储**: [如果适用, 例如, PostgreSQL, CoreData, 文件 或 不适用]  
**测试**: [例如, pytest, XCTest, cargo test 或 需要澄清]  
**目标平台**: [例如, Linux服务器, iOS 15+, WASM 或 需要澄清]
**项目类型**: [单一/网页/移动 - 决定源码结构]  
**性能目标**: [特定领域, 例如, 1000请求/秒, 10k行/秒, 60fps 或 需要澄清]  
**约束条件**: [特定领域, 例如, <200ms p95, <100MB内存, 离线可用 或 需要澄清]  
**规模/范围**: [特定领域, 例如, 1万用户, 100万行代码, 50个页面 或 需要澄清]

## 宪法检查
*门禁: 必须在阶段0研究前通过。在阶段1设计后重新检查。*

**简洁性**:
- 项目数: [#] (最多3个 - 例如, api, cli, tests)
- 直接使用框架? (没有包装类)
- 单一数据模型? (除非序列化不同，否则没有DTO)
- 避免模式? (没有经过验证需要的Repository/UoW)

**架构**:
- 每个功能都作为库? (没有直接的应用代码)
- 库清单: [每个的名称 + 目的]
- 每个库的CLI: [带有--help/--version/--format的命令]
- 库文档: 计划使用llms.txt格式?

**测试 (不可协商)**:
- 强制执行红-绿-重构循环? (测试必须先失败)
- Git提交显示测试在实现之前?
- 严格遵循顺序: 契约→集成→端到端→单元?
- 使用真实依赖? (实际数据库，不是模拟)
- 集成测试用于: 新库、契约变更、共享模式?
- 禁止: 测试前实现、跳过红色阶段

**可观察性**:
- 包含结构化日志?
- 前端日志 → 后端? (统一流)
- 错误上下文充分?

**版本控制**:
- 分配版本号? (主版本.次版本.构建)
- 每次变更都增加构建号?
- 处理破坏性变更? (并行测试、迁移计划)

## 项目结构

### 文档 (此功能)
```
specs/[###-功能]/
├── plan.md              # 此文件 (/plan命令输出)
├── research.md          # 阶段0输出 (/plan命令)
├── data-model.md        # 阶段1输出 (/plan命令)
├── quickstart.md        # 阶段1输出 (/plan命令)
├── contracts/           # 阶段1输出 (/plan命令)
└── tasks.md             # 阶段2输出 (/tasks命令 - 不是由/plan创建)
```

### 源代码 (仓库根目录)
```
# 选项1: 单项目 (默认)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# 选项2: Web应用 (当检测到"前端" + "后端"时)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# 选项3: 移动应用 + API (当检测到"iOS/Android"时)
api/
└── [与上面后端相同]

ios/ or android/
└── [平台特定结构]
```

**结构决策**: [默认选项1，除非技术上下文表明是web/移动应用]

## 阶段0: 大纲和研究
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## 阶段1: 设计和契约
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   VARIANT-INJECT
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## 阶段2: 任务规划方法
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## 阶段3+: 未来实现
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## 复杂性跟踪
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## 进度跟踪
*This checklist is updated during execution flow*

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [ ] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*