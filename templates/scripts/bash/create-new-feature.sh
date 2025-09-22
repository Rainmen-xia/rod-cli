#!/usr/bin/env bash
# (Moved to scripts/bash/) Create a new feature with branch, directory structure, and template
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

# Create branch name in feature/description_date format
CURRENT_DATE=$(date +%Y%m%d)
BRANCH_NAME=$(echo "$FEATURE_DESCRIPTION" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-//' | sed 's/-$//')
WORDS=$(echo "$BRANCH_NAME" | tr '-' '\n' | grep -v '^$' | head -3 | tr '\n' '-' | sed 's/-$//')
BRANCH_NAME="feature/${WORDS}_${CURRENT_DATE}"

# Create the branch
git checkout -b "$BRANCH_NAME"

# Note: Directory structure is independent of branch name
# User should use /module command to create module directories
echo "Branch '$BRANCH_NAME' created successfully."
echo "Use '/module <module_name>' command to create module directories independently of branch name."

if $JSON_MODE; then
    printf '{"BRANCH_NAME":"%s","MESSAGE":"Branch created successfully. Use /module command to create module directories."}\n' "$BRANCH_NAME"
else
    echo "BRANCH_NAME: $BRANCH_NAME"
    echo "STATUS: Branch created successfully"
    echo "NOTE: Use '/module <module_name>' to create module directories"
fi
