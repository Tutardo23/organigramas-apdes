$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$parentRoot = Split-Path -Parent $scriptRoot
if (Test-Path (Join-Path $scriptRoot "package.json")) {
  $projectRoot = $scriptRoot
} elseif (Test-Path (Join-Path $parentRoot "package.json")) {
  $projectRoot = $parentRoot
} else {
  throw "No encuentro la raiz del proyecto."
}

$backupRoot = Join-Path $projectRoot "backups\v13-pre-functional"
if (-not (Test-Path $backupRoot)) {
  throw "No existe backups\v13-pre-functional."
}

$files = @(
  "src\components\organigramas\PucaraOrgChart.tsx",
  "src\app\organigramas\[schoolSlug]\pucara\actions.ts",
  "src\lib\pucara-relations.ts",
  "src\lib\__tests__\pucara-relations.test.ts"
)

$newFileList = Join-Path $backupRoot "new-files.txt"
$newFiles = @()
if (Test-Path $newFileList) {
  $newFiles = Get-Content $newFileList | Where-Object { $_ -and $_.Trim().Length -gt 0 }
}

foreach ($relative in $files) {
  $backup = Join-Path $backupRoot $relative
  $target = Join-Path $projectRoot $relative
  if (Test-Path -LiteralPath $backup) {
    $targetDir = Split-Path -Parent $target
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    Copy-Item -LiteralPath $backup -Destination $target -Force
    Write-Host "Restaurado: $relative"
  } elseif ($newFiles -contains $relative) {
    Remove-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
    Write-Host "Quitado: $relative"
  }
}

Write-Host "Rollback V13 terminado." -ForegroundColor Yellow
