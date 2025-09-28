# ROD CLI 规格说明

## 用例场景

### UC-001: 默认模板初始化项目
**目标**: 使用默认模板创建新的ROD项目
**前置条件**: 用户已安装rod-cli
**主要流程**:
1. 用户执行 `rod init my-project --ai claude`
2. CLI使用根目录 `templates/` 中的默认模板
3. 生成 `.specify/` 目录包含通用模板内容
4. 生成 `.claude/commands/` 目录包含AI助手命令
5. 生成 `.claude-config.json` 配置文件

**预期结果**: 创建包含标准ROD工作流的项目结构

### UC-002: NPM模板首次安装使用
**目标**: 首次使用内网NPM模板创建项目
**前置条件**:
- 用户已安装rod-cli
- 用户有内网NPM访问权限和全局安装权限
- `@tencent/rod-cli-templates` 包已发布

**主要流程**:
1. 用户执行 `rod init my-pui-project --template pui --ai claude`
2. CLI检查全局node_modules中是否有 `@tencent/rod-cli-templates` (不存在)
3. CLI执行全局安装 `npm install -g @tencent/rod-cli-templates --registry=https://npm.tencent.com`
4. CLI直接从全局node_modules读取 `@tencent/rod-cli-templates/pui/` 目录
5. 使用PUI模板生成项目结构
6. 创建PUI专用命令 (component.md, page.md, optimize.md)

**预期结果**:
- 创建包含PUI专用工作流的项目
- 模板包全局安装，供后续使用

### UC-003: NPM模板复用
**目标**: 使用已安装的NPM模板快速创建项目
**前置条件**:
- `@tencent/rod-cli-templates` 已全局安装

**主要流程**:
1. 用户执行 `rod init another-pui-project --template pui --ai claude`
2. CLI检查全局node_modules中的 `@tencent/rod-cli-templates` (存在)
3. 直接从全局包读取PUI模板
4. 快速生成项目结构

**预期结果**:
- 快速创建项目(无需重新安装)
- 使用当前安装版本的PUI模板内容

### UC-004: NPM安装失败处理
**目标**: NPM全局安装失败时给出明确错误提示
**前置条件**:
- 用户无内网NPM访问权限 或 无全局安装权限 或 网络问题

**主要流程**:
1. 用户执行 `rod init my-project --template pui --ai claude`
2. CLI检查全局node_modules中无 `@tencent/rod-cli-templates`
3. CLI尝试全局安装失败
4. 显示具体的失败原因(网络问题/权限问题/包不存在等)
5. 项目初始化失败

**预期结果**:
- 显示清晰的NPM全局安装失败原因
- 项目初始化失败
- 给出解决建议(检查网络/检查权限/联系管理员等)

### UC-005: 模板不存在错误处理
**目标**: 处理指定模板不存在的情况
**前置条件**:
- `@tencent/rod-cli-templates` 已安装但不包含指定模板

**主要流程**:
1. 用户执行 `rod init my-project --template nonexistent --ai claude`
2. CLI检查全局node_modules中的 `@tencent/rod-cli-templates` (存在)
3. CLI在包中查找 `nonexistent/` 目录 (不存在)
4. 返回错误信息，列出可用的模板

**预期结果**:
- 显示清晰的模板不存在错误信息
- 项目初始化失败
- 提示可用的模板列表(如: pui, xdc等)

### UC-006: 多AI助手支持
**目标**: 同一模板支持不同AI助手格式
**前置条件**: PUI模板已可用

**主要流程**:
1. 用户执行 `rod init pui-claude --template pui --ai claude`
2. 生成 `.claude/commands/` 目录，命令文件为 `.md` 格式
3. 用户执行 `rod init pui-gemini --template pui --ai gemini`
4. 生成 `.gemini/commands/` 目录，命令文件为 `.toml` 格式
5. 用户执行 `rod init pui-copilot --template pui --ai copilot`
6. 生成 `.github/prompts/` 目录，命令文件为 `.prompt.md` 格式

**预期结果**:
- 相同模板内容适配不同AI助手格式
- 生成对应的配置文件和目录结构

### UC-007: 启动AI代理服务器
**目标**: 启动HTTP服务器提供AI代理功能
**前置条件**:
- 用户已安装rod-cli
- codebuddy命令已安装并已登录

**主要流程**:
1. 用户执行 `rod start-server --port 3000`
2. CLI检查codebuddy命令是否存在
3. CLI检查codebuddy登录状态
4. 启动Koa HTTP服务器在指定端口
5. 提供健康检查和AI查询接口
6. 显示服务器运行信息

**预期结果**:
- HTTP服务器成功启动在指定端口
- 提供 `/runCommand` 执行一次性命令接口
- 提供 `/chat` 对话接口
- 显示服务器访问地址和API端点

### UC-008: AI执行一次性命令API调用
**目标**: 通过HTTP接口调用AI助手
**前置条件**: AI代理服务器已启动

**主要流程**:
1. 客户端发送POST请求到 `/runCommand`
2. 请求体包含JSON格式: `{"query": "用户查询内容"}`
3. 调用codebuddy命令执行查询
4. 返回AI响应结果

**预期结果**:
- 成功情况返回: `{"code": 0, "message": "AI响应内容"}`
- 失败情况返回: `{"code": 1, "message": "错误信息"}`
- 支持CORS跨域请求

### UC-009: AI对话API调用
**目标**: 通过HTTP接口调用AI助手
**前置条件**: AI代理服务器已启动

**主要流程**:
1. 客户端发送POST请求到 `/chat`
2. 请求体包含JSON格式: `{"query": "用户查询内容"; "newChat"?: true/false}`
3. 调用codebuddy命令执行查询
4. 返回AI响应结果

**预期结果**:
- 成功情况返回: `{"code": 0, "message": "AI响应内容"}`
- 失败情况返回: `{"code": 1, "message": "错误信息"}`
- 支持CORS跨域请求

## 边界条件

### EC-001: 全局安装权限问题
**场景**: 用户无全局安装npm包的权限
**预期**: 显示权限错误，提示使用sudo或联系管理员

### EC-002: NPM包版本检查
**场景**: 全局安装的模板包版本过旧
**预期**: 提示用户更新：`npm update -g @tencent/rod-cli-templates`

### EC-003: 磁盘空间不足
**场景**: 全局安装NPM包时磁盘空间不足
**预期**: 显示磁盘空间错误，提示清理空间

### EC-004: 网络超时
**场景**: NPM全局安装超过60秒超时
**预期**: 取消安装，显示网络超时错误

### EC-005: AI代理服务无效端口
**场景**: 用户指定无效端口号（如0、65536+、负数）
**预期**: 显示端口验证错误，提示有效端口范围(1-65535)

### EC-006: Codebuddy命令检查超时
**场景**: codebuddy命令响应超过10秒
**预期**: 超时检查失败，提示网络或命令问题