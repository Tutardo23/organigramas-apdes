$ErrorActionPreference = "Stop"
$target = Join-Path (Get-Location) "src\components\organigramas\OrgChartEditor.tsx"
if (-not (Test-Path $target)) { throw "No se encontró $target" }
$content = Get-Content -LiteralPath $target -Raw
if (-not $content.Contains("const savedPerson = result.person;")) {
  throw "V11.4.2 NO está aplicada: falta 'const savedPerson = result.person;'"
}
if ($content.Contains("person.id === result.person.id")) {
  throw "V11.4.2 incompleta: todavía existe la referencia antigua a result.person.id"
}
Write-Host "V11.4.2 aplicada correctamente." -ForegroundColor Green
