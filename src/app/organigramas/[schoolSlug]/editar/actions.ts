"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../../../../lib/prisma";

function textOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const NODE_AREAS = [
  "DIRECCION",
  "ACADEMICA",
  "FORMACION",
  "FAMILIA",
  "COMUNICACION",
  "POSTULACIONES",
  "OPERACIONES",
  "ADMINISTRACION",
  "TUTORIA",
  "CAPELLANIA",
  "OTRO",
] as const;

const EDGE_TYPES = [
  "JERARQUICA",
  "TRANSVERSAL",
  "COLABORACION",
  "ACOMPANAMIENTO",
  "DECISION",
  "INFORMACION",
] as const;

const MEMBER_ROLES = ["RESPONSABLE", "EQUIPO", "APOYO", "EXTERNO"] as const;
const CHART_STATUSES = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] as const;

type NodeAreaValue = (typeof NODE_AREAS)[number];
type EdgeTypeValue = (typeof EDGE_TYPES)[number];
type MemberRoleValue = (typeof MEMBER_ROLES)[number];
type ChartStatusValue = (typeof CHART_STATUSES)[number];

function safeArea(value: string): NodeAreaValue {
  return NODE_AREAS.includes(value as NodeAreaValue) ? (value as NodeAreaValue) : "OTRO";
}

function safeEdgeType(value: string): EdgeTypeValue {
  return EDGE_TYPES.includes(value as EdgeTypeValue) ? (value as EdgeTypeValue) : "JERARQUICA";
}

function safeMemberRole(value: string): MemberRoleValue {
  return MEMBER_ROLES.includes(value as MemberRoleValue) ? (value as MemberRoleValue) : "EQUIPO";
}

function safeChartStatus(value: string): ChartStatusValue {
  return CHART_STATUSES.includes(value as ChartStatusValue) ? (value as ChartStatusValue) : "DRAFT";
}

const defaultColorsByArea: Record<string, string> = {
  DIRECCION: "#1d4ed8",
  ACADEMICA: "#0f766e",
  FORMACION: "#7c3aed",
  FAMILIA: "#d97706",
  COMUNICACION: "#0284c7",
  POSTULACIONES: "#be123c",
  OPERACIONES: "#475569",
  ADMINISTRACION: "#334155",
  TUTORIA: "#9333ea",
  CAPELLANIA: "#166534",
  OTRO: "#2563eb",
};

const defaultIconsByArea: Record<string, string> = {
  DIRECCION: "landmark",
  ACADEMICA: "graduation-cap",
  FORMACION: "book-open",
  FAMILIA: "users",
  COMUNICACION: "megaphone",
  POSTULACIONES: "pen-tool",
  OPERACIONES: "building",
  ADMINISTRACION: "shield-check",
  TUTORIA: "handshake",
  CAPELLANIA: "heart-handshake",
  OTRO: "network",
};

function revalidateOrganigrama(schoolSlug: string) {
  revalidatePath("/organigramas");
  revalidatePath(`/organigramas/${schoolSlug}`);
  revalidatePath(`/organigramas/${schoolSlug}/editar`);
}

function normalizeNode(node: any) {
  return {
    ...node,
    icon: node.icon ?? null,
    members: node.members ?? [],
  };
}


async function getNextNodeOrder(orgChartId: string) {
  const count = await (prisma as any).orgNode.count({ where: { orgChartId } });
  return count + 1;
}

async function getNextMemberOrder(orgNodeId: string) {
  const count = await (prisma as any).orgNodeMember.count({ where: { orgNodeId } });
  return count + 1;
}


export async function deleteOrgChartAction(input: {
  orgChartId: string;
  schoolSlug: string;
}) {
  if (!input.orgChartId) {
    throw new Error("No se encontró el organigrama para eliminar.");
  }

  await (prisma as any).orgChart.delete({
    where: { id: input.orgChartId },
  });

  revalidatePath("/");
  revalidatePath("/organigramas");
  revalidatePath(`/organigramas/${input.schoolSlug}`);
  revalidatePath(`/organigramas/${input.schoolSlug}/editar`);
  revalidatePath("/talento");
  revalidatePath(`/talento/${input.schoolSlug}`);

  redirect("/organigramas");
}

export async function deleteOrgChartFormAction(formData: FormData) {
  const orgChartId = String(formData.get("orgChartId") ?? "");
  const schoolSlug = String(formData.get("schoolSlug") ?? "");

  await deleteOrgChartAction({ orgChartId, schoolSlug });
}

