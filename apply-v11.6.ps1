$ErrorActionPreference = 'Stop'

$root = (Get-Location).Path
$institutional = Join-Path $root 'src\components\organigramas\InstitutionalOrgChartEditor.tsx'
$nodeCard = Join-Path $root 'src\components\organigramas\OrgNodeCard.tsx'
$talent = Join-Path $root 'src\components\talento\TalentDashboard.tsx'
$guardTarget = Join-Path $root 'scripts\check-hito-route.mjs'
$guardSource = Join-Path $PSScriptRoot 'scripts\check-hito-route.mjs'

foreach ($path in @($institutional, $nodeCard, $talent)) {
  if (-not (Test-Path $path)) { throw "No encuentro el archivo: $path" }
}
if (-not (Test-Path $guardSource)) { throw "No encuentro el guard de HITO dentro del paquete." }

$utf8 = New-Object System.Text.UTF8Encoding($false)

function Remove-LineIfPresent {
  param([string]$Text, [string]$Name)
  $pattern = "(?m)^\s{2}" + [regex]::Escape($Name) + ",\r?\n"
  return [regex]::Replace($Text, $pattern, '')
}

function Replace-OnceIfPresent {
  param(
    [string]$Text,
    [string]$Pattern,
    [string]$Replacement,
    [string]$Label
  )
  $regex = [regex]::new($Pattern)
  $matches = $regex.Matches($Text)
  if ($matches.Count -gt 1) {
    throw "V11.6: encontre mas de una coincidencia para '$Label'. No sigo para no tocar de mas."
  }
  if ($matches.Count -eq 1) {
    return $regex.Replace($Text, $Replacement, 1)
  }
  return $Text
}

# -----------------------------------------------------------------------------
# 1) InstitutionalOrgChartEditor: SOLO warnings triviales.
#    No tocamos effects, refs, layout, posiciones ni la experiencia HITO.
# -----------------------------------------------------------------------------
$text = [System.IO.File]::ReadAllText($institutional)
foreach ($name in @('Background','BackgroundVariant','Controls','ReactFlow')) {
  $text = Remove-LineIfPresent $text $name
}
foreach ($name in @('GitBranch','Route','Search')) {
  $text = Remove-LineIfPresent $text $name
}

$text = Replace-OnceIfPresent `
  $text `
  '(?ms)^function relationFilterLabel\(filter: RelationFilter\) \{\r?\n.*?^\}\r?\n\r?\n' `
  '' `
  'relationFilterLabel'

$text = Replace-OnceIfPresent `
  $text `
  'const \[query, setQuery\] = useState\(""\);' `
  'const [query] = useState("");' `
  'setQuery'

[System.IO.File]::WriteAllText($institutional, $text, $utf8)

# -----------------------------------------------------------------------------
# 2) TalentDashboard: dos imports muertos.
# -----------------------------------------------------------------------------
$text = [System.IO.File]::ReadAllText($talent)
foreach ($name in @('MessageSquareText','ShieldCheck')) {
  $text = Remove-LineIfPresent $text $name
}
[System.IO.File]::WriteAllText($talent, $text, $utf8)

# -----------------------------------------------------------------------------
# 3) OrgNodeCard: React Compiler no debe recibir un componente creado en render.
# -----------------------------------------------------------------------------
$text = [System.IO.File]::ReadAllText($nodeCard)
if ($text -notmatch 'import \{ createElement \} from "react";') {
  $text = Replace-OnceIfPresent `
    $text `
    '(?m)^\} from "lucide-react";\r?\n' `
    "} from \"lucide-react\";`r`nimport { createElement } from \"react\";`r`n" `
    'import createElement'
}

$text = Replace-OnceIfPresent `
  $text `
  '  const Icon = getIcon\(data\.icon, data\.area\);' `
  '  const icon = createElement(getIcon(data.icon, data.area), { className: "h-4 w-4" });' `
  'dynamic Icon const'

$text = Replace-OnceIfPresent `
  $text `
  '            <Icon className="h-4 w-4" />' `
  '            {icon}' `
  'dynamic Icon render'

[System.IO.File]::WriteAllText($nodeCard, $text, $utf8)

# -----------------------------------------------------------------------------
# 4) Guard HITO. Copiamos un test simple que comprueba la arquitectura de rutas.
# -----------------------------------------------------------------------------
New-Item -ItemType Directory -Force -Path (Split-Path $guardTarget) | Out-Null
Copy-Item $guardSource $guardTarget -Force

# Verificaciones locales del parche.
$institutionalCheck = [System.IO.File]::ReadAllText($institutional)
$nodeCardCheck = [System.IO.File]::ReadAllText($nodeCard)
$talentCheck = [System.IO.File]::ReadAllText($talent)

$bad = @()
foreach ($name in @('Background','BackgroundVariant','Controls','ReactFlow','GitBranch','Route','Search')) {
  if ($institutionalCheck -match ("(?m)^\s{2}" + [regex]::Escape($name) + ",$")) {
    $bad += "$name sigue importado en InstitutionalOrgChartEditor"
  }
}
if ($institutionalCheck -match 'function relationFilterLabel\(') { $bad += 'relationFilterLabel sigue presente' }
if ($institutionalCheck -match '\[query, setQuery\]') { $bad += 'setQuery sigue presente' }
if ($talentCheck -match '(?m)^\s{2}MessageSquareText,') { $bad += 'MessageSquareText sigue presente' }
if ($talentCheck -match '(?m)^\s{2}ShieldCheck,') { $bad += 'ShieldCheck sigue presente' }
if ($nodeCardCheck -notmatch 'createElement\(getIcon\(data\.icon, data\.area\)') { $bad += 'OrgNodeCard no quedo con createElement' }
if ($nodeCardCheck -match '<Icon className="h-4 w-4"') { $bad += 'OrgNodeCard conserva <Icon /> dinamico' }

if ($bad.Count -gt 0) {
  throw ("V11.6 no paso la verificacion:`n- " + ($bad -join "`n- "))
}

Write-Host ''
Write-Host 'V11.6 aplicada correctamente.' -ForegroundColor Green
Write-Host 'HITO/Pucara NO fue modificado.' -ForegroundColor Green
Write-Host 'Se agrego scripts/check-hito-route.mjs para bloquear futuras regresiones.' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Ejecuta primero:' -ForegroundColor Cyan
Write-Host ' node scripts/check-hito-route.mjs'
Write-Host ' npm run typecheck'
Write-Host ' npm run lint'
Write-Host ' npm run test'
Write-Host ' npm run build'
