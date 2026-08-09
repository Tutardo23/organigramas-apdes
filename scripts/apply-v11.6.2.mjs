import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function mustExist(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`No existe ${rel}. Ejecutá este parche desde la raíz del proyecto.`);
  return file;
}

function updateFile(rel, transform) {
  const file = mustExist(rel);
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    console.log(`✔ actualizado ${rel}`);
  } else {
    console.log(`• sin cambios ${rel}`);
  }
  return after;
}

// 1) OrgNodeCard: no crear un componente Lucide dinámico durante render.
updateFile('src/components/organigramas/OrgNodeCard.tsx', (source) => {
  let s = source;
  if (!s.includes('createElement(getIcon(data.icon, data.area)')) {
    s = s.replace(/\n\s*const Icon = getIcon\(data\.icon, data\.area\);/, '');
    s = s.replace(
      /<Icon className="h-4 w-4" \/>/,
      '{createElement(getIcon(data.icon, data.area), { className: "h-4 w-4" })}',
    );
  }
  if (s.includes('createElement(getIcon(data.icon, data.area)') && !/from "react";/.test(s)) {
    const marker = 'import { isCollectiveGovernanceNode } from "../../lib/org-chart-template";';
    if (!s.includes(marker)) throw new Error('No pude ubicar el import de org-chart-template en OrgNodeCard.tsx.');
    s = s.replace(marker, 'import { createElement } from "react";\n' + marker);
  } else if (s.includes('createElement(getIcon(data.icon, data.area)') && /from "react";/.test(s) && !/createElement/.test(s.split('from "react";')[0].split('\n').slice(-2).join('\n'))) {
    // Si ya hubiera un import React distinto, no arriesgamos reescribirlo: agregamos uno específico.
    const marker = 'import { isCollectiveGovernanceNode } from "../../lib/org-chart-template";';
    if (!s.includes('import { createElement } from "react";')) {
      s = s.replace(marker, 'import { createElement } from "react";\n' + marker);
    }
  }
  return s;
});

// 2) Talento: imports realmente muertos.
updateFile('src/components/talento/TalentDashboard.tsx', (source) =>
  source
    .replace(/^\s*MessageSquareText,\r?\n/m, '')
    .replace(/^\s*ShieldCheck,\r?\n/m, ''),
);

// 3) Editor institucional viejo: solo basura muerta segura. No tocamos effects/refs/layout.
updateFile('src/components/organigramas/InstitutionalOrgChartEditor.tsx', (source) => {
  let s = source;
  for (const name of ['Background', 'BackgroundVariant', 'Controls', 'ReactFlow']) {
    s = s.replace(new RegExp(`^\\s*${name},\\r?\\n`, 'm'), '');
  }
  for (const name of ['GitBranch', 'Route', 'Search']) {
    s = s.replace(new RegExp(`^\\s*${name},\\r?\\n`, 'm'), '');
  }
  s = s.replace(/^\s*type NodeTypes,\r?\n/m, '');
  s = s.replace(/\nfunction relationFilterLabel\(filter: RelationFilter\) \{[\s\S]*?\n\}\n(?=\nfunction normalize)/, '\n');
  s = s.replace(/\nconst nodeTypes: NodeTypes = \{[\s\S]*?\n\};\n\nconst edgeTypes = \{[\s\S]*?\n\};\n/, '\n');
  s = s.replace('const [query, setQuery] = useState("");', 'const [query] = useState("");');
  return s;
});

// 4) Copiar/actualizar guard HITO desde el paquete.
const patchDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const bundledGuard = path.join(patchDir, 'check-hito-route.mjs');
const targetGuard = path.join(root, 'scripts/check-hito-route.mjs');
fs.mkdirSync(path.dirname(targetGuard), { recursive: true });
fs.copyFileSync(bundledGuard, targetGuard);
console.log('✔ instalado scripts/check-hito-route.mjs');

// 5) package.json: preservar todo lo local y agregar scripts faltantes.
const packagePath = mustExist('package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.scripts ??= {};
pkg.scripts['guard:hito'] = 'node scripts/check-hito-route.mjs';
pkg.scripts['lint:ui-safe'] = 'eslint "src/components/organigramas/OrgNodeCard.tsx" "src/components/talento/TalentDashboard.tsx" --max-warnings=0';

const existingCheck = typeof pkg.scripts.check === 'string' ? pkg.scripts.check : '';
if (existingCheck) {
  let check = existingCheck
    .replace(/^npm run guard:hito\s*&&\s*/, '')
    .replace(/^npm run lint:ui-safe\s*&&\s*/, '');
  pkg.scripts.check = `npm run guard:hito && npm run lint:ui-safe && ${check}`;
} else {
  const parts = ['npm run guard:hito', 'npm run lint:ui-safe'];
  if (pkg.scripts.typecheck) parts.push('npm run typecheck');
  if (pkg.scripts['lint:new']) parts.push('npm run lint:new');
  if (pkg.scripts['lint:core']) parts.push('npm run lint:core');
  if (pkg.scripts['lint:editor-data']) parts.push('npm run lint:editor-data');
  if (pkg.scripts.lint) parts.push('npm run lint');
  if (pkg.scripts.test) parts.push('npm run test');
  if (pkg.scripts.build) parts.push('npm run build');
  pkg.scripts.check = parts.join(' && ');
}
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('✔ package.json conserva tus scripts y agrega guard:hito + lint:ui-safe');

// Verificaciones explícitas del parche.
const pkgAfter = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (!pkgAfter.scripts?.['guard:hito']) throw new Error('guard:hito no quedó escrito en package.json');
const card = fs.readFileSync(mustExist('src/components/organigramas/OrgNodeCard.tsx'), 'utf8');
if (/const Icon = getIcon\(data\.icon, data\.area\)/.test(card) || /<Icon className="h-4 w-4"/.test(card)) {
  throw new Error('OrgNodeCard todavía conserva el patrón que React Compiler marcaba.');
}
const talent = fs.readFileSync(mustExist('src/components/talento/TalentDashboard.tsx'), 'utf8');
if (/\bMessageSquareText\b/.test(talent.split('export function')[0]) || /\bShieldCheck\b/.test(talent.split('export function')[0])) {
  throw new Error('TalentDashboard todavía conserva imports muertos.');
}
console.log('\nV11.6.2 aplicada y verificada. Ahora ejecutando guard HITO...');

// Ejecutar el guard al final usando import dinámico para heredar su exit code.
await import(pathToFileURL(targetGuard).href);

function pathToFileURL(filePath) {
  const resolved = path.resolve(filePath).replace(/\\/g, '/');
  return new URL(`file:///${resolved.replace(/^\//, '')}`);
}
