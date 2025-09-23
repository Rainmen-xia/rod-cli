#!/usr/bin/env node
const fs = require('fs');
const { getFeaturePaths, checkFeatureBranch, getCurrentBranch, checkFile, checkDir } = require('./common');

// Parse arguments
const args = process.argv.slice(2);
let jsonMode = false;

for (const arg of args) {
    if (arg === '--json') {
        jsonMode = true;
    } else if (arg === '--help' || arg === '-h') {
        console.log('Usage: node check-task-prerequisites.js [--json]');
        process.exit(0);
    }
}

try {
    const paths = getFeaturePaths();
    const currentBranch = getCurrentBranch();

    if (!checkFeatureBranch(currentBranch)) {
        process.exit(1);
    }

    if (!fs.existsSync(paths.FEATURE_DIR)) {
        console.error(`ERROR: Feature directory not found: ${paths.FEATURE_DIR}`);
        console.error('Run /specify first.');
        process.exit(1);
    }

    if (!fs.existsSync(paths.IMPL_PLAN)) {
        console.error(`ERROR: plan.md not found in ${paths.FEATURE_DIR}`);
        console.error('Run /plan first.');
        process.exit(1);
    }

    if (jsonMode) {
        const docs = [];
        if (fs.existsSync(paths.RESEARCH)) docs.push('research.md');
        if (fs.existsSync(paths.DATA_MODEL)) docs.push('data-model.md');
        if (fs.existsSync(paths.CONTRACTS_DIR)) {
            try {
                const files = fs.readdirSync(paths.CONTRACTS_DIR);
                if (files.length > 0) docs.push('contracts/');
            } catch (e) {}
        }
        if (fs.existsSync(paths.QUICKSTART)) docs.push('quickstart.md');

        console.log(JSON.stringify({
            FEATURE_DIR: paths.FEATURE_DIR,
            AVAILABLE_DOCS: docs
        }));
    } else {
        console.log(`FEATURE_DIR:${paths.FEATURE_DIR}`);
        console.log('AVAILABLE_DOCS:');
        console.log(checkFile(paths.RESEARCH, 'research.md'));
        console.log(checkFile(paths.DATA_MODEL, 'data-model.md'));
        console.log(checkDir(paths.CONTRACTS_DIR, 'contracts/'));
        console.log(checkFile(paths.QUICKSTART, 'quickstart.md'));
    }
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}