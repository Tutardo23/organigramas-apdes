$ErrorActionPreference = "Stop"

function Test-ProjectRoot([string]$Path) {
  return (Test-Path -LiteralPath (Join-Path $Path "package.json")) -and
         (Test-Path -LiteralPath (Join-Path $Path "src"))
}

function Same-Path([string]$A, [string]$B) {
  $aFull = [System.IO.Path]::GetFullPath($A).TrimEnd('\')
  $bFull = [System.IO.Path]::GetFullPath($B).TrimEnd('\')
  return [string]::Equals($aFull, $bFull, [System.StringComparison]::OrdinalIgnoreCase)
}

function Copy-PatchFile([string]$PatchRoot, [string]$ProjectRoot, [string]$RelativePath) {
  $source = Join-Path $PatchRoot $RelativePath
  $target = Join-Path $ProjectRoot $RelativePath

  if (Same-Path $source $target) {
    if (-not (Test-Path -LiteralPath $target)) {
      throw "Falta el archivo esperado: $RelativePath"
    }
    Write-Host "YA PRESENTE: $RelativePath" -ForegroundColor DarkGray
    return
  }

  if (-not (Test-Path -LiteralPath $source)) {
    if (Test-Path -LiteralPath $target) {
      Write-Host "YA PRESENTE EN PROYECTO: $RelativePath" -ForegroundColor DarkGray
      return
    }
    throw "No encuentro el archivo de V12: $source"
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
  Copy-Item -LiteralPath $source -Destination $target -Force
  Write-Host "OK: $RelativePath" -ForegroundColor Green
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$currentDir = (Get-Location).Path
$parentOfScript = Split-Path -Parent $scriptDir

# Soporta las dos formas reales de trabajo:
# A) script dentro de organigramas-apdes-v12.x, ejecutado desde la raíz del proyecto.
# B) contenido de V12 copiado directamente dentro de la raíz del proyecto.
if (Test-ProjectRoot $scriptDir) {
  $root = $scriptDir
  $patch = $scriptDir
}
elseif (Test-ProjectRoot $parentOfScript) {
  $root = $parentOfScript
  $patch = $scriptDir
}
elseif (Test-ProjectRoot $currentDir) {
  $root = $currentDir
  $patch = $scriptDir
}
else {
  throw "No pude detectar la raíz del proyecto. Ejecutá el script desde F:\.cositas\organigramas-apdes o desde una carpeta V12 ubicada dentro de ese proyecto."
}

Write-Host "" 
Write-Host "=== V12.1: saneamiento grande universal ===" -ForegroundColor Cyan
Write-Host "Proyecto: $root" -ForegroundColor DarkGray
Write-Host "Paquete V12: $patch" -ForegroundColor DarkGray

Push-Location $root
try {
  # Backup mínimo de archivos activos que V12 modifica. Si el intento anterior ya lo creó,
  # se conserva exactamente ese backup previo y no se pisa.
  $backupRoot = Join-Path $root "backups\v12-pre-clean"
  if (-not (Test-Path -LiteralPath $backupRoot)) {
    New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
    $backupTargets = @(
      "package.json",
      "src\components\organigramas\OrgNodeCard.tsx",
      "src\components\talento\TalentDashboard.tsx",
      "src\app\organigramas\[schoolSlug]\editar\page.tsx",
      "src\app\organigramas\[schoolSlug]\pucara\page.tsx",
      "src\app\organigramas\[schoolSlug]\explorar\page.tsx"
    )
    foreach ($relative in $backupTargets) {
      $source = Join-Path $root $relative
      if (Test-Path -LiteralPath $source) {
        $safeName = $relative.Replace("\", "__").Replace("[", "_").Replace("]", "_")
        Copy-Item -LiteralPath $source -Destination (Join-Path $backupRoot $safeName) -Force
      }
    }
    Write-Host "Backup V12 creado en backups\v12-pre-clean" -ForegroundColor DarkGray
  }
  else {
    Write-Host "Backup V12 previo conservado." -ForegroundColor DarkGray
  }

  # 1) Unificar rutas antiguas hacia HITO. Copy-PatchFile evita copiar un archivo sobre sí mismo.
  $routeFiles = @(
    "src\app\organigramas\[schoolSlug]\editar\page.tsx",
    "src\app\organigramas\[schoolSlug]\pucara\page.tsx",
    "src\app\organigramas\[schoolSlug]\explorar\page.tsx"
  )
  foreach ($relative in $routeFiles) {
    Copy-PatchFile $patch $root $relative
  }

  # 2) Instalar guards. También funciona si ya fueron copiados directamente a scripts\.
  New-Item -ItemType Directory -Force -Path (Join-Path $root "scripts") | Out-Null
  Copy-PatchFile $patch $root "scripts\check-hito-route.mjs"
  Copy-PatchFile $patch $root "scripts\check-active-orgchart-stack.mjs"

  # apply-v12.mjs puede estar en el paquete o ya pegado en scripts del proyecto.
  $applyNode = Join-Path $patch "scripts\apply-v12.mjs"
  if (-not (Test-Path -LiteralPath $applyNode)) {
    $applyNode = Join-Path $root "scripts\apply-v12.mjs"
  }
  if (-not (Test-Path -LiteralPath $applyNode)) {
    throw "No encuentro scripts\apply-v12.mjs"
  }

  # 3) Verificar que ningún archivo ACTIVO dependa del stack viejo que vamos a archivar.
  $legacyNames = @(
    "InstitutionalOrgChartEditor",
    "OrgChartCanvas",
    "OrgChartEditor",
    "LegacyOrgChartCanvas"
  )
  $legacyFiles = @(
    "src\components\organigramas\InstitutionalOrgChartEditor.tsx",
    "src\components\organigramas\OrgChartCanvas.tsx",
    "src\components\organigramas\OrgChartEditor.tsx",
    "src\components\organigramas\LegacyOrgChartCanvas.tsx"
  )

  $allSourceFiles = Get-ChildItem -LiteralPath (Join-Path $root "src") -Recurse -File |
    Where-Object { $_.Extension -in ".ts", ".tsx" }

  $legacyFullPaths = @{}
  foreach ($relative in $legacyFiles) {
    $legacyFullPaths[[System.IO.Path]::GetFullPath((Join-Path $root $relative))] = $true
  }

  $unexpected = @()
  foreach ($file in $allSourceFiles) {
    $full = [System.IO.Path]::GetFullPath($file.FullName)
    if ($legacyFullPaths.ContainsKey($full)) { continue }
    $text = Get-Content -LiteralPath $file.FullName -Raw
    foreach ($name in $legacyNames) {
      if ($text -match [regex]::Escape($name)) {
        $unexpected += "$($file.FullName) -> $name"
      }
    }
  }

  if ($unexpected.Count -gt 0) {
    Write-Host "" 
    Write-Host "Referencias activas al stack viejo encontradas:" -ForegroundColor Yellow
    $unexpected | ForEach-Object { Write-Host " - $_" }
    throw "V12 se detuvo ANTES de archivar archivos. Pasame este bloque si aparece."
  }

  # 4) Archivar el stack viejo fuera de src. No se elimina: queda listo para rollback.
  $archiveRoot = Join-Path $root "legacy\organigramas\pre-v12"
  New-Item -ItemType Directory -Force -Path $archiveRoot | Out-Null
  foreach ($relative in $legacyFiles) {
    $source = Join-Path $root $relative
    if (Test-Path -LiteralPath $source) {
      $destination = Join-Path $archiveRoot ([System.IO.Path]::GetFileName($source))
      Copy-Item -LiteralPath $source -Destination $destination -Force
      Remove-Item -LiteralPath $source -Force
      Write-Host "ARCHIVADO: $relative" -ForegroundColor DarkCyan
    }
    else {
      Write-Host "YA FUERA DEL STACK: $relative" -ForegroundColor DarkGray
    }
  }

  # 5) Limpieza activa + scripts de package.json.
  node $applyNode
  if ($LASTEXITCODE -ne 0) { throw "Falló apply-v12.mjs" }

  # 6) Comprobar que package.json realmente recibió los scripts.
  $pkg = Get-Content -LiteralPath (Join-Path $root "package.json") -Raw | ConvertFrom-Json
  if (-not $pkg.scripts.'guard:hito') { throw "package.json no recibió guard:hito" }
  if (-not $pkg.scripts.'guard:active-stack') { throw "package.json no recibió guard:active-stack" }
  Write-Host "OK package.json: guards instalados" -ForegroundColor Green

  # 7) Guards reales antes de compilar.
  npm run guard:hito
  if ($LASTEXITCODE -ne 0) { throw "Guard HITO falló" }
  npm run guard:active-stack
  if ($LASTEXITCODE -ne 0) { throw "Guard stack activo falló" }

  Write-Host "" 
  Write-Host "=== Controles completos ===" -ForegroundColor Cyan
  npm run typecheck
  if ($LASTEXITCODE -ne 0) { throw "typecheck falló" }
  npm run lint
  if ($LASTEXITCODE -ne 0) { throw "lint falló" }
  npm run test
  if ($LASTEXITCODE -ne 0) { throw "tests fallaron" }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "build falló" }

  Write-Host "" 
  Write-Host "V12.1 COMPLETA: HITO protegido + stack viejo archivado + lint activo en 0 warnings + build OK." -ForegroundColor Green
}
finally {
  Pop-Location
}
