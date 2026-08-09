$ErrorActionPreference = 'Stop'

$root = (Get-Location).Path
$institutional = Join-Path $root 'src\components\organigramas\InstitutionalOrgChartEditor.tsx'
$nodeCard = Join-Path $root 'src\components\organigramas\OrgNodeCard.tsx'
$talent = Join-Path $root 'src\components\talento\TalentDashboard.tsx'

foreach ($path in @($institutional, $nodeCard, $talent)) {
  if (-not (Test-Path $path)) { throw "No encuentro el archivo: $path" }
}

$utf8 = New-Object System.Text.UTF8Encoding($false)

function Replace-RegexOnce {
  param(
    [string]$Text,
    [string]$Pattern,
    [string]$Replacement,
    [string]$Label
  )
  $regex = [regex]::new($Pattern)
  $matches = $regex.Matches($Text)
  if ($matches.Count -ne 1) {
    throw "V11.5: esperaba 1 coincidencia para '$Label' y encontre $($matches.Count). No se modifico ese archivo."
  }
  return $regex.Replace($Text, $Replacement, 1)
}

# 1) InstitutionalOrgChartEditor: solo codigo muerto/imports sin uso.
$text = [System.IO.File]::ReadAllText($institutional)
foreach ($name in @('Background','BackgroundVariant','Controls','ReactFlow')) {
  $pattern = "(?m)^\s{2}" + [regex]::Escape($name) + ",\r?\n"
  $text = Replace-RegexOnce $text $pattern '' "import $name"
}
$text = Replace-RegexOnce $text '(?m)^\s{2}type NodeTypes,\r?\n' '' 'import type NodeTypes'
foreach ($name in @('GitBranch','Route','Search')) {
  $pattern = "(?m)^\s{2}" + [regex]::Escape($name) + ",\r?\n"
  $text = Replace-RegexOnce $text $pattern '' "lucide $name"
}
$text = Replace-RegexOnce $text '(?ms)^function relationFilterLabel\(filter: RelationFilter\) \{\r?\n.*?^\}\r?\n\r?\n' '' 'relationFilterLabel'
$text = Replace-RegexOnce $text '(?ms)^const nodeTypes: NodeTypes = \{\r?\n\s{2}institutionalNode: InstitutionalNode,\r?\n\};\r?\n\r?\nconst edgeTypes = \{\r?\n\s{2}institutionalEdge: InstitutionalEdge,\r?\n\};\r?\n\r?\n' '' 'nodeTypes + edgeTypes'
$text = Replace-RegexOnce $text 'const \[query, setQuery\] = useState\(""\);' 'const [query] = useState("");' 'setQuery'
[System.IO.File]::WriteAllText($institutional, $text, $utf8)

# 2) TalentDashboard: imports realmente muertos.
$text = [System.IO.File]::ReadAllText($talent)
foreach ($name in @('MessageSquareText','ShieldCheck')) {
  $pattern = "(?m)^\s{2}" + [regex]::Escape($name) + ",\r?\n"
  $text = Replace-RegexOnce $text $pattern '' "TalentDashboard $name"
}
[System.IO.File]::WriteAllText($talent, $text, $utf8)

# 3) OrgNodeCard: evitar componente dinamico creado durante render.
$text = [System.IO.File]::ReadAllText($nodeCard)
if ($text -notmatch 'import \{ createElement \} from "react";') {
  $text = Replace-RegexOnce $text '(?m)^\} from "lucide-react";\r?\n' "} from \"lucide-react\";`r`nimport { createElement } from \"react\";`r`n" 'import createElement'
}
$text = Replace-RegexOnce $text '  const Icon = getIcon\(data\.icon, data\.area\);' '  const icon = createElement(getIcon(data.icon, data.area), { className: "h-4 w-4" });' 'dynamic Icon const'
$text = Replace-RegexOnce $text '            <Icon className="h-4 w-4" />' '            {icon}' 'dynamic Icon render'
[System.IO.File]::WriteAllText($nodeCard, $text, $utf8)

# Verificacion previa a npm.
$institutionalCheck = [System.IO.File]::ReadAllText($institutional)
$nodeCardCheck = [System.IO.File]::ReadAllText($nodeCard)
$talentCheck = [System.IO.File]::ReadAllText($talent)

$bad = @()
if ($institutionalCheck -match 'relationFilterLabel\(') { $bad += 'relationFilterLabel sigue presente' }
if ($institutionalCheck -match 'const nodeTypes:') { $bad += 'nodeTypes sigue presente' }
if ($institutionalCheck -match 'const edgeTypes =') { $bad += 'edgeTypes sigue presente' }
if ($institutionalCheck -match '\[query, setQuery\]') { $bad += 'setQuery sigue presente' }
if ($nodeCardCheck -notmatch 'createElement\(getIcon\(data\.icon, data\.area\)') { $bad += 'OrgNodeCard no usa createElement' }
if ($nodeCardCheck -match '<Icon className="h-4 w-4"') { $bad += 'OrgNodeCard conserva el componente dinamico' }
if ($talentCheck -match '(?m)^\s{2}MessageSquareText,') { $bad += 'MessageSquareText sigue importado' }
if ($talentCheck -match '(?m)^\s{2}ShieldCheck,') { $bad += 'ShieldCheck sigue importado' }

if ($bad.Count -gt 0) {
  throw ("V11.5 no paso la verificacion:`n- " + ($bad -join "`n- "))
}

Write-Host ''
Write-Host 'V11.5 aplicada correctamente.' -ForegroundColor Green
Write-Host 'Archivos modificados:'
Write-Host ' - InstitutionalOrgChartEditor.tsx (solo imports/codigo muerto)'
Write-Host ' - OrgNodeCard.tsx (icono compatible con React Compiler)'
Write-Host ' - TalentDashboard.tsx (imports muertos)'
Write-Host ''
Write-Host 'Ahora ejecuta:' -ForegroundColor Cyan
Write-Host ' npm run typecheck'
Write-Host ' npm run lint:new'
Write-Host ' npm run lint:core'
Write-Host ' npm run lint:editor-data'
Write-Host ' npm run lint'
Write-Host ' npm run test'
Write-Host ' npm run build'
