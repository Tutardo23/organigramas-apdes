import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const canonical = path.normalize(
  path.join("src", "components", "organigramas", "OrgChartCanvas.tsx"),
);
const ignoredDirectories = new Set(["node_modules", ".git", ".next", ".vercel"]);
const renamed = [];

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

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".tsx")) continue;
    if (relativePath === canonical) continue;

    const normalizedRelative = relativePath.replaceAll("\\", "/").toLowerCase();
    const normalizedName = entry.name.toLowerCase();
    const isOrgChartBackup =
      normalizedName.includes("orgchartcanvas") &&
      (normalizedRelative.startsWith("backups/") ||
        normalizedRelative.includes("/backups/") ||
        normalizedName.includes("backup") ||
        normalizedName.includes("pasos-") ||
        normalizedName.includes("estable"));

    if (!isOrgChartBackup) continue;

    let destination = `${absolutePath}.bak`;
    let suffix = 1;
    while (true) {
      try {
        await fs.access(destination);
        destination = `${absolutePath}.bak-${suffix}`;
        suffix += 1;
      } catch {
        break;
      }
    }

    await fs.rename(absolutePath, destination);
    renamed.push({
      from: relativePath,
      to: path.relative(root, destination),
    });
  }
}

await walk(root);

if (renamed.length === 0) {
  console.log("No se encontraron copias .tsx de OrgChartCanvas que interfieran con el build.");
} else {
  console.log("Copias de seguridad excluidas del build:");
  for (const item of renamed) {
    console.log(`- ${item.from} -> ${item.to}`);
  }
}
