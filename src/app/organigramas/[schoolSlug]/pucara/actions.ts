"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../../lib/prisma";
import {
  PUCARA_HITO_NODES,
  type PucaraHitoNode,
  type PucaraHitoPerson,
} from "../../../../lib/pucara-hito-template";

type PositionInput = {
  nodeId: string;
  positionX: number;
  positionY: number;
};

function textOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

// El esquema actual guarda horas como Int. Redondeamos los valores del HITO
// que venían con decimales para no romper Prisma. Si luego APDES quiere conservar
// decimales exactos conviene migrar weeklyHours a Float.
function hoursOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function normalizePhotoUrl(value: unknown) {
  const raw = textOrNull(value);
  if (!raw) return null;

  // Para el flujo local alcanza con escribir el archivo, por ejemplo
  // "juan-romano.jpg". Se transforma a /images/personas/juan-romano.jpg.
  if (!raw.includes("/") && /^[a-zA-Z0-9._ -]+\.(png|jpe?g|webp)$/i.test(raw)) {
    return `/images/personas/${raw.replace(/\s+/g, "-")}`;
  }

  // Evitamos esquemas peligrosos (javascript:, data:, file:, etc.).
  if (raw.startsWith("/images/") || /^https:\/\//i.test(raw)) return raw;
  throw new Error("La foto debe estar dentro de /images/ o ser una URL https segura.");
}

function revalidateSchool(slug: string) {
  revalidatePath(`/organigramas/${slug}`);
  revalidatePath(`/organigramas/${slug}/pucara`);
  revalidatePath(`/organigramas/${slug}/editar`);
}

function normalizeNode(node: any) {
  return {
    ...node,
    members: node.members ?? [],
  };
}

async function getNodeWithPeople(nodeId: string) {
  return (prisma as any).orgNode.findUnique({
    where: { id: nodeId },
    include: {
      orgChart: true,
      person: true,
      members: {
        include: { person: true },
        orderBy: [{ role: "asc" }, { order: "asc" }],
      },
    },
  });
}

export async function createPucaraStarterChartAction(input: {
  schoolSlug: string;
  title: string;
  year: number | string;
  starter?: "basic" | "single";
}) {
  const school = await (prisma as any).school.findUnique({
    where: { slug: input.schoolSlug },
  });
  if (!school) throw new Error("No se encontró el colegio.");

  const year = Math.round(Number(input.year));
  if (!Number.isFinite(year) || year < 2020 || year > 2100) {
    throw new Error("Ingresá un año válido.");
  }

  const title = input.title.trim() || `Organigrama ${school.name} ${year}`;
  const starter = input.starter === "single" ? "single" : "basic";

  const result = await prisma.$transaction(async (tx) => {
    const chart = await (tx as any).orgChart.create({
      data: {
        schoolId: school.id,
        title,
        year,
        status: "DRAFT",
        version: 1,
        summary: "Organigrama jerárquico simple creado desde la vista Pucará.",
      },
    });

    if (starter === "single") {
      const root = await (tx as any).orgNode.create({
        data: {
          orgChartId: chart.id,
          title: "Dirección General",
          area: "DIRECCION",
          formalRole: "Dirección del colegio",
          realFunction: "Conducción general",
          description: "Conduce la vida institucional y articula las decisiones de los distintos equipos.",
          positionX: 560,
          positionY: 100,
          color: "#1C3A62",
          icon: "network",
          order: 1,
        },
      });
      return { chart, rootId: root.id };
    }

    const council = await (tx as any).orgNode.create({
      data: {
        orgChartId: chart.id,
        title: "Consejo de Dirección",
        area: "DIRECCION",
        formalRole: "Órgano de conducción institucional",
        realFunction: "Conducción y definición de criterios",
        description: "Define criterios, prioridades y acompaña la conducción general del colegio.",
        positionX: 560,
        positionY: 80,
        color: "#1C3A62",
        icon: "network",
        order: 1,
      },
    });

    const director = await (tx as any).orgNode.create({
      data: {
        orgChartId: chart.id,
        title: "Dirección General",
        area: "DIRECCION",
        formalRole: "Dirección del colegio",
        realFunction: "Conducción general",
        description: "Conduce la vida institucional y articula las decisiones de los distintos equipos.",
        positionX: 560,
        positionY: 470,
        color: "#2E6B4B",
        icon: "network",
        order: 2,
      },
    });

    await (tx as any).orgEdge.create({
      data: {
        orgChartId: chart.id,
        sourceId: council.id,
        targetId: director.id,
        type: "JERARQUICA",
        label: null,
      },
    });

    return { chart, rootId: council.id };
  });

  revalidateSchool(input.schoolSlug);
  return { chartId: result.chart.id, rootId: result.rootId, title: result.chart.title };
}

export async function savePucaraPositionsAction(input: {
  schoolSlug: string;
  positions: PositionInput[];
}) {
  if (!input.positions.length) return { ok: true };

  await prisma.$transaction(
    input.positions.map((position) =>
      (prisma as any).orgNode.update({
        where: { id: position.nodeId },
        data: {
          positionX: position.positionX,
          positionY: position.positionY,
        },
      }),
    ),
  );

  revalidateSchool(input.schoolSlug);
  return { ok: true };
}

export async function movePucaraNodeAction(input: {
  schoolSlug: string;
  nodeId: string;
  positionX: number;
  positionY: number;
}) {
  const node = await (prisma as any).orgNode.update({
    where: { id: input.nodeId },
    data: {
      positionX: input.positionX,
      positionY: input.positionY,
    },
    include: {
      person: true,
      members: {
        include: { person: true },
        orderBy: [{ role: "asc" }, { order: "asc" }],
      },
    },
  });

  revalidateSchool(input.schoolSlug);
  return normalizeNode(node);
}

export async function updatePucaraNodeAction(input: {
  schoolSlug: string;
  nodeId: string;
  title: string;
  formalRole?: string | null;
  realFunction?: string | null;
  description?: string | null;
  weeklyHours?: string | number | null;
  personId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  photoUrl?: string | null;
}) {
  const currentNode = await getNodeWithPeople(input.nodeId);
  if (!currentNode) throw new Error("No se encontró la función seleccionada.");

  const firstName = textOrNull(input.firstName);
  const lastName = textOrNull(input.lastName);
  const email = textOrNull(input.email);
  const photoUrl = normalizePhotoUrl(input.photoUrl);
  const weeklyHours = hoursOrNull(input.weeklyHours);
  const formalRole = textOrNull(input.formalRole);
  const realFunction = textOrNull(input.realFunction);
  const requestedPersonId = textOrNull(input.personId);

  const result = await prisma.$transaction(async (tx) => {
    let person = currentNode.person;

    if (requestedPersonId && requestedPersonId !== "__new__") {
      const selected = await (tx as any).person.findFirst({
        where: {
          id: requestedPersonId,
          schoolId: currentNode.orgChart.schoolId,
          active: true,
        },
      });
      if (!selected) throw new Error("La persona elegida no pertenece a este colegio.");
      person = selected;
    }

    if (person) {
      person = await (tx as any).person.update({
        where: { id: person.id },
        data: {
          firstName: firstName || person.firstName,
          lastName: lastName ?? person.lastName,
          email: email ?? person.email,
          photoUrl: photoUrl ?? person.photoUrl,
          formalRole,
          realFunction,
          weeklyHours,
        },
      });
    } else if (firstName || lastName || email || photoUrl) {
      person = await (tx as any).person.create({
        data: {
          schoolId: currentNode.orgChart.schoolId,
          firstName: firstName || "Sin nombre",
          lastName: lastName || "",
          email,
          photoUrl,
          formalRole,
          realFunction,
          weeklyHours,
        },
      });
    }

    const node = await (tx as any).orgNode.update({
      where: { id: input.nodeId },
      data: {
        title: input.title.trim() || "Sin título",
        formalRole,
        realFunction,
        description: textOrNull(input.description),
        weeklyHours,
        personId: person?.id ?? null,
      },
      include: {
        person: true,
        members: {
          include: { person: true },
          orderBy: [{ role: "asc" }, { order: "asc" }],
        },
      },
    });

    return node;
  });

  revalidateSchool(input.schoolSlug);
  return normalizeNode(result);
}

export async function createPucaraChildAction(input: {
  schoolSlug: string;
  orgChartId: string;
  parentNodeId: string;
}) {
  const parent = await (prisma as any).orgNode.findFirst({
    where: { id: input.parentNodeId, orgChartId: input.orgChartId },
  });
  if (!parent) throw new Error("No se encontró la caja superior.");

  const nextOrder =
    (await (prisma as any).orgNode.count({ where: { orgChartId: input.orgChartId } })) + 1;
  const siblingCount = await (prisma as any).orgEdge.count({
    where: {
      orgChartId: input.orgChartId,
      sourceId: parent.id,
      type: "JERARQUICA",
    },
  });
  const slot = siblingCount === 0
    ? 0
    : Math.ceil(siblingCount / 2) * 460 * (siblingCount % 2 === 1 ? 1 : -1);

  const nextColor: Record<string, string> = {
    "#1C3A62": "#2E6B4B",
    "#2E6B4B": "#ECC300",
    "#ECC300": "#6B7280",
    "#6B7280": "#94A3B8",
  };

  const result = await prisma.$transaction(async (tx) => {
    const node = await (tx as any).orgNode.create({
      data: {
        orgChartId: input.orgChartId,
        title: "Nueva función",
        area: parent.area,
        formalRole: null,
        realFunction: null,
        description: null,
        weeklyHours: null,
        positionX: Number(parent.positionX ?? 0) + slot,
        positionY: Number(parent.positionY ?? 0) + 500,
        color: nextColor[String(parent.color ?? "").toUpperCase()] || parent.color || "#64748B",
        icon: parent.icon,
        order: nextOrder,
      },
      include: {
        person: true,
        members: {
          include: { person: true },
          orderBy: [{ role: "asc" }, { order: "asc" }],
        },
      },
    });

    const edge = await (tx as any).orgEdge.create({
      data: {
        orgChartId: input.orgChartId,
        sourceId: parent.id,
        targetId: node.id,
        type: "JERARQUICA",
        label: null,
      },
    });

    return { node, edge };
  });

  revalidateSchool(input.schoolSlug);
  return { node: normalizeNode(result.node), edge: result.edge };
}

export async function reparentPucaraNodeAction(input: {
  schoolSlug: string;
  orgChartId: string;
  nodeId: string;
  parentNodeId: string | null;
}) {
  if (input.parentNodeId === input.nodeId) {
    throw new Error("Una caja no puede depender de sí misma.");
  }

  const nodes = await (prisma as any).orgNode.findMany({
    where: { orgChartId: input.orgChartId },
    select: { id: true },
  });
  const ids = new Set(nodes.map((node: any) => node.id));
  if (!ids.has(input.nodeId)) throw new Error("La caja no pertenece a este organigrama.");
  if (input.parentNodeId && !ids.has(input.parentNodeId)) {
    throw new Error("La caja superior elegida no pertenece a este organigrama.");
  }

  const edges = await (prisma as any).orgEdge.findMany({
    where: { orgChartId: input.orgChartId, type: "JERARQUICA" },
  });

  // Evita ciclos: el nuevo padre no puede estar debajo del nodo actual.
  if (input.parentNodeId) {
    const children = new Map<string, string[]>();
    edges.forEach((edge: any) => {
      const list = children.get(edge.sourceId) ?? [];
      list.push(edge.targetId);
      children.set(edge.sourceId, list);
    });
    const stack = [input.nodeId];
    const descendants = new Set<string>();
    while (stack.length) {
      const id = stack.pop()!;
      for (const child of children.get(id) ?? []) {
        if (!descendants.has(child)) {
          descendants.add(child);
          stack.push(child);
        }
      }
    }
    if (descendants.has(input.parentNodeId)) {
      throw new Error("No se puede mover una caja debajo de una de sus propias dependencias.");
    }
  }

  const edge = await prisma.$transaction(async (tx) => {
    await (tx as any).orgEdge.deleteMany({
      where: {
        orgChartId: input.orgChartId,
        targetId: input.nodeId,
        type: "JERARQUICA",
      },
    });

    if (input.parentNodeId) {
      return (tx as any).orgEdge.create({
        data: {
          orgChartId: input.orgChartId,
          sourceId: input.parentNodeId,
          targetId: input.nodeId,
          type: "JERARQUICA",
          label: null,
        },
      });
    }

    return null;
  });

  revalidateSchool(input.schoolSlug);
  return { ok: true, edge };
}

export async function deletePucaraNodeAction(input: {
  schoolSlug: string;
  nodeId: string;
}) {
  const childCount = await (prisma as any).orgEdge.count({
    where: { sourceId: input.nodeId, type: "JERARQUICA" },
  });

  if (childCount > 0) {
    throw new Error("Esta caja tiene dependencias. Mové o eliminá primero las cajas inferiores.");
  }

  await (prisma as any).orgNode.delete({ where: { id: input.nodeId } });
  revalidateSchool(input.schoolSlug);
  return { ok: true, nodeId: input.nodeId };
}

export async function upsertPucaraMemberAction(input: {
  schoolSlug: string;
  orgNodeId: string;
  memberId?: string | null;
  personId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  roleTitle?: string | null;
  weeklyHours?: string | number | null;
  email?: string | null;
  photoUrl?: string | null;
}) {
  const node = await getNodeWithPeople(input.orgNodeId);
  if (!node) throw new Error("No se encontró la caja.");

  const firstName = textOrNull(input.firstName);
  const lastName = textOrNull(input.lastName);
  const requestedPersonId = textOrNull(input.personId);
  if (!requestedPersonId && !firstName && !lastName) {
    throw new Error("Elegí una persona existente o ingresá su nombre.");
  }

  const weeklyHours = hoursOrNull(input.weeklyHours);
  const email = textOrNull(input.email);
  const photoUrl = normalizePhotoUrl(input.photoUrl);
  const roleTitle = textOrNull(input.roleTitle);

  await prisma.$transaction(async (tx) => {
    if (input.memberId) {
      const membership = await (tx as any).orgNodeMember.findFirst({
        where: { id: input.memberId, orgNodeId: input.orgNodeId },
        include: { person: true },
      });
      if (!membership) throw new Error("No se encontró la persona dentro de esta caja.");

      let person = membership.person;
      if (requestedPersonId && requestedPersonId !== "__new__" && requestedPersonId !== person.id) {
        const selected = await (tx as any).person.findFirst({
          where: { id: requestedPersonId, schoolId: node.orgChart.schoolId, active: true },
        });
        if (!selected) throw new Error("La persona elegida no pertenece a este colegio.");
        person = selected;
      }

      person = await (tx as any).person.update({
        where: { id: person.id },
        data: {
          firstName: firstName || person.firstName,
          lastName: lastName ?? person.lastName,
          email: email ?? person.email,
          photoUrl: photoUrl ?? person.photoUrl,
        },
      });

      await (tx as any).orgNodeMember.update({
        where: { id: membership.id },
        data: { personId: person.id, roleTitle, weeklyHours },
      });
      return;
    }

    let person = null;
    if (requestedPersonId && requestedPersonId !== "__new__") {
      person = await (tx as any).person.findFirst({
        where: { id: requestedPersonId, schoolId: node.orgChart.schoolId, active: true },
      });
      if (!person) throw new Error("La persona elegida no pertenece a este colegio.");
    }

    if (!person && (firstName || lastName)) {
      person = await (tx as any).person.findFirst({
        where: {
          schoolId: node.orgChart.schoolId,
          firstName: { equals: firstName || "Sin nombre", mode: "insensitive" },
          lastName: { equals: lastName || "", mode: "insensitive" },
          active: true,
        },
      });
    }

    if (!person) {
      person = await (tx as any).person.create({
        data: {
          schoolId: node.orgChart.schoolId,
          firstName: firstName || "Sin nombre",
          lastName: lastName || "",
          email,
          photoUrl,
          active: true,
        },
      });
    } else if (firstName || lastName || email || photoUrl) {
      person = await (tx as any).person.update({
        where: { id: person.id },
        data: {
          firstName: firstName || person.firstName,
          lastName: lastName ?? person.lastName,
          email: email ?? person.email,
          photoUrl: photoUrl ?? person.photoUrl,
        },
      });
    }

    const existing = await (tx as any).orgNodeMember.findFirst({
      where: { orgNodeId: input.orgNodeId, personId: person.id },
    });

    if (existing) {
      await (tx as any).orgNodeMember.update({
        where: { id: existing.id },
        data: { roleTitle, weeklyHours },
      });
    } else {
      const order =
        (await (tx as any).orgNodeMember.count({ where: { orgNodeId: input.orgNodeId } })) + 1;
      await (tx as any).orgNodeMember.create({
        data: {
          orgNodeId: input.orgNodeId,
          personId: person.id,
          role: "EQUIPO",
          roleTitle,
          weeklyHours,
          order,
        },
      });
    }
  });

  const updatedNode = await getNodeWithPeople(input.orgNodeId);
  revalidateSchool(input.schoolSlug);
  return normalizeNode(updatedNode);
}

export async function deletePucaraMemberAction(input: {
  schoolSlug: string;
  orgNodeId: string;
  memberId: string;
}) {
  await (prisma as any).orgNodeMember.delete({ where: { id: input.memberId } });
  const updatedNode = await getNodeWithPeople(input.orgNodeId);
  revalidateSchool(input.schoolSlug);
  return normalizeNode(updatedNode);
}

function safeId(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

function areaForNode(node: PucaraHitoNode) {
  const text = `${node.key} ${node.title} ${node.role}`.toLowerCase();
  if (text.includes("capellan")) return "CAPELLANIA";
  if (text.includes("familia")) return "FAMILIA";
  if (text.includes("postul")) return "POSTULACIONES";
  if (text.includes("recepción") || text.includes("recepcion") || text.includes("comunicación") || text.includes("comunicacion")) return "COMUNICACION";
  if (text.includes("admin") || text.includes("factur") || text.includes("contabil") || text.includes("rrhh")) return "ADMINISTRACION";
  if (text.includes("mantenimiento") || text.includes("limpieza") || text.includes("conserje")) return "OPERACIONES";
  if (text.includes("tutor")) return "TUTORIA";
  if (text.includes("director") || text.includes("consejo")) return "DIRECCION";
  if (text.includes("nivel") || text.includes("docente") || text.includes("inglés") || text.includes("ingles") || text.includes("preceptor") || text.includes("doe")) return "ACADEMICA";
  return "OTRO";
}

function descriptionForTemplate(node: PucaraHitoNode) {
  const text = `${node.title} ${node.role}`.toLowerCase();

  if (text.includes("consejo")) return "Define criterios, prioridades y acompaña la conducción general del colegio.";
  if (text.includes("director general")) return "Conduce la vida institucional y articula las decisiones de los distintos equipos.";
  if (text.includes("nivel primario") && text.includes("secretar")) return "Organiza la gestión administrativa y el funcionamiento cotidiano del Nivel Primario.";
  if (text.includes("nivel primario") && text.includes("director")) return "Coordina y acompaña la gestión académica y operativa del Nivel Primario.";
  if (text.includes("nivel secundario") && text.includes("secretar")) return "Organiza la gestión administrativa y el funcionamiento cotidiano del Nivel Secundario.";
  if (text.includes("nivel secundario") && (text.includes("rector") || text.includes("vice"))) return "Conduce y acompaña la gestión académica, formativa y cotidiana del Nivel Secundario.";
  if (text.includes("docente")) return "Reúne a los docentes responsables de la enseñanza y el acompañamiento de los alumnos.";
  if (text.includes("profesores especiales")) return "Articula las propuestas de Educación Física, Música, Artística, Tecnología y otras áreas especiales.";
  if (text.includes("preceptor")) return "Acompaña la vida escolar cotidiana, la organización y el seguimiento de los alumnos.";
  if (text.includes("tutor")) return "Brinda acompañamiento personal a los alumnos y articula el vínculo con sus familias y docentes.";
  if (text.includes("inglés") || text.includes("ingles")) return "Coordina la enseñanza de inglés y el trabajo de los equipos docentes de los distintos niveles.";
  if (text.includes("familia") || text.includes("comunic")) return "Fortalece el vínculo con las familias y organiza la comunicación institucional.";
  if (text.includes("postul")) return "Acompaña el ingreso de nuevas familias y su experiencia de incorporación al colegio.";
  if (text.includes("legal")) return "Brinda asesoramiento legal y acompaña decisiones que requieren soporte jurídico.";
  if (text.includes("capellan")) return "Acompaña la formación espiritual de alumnos, familias y colaboradores.";
  if (text.includes("recepción") || text.includes("recepcion")) return "Recibe y orienta a las familias y brinda soporte cotidiano a la comunidad educativa.";
  if (text.includes("tic") || text.includes("colegium")) return "Da soporte a las herramientas tecnológicas y plataformas utilizadas por el colegio.";
  if (text.includes("factur") || text.includes("cobran")) return "Gestiona la facturación, cobranzas y seguimiento administrativo de las familias.";
  if (text.includes("contabil") || text.includes("tesorer")) return "Organiza la gestión contable, financiera y de tesorería del colegio.";
  if (text.includes("rrhh") || text.includes("recursos humanos")) return "Acompaña la gestión de las personas, documentación laboral y procesos de Recursos Humanos.";
  if (text.includes("mantenimiento") || text.includes("operaciones")) return "Sostiene el funcionamiento cotidiano, los recursos, servicios e infraestructura del colegio.";
  if (text.includes("limpieza") || text.includes("conserj")) return "Asegura la limpieza, el orden y el soporte general de los espacios institucionales.";
  if (text.includes("orientación escolar") || text.includes("orientacion escolar") || text.includes("doe")) return "Acompaña las necesidades pedagógicas, psicológicas y de orientación de alumnos y equipos docentes.";
  if (text.includes("admin")) return "Ordena procesos administrativos, documentación y soporte institucional.";
  return node.role;
}

function templateCardHeight(node: PucaraHitoNode) {
  const count = (node.principal ? 1 : 0) + (node.members?.length ?? 0);
  if (count <= 1) return 233;
  return 126 + 70 + Math.ceil(count / 2) * 72 + 48;
}

const HIERARCHY_COLORS = ["#1C3A62", "#2E6B4B", "#ECC300", "#6B7280", "#94A3B8"];

function buildTemplateDepths(nodes: PucaraHitoNode[]) {
  const byKey = new Map(nodes.map((node) => [node.key, node]));
  const depths = new Map<string, number>();
  const resolve = (key: string): number => {
    if (depths.has(key)) return depths.get(key)!;
    const node = byKey.get(key);
    if (!node?.parentKey) {
      depths.set(key, 0);
      return 0;
    }
    const depth = resolve(node.parentKey) + 1;
    depths.set(key, depth);
    return depth;
  };
  nodes.forEach((node) => resolve(node.key));
  return depths;
}

function buildTemplatePositions(nodes: PucaraHitoNode[]) {
  const children = new Map<string, string[]>();
  nodes.forEach((node) => {
    if (!node.parentKey) return;
    const list = children.get(node.parentKey) ?? [];
    list.push(node.key);
    children.set(node.parentKey, list);
  });

  const depths = buildTemplateDepths(nodes);
  const maxHeightByDepth = new Map<number, number>();
  nodes.forEach((node) => {
    const depth = depths.get(node.key) ?? 0;
    maxHeightByDepth.set(
      depth,
      Math.max(maxHeightByDepth.get(depth) ?? 0, templateCardHeight(node)),
    );
  });

  const yByDepth = new Map<number, number>();
  const maxDepth = Math.max(...Array.from(depths.values()), 0);
  let cursorY = 80;
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    yByDepth.set(depth, cursorY);
    cursorY += (maxHeightByDepth.get(depth) ?? 233) + 190;
  }

  const roots = nodes.filter((node) => !node.parentKey).map((node) => node.key);
  const raw = new Map<string, { x: number; y: number }>();
  let leafCursor = 0;
  const X_GAP = 520;

  const visit = (key: string, depth: number): number => {
    const kids = children.get(key) ?? [];
    let x: number;
    if (!kids.length) {
      x = leafCursor * X_GAP;
      leafCursor += 1;
    } else {
      const childXs = kids.map((child) => visit(child, depth + 1));
      x = childXs.reduce((sum, value) => sum + value, 0) / childXs.length;
    }
    raw.set(key, { x, y: yByDepth.get(depth) ?? 80 });
    return x;
  };

  roots.forEach((root) => visit(root, 0));
  const values = Array.from(raw.values());
  const minX = Math.min(...values.map((value) => value.x), 0);
  const minY = Math.min(...values.map((value) => value.y), 0);
  const positions = new Map<string, { x: number; y: number }>();
  raw.forEach((value, key) => {
    positions.set(key, { x: value.x - minX + 80, y: value.y - minY + 80 });
  });
  return positions;
}

function templatePersonId(schoolSlug: string, sourceId: string) {
  return `pucara-hito-person-${safeId(schoolSlug)}-${safeId(sourceId)}`;
}

async function upsertTemplatePeople(
  schoolId: string,
  schoolSlug: string,
  people: PucaraHitoPerson[],
) {
  // El HITO reutiliza algunas personas en más de una caja (por ejemplo,
  // Consejo + su cargo individual). Nos quedamos con la última aparición,
  // igual que hacía el importador secuencial anterior, pero sin mantener
  // abierta una transacción durante más de cien queries.
  const unique = new Map<string, PucaraHitoPerson>();
  for (const person of people) unique.set(person.sourceId, person);

  const list = Array.from(unique.values());
  const BATCH_SIZE = 12;

  for (let index = 0; index < list.length; index += BATCH_SIZE) {
    const batch = list.slice(index, index + BATCH_SIZE);
    await Promise.all(
      batch.map((person) => {
        const id = templatePersonId(schoolSlug, person.sourceId);
        return (prisma as any).person.upsert({
          where: { id },
          update: {
            schoolId,
            firstName: person.name,
            lastName: "",
            formalRole: person.role,
            weeklyHours: hoursOrNull(person.hours),
            active: true,
          },
          create: {
            id,
            schoolId,
            firstName: person.name,
            lastName: "",
            formalRole: person.role,
            weeklyHours: hoursOrNull(person.hours),
            active: true,
          },
        });
      }),
    );
  }
}

export async function importPucaraHitoAction(input: { schoolSlug: string }) {
  const school = await (prisma as any).school.findUnique({
    where: { slug: input.schoolSlug },
  });
  if (!school) throw new Error("No se encontró el colegio.");

  const chartId = `pucara-hito-${safeId(school.id)}-2026`;
  const positions = buildTemplatePositions(PUCARA_HITO_NODES);
  const depths = buildTemplateDepths(PUCARA_HITO_NODES);

  const chart = await (prisma as any).orgChart.upsert({
    where: { id: chartId },
    update: {
      title: "Organigrama Pucará 2026 · Modelo HITO completo",
      year: 2026,
      status: "DRAFT",
      summary: "Copia de prueba del organigrama jerárquico del proyecto HITO, preparada para edición dentro de la plataforma APDES.",
    },
    create: {
      id: chartId,
      schoolId: school.id,
      title: "Organigrama Pucará 2026 · Modelo HITO completo",
      year: 2026,
      status: "DRAFT",
      version: 1,
      summary: "Copia de prueba del organigrama jerárquico del proyecto HITO, preparada para edición dentro de la plataforma APDES.",
    },
  });

  // 1) Personas: se cargan FUERA de la transacción. El importador anterior hacía
  // más de 100 upserts + inserts dentro de una transacción interactiva de 5 s,
  // por eso Prisma terminaba con P2028 antes de llegar al final.
  const templatePeople: PucaraHitoPerson[] = [];
  for (const template of PUCARA_HITO_NODES) {
    if (template.principal) templatePeople.push(template.principal);
    templatePeople.push(...(template.members ?? []));
  }
  await upsertTemplatePeople(school.id, school.slug, templatePeople);

  // 2) Armamos todo en memoria y dejamos la transacción solamente para cinco
  // operaciones masivas. Así sigue siendo atómico el reemplazo del organigrama,
  // pero ya no depende del timeout de 5 segundos para cientos de queries.
  const nodeIdByKey = new Map<string, string>();
  for (const template of PUCARA_HITO_NODES) {
    nodeIdByKey.set(
      template.key,
      `pucara-hito-node-${safeId(school.id)}-${safeId(template.key)}`,
    );
  }

  const nodeRows = PUCARA_HITO_NODES.map((template, index) => {
    const position = positions.get(template.key) ?? { x: 0, y: 0 };
    const depth = depths.get(template.key) ?? 0;
    return {
      id: nodeIdByKey.get(template.key)!,
      orgChartId: chart.id,
      personId: template.principal
        ? templatePersonId(school.slug, template.principal.sourceId)
        : null,
      title: template.title,
      area: areaForNode(template),
      formalRole: template.role,
      realFunction: template.role,
      description: descriptionForTemplate(template),
      weeklyHours: hoursOrNull(template.principal?.hours),
      positionX: position.x,
      positionY: position.y,
      color: HIERARCHY_COLORS[Math.min(depth, HIERARCHY_COLORS.length - 1)],
      icon: "network",
      order: index + 1,
    };
  });

  const memberRows = PUCARA_HITO_NODES.flatMap((template) => {
    const nodeId = nodeIdByKey.get(template.key)!;
    return (template.members ?? []).map((member, memberIndex) => ({
      orgNodeId: nodeId,
      personId: templatePersonId(school.slug, member.sourceId),
      role: "EQUIPO" as const,
      roleTitle: member.role,
      weeklyHours: hoursOrNull(member.hours),
      notes: member.kind && member.kind !== "Titular" ? member.kind : null,
      order: memberIndex + 1,
    }));
  });

  const edgeRows = PUCARA_HITO_NODES.flatMap((template) => {
    if (!template.parentKey) return [];
    const sourceId = nodeIdByKey.get(template.parentKey);
    const targetId = nodeIdByKey.get(template.key);
    if (!sourceId || !targetId) return [];
    return [{
      orgChartId: chart.id,
      sourceId,
      targetId,
      type: "JERARQUICA" as const,
      label: null,
    }];
  });

  await prisma.$transaction(
    async (tx) => {
      await (tx as any).orgEdge.deleteMany({ where: { orgChartId: chart.id } });
      await (tx as any).orgNode.deleteMany({ where: { orgChartId: chart.id } });

      if (nodeRows.length) {
        await (tx as any).orgNode.createMany({ data: nodeRows });
      }
      if (memberRows.length) {
        await (tx as any).orgNodeMember.createMany({ data: memberRows });
      }
      if (edgeRows.length) {
        await (tx as any).orgEdge.createMany({ data: edgeRows });
      }
    },
    { maxWait: 10_000, timeout: 30_000 },
  );

  revalidateSchool(input.schoolSlug);
  return {
    chartId: chart.id,
    title: chart.title,
    nodes: nodeRows.length,
    members: memberRows.length,
  };
}

