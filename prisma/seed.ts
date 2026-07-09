import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const schools = [
    {
      name: "Pucará",
      slug: "pucara",
      city: "Yerba Buena",
      province: "Tucumán",
      chartId: "org-pucara-2026",
      chartTitle: "Organigrama Institucional Pucará 2026",
    },
    {
      name: "Los Cerros",
      slug: "los-cerros",
      city: "Yerba Buena",
      province: "Tucumán",
      chartId: "org-los-cerros-2026",
      chartTitle: "Organigrama Institucional Los Cerros 2026",
    },
  ];

  for (const item of schools) {
    const school = await prisma.school.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        city: item.city,
        province: item.province,
      },
      create: {
        name: item.name,
        slug: item.slug,
        city: item.city,
        province: item.province,
      },
    });

    const existingChart = await prisma.orgChart.findFirst({
      where: {
        schoolId: school.id,
        year: 2026,
      },
      select: {
        id: true,
      },
    });

    if (!existingChart) {
      await (prisma as any).orgChart.create({
        data: {
          id: item.chartId,
          schoolId: school.id,
          title: item.chartTitle,
          year: 2026,
          status: "DRAFT",
        },
      });
    }
  }

  console.log("Seed cargado correctamente");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
