# Analyze requirements for a module
param(
    [switch]$Json,
    [switch]$Help
)

if ($Help) {
    Write-Output "Usage: analyze-requirements.ps1 [-Json] [-Help]"
    exit 0
}

$repoRoot = git rev-parse --show-toplevel
$currentBranch = git rev-parse --abbrev-ref HEAD

# Try to detect current module from working directory or git branch
$modulePath = ""
$currentDir = Get-Location

# Check if we're in a specs/modules directory
if ($currentDir.Path -like "*\specs\modules\*") {
    $modulePath = $currentDir.Path -replace ".*\\specs\\modules\\", "" -replace "\\.*", ""
} elseif ($currentBranch -like "*/*") {
    # Try to extract module from branch name like feature/auth or module/api
    $modulePath = ($currentBranch -split "/", 2)[1]
}

# If still no module path, ask for explicit module specification
if (-not $modulePath) {
    if ($Json) {
        @{status="error"; message="Cannot determine module path. Please specify module with /module command first or work from module directory"} | ConvertTo-Json -Compress
    } else {
        Write-Output "ERROR: Cannot determine module path"
        Write-Output "Please run '/module <module_name>' first or work from a module directory"
    }
    exit 1
}

$moduleDir = Join-Path $repoRoot "specs" "modules" $modulePath
$requirementsFile = Join-Path $moduleDir "spec.md"

# Check if module directory exists
if (!(Test-Path $moduleDir)) {
    if ($Json) {
        @{status="error"; message="Module directory does not exist: $moduleDir"} | ConvertTo-Json -Compress
    } else {
        Write-Output "ERROR: Module directory does not exist: $moduleDir"
        Write-Output "Please run '/module $modulePath' first to create the module"
    }
    exit 1
}

# Check if spec.md exists and has content
$requirementsExists = $false
if ((Test-Path $requirementsFile) -and (Get-Item $requirementsFile).Length -gt 0) {
    # Check if it's not just the template
    $content = Get-Content $requirementsFile -Raw -Encoding UTF8
    if ($content -notmatch '\[模块名称\]|\[模块路径\]|\[创建时间\]') {
        $requirementsExists = $true
    }
}

# Extract existing requirements information
$reqCount = 0
$businessRulesCount = 0
if ($requirementsExists) {
    $content = Get-Content $requirementsFile -Raw -Encoding UTF8
    $reqCount = ([regex]::Matches($content, "### REQ-")).Count
    $businessRulesCount = ([regex]::Matches($content, "#### BR-")).Count
}

# Check for similar modules for reference
$similarModules = @()
$modulesDir = Join-Path $repoRoot "specs" "modules"
if (Test-Path $modulesDir) {
    Get-ChildItem $modulesDir -Directory | ForEach-Object {
        $otherName = $_.Name
        if ($otherName -ne $modulePath) {
            # Check if other module has completed requirements for reference
            $otherReqFile = Join-Path $_.FullName "spec.md"
            if ((Test-Path $otherReqFile) -and (Get-Item $otherReqFile).Length -gt 0) {
                $otherContent = Get-Content $otherReqFile -Raw -Encoding UTF8
                if ($otherContent -notmatch '\[模块名称\]|\[模块路径\]') {
                    $similarModules += $otherName
                }
            }
        }
    }
}

if ($Json) {
    $result = @{
        status = "ready"
        module_path = $modulePath
        module_dir = $moduleDir
        requirements_file = $requirementsFile
        requirements_exists = $requirementsExists
        requirements_count = $reqCount
        business_rules_count = $businessRulesCount
        similar_modules = $similarModules
    }
    $result | ConvertTo-Json -Compress
} else {
    Write-Output "MODULE_PATH: $modulePath"
    Write-Output "MODULE_DIR: $moduleDir"
    Write-Output "REQUIREMENTS_FILE: $requirementsFile"
    Write-Output "REQUIREMENTS_EXISTS: $requirementsExists"
    Write-Output "REQUIREMENTS_COUNT: $reqCount"
    Write-Output "BUSINESS_RULES_COUNT: $businessRulesCount"
    if ($similarModules.Count -gt 0) {
        Write-Output "SIMILAR_MODULES: $($similarModules -join ', ')"
    }
}