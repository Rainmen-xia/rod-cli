# Generate design document based on requirements
param(
    [switch]$Json,
    [switch]$Help
)

if ($Help) {
    Write-Output "Usage: generate-design.ps1 [-Json] [-Help]"
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
$designFile = Join-Path $moduleDir "plan.md"

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

# Check if spec.md exists and has been completed
if (!(Test-Path $requirementsFile)) {
    if ($Json) {
        @{status="error"; message="Requirements file does not exist. Please run /specify first"} | ConvertTo-Json -Compress
    } else {
        Write-Output "ERROR: Requirements file does not exist"
        Write-Output "Please run '/specify' first to create the requirements"
    }
    exit 1
}

# Check if requirements file is still a template
$reqContent = Get-Content $requirementsFile -Raw -Encoding UTF8
if ($reqContent -match '\[模块名称\]|\[模块路径\]|\[创建时间\]') {
    if ($Json) {
        @{status="error"; message="Requirements file appears to be incomplete template. Please complete requirements analysis first"} | ConvertTo-Json -Compress
    } else {
        Write-Output "ERROR: Requirements file appears to be incomplete template"
        Write-Output "Please complete requirements analysis first with '/specify'"
    }
    exit 1
}

# Check if plan.md already exists and has content
$designExists = $false
if ((Test-Path $designFile) -and (Get-Item $designFile).Length -gt 0) {
    # Check if it's not just the template
    $designContent = Get-Content $designFile -Raw -Encoding UTF8
    if ($designContent -notmatch '\[模块名称\]|\[模块路径\]|\[创建时间\]') {
        $designExists = $true
    }
}

# Extract requirements information
$reqCount = ([regex]::Matches($reqContent, "### REQ-")).Count

# Check for similar modules (basic pattern matching)
$similarModules = @()
$modulesDir = Join-Path $repoRoot "specs" "modules"
if (Test-Path $modulesDir) {
    Get-ChildItem $modulesDir -Directory | ForEach-Object {
        $otherName = $_.Name
        if ($otherName -ne $modulePath) {
            # Simple similarity check based on name patterns
            $moduleNamePart = ($modulePath -split "-")[0]
            $otherNamePart = ($otherName -split "-")[0]
            if ($modulePath -like "*$otherNamePart*" -or $otherName -like "*$moduleNamePart*") {
                $similarModules += $otherName
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
        design_file = $designFile
        design_exists = $designExists
        requirements_count = $reqCount
        similar_modules = $similarModules
    }
    $result | ConvertTo-Json -Compress
} else {
    Write-Output "MODULE_PATH: $modulePath"
    Write-Output "MODULE_DIR: $moduleDir"
    Write-Output "REQUIREMENTS_FILE: $requirementsFile"
    Write-Output "DESIGN_FILE: $designFile"
    Write-Output "DESIGN_EXISTS: $designExists"
    Write-Output "REQUIREMENTS_COUNT: $reqCount"
    if ($similarModules.Count -gt 0) {
        Write-Output "SIMILAR_MODULES: $($similarModules -join ', ')"
    }
}