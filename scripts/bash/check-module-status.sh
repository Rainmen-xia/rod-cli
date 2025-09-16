#!/usr/bin/env bash
# Check and display module completion status and progress
set -e

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

JSON_MODE=false
ARGS=()
for arg in "$@"; do
    case "$arg" in
        --json) JSON_MODE=true ;;
        --help|-h) echo "Usage: $0 [--json]"; exit 0 ;;
        *) ARGS+=("$arg") ;;
    esac
done

REPO_ROOT=$(get_repo_root)
CURRENT_DIR=$(pwd)

# Check if we're in a module directory
MODULE_PATH=""
if [[ "$CURRENT_DIR" == *"/specs/modules/"* ]]; then
    MODULE_PATH=$(echo "$CURRENT_DIR" | sed 's|.*/specs/modules/||' | sed 's|/.*||')
    FEATURE_DIR="$REPO_ROOT/specs/modules/$MODULE_PATH"
else
    # Not in a module directory
    if $JSON_MODE; then
        printf '{"ERROR":"Not in a module directory","SUGGESTION":"Navigate to a module directory or use /module command"}\n'
    else
        echo "❌ Error: Not currently in a module directory"
        echo "💡 Suggestion: Navigate to a module directory or use '/module <module_name>' command"
    fi
    exit 1
fi

# File paths
SPEC_FILE="$FEATURE_DIR/spec.md"
DESIGN_FILE="$FEATURE_DIR/design.md"
TODO_FILE="$FEATURE_DIR/todo.md"
MODULES_DIR="$FEATURE_DIR/modules"

# Check file existence and content
check_file_status() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        echo "not_exists"
    elif [[ ! -s "$file" ]]; then
        echo "empty"
    elif [[ $(wc -l < "$file") -lt 10 ]]; then
        echo "minimal"
    else
        echo "complete"
    fi
}

# Calculate overall progress percentage
calculate_progress() {
    local total_stages=4
    local completed=0
    
    # Module structure (always complete if we're here)
    ((completed++))
    
    # Spec analysis
    spec_status=$(check_file_status "$SPEC_FILE")
    if [[ "$spec_status" == "complete" ]]; then
        ((completed++))
    fi
    
    # Design
    design_status=$(check_file_status "$DESIGN_FILE")
    if [[ "$design_status" == "complete" ]]; then
        ((completed++))
    fi
    
    # Todo
    todo_status=$(check_file_status "$TODO_FILE")
    if [[ "$todo_status" == "complete" ]]; then
        ((completed++))
    fi
    
    echo $((completed * 100 / total_stages))
}

# Count tasks in todo.md
count_tasks() {
    if [[ -f "$TODO_FILE" ]]; then
        local total=$(grep -c '^\- \[ \]' "$TODO_FILE" 2>/dev/null || echo "0")
        local completed=$(grep -c '^\- \[x\]' "$TODO_FILE" 2>/dev/null || echo "0")
        echo "$completed:$total"
    else
        echo "0:0"
    fi
}

# Check submodules
check_submodules() {
    if [[ -d "$MODULES_DIR" ]]; then
        find "$MODULES_DIR" -maxdepth 1 -type d -not -path "$MODULES_DIR" | wc -l
    else
        echo "0"
    fi
}

# Generate status information
spec_status=$(check_file_status "$SPEC_FILE")
design_status=$(check_file_status "$DESIGN_FILE")
todo_status=$(check_file_status "$TODO_FILE")
progress=$(calculate_progress)
task_counts=$(count_tasks)
task_completed=$(echo "$task_counts" | cut -d: -f1)
task_total=$(echo "$task_counts" | cut -d: -f2)
submodule_count=$(check_submodules)

# Generate next step suggestion
next_step=""
if [[ "$spec_status" != "complete" ]]; then
    next_step="Execute '/spec <feature_description>' to start requirements analysis"
elif [[ "$design_status" != "complete" ]]; then
    next_step="Execute '/design' to create technical design document"
elif [[ "$todo_status" != "complete" ]]; then
    next_step="Execute '/todo' to create actionable task list"
elif [[ "$task_completed" -lt "$task_total" ]]; then
    next_step="Continue implementing tasks from todo.md or execute '/sync' to update progress"
else
    next_step="Execute '/sync' to synchronize progress to project roadmap"
fi

if $JSON_MODE; then
    cat << EOF
{
    "MODULE_PATH": "$MODULE_PATH",
    "PROGRESS_PERCENTAGE": $progress,
    "SPEC_STATUS": "$spec_status",
    "DESIGN_STATUS": "$design_status",
    "TODO_STATUS": "$todo_status",
    "TASK_COMPLETED": $task_completed,
    "TASK_TOTAL": $task_total,
    "SUBMODULE_COUNT": $submodule_count,
    "NEXT_STEP": "$next_step"
}
EOF
else
    echo "## 模块状态报告 - $MODULE_PATH"
    echo
    echo "### 📊 总体进度: $progress%"
    echo
    echo "### 🔍 阶段详情:"
    echo "- ✅ 模块创建: 已完成"
    
    case "$spec_status" in
        "complete") echo "- ✅ 需求分析: 已完成 (spec.md 已创建)" ;;
        "minimal") echo "- 🔄 需求分析: 进行中 (spec.md 内容较少)" ;;
        "empty") echo "- ⏳ 需求分析: 待开始 (spec.md 为空)" ;;
        *) echo "- ⏳ 需求分析: 待开始 (spec.md 不存在)" ;;
    esac
    
    case "$design_status" in
        "complete") echo "- ✅ 技术设计: 已完成 (design.md 已创建)" ;;
        "minimal") echo "- 🔄 技术设计: 进行中 (design.md 内容较少)" ;;
        "empty") echo "- ⏳ 技术设计: 待开始 (design.md 为空)" ;;
        *) echo "- ⏳ 技术设计: 待开始 (design.md 不存在)" ;;
    esac
    
    case "$todo_status" in
        "complete") echo "- ✅ 任务规划: 已完成 (todo.md 包含 $task_total 个任务)" ;;
        "minimal") echo "- 🔄 任务规划: 进行中 (todo.md 内容较少)" ;;
        "empty") echo "- ⏳ 任务规划: 待开始 (todo.md 为空)" ;;
        *) echo "- ⏳ 任务规划: 待开始 (todo.md 不存在)" ;;
    esac
    
    echo "- 🔄 进度同步: 可根据需要执行"
    echo
    
    if [[ "$task_total" -gt 0 ]]; then
        echo "### 📈 任务完成情况:"
        echo "- 总任务数: $task_total"
        echo "- 已完成: $task_completed"
        echo "- 待完成: $((task_total - task_completed))"
        echo
    fi
    
    if [[ "$submodule_count" -gt 0 ]]; then
        echo "### 📂 子模块:"
        echo "- 子模块数量: $submodule_count"
        echo
    fi
    
    echo "### 🔔 下一步建议:"
    echo "- $next_step"
    echo
    echo "**✅ 状态检查完成！**"
fi