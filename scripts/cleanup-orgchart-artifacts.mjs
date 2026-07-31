import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const canonical = path.normalize(
  path.join("src", "components", "organigramas", "OrgChartCanvas.tsx"),
);
const ignoredDirectories = new Set([
  "node_modules",
  ".git",
  ".next",
  ".vercel",
]);
const renamed = [];

function isTemporaryCopy(relativePath, fileName) {
  const normalizedRelative = relativePath.replaceAll("\\", "/").toLowerCase();
  const normalizedName = fileName.toLowerCase();

  if (!normalizedName.includes("orgchartcanvas")) return false;

  return (
    normalizedRelative.startsWith("backups/") ||
    normalizedRelative.includes("/backups/") ||
    normalizedRelative.startsWith("patches/") ||
    normalizedRelative.includes("/patches/") ||
    normalizedRelative.includes("organigramas-apdes-paso") ||
    normalizedRelative.includes("organigramas-apdes-pasos") ||
    normalizedName.includes("backup") ||
    normalizedName.includes("pasos-") ||
    normalizedName.includes("estable")
  );
}

async function nextDestination(absolutePath) {
  let destination = `${absolutePath}.bak`;
  let suffix = 1;

  while (true) {
    try {
      await fs.access(destination);
      destination = `${absolutePath}.bak-${suffix}`;
      suffix += 1;
    } catch {
      return destination;
    }
  }
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;

    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.normalize(path.relative(root, absolutePath));

    if (entry.isDirectory()) {
      await walk(absolutePath);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!/\.tsx?$/i.test(entry.name)) continue;
    if (relativePath === canonical) continue;
    if (!isTemporaryCopy(relativePath, entry.name)) continue;

    const destination = await nextDestination(absolutePath);
    await fs.rename(absolutePath, destination);
    renamed.push({
      from: relativePath,
      to: path.relative(root, destination),
    });
  }
}

await walk(root);

if (renamed.length === 0) {
  console.log("No se encontraron copias temporales de OrgChartCanvas dentro del proyecto.");
} else {
  console.log("Copias temporales excluidas del build:");
  for (const item of renamed) {
    console.log(`- ${item.from} -> ${item.to}`);
  }
}