export async function createNodeAction(input: {
  orgChartId: string;
  schoolSlug: string;
  title?: string;
  area?: string;
  color?: string | null;
  icon?: string | null;
  positionX?: number;
  positionY?: number;
}) {
  const area = safeArea(input.area ?? "OTRO");
  const color = textOrNull(input.color) || defaultColorsByArea[area];
  const icon = textOrNull(input.icon) || defaultIconsByArea[area];
  const nextOrder = await getNextNodeOrder(input.orgChartId);

  const node = await (prisma as any).orgNode.create({
    data: {
      orgChartId: input.orgChartId,
      title: input.title?.trim() || "Nuevo cargo o área",
      area,
      formalRole: null,
      realFunction: null,
      positionX: input.positionX ?? 520,
      positionY: input.positionY ?? 520,
      color,
      icon,
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

  revalidateOrganigrama(input.schoolSlug);
  return normalizeNode(node);
}

export async function updateNodeAction(input: {
  nodeId: string;
  schoolSlug: string;
  title: string;
  area: string;
  formalRole?: string | null;
  realFunction?: string | null;
  description?: string | null;
  weeklyHours?: number | string | null;
  color?: string | null;
  icon?: string | null;
  personId?: string | null;
  personFirstName?: string | null;
  personLastName?: string | null;
  personEmail?: string | null;
  personPhone?: string | null;
}) {
  const currentNode = await (prisma as any).orgNode.findUnique({
    where: { id: input.nodeId },
    include: { orgChart: true, person: true },
  });

  if (!currentNode) {
    throw new Error("No se encontró el nodo para actualizar.");
  }

  const area = safeArea(input.area);
  const firstName = textOrNull(input.personFirstName);
  const lastName = textOrNull(input.personLastName);
  const email = textOrNull(input.personEmail);
  const phone = textOrNull(input.personPhone);
  const weeklyHours = numberOrNull(input.weeklyHours);

  let finalPersonId: string | null = input.personId || null;
  let touchedPerson: any = null;

  if (finalPersonId === "__new__") {
    finalPersonId = null;
  }

  if (finalPersonId) {
    touchedPerson = await (prisma as any).person.update({
      where: { id: finalPersonId },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email,
        phone,
        formalRole: textOrNull(input.formalRole),
        realFunction: textOrNull(input.realFunction),
        weeklyHours,
      },
    });
  } else if (firstName || lastName || email || phone) {
    touchedPerson = await (prisma as any).person.create({
      data: {
        schoolId: currentNode.orgChart.schoolId,
        firstName: firstName || "Sin nombre",
        lastName: lastName || "",
        email,
        phone,
        formalRole: textOrNull(input.formalRole),
        realFunction: textOrNull(input.realFunction),
        weeklyHours,
      },
    });
    finalPersonId = touchedPerson.id;
  }

  const finalIcon = textOrNull(input.icon) || defaultIconsByArea[area] || "network";

  const updatedNode = await (prisma as any).orgNode.update({
    where: { id: input.nodeId },
    data: {
      title: input.title.trim() || "Sin título",
      area,
      formalRole: textOrNull(input.formalRole),
      realFunction: textOrNull(input.realFunction),
      description: textOrNull(input.description),
      weeklyHours,
      color: textOrNull(input.color) || defaultColorsByArea[area] || "#2563eb",
      icon: finalIcon,
      personId: finalPersonId,
    },
    include: {
      person: true,
      members: {
        include: { person: true },
        orderBy: [{ role: "asc" }, { order: "asc" }],
      },
    },
  });

  revalidateOrganigrama(input.schoolSlug);

  return {
    node: normalizeNode(updatedNode),
    person: touchedPerson,
  };
}

export async function moveNodeAction(input: {
  nodeId: string;
  schoolSlug: string;
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
      members: { include: { person: true } },
    },
  });

  revalidateOrganigrama(input.schoolSlug);
  return normalizeNode(node);
}

export async function updateNodesPositionsAction(input: {
  schoolSlug: string;
  positions: { nodeId: string; positionX: number; positionY: number }[];
}) {
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

  revalidateOrganigrama(input.schoolSlug);
  return { ok: true };
}

export async function deleteNodeAction(input: { nodeId: string; schoolSlug: string }) {
  await (prisma as any).orgNode.delete({ where: { id: input.nodeId } });
  revalidateOrganigrama(input.schoolSlug);
  return { ok: true, nodeId: input.nodeId };
}

export async function createEdgeAction(input: {
  orgChartId: string;
  schoolSlug: string;
  sourceId: string;
  targetId: string;
  type: string;
  label?: string | null;
}) {
  const edge = await (prisma as any).orgEdge.create({
    data: {
      orgChartId: input.orgChartId,
      sourceId: input.sourceId,
      targetId: input.targetId,
      type: safeEdgeType(input.type),
      label: textOrNull(input.label),
    },
  });

  revalidateOrganigrama(input.schoolSlug);
  return edge;
}

export async function updateEdgeAction(input: {
  edgeId: string;
  schoolSlug: string;
  type: string;
  label?: string | null;
}) {
  const edge = await (prisma as any).orgEdge.update({
    where: { id: input.edgeId },
    data: {
      type: safeEdgeType(input.type),
      label: textOrNull(input.label),
    },
  });

  revalidateOrganigrama(input.schoolSlug);
  return edge;
}

