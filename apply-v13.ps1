$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== V13: HITO funcional ===" -ForegroundColor Cyan

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$parentRoot = Split-Path -Parent $scriptRoot

if (Test-Path (Join-Path $scriptRoot "package.json")) {
  $projectRoot = $scriptRoot
} elseif (Test-Path (Join-Path $parentRoot "package.json")) {
  $projectRoot = $parentRoot
} else {
  throw "No encuentro package.json ni junto al script ni en la carpeta superior. Ejecutalo dentro del proyecto organigramas-apdes."
}

$payloadRoot = Join-Path $scriptRoot "v13-payload"
if (-not (Test-Path $payloadRoot)) {
  throw "No encuentro la carpeta v13-payload junto a apply-v13.ps1. Copia el paquete V13 completo."
}

Write-Host "Proyecto: $projectRoot"
Write-Host "Payload:  $payloadRoot"

$files = @(
  "src\components\organigramas\PucaraOrgChart.tsx",
  "src\app\organigramas\[schoolSlug]\pucara\actions.ts",
  "src\lib\pucara-relations.ts",
  "src\lib\__tests__\pucara-relations.test.ts"
)

$backupRoot = Join-Path $projectRoot "backups\v13-pre-functional"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
$newFiles = New-Object System.Collections.Generic.List[string]

foreach ($relative in $files) {
  $source = Join-Path $payloadRoot $relative
  $target = Join-Path $projectRoot $relative

  if (-not (Test-Path -LiteralPath $source)) {
    throw "Falta archivo del payload: $relative"
  }

  if (Test-Path -LiteralPath $target) {
    $backupTarget = Join-Path $backupRoot $relative
    $backupDir = Split-Path -Parent $backupTarget
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Copy-Item -LiteralPath $target -Destination $backupTarget -Force
  } else {
    $newFiles.Add($relative)
  }

  $targetDir = Split-Path -Parent $target
  New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
  Copy-Item -LiteralPath $source -Destination $target -Force
  Write-Host "OK: $relative" -ForegroundColor Green
}

$newFiles | Set-Content -LiteralPath (Join-Path $backupRoot "new-files.txt") -Encoding UTF8

Push-Location $projectRoot
try {
  if ((Get-Content package.json -Raw) -match '"guard:hito"') {
    Write-Host ""
    Write-Host "--- Guard HITO ---" -ForegroundColor Cyan
    npm run guard:hito
    if ($LASTEXITCODE -ne 0) { throw "Falló guard:hito" }
  }

  if ((Get-Content package.json -Raw) -match '"guard:active-stack"') {
    Write-Host ""
    Write-Host "--- Guard stack activo ---" -ForegroundColor Cyan
    npm run guard:active-stack
    if ($LASTEXITCODE -ne 0) { throw "Falló guard:active-stack" }
  }

  Write-Host ""
  Write-Host "--- TypeScript ---" -ForegroundColor Cyan
  npm run typecheck
  if ($LASTEXITCODE -ne 0) { throw "Falló typecheck" }

  Write-Host ""
  Write-Host "--- ESLint ---" -ForegroundColor Cyan
  npm run lint
  if ($LASTEXITCODE -ne 0) { throw "Falló lint" }

  Write-Host ""
  Write-Host "--- Tests ---" -ForegroundColor Cyan
  npm run test
  if ($LASTEXITCODE -ne 0) { throw "Fallaron los tests" }

  Write-Host ""
  Write-Host "--- Build producción ---" -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Falló build" }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "V13 COMPLETA: filtros Integra/Colabora/Todas + relaciones editables + personas autocompletadas + posiciones con rollback + build OK." -ForegroundColor Green