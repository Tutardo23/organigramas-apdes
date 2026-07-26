import "dotenv/config";

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const levels = [
  {
    direction: "Dirección de Nivel Inicial",
    vice: "Vicedirección de Nivel Inicial",
    team: "Equipo Directivo Nivel Inicial",
  },
  {
    direction: "Dirección de Nivel Primario",
    vice: "Vicedirección de Nivel Primario",
    team: "Equipo Directivo Nivel Primario",
  },
  {
    direction: "Dirección de Nivel Secundario",
    vice: "Vicedirección de Nivel Secundario",
    team: "Equipo Directivo Nivel Secundario",
  },
] as const;

async function main() {
  const school = await prisma.school.findFirst({
    where: {
      OR: [
        { slug: "colegio-el-buen-ayre" },
        { slug: "el-buen-ayre" },
        { name: { equals: "Colegio El Buen Ayre", mode: "insensitive" } },
        { name: { equals: "El Buen Ayre", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });

  if (!school) {
    throw new Error("No se encontró Colegio El Buen Ayre.");
  }

  const chart =
    (await prisma.orgChart.findFirst({
      where: {
        schoolId: school.id,
        title: { contains: "Nueva propuesta", mode: "insensitive" },
      },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true },
    })) ??
    (await prisma.orgChart.findFirst({
      where: { schoolId: school.id },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true },
    }));

  if (!chart) {
    throw new Error("El Buen Ayre todavía no tiene un organigrama para corregir.");
  }

  const requiredTitles = [
    ...levels.flatMap((level) => [
      level.direction,
      level.vice,
      level.team,
    ]),
    "Consejo Académico",
    "Comité de Admisiones",
  ];
  const nodes = await prisma.orgNode.findMany({
    where: {
      orgChartId: chart.id,
      title: { in: requiredTitles },
    },
    select: { id: true, title: true },
  });
  const nodeByTitle = new Map(nodes.map((node) => [node.title, node]));
  const missing = requiredTitles.filter((title) => !nodeByTitle.has(title));

  if (missing.length > 0) {
    throw new Error(`Faltan casilleros en el organigrama: ${missing.join(", ")}.`);
  }

  const councilId = nodeByTitle.get("Consejo Académico")!.id;
  const admissionsId = nodeByTitle.get("Comité de Admisiones")!.id;

  await prisma.$transaction(
    async (tx) => {
      for (const [index, level] of levels.entries()) {
        const directionId = nodeByTitle.get(level.direction)!.id;
        const viceId = nodeByTitle.get(level.vice)!.id;
        const teamId = nodeByTitle.get(level.team)!.id;
        const relatedIds = [directionId, viceId, teamId];
        const collectiveIds = [teamId, councilId, admissionsId];

        await tx.orgEdge.deleteMany({
          where: {
            orgChartId: chart.id,
            type: "DECISION",
            OR: [
              {
                sourceId: { in: relatedIds },
                targetId: { in: collectiveIds },
              },
              {
                sourceId: { in: collectiveIds },
                targetId: { in: relatedIds },
              },
            ],
          },
        });

        await tx.orgNode.update({
          where: { id: teamId },
          data: { positionY: 1255 },
        });

        await tx.orgEdge.createMany({
          data: [
            {
              orgChartId: chart.id,
              sourceId: directionId,
              targetId: teamId,
              type: "DECISION",
              label: "Integra",
            },
            {
              orgChartId: chart.id,
              sourceId: viceId,
              targetId: teamId,
              type: "DECISION",
              label: "Integra",
            },
            {
              orgChartId: chart.id,
              sourceId: teamId,
              targetId: councilId,
              type: "DECISION",
              label: "Integra",
            },
            {
              orgChartId: chart.id,
              sourceId: teamId,
              targetId: admissionsId,
              type: "DECISION",
              label: "Integra",
            },
          ],
        });

        // Evita que los tres equipos queden exactamente sobre la misma línea
        // horizontal si el colegio los reordenó manualmente.
        await tx.orgNode.update({
          where: { id: teamId },
          data: { order: 30 + index },
        });
      }
    },
    { maxWait: 15_000, timeout: 60_000 },
  );

  console.log(
    `Relaciones corregidas en "${chart.title}". Los tres Equipos Directivos integran el Consejo Académico y el Comité de Admisiones; cada Dirección y Vicedirección integra su Equipo Directivo.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
