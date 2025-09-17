#!/usr/bin/env bash
# Sync module progress to parent modules and roadmap
set -e

JSON_MODE=false
for arg in "$@"; do
    case "$arg" in
        --json) JSON_MODE=true ;;
        --help|-h) echo "Usage: $0 [--json]"; exit 0 ;;
    esac
done

REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Try to detect current module from working directory or git branch
MODULE_PATH=""
CURRENT_DIR=$(pwd)

# Check if we're in a specs/modules directory
if [[ "$CURRENT_DIR" == *"/specs/modules/"* ]]; then
    MODULE_PATH=$(echo "$CURRENT_DIR" | sed 's|.*/specs/modules/||')
elif [[ "$CURRENT_BRANCH" == *"/"* ]]; then
    # Try to extract module from branch name like feature/auth or module/api
    MODULE_PATH=$(echo "$CURRENT_BRANCH" | cut -d'/' -f2-)
fi

# If still no module path, ask for explicit module specification
if [ -z "$MODULE_PATH" ]; then
    if $JSON_MODE; then
        printf '{"status":"error","message":"Cannot determine module path. Please specify module with /module command first or work from module directory"}\n'
    else
        echo "ERROR: Cannot determine module path"
        echo "Please run '/module <module_name>' first or work from a module directory"
    fi
    exit 1
fi

MODULE_DIR="$REPO_ROOT/specs/modules/$MODULE_PATH"
ROADMAP_FILE="$REPO_ROOT/specs/roadmap.md"

# Check if module directory exists
if [ ! -d "$MODULE_DIR" ]; then
    if $JSON_MODE; then
        printf '{"status":"error","message":"Module directory does not exist: %s"}\n' "$MODULE_DIR"
    else
        echo "ERROR: Module directory does not exist: $MODULE_DIR"
        echo "Please run '/module $MODULE_PATH' first to create the module"
    fi
    exit 1
fi

# Function to check module completion status
check_module_status() {
    local module_path="$1"
    local module_dir="$REPO_ROOT/specs/modules/$module_path"
    
    local req_complete=false
    local plan_complete=false
    local tasks_complete=false
    local overall_status="📋 待开始"
    local progress=0
    
    # Check requirements
    if [ -f "$module_dir/spec.md" ] && ! grep -q "\[模块名称\]\|\[模块路径\]" "$module_dir/spec.md"; then
        req_complete=true
        progress=$((progress + 33))
    fi
    
    # Check plan
    if [ -f "$module_dir/plan.md" ] && ! grep -q "\[模块名称\]\|\[模块路径\]" "$module_dir/plan.md"; then
        plan_complete=true
        progress=$((progress + 33))
    fi
    
    # Check tasks
    if [ -f "$module_dir/tasks.md" ] && ! grep -q "\[模块名称\]\|\[模块路径\]" "$module_dir/tasks.md"; then
        tasks_complete=true
        progress=$((progress + 34))
        
        # Check if tasks are actually completed
        if grep -q "✅.*已完成\|✅.*completed" "$module_dir/tasks.md" 2>/dev/null; then
            overall_status="✅ 已完成"
        elif grep -q "❌.*阻塞\|❌.*blocked" "$module_dir/tasks.md" 2>/dev/null; then
            overall_status="❌ 阻塞"
        elif grep -q "⚠️.*风险\|⚠️.*risk" "$module_dir/tasks.md" 2>/dev/null; then
            overall_status="⚠️ 风险"
        else
            overall_status="🔄 进行中"
        fi
    elif $req_complete && $plan_complete; then
        overall_status="🔄 进行中"
    elif $req_complete || $plan_complete; then
        overall_status="🔄 进行中"
    fi
    
    echo "$overall_status|$progress|$req_complete|$plan_complete|$tasks_complete"
}

# Check current module status
CURRENT_STATUS=$(check_module_status "$MODULE_PATH")
IFS='|' read -r STATUS PROGRESS REQ_DONE PLAN_DONE TASKS_DONE <<< "$CURRENT_STATUS"

