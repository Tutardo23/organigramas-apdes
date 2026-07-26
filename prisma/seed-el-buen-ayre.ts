import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type Area =
  | "DIRECCION"
  | "ACADEMICA"
  | "FORMACION"
  | "FAMILIA"
  | "COMUNICACION"
  | "POSTULACIONES"
  | "OPERACIONES"
  | "ADMINISTRACION"
  | "TUTORIA"
  | "CAPELLANIA"
  | "OTRO";

type EdgeType =
  | "JERARQUICA"
  | "TRANSVERSAL"
  | "COLABORACION"
  | "ACOMPANAMIENTO"
  | "DECISION"
  | "INFORMACION";

type NodeDefinition = {
  key: string;
  title: string;
  area: Area;
  formalRole?: string;
  realFunction?: string;
  description?: string;
  x: number;
  y: number;
  color: string;
  icon: string;
};

type EdgeDefinition = {
  key: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
};

const BLUE = "#2563eb";
const GREEN = "#15803d";
const RED = "#dc2626";
const GRAY = "#64748b";

const areaNode = (
  key: string,
  title: string,
  area: Area,
  x: number,
): NodeDefinition => ({
  key,
  title,
  area,
  formalRole: "Área institucional",
  realFunction: `Articular y dar unidad a las funciones que integran ${title.toLowerCase()}.`,
  x,
  y: 600,
  color: BLUE,
  icon: "layers",
});

const roleNode = (
  key: string,
  title: string,
  area: Area,
  x: number,
  y: number,
  realFunction: string,
  options?: { color?: string; icon?: string; formalRole?: string; description?: string },
): NodeDefinition => ({
  key,
  title,
  area,
  formalRole: options?.formalRole ?? title,
  realFunction,
  description: options?.description,
  x,
  y,
  color: options?.color ?? GREEN,
  icon: options?.icon ?? "user",
});

const teamNode = (
  key: string,
  title: string,
  area: Area,
  x: number,
  y: number,
  realFunction: string,
): NodeDefinition =>
  roleNode(key, title, area, x, y, realFunction, {
    color: GRAY,
    icon: "users",
    formalRole: "Equipo",
  });

