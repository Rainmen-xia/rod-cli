#!/usr/bin/env bash
# Analyze business requirements and create modular directory structure for large-scale projects
set -e

JSON_MODE=false
ARGS=()
for arg in "$@"; do
    case "$arg" in
        --json) JSON_MODE=true ;;
        --help|-h) echo "Usage: $0 [--json] <module_requirements>"; exit 0 ;;
        *) ARGS+=("$arg") ;;
    esac
done

MODULE_REQUIREMENTS="${ARGS[*]}"
if [ -z "$MODULE_REQUIREMENTS" ]; then
    echo "Usage: $0 [--json] <module_requirements>" >&2
    exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
SPECS_DIR="$REPO_ROOT/specs"
MODULES_DIR="$SPECS_DIR/modules"

# Create base directories if they don't exist
mkdir -p "$SPECS_DIR"
mkdir -p "$MODULES_DIR"

# Analyze existing modules
EXISTING_MODULES=()
if [ -d "$MODULES_DIR" ]; then
    for module_dir in "$MODULES_DIR"/*; do
        [ -d "$module_dir" ] || continue
        module_name=$(basename "$module_dir")
        EXISTING_MODULES+=("$module_name")
    done
fi

# Parse module requirements and create suggested module structure
# This is a simplified implementation - in practice, this would involve
# more sophisticated natural language processing and domain analysis

# Extract potential module names from requirements
# For now, use simple keyword extraction
MODULE_SUGGESTIONS=()

# Check if specific module path is requested (e.g., "user-management/authentication")
if [[ "$MODULE_REQUIREMENTS" == *"/"* ]]; then
    # Direct module path specified
    MODULE_PATH="$MODULE_REQUIREMENTS"
    MODULE_SUGGESTIONS+=("$MODULE_PATH")
else
    # Analyze requirements to suggest module structure
    # This is a basic implementation - could be enhanced with AI/NLP

    # Common domain patterns
    if [[ "$MODULE_REQUIREMENTS" == *"user"* || "$MODULE_REQUIREMENTS" == *"auth"* || "$MODULE_REQUIREMENTS" == *"login"* ]]; then
        MODULE_SUGGESTIONS+=("user-management")
    fi

    if [[ "$MODULE_REQUIREMENTS" == *"order"* || "$MODULE_REQUIREMENTS" == *"cart"* || "$MODULE_REQUIREMENTS" == *"checkout"* ]]; then
        MODULE_SUGGESTIONS+=("order-system")
    fi

    if [[ "$MODULE_REQUIREMENTS" == *"payment"* || "$MODULE_REQUIREMENTS" == *"billing"* ]]; then
        MODULE_SUGGESTIONS+=("payment-system")
    fi

    # If no patterns match, create a generic module name
    if [ ${#MODULE_SUGGESTIONS[@]} -eq 0 ]; then
        # Convert requirements to kebab-case module name
        MODULE_NAME=$(echo "$MODULE_REQUIREMENTS" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-//' | sed 's/-$//')
        # Take first 2-3 words for module name
        MODULE_NAME=$(echo "$MODULE_NAME" | cut -d'-' -f1-2)
        MODULE_SUGGESTIONS+=("$MODULE_NAME")
    fi
fi

# Create module directories
CREATED_MODULES=()
for suggested_module in "${MODULE_SUGGESTIONS[@]}"; do
    module_path="$MODULES_DIR/$suggested_module"

    # Create the module directory structure
    if [ ! -d "$module_path" ]; then
        mkdir -p "$module_path"
        CREATED_MODULES+=("$suggested_module")

        # Create any nested structure if path contains slashes
        if [[ "$suggested_module" == *"/"* ]]; then
            # This is a nested module, ensure parent structure exists
            parent_path=$(dirname "$suggested_module")
            if [ "$parent_path" != "." ]; then
                mkdir -p "$MODULES_DIR/$parent_path"
            fi
        fi
    fi
done

# Prepare analysis report
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

    printf '],"total_modules":%d,"requirements":"%s"}\n' "$TOTAL_MODULES" "$MODULE_REQUIREMENTS"
else
    echo "MODULES_DIR: $MODULES_DIR"
    echo "EXISTING_MODULES: ${EXISTING_MODULES[*]}"
    echo "CREATED_MODULES: ${CREATED_MODULES[*]}"
    echo "TOTAL_MODULES: $TOTAL_MODULES"
    echo "REQUIREMENTS: $MODULE_REQUIREMENTS"

    if [ ${#CREATED_MODULES[@]} -gt 0 ]; then
        echo ""
        echo "Created module directories:"
        for module in "${CREATED_MODULES[@]}"; do
            echo "  - $MODULES_DIR/$module"
        done
        echo ""
        echo "Next steps:"
        echo "  1. Navigate to a module directory: cd $MODULES_DIR/${CREATED_MODULES[0]}"
        echo "  2. Run '/specify' to create feature specification"
        echo "  3. Continue with /plan → /tasks → /progress workflow"
    fi
fi