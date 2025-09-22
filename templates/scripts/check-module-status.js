#!/usr/bin/env node
// Check and display module completion status and progress
const fs = require('fs');
const path = require('path');
const { getRepoRoot } = require('./common');

// Parse arguments
const args = process.argv.slice(2);
let jsonMode = false;

for (const arg of args) {
    if (arg === '--json') {
        jsonMode = true;
    } else if (arg === '--help' || arg === '-h') {
        console.log('Usage: node check-module-status.js [--json]');
        process.exit(0);
    }
}

try {
    const repoRoot = getRepoRoot();
    const currentDir = process.cwd();

    // Check if we're in a module directory
    let modulePath = '';
    const moduleMatch = currentDir.match(/.*\/specs\/modules\/([^\/]+)/);

    if (!moduleMatch) {
        // Not in a module directory
        if (jsonMode) {
            console.log(JSON.stringify({
                ERROR: "Not in a module directory",
                SUGGESTION: "Navigate to a module directory or use /module command"
            }));
        } else {
            console.log("❌ Error: Not currently in a module directory");
            console.log("💡 Suggestion: Navigate to a module directory or use '/module <module_name>' command");
        }
        process.exit(1);
    }

    modulePath = moduleMatch[1];
    const featureDir = path.join(repoRoot, 'specs', 'modules', modulePath);

    // File paths
    const specFile = path.join(featureDir, 'spec.md');
    const designFile = path.join(featureDir, 'plan.md');
    const todoFile = path.join(featureDir, 'tasks.md');
    const modulesDir = path.join(featureDir, 'modules');

    // Check file existence and content
    function checkFileStatus(filePath) {
        if (!fs.existsSync(filePath)) {
            return 'not_exists';
        }

        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
            return 'empty';
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').length;
        if (lines < 10) {
            return 'minimal';
        }

        return 'complete';
    }

    // Calculate overall progress percentage
    function calculateProgress() {
        const totalStages = 4;
        let completed = 0;

        // Module structure (always complete if we're here)
        completed++;

        // Spec analysis
        const specStatus = checkFileStatus(specFile);
        if (specStatus === 'complete') {
            completed++;
        }

        // Design
        const designStatus = checkFileStatus(designFile);
        if (designStatus === 'complete') {
            completed++;
        }

        // Todo
        const todoStatus = checkFileStatus(todoFile);
        if (todoStatus === 'complete') {
            completed++;
        }

        return Math.floor((completed * 100) / totalStages);
    }

    // Count tasks in tasks.md
    function countTasks() {
        if (!fs.existsSync(todoFile)) {
            return { completed: 0, total: 0 };
        }

        const content = fs.readFileSync(todoFile, 'utf8');
        const lines = content.split('\n');

        let total = 0;
        let completed = 0;

        for (const line of lines) {
            if (line.match(/^- \[ \]/)) {
                total++;
            } else if (line.match(/^- \[x\]/)) {
                total++;
                completed++;
            }
        }

        return { completed, total };
    }

    // Check submodules
    function checkSubmodules() {
        if (!fs.existsSync(modulesDir)) {
            return 0;
        }

        const entries = fs.readdirSync(modulesDir);
        let count = 0;

        for (const entry of entries) {
            const entryPath = path.join(modulesDir, entry);
            if (fs.statSync(entryPath).isDirectory()) {
                count++;
            }
        }

        return count;
    }

    // Generate status information
    const specStatus = checkFileStatus(specFile);
    const designStatus = checkFileStatus(designFile);
    const todoStatus = checkFileStatus(todoFile);
    const progress = calculateProgress();
    const taskCounts = countTasks();
    const submoduleCount = checkSubmodules();

    // Generate next step suggestion
    let nextStep = '';
    if (specStatus !== 'complete') {
        nextStep = "Execute '/spec <feature_description>' to start requirements analysis";
    } else if (designStatus !== 'complete') {
        nextStep = "Execute '/design' to create technical design document";
    } else if (todoStatus !== 'complete') {
        nextStep = "Execute '/todo' to create actionable task list";
    } else if (taskCounts.completed < taskCounts.total) {
        nextStep = "Continue implementing tasks from tasks.md or execute '/sync' to update progress";
    } else {
        nextStep = "Execute '/sync' to synchronize progress to project roadmap";
    }

    if (jsonMode) {
        console.log(JSON.stringify({
            MODULE_PATH: modulePath,
            PROGRESS_PERCENTAGE: progress,
            SPEC_STATUS: specStatus,
            DESIGN_STATUS: designStatus,
            TODO_STATUS: todoStatus,
            TASK_COMPLETED: taskCounts.completed,
            TASK_TOTAL: taskCounts.total,
            SUBMODULE_COUNT: submoduleCount,
            NEXT_STEP: nextStep
        }, null, 2));
    } else {
        console.log(`## 模块状态报告 - ${modulePath}`);
        console.log('');
        console.log(`### 📊 总体进度: ${progress}%`);
        console.log('');
        console.log('### 🔍 阶段详情:');
        console.log('- ✅ 模块创建: 已完成');

        switch (specStatus) {
            case 'complete':
                console.log('- ✅ 需求分析: 已完成 (spec.md 已创建)');
                break;
            case 'minimal':
                console.log('- 🔄 需求分析: 进行中 (spec.md 内容较少)');
                break;
            case 'empty':
                console.log('- ⏳ 需求分析: 待开始 (spec.md 为空)');
                break;
            default:
                console.log('- ⏳ 需求分析: 待开始 (spec.md 不存在)');
        }

        switch (designStatus) {
            case 'complete':
                console.log('- ✅ 技术设计: 已完成 (plan.md 已创建)');
                break;
            case 'minimal':
                console.log('- 🔄 技术设计: 进行中 (plan.md 内容较少)');
                break;
            case 'empty':
                console.log('- ⏳ 技术设计: 待开始 (plan.md 为空)');
                break;
            default:
                console.log('- ⏳ 技术设计: 待开始 (plan.md 不存在)');
        }

        switch (todoStatus) {
            case 'complete':
                console.log(`- ✅ 任务规划: 已完成 (tasks.md 包含 ${taskCounts.total} 个任务)`);
                break;
            case 'minimal':
                console.log('- 🔄 任务规划: 进行中 (tasks.md 内容较少)');
                break;
            case 'empty':
                console.log('- ⏳ 任务规划: 待开始 (tasks.md 为空)');
                break;
            default:
                console.log('- ⏳ 任务规划: 待开始 (tasks.md 不存在)');
        }

        console.log('- 🔄 进度同步: 可根据需要执行');
        console.log('');

        if (taskCounts.total > 0) {
            console.log('### 📈 任务完成情况:');
            console.log(`- 总任务数: ${taskCounts.total}`);
            console.log(`- 已完成: ${taskCounts.completed}`);
            console.log(`- 待完成: ${taskCounts.total - taskCounts.completed}`);
            console.log('');
        }

        if (submoduleCount > 0) {
            console.log('### 📂 子模块:');
            console.log(`- 子模块数量: ${submoduleCount}`);
            console.log('');
        }

        console.log('### 🔔 下一步建议:');
        console.log(`- ${nextStep}`);
        console.log('');
        console.log('**✅ 状态检查完成！**');
    }

} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}