const nodes: NodeDefinition[] = [
  roleNode(
    "directora-general",
    "Directora General",
    "DIRECCION",
    2230,
    0,
    "Presidir el Consejo de Dirección, cuidar la unidad del proyecto institucional y articular la implementación de sus decisiones.",
    { icon: "landmark" },
  ),
  roleNode(
    "consejo-direccion",
    "Consejo de Dirección",
    "DIRECCION",
    2230,
    260,
    "Gobernar el colegio de manera colegiada, definir prioridades y sostener criterios compartidos para la toma de decisiones.",
    {
      color: RED,
      icon: "users",
      formalRole: "Órgano de gobierno colegiado",
      description:
        "Integrado por la Vicedirectora de Nivel Primario, la Directora de Orientación y la Directora de Nivel Secundario. La Directora General lo preside.",
    },
  ),

  areaNode("area-academica", "Área Académica", "ACADEMICA", 700),
  roleNode(
    "consejo-academico",
    "Consejo Académico",
    "ACADEMICA",
    700,
    850,
    "Integrar la mirada de los tres niveles y acordar criterios académicos comunes.",
    {
      color: RED,
      icon: "users",
      formalRole: "Órgano colegiado académico",
    },
  ),

  roleNode(
    "direccion-inicial",
    "Dirección de Nivel Inicial",
    "ACADEMICA",
    0,
    1120,
    "Conducir el nivel inicial y asegurar la implementación de su propuesta académica y formativa.",
    { icon: "graduation-cap" },
  ),
  roleNode(
    "vicedireccion-inicial",
    "Vicedirección de Nivel Inicial",
    "ACADEMICA",
    0,
    1390,
    "Acompañar la conducción y el funcionamiento cotidiano del nivel inicial.",
    { icon: "graduation-cap" },
  ),
  roleNode(
    "equipo-directivo-inicial",
    "Equipo Directivo Nivel Inicial",
    "ACADEMICA",
    300,
    1255,
    "Integrar la conducción del nivel y articular las decisiones con sus equipos.",
    { color: RED, icon: "users", formalRole: "Equipo directivo" },
  ),
  teamNode(
    "equipo-docente-inicial",
    "Equipo Docente Inicial",
    "ACADEMICA",
    160,
    1660,
    "Planificar, enseñar y acompañar el aprendizaje de los alumnos del nivel inicial.",
  ),
  teamNode(
    "eoe-inicial",
    "EOE Inicial",
    "FORMACION",
    430,
    1660,
    "Acompañar las trayectorias escolares y orientar a docentes, alumnos y familias del nivel.",
  ),
  teamNode(
    "secretaria-inicial",
    "Secretaría Académica Inicial",
    "ACADEMICA",
    700,
    1660,
    "Sostener la gestión académica, documental y administrativa del nivel inicial.",
  ),

  roleNode(
    "direccion-primaria",
    "Dirección de Nivel Primario",
    "ACADEMICA",
    900,
    1120,
    "Conducir el nivel primario y asegurar la implementación de su propuesta académica y formativa.",
    { icon: "graduation-cap" },
  ),
  roleNode(
    "vicedireccion-primaria",
    "Vicedirección de Nivel Primario",
    "ACADEMICA",
    900,
    1390,
    "Acompañar la conducción y el funcionamiento cotidiano del nivel primario.",
    { icon: "graduation-cap" },
  ),
  roleNode(
    "equipo-directivo-primaria",
    "Equipo Directivo Nivel Primario",
    "ACADEMICA",
    1200,
    1255,
    "Integrar la conducción del nivel y articular las decisiones con sus equipos.",
    { color: RED, icon: "users", formalRole: "Equipo directivo" },
  ),
  teamNode(
    "equipo-docente-primaria",
    "Equipo Docente Primario",
    "ACADEMICA",
    1060,
    1660,
    "Planificar, enseñar y acompañar el aprendizaje de los alumnos del nivel primario.",
  ),
  teamNode(
    "eoe-primaria",
    "EOE Primario",
    "FORMACION",
    1330,
    1660,
    "Acompañar las trayectorias escolares y orientar a docentes, alumnos y familias del nivel.",
  ),
  teamNode(
    "secretaria-primaria",
    "Secretaría Académica Primario",
    "ACADEMICA",
    1600,
    1660,
    "Sostener la gestión académica, documental y administrativa del nivel primario.",
  ),

  roleNode(
    "direccion-secundaria",
    "Dirección de Nivel Secundario",
    "ACADEMICA",
    1800,
    1120,
    "Conducir el nivel secundario y asegurar la implementación de su propuesta académica y formativa.",
    { icon: "graduation-cap" },
  ),
  roleNode(
    "vicedireccion-secundaria",
    "Vicedirección de Nivel Secundario",
    "ACADEMICA",
    1800,
    1390,
    "Acompañar la conducción y el funcionamiento cotidiano del nivel secundario.",
    { icon: "graduation-cap" },
  ),
  roleNode(
    "equipo-directivo-secundaria",
    "Equipo Directivo Nivel Secundario",
    "ACADEMICA",
    2100,
    1255,
    "Integrar la conducción del nivel y articular las decisiones con sus equipos.",
    { color: RED, icon: "users", formalRole: "Equipo directivo" },
  ),
  teamNode(
    "equipo-docente-secundaria",
    "Equipo Docente Secundario",
    "ACADEMICA",
    1900,
    1660,
    "Planificar, enseñar y acompañar el aprendizaje de los alumnos del nivel secundario.",
  ),
  teamNode(
    "eoe-secundaria",
    "EOE Secundario",
    "FORMACION",
    2170,
    1660,
    "Acompañar las trayectorias escolares y orientar a docentes, alumnos y familias del nivel.",
  ),
  teamNode(
    "pecs",
    "PECs",
    "FORMACION",
    2440,
    1660,
    "Acompañar los proyectos y espacios de formación complementaria del nivel secundario.",
  ),
  teamNode(
    "secretaria-secundaria",
    "Secretaría Académica Secundario",
    "ACADEMICA",
    2710,
    1660,
    "Sostener la gestión académica, documental y administrativa del nivel secundario.",
  ),

  areaNode("area-orientacion", "Área de Orientación", "FORMACION", 2950),
  roleNode(
    "direccion-orientacion",
    "Dirección de Orientación",
    "FORMACION",
    2950,
    850,
    "Conducir la orientación y articular el acompañamiento personal y formativo del colegio.",
    { icon: "heart-handshake" },
  ),
  roleNode(
    "coordinadora-deportes",
    "Coordinadora de Deportes",
    "FORMACION",
    2600,
    1120,
    "Coordinar la propuesta deportiva y el trabajo de sus docentes.",
    { icon: "target" },
  ),
  roleNode(
    "coordinadora-tutoria",
    "Coordinadora de Tutoría",
    "TUTORIA",
    2880,
    1120,
    "Coordinar el acompañamiento tutorial y sostener criterios comunes entre tutoras.",
    { icon: "handshake" },
  ),
  roleNode(
    "coordinadora-fe-vida",
    "Coordinadora de Fe y vida",
    "FORMACION",
    3160,
    1120,
    "Coordinar las propuestas de formación espiritual y de vida cristiana.",
    { icon: "heart-handshake" },
  ),
  roleNode(
    "coordinadora-das",
    "Coordinadora del DAS",
    "FORMACION",
    3440,
    1120,
    "Coordinar las acciones solidarias y de servicio a la comunidad.",
    { icon: "heart-handshake" },
  ),
  teamNode(
    "equipo-docente-deportes",
    "Equipo Docente Deportes",
    "FORMACION",
    2600,
    1510,
    "Implementar la propuesta deportiva del colegio.",
  ),
  teamNode(
    "tutoras",
    "Tutoras",
    "TUTORIA",
    2880,
    1510,
    "Acompañar personalmente a las alumnas y articular el vínculo con sus familias.",
  ),
  teamNode(
    "equipo-docente-fe-vida",
    "Equipo Docente Fe y vida",
    "FORMACION",
    3160,
    1510,
    "Implementar las propuestas de formación espiritual y de vida cristiana.",
  ),
  teamNode(
    "voluntarios",
    "Voluntarios",
    "FORMACION",
    3440,
    1510,
    "Participar en las acciones solidarias y de servicio coordinadas por el DAS.",
  ),

  areaNode(
    "area-desarrollo-institucional",
    "Área de Desarrollo Institucional",
    "COMUNICACION",
    3800,
  ),
  roleNode(
    "coordinadora-familia",
    "Coordinadora Familia",
    "FAMILIA",
    3520,
    930,
    "Cuidar el vínculo, la participación y la experiencia de las familias.",
    { icon: "users" },
  ),
  roleNode(
    "coordinadora-comunicacion",
    "Coordinadora Comunicación",
    "COMUNICACION",
    3800,
    930,
    "Ordenar la comunicación institucional y facilitar la circulación de información.",
    { icon: "megaphone" },
  ),
  roleNode(
    "coordinadora-marketing-postulaciones",
    "Coordinadora Marketing y Postulaciones",
    "POSTULACIONES",
    4080,
    930,
    "Acompañar el posicionamiento institucional y el proceso de ingreso de nuevas familias.",
    { icon: "pen-tool" },
  ),
  roleNode(
    "coordinadora-sistemas",
    "Coordinadora Sistemas",
    "COMUNICACION",
    4360,
    930,
    "Coordinar las herramientas y servicios tecnológicos que sostienen la gestión institucional.",
    { icon: "network" },
  ),
  roleNode(
    "coordinadora-alumni",
    "Coordinadora Alumni",
    "FAMILIA",
    4080,
    1300,
    "Sostener el vínculo institucional con las antiguas alumnas.",
    { icon: "users" },
  ),
  roleNode(
    "comite-admisiones",
    "Comité de Admisiones",
    "POSTULACIONES",
    4080,
    1660,
    "Evaluar y acompañar colegiadamente los procesos de admisión.",
    {
      color: RED,
      icon: "users",
      formalRole: "Órgano colegiado de admisiones",
    },
  ),

  areaNode("area-administracion", "Área de Administración", "ADMINISTRACION", 4750),
  roleNode(
    "administradora",
    "Administradora",
    "ADMINISTRACION",
    4750,
    880,
    "Conducir los procesos administrativos y asegurar información confiable para la gestión.",
    { icon: "shield-check" },
  ),
  teamNode(
    "presupuesto",
    "Presupuesto",
    "ADMINISTRACION",
    4470,
    1240,
    "Planificar, registrar y controlar el presupuesto institucional.",
  ),
  teamNode(
    "liquidacion-sueldos",
    "Liquidación de Sueldos",
    "ADMINISTRACION",
    4750,
    1240,
    "Gestionar la liquidación de haberes y su documentación asociada.",
  ),
  teamNode(
    "cobranzas",
    "Cobranzas",
    "ADMINISTRACION",
    5030,
    1240,
    "Gestionar y dar seguimiento a los procesos de cobranza.",
  ),

  areaNode("area-operaciones", "Área de Operaciones", "OPERACIONES", 5500),
  roleNode(
    "coordinacion-limpieza",
    "Coordinación Limpieza",
    "OPERACIONES",
    5200,
    1040,
    "Coordinar la limpieza y el cuidado cotidiano de los espacios.",
    { icon: "building" },
  ),
  roleNode(
    "coordinacion-infraestructura",
    "Coordinación Infraestructura y Mantenimiento",
    "OPERACIONES",
    5500,
    1040,
    "Coordinar el mantenimiento preventivo y correctivo de la infraestructura.",
    { icon: "wrench" },
  ),
  roleNode(
    "coordinacion-seguridad",
    "Coordinación Seguridad",
    "OPERACIONES",
    5800,
    1040,
    "Coordinar los procesos y equipos vinculados con la seguridad institucional.",
    { icon: "shield-check" },
  ),
  teamNode(
    "personal-limpieza",
    "Personal de Limpieza",
    "OPERACIONES",
    5200,
    1430,
    "Realizar la limpieza y el cuidado cotidiano de los espacios.",
  ),
  teamNode(
    "personal-mantenimiento",
    "Personal de mantenimiento",
    "OPERACIONES",
    5500,
    1430,
    "Realizar las tareas de mantenimiento de la infraestructura.",
  ),
  teamNode(
    "personal-seguridad",
    "Personal de Seguridad",
    "OPERACIONES",
    5800,
    1430,
    "Implementar las tareas y protocolos de seguridad institucional.",
  ),
];

