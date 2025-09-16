#!/usr/bin/env bash
# (Moved to scripts/bash/) Common functions and variables for all scripts

get_repo_root() { git rev-parse --show-toplevel; }
get_current_branch() { git rev-parse --abbrev-ref HEAD; }

check_feature_branch() {
    local branch="$1"
    # Accept any valid git branch name - no restrictions
    # Branch names are independent of module/directory structure
    return 0
}

get_feature_paths() {
    local repo_root=$(get_repo_root)
    local current_branch=$(get_current_branch)
    
    # Only detect module path from current working directory
    # Branch names are completely independent of module structure
    local module_path=""
    local current_dir=$(pwd)
    
    if [[ "$current_dir" == *"/specs/modules/"* ]]; then
        # Extract module path from current directory
        module_path=$(echo "$current_dir" | sed 's|.*/specs/modules/||' | sed 's|/.*||')
    fi
    
    # If no module path detected, return empty paths
    # Scripts should handle this case explicitly
    local feature_dir=""
    if [[ -n "$module_path" ]]; then
        feature_dir="$repo_root/specs/modules/$module_path"
    fi
    
    cat <<EOF
REPO_ROOT='$repo_root'
CURRENT_BRANCH='$current_branch'
MODULE_PATH='$module_path'
FEATURE_DIR='$feature_dir'
FEATURE_SPEC='$feature_dir/spec.md'
IMPL_PLAN='$feature_dir/plan.md'
TASKS='$feature_dir/tasks.md'
RESEARCH='$feature_dir/research.md'
DATA_MODEL='$feature_dir/data-model.md'
QUICKSTART='$feature_dir/quickstart.md'
CONTRACTS_DIR='$feature_dir/contracts'
EOF
}

check_file() { [[ -f "$1" ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
check_dir() { [[ -d "$1" && -n $(ls -A "$1" 2>/dev/null) ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
