#!/usr/bin/env bash
# Create modular directory structure for project organization
set -e

JSON_MODE=false
MODULES=()

# Parse arguments
for arg in "$@"; do
    case "$arg" in
        --json) JSON_MODE=true ;;
        --help|-h) echo "Usage: $0 [--json] <module_name> [module_name2] ..."; exit 0 ;;
        *) MODULES+=("$arg") ;;
    esac
done

if [ ${#MODULES[@]} -eq 0 ]; then
    echo "Usage: $0 [--json] <module_name> [module_name2] ..." >&2
    exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
SPECS_DIR="$REPO_ROOT/specs"
MODULES_DIR="$SPECS_DIR/modules"

# Create base directories
mkdir -p "$SPECS_DIR"
mkdir -p "$MODULES_DIR"

# Get existing modules
EXISTING_MODULES=()
if [ -d "$MODULES_DIR" ]; then
    for module_dir in "$MODULES_DIR"/*; do
        [ -d "$module_dir" ] || continue
        module_name=$(basename "$module_dir")
        EXISTING_MODULES+=("$module_name")
    done
fi

# Create requested modules
CREATED_MODULES=()
for module in "${MODULES[@]}"; do
    module_path="$MODULES_DIR/$module"

    if [ ! -d "$module_path" ]; then
        mkdir -p "$module_path"
        CREATED_MODULES+=("$module")
    fi
done

# Output results
TOTAL_MODULES=$((${#EXISTING_MODULES[@]} + ${#CREATED_MODULES[@]}))

if $JSON_MODE; then
    printf '{"status":"ready","modules_dir":"%s","existing_modules":[' "$MODULES_DIR"

    if [ ${#EXISTING_MODULES[@]} -gt 0 ]; then
        printf '"%s"' "${EXISTING_MODULES[0]}"
        for module in "${EXISTING_MODULES[@]:1}"; do
            printf ',"%s"' "$module"
        done
    fi

    printf '],"created_modules":['

    if [ ${#CREATED_MODULES[@]} -gt 0 ]; then
        printf '"%s"' "${CREATED_MODULES[0]}"
        for module in "${CREATED_MODULES[@]:1}"; do
            printf ',"%s"' "$module"
        done
    fi

    printf '],"total_modules":%d}\n' "$TOTAL_MODULES"
else
    if [ ${#CREATED_MODULES[@]} -gt 0 ]; then
        echo "Created modules:"
        for module in "${CREATED_MODULES[@]}"; do
            echo "  - $MODULES_DIR/$module"
        done
        echo ""
        echo "Next: cd $MODULES_DIR/${CREATED_MODULES[0]} && /specify"
    else
        echo "All specified modules already exist."
    fi
fi