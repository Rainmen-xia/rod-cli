#!/usr/bin/env node
const { getFeaturePaths, checkFeatureBranch, getCurrentBranch } = require('./common');

try {
    const paths = getFeaturePaths();
    const currentBranch = getCurrentBranch();

    if (!checkFeatureBranch(currentBranch)) {
        process.exit(1);
    }

    console.log(`REPO_ROOT: ${paths.REPO_ROOT}`);
    console.log(`BRANCH: ${paths.CURRENT_BRANCH}`);
    console.log(`MODULE_PATH: ${paths.MODULE_PATH}`);
    console.log(`FEATURE_DIR: ${paths.FEATURE_DIR}`);
    console.log(`FEATURE_SPEC: ${paths.FEATURE_SPEC}`);
    console.log(`IMPL_PLAN: ${paths.IMPL_PLAN}`);
    console.log(`TASKS: ${paths.TASKS}`);
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}