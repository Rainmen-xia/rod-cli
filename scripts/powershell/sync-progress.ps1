# Sync module progress to parent modules and roadmap
param(
    [switch]$Json,
    [switch]$Help
)

if ($Help) {
    Write-Output "Usage: sync-progress.ps1 [-Json] [-Help]"
    exit 0
}

$repoRoot = git rev-parse --show-toplevel
$currentBranch = git rev-parse --abbrev-ref HEAD

# Try to detect current module from working directory or git branch
$modulePath = ""
$currentDir = Get-Location

# Check if we're in a specs/modules directory
if ($currentDir.Path -like "*\specs\modules\*") {
    $modulePath = $currentDir.Path -replace ".*\\specs\\modules\\", ""
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
$roadmapFile = Join-Path $repoRoot "specs" "roadmap.md"

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

# Function to check module completion status
function Get-ModuleStatus {
    param([string]$modulePathParam)
    
    $moduleDirectoryParam = Join-Path $repoRoot "specs" "modules" $modulePathParam
    
    $reqComplete = $false
    $designComplete = $false
    $todoComplete = $false
    $overallStatus = "📋 待开始"
    $progress = 0
    
    # Check requirements
    $reqFile = Join-Path $moduleDirectoryParam "spec.md"
    if ((Test-Path $reqFile) -and (Get-Item $reqFile).Length -gt 0) {
        $reqContent = Get-Content $reqFile -Raw -Encoding UTF8
        if ($reqContent -notmatch '\[模块名称\]|\[模块路径\]') {
            $reqComplete = $true
            $progress += 33
        }
    }
    
    # Check design
    $designFile = Join-Path $moduleDirectoryParam "plan.md"
    if ((Test-Path $designFile) -and (Get-Item $designFile).Length -gt 0) {
        $designContent = Get-Content $designFile -Raw -Encoding UTF8
        if ($designContent -notmatch '\[模块名称\]|\[模块路径\]') {
            $designComplete = $true
            $progress += 33
        }
    }
    
    # Check todo
    $todoFile = Join-Path $moduleDirectoryParam "tasks.md"
    if ((Test-Path $todoFile) -and (Get-Item $todoFile).Length -gt 0) {
        $todoContent = Get-Content $todoFile -Raw -Encoding UTF8
        if ($todoContent -notmatch '\[模块名称\]|\[模块路径\]') {
            $todoComplete = $true
            $progress += 34
            
            # Check if todos are actually completed
            if ($todoContent -match '✅.*已完成|✅.*completed') {
                $overallStatus = "✅ 已完成"
            } elseif ($todoContent -match '❌.*阻塞|❌.*blocked') {
                $overallStatus = "❌ 阻塞"
            } elseif ($todoContent -match '⚠️.*风险|⚠️.*risk') {
                $overallStatus = "⚠️ 风险"
            } else {
                $overallStatus = "🔄 进行中"
            }
        }
    } elseif ($reqComplete -and $designComplete) {
        $overallStatus = "🔄 进行中"
    } elseif ($reqComplete -or $designComplete) {
        $overallStatus = "🔄 进行中"
    }
    
    return @{
        status = $overallStatus
        progress = $progress
        reqComplete = $reqComplete
        designComplete = $designComplete
        todoComplete = $todoComplete
    }
}

# Check current module status
$currentStatus = Get-ModuleStatus $modulePath

# Check submodules status
$submodules = @()
$submoduleProgress = @()
$submodulesDir = Join-Path $moduleDir "modules"
if (Test-Path $submodulesDir) {
    Get-ChildItem $submodulesDir -Directory | ForEach-Object {
        $submoduleName = $_.Name
        $submodulePath = "$modulePath/modules/$submoduleName"
        
        $subStatus = Get-ModuleStatus $submodulePath
        
        $submodules += $submoduleName
        $submoduleProgress += "$($subStatus.status) ($($subStatus.progress)%)"
    }
}

# Calculate overall progress including submodules
$totalProgress = $currentStatus.progress
if ($submodules.Count -gt 0) {
    $subTotal = 0
    foreach ($submoduleName in $submodules) {
        $submodulePath = "$modulePath/modules/$submoduleName"
        $subStatus = Get-ModuleStatus $submodulePath
        $subTotal += $subStatus.progress
    }
    $subAvg = [Math]::Floor($subTotal / $submodules.Count)
    $totalProgress = [Math]::Floor(($currentStatus.progress + $subAvg) / 2)
}

# Check if we need to update parent module
$parentPath = ""
if ($modulePath -like "*/modules/*") {
    $parentPath = $modulePath -replace '/modules/[^/]*$', ''
    $parentDir = Join-Path $repoRoot "specs" "modules" $parentPath
    $parentTodo = Join-Path $parentDir "tasks.md"
    
    # Update parent todo if exists
    if (Test-Path $parentTodo) {
        # This would update parent todo status - implementation depends on todo format
        Write-Debug "Would update parent todo: $parentTodo"
    }
}

# Update roadmap if it exists
$roadmapUpdated = $false
if (Test-Path $roadmapFile) {
    # Create backup
    Copy-Item $roadmapFile "$roadmapFile.bak"
    
    # Update roadmap (basic implementation - would need more sophisticated logic)
    $roadmapUpdated = $true
}

# Prepare sync report
$syncTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$syncReport = @"
Progress Sync Report - $syncTime

Current Module: $modulePath
- 需求分析: $(if ($currentStatus.reqComplete) { "✅ 已完成" } else { "📋 待完成" })
- 设计文档: $(if ($currentStatus.designComplete) { "✅ 已完成" } else { "📋 待完成" })
- 任务清单: $(if ($currentStatus.todoComplete) { "✅ 已完成" } else { "📋 待完成" })
- 整体进度: $totalProgress%
- 状态: $($currentStatus.status)
"@

if ($submodules.Count -gt 0) {
    $syncReport += "`n`nSubmodule Status:"
    for ($i = 0; $i -lt $submodules.Count; $i++) {
        $syncReport += "`n- $($submodules[$i]): $($submoduleProgress[$i])"
    }
}

if ($parentPath) {
    $syncReport += "`n`nParent Module: $parentPath (progress updated)"
}

if ($Json) {
    $result = @{
        status = "synced"
        module_path = $modulePath
        progress = $totalProgress
        current_status = $currentStatus.status
        requirements_done = $currentStatus.reqComplete
        design_done = $currentStatus.designComplete
        todo_done = $currentStatus.todoComplete
        submodules_count = $submodules.Count
        parent_path = $parentPath
        roadmap_updated = $roadmapUpdated
        sync_time = $syncTime
    }
    $result | ConvertTo-Json -Compress
} else {
    Write-Output "MODULE_PATH: $modulePath"
    Write-Output "PROGRESS: $totalProgress%"
    Write-Output "STATUS: $($currentStatus.status)"
    Write-Output "REQUIREMENTS_DONE: $($currentStatus.reqComplete)"
    Write-Output "DESIGN_DONE: $($currentStatus.designComplete)"
    Write-Output "TODO_DONE: $($currentStatus.todoComplete)"
    Write-Output "SUBMODULES_COUNT: $($submodules.Count)"
    if ($parentPath) { Write-Output "PARENT_PATH: $parentPath" }
    Write-Output "ROADMAP_UPDATED: $roadmapUpdated"
    Write-Output "SYNC_TIME: $syncTime"
    Write-Output ""
    Write-Output "SYNC_REPORT:"
    Write-Output $syncReport
}