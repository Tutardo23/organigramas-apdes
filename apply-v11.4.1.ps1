$ErrorActionPreference = "Stop"

$target = Join-Path (Get-Location) "src\components\organigramas\OrgChartEditor.tsx"
if (-not (Test-Path $target)) {
  throw "No se encontró $target. Ejecutá este script desde la raíz de organigramas-apdes."
}

$content = Get-Content -LiteralPath $target -Raw

$old = @'
        if (result.person) {
          setPeople((current) =>
            current.some((person) => person.id === result.person.id)
              ? current
              : [...current, result.person],
          );
        }
'@

$new = @'
        const savedPerson = result.person;
        if (savedPerson) {
          setPeople((current) =>
            current.some((person) => person.id === savedPerson.id)
              ? current
              : [...current, savedPerson],
          );
        }
'@

if (-not $content.Contains($old)) {
  if ($content.Contains("const savedPerson = result.person;")) {
    Write-Host "V11.4.1 ya estaba aplicada." -ForegroundColor Yellow
    exit 0
  }
  throw "No encontré el bloque esperado en OrgChartEditor.tsx. No se modificó ningún archivo."
}

$updated = $content.Replace($old, $new)
Set-Content -LiteralPath $target -Value $updated -Encoding utf8NoBOM
Write-Host "V11.4.1 aplicada: nullabilidad de result.person corregida." -ForegroundColor Green
