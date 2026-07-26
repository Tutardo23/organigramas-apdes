export type OrgChartPosition = {
  x: number;
  y: number;
};

export type OrgChartPositionMap = Record<string, OrgChartPosition>;

export type PositionLayoutNode = {
  id: string;
  title: string;
  positionX: number;
  positionY: number;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function captureOrgChartPositions(
  nodes: PositionLayoutNode[],
): OrgChartPositionMap {
  return Object.fromEntries(
    nodes.map((node) => [
      node.id,
      { x: node.positionX, y: node.positionY },
    ]),
  );
}

export function sameOrgChartPositions(
  left: OrgChartPositionMap,
  right: OrgChartPositionMap,
) {
  const leftIds = Object.keys(left);
  const rightIds = Object.keys(right);
  if (leftIds.length !== rightIds.length) return false;

  return leftIds.every(
    (nodeId) =>
      right[nodeId] &&
      left[nodeId].x === right[nodeId].x &&
      left[nodeId].y === right[nodeId].y,
  );
}

export function manualViewerPositions(
  nodes: PositionLayoutNode[],
  visibleNodeIds?: Set<string>,
) {
  return new Map(
    nodes
      .filter((node) => !visibleNodeIds || visibleNodeIds.has(node.id))
      .map((node) => [
        node.id,
        { x: node.positionX, y: node.positionY },
      ]),
  );
}

type SemanticRow = {
  match: (title: string) => boolean;
  order: RegExp[];
};

const semanticRows: SemanticRow[] = [
  {
    match: (title) =>
      title.startsWith("direccion de nivel") ||
      title.startsWith("equipo directivo") ||
      title.includes("direccion general") ||
      title.includes("director general") ||
      title.includes("comite de admisiones"),
    order: [
      /direccion de nivel inicial/,
      /equipo directivo.*inicial/,
      /direccion de nivel primar/,
      /equipo directivo.*primar/,
      /direccion de nivel secundar/,
      /equipo directivo.*secundar/,
      /direccion general|director general/,
      /comite de admisiones/,
    ],
  },
  {
    match: (title) =>
      title.includes("vicedireccion") ||
      title.startsWith("equipo docente") ||
      /\beoe\b/.test(title) ||
      title.includes("secretaria academica") ||
      title.includes("consejo de direccion") ||
      /\bpecs?\b/.test(title),
    order: [
      /vicedireccion.*inicial/,
      /equipo docente.*inicial/,
      /eoe.*inicial/,
      /secretaria academica.*inicial/,
      /vicedireccion.*primar/,
      /equipo docente.*primar/,
      /eoe.*primar/,
      /secretaria academica.*primar/,
      /vicedireccion.*secundar/,
      /equipo docente.*secundar/,
      /eoe.*secundar/,
      /consejo de direccion/,
      /\bpecs?\b/,
      /secretaria academica.*secundar/,
    ],
  },
  {
    match: (title) => title.startsWith("area ") || title.startsWith("area de "),
    order: [
      /area academica/,
      /area de orientacion/,
      /area de desarrollo institucional/,
      /area de administracion/,
      /area de operaciones/,
    ],
  },
  {
    match: (title) =>
      title.includes("consejo academico") ||
      title.includes("direccion de orientacion") ||
      title.includes("coordinadora familia") ||
      title.includes("coordinacion familia") ||
      title.includes("coordinadora comunicacion") ||
      title.includes("coordinacion comunicacion") ||
      title.includes("marketing") ||
      title.includes("postulaciones") ||
      title.includes("sistemas") ||
      title.includes("administradora") ||
      title.startsWith("coordinacion limpieza") ||
      title.startsWith("coordinacion mantenimiento") ||
      title.startsWith("coordinacion seguridad"),
    order: [
      /consejo academico/,
      /direccion de orientacion/,
      /coordinadora? familia|coordinacion familia/,
      /coordinadora? comunicacion|coordinacion comunicacion/,
      /marketing|postulaciones/,
      /sistemas/,
      /administradora/,
      /coordinacion limpieza/,
      /coordinacion mantenimiento/,
      /coordinacion seguridad/,
    ],
  },
  {
    match: (title) =>
      title.includes("coordinadora de deporte") ||
      title.includes("coordinacion de deporte") ||
      title.includes("coordinadora de tutoria") ||
      title.includes("coordinacion de tutoria") ||
      title.includes("fe y vida") ||
      /\bdas\b/.test(title) ||
      title.includes("alumni") ||
      title.includes("presupuesto") ||
      title.includes("liquidacion") ||
      title.includes("cobranzas") ||
      title.startsWith("personal de "),
    order: [
      /deporte/,
      /tutoria/,
      /fe y vida/,
      /\bdas\b/,
      /alumni/,
      /presupuesto/,
      /liquidacion/,
      /cobranzas/,
      /personal de limpieza/,
      /personal de mantenimiento/,
      /personal de seguridad/,
    ],
  },
  {
    match: () => true,
    order: [
      /equipo.*deporte/,
      /tutor/,
      /equipo.*fe y vida/,
      /voluntar/,
    ],
  },
];

function semanticOrder(title: string, rules: RegExp[]) {
  const index = rules.findIndex((rule) => rule.test(title));
  return index === -1 ? rules.length + 1 : index;
}

/**
 * Reconstruye la composición institucional de referencia: gobierno y niveles
 * arriba, áreas en el centro y equipos debajo. Se usa únicamente como opción
 * de recuperación; nunca se guarda sin una confirmación explícita.
 */
export function buildInstitutionalRecoveryLayout(
  nodes: PositionLayoutNode[],
): OrgChartPositionMap {
  const rows = new Map<number, PositionLayoutNode[]>();

  for (const node of nodes) {
    const title = normalize(node.title);
    const rowIndex = semanticRows.findIndex((row) => row.match(title));
    const safeRow = rowIndex === -1 ? semanticRows.length - 1 : rowIndex;
    rows.set(safeRow, [...(rows.get(safeRow) ?? []), node]);
  }

  const result: OrgChartPositionMap = {};
  const horizontalGap = 282;
  const verticalGap = 198;
  const left = 132;
  const top = 92;

  for (const [rowIndex, rowNodes] of [...rows.entries()].sort(
    ([leftRow], [rightRow]) => leftRow - rightRow,
  )) {
    const rules = semanticRows[rowIndex]?.order ?? [];
    rowNodes.sort((leftNode, rightNode) => {
      const leftTitle = normalize(leftNode.title);
      const rightTitle = normalize(rightNode.title);
      return (
        semanticOrder(leftTitle, rules) -
          semanticOrder(rightTitle, rules) ||
        leftNode.positionX - rightNode.positionX ||
        leftTitle.localeCompare(rightTitle, "es")
      );
    });

    rowNodes.forEach((node, columnIndex) => {
      result[node.id] = {
        x: left + columnIndex * horizontalGap,
        y: top + rowIndex * verticalGap,
      };
    });
  }

  return result;
}
