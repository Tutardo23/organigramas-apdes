import "dotenv/config";
import { defineConfig } from "prisma/config";

const cliDatabaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!cliDatabaseUrl) {
  throw new Error("Falta DIRECT_URL o DATABASE_URL para Prisma CLI.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI/migraciones: preferimos la conexión directa.
    // La app en runtime sigue usando DATABASE_URL (pooled) desde src/lib/prisma.ts.
    url: cliDatabaseUrl,
  },
});
