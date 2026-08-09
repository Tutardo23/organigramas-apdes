import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta DATABASE_URL. Configurá la conexión de Neon en el archivo .env.");
}

function warnAboutNeonConnection(url: string) {
  if (process.env.NODE_ENV === "production") return;

  try {
    const parsed = new URL(url);
    const isNeon = parsed.hostname.endsWith(".neon.tech");
    const isPooled = parsed.hostname.includes("-pooler.");

    if (isNeon && !isPooled) {
      console.warn(
        "[Prisma/Neon] DATABASE_URL está usando el host directo. Para la app conviene usar la URL pooled de Neon (hostname con -pooler). Dejá la URL directa en DIRECT_URL para Prisma CLI/migraciones.",
      );
    }
  } catch {
    console.warn("[Prisma/Neon] DATABASE_URL no tiene un formato de URL válido.");
  }
}

function createPrismaClient() {
  warnAboutNeonConnection(connectionString!);

  const adapter = new PrismaNeon({
    connectionString: connectionString!,
  });

  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
