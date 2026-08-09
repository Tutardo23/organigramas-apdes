$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$parentRoot = Split-Path -Parent $scriptRoot
$currentRoot = (Get-Location).Path

function Test-Root([string]$Path) {
  return (Test-Path -LiteralPath (Join-Path $Path "package.json")) -and (Test-Path -LiteralPath (Join-Path $Path "src"))
}

if (Test-Root $scriptRoot) { $root = $scriptRoot }
elseif (Test-Root $parentRoot) { $root = $parentRoot }
elseif (Test-Root $currentRoot) { $root = $currentRoot }
else { throw "No encuentro la raíz del proyecto." }

$relative = "src\components\organigramas\PucaraOrgChart.tsx"
$backup = Join-Path $root "backups\v14-pre-guided-editor\$relative"
$target = Join-Path $root $relative
if (-not (Test-Path -LiteralPath $backup)) { throw "No encuentro el backup de V14." }
Copy-Item -LiteralPath $backup -Destination $target -Force
Write-Host "V14 revertida. Se restauró PucaraOrgChart.tsx." -ForegroundColor Green
