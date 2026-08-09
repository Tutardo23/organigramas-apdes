$ErrorActionPreference = "Stop"

$root = Get-Location
$patch = Split-Path -Parent $MyInvocation.MyCommand.Path

$targets = @(
  "src\app\organigramas\[schoolSlug]\page.tsx",
  "src\app\organigramas\[schoolSlug]\editar\page.tsx",
  "src\app\organigramas\[schoolSlug]\pucara\page.tsx"
)

foreach ($relative in $targets) {
  $source = Join-Path $patch $relative
  $target = Join-Path $root $relative
  $targetDir = Split-Path -Parent $target
  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  Copy-Item -LiteralPath $source -Destination $target -Force
  Write-Host "OK: $relative" -ForegroundColor Green
}

$mainPage = Join-Path $root "src\app\organigramas\[schoolSlug]\page.tsx"
$content = Get-Content -LiteralPath $mainPage -Raw
if ($content -notmatch 'PucaraOrgChart' -or $content -match '<OrgChartCanvas') {
  throw "La restauracion HITO no quedo aplicada correctamente."
}

Write-Host "HITO/Pucara restaurado: la ruta principal vuelve a usar PucaraOrgChart." -ForegroundColor Cyan
