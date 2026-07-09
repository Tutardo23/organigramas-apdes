import "dotenv/config";

import {
  EdgeType,
  NodeArea,
  OrgChartStatus,
  PrismaClient,
} from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

type SeedNode = {
  id: string;
  title: string;
  area: NodeArea;
  formalRole: string;
  realFunction: string;
  x: number;
  y: number;
  color: string;
  order: number;
};

const baseNodes: SeedNode[] = [
  {
    id: "consejo",
    title: "Consejo de Dirección",
    area: NodeArea.DIRECCION,
    formalRole: "Órgano de conducción institucional",
    realFunction: "Define criterios, prioridades y acompañamiento general del colegio.",
    x: 760,
    y: 0,
    color: "#1d4ed8",
    order: 1,
  },
  {
    id: "direccion",
    title: "Dirección General",
    area: NodeArea.DIRECCION,
    formalRole: "Dirección del colegio",
    realFunction: "Articula la vida institucional, coordina equipos y toma decisiones centrales.",
    x: 760,
    y: 210,
    color: "#2563eb",
    order: 2,
  },
  {
    id: "academica",
    title: "Área Académica",
    area: NodeArea.ACADEMICA,
    formalRole: "Coordinación académica",
    realFunction: "Acompaña la planificación, evaluación y mejora de los procesos de enseñanza.",
    x: 0,
    y: 470,
    color: "#0f766e",
    order: 3,
  },
  {
    id: "formacion",
    title: "Formación Integral",
    area: NodeArea.FORMACION,
    formalRole: "Coordinación de formación",
    realFunction: "Acompaña la formación humana, espiritual y tutorial de alumnos y docentes.",
    x: 380,
    y: 470,
    color: "#7c3aed",
    order: 4,
  },
  {
    id: "familia",
    title: "Familia",
    area: NodeArea.FAMILIA,
    formalRole: "Área de familia",
    realFunction: "Fortalece el vínculo con las familias y acompaña procesos de encuentro y feedback.",
    x: 760,
    y: 470,
    color: "#d97706",
    order: 5,
  },
  {
    id: "comunicacion",
    title: "Comunicación",
    area: NodeArea.COMUNICACION,
    formalRole: "Comunicación institucional",
    realFunction: "Cuida la comunicación interna y externa para sostener claridad y cultura institucional.",
    x: 1140,
    y: 470,
    color: "#0284c7",
    order: 6,
  },
  {
    id: "postulaciones",
    title: "Postulaciones",
    area: NodeArea.POSTULACIONES,
    formalRole: "Área de admisiones",
    realFunction: "Acompaña el ingreso de nuevas familias y la experiencia inicial con el colegio.",
    x: 1520,
    y: 470,
    color: "#be123c",
    order: 7,
  },
  {
    id: "operaciones",
    title: "Operaciones",
    area: NodeArea.OPERACIONES,
    formalRole: "Gestión operativa",
    realFunction: "Sostiene la organización cotidiana, recursos, procesos y funcionamiento general.",
    x: 380,
    y: 760,
    color: "#475569",
    order: 8,
  },
  {
    id: "tutorias",
    title: "Tutorías",
    area: NodeArea.TUTORIA,
    formalRole: "Equipo tutorial",
    realFunction: "Acompaña personalmente a los alumnos y articula con familias y docentes.",
    x: 760,
    y: 760,
    color: "#9333ea",
    order: 9,
  },
  {
    id: "administracion",
    title: "Administración",
    area: NodeArea.ADMINISTRACION,
    formalRole: "Administración escolar",
    realFunction: "Ordena información, circuitos administrativos y soporte al funcionamiento institucional.",
    x: 1140,
    y: 760,
    color: "#334155",
    order: 10,
  },
];

async function seedChartNodes(orgChartId: string, prefix: string) {
  await prisma.orgEdge.deleteMany({ where: { orgChartId } });
  await prisma.orgNode.deleteMany({ where: { orgChartId } });

  await prisma.orgNode.createMany({
    data: baseNodes.map((node) => ({
      id: `${prefix}-${node.id}`,
      orgChartId,
      title: node.title,
      area: node.area,
      formalRole: node.formalRole,
      realFunction: node.realFunction,
      positionX: node.x,
      positionY: node.y,
      color: node.color,
      order: node.order,
    })),
  });

  await prisma.orgEdge.createMany({
    data: [
      {
        id: `${prefix}-edge-consejo-direccion`,
        orgChartId,
        sourceId: `${prefix}-consejo`,
        targetId: `${prefix}-direccion`,
        type: EdgeType.JERARQUICA,
      },
      ...["academica", "formacion", "familia", "comunicacion", "postulaciones", "operaciones", "administracion"].map((target) => ({
        id: `${prefix}-edge-direccion-${target}`,
        orgChartId,
        sourceId: `${prefix}-direccion`,
        targetId: `${prefix}-${target}`,
        type: EdgeType.JERARQUICA,
      })),
      {
        id: `${prefix}-edge-formacion-tutorias`,
        orgChartId,
        sourceId: `${prefix}-formacion`,
        targetId: `${prefix}-tutorias`,
        type: EdgeType.JERARQUICA,
      },
      {
        id: `${prefix}-edge-familia-comunicacion`,
        orgChartId,
        sourceId: `${prefix}-familia`,
        targetId: `${prefix}-comunicacion`,
        type: EdgeType.TRANSVERSAL,
        label: "articulación",
      },
      {
        id: `${prefix}-edge-comunicacion-postulaciones`,
        orgChartId,
        sourceId: `${prefix}-comunicacion`,
        targetId: `${prefix}-postulaciones`,
        type: EdgeType.TRANSVERSAL,
        label: "experiencia familias",
      },
      {
        id: `${prefix}-edge-formacion-familia`,
        orgChartId,
        sourceId: `${prefix}-formacion`,
        targetId: `${prefix}-familia`,
        type: EdgeType.ACOMPANAMIENTO,
        label: "acompañamiento",
      },
      {
        id: `${prefix}-edge-academica-tutorias`,
        orgChartId,
        sourceId: `${prefix}-academica`,
        targetId: `${prefix}-tutorias`,
        type: EdgeType.ACOMPANAMIENTO,
        label: "seguimiento",
      },
    ],
  });
}

async function main() {
  const pucara = await prisma.school.upsert({
    where: { slug: "pucara" },
    update: {},
    create: {
      name: "Pucará",
      slug: "pucara",
      city: "Yerba Buena",
      province: "Tucumán",
    },
  });

  const losCerros = await prisma.school.upsert({
    where: { slug: "los-cerros" },
    update: {},
    create: {
      name: "Los Cerros",
      slug: "los-cerros",
      city: "Yerba Buena",
      province: "Tucumán",
    },
  });

  const pucaraChart = await prisma.orgChart.upsert({
    where: { id: "org-pucara-2026" },
    update: {},
    create: {
      id: "org-pucara-2026",
      schoolId: pucara.id,
      title: "Organigrama Institucional Pucará 2026",
      year: 2026,
      status: OrgChartStatus.DRAFT,
    },
  });

  const losCerrosChart = await prisma.orgChart.upsert({
    where: { id: "org-los-cerros-2026" },
    update: {},
    create: {
      id: "org-los-cerros-2026",
      schoolId: losCerros.id,
      title: "Organigrama Institucional Los Cerros 2026",
      year: 2026,
      status: OrgChartStatus.DRAFT,
    },
  });

  await seedChartNodes(pucaraChart.id, "pucara");
  await seedChartNodes(losCerrosChart.id, "los-cerros");

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