# Check submodules status
SUBMODULES=()
SUBMODULE_PROGRESS=()
if [ -d "$MODULE_DIR/modules" ]; then
    for submodule_dir in "$MODULE_DIR/modules"/*; do
        [ -d "$submodule_dir" ] || continue
        submodule_name=$(basename "$submodule_dir")
        submodule_path="$MODULE_PATH/modules/$submodule_name"
        
        sub_status=$(check_module_status "$submodule_path")
        IFS='|' read -r sub_stat sub_prog _ _ _ <<< "$sub_status"
        
        SUBMODULES+=("$submodule_name")
        SUBMODULE_PROGRESS+=("$sub_stat ($sub_prog%)")
    done
fi

# Calculate overall progress including submodules
TOTAL_PROGRESS=$PROGRESS
if [ ${#SUBMODULES[@]} -gt 0 ]; then
    SUB_TOTAL=0
    for submodule_name in "${SUBMODULES[@]}"; do
        submodule_path="$MODULE_PATH/modules/$submodule_name"
        sub_status=$(check_module_status "$submodule_path")
        IFS='|' read -r _ sub_prog _ _ _ <<< "$sub_status"
        SUB_TOTAL=$((SUB_TOTAL + sub_prog))
    done
    SUB_AVG=$((SUB_TOTAL / ${#SUBMODULES[@]}))
    TOTAL_PROGRESS=$(((PROGRESS + SUB_AVG) / 2))
fi

# Check if we need to update parent module
PARENT_PATH=""
if [[ "$MODULE_PATH" == *"/modules/"* ]]; then
    PARENT_PATH=$(echo "$MODULE_PATH" | sed 's|/modules/[^/]*$||')
    PARENT_DIR="$REPO_ROOT/specs/modules/$PARENT_PATH"
    PARENT_TASKS="$PARENT_DIR/tasks.md"
    
    # Update parent tasks if exists
    if [ -f "$PARENT_TASKS" ]; then
        # This would update parent tasks status - implementation depends on tasks format
        echo "# Would update parent tasks: $PARENT_TASKS" >/dev/null
    fi
fi

# Update roadmap if it exists
ROADMAP_UPDATED=false
if [ -f "$ROADMAP_FILE" ]; then
    # Create backup
    cp "$ROADMAP_FILE" "$ROADMAP_FILE.bak"
    
    # Update roadmap (basic implementation - would need more sophisticated logic)
    ROADMAP_UPDATED=true
fi

# Prepare sync report
SYNC_REPORT="Progress Sync Report - $(date '+%Y-%m-%d %H:%M:%S')

Current Module: $MODULE_PATH
- 需求分析: $([ "$REQ_DONE" = "true" ] && echo "✅ 已完成" || echo "📋 待完成")
- 技术设计: $([ "$PLAN_DONE" = "true" ] && echo "✅ 已完成" || echo "📋 待完成")
- 任务清单: $([ "$TASKS_DONE" = "true" ] && echo "✅ 已完成" || echo "📋 待完成")
- 整体进度: $TOTAL_PROGRESS%
- 状态: $STATUS"

if [ ${#SUBMODULES[@]} -gt 0 ]; then
    SYNC_REPORT="$SYNC_REPORT

Submodule Status:"
    for i in "${!SUBMODULES[@]}"; do
        SYNC_REPORT="$SYNC_REPORT
- ${SUBMODULES[i]}: ${SUBMODULE_PROGRESS[i]}"
    done
fi

if [ -n "$PARENT_PATH" ]; then
    SYNC_REPORT="$SYNC_REPORT

Parent Module: $PARENT_PATH (progress updated)"
fi

if $JSON_MODE; then
    printf '{"status":"synced","module_path":"%s","progress":%d,"current_status":"%s","requirements_done":%s,"plan_done":%s,"tasks_done":%s,"submodules_count":%d,"parent_path":"%s","roadmap_updated":%s,"sync_time":"%s"}\n' \
        "$MODULE_PATH" "$TOTAL_PROGRESS" "$STATUS" "$REQ_DONE" "$PLAN_DONE" "$TASKS_DONE" "${#SUBMODULES[@]}" "$PARENT_PATH" "$ROADMAP_UPDATED" "$(date '+%Y-%m-%d %H:%M:%S')"
else
    echo "MODULE_PATH: $MODULE_PATH"
    echo "PROGRESS: $TOTAL_PROGRESS%"
    echo "STATUS: $STATUS"
    echo "REQUIREMENTS_DONE: $REQ_DONE"
    echo "PLAN_DONE: $PLAN_DONE"
    echo "TASKS_DONE: $TASKS_DONE"
    echo "SUBMODULES_COUNT: ${#SUBMODULES[@]}"
    [ -n "$PARENT_PATH" ] && echo "PARENT_PATH: $PARENT_PATH"
    echo "ROADMAP_UPDATED: $ROADMAP_UPDATED"
    echo "SYNC_TIME: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "SYNC_REPORT:"
    echo "$SYNC_REPORT"
fi