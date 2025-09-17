#!/usr/bin/env bash
# Create or navigate to a module with proper directory structure
set -e

JSON_MODE=false
ARGS=()
for arg in "$@"; do
    case "$arg" in
        --json) JSON_MODE=true ;;
        --help|-h) echo "Usage: $0 [--json] <module_path>"; exit 0 ;;
        *) ARGS+=("$arg") ;;
    esac
done

MODULE_PATH="${ARGS[*]}"
if [ -z "$MODULE_PATH" ]; then
    echo "Usage: $0 [--json] <module_path>" >&2
    exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
SPECS_DIR="$REPO_ROOT/specs"
MODULE_DIR="$SPECS_DIR/modules/$MODULE_PATH"

# Ensure specs and modules directories exist
mkdir -p "$SPECS_DIR/modules"

# Check if module already exists
if [ -d "$MODULE_DIR" ]; then
    # Module exists, check status
    REQ_STATUS="missing"
    DESIGN_STATUS="missing"
    TODO_STATUS="missing"
    
    [ -f "$MODULE_DIR/spec.md" ] && REQ_STATUS="exists"
    [ -f "$MODULE_DIR/plan.md" ] && DESIGN_STATUS="exists"
    [ -f "$MODULE_DIR/tasks.md" ] && TODO_STATUS="exists"
    
    if $JSON_MODE; then
        printf '{"status":"exists","module_dir":"%s","requirements":"%s","design":"%s","todo":"%s"}\n' \
            "$MODULE_DIR" "$REQ_STATUS" "$DESIGN_STATUS" "$TODO_STATUS"
    else
        echo "MODULE_DIR: $MODULE_DIR"
        echo "STATUS: exists"
        echo "REQUIREMENTS: $REQ_STATUS"
        echo "DESIGN: $DESIGN_STATUS"
        echo "TODO: $TODO_STATUS"
    fi
else
    # Create new module
    mkdir -p "$MODULE_DIR/modules"
    
    # Create template files
    TEMPLATE_DIR="$REPO_ROOT/.specify/templates"
    FILES_CREATED=()
    
    if [ -f "$TEMPLATE_DIR/spec-template.md" ]; then
        cp "$TEMPLATE_DIR/spec-template.md" "$MODULE_DIR/spec.md"
        FILES_CREATED+=("spec.md")
    fi
    
    if [ -f "$TEMPLATE_DIR/design-template.md" ]; then
        cp "$TEMPLATE_DIR/design-template.md" "$MODULE_DIR/plan.md"
        FILES_CREATED+=("plan.md")
    fi
    
    if [ -f "$TEMPLATE_DIR/todo-template.md" ]; then
        cp "$TEMPLATE_DIR/todo-template.md" "$MODULE_DIR/tasks.md"
        FILES_CREATED+=("tasks.md")
    fi
    
    # Update templates with module-specific information
    if [ -f "$MODULE_DIR/spec.md" ]; then
        sed -i.bak "s/\[模块名称\]/$MODULE_PATH/g" "$MODULE_DIR/spec.md" && rm "$MODULE_DIR/spec.md.bak"
        sed -i.bak "s/\[模块路径\]/$MODULE_PATH/g" "$MODULE_DIR/spec.md" && rm "$MODULE_DIR/spec.md.bak"
        sed -i.bak "s/\[创建时间\]/$(date '+%Y-%m-%d %H:%M:%S')/g" "$MODULE_DIR/spec.md" && rm "$MODULE_DIR/spec.md.bak"
    fi
    
    if [ -f "$MODULE_DIR/plan.md" ]; then
        sed -i.bak "s/\[模块名称\]/$MODULE_PATH/g" "$MODULE_DIR/plan.md" && rm "$MODULE_DIR/plan.md.bak"
        sed -i.bak "s/\[模块路径\]/$MODULE_PATH/g" "$MODULE_DIR/plan.md" && rm "$MODULE_DIR/plan.md.bak"
        sed -i.bak "s/\[创建时间\]/$(date '+%Y-%m-%d %H:%M:%S')/g" "$MODULE_DIR/plan.md" && rm "$MODULE_DIR/plan.md.bak"
    fi
    
    if [ -f "$MODULE_DIR/tasks.md" ]; then
        sed -i.bak "s/\[模块名称\]/$MODULE_PATH/g" "$MODULE_DIR/tasks.md" && rm "$MODULE_DIR/tasks.md.bak"
        sed -i.bak "s/\[模块路径\]/$MODULE_PATH/g" "$MODULE_DIR/tasks.md" && rm "$MODULE_DIR/tasks.md.bak"
        sed -i.bak "s/\[创建时间\]/$(date '+%Y-%m-%d %H:%M:%S')/g" "$MODULE_DIR/tasks.md" && rm "$MODULE_DIR/tasks.md.bak"
    fi
    
    if $JSON_MODE; then
        printf '{"status":"created","module_dir":"%s","files_created":[' "$MODULE_DIR"
        printf '"%s"' "${FILES_CREATED[0]}"
        for file in "${FILES_CREATED[@]:1}"; do
            printf ',"%s"' "$file"
        done
        printf ']}\n'
    else
        echo "MODULE_DIR: $MODULE_DIR"
        echo "STATUS: created"
        echo "FILES_CREATED: ${FILES_CREATED[*]}"
    fi
fi