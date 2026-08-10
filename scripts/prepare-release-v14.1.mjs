import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(root, "package.json");
const gitignorePath = path.join(root, ".gitignore");
const readmePath = path.join(root, "README.md");
const guardPath = path.join(root, "scripts", "check-release-clean.mjs");

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
pkg.scripts ??= {};
pkg.scripts["guard:release"] = "node scripts/check-release-clean.mjs";

const currentCheck = pkg.scripts.check ?? "";
if (currentCheck) {
  const withoutRelease = currentCheck
    .replaceAll("npm run guard:release && ", "")
    .replaceAll(" && npm run guard:release", "");
  if (withoutRelease.includes("npm run guard:active-stack")) {
    pkg.scripts.check = withoutRelease.replace(
      "npm run guard:active-stack",
      "npm run guard:active-stack && npm run guard:release",
    );
  } else {
    pkg.scripts.check = `npm run guard:release && ${withoutRelease}`;
  }
}

fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n", "utf8");

const ignoreBlock = `
# Local release/version artifacts - keep on disk, never commit
/organigramas-apdes-v*/
/backups/
/patches/
/legacy/organigramas/pre-v12/
/v*-payload/
/README-V*.md
/apply-v*.ps1
/rollback-v*.ps1
/verify-v*.ps1
/INSTALAR.ps1
/*.patch
/*backup*.bak
/*.bak

# Historical one-off migration scripts
/scripts/apply-step-*.mjs
/scripts/apply-steps-*.mjs
/scripts/apply-v*.mjs
/scripts/cleanup-orgchart-artifacts.mjs
/scripts/cleanup-orgchart-backups.mjs
`;

let gitignore = fs.existsSync(gitignorePath)
  ? fs.readFileSync(gitignorePath, "utf8")
  : "";

if (!gitignore.includes("# Local release/version artifacts - keep on disk, never commit")) {
  gitignore = gitignore.trimEnd() + "\n" + ignoreBlock;
}
fs.writeFileSync(gitignorePath, gitignore.trimEnd() + "\n", "utf8");

const readme = `# Organigramas APDES

Plataforma web para crear, visualizar y editar organigramas institucionales de colegios APDES.

## Experiencia principal

El sistema utiliza **HITO / PucaraOrgChart** como experiencia unica del organigrama:

- modo **Ver** con navegacion progresiva;
- modo **Editar** sobre la misma estructura;
- dependencias jerarquicas;
- relaciones **Integra / Colabora / Todas**;
- personas y equipos por funcion;
- posiciones persistentes;
- soporte para Pucara, El Buen Ayre y nuevos colegios;
- editor guiado para usuarios no tecnicos.

El stack institucional anterior fue retirado del codigo activo.

## Stack

- Next.js 16 con App Router
- TypeScript
- React 19
- Tailwind CSS
- Prisma + Neon PostgreSQL
- Clerk
- XYFlow / React Flow

## Desarrollo

\`\`\`powershell
npm install
npm run dev
\`\`\`

Aplicacion local:

\`\`\`text
http://localhost:3000
\`\`\`

## Controles antes de publicar

\`\`\`powershell
npm run check
\`\`\`

El control completo incluye:

- proteccion de la ruta HITO;
- validacion del stack activo;
- limpieza del release;
- TypeScript;
- ESLint con 0 warnings;
- tests;
- build de produccion.

Tambien pueden ejecutarse individualmente:

\`\`\`powershell
npm run guard:hito
npm run guard:active-stack
npm run guard:release
npm run typecheck
npm run lint
npm run test
npm run build
\`\`\`

## Flujo Git

La rama estable es \`main\`.

Los cambios grandes se desarrollan en ramas \`feature/*\`, se validan con \`npm run check\` y luego se integran mediante Pull Request.

## Proxima etapa

El siguiente modulo sera un **asistente guiado de creacion de organigramas** para acelerar la carga de decenas de colegios sin exigir conocimientos tecnicos.
`;

fs.writeFileSync(readmePath, readme, "utf8");

const guard = `import { execFileSync } from "node:child_process";

const forbidden = [
  /^backups\\//,
  /^patches\\//,
  /^legacy\\/organigramas\\/pre-v12\\//,
  /^v\\d+(?:\\.\\d+)*-payload\\//,
  /^organigramas-apdes-v/i,
  /^README-V\\d/i,
  /^apply-v.*\\.ps1$/i,
  /^rollback-v.*\\.ps1$/i,
  /^verify-v.*\\.ps1$/i,
  /^INSTALAR\\.ps1$/i,
  /backup.*\\.bak$/i,
  /\\.patch$/i,
  /^scripts\\/apply-step/i,
  /^scripts\\/apply-steps/i,
  /^scripts\\/apply-v/i,
  /^scripts\\/cleanup-orgchart-(?:artifacts|backups)\\.mjs$/i,
];

const output = execFileSync("git", ["ls-files"], {
  encoding: "utf8",
  windowsHide: true,
});

const tracked = output.split(/\\r?\\n/).filter(Boolean);
const bad = tracked.filter((file) => forbidden.some((rule) => rule.test(file)));

if (bad.length > 0) {
  console.error("Guard release: FALLO. Hay artefactos historicos trackeados:");
  for (const file of bad) console.error(" -", file);
  process.exit(1);
}

console.log("Guard release: OK. No hay backups, payloads ni instaladores historicos en el release.");
`;

fs.writeFileSync(guardPath, guard, "utf8");

console.log("Release metadata preparado:");
console.log(" - package.json -> guard:release");
console.log(" - .gitignore -> artefactos locales ignorados");
console.log(" - README.md -> documentacion del proyecto");
console.log(" - scripts/check-release-clean.mjs -> guard antibasura");
