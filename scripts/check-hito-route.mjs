import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(relativePath) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

let failed = false;
function assert(condition, message) {
  if (!condition) {
    failed = true;
    console.error(`✘ ${message}`);
  } else {
    console.log(`✔ ${message}`);
  }
}

const main = read("src/app/organigramas/[schoolSlug]/page.tsx");
const edit = read("src/app/organigramas/[schoolSlug]/editar/page.tsx");
const legacyPucara = read("src/app/organigramas/[schoolSlug]/pucara/page.tsx");
const hito = read("src/components/organigramas/PucaraOrgChart.tsx");

assert(
  main.includes("PucaraOrgChart"),
  "la ruta principal usa PucaraOrgChart/HITO",
);
assert(
  !main.includes("<OrgChartCanvas") &&
    !main.includes('from "../../../components/organigramas/OrgChartCanvas"'),
  "la ruta principal no vuelve al canvas institucional viejo",
);

// La ruta traduce ?modo=editar al initialMode real del componente HITO.
const routeWiresEditMode =
  /initialMode\s*=\s*modeParam\s*===\s*["']editar["']\s*\?\s*["']edit["']\s*:\s*["']view["']/.test(main) &&
  /initialMode\s*=\s*\{\s*initialMode\s*\}/.test(main);
assert(
  routeWiresEditMode,
  "la ruta principal conecta ?modo=editar con initialMode de HITO",
);

// El componente debe conservar un único estado view/edit y los dos controles visibles.
const componentUsesInitialMode =
  /useState<Mode>\(props\.initialMode\s*===\s*["']edit["']\s*\?\s*["']edit["']\s*:\s*["']view["']\)/.test(hito);
const hasViewControl =
  /changeMode\(["']view["']\)/.test(hito) && />\s*Ver\s*</.test(hito);
const hasEditControl =
  /changeMode\(["']edit["']\)/.test(hito) && />\s*Editar\s*</.test(hito);
assert(
  componentUsesInitialMode && hasViewControl && hasEditControl,
  "la misma experiencia HITO conserva Ver/Editar",
);

assert(
  edit.includes("redirect(") && edit.includes('query.set("modo", "editar")'),
  "/editar redirige al HITO principal en modo editar",
);
assert(
  legacyPucara.includes("redirect(") &&
    legacyPucara.includes("/organigramas/${schoolSlug}"),
  "/pucara queda como ruta de compatibilidad",
);

if (failed) {
  console.error(
    "\nGuard HITO: FALLO. No publiques esta version hasta restaurar la experiencia principal.",
  );
  process.exit(1);
}

console.log("\nGuard HITO: OK. La experiencia principal Ver/Editar sigue protegida.");
