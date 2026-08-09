export type BuenAyreHierarchyNode = {
  id: string;
  title: string;
  area: string;
  positionX: number;
  positionY: number;
};

export type BuenAyreHierarchyLink = {
  sourceId: string;
  targetId: string;
};

export function normalizeBuenAyreTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_·–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isBuenAyreSchoolSlug(value: string) {
  return normalizeBuenAyreTitle(value).includes("buen ayre");
}

function matches(node: BuenAyreHierarchyNode, pattern: RegExp) {
  return pattern.test(normalizeBuenAyreTitle(node.title));
}

function firstMatch(nodes: BuenAyreHierarchyNode[], patterns: RegExp[]) {
  return nodes.find((node) => patterns.some((pattern) => matches(node, pattern))) ?? null;
}

function exact(nodes: BuenAyreHierarchyNode[], pattern: RegExp) {
  return nodes.find((node) => matches(node, pattern)) ?? null;
}

/**
 * Reconstruye la dependencia DIRECTA del organigrama de El Buen Ayre con una
 * jerarquía simple y navegable. Integra / Colabora quedan fuera de este cálculo:
 * son vínculos adicionales y nunca reemplazan la dependencia jerárquica.
 *
 * La función trabaja por títulos porque el organigrama histórico ya existe en
 * la base con IDs variables. Los patrones están basados en la estructura real
 * que veníamos mostrando para Buen Ayre.
 */
