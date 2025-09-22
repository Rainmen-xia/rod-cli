#!/usr/bin/env node
// Create or navigate to a module with proper directory structure
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse arguments
const args = process.argv.slice(2);
let jsonMode = false;
const moduleArgs = [];

for (const arg of args) {
    if (arg === '--json') {
        jsonMode = true;
    } else if (arg === '--help' || arg === '-h') {
        console.log('Usage: node create-module.js [--json] <module_path>');
        process.exit(0);
    } else {
        moduleArgs.push(arg);
    }
}

const modulePath = moduleArgs.join(' ');
if (!modulePath) {
    console.error('Usage: node create-module.js [--json] <module_path>');
    process.exit(1);
}

try {
    const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    const specsDir = path.join(repoRoot, 'specs');
    const moduleDir = path.join(specsDir, 'modules', modulePath);

    // Ensure specs and modules directories exist
    fs.mkdirSync(path.join(specsDir, 'modules'), { recursive: true });

    // Check if module already exists
    if (fs.existsSync(moduleDir)) {
        // Module exists, check status
        const reqStatus = fs.existsSync(path.join(moduleDir, 'spec.md')) ? 'exists' : 'missing';
        const designStatus = fs.existsSync(path.join(moduleDir, 'plan.md')) ? 'exists' : 'missing';
        const todoStatus = fs.existsSync(path.join(moduleDir, 'tasks.md')) ? 'exists' : 'missing';

        if (jsonMode) {
            console.log(JSON.stringify({
                status: 'exists',
                module_dir: moduleDir,
                requirements: reqStatus,
                design: designStatus,
                todo: todoStatus
            }));
        } else {
            console.log(`MODULE_DIR: ${moduleDir}`);
            console.log(`STATUS: exists`);
            console.log(`REQUIREMENTS: ${reqStatus}`);
            console.log(`DESIGN: ${designStatus}`);
            console.log(`TODO: ${todoStatus}`);
        }
    } else {
        // Create new module
        fs.mkdirSync(path.join(moduleDir, 'modules'), { recursive: true });

        // Create template files
        const templateDir = path.join(repoRoot, '.specify', 'templates');
        const filesCreated = [];

        // Copy and update spec template
        const specTemplate = path.join(templateDir, 'spec-template.md');
        if (fs.existsSync(specTemplate)) {
            let content = fs.readFileSync(specTemplate, 'utf8');
            content = content.replace(/\[模块名称\]/g, modulePath);
            content = content.replace(/\[模块路径\]/g, modulePath);
            content = content.replace(/\[创建时间\]/g, new Date().toLocaleString('zh-CN'));
            fs.writeFileSync(path.join(moduleDir, 'spec.md'), content);
            filesCreated.push('spec.md');
        }

        // Copy and update design template
        const designTemplate = path.join(templateDir, 'plan-template.md');
        if (fs.existsSync(designTemplate)) {
            let content = fs.readFileSync(designTemplate, 'utf8');
            content = content.replace(/\[模块名称\]/g, modulePath);
            content = content.replace(/\[模块路径\]/g, modulePath);
            content = content.replace(/\[创建时间\]/g, new Date().toLocaleString('zh-CN'));
            fs.writeFileSync(path.join(moduleDir, 'plan.md'), content);
            filesCreated.push('plan.md');
        }

        // Copy and update todo template
        const todoTemplate = path.join(templateDir, 'tasks-template.md');
        if (fs.existsSync(todoTemplate)) {
            let content = fs.readFileSync(todoTemplate, 'utf8');
            content = content.replace(/\[模块名称\]/g, modulePath);
            content = content.replace(/\[模块路径\]/g, modulePath);
            content = content.replace(/\[创建时间\]/g, new Date().toLocaleString('zh-CN'));
            fs.writeFileSync(path.join(moduleDir, 'tasks.md'), content);
            filesCreated.push('tasks.md');
        }

        if (jsonMode) {
            console.log(JSON.stringify({
                status: 'created',
                module_dir: moduleDir,
                files_created: filesCreated
            }));
        } else {
            console.log(`MODULE_DIR: ${moduleDir}`);
            console.log(`STATUS: created`);
            console.log(`FILES_CREATED: ${filesCreated.join(' ')}`);
        }
    }
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}