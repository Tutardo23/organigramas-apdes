$ErrorActionPreference = "Stop"
$root = Get-Location
$backupRoot = Join-Path $root "backups\v12-pre-clean"
$legacyRoot = Join-Path $root "legacy\organigramas\pre-v12"

if (-not (Test-Path -LiteralPath $backupRoot)) {
  throw "No existe backups\v12-pre-clean. No hay backup V12 para restaurar."
}

$restoreMap = @{
  "package.json" = "package.json"
  "src__components__organigramas__OrgNodeCard.tsx" = "src\components\organigramas\OrgNodeCard.tsx"
  "src__components__talento__TalentDashboard.tsx" = "src\components\talento\TalentDashboard.tsx"
  "src__app__organigramas___schoolSlug___editar__page.tsx" = "src\app\organigramas\[schoolSlug]\editar\page.tsx"
  "src__app__organigramas___schoolSlug___pucara__page.tsx" = "src\app\organigramas\[schoolSlug]\pucara\page.tsx"
  "src__app__organigramas___schoolSlug___explorar__page.tsx" = "src\app\organigramas\[schoolSlug]\explorar\page.tsx"
}

foreach ($entry in $restoreMap.GetEnumerator()) {
  $source = Join-Path $backupRoot $entry.Key
  if (Test-Path -LiteralPath $source) {
    $target = Join-Path $root $entry.Value
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
    Copy-Item -LiteralPath $source -Destination $target -Force
    Write-Host "RESTORED: $($entry.Value)" -ForegroundColor Yellow
  }
}

$legacyFiles = @(
  "InstitutionalOrgChartEditor.tsx",
  "OrgChartCanvas.tsx",
  "OrgChartEditor.tsx",
  "LegacyOrgChartCanvas.tsx"
)
foreach ($name in $legacyFiles) {
  $source = Join-Path $legacyRoot $name
  if (Test-Path -LiteralPath $source) {
    $target = Join-Path $root ("src\components\organigramas\" + $name)
    Copy-Item -LiteralPath $source -Destination $target -Force
    Write-Host "RESTORED legacy: $name" -ForegroundColor Yellow
  }
}

Write-Host "Rollback V12 completado. Ejecutá npm run typecheck y npm run build." -ForegroundColor Cyan
