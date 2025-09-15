# Create implementation todos based on design document
param(
    [switch]$Json,
    [switch]$Help
)

if ($Help) {
    Write-Output "Usage: create-todos.ps1 [-Json] [-Help]"
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
$designFile = Join-Path $moduleDir "design.md"
$todoFile = Join-Path $moduleDir "todo.md"

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

# Check if spec.md exists and is completed
if (!(Test-Path $requirementsFile)) {
    if ($Json) {
        @{status="error"; message="Requirements file does not exist. Please run /spec first"} | ConvertTo-Json -Compress
    } else {
        Write-Output "ERROR: Requirements file does not exist"
        Write-Output "Please run '/spec' first to create the requirements"
    }
    exit 1
}

# Check if design.md exists and is completed
if (!(Test-Path $designFile)) {
    if ($Json) {
        @{status="error"; message="Design file does not exist. Please run /design first"} | ConvertTo-Json -Compress
    } else {
        Write-Output "ERROR: Design file does not exist"
        Write-Output "Please run '/design' first to create the design document"
    }
    exit 1
}

# Check if design file is still a template
$designContent = Get-Content $designFile -Raw -Encoding UTF8
if ($designContent -match '\[模块名称\]|\[模块路径\]|\[创建时间\]') {
    if ($Json) {
        @{status="error"; message="Design file appears to be incomplete template. Please complete design first"} | ConvertTo-Json -Compress
    } else {
        Write-Output "ERROR: Design file appears to be incomplete template"
        Write-Output "Please complete design document first with '/design'"
    }
    exit 1
}

# Check if todo.md already exists and has content
$todoExists = $false
if ((Test-Path $todoFile) -and (Get-Item $todoFile).Length -gt 0) {
    # Check if it's not just the template
    $todoContent = Get-Content $todoFile -Raw -Encoding UTF8
    if ($todoContent -notmatch '\[模块名称\]|\[模块路径\]|\[创建时间\]') {
        $todoExists = $true
    }
}

# Extract information from requirements and design
$reqContent = Get-Content $requirementsFile -Raw -Encoding UTF8
$reqCount = ([regex]::Matches($reqContent, "### REQ-")).Count
$designComponents = ([regex]::Matches($designContent, "#### 组件|#### Component")).Count
$designInterfaces = ([regex]::Matches($designContent, "interface|Interface")).Count

# Check for similar modules for reference
$similarModules = @()
$modulesDir = Join-Path $repoRoot "specs" "modules"
if (Test-Path $modulesDir) {
    Get-ChildItem $modulesDir -Directory | ForEach-Object {
        $otherName = $_.Name
        if ($otherName -ne $modulePath) {
            # Check if other module has completed todos for reference
            $otherTodoFile = Join-Path $_.FullName "todo.md"
            if ((Test-Path $otherTodoFile) -and (Get-Item $otherTodoFile).Length -gt 0) {
                $otherTodoContent = Get-Content $otherTodoFile -Raw -Encoding UTF8
                if ($otherTodoContent -notmatch '\[模块名称\]|\[模块路径\]') {
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
        design_file = $designFile
        todo_file = $todoFile
        todo_exists = $todoExists
        requirements_count = $reqCount
        design_components = $designComponents
        design_interfaces = $designInterfaces
        similar_modules = $similarModules
    }
    $result | ConvertTo-Json -Compress
} else {
    Write-Output "MODULE_PATH: $modulePath"
    Write-Output "MODULE_DIR: $moduleDir"
    Write-Output "REQUIREMENTS_FILE: $requirementsFile"
    Write-Output "DESIGN_FILE: $designFile"
    Write-Output "TODO_FILE: $todoFile"
    Write-Output "TODO_EXISTS: $todoExists"
    Write-Output "REQUIREMENTS_COUNT: $reqCount"
    Write-Output "DESIGN_COMPONENTS: $designComponents"
    Write-Output "DESIGN_INTERFACES: $designInterfaces"
    if ($similarModules.Count -gt 0) {
        Write-Output "SIMILAR_MODULES: $($similarModules -join ', ')"
    }
}