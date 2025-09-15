#!/usr/bin/env bash
# Analyze requirements for the current module context
set -e

JSON_MODE=false
ARGS=()
for arg in "$@"; do
    case "$arg" in
        --json) JSON_MODE=true ;;
        --help|-h) echo "Usage: $0 [--json] <feature_description>"; exit 0 ;;
        *) ARGS+=("$arg") ;;
    esac
done

FEATURE_DESCRIPTION="${ARGS[*]}"
if [ -z "$FEATURE_DESCRIPTION" ]; then
    echo "Usage: $0 [--json] <feature_description>" >&2
    exit 1
fi

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

# Check for design reference (page.png)
DESIGN_REF=""
if [ -f "$MODULE_DIR/page.png" ]; then
    DESIGN_REF="$MODULE_DIR/page.png"
fi

# Check if spec.md already exists and has content
REQ_EXISTS=false
if [ -f "$REQUIREMENTS_FILE" ] && [ -s "$REQUIREMENTS_FILE" ]; then
    # Check if it's not just the template
    if ! grep -q "\[模块名称\]\|\[模块路径\]\|\[创建时间\]" "$REQUIREMENTS_FILE"; then
        REQ_EXISTS=true
    fi
fi

if $JSON_MODE; then
    printf '{"status":"ready","module_path":"%s","module_dir":"%s","requirements_file":"%s","feature_description":"%s","design_reference":"%s","requirements_exists":%s}\n' \
        "$MODULE_PATH" "$MODULE_DIR" "$REQUIREMENTS_FILE" "$FEATURE_DESCRIPTION" "$DESIGN_REF" "$REQ_EXISTS"
else
    echo "MODULE_PATH: $MODULE_PATH"
    echo "MODULE_DIR: $MODULE_DIR"
    echo "REQUIREMENTS_FILE: $REQUIREMENTS_FILE"
    echo "FEATURE_DESCRIPTION: $FEATURE_DESCRIPTION"
    [ -n "$DESIGN_REF" ] && echo "DESIGN_REFERENCE: $DESIGN_REF"
    echo "REQUIREMENTS_EXISTS: $REQ_EXISTS"
fi