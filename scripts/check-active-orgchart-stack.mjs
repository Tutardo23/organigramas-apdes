import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const legacyInSrc = [
  "src/components/organigramas/InstitutionalOrgChartEditor.tsx",
  "src/components/organigramas/OrgChartCanvas.tsx",
  "src/components/organigramas/OrgChartEditor.tsx",
  "src/components/organigramas/LegacyOrgChartCanvas.tsx",
];

let failed = false;
function check(condition, message) {
  if (condition) console.log(`✔ ${message}`);
  else {
    failed = true;
    console.error(`✘ ${message}`);
  }
}

for (const file of legacyInSrc) {
  check(!existsSync(resolve(root, file)), `${file} salió del stack activo`);
}

const explorePath = resolve(
  root,
  "src/app/organigramas/[schoolSlug]/explorar/page.tsx",
);
const explore = readFileSync(explorePath, "utf8");
check(
  explore.includes("redirect(") &&
    explore.includes("/organigramas/${schoolSlug}") &&
    !explore.includes("OrgChartCanvas"),
  "/explorar redirige a HITO y ya no carga el canvas viejo",
);

if (failed) {
  console.error("\nGuard stack activo: FALLO.");
  process.exit(1);
}

console.log("\nGuard stack activo: OK. Solo HITO queda como experiencia activa.");
