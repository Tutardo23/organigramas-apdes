import "dotenv/config";

function inspect(name, value) {
  if (!value) {
    console.log(`${name}: FALTA`);
    return;
  }

  try {
    const url = new URL(value);
    const safeHost = url.hostname;
    const pooled = safeHost.includes("-pooler.");
    console.log(`${name}: ${safeHost}`);
    console.log(`  pooled: ${pooled ? "SI" : "NO"}`);
    console.log(`  sslmode: ${url.searchParams.get("sslmode") ?? "no definido"}`);
    console.log(`  connect_timeout: ${url.searchParams.get("connect_timeout") ?? "no definido"}`);
    console.log(`  pool_timeout: ${url.searchParams.get("pool_timeout") ?? "no definido"}`);
  } catch {
    console.log(`${name}: URL inválida`);
  }
}

console.log("Chequeo de configuración Prisma + Neon (sin mostrar usuario ni contraseña)\n");
inspect("DATABASE_URL (runtime)", process.env.DATABASE_URL);
console.log("");
inspect("DIRECT_URL (CLI/migraciones)", process.env.DIRECT_URL);
console.log("\nEsperado: DATABASE_URL pooled (-pooler) y DIRECT_URL directa (sin -pooler).\n");
