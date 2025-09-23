#!/usr/bin/env node
// Create modular directory structure for project organization
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse arguments
const args = process.argv.slice(2);
let jsonMode = false;
const modules = [];

for (const arg of args) {
    if (arg === '--json') {
        jsonMode = true;
    } else if (arg === '--help' || arg === '-h') {
        console.log('Usage: node analyze-modules.js [--json] <module_name> [module_name2] ...');
        process.exit(0);
    } else {
        modules.push(arg);
    }
}

if (modules.length === 0) {
    console.error('Usage: node analyze-modules.js [--json] <module_name> [module_name2] ...');
    process.exit(1);
}

try {
    const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    const specsDir = path.join(repoRoot, 'specs');
    const modulesDir = path.join(specsDir, 'modules');

    // Create base directories
    fs.mkdirSync(specsDir, { recursive: true });
    fs.mkdirSync(modulesDir, { recursive: true });

    // Get existing modules
    const existingModules = [];
    if (fs.existsSync(modulesDir)) {
        const entries = fs.readdirSync(modulesDir);
        for (const entry of entries) {
            const entryPath = path.join(modulesDir, entry);
            if (fs.statSync(entryPath).isDirectory()) {
                existingModules.push(entry);
            }
        }
    }

    // Create requested modules
    const createdModules = [];
    for (const module of modules) {
        const modulePath = path.join(modulesDir, module);

        if (!fs.existsSync(modulePath)) {
            fs.mkdirSync(modulePath, { recursive: true });
            createdModules.push(module);
        }
    }

    // Output results
    const totalModules = existingModules.length + createdModules.length;

    if (jsonMode) {
        console.log(JSON.stringify({
            status: 'ready',
            modules_dir: modulesDir,
            existing_modules: existingModules,
            created_modules: createdModules,
            total_modules: totalModules
        }));
    } else {
        if (createdModules.length > 0) {
            console.log('Created modules:');
            for (const module of createdModules) {
                console.log(`  - ${path.join(modulesDir, module)}`);
            }
            console.log('');
            console.log(`Next: cd ${path.join(modulesDir, createdModules[0])} && /specify`);
        } else {
            console.log('All specified modules already exist.');
        }
    }
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}