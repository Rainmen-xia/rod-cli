# Create a new module directory with templates
param(
    [Parameter(Mandatory=$true)]
    [string]$ModulePath,
    [switch]$Json,
    [switch]$Help
)

if ($Help) {
    Write-Output "Usage: create-module.ps1 -ModulePath <path> [-Json] [-Help]"
    exit 0
}

$repoRoot = git rev-parse --show-toplevel
$specsDir = Join-Path $repoRoot "specs"
$modulesBaseDir = Join-Path $specsDir "modules"
$moduleDir = Join-Path $modulesBaseDir $ModulePath

# Ensure specs directory exists
if (!(Test-Path $specsDir)) {
    New-Item -ItemType Directory -Path $specsDir -Force | Out-Null
}

# Ensure modules directory exists
if (!(Test-Path $modulesBaseDir)) {
    New-Item -ItemType Directory -Path $modulesBaseDir -Force | Out-Null
}

# Check if module already exists
if (Test-Path $moduleDir) {
    if ($Json) {
        @{status="error"; message="Module already exists: $ModulePath"} | ConvertTo-Json -Compress
    } else {
        Write-Output "ERROR: Module already exists: $ModulePath"
    }
    exit 1
}

# Create module directory
New-Item -ItemType Directory -Path $moduleDir -Force | Out-Null

# Get template paths
$templateDir = Join-Path $repoRoot ".specify" "templates"
$reqTemplate = Join-Path $templateDir "spec-template.md"
$designTemplate = Join-Path $templateDir "design-template.md" 
$todoTemplate = Join-Path $templateDir "todo-template.md"

# Module name and creation time
$moduleName = Split-Path $ModulePath -Leaf
$parentPath = Split-Path $ModulePath -Parent
if ($parentPath) {
    $parentPath = $parentPath -replace "\\", "/"
}
$creationTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Function to replace placeholders
function Replace-Placeholders {
    param([string]$content, [string]$moduleName, [string]$modulePath, [string]$creationTime)
    
    return $content -replace '\[模块名称\]', $moduleName `
                   -replace '\[Module Name\]', $moduleName `
                   -replace '\[模块路径\]', $modulePath `
                   -replace '\[Module Path\]', $modulePath `
                   -replace '\[创建时间\]', $creationTime `
                   -replace '\[Creation Time\]', $creationTime
}

$filesCreated = @()

# Create spec.md from template
if (Test-Path $reqTemplate) {
    $content = Get-Content $reqTemplate -Raw -Encoding UTF8
    $content = Replace-Placeholders $content $moduleName $ModulePath $creationTime
    $reqFile = Join-Path $moduleDir "spec.md"
    $content | Out-File -FilePath $reqFile -Encoding UTF8 -NoNewline
    $filesCreated += $reqFile
}

# Create design.md from template
if (Test-Path $designTemplate) {
    $content = Get-Content $designTemplate -Raw -Encoding UTF8
    $content = Replace-Placeholders $content $moduleName $ModulePath $creationTime
    $designFile = Join-Path $moduleDir "design.md"
    $content | Out-File -FilePath $designFile -Encoding UTF8 -NoNewline
    $filesCreated += $designFile
}

# Create todo.md from template  
if (Test-Path $todoTemplate) {
    $content = Get-Content $todoTemplate -Raw -Encoding UTF8
    $content = Replace-Placeholders $content $moduleName $ModulePath $creationTime
    $todoFile = Join-Path $moduleDir "todo.md"
    $content | Out-File -FilePath $todoFile -Encoding UTF8 -NoNewline
    $filesCreated += $todoFile
}

if ($Json) {
    $result = @{
        status = "created"
        module_path = $ModulePath
        module_dir = $moduleDir
        files_created = $filesCreated
        creation_time = $creationTime
    }
    $result | ConvertTo-Json -Compress
} else {
    Write-Output "MODULE_PATH: $ModulePath"
    Write-Output "MODULE_DIR: $moduleDir"
    Write-Output "FILES_CREATED: $($filesCreated.Count)"
    Write-Output "CREATION_TIME: $creationTime"
    Write-Output ""
    Write-Output "Created module with files:"
    foreach ($file in $filesCreated) {
        $relativePath = [System.IO.Path]::GetRelativePath($repoRoot, $file)
        Write-Output "  - $relativePath"
    }
}