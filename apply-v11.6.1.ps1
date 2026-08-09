$ErrorActionPreference = 'Stop'

$root = (Get-Location).Path
$source = Join-Path $PSScriptRoot 'scripts\check-hito-route.mjs'
$target = Join-Path $root 'scripts\check-hito-route.mjs'
$packagePath = Join-Path $root 'package.json'

if (-not (Test-Path $source)) { throw 'No encuentro check-hito-route.mjs dentro del paquete.' }
if (-not (Test-Path $packagePath)) { throw 'No encuentro package.json en la carpeta actual.' }

New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
Copy-Item $source $target -Force

# Integra el guard en package.json sin reemplazar tus dependencias ni otros scripts.
$nodePatch = @'
const fs = require("fs");
const path = "package.json";
const pkg = JSON.parse(fs.readFileSync(path, "utf8"));
pkg.scripts ||= {};
pkg.scripts["guard:hito"] = "node scripts/check-hito-route.mjs";
if (pkg.scripts.check && !pkg.scripts.check.includes("npm run guard:hito")) {
  pkg.scripts.check = `npm run guard:hito && ${pkg.scripts.check}`;
}
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n", "utf8");
'@
node -e $nodePatch
if ($LASTEXITCODE -ne 0) { throw 'No pude actualizar los scripts de package.json.' }

Write-Host ''
Write-Host 'V11.6.1 aplicada correctamente.' -ForegroundColor Green
Write-Host 'Solo corrige y fortalece el guard HITO; no modifica la pagina ni el organigrama.' -ForegroundColor Green
Write-Host ''
Write-Host 'Ejecuta:' -ForegroundColor Cyan
Write-Host ' npm run guard:hito'
Write-Host ' npm run lint'
Write-Host ' npm run check'
