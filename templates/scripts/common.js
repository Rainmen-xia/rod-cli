#!/usr/bin/env node
// Common functions and variables for all scripts
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getRepoRoot() {
    try {
        return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    } catch (error) {
        throw new Error('Not in a git repository');
    }
}

function getCurrentBranch() {
    try {
        return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
        throw new Error('Failed to get current branch');
    }
}

function checkFeatureBranch(branch) {
    // Accept any valid git branch name - no restrictions
    // Branch names are independent of module/directory structure
    return true;
}

function getFeaturePaths() {
    const repoRoot = getRepoRoot();
    const currentBranch = getCurrentBranch();

    // Only detect module path from current working directory
    // Branch names are completely independent of module structure
    let modulePath = '';
    const currentDir = process.cwd();

    const moduleMatch = currentDir.match(/.*\/specs\/modules\/([^\/]+)/);
    if (moduleMatch) {
        modulePath = moduleMatch[1];
    }

    // If no module path detected, return empty paths
    // Scripts should handle this case explicitly
    let featureDir = '';
    if (modulePath) {
        featureDir = path.join(repoRoot, 'specs', 'modules', modulePath);
    }

    return {
        REPO_ROOT: repoRoot,
        CURRENT_BRANCH: currentBranch,
        MODULE_PATH: modulePath,
        FEATURE_DIR: featureDir,
        FEATURE_SPEC: path.join(featureDir, 'spec.md'),
        IMPL_PLAN: path.join(featureDir, 'plan.md'),
        TASKS: path.join(featureDir, 'tasks.md'),
        RESEARCH: path.join(featureDir, 'research.md'),
        DATA_MODEL: path.join(featureDir, 'data-model.md'),
        QUICKSTART: path.join(featureDir, 'quickstart.md'),
        CONTRACTS_DIR: path.join(featureDir, 'contracts')
    };
}

function checkFile(filePath, description) {
    const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    return `  ${exists ? '✓' : '✗'} ${description}`;
}

function checkDir(dirPath, description) {
    const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    let hasFiles = false;
    if (exists) {
        try {
            const files = fs.readdirSync(dirPath);
            hasFiles = files.length > 0;
        } catch (error) {
            hasFiles = false;
        }
    }
    return `  ${exists && hasFiles ? '✓' : '✗'} ${description}`;
}

module.exports = {
    getRepoRoot,
    getCurrentBranch,
    checkFeatureBranch,
    getFeaturePaths,
    checkFile,
    checkDir
};