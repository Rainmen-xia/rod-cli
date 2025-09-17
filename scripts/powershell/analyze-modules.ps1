# Analyze business requirements and create modular directory structure for large-scale projects
param(
    [switch]$Json,
    [switch]$Help,
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Args
)

if ($Help) {
    Write-Output "Usage: analyze-modules.ps1 [-Json] [-Help] <module_requirements>"
    exit 0
}

$moduleRequirements = $Args -join " "
if ([string]::IsNullOrEmpty($moduleRequirements)) {
    Write-Error "Usage: analyze-modules.ps1 [-Json] <module_requirements>"
    exit 1
}

$repoRoot = git rev-parse --show-toplevel
$specsDir = Join-Path $repoRoot "specs"
$modulesDir = Join-Path $specsDir "modules"

# Create base directories if they don't exist
if (!(Test-Path $specsDir)) { New-Item -ItemType Directory -Path $specsDir -Force | Out-Null }
if (!(Test-Path $modulesDir)) { New-Item -ItemType Directory -Path $modulesDir -Force | Out-Null }

# Analyze existing modules
$existingModules = @()
if (Test-Path $modulesDir) {
    $existingModules = Get-ChildItem -Path $modulesDir -Directory | ForEach-Object { $_.Name }
}

# Parse module requirements and create suggested module structure
$moduleSuggestions = @()

# Check if specific module path is requested (e.g., "user-management/authentication")
if ($moduleRequirements -like "*/*") {
    # Direct module path specified
    $modulePath = $moduleRequirements
    $moduleSuggestions += $modulePath
} else {
    # Analyze requirements to suggest module structure
    # This is a basic implementation - could be enhanced with AI/NLP

    # Common domain patterns
    if ($moduleRequirements -match "user|auth|login") {
        $moduleSuggestions += "user-management"
    }

    if ($moduleRequirements -match "order|cart|checkout") {
        $moduleSuggestions += "order-system"
    }

    if ($moduleRequirements -match "payment|billing") {
        $moduleSuggestions += "payment-system"
    }

    # If no patterns match, create a generic module name
    if ($moduleSuggestions.Count -eq 0) {
        # Convert requirements to kebab-case module name
        $moduleName = $moduleRequirements.ToLower() -replace '[^a-z0-9]', '-' -replace '-+', '-' -replace '^-', '' -replace '-$', ''
        # Take first 2-3 words for module name
        $moduleNameParts = $moduleName -split '-'
        $moduleName = ($moduleNameParts[0..1] | Where-Object { $_ }) -join '-'
        $moduleSuggestions += $moduleName
    }
}

# Create module directories
$createdModules = @()
foreach ($suggestedModule in $moduleSuggestions) {
    $modulePath = Join-Path $modulesDir $suggestedModule

    # Create the module directory structure
    if (!(Test-Path $modulePath)) {
        New-Item -ItemType Directory -Path $modulePath -Force | Out-Null
        $createdModules += $suggestedModule

        # Create any nested structure if path contains slashes
        if ($suggestedModule -like "*/*") {
            # This is a nested module, ensure parent structure exists
            $parentPath = Split-Path $suggestedModule
            if ($parentPath -and $parentPath -ne ".") {
                $parentFullPath = Join-Path $modulesDir $parentPath
                if (!(Test-Path $parentFullPath)) {
                    New-Item -ItemType Directory -Path $parentFullPath -Force | Out-Null
                }
            }
        }
    }
}

# Prepare analysis report
$totalModules = $existingModules.Count + $createdModules.Count

if ($Json) {
    $result = @{
        status = "ready"
        modules_dir = $modulesDir
        existing_modules = $existingModules
        created_modules = $createdModules
        total_modules = $totalModules
        requirements = $moduleRequirements
    }
    $result | ConvertTo-Json -Compress
} else {
    Write-Output "MODULES_DIR: $modulesDir"
    Write-Output "EXISTING_MODULES: $($existingModules -join ' ')"
    Write-Output "CREATED_MODULES: $($createdModules -join ' ')"
    Write-Output "TOTAL_MODULES: $totalModules"
    Write-Output "REQUIREMENTS: $moduleRequirements"

    if ($createdModules.Count -gt 0) {
        Write-Output ""
        Write-Output "Created module directories:"
        foreach ($module in $createdModules) {
            Write-Output "  - $(Join-Path $modulesDir $module)"
        }
        Write-Output ""
        Write-Output "Next steps:"
        Write-Output "  1. Navigate to a module directory: cd $(Join-Path $modulesDir $createdModules[0])"
        Write-Output "  2. Run '/specify' to create feature specification"
        Write-Output "  3. Continue with /plan → /tasks → /progress workflow"
    }
}