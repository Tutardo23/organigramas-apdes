import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.cwd();
const targetPath = path.join(
  projectRoot,
  "src",
  "components",
  "organigramas",
  "OrgChartCanvas.tsx",
);
const replacementPath = path.join(
  scriptDirectory,
  "..",
  "patches",
  "OrgChartCanvas.tsx",
);

function normalize(value) {
  return value.replace(/\r\n/g, "\n");
}

function hash(value) {
  return crypto.createHash("sha256").update(normalize(value)).digest("hex");
}

if (!fs.existsSync(targetPath)) {
  throw new Error(`No encontré el archivo esperado: ${targetPath}`);
}
if (!fs.existsSync(replacementPath)) {
  throw new Error(`No encontré el archivo corregido: ${replacementPath}`);
}

const current = fs.readFileSync(targetPath, "utf8");
const replacement = fs.readFileSync(replacementPath, "utf8");
const currentHash = hash(current);
const replacementHash = hash(replacement);

const expectedStep89Hash =
  "3a7166d23b39fbf8c0f6818f9fb23cbe8f1ab8cfba4cb91ea6517a7efb85e7f1";
const expectedStep1011Hash =
  "0f3e800a52882e109b326464a3c8e898375d48e7581eff83c7785459e2d2652d";

if (replacementHash !== expectedStep1011Hash) {
  throw new Error(
    "El archivo corregido del ZIP no coincide con la versión verificada. Volvé a descargar el ZIP.",
  );
}

if (currentHash === expectedStep1011Hash) {
  console.log("Los Pasos 10 y 11 ya estaban aplicados. No hice cambios.");
  process.exit(0);
}

if (currentHash !== expectedStep89Hash) {
  throw new Error(
    [
      "El OrgChartCanvas.tsx local no coincide con el final de los Pasos 8 y 9.",
      "Para no pisar cambios distintos, el script se detuvo sin modificar nada.",
      `Hash encontrado: ${currentHash}`,
    ].join("\n"),
  );
}

const backupPath = `${targetPath}.backup-pasos-8-9`;
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(targetPath, backupPath);
}

fs.writeFileSync(targetPath, normalize(replacement), "utf8");

const written = fs.readFileSync(targetPath, "utf8");
if (hash(written) !== expectedStep1011Hash) {
  fs.copyFileSync(backupPath, targetPath);
  throw new Error(
    "La verificación final falló. Restauré automáticamente el archivo anterior.",
  );
}

console.log("Pasos 10 y 11 aplicados correctamente:");
console.log("- detalle manual corregido sin perder la selección");
console.log("- Integra y Colabora visibles en el foco de navegación");
console.log("- navegación al superior, primer hijo y hermanos uno por uno");
console.log("- accesos directos a vínculos de Integra y Colabora");
console.log(`- respaldo: ${backupPath}`);
