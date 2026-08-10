import { execFileSync } from "node:child_process";

const forbidden = [
  /^backups\//,
  /^patches\//,
  /^legacy\/organigramas\/pre-v12\//,
  /^v\d+(?:\.\d+)*-payload\//,
  /^organigramas-apdes-v/i,
  /^README-V\d/i,
  /^apply-v.*\.ps1$/i,
  /^rollback-v.*\.ps1$/i,
  /^verify-v.*\.ps1$/i,
  /^INSTALAR\.ps1$/i,
  /backup.*\.bak$/i,
  /\.patch$/i,
  /^scripts\/apply-step/i,
  /^scripts\/apply-steps/i,
  /^scripts\/apply-v/i,
  /^scripts\/cleanup-orgchart-(?:artifacts|backups)\.mjs$/i,
];

const output = execFileSync("git", ["ls-files"], {
  encoding: "utf8",
  windowsHide: true,
});

const tracked = output.split(/\r?\n/).filter(Boolean);
const bad = tracked.filter((file) => forbidden.some((rule) => rule.test(file)));

if (bad.length > 0) {
  console.error("Guard release: FALLO. Hay artefactos historicos trackeados:");
  for (const file of bad) console.error(" -", file);
  process.exit(1);
}

console.log("Guard release: OK. No hay backups, payloads ni instaladores historicos en el release.");
