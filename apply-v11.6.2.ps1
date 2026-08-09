$ErrorActionPreference = "Stop"
Write-Host "Aplicando V11.6.2 acumulativa..." -ForegroundColor Cyan
node ".\organigramas-apdes-v11.6.2-acumulativa\scripts\apply-v11.6.2.mjs"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "`nV11.6.2 lista. HITO quedó protegido y la limpieza segura fue aplicada." -ForegroundColor Green
