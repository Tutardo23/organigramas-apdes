export type InstitutionalTemplateNode = {
  key: string;
  title: string;
  area: string;
  formalRole: string;
  realFunction: string;
  description: string;
  color: string;
  icon: string;
  positionX: number;
  positionY: number;
};

/**
 * Base orientativa construida a partir del Marco conceptual del Organigrama
 * Institucional de APDES. No impone una estructura única: completa las
 * capacidades críticas y cada colegio puede editar, integrar o quitar cajas.
 */
export const institutionalTemplateNodes: InstitutionalTemplateNode[] = [
  {
    key: "consejo-direccion",
    title: "Consejo de Dirección",
    area: "DIRECCION",
    formalRole: "Órgano de gobierno colegiado",
    realFunction:
      "Gobernar el colegio de manera colegiada, definir prioridades y sostener criterios compartidos para la toma de decisiones.",
    description:
      "El Director General preside el Consejo, pero el gobierno corresponde al órgano en su conjunto. Agregá como integrantes a personas ya cargadas en sus áreas: al tocar esta caja se resaltarán sus funciones en el organigrama.",
    color: "#1d4ed8",
    icon: "users",
    positionX: 780,
    positionY: 40,
  },
  {
    key: "direccion-general",
    title: "Dirección General",
    area: "DIRECCION",
    formalRole: "Director/a General",
    realFunction:
      "Presidir el Consejo de Dirección, cuidar la unidad del proyecto institucional y articular la implementación de las decisiones colegiadas.",
    description:
      "La Dirección General no se presenta como el único origen de todos los cargos. Su vínculo con cada función debe reflejar la realidad del colegio.",
    color: "#2563eb",
    icon: "landmark",
    positionX: 780,
    positionY: 340,
  },
  {
    key: "coordinacion-academica",
    title: "Coordinación Académica",
    area: "ACADEMICA",
    formalRole: "Coordinación académica",
    realFunction:
      "Acompañar la planificación, la enseñanza, la evaluación y la mejora de los procesos académicos.",
    description:
      "Adaptar según niveles, ciclos, cantidad de líneas y perfiles disponibles en el colegio.",
    color: "#0f766e",
    icon: "graduation-cap",
    positionX: 0,
    positionY: 660,
  },
  {
    key: "formacion-integral",
    title: "Formación Integral",
    area: "FORMACION",
    formalRole: "Coordinación de Formación Integral",
    realFunction:
      "Articular tutorías, formación humana y acompañamiento de alumnos, familias y educadores.",
    description:
      "Puede integrar o desdoblar funciones según el tamaño del colegio y su densidad de talento.",
    color: "#7c3aed",
    icon: "book-open",
    positionX: 310,
    positionY: 660,
  },
  {
    key: "familia",
    title: "Familia",
    area: "FAMILIA",
    formalRole: "Responsable de Familias",
    realFunction:
      "Cuidar el vínculo con las familias y liderar experiencias como la incorporación, el acompañamiento y los eventos institucionales.",
    description:
      "Área constructora de experiencia institucional, cultura y comunidad; no es una función accesoria.",
    color: "#d97706",
    icon: "users",
    positionX: 620,
    positionY: 660,
  },
  {
    key: "comunicacion",
    title: "Comunicación",
    area: "COMUNICACION",
    formalRole: "Responsable de Comunicación",
    realFunction:
      "Ordenar la comunicación institucional y facilitar la circulación de información entre personas, equipos y familias.",
    description:
      "Debe articularse transversalmente con las áreas académicas, formativas, institucionales y operativas.",
    color: "#0284c7",
    icon: "megaphone",
    positionX: 930,
    positionY: 660,
  },
  {
    key: "postulaciones",
    title: "Postulaciones",
    area: "POSTULACIONES",
    formalRole: "Responsable de Postulaciones",
    realFunction:
      "Acompañar el ingreso de nuevas familias y articular su incorporación con las áreas involucradas.",
    description:
      "La experiencia de ingreso requiere liderazgo explícito, información compartida y trabajo articulado.",
    color: "#be123c",
    icon: "pen-tool",
    positionX: 1240,
    positionY: 660,
  },
  {
    key: "operaciones",
    title: "Operaciones",
    area: "OPERACIONES",
    formalRole: "Gestión operativa",
    realFunction:
      "Sostener la organización cotidiana, los recursos y los procesos necesarios para el funcionamiento institucional.",
    description:
      "Definir con claridad qué decisiones toma, qué información necesita y cómo se articula con las demás áreas.",
    color: "#475569",
    icon: "building",
    positionX: 1550,
    positionY: 660,
  },
  {
    key: "administracion",
    title: "Administración",
    area: "ADMINISTRACION",
    formalRole: "Gestión administrativa",
    realFunction:
      "Ordenar los procesos administrativos, la documentación y el soporte institucional.",
    description:
      "Puede integrarse con Operaciones o funcionar como responsabilidad diferenciada según la realidad del colegio.",
    color: "#334155",
    icon: "shield-check",
    positionX: 1550,
    positionY: 960,
  },
  {
    key: "tutorias",
    title: "Tutorías",
    area: "TUTORIA",
    formalRole: "Equipo tutorial",
    realFunction:
      "Acompañar personalmente a los alumnos y articular entrevistas, seguimiento y conversaciones de feedback.",
    description:
      "Puede depender de Formación Integral y organizarse de manera distinta según niveles y cantidad de alumnos.",
    color: "#9333ea",
    icon: "handshake",
    positionX: 310,
    positionY: 960,
  },
];

export function normalizeTemplateTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function isCollectiveGovernanceNode(input: {
  title?: string | null;
  formalRole?: string | null;
}) {
  const title = normalizeTemplateTitle(input.title ?? "");
  const role = normalizeTemplateTitle(input.formalRole ?? "");
  return (
    title.includes("consejo de direccion") ||
    role.includes("organo de gobierno colegiado")
  );
}
