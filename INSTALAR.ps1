param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectPath
)

$ErrorActionPreference = "Stop"
$source = Join-Path $PSScriptRoot "src\*"
$destination = Join-Path $ProjectPath "src"

if (-not (Test-Path $destination)) {
  throw "No se encontró la carpeta src en: $ProjectPath"
}

Copy-Item $source $destination -Recurse -Force
Write-Host "Archivos copiados correctamente en $destination" -ForegroundColor Green
Write-Host "Ahora ejecutá npm run build desde el proyecto." -ForegroundColor Cyan