export async function deleteEdgeAction(input: { edgeId: string; schoolSlug: string }) {
  await (prisma as any).orgEdge.delete({ where: { id: input.edgeId } });
  revalidateOrganigrama(input.schoolSlug);
  return { ok: true, edgeId: input.edgeId };
}

export async function createOrUpdateNodeMemberAction(input: {
  schoolSlug: string;
  orgNodeId: string;
  memberId?: string | null;
  personId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  roleTitle?: string | null;
  weeklyHours?: number | string | null;
  notes?: string | null;
}) {
  const node = await (prisma as any).orgNode.findUnique({
    where: { id: input.orgNodeId },
    include: { orgChart: true },
  });

  if (!node) throw new Error("No se encontró el nodo.");

  const firstName = textOrNull(input.firstName);
  const lastName = textOrNull(input.lastName);
  const email = textOrNull(input.email);
  const phone = textOrNull(input.phone);
  const weeklyHours = numberOrNull(input.weeklyHours);
  const role = safeMemberRole(input.role);

  let personId = input.personId || null;
  if (personId === "__new__") personId = null;
  const nextMemberOrder = input.memberId ? undefined : await getNextMemberOrder(input.orgNodeId);

  if (personId) {
    await (prisma as any).person.update({
      where: { id: personId },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email,
        phone,
      },
    });
  } else {
    const person = await (prisma as any).person.create({
      data: {
        schoolId: node.orgChart.schoolId,
        firstName: firstName || "Sin nombre",
        lastName: lastName || "",
        email,
        phone,
      },
    });
    personId = person.id;
  }

  const data: Record<string, unknown> = {
    personId,
    role,
    roleTitle: textOrNull(input.roleTitle),
    weeklyHours,
    notes: textOrNull(input.notes),
  };

  if (nextMemberOrder !== undefined) {
    data.order = nextMemberOrder;
  }

  const member = input.memberId
    ? await (prisma as any).orgNodeMember.update({
        where: { id: input.memberId },
        data,
        include: { person: true },
      })
    : await (prisma as any).orgNodeMember.create({
        data: {
          orgNodeId: input.orgNodeId,
          ...data,
        },
        include: { person: true },
      });

  const updatedNode = await (prisma as any).orgNode.findUnique({
    where: { id: input.orgNodeId },
    include: {
      person: true,
      members: {
        include: { person: true },
        orderBy: [{ role: "asc" }, { order: "asc" }],
      },
    },
  });

  revalidateOrganigrama(input.schoolSlug);
  return { member, node: normalizeNode(updatedNode) };
}

export async function deleteNodeMemberAction(input: {
  schoolSlug: string;
  memberId: string;
  orgNodeId: string;
}) {
  await (prisma as any).orgNodeMember.delete({ where: { id: input.memberId } });

  const updatedNode = await (prisma as any).orgNode.findUnique({
    where: { id: input.orgNodeId },
    include: {
      person: true,
      members: {
        include: { person: true },
        orderBy: [{ role: "asc" }, { order: "asc" }],
      },
    },
  });

  revalidateOrganigrama(input.schoolSlug);
  return { ok: true, memberId: input.memberId, node: normalizeNode(updatedNode) };
}

export async function updateOrgChartStatusAction(input: {
  orgChartId: string;
  schoolSlug: string;
  status: "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
  summary?: string | null;
}) {
  const status = safeChartStatus(input.status);
  const now = new Date();

  const chart = await (prisma as any).orgChart.update({
    where: { id: input.orgChartId },
    data: {
      status,
      summary: textOrNull(input.summary),
      reviewRequestedAt: status === "REVIEW" ? now : undefined,
      reviewedAt: status === "PUBLISHED" ? now : undefined,
      publishedAt: status === "PUBLISHED" ? now : undefined,
      archivedAt: status === "ARCHIVED" ? now : undefined,
      version: status === "PUBLISHED" ? { increment: 1 } : undefined,
    },
  });

  revalidateOrganigrama(input.schoolSlug);
  return chart;
}

export async function createReviewNoteAction(input: {
  orgChartId: string;
  schoolSlug: string;
  nodeId?: string | null;
  title: string;
  body?: string | null;
}) {
  const note = await (prisma as any).orgReviewNote.create({
    data: {
      orgChartId: input.orgChartId,
      nodeId: input.nodeId || null,
      title: input.title.trim() || "Observación de revisión",
      body: textOrNull(input.body),
      status: "OPEN",
    },
  });

  revalidateOrganigrama(input.schoolSlug);
  return note;
}

export async function resolveReviewNoteAction(input: {
  schoolSlug: string;
  noteId: string;
}) {
  const note = await (prisma as any).orgReviewNote.update({
    where: { id: input.noteId },
    data: { status: "RESOLVED" },
  });

  revalidateOrganigrama(input.schoolSlug);
  return note;
}
