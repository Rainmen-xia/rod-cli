# 任务: [功能名称]

**输入**: 来自 `/specs/modules/[模块路径]/[功能名称]/` 的设计文档
**前置条件**: plan.md (必需), research.md, data-model.md, contracts/

## 执行流程 (主函数)
```
1. 从功能目录加载plan.md
   → 如果未找到: ERROR "未找到实现计划"
   → 提取: 技术栈, 库, 结构
2. 加载可选设计文档:
   → data-model.md: 提取实体 → 模型任务
   → contracts/: 每个文件 → 契约测试任务
   → research.md: 提取决策 → 设置任务
   → module-interfaces.md: 提取跨模块接口 → 集成任务
3. 按类别生成任务:
   → 设置: 项目初始化, 依赖, 代码检查
   → 测试: 契约测试, 集成测试
   → 核心: 模型, 服务, CLI命令
   → 集成: 数据库, 中间件, 日志
   → 模块集成: 跨模块接口, 模块间测试
   → 完善: 单元测试, 性能, 文档
4. 应用任务规则:
   → 不同文件 = 标记[P]并行
   → 同一文件 = 顺序(无[P])
   → 测试优先于实现(TDD)
5. 按顺序编号任务(T001, T002...)
6. 生成依赖图
7. 创建并行执行示例
8. 验证任务完整性:
   → 所有契约都有测试?
   → 所有实体都有模型?
   → 所有端点都已实现?
9. 返回: SUCCESS (任务已准备好执行)
```

## 格式: `[ID] [P?] 描述`
- **[P]**: 可以并行运行(不同文件, 无依赖)
- 在描述中包含确切的文件路径

## 路径约定
- **单项目**: 仓库根目录的 `src/`, `tests/`
- **Web应用**: `backend/src/`, `frontend/src/`
- **移动应用**: `api/src/`, `ios/src/` 或 `android/src/`
- 下面显示的路径假设单项目 - 根据plan.md结构调整

## 阶段3.1: 设置
- [ ] T001 根据实现计划创建项目结构
- [ ] T002 初始化[语言]项目并安装[框架]依赖
- [ ] T003 [P] 配置代码检查和格式化工具

## 阶段3.2: 测试优先 (TDD) ⚠️ 必须在3.3之前完成
**关键: 这些测试必须编写并且必须在任何实现之前失败**
- [ ] T004 [P] 在 tests/contract/test_users_post.py 中进行 POST /api/users 契约测试
- [ ] T005 [P] 在 tests/contract/test_users_get.py 中进行 GET /api/users/{id} 契约测试
- [ ] T006 [P] 在 tests/integration/test_registration.py 中进行用户注册集成测试
- [ ] T007 [P] 在 tests/integration/test_auth.py 中进行认证流程集成测试

## 阶段3.3: 核心实现 (仅在测试失败后)
- [ ] T008 [P] 在 src/models/user.py 中创建用户模型
- [ ] T009 [P] 在 src/services/user_service.py 中创建用户服务CRUD
- [ ] T010 [P] 在 src/cli/user_commands.py 中创建CLI --create-user
- [ ] T011 POST /api/users 端点
- [ ] T012 GET /api/users/{id} 端点
- [ ] T013 输入验证
- [ ] T014 错误处理和日志记录

## 阶段3.4: 集成
- [ ] T015 连接用户服务到数据库
- [ ] T016 认证中间件
- [ ] T017 请求/响应日志记录
- [ ] T018 CORS和安全头

## 阶段3.5: 完善
- [ ] T019 [P] 在 tests/unit/test_validation.py 中为验证添加单元测试
- [ ] T020 性能测试 (<200ms)
- [ ] T021 [P] 更新 docs/api.md
- [ ] T022 移除重复代码
- [ ] T023 运行 manual-testing.md

## 阶段3.6: 模块集成 *(如果存在module-interfaces.md)*
**关键: 仅在模块有跨模块依赖时执行**
- [ ] T024 [P] 实现跨模块接口契约 (基于module-interfaces.md)
- [ ] T025 跨模块集成测试 (验证模块间通信)
- [ ] T026 模块依赖兼容性验证
- [ ] T027 跨模块错误处理和容错机制
- [ ] T028 模块接口版本兼容性测试

## 依赖关系
- 测试 (T004-T007) 在实现之前 (T008-T014)
- T008 阻塞 T009, T015
- T016 阻塞 T018
- 核心实现在集成之前 (T008-T018) → (T019-T023)
- 模块集成依赖核心完成 (T019-T023) → (T024-T028)
- 跨模块任务可能需要等待其他模块完成

## 并行示例
```
# Launch T004-T007 together:
Task: "Contract test POST /api/users in tests/contract/test_users_post.py"
Task: "Contract test GET /api/users/{id} in tests/contract/test_users_get.py"
Task: "Integration test registration in tests/integration/test_registration.py"
Task: "Integration test auth in tests/integration/test_auth.py"
```

## 注意事项
- [P] 任务 = 不同文件, 无依赖
- 在实现前验证测试失败
- 每个任务后提交
- 避免: 模糊任务, 同文件冲突

## 任务生成规则
*在主函数执行期间应用*

1. **来自契约**:
   - 每个契约文件 → 契约测试任务 [P]
   - 每个端点 → 实现任务
   
2. **来自数据模型**:
   - 每个实体 → 模型创建任务 [P]
   - 关系 → 服务层任务
   
3. **来自用户故事**:
   - 每个故事 → 集成测试 [P]
   - 快速开始场景 → 验证任务

4. **来自模块接口** (如果存在module-interfaces.md):
   - 每个跨模块接口 → 接口实现任务 [P]
   - 每个模块依赖 → 集成测试任务
   - 接口版本兼容性 → 验证任务

5. **排序**:
   - 设置 → 测试 → 模型 → 服务 → 端点 → 完善 → 模块集成
   - 依赖阻止并行执行
   - 跨模块任务可能需要协调其他模块进度

## 验证检查清单
*门禁: 在返回前由主函数检查*

- [ ] 所有契约都有对应的测试
- [ ] 所有实体都有模型任务
- [ ] 所有测试都在实现之前
- [ ] 并行任务真正独立
- [ ] 每个任务指定确切的文件路径
- [ ] 没有任务修改与另一个[P]任务相同的文件

## 模块进度集成
*任务完成后更新模块进度状态*

**完成阶段指示**:
- 阶段3.1-3.3完成 → 更新spec.md: ⚡ 开发任务完成 → ✅
- 阶段3.6完成 → 更新spec.md: 🔗 模块集成完成 → ✅
- 所有任务完成 → 提示执行 `/progress` 进行项目进度同步

**模块完成度计算**:
- 基础设置 (T001-T003): 10%
- 测试编写 (T004-T007): 30%
- 核心实现 (T008-T018): 70%
- 完善任务 (T019-T023): 90%
- 模块集成 (T024-T028): 100%

**下一步指导**:
任务全部完成后，在当前模块目录执行 `/progress` 同步项目整体进度