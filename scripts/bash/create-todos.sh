#!/usr/bin/env bash
# Create implementation todos based on design document
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
    MODULE_PATH=$(echo "$CURRENT_DIR" | sed 's|.*/specs/modules/||' | sed 's|/.*||')
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
REQUIREMENTS_FILE="$MODULE_DIR/spec.md"
DESIGN_FILE="$MODULE_DIR/design.md"
TODO_FILE="$MODULE_DIR/todo.md"

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

# Check if spec.md exists and is completed
if [ ! -f "$REQUIREMENTS_FILE" ]; then
    if $JSON_MODE; then
        printf '{"status":"error","message":"Requirements file does not exist. Please run /spec first"}\n'
    else
        echo "ERROR: Requirements file does not exist"
        echo "Please run '/spec' first to create the requirements"
    fi
    exit 1
fi

# Check if design.md exists and is completed
if [ ! -f "$DESIGN_FILE" ]; then
    if $JSON_MODE; then
        printf '{"status":"error","message":"Design file does not exist. Please run /design first"}\n'
    else
        echo "ERROR: Design file does not exist"
        echo "Please run '/design' first to create the design document"
    fi
    exit 1
fi

# Check if design file is still a template
if grep -q "\[模块名称\]\|\[模块路径\]\|\[创建时间\]" "$DESIGN_FILE"; then
    if $JSON_MODE; then
        printf '{"status":"error","message":"Design file appears to be incomplete template. Please complete design first"}\n'
    else
        echo "ERROR: Design file appears to be incomplete template"
        echo "Please complete design document first with '/design'"
    fi
    exit 1
fi

# Check if todo.md already exists and has content
TODO_EXISTS=false
if [ -f "$TODO_FILE" ] && [ -s "$TODO_FILE" ]; then
    # Check if it's not just the template
    if ! grep -q "\[模块名称\]\|\[模块路径\]\|\[创建时间\]" "$TODO_FILE"; then
        TODO_EXISTS=true
    fi
fi

# Extract information from requirements and design
REQ_COUNT=$(grep -c "### REQ-" "$REQUIREMENTS_FILE" 2>/dev/null || echo "0")
DESIGN_COMPONENTS=$(grep -c "#### 组件\|#### Component" "$DESIGN_FILE" 2>/dev/null || echo "0")
DESIGN_INTERFACES=$(grep -c "interface\|Interface" "$DESIGN_FILE" 2>/dev/null || echo "0")

# Check for constitution.md and constitution compliance in design
CONSTITUTION_FILE="$REPO_ROOT/.specify/memory/constitution.md"
CONSTITUTION_EXISTS=false
CONSTITUTION_COMPLIANT=false
if [ -f "$CONSTITUTION_FILE" ]; then
    CONSTITUTION_EXISTS=true
    # Check if design document contains constitution compliance section
    if grep -q "Constitution合规检查\|Constitution.*合规\|合规性声明" "$DESIGN_FILE"; then
        CONSTITUTION_COMPLIANT=true
    fi
fi

# Check for similar modules for reference
SIMILAR_MODULES=()
if [ -d "$REPO_ROOT/specs/modules" ]; then
    for other_module in "$REPO_ROOT/specs/modules"/*; do
        [ -d "$other_module" ] || continue
        other_name=$(basename "$other_module")
        [ "$other_name" = "$MODULE_PATH" ] && continue
        
        # Check if other module has completed todos for reference
        if [ -f "$other_module/todo.md" ] && ! grep -q "\[模块名称\]\|\[模块路径\]" "$other_module/todo.md"; then
            SIMILAR_MODULES+=("$other_name")
        fi
    done
fi

if $JSON_MODE; then
    printf '{"status":"ready","module_path":"%s","module_dir":"%s","requirements_file":"%s","design_file":"%s","todo_file":"%s","todo_exists":%s,"requirements_count":%d,"design_components":%d,"design_interfaces":%d,"constitution_file":"%s","constitution_exists":%s,"constitution_compliant":%s,"similar_modules":[' \
        "$MODULE_PATH" "$MODULE_DIR" "$REQUIREMENTS_FILE" "$DESIGN_FILE" "$TODO_FILE" "$TODO_EXISTS" "$REQ_COUNT" "$DESIGN_COMPONENTS" "$DESIGN_INTERFACES" "$CONSTITUTION_FILE" "$CONSTITUTION_EXISTS" "$CONSTITUTION_COMPLIANT"
    
    if [ ${#SIMILAR_MODULES[@]} -gt 0 ]; then
        printf '"%s"' "${SIMILAR_MODULES[0]}"
        for module in "${SIMILAR_MODULES[@]:1}"; do
            printf ',"%s"' "$module"
        done
    fi
    printf ']}\n'
else
    echo "MODULE_PATH: $MODULE_PATH"
    echo "MODULE_DIR: $MODULE_DIR"
    echo "REQUIREMENTS_FILE: $REQUIREMENTS_FILE"
    echo "DESIGN_FILE: $DESIGN_FILE"
    echo "TODO_FILE: $TODO_FILE"
    echo "TODO_EXISTS: $TODO_EXISTS"
    echo "REQUIREMENTS_COUNT: $REQ_COUNT"
    echo "DESIGN_COMPONENTS: $DESIGN_COMPONENTS"
    echo "DESIGN_INTERFACES: $DESIGN_INTERFACES"
    echo "CONSTITUTION_FILE: $CONSTITUTION_FILE"
    echo "CONSTITUTION_EXISTS: $CONSTITUTION_EXISTS"
    echo "CONSTITUTION_COMPLIANT: $CONSTITUTION_COMPLIANT"
    [ ${#SIMILAR_MODULES[@]} -gt 0 ] && echo "SIMILAR_MODULES: ${SIMILAR_MODULES[*]}"
fi