const edges: EdgeDefinition[] = [];

function connect(
  source: string,
  targets: string[],
  type: EdgeType = "JERARQUICA",
  label?: string,
) {
  for (const target of targets) {
    edges.push({
      key: `${source}-${target}-${type.toLowerCase()}`,
      source,
      target,
      type,
      label,
    });
  }
}

connect("directora-general", ["consejo-direccion"]);
connect("consejo-direccion", [
  "area-academica",
  "area-orientacion",
  "area-desarrollo-institucional",
  "area-administracion",
  "area-operaciones",
]);

connect("area-academica", ["consejo-academico"]);
connect("direccion-inicial", ["vicedireccion-inicial"]);
connect("equipo-directivo-inicial", [
  "equipo-docente-inicial",
  "eoe-inicial",
  "secretaria-inicial",
]);
connect("direccion-primaria", ["vicedireccion-primaria"]);
connect("equipo-directivo-primaria", [
  "equipo-docente-primaria",
  "eoe-primaria",
  "secretaria-primaria",
]);
connect("direccion-secundaria", ["vicedireccion-secundaria"]);
connect("equipo-directivo-secundaria", [
  "equipo-docente-secundaria",
  "eoe-secundaria",
  "pecs",
  "secretaria-secundaria",
]);

for (const level of ["inicial", "primaria", "secundaria"]) {
  connect(
    `equipo-directivo-${level}`,
    ["consejo-academico"],
    "DECISION",
    "Integra",
  );
  connect(
    `direccion-${level}`,
    [`equipo-directivo-${level}`],
    "DECISION",
    "Integra",
  );
  connect(
    `vicedireccion-${level}`,
    [`equipo-directivo-${level}`],
    "DECISION",
    "Integra",
  );
}

