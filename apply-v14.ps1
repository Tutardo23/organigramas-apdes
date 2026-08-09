$ErrorActionPreference = "Stop"

Write-Host "`n=== V14: editor guiado HITO ===" -ForegroundColor Cyan

function Test-ProjectRoot([string]$Path) {
  return (Test-Path -LiteralPath (Join-Path $Path "package.json")) -and
         (Test-Path -LiteralPath (Join-Path $Path "src"))
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$parentRoot = Split-Path -Parent $scriptRoot
$currentRoot = (Get-Location).Path

if (Test-ProjectRoot $scriptRoot) {
  $projectRoot = $scriptRoot
} elseif (Test-ProjectRoot $parentRoot) {
  $projectRoot = $parentRoot
} elseif (Test-ProjectRoot $currentRoot) {
  $projectRoot = $currentRoot
} else {
  throw "No encuentro la raíz de organigramas-apdes. Ejecutá el script desde el proyecto o desde una carpeta V14 ubicada dentro del proyecto."
}

$payloadRoot = Join-Path $scriptRoot "v14-payload"
if (-not (Test-Path -LiteralPath $payloadRoot)) {
  $payloadRoot = Join-Path $projectRoot "v14-payload"
}
if (-not (Test-Path -LiteralPath $payloadRoot)) {
  throw "No encuentro v14-payload. Copiá también esa carpeta junto con apply-v14.ps1."
}

$relative = "src\components\organigramas\PucaraOrgChart.tsx"
$source = Join-Path $payloadRoot $relative
$target = Join-Path $projectRoot $relative
if (-not (Test-Path -LiteralPath $source)) { throw "Falta $relative dentro de v14-payload." }
if (-not (Test-Path -LiteralPath $target)) { throw "No encuentro el PucaraOrgChart activo. V14 necesita partir de V12/V13 funcional." }

$backupRoot = Join-Path $projectRoot "backups\v14-pre-guided-editor"
$backupTarget = Join-Path $backupRoot $relative
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $backupTarget) | Out-Null
Copy-Item -LiteralPath $target -Destination $backupTarget -Force
Write-Host "Backup: backups\v14-pre-guided-editor" -ForegroundColor DarkGray

Copy-Item -LiteralPath $source -Destination $target -Force
Write-Host "OK: editor guiado instalado" -ForegroundColor Green

function Restore-V14Backup {
  if (Test-Path -LiteralPath $backupTarget) {
    Copy-Item -LiteralPath $backupTarget -Destination $target -Force
    Write-Host "Se restauró automáticamente el PucaraOrgChart anterior." -ForegroundColor Yellow
  }
}

Push-Location $projectRoot
try {
  try {
    $pkgRaw = Get-Content -LiteralPath (Join-Path $projectRoot "package.json") -Raw

    if ($pkgRaw -match '"guard:hito"') {
      Write-Host "`n--- Guard HITO ---" -ForegroundColor Cyan
      npm run guard:hito
      if ($LASTEXITCODE -ne 0) { throw "Falló guard:hito" }
    }

    if ($pkgRaw -match '"guard:active-stack"') {
      Write-Host "`n--- Guard stack activo ---" -ForegroundColor Cyan
      npm run guard:active-stack
      if ($LASTEXITCODE -ne 0) { throw "Falló guard:active-stack" }
    }

    Write-Host "`n--- TypeScript ---" -ForegroundColor Cyan
    npm run typecheck
    if ($LASTEXITCODE -ne 0) { throw "Falló typecheck" }

    Write-Host "`n--- ESLint (0 warnings) ---" -ForegroundColor Cyan
    npm run lint
    if ($LASTEXITCODE -ne 0) { throw "Falló lint" }

    Write-Host "`n--- Tests ---" -ForegroundColor Cyan
    npm run test
    if ($LASTEXITCODE -ne 0) { throw "Fallaron los tests" }

    Write-Host "`n--- Build producción ---" -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Falló build" }
  }
  catch {
    Restore-V14Backup
    throw
  }
}
finally {
  Pop-Location
}

Write-Host "`nV14 COMPLETA: editor simple + guía rápida + pasos Datos/Personas/Vínculos + opciones avanzadas escondidas + build OK." -ForegroundColor Green
