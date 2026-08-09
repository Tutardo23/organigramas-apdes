import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}
function write(rel, content) {
  writeFileSync(resolve(root, rel), content, "utf8");
  console.log(`✔ actualizado ${rel}`);
}

// 1) OrgNodeCard: evitar crear un componente dinámico durante render.
const cardPath = "src/components/organigramas/OrgNodeCard.tsx";
if (existsSync(resolve(root, cardPath))) {
  let card = read(cardPath);
  if (!card.includes('import { createElement } from "react";')) {
    const marker = '} from "lucide-react";';
    if (!card.includes(marker)) throw new Error("No pude ubicar el import de lucide-react en OrgNodeCard.tsx");
    card = card.replace(marker, `${marker}\nimport { createElement } from "react";`);
  }
  card = card.replace(/\n\s*const Icon = getIcon\(data\.icon, data\.area\);/, "");
  if (card.includes('<Icon className="h-4 w-4" />')) {
    card = card.replace(
      '<Icon className="h-4 w-4" />',
      '{createElement(getIcon(data.icon, data.area), { className: "h-4 w-4" })}',
    );
  }
  if (card.includes("const Icon = getIcon(data.icon, data.area);")) {
    throw new Error("OrgNodeCard sigue creando Icon durante render.");
  }
  write(cardPath, card);
}

// 2) Talento: imports muertos.
const talentPath = "src/components/talento/TalentDashboard.tsx";
if (existsSync(resolve(root, talentPath))) {
  let talent = read(talentPath);
  talent = talent.replace(/^\s*MessageSquareText,\r?\n/m, "");
  talent = talent.replace(/^\s*ShieldCheck,\r?\n/m, "");
  write(talentPath, talent);
}

// 3) Scripts de control, sin pisar el resto del package.json.
const packagePath = resolve(root, "package.json");
const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
pkg.scripts ??= {};
pkg.scripts["guard:hito"] = "node scripts/check-hito-route.mjs";
pkg.scripts["guard:active-stack"] = "node scripts/check-active-orgchart-stack.mjs";
pkg.scripts.lint = "eslint src prisma scripts prisma.config.ts --max-warnings=0";

const checks = [
  "guard:hito",
  "guard:active-stack",
  "typecheck",
  "lint:new",
  "lint:core",
  "lint:editor-data",
  "lint",
  "test",
  "build",
].filter((name) => Boolean(pkg.scripts[name]));
pkg.scripts.check = checks.map((name) => `npm run ${name}`).join(" && ");
writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
console.log("✔ package.json actualizado sin perder scripts existentes");