connect("area-orientacion", ["direccion-orientacion"]);
connect("direccion-orientacion", [
  "coordinadora-deportes",
  "coordinadora-tutoria",
  "coordinadora-fe-vida",
  "coordinadora-das",
]);
connect("coordinadora-deportes", ["equipo-docente-deportes"]);
connect("coordinadora-tutoria", ["tutoras"]);
connect("coordinadora-fe-vida", ["equipo-docente-fe-vida"]);
connect("coordinadora-das", ["voluntarios"]);

connect("direccion-orientacion", [
  "direccion-inicial",
  "direccion-primaria",
  "direccion-secundaria",
], "COLABORACION", "Colabora");
connect("coordinadora-tutoria", [
  "eoe-inicial",
  "eoe-primaria",
  "eoe-secundaria",
], "COLABORACION", "Colabora");

connect("area-desarrollo-institucional", [
  "coordinadora-familia",
  "coordinadora-comunicacion",
  "coordinadora-marketing-postulaciones",
  "coordinadora-sistemas",
]);
connect("coordinadora-marketing-postulaciones", ["coordinadora-alumni"]);
connect(
  "coordinadora-marketing-postulaciones",
  ["comite-admisiones"],
  "DECISION",
  "Integra",
);
connect("coordinadora-familia", ["direccion-orientacion"], "COLABORACION", "Colabora");
connect("coordinadora-comunicacion", ["direccion-orientacion"], "COLABORACION", "Colabora");
connect("coordinadora-comunicacion", ["coordinadora-sistemas"], "COLABORACION", "Colabora");
connect("equipo-directivo-inicial", ["comite-admisiones"], "DECISION", "Integra");
connect("equipo-directivo-primaria", ["comite-admisiones"], "DECISION", "Integra");
connect("equipo-directivo-secundaria", ["comite-admisiones"], "DECISION", "Integra");

