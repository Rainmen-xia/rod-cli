# Create modular directory structure for project organization
param(
    [switch]$Json,
    [switch]$Help,
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Args
)

if ($Help) {
    Write-Output "Usage: analyze-modules.ps1 [-Json] [-Help] <module_name> [module_name2] ..."
    exit 0
}

$modules = $Args
if ($modules.Count -eq 0) {
    Write-Error "Usage: analyze-modules.ps1 [-Json] <module_name> [module_name2] ..."
    exit 1
}

$repoRoot = git rev-parse --show-toplevel
$specsDir = Join-Path $repoRoot "specs"
$modulesDir = Join-Path $specsDir "modules"

# Create base directories
if (!(Test-Path $specsDir)) { New-Item -ItemType Directory -Path $specsDir -Force | Out-Null }
if (!(Test-Path $modulesDir)) { New-Item -ItemType Directory -Path $modulesDir -Force | Out-Null }

# Get existing modules
$existingModules = @()
if (Test-Path $modulesDir) {
    $existingModules = Get-ChildItem -Path $modulesDir -Directory | ForEach-Object { $_.Name }
}

# Create requested modules
$createdModules = @()
foreach ($module in $modules) {
    $modulePath = Join-Path $modulesDir $module

    if (!(Test-Path $modulePath)) {
        New-Item -ItemType Directory -Path $modulePath -Force | Out-Null
        $createdModules += $module
    }
}

# Output results
$totalModules = $existingModules.Count + $createdModules.Count

if ($Json) {
    $result = @{
        status = "ready"
        modules_dir = $modulesDir
        existing_modules = $existingModules
        created_modules = $createdModules
        total_modules = $totalModules
    }
    $result | ConvertTo-Json -Compress
} else {
    if ($createdModules.Count -gt 0) {
        Write-Output "Created modules:"
        foreach ($module in $createdModules) {
            Write-Output "  - $(Join-Path $modulesDir $module)"
        }
        Write-Output ""
        Write-Output "Next: cd $(Join-Path $modulesDir $createdModules[0]) && /specify"
    } else {
        Write-Output "All specified modules already exist."
    }
}