export function buildBuenAyreSimpleHierarchy(nodes: BuenAyreHierarchyNode[]) {
  const links = new Map<string, string>(); // child -> parent
  if (!nodes.length) return [] as BuenAyreHierarchyLink[];

  const topByY = [...nodes].sort((a, b) => a.positionY - b.positionY)[0] ?? nodes[0];
  const director = firstMatch(nodes, [
    /^director(?:a)? general$/,
    /^direccion general$/,
  ]);
  const council = firstMatch(nodes, [/^consejo de direccion/]);
  const root = director ?? council ?? topByY;

  const areaAcademica = exact(nodes, /^area academica$/);
  const areaOrientacion = firstMatch(nodes, [/^area de orientacion$/, /^area orientacion$/]);
  const areaDesarrollo = firstMatch(nodes, [/^area de desarrollo institucional$/, /^area desarrollo institucional$/]);
  const areaAdministracion = firstMatch(nodes, [/^area de administracion$/, /^area administracion$/]);
  const areaOperaciones = firstMatch(nodes, [/^area de operaciones$/, /^area operaciones$/]);

  const assign = (
    child: BuenAyreHierarchyNode | null | undefined,
    parent: BuenAyreHierarchyNode | null | undefined,
  ) => {
    if (!child || !parent || child.id === parent.id || child.id === root.id) return;
    links.set(child.id, parent.id);
  };

  // Gobierno y grandes áreas.
  if (council && council.id !== root.id) assign(council, root);
  const governmentParent = council ?? root;
  [areaAcademica, areaOrientacion, areaDesarrollo, areaAdministracion, areaOperaciones]
    .forEach((area) => assign(area, governmentParent));

  // Académica.
  const academicCouncil = firstMatch(nodes, [/^consejo academico$/]);
  assign(academicCouncil, areaAcademica ?? governmentParent);

  const initialDirection = firstMatch(nodes, [/^direccion de nivel inicial$/, /^direccion del nivel inicial$/]);
  const primaryDirection = firstMatch(nodes, [/^direccion de nivel primar/, /^direccion del nivel primar/]);
  const secondaryDirection = firstMatch(nodes, [/^direccion de nivel secundar/, /^direccion del nivel secundar/]);
  [initialDirection, primaryDirection, secondaryDirection].forEach((node) => assign(node, academicCouncil ?? areaAcademica ?? governmentParent));

  const initialLeadership = firstMatch(nodes, [/^equipo directivo.*inicial/]);
  const primaryLeadership = firstMatch(nodes, [/^equipo directivo.*primar/]);
  const secondaryLeadership = firstMatch(nodes, [/^equipo directivo.*secundar/]);
  assign(initialLeadership, initialDirection ?? academicCouncil ?? areaAcademica ?? governmentParent);
  assign(primaryLeadership, primaryDirection ?? academicCouncil ?? areaAcademica ?? governmentParent);
  assign(secondaryLeadership, secondaryDirection ?? academicCouncil ?? areaAcademica ?? governmentParent);

  const initialVice = firstMatch(nodes, [/^vicedireccion.*inicial/, /^vice direccion.*inicial/]);
  const primaryVice = firstMatch(nodes, [/^vicedireccion.*primar/, /^vice direccion.*primar/]);
  const secondaryVice = firstMatch(nodes, [/^vicedireccion.*secundar/, /^vice direccion.*secundar/]);
  assign(initialVice, initialDirection ?? initialLeadership);
  assign(primaryVice, primaryDirection ?? primaryLeadership);
  assign(secondaryVice, secondaryDirection ?? secondaryLeadership);

  const academicChildren: Array<[RegExp[], BuenAyreHierarchyNode | null]> = [
    [[/^equipo docente.*inicial/, /^eoe.*inicial/, /^secretaria academica.*inicial/], initialLeadership ?? initialDirection],
    [[/^equipo docente.*primar/, /^eoe.*primar/, /^secretaria academica.*primar/], primaryLeadership ?? primaryDirection],
    [[/^equipo docente.*secundar/, /^eoe.*secundar/, /^pecs?$/, /^secretaria academica.*secundar/], secondaryLeadership ?? secondaryDirection],
  ];
  for (const [patterns, parent] of academicChildren) {
    nodes.filter((node) => patterns.some((pattern) => matches(node, pattern))).forEach((node) => assign(node, parent));
  }

  // Orientación.
  const orientationDirection = firstMatch(nodes, [/^direccion de orientacion$/, /^direccion orientacion$/]);
  assign(orientationDirection, areaOrientacion ?? governmentParent);

  const sports = firstMatch(nodes, [/coordinador(?:a)? de deportes/, /coordinacion de deportes/]);
  const tutors = firstMatch(nodes, [/coordinador(?:a)? de tutoria/, /coordinacion de tutoria/]);
  const faith = firstMatch(nodes, [/coordinador(?:a)?.*fe y vida/, /coordinacion.*fe y vida/]);
  const das = firstMatch(nodes, [/coordinador(?:a)?.*\bdas\b/, /coordinacion.*\bdas\b/]);
  [sports, tutors, faith, das].forEach((node) => assign(node, orientationDirection ?? areaOrientacion ?? governmentParent));

  nodes.filter((node) => /equipo docente.*deporte/.test(normalizeBuenAyreTitle(node.title))).forEach((node) => assign(node, sports));
  nodes.filter((node) => /^tutores?$/.test(normalizeBuenAyreTitle(node.title))).forEach((node) => assign(node, tutors));
  nodes.filter((node) => /equipo docente.*fe y vida/.test(normalizeBuenAyreTitle(node.title))).forEach((node) => assign(node, faith));
  nodes.filter((node) => /voluntar/.test(normalizeBuenAyreTitle(node.title))).forEach((node) => assign(node, das));

  // Desarrollo institucional.
  const family = firstMatch(nodes, [/coordinador(?:a)? familia/, /coordinacion familia/]);
  const communication = firstMatch(nodes, [/coordinador(?:a)? comunicacion/, /coordinacion comunicacion/]);
  const marketing = firstMatch(nodes, [/marketing.*postulaciones/, /postulaciones.*marketing/]);
  const systems = firstMatch(nodes, [/coordinador(?:a)? sistemas/, /coordinacion sistemas/]);
  const alumni = firstMatch(nodes, [/coordinador(?:a)? alumni/, /coordinacion alumni/]);
  const admissions = firstMatch(nodes, [/^comite de admisiones$/]);
  [family, communication, marketing, systems, alumni, admissions]
    .forEach((node) => assign(node, areaDesarrollo ?? governmentParent));

  // Administración.
  const administrator = firstMatch(nodes, [/^administrador(?:a)?$/, /administracion general/]);
  assign(administrator, areaAdministracion ?? governmentParent);
  nodes
    .filter((node) => /presupuesto|liquidacion de sueldo|liquidacion de salarios|cobranzas/.test(normalizeBuenAyreTitle(node.title)))
    .forEach((node) => assign(node, administrator ?? areaAdministracion ?? governmentParent));

  // Operaciones.
  const cleaning = firstMatch(nodes, [/coordinacion limpieza/, /coordinador(?:a)? limpieza/]);
  const maintenance = firstMatch(nodes, [/infraestructura y mantenimiento/, /coordinacion mantenimiento/]);
  const security = firstMatch(nodes, [/coordinacion seguridad/, /coordinador(?:a)? seguridad/]);
  [cleaning, maintenance, security].forEach((node) => assign(node, areaOperaciones ?? governmentParent));
  nodes.filter((node) => /^personal de limpieza/.test(normalizeBuenAyreTitle(node.title))).forEach((node) => assign(node, cleaning));
  nodes.filter((node) => /^personal de mantenimiento/.test(normalizeBuenAyreTitle(node.title))).forEach((node) => assign(node, maintenance));
  nodes.filter((node) => /^personal de seguridad/.test(normalizeBuenAyreTitle(node.title))).forEach((node) => assign(node, security));

  // Todo lo que no entró en una regla explícita recibe una dependencia segura
  // por área. Esto evita cajas huérfanas sin inventar relaciones transversales.
  const areaFallback = (node: BuenAyreHierarchyNode) => {
    switch (node.area) {
      case "ACADEMICA": return areaAcademica ?? academicCouncil ?? governmentParent;
      case "FORMACION":
      case "TUTORIA":
      case "CAPELLANIA": return areaOrientacion ?? areaDesarrollo ?? governmentParent;
      case "FAMILIA":
      case "COMUNICACION":
      case "POSTULACIONES": return areaDesarrollo ?? governmentParent;
      case "ADMINISTRACION": return areaAdministracion ?? governmentParent;
      case "OPERACIONES": return areaOperaciones ?? governmentParent;
      case "DIRECCION": return governmentParent;
      default: return governmentParent;
    }
  };

  for (const node of nodes) {
    if (node.id === root.id || links.has(node.id)) continue;
    const fallback = areaFallback(node);
    if (fallback && fallback.id !== node.id) links.set(node.id, fallback.id);
  }

  return [...links.entries()].map(([targetId, sourceId]) => ({ sourceId, targetId }));
}