connect("area-administracion", ["administradora"]);
connect("administradora", ["presupuesto", "liquidacion-sueldos", "cobranzas"]);
connect("administradora", ["area-operaciones"], "COLABORACION", "Colabora");

connect("area-operaciones", [
  "coordinacion-limpieza",
  "coordinacion-infraestructura",
  "coordinacion-seguridad",
]);
connect("coordinacion-limpieza", ["personal-limpieza"]);
connect("coordinacion-infraestructura", ["personal-mantenimiento"]);
connect("coordinacion-seguridad", ["personal-seguridad"]);

async function main() {
  const school =
    (await prisma.school.findFirst({
      where: {
        OR: [
          { slug: "colegio-el-buen-ayre" },
          { slug: "el-buen-ayre" },
          { name: { equals: "Colegio El Buen Ayre", mode: "insensitive" } },
          { name: { equals: "El Buen Ayre", mode: "insensitive" } },
        ],
      },
    })) ??
    (await prisma.school.create({
      data: {
        name: "Colegio El Buen Ayre",
        slug: "colegio-el-buen-ayre",
        city: "Buenos Aires",
        province: "Buenos Aires",
      },
    }));

  const latestChart = await prisma.orgChart.findFirst({
    where: { schoolId: school.id },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
    select: { version: true },
  });

  const chart = await prisma.$transaction(
    async (tx) => {
      // Se crea una propuesta completamente nueva. El organigrama que el colegio
      // ya está usando, sus cajas, relaciones y asignaciones no se modifican.
      const newChart = await tx.orgChart.create({
        data: {
          schoolId: school.id,
          title: "Organigrama El Buen Ayre 2026 · Nueva propuesta",
          year: 2026,
          status: "DRAFT",
          version: (latestChart?.version ?? 0) + 1,
          summary:
            "Nueva propuesta reconstruida a partir del organigrama provisto por el colegio. El organigrama anterior se conserva sin cambios.",
        },
      });

    const createdNodeIds = new Map<string, string>();

    for (const [index, node] of nodes.entries()) {
      const createdNode = await tx.orgNode.create({
        data: {
          orgChartId: newChart.id,
          title: node.title,
          area: node.area,
          formalRole: node.formalRole ?? null,
          realFunction: node.realFunction ?? null,
          description: node.description ?? null,
          positionX: node.x,
          positionY: node.y,
          color: node.color,
          icon: node.icon,
          order: index + 1,
        },
        select: { id: true },
      });

      createdNodeIds.set(node.key, createdNode.id);
    }

    for (const edge of edges) {
      const sourceId = createdNodeIds.get(edge.source);
      const targetId = createdNodeIds.get(edge.target);

      if (!sourceId || !targetId) {
        throw new Error(
          `No se pudo crear la relación ${edge.key}: falta un casillero de origen o destino.`,
        );
      }

      await tx.orgEdge.create({
        data: {
          orgChartId: newChart.id,
          sourceId,
          targetId,
          type: edge.type,
          label: edge.label ?? null,
        },
      });
    }

      return newChart;
    },
    { maxWait: 15_000, timeout: 60_000 },
  );

  console.log(
    `Nueva propuesta creada sin modificar el organigrama anterior: "${chart.title}" (${nodes.length} casilleros y ${edges.length} relaciones).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
