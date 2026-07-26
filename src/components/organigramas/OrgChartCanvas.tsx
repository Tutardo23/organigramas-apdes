"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  ChevronRight,
  CircleDot,
  Eye,
  FileText,
  GitBranch,
  GraduationCap,
  Handshake,
  Info,
  Landmark,
  Layers3,
  Mail,
  Network,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isElBuenAyreNewProposal } from "../../lib/org-chart-design";
import { isCollectiveGovernanceNode } from "../../lib/org-chart-template";
import {
  areaLabels,
  edgeLabels,
  getIcon,
  memberRoleLabels,
  type OrgEdgeData,
  type OrgNodeData,
} from "./OrgNodeCard";
import { LegacyOrgChartCanvas } from "./LegacyOrgChartCanvas";

type Props = {
  nodes: OrgNodeData[];
  edges: OrgEdgeData[];
  schoolSlug: string;
  orgChartTitle?: string | null;
  designMode?: "legacy" | "institutional";
  editable?: boolean;
  selectedNodeId?: string | null;
  hideDetailDrawer?: boolean;
  onNodeSelect?: (nodeId: string | null) => void;
  onNodeMove?: (input: { nodeId: string; positionX: number; positionY: number }) => void;
  onNodesMove?: (positions: Array<{ nodeId: string; positionX: number; positionY: number }>) => void;
  onEdgeSelect?: (edgeId: string) => void;
};

type SectionKey =
  | "overview"
  | "academic"
  | "orientation"
  | "development"
  | "administration"
  | "operations";

type RelationMode = "structure" | "collaboration" | "integration" | "all";
type CanvasViewMode = "institutional" | "sections";
type RelationScope = "all" | "focus";
type AreasLayoutPoint = { positionX: number; positionY: number };
type AreasLayoutMap = Record<string, AreasLayoutPoint>;

type SectionDefinition = {
  key: Exclude<SectionKey, "overview">;
  label: string;
  shortLabel: string;
  description: string;
  Icon: LucideIcon;
};

type FocusedNodeData = OrgNodeData & {
  viewerState: {
    dimmed: boolean;
    emphasized: boolean;
    isSectionHeader: boolean;
    editable: boolean;
  };
};

type InstitutionalMapNodeData = OrgNodeData & {
  mapState: {
    kind: "director" | "council" | "section" | "regular";
    width: number;
    dimmed: boolean;
    emphasized: boolean;
    editable: boolean;
  };
};

const sectionDefinitions: SectionDefinition[] = [
  {
    key: "academic",
    label: "Área Académica",
    shortLabel: "Académica",
    description: "Niveles, equipos directivos, docentes y apoyos académicos.",
    Icon: GraduationCap,
  },
  {
    key: "orientation",
    label: "Área de Orientación",
    shortLabel: "Orientación",
    description: "Tutoría, deporte, formación, acompañamiento y servicio.",
    Icon: Handshake,
  },
  {
    key: "development",
    label: "Desarrollo Institucional",
    shortLabel: "Desarrollo",
    description: "Familias, comunicación, postulaciones, sistemas y alumni.",
    Icon: Network,
  },
  {
    key: "administration",
    label: "Área de Administración",
    shortLabel: "Administración",
    description: "Presupuesto, sueldos, cobranzas y gestión administrativa.",
    Icon: ShieldCheck,
  },
  {
    key: "operations",
    label: "Área de Operaciones",
    shortLabel: "Operaciones",
    description: "Limpieza, infraestructura, mantenimiento y seguridad.",
    Icon: Wrench,
  },
];

const canonicalSectionOrder: Array<Exclude<SectionKey, "overview">> = [
  "academic",
  "orientation",
  "development",
  "administration",
  "operations",
];

const relationOptions: Array<{
  key: RelationMode;
  label: string;
  description: string;
}> = [
  {
    key: "structure",
    label: "Estructura",
    description: "Solo dependencias jerárquicas",
  },
  {
    key: "collaboration",
    label: "Colabora",
    description: "Agrega relaciones de colaboración",
  },
  {
    key: "integration",
    label: "Integra",
    description: "Muestra completas las áreas vinculadas por integración",
  },
  {
    key: "all",
    label: "Todas",
    description: "Muestra juntas todas las relaciones y las áreas vinculadas",
  },
];

const edgeColors: Record<string, string> = {
  JERARQUICA: "#15803d",
  TRANSVERSAL: "#b45309",
  COLABORACION: "#2563eb",
  ACOMPANAMIENTO: "#7c3aed",
  DECISION: "#dc2626",
  INFORMACION: "#64748b",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function sectionForNode(
  node: OrgNodeData,
): Exclude<SectionKey, "overview"> | "governance" {
  const title = normalize(node.title);

  if (
    title.includes("directora general") ||
    title.includes("director general") ||
    title.includes("consejo de direccion")
  ) {
    return "governance";
  }

  if (
    node.area === "OPERACIONES" ||
    title.includes("operaciones") ||
    title.includes("limpieza") ||
    title.includes("infraestructura") ||
    title.includes("mantenimiento") ||
    title.includes("seguridad")
  ) {
    return "operations";
  }

  if (
    node.area === "ADMINISTRACION" ||
    title.includes("administracion") ||
    title.includes("administradora") ||
    title.includes("presupuesto") ||
    title.includes("sueldos") ||
    title.includes("cobranzas")
  ) {
    return "administration";
  }

  if (
    node.area === "FAMILIA" ||
    node.area === "COMUNICACION" ||
    node.area === "POSTULACIONES" ||
    title.includes("desarrollo institucional") ||
    title.includes("familia") ||
    title.includes("comunicacion") ||
    title.includes("marketing") ||
    title.includes("postulaciones") ||
    title.includes("admisiones") ||
    title.includes("sistemas") ||
    title.includes("alumni")
  ) {
    return "development";
  }

  if (
    node.area === "TUTORIA" ||
    node.area === "CAPELLANIA" ||
    title.includes("orientacion") ||
    title.includes("tutoria") ||
    title.includes("tutoras") ||
    title.includes("deporte") ||
    title.includes("fe y vida") ||
    title.includes("das") ||
    title.includes("voluntarios")
  ) {
    return "orientation";
  }

  if (
    node.area === "ACADEMICA" ||
    title.includes("academ") ||
    title.includes("nivel inicial") ||
    title.includes("nivel primar") ||
    title.includes("nivel secund") ||
    title.includes("equipo docente") ||
    title.includes("eoe") ||
    title.includes("pecs")
  ) {
    return "academic";
  }

  if (node.area === "FORMACION") return "orientation";
  if (node.area === "DIRECCION") return "governance";
  return "academic";
}

function isSectionHeader(node: OrgNodeData) {
  const title = normalize(node.title);
  return title.startsWith("area ") || title.startsWith("area de ");
}

function getResponsible(node: OrgNodeData) {
  if (isCollectiveGovernanceNode(node)) return null;
  return (
    node.members?.find((member) => member.role === "RESPONSABLE")?.person ??
    node.person ??
    node.members?.[0]?.person ??
    null
  );
}

function personName(
  person:
    | {
        firstName: string;
        lastName: string;
      }
    | null
    | undefined,
) {
  if (!person) return null;
  return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || null;
}

function peopleIdsForNode(node: OrgNodeData) {
  return new Set([
    ...(node.person?.id ? [node.person.id] : []),
    ...(node.members ?? []).map((member) => member.person.id),
  ]);
}

function isCollectiveNode(node: OrgNodeData) {
  const title = normalize(node.title);
  const role = normalize(node.formalRole ?? "");
  return (
    isCollectiveGovernanceNode(node) ||
    title.includes("consejo") ||
    title.includes("comite") ||
    role.includes("organo colegiado")
  );
}

function FocusedNode({ data, selected }: NodeProps<Node<FocusedNodeData>>) {
  const collective = isCollectiveNode(data);
  const responsible = personName(getResponsible(data));
  const peopleCount = peopleIdsForNode(data).size;
  const team =
    data.formalRole === "Equipo" ||
    /^(equipo|personal|tutoras|voluntarios|presupuesto|cobranzas|liquidacion)/.test(
      normalize(data.title),
    );

  const treatment = data.viewerState.isSectionHeader
    ? "border-blue-700 bg-blue-700 text-white shadow-[0_12px_30px_rgba(29,78,216,0.2)]"
    : collective
      ? "border-rose-300 bg-rose-50 text-slate-950"
      : team
        ? "border-slate-300 bg-slate-100 text-slate-950"
        : "border-emerald-300 bg-white text-slate-950";

  return (
    <>
      <Handle
        id="top-target"
        type="target"
        position={Position.Top}
        className="opacity-0"
      />
      <Handle
        id="top-source"
        type="source"
        position={Position.Top}
        className="opacity-0"
      />
      <Handle
        id="left-target"
        type="target"
        position={Position.Left}
        className="opacity-0"
      />
      <Handle
        id="left-source"
        type="source"
        position={Position.Left}
        className="opacity-0"
      />
      <button
        type="button"
        className={`group relative w-[220px] rounded-[1.15rem] border px-4 py-3 text-left transition-[box-shadow,opacity,border-color,background-color] duration-150 ${treatment} ${
          selected
            ? "ring-4 ring-blue-200 shadow-xl"
            : data.viewerState.emphasized
              ? "ring-4 ring-amber-200 shadow-lg"
              : "shadow-sm hover:shadow-md"
        } ${data.viewerState.dimmed ? "opacity-25 saturate-50" : "opacity-100"} ${
          data.viewerState.editable
            ? "cursor-grab select-none active:cursor-grabbing"
            : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
              data.viewerState.isSectionHeader
                ? "bg-white/15 text-white"
                : collective
                  ? "bg-rose-100 text-rose-700"
                  : team
                    ? "bg-white text-slate-600"
                    : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {createElement(getIcon(data.icon, data.area), {
              className: "h-4 w-4",
            })}
          </span>

          <span className="min-w-0 flex-1">
            <span
              className={`block text-[0.93rem] font-black leading-tight tracking-[-0.015em] ${
                data.viewerState.isSectionHeader ? "text-white" : "text-slate-950"
              }`}
            >
              {data.title}
            </span>
            {responsible ? (
              <span
                className={`mt-1.5 block truncate text-[0.72rem] font-bold ${
                  data.viewerState.isSectionHeader
                    ? "text-blue-100"
                    : "text-slate-500"
                }`}
              >
                {responsible}
              </span>
            ) : collective ? (
              <span className="mt-1.5 block text-[0.68rem] font-black uppercase tracking-[0.11em] text-rose-600">
                Órgano colegiado
              </span>
            ) : null}
          </span>
        </div>

        {peopleCount > 0 ? (
          <span
            className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.66rem] font-black ${
              data.viewerState.isSectionHeader
                ? "bg-white/15 text-white"
                : "bg-slate-50 text-slate-500"
            }`}
          >
            <UsersRound className="h-3.5 w-3.5" />
            {peopleCount} {peopleCount === 1 ? "persona" : "personas"}
          </span>
        ) : null}
      </button>
      <Handle
        id="right-target"
        type="target"
        position={Position.Right}
        className="opacity-0"
      />
      <Handle
        id="right-source"
        type="source"
        position={Position.Right}
        className="opacity-0"
      />
      <Handle
        id="bottom-target"
        type="target"
        position={Position.Bottom}
        className="opacity-0"
      />
      <Handle
        id="bottom-source"
        type="source"
        position={Position.Bottom}
        className="opacity-0"
      />
    </>
  );
}

function InstitutionalMapNode({
  data,
  selected,
}: NodeProps<Node<InstitutionalMapNodeData>>) {
  const { kind, width, dimmed, emphasized, editable } = data.mapState;
  const collective = kind === "council" || isCollectiveNode(data);
  const responsible = personName(getResponsible(data));
  const peopleCount = peopleIdsForNode(data).size;
  const team =
    data.formalRole === "Equipo" ||
    /^(equipo|personal|tutoras|voluntarios|presupuesto|cobranzas|liquidacion)/.test(
      normalize(data.title),
    );

  const treatment =
    kind === "section"
      ? "border-blue-300 bg-blue-100 text-blue-950"
      : kind === "director"
        ? "border-emerald-300 bg-white text-slate-950"
        : collective
          ? "border-rose-300 bg-rose-50 text-slate-950"
          : team
            ? "border-slate-300 bg-slate-100 text-slate-950"
            : "border-emerald-300 bg-white text-slate-950";

  return (
    <>
      <Handle id="top-target" type="target" position={Position.Top} className="opacity-0" />
      <Handle id="top-source" type="source" position={Position.Top} className="opacity-0" />
      <Handle id="left-target" type="target" position={Position.Left} className="opacity-0" />
      <Handle id="left-source" type="source" position={Position.Left} className="opacity-0" />
      <div
        role="button"
        tabIndex={0}
        aria-label={editable ? `Mover o editar ${data.title}` : `Ver ${data.title}`}
        className={`group relative select-none border text-left transition-[box-shadow,opacity,border-color] duration-150 ${editable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${treatment} ${
          kind === "director"
            ? "min-h-[88px] rounded-[999px] px-5 py-4 text-center"
            : kind === "section"
              ? "min-h-[58px] rounded-xl px-5 py-3 text-center"
              : "min-h-[88px] rounded-xl px-3.5 py-3"
        } ${
          selected
            ? "ring-4 ring-blue-200 shadow-xl"
            : emphasized
              ? "ring-4 ring-amber-200 shadow-lg"
              : "shadow-sm hover:shadow-md"
        } ${dimmed ? "opacity-20 saturate-50" : "opacity-100"}`}
        style={{ width }}
      >
        {kind === "section" ? (
          <span className="flex items-center justify-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
              {createElement(getIcon(data.icon, data.area), { className: "h-3.5 w-3.5" })}
            </span>
            <span className="text-[0.82rem] font-black leading-tight">{data.title}</span>
          </span>
        ) : (
          <>
            <span className={`flex items-start gap-3 ${kind === "director" ? "justify-center" : ""}`}>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  collective
                    ? "bg-rose-100 text-rose-700"
                    : kind === "director"
                      ? "bg-emerald-50 text-emerald-700"
                      : team
                        ? "bg-white text-slate-600"
                        : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {createElement(getIcon(data.icon, data.area), { className: "h-4 w-4" })}
              </span>
              <span className={kind === "director" ? "min-w-0" : "min-w-0 flex-1"}>
                <span className="block text-[0.86rem] font-black leading-tight text-slate-950">
                  {data.title}
                </span>
                {responsible ? (
                  <span className="mt-1 block truncate text-[0.68rem] font-bold text-slate-500">
                    {responsible}
                  </span>
                ) : collective ? (
                  <span className="mt-1 block text-[0.62rem] font-black uppercase tracking-[0.1em] text-rose-600">
                    Órgano colegiado
                  </span>
                ) : null}
              </span>
            </span>
            {peopleCount > 0 && kind !== "director" ? (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[0.6rem] font-black text-slate-500">
                <UsersRound className="h-3 w-3" />
                {peopleCount}
              </span>
            ) : null}
          </>
        )}
      </div>
      <Handle id="right-target" type="target" position={Position.Right} className="opacity-0" />
      <Handle id="right-source" type="source" position={Position.Right} className="opacity-0" />
      <Handle id="bottom-target" type="target" position={Position.Bottom} className="opacity-0" />
      <Handle id="bottom-source" type="source" position={Position.Bottom} className="opacity-0" />
    </>
  );
}

const nodeTypes: NodeTypes = {
  focusedNode: FocusedNode,
  institutionalMapNode: InstitutionalMapNode,
};

function buildEdge(
  edge: OrgEdgeData,
  relationMode: RelationMode,
  selectedNodeId: string | null,
  nodeById: Map<string, Node<FocusedNodeData>>,
  showRelationLabel = true,
): Edge {
  const hierarchy = edge.type === "JERARQUICA";
  const contextual =
    selectedNodeId !== null &&
    (edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId);
  const stroke = edgeColors[edge.type] ?? "#64748b";
  const secondary = !hierarchy;
  const mutedHierarchy = relationMode !== "structure";
  const source = nodeById.get(edge.sourceId);
  const target = nodeById.get(edge.targetId);
  const dx =
    source && target ? target.position.x - source.position.x : 0;
  const dy =
    source && target ? target.position.y - source.position.y : 1;
  const useHorizontal =
    !hierarchy && Math.abs(dx) > Math.abs(dy) * 1.15;
  const handles = hierarchy
    ? { sourceHandle: "bottom-source", targetHandle: "top-target" }
    : useHorizontal
      ? dx >= 0
        ? { sourceHandle: "right-source", targetHandle: "left-target" }
        : { sourceHandle: "left-source", targetHandle: "right-target" }
      : dy >= 0
        ? { sourceHandle: "bottom-source", targetHandle: "top-target" }
        : { sourceHandle: "top-source", targetHandle: "bottom-target" };

  return {
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    ...handles,
    label:
      showRelationLabel && secondary && (contextual || relationMode !== "structure")
        ? relationKindLabel(edge)
        : undefined,
    type: "smoothstep",
    interactionWidth: 30,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: hierarchy && mutedHierarchy ? "#6f8575" : stroke,
      width: 14,
      height: 14,
    },
    style: {
      stroke: hierarchy && mutedHierarchy ? "#6f8575" : stroke,
      strokeWidth: hierarchy ? (mutedHierarchy ? 1.9 : 2.1) : contextual ? 2.8 : 2.3,
      strokeDasharray: secondary ? "6 7" : undefined,
      opacity: hierarchy && mutedHierarchy ? 0.78 : 0.96,
    },
    labelStyle: {
      fill: secondary ? stroke : "#334155",
      fontWeight: 900,
      fontSize: 11,
    },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.98 },
    labelBgPadding: [8, 5],
    labelBgBorderRadius: 999,
  };
}

function relationMatchesMode(edge: OrgEdgeData, relationMode: RelationMode) {
  if (edge.type === "JERARQUICA") return false;
  if (relationMode === "all") return true;
  if (relationMode === "integration") return edge.type === "DECISION";
  if (relationMode === "collaboration") {
    return ["COLABORACION", "TRANSVERSAL", "ACOMPANAMIENTO", "INFORMACION"].includes(
      edge.type,
    );
  }
  return false;
}

function relationKindLabel(edge: Pick<OrgEdgeData, "type">) {
  return edge.type === "DECISION" ? "Integra" : "Colabora";
}


function StructuredInstitutionalCanvas({
  nodes,
  edges,
  editable,
  relationMode,
  onRelationModeChange,
  selectedNodeId,
  onNodeSelect,
  onNodeMove,
  onNodesMove,
  onEdgeSelect,
}: {
  nodes: OrgNodeData[];
  edges: OrgEdgeData[];
  editable: boolean;
  relationMode: RelationMode;
  onRelationModeChange: (mode: RelationMode) => void;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeMove?: (input: {
    nodeId: string;
    positionX: number;
    positionY: number;
  }) => void;
  onNodesMove?: (
    positions: Array<{
      nodeId: string;
      positionX: number;
      positionY: number;
    }>,
  ) => void;
  onEdgeSelect?: (edgeId: string) => void;
}) {
  const [relationScope, setRelationScope] = useState<RelationScope>("all");
  const draggingNodeIdRef = useRef<string | null>(null);
  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const selectedNode = selectedNodeId
    ? nodeById.get(selectedNodeId) ?? null
    : null;

  const nodesBySection = useMemo(() => {
    const grouped = new Map<SectionKey | "governance", OrgNodeData[]>();
    for (const node of nodes) {
      const key = sectionForNode(node);
      grouped.set(key, [...(grouped.get(key) ?? []), node]);
    }
    return grouped;
  }, [nodes]);

  const governance = nodesBySection.get("governance") ?? [];
  const director =
    governance.find(
      (node) =>
        normalize(node.title).includes("director") &&
        normalize(node.title).includes("general"),
    ) ??
    governance.find((node) => normalize(node.title).includes("general")) ??
    null;
  const council =
    governance.find(
      (node) =>
        normalize(node.title).includes("consejo") &&
        normalize(node.title).includes("direccion"),
    ) ??
    governance.find((node) => isCollectiveNode(node)) ??
    null;

  // Detectamos si las coordenadas guardadas ya pertenecen a la composición
  // Institucional. La primera vez se usa el armado automático. En el primer
  // movimiento del editor materializamos TODO ese armado en positionX/Y y,
  // desde ese momento, esas coordenadas pasan a ser la fuente de verdad.
  const storedInstitutionalLayout = useMemo(() => {
    const headers = canonicalSectionOrder
      .map((sectionKey) =>
        (nodesBySection.get(sectionKey) ?? []).find((node) =>
          isSectionHeader(node),
        ),
      )
      .filter((node): node is OrgNodeData => Boolean(node));

    if (headers.length < 3) return false;
    const ys = headers.map((node) => node.positionY).sort((a, b) => a - b);
    const median = ys[Math.floor(ys.length / 2)];
    const aligned = ys.filter((y) => Math.abs(y - median) <= 95).length;
    return aligned >= Math.min(3, headers.length) && median >= 230 && median <= 470;
  }, [nodesBySection]);

  const autoLayout = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const widths = new Map<string, number>();
    const kinds = new Map<
      string,
      InstitutionalMapNodeData["mapState"]["kind"]
    >();
    const sectionHeaderByKey = new Map<
      Exclude<SectionKey, "overview">,
      OrgNodeData
    >();
    const laneGap = 90;
    const scaleX = 0.78;
    const scaleY = 0.72;
    const topOfSections = 340;
    const topOfContent = 455;
    let laneX = 90;

    const laneInfo = canonicalSectionOrder.flatMap((sectionKey) => {
      const sectionNodes = nodesBySection.get(sectionKey) ?? [];
      if (sectionNodes.length === 0) return [];
      const header =
        sectionNodes.find((node) => isSectionHeader(node)) ?? null;
      const content = sectionNodes.filter((node) => node.id !== header?.id);
      const basis = content.length > 0 ? content : sectionNodes;
      const minX = Math.min(...basis.map((node) => node.positionX));
      const maxX = Math.max(...basis.map((node) => node.positionX));
      const minY = Math.min(...basis.map((node) => node.positionY));
      const spreadWidth = Math.max(0, maxX - minX) * scaleX;
      const laneWidth = Math.max(430, Math.min(1040, spreadWidth + 300));
      return [
        {
          sectionKey,
          header,
          content,
          minX,
          minY,
          laneWidth,
        },
      ];
    });

    for (const info of laneInfo) {
      const { sectionKey, header, content, minX, minY, laneWidth } = info;
      if (header) {
        const headerWidth = Math.max(300, laneWidth - 40);
        sectionHeaderByKey.set(sectionKey, header);
        positions.set(header.id, {
          x: laneX + (laneWidth - headerWidth) / 2,
          y: topOfSections,
        });
        widths.set(header.id, headerWidth);
        kinds.set(header.id, "section");
      }

      for (const node of content) {
        positions.set(node.id, {
          x: laneX + 30 + (node.positionX - minX) * scaleX,
          y: topOfContent + (node.positionY - minY) * scaleY,
        });
        widths.set(node.id, 190);
        kinds.set(node.id, "regular");
      }
      laneX += laneWidth + laneGap;
    }

    const totalWidth = Math.max(1200, laneX - laneGap + 90);
    const centerX = totalWidth / 2;
    if (director) {
      positions.set(director.id, { x: centerX - 105, y: 55 });
      widths.set(director.id, 210);
      kinds.set(director.id, "director");
    }
    if (council) {
      positions.set(council.id, { x: centerX - 145, y: 175 });
      widths.set(council.id, 290);
      kinds.set(council.id, "council");
    }

    for (const node of governance) {
      if (node.id === director?.id || node.id === council?.id) continue;
      if (!positions.has(node.id)) {
        positions.set(node.id, { x: centerX - 95, y: 270 });
        widths.set(node.id, 190);
        kinds.set(node.id, "regular");
      }
    }

    return { positions, widths, kinds, sectionHeaderByKey, totalWidth };
  }, [council, director, governance, nodesBySection]);

  const layout = useMemo(() => {
    if (!storedInstitutionalLayout) return autoLayout;

    const positions = new Map<string, { x: number; y: number }>();
    const widths = new Map(autoLayout.widths);
    const kinds = new Map(autoLayout.kinds);

    for (const node of nodes) {
      if (!autoLayout.positions.has(node.id)) continue;
      positions.set(node.id, { x: node.positionX, y: node.positionY });
    }

    const right = Math.max(
      1200,
      ...nodes.map(
        (node) =>
          (positions.get(node.id)?.x ?? 0) +
          (widths.get(node.id) ?? 190) +
          120,
      ),
    );

    return {
      positions,
      widths,
      kinds,
      sectionHeaderByKey: autoLayout.sectionHeaderByKey,
      totalWidth: right,
    };
  }, [autoLayout, nodes, storedInstitutionalLayout]);

  // Los cables pueden estar todos visibles, pero el resaltado siempre es
  // contextual a la caja seleccionada. Antes, con "Todos los cables", se
  // resaltaban los extremos de TODAS las relaciones y parecía que brillaba
  // todo el organigrama.
  const selectedRelations = useMemo(() => {
    if (!selectedNodeId || relationMode === "structure") return [];
    return edges.filter(
      (edge) =>
        relationMatchesMode(edge, relationMode) &&
        (edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId),
    );
  }, [edges, relationMode, selectedNodeId]);

  const visibleRelations = useMemo(() => {
    if (relationMode === "structure") return [];
    if (relationScope === "focus") return selectedRelations;
    return edges.filter((edge) => relationMatchesMode(edge, relationMode));
  }, [edges, relationMode, relationScope, selectedRelations]);

  // Para órganos colegiados (Consejo, comités, etc.) también resaltamos solo
  // las funciones donde están cargadas LAS MISMAS PERSONAS. No se ilumina el
  // área completa por pertenecer al mismo sector.
  const personLinkedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!selectedNode) return ids;
    const selectedPeople = peopleIdsForNode(selectedNode);
    if (selectedPeople.size === 0) return ids;

    for (const node of nodes) {
      if (node.id === selectedNode.id) continue;
      const sharesPerson = [...peopleIdsForNode(node)].some((personId) =>
        selectedPeople.has(personId),
      );
      if (sharesPerson) ids.add(node.id);
    }
    return ids;
  }, [nodes, selectedNode]);

  const highlightedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedNodeId) ids.add(selectedNodeId);
    for (const edge of selectedRelations) {
      ids.add(edge.sourceId);
      ids.add(edge.targetId);
    }
    for (const nodeId of personLinkedNodeIds) ids.add(nodeId);
    return ids;
  }, [personLinkedNodeIds, selectedNodeId, selectedRelations]);

  const sectionKeyByHeaderId = useMemo(() => {
    const result = new Map<string, Exclude<SectionKey, "overview">>();
    for (const [sectionKey, header] of layout.sectionHeaderByKey.entries()) {
      result.set(header.id, sectionKey);
    }
    return result;
  }, [layout.sectionHeaderByKey]);

  const sectionNodeIdsByKey = useMemo(() => {
    const result = new Map<
      Exclude<SectionKey, "overview">,
      Set<string>
    >();
    for (const sectionKey of canonicalSectionOrder) {
      result.set(
        sectionKey,
        new Set((nodesBySection.get(sectionKey) ?? []).map((node) => node.id)),
      );
    }
    return result;
  }, [nodesBySection]);

  const baseFlowNodes = useMemo<Node<InstitutionalMapNodeData>[]>(
    () =>
      nodes
        .filter((node) => layout.positions.has(node.id))
        .map((node) => ({
          id: node.id,
          type: "institutionalMapNode",
          position: layout.positions.get(node.id)!,
          data: {
            ...node,
            mapState: {
              kind: layout.kinds.get(node.id) ?? "regular",
              width: layout.widths.get(node.id) ?? 190,
              dimmed:
                relationScope === "focus" &&
                Boolean(selectedNodeId) &&
                relationMode !== "structure" &&
                highlightedNodeIds.size > 1 &&
                !highlightedNodeIds.has(node.id),
              emphasized:
                Boolean(selectedNodeId) &&
                node.id !== selectedNodeId &&
                highlightedNodeIds.has(node.id),
              editable,
            },
          },
          initialWidth: layout.widths.get(node.id) ?? 190,
          initialHeight:
            layout.kinds.get(node.id) === "section" ? 58 : 90,
          draggable: editable,
          selectable: true,
        })),
    [
      editable,
      highlightedNodeIds,
      layout,
      nodes,
      relationMode,
      relationScope,
      selectedNodeId,
    ],
  );

  // Estado local durante el drag: la caja sigue exactamente el mouse y los
  // cables usan esas mismas coordenadas. La persistencia ocurre al soltar.
  const [interactiveNodes, setInteractiveNodes] = useState<
    Node<InstitutionalMapNodeData>[]
  >(() => baseFlowNodes);
  const interactiveNodesRef = useRef(interactiveNodes);

  useEffect(() => {
    interactiveNodesRef.current = interactiveNodes;
  }, [interactiveNodes]);

  useEffect(() => {
    if (draggingNodeIdRef.current) return;
    interactiveNodesRef.current = baseFlowNodes;
    setInteractiveNodes(baseFlowNodes);
  }, [baseFlowNodes]);

  function handleNodesChange(changes: NodeChange[]) {
    if (!editable) return;

    setInteractiveNodes((current) => {
      let next = current;

      for (const change of changes) {
        if (change.type === "position" && change.position) {
          const sectionKey = sectionKeyByHeaderId.get(change.id);

          // Las barras grandes de área son grupos movibles: mientras arrastrás
          // el encabezado, todo el contenido de esa área acompaña el mouse y
          // conserva su distribución interna.
          if (sectionKey) {
            const header = next.find((node) => node.id === change.id);
            const sectionIds = sectionNodeIdsByKey.get(sectionKey);
            if (header && sectionIds) {
              const dx = change.position.x - header.position.x;
              const dy = change.position.y - header.position.y;
              next = next.map((node) => {
                if (!sectionIds.has(node.id)) return node;
                return {
                  ...node,
                  position:
                    node.id === change.id
                      ? change.position!
                      : {
                          x: node.position.x + dx,
                          y: node.position.y + dy,
                        },
                  dragging:
                    node.id === change.id ? change.dragging : node.dragging,
                };
              });
              continue;
            }
          }
        }

        next = applyNodeChanges(
          [change],
          next,
        ) as Node<InstitutionalMapNodeData>[];
      }

      interactiveNodesRef.current = next;
      return next;
    });
  }

  const renderedNodes = editable ? interactiveNodes : baseFlowNodes;
  const renderedNodeById = useMemo(
    () => new Map(renderedNodes.map((node) => [node.id, node])),
    [renderedNodes],
  );

  const syntheticHierarchy = useMemo<OrgEdgeData[]>(() => {
    const result: OrgEdgeData[] = [];
    if (director && council) {
      result.push({
        id: `visual-governance-${director.id}-${council.id}`,
        sourceId: director.id,
        targetId: council.id,
        type: "JERARQUICA",
        label: null,
      });
    }
    if (council) {
      for (const sectionKey of canonicalSectionOrder) {
        const header = layout.sectionHeaderByKey.get(sectionKey);
        if (!header) continue;
        result.push({
          id: `visual-section-${council.id}-${header.id}`,
          sourceId: council.id,
          targetId: header.id,
          type: "JERARQUICA",
          label: null,
        });
      }
    }
    return result;
  }, [council, director, layout.sectionHeaderByKey]);

  const flowEdges = useMemo<Edge[]>(() => {
    const directorId = director?.id ?? null;
    const councilId = council?.id ?? null;
    const sectionHeaderIds = new Set(
      [...layout.sectionHeaderByKey.values()].map((node) => node.id),
    );

    const hierarchy = edges.filter((edge) => {
      if (edge.type !== "JERARQUICA") return false;
      if (
        !renderedNodeById.has(edge.sourceId) ||
        !renderedNodeById.has(edge.targetId)
      ) {
        return false;
      }
      if (edge.sourceId === directorId || edge.targetId === directorId)
        return false;
      if (edge.sourceId === councilId || edge.targetId === councilId)
        return false;
      const sourceHeader = sectionHeaderIds.has(edge.sourceId);
      const targetHeader = sectionHeaderIds.has(edge.targetId);
      if (sourceHeader && targetHeader) return false;

      const sourceNode = nodeById.get(edge.sourceId);
      const targetNode = nodeById.get(edge.targetId);
      if (!sourceNode || !targetNode) return false;
      return sectionForNode(sourceNode) === sectionForNode(targetNode);
    });

    const hierarchyEdges = [...syntheticHierarchy, ...hierarchy].map((edge) =>
      buildMapEdge(
        edge,
        relationMode,
        selectedNodeId,
        renderedNodeById,
        false,
      ),
    );

    if (relationMode === "structure") return hierarchyEdges;
    const relations = visibleRelations
      .filter(
        (edge) =>
          renderedNodeById.has(edge.sourceId) &&
          renderedNodeById.has(edge.targetId),
      )
      .map((edge) =>
        buildMapEdge(
          edge,
          relationMode,
          selectedNodeId,
          renderedNodeById,
          true,
        ),
      );
    return [...hierarchyEdges, ...relations];
  }, [
    council?.id,
    director?.id,
    edges,
    layout.sectionHeaderByKey,
    nodeById,
    relationMode,
    relationScope,
    renderedNodeById,
    selectedNodeId,
    syntheticHierarchy,
    visibleRelations,
  ]);

  function handleNodeDragStart(
    _: unknown,
    flowNode: Node<InstitutionalMapNodeData>,
  ) {
    if (!editable) return;
    draggingNodeIdRef.current = flowNode.id;
  }

  function handleNodeDragStop(
    _: unknown,
    flowNode: Node<InstitutionalMapNodeData>,
  ) {
    if (!editable) {
      draggingNodeIdRef.current = null;
      return;
    }

    const latestNodes = interactiveNodesRef.current;

    // Primera edición de una instalación anterior: materializamos una sola vez
    // TODO Institucional. onNodesMove ahora sí llega hasta el editor (antes se
    // perdía en el wrapper de OrgChartCanvas).
    if (!storedInstitutionalLayout && onNodesMove) {
      onNodesMove(
        latestNodes.map((node) => {
          const position =
            node.id === flowNode.id ? flowNode.position : node.position;
          return {
            nodeId: node.id,
            positionX: position.x,
            positionY: position.y,
          };
        }),
      );
      draggingNodeIdRef.current = null;
      return;
    }

    const sectionKey = sectionKeyByHeaderId.get(flowNode.id);

    // Si se mueve una barra grande de área, guardamos el bloque completo. De
    // esta forma el área se puede acomodar libremente sin dejar sus cargos
    // atrás ni romper sus líneas internas.
    if (sectionKey && onNodesMove) {
      const sectionIds = sectionNodeIdsByKey.get(sectionKey) ?? new Set<string>();
      const positions = latestNodes
        .filter((node) => sectionIds.has(node.id))
        .map((node) => ({
          nodeId: node.id,
          positionX: node.position.x,
          positionY: node.position.y,
        }));
      onNodesMove(positions);
      draggingNodeIdRef.current = null;
      return;
    }

    // Para una caja común, Dirección General o Consejo, se guarda solo la caja
    // movida. La previsualización ya quedó exactamente donde se soltó.
    if (storedInstitutionalLayout && onNodeMove) {
      onNodeMove({
        nodeId: flowNode.id,
        positionX: flowNode.position.x,
        positionY: flowNode.position.y,
      });
      draggingNodeIdRef.current = null;
      return;
    }

    // Respaldo para instalaciones donde no esté disponible el guardado masivo.
    if (onNodeMove) {
      const original = nodeById.get(flowNode.id);
      const originalDisplay = layout.positions.get(flowNode.id);
      if (original && originalDisplay) {
        onNodeMove({
          nodeId: flowNode.id,
          positionX:
            original.positionX + flowNode.position.x - originalDisplay.x,
          positionY:
            original.positionY + flowNode.position.y - originalDisplay.y,
        });
      }
    }

    draggingNodeIdRef.current = null;
  }

  const relationModeCopy =
    relationMode === "integration"
      ? "Integra"
      : relationMode === "collaboration"
        ? "Colabora"
        : relationMode === "all"
          ? "Todas"
          : "Estructura";

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black text-slate-950">
            Vista institucional completa
          </p>
          <p className="mt-1 text-[0.7rem] font-semibold text-slate-500">
            {editable
              ? "Esta es la posición real del organigrama. Arrastrá una caja para moverla; si arrastrás la barra grande de un área, se mueve y se guarda todo ese bloque junto."
              : "Dirección General y Consejo arriba, las cinco áreas en una misma línea y todo el organigrama debajo, como en el esquema original."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
            <SlidersHorizontal className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
            {relationOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                title={option.description}
                onClick={() => onRelationModeChange(option.key)}
                className={`shrink-0 rounded-lg px-3 py-2 text-[0.72rem] font-black transition ${
                  relationMode === option.key
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {relationMode !== "structure" ? (
            <div className="flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setRelationScope("all")}
                className={`rounded-lg px-3 py-2 text-[0.7rem] font-black transition ${
                  relationScope === "all"
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                Todos los cables
              </button>
              <button
                type="button"
                onClick={() => setRelationScope("focus")}
                className={`rounded-lg px-3 py-2 text-[0.7rem] font-black transition ${
                  relationScope === "focus"
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                Solo selección
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {editable && !storedInstitutionalLayout ? (
        <div className="border-b border-blue-100 bg-blue-50/70 px-4 py-2.5 text-xs font-bold text-blue-900 sm:px-6">
          La primera vez que muevas una caja voy a guardar esta composición Institucional completa como la nueva posición real. No se pierde ninguna caja ni relación.
        </div>
      ) : editable ? (
        <div className="border-b border-emerald-100 bg-emerald-50/70 px-4 py-2.5 text-xs font-bold text-emerald-900 sm:px-6">
          Movimiento activo: las cajas se mueven en vivo. Las barras grandes de área arrastran también todas sus cajas para mantener el sector acomodado.
        </div>
      ) : null}

      {relationScope === "focus" && relationMode !== "structure" ? (
        <div className="border-b border-blue-100 bg-white px-4 py-2.5 text-xs font-semibold text-blue-900 sm:px-6">
          {selectedNode
            ? `${relationModeCopy}: mostrando únicamente los vínculos directos de “${selectedNode.title}”.`
            : "Tocá una caja para mostrar únicamente sus relaciones directas."}
        </div>
      ) : null}

      <div className="relative h-[900px] bg-[#fbfcfe]">
        <ReactFlow
          nodes={renderedNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodesChange={editable ? handleNodesChange : undefined}
          onNodeDragStart={editable ? handleNodeDragStart : undefined}
          onNodeDragStop={editable ? handleNodeDragStop : undefined}
          fitView
          fitViewOptions={{ padding: 0.06, minZoom: 0.04, maxZoom: 0.72 }}
          minZoom={0.035}
          maxZoom={1.25}
          panOnScroll
          nodesDraggable={editable}
          nodesConnectable={false}
          elementsSelectable
          onNodeClick={(_, node) => onNodeSelect(node.id)}
          onEdgeClick={
            onEdgeSelect ? (_, edge) => onEdgeSelect(edge.id) : undefined
          }
          onPaneClick={() => onNodeSelect(null)}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="#cbd5e1"
          />
          <Controls
            showInteractive={false}
            className="!overflow-hidden !rounded-xl !border-slate-200 !shadow-sm"
          />
        </ReactFlow>

        <div className="pointer-events-none absolute bottom-4 right-4 hidden items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[0.68rem] font-bold text-slate-500 shadow-sm backdrop-blur md:flex">
          <LegendItem color="#15803d" label="Jerarquía" />
          {relationMode !== "structure" ? (
            <>
              <LegendItem color="#2563eb" label="Colabora" dashed />
              <LegendItem color="#dc2626" label="Integra" dashed />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function buildMapEdge(
  edge: OrgEdgeData,
  relationMode: RelationMode,
  selectedNodeId: string | null,
  nodeById: Map<string, Node<InstitutionalMapNodeData>>,
  showRelationLabel = true,
): Edge {
  const hierarchy = edge.type === "JERARQUICA";
  const contextual =
    selectedNodeId !== null &&
    (edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId);
  const stroke = edgeColors[edge.type] ?? "#64748b";
  const secondary = !hierarchy;
  const mutedHierarchy = relationMode !== "structure";
  const source = nodeById.get(edge.sourceId);
  const target = nodeById.get(edge.targetId);
  const dx = source && target ? target.position.x - source.position.x : 0;
  const dy = source && target ? target.position.y - source.position.y : 1;
  const useHorizontal = !hierarchy && Math.abs(dx) > Math.abs(dy) * 1.15;
  const handles = hierarchy
    ? { sourceHandle: "bottom-source", targetHandle: "top-target" }
    : useHorizontal
      ? dx >= 0
        ? { sourceHandle: "right-source", targetHandle: "left-target" }
        : { sourceHandle: "left-source", targetHandle: "right-target" }
      : dy >= 0
        ? { sourceHandle: "bottom-source", targetHandle: "top-target" }
        : { sourceHandle: "top-source", targetHandle: "bottom-target" };

  return {
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    ...handles,
    label:
      showRelationLabel && secondary && (contextual || relationMode !== "structure")
        ? relationKindLabel(edge)
        : undefined,
    type: "smoothstep",
    interactionWidth: 30,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: hierarchy && mutedHierarchy ? "#6f8575" : stroke,
      width: 14,
      height: 14,
    },
    style: {
      stroke: hierarchy && mutedHierarchy ? "#6f8575" : stroke,
      strokeWidth: hierarchy ? (mutedHierarchy ? 1.7 : 2.1) : contextual ? 2.8 : 2.1,
      strokeDasharray: secondary ? "6 7" : undefined,
      opacity: hierarchy && mutedHierarchy ? 0.7 : 0.94,
    },
    labelStyle: {
      fill: secondary ? stroke : "#334155",
      fontWeight: 900,
      fontSize: 11,
    },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.98 },
    labelBgPadding: [8, 5],
    labelBgBorderRadius: 999,
  };
}

function GlobalInstitutionalCanvas({
  nodes,
  edges,
  editable,
  summary,
  relationMode,
  onRelationModeChange,
  selectedNodeId,
  onNodeSelect,
  onNodeMove,
  onEdgeSelect,
}: {
  nodes: OrgNodeData[];
  edges: OrgEdgeData[];
  editable: boolean;
  summary: boolean;
  relationMode: RelationMode;
  onRelationModeChange: (mode: RelationMode) => void;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeMove?: (input: {
    nodeId: string;
    positionX: number;
    positionY: number;
  }) => void;
  onEdgeSelect?: (edgeId: string) => void;
}) {
  const [relationScope, setRelationScope] = useState<RelationScope>("all");
  const draggingNodeIdRef = useRef<string | null>(null);
  const globalAnchorRef = useRef<{ minX: number; minY: number } | null>(null);

  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );

  const selectedNode = selectedNodeId
    ? nodeById.get(selectedNodeId) ?? null
    : null;

  const nodesBySection = useMemo(() => {
    const grouped = new Map<SectionKey | "governance", OrgNodeData[]>();
    for (const node of nodes) {
      const section = sectionForNode(node);
      grouped.set(section, [...(grouped.get(section) ?? []), node]);
    }
    return grouped;
  }, [nodes]);

  const currentAnchor = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, minY: 0 };
    const calculated = {
      minX: Math.min(...nodes.map((node) => node.positionX)),
      minY: Math.min(...nodes.map((node) => node.positionY)),
    };

    if (!editable) return calculated;
    if (!globalAnchorRef.current) globalAnchorRef.current = calculated;
    return globalAnchorRef.current;
  }, [editable, nodes]);

  const visibleRawRelations = useMemo(() => {
    if (relationMode === "structure") return [];
    const matching = edges.filter((edge) => relationMatchesMode(edge, relationMode));
    if (relationScope !== "focus") return matching;
    if (!selectedNodeId) return [];
    return matching.filter(
      (edge) => edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId,
    );
  }, [edges, relationMode, relationScope, selectedNodeId]);

  const highlightedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedNodeId) ids.add(selectedNodeId);
    for (const edge of visibleRawRelations) {
      ids.add(edge.sourceId);
      ids.add(edge.targetId);
    }
    return ids;
  }, [selectedNodeId, visibleRawRelations]);

  const summaryEdges = useMemo(() => {
    if (!summary || relationMode === "structure") return [] as OrgEdgeData[];

    type Aggregate = {
      sourceSection: SectionKey | "governance";
      targetSection: SectionKey | "governance";
      kind: "integration" | "collaboration";
      count: number;
    };

    const aggregates = new Map<string, Aggregate>();

    for (const edge of visibleRawRelations) {
      const sourceNode = nodeById.get(edge.sourceId);
      const targetNode = nodeById.get(edge.targetId);
      if (!sourceNode || !targetNode) continue;

      const sourceSection = sectionForNode(sourceNode);
      const targetSection = sectionForNode(targetNode);
      if (sourceSection === targetSection) continue;

      const kind = edge.type === "DECISION" ? "integration" : "collaboration";
      const pair = [sourceSection, targetSection].sort().join("::");
      const key = `${kind}::${pair}`;
      const existing = aggregates.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        aggregates.set(key, {
          sourceSection,
          targetSection,
          kind,
          count: 1,
        });
      }
    }

    function representative(section: SectionKey | "governance") {
      const sectionNodes = nodesBySection.get(section) ?? [];
      return (
        sectionNodes.find((node) => isSectionHeader(node)) ??
        sectionNodes.slice().sort((a, b) => a.positionY - b.positionY)[0] ??
        null
      );
    }

    return [...aggregates.values()].flatMap((aggregate, index) => {
      const sourceRepresentative = representative(aggregate.sourceSection);
      const targetRepresentative = representative(aggregate.targetSection);
      if (!sourceRepresentative || !targetRepresentative) return [];

      const leftToRight =
        sourceRepresentative.positionX <= targetRepresentative.positionX;
      const source = leftToRight ? sourceRepresentative : targetRepresentative;
      const target = leftToRight ? targetRepresentative : sourceRepresentative;
      const integration = aggregate.kind === "integration";

      return [
        {
          id: `summary-${aggregate.kind}-${index}-${source.id}-${target.id}`,
          sourceId: source.id,
          targetId: target.id,
          type: integration ? "DECISION" : "COLABORACION",
          label: `${integration ? "Integra" : "Colabora"} · ${aggregate.count}`,
        },
      ];
    });
  }, [
    nodeById,
    nodesBySection,
    relationMode,
    summary,
    visibleRawRelations,
  ]);

  const baseFlowNodes = useMemo<Node<FocusedNodeData>[]>(() => {
    const left = 120;
    const top = 100;
    return nodes.map((node) => ({
      id: node.id,
      type: "focusedNode",
      position: {
        x: node.positionX - currentAnchor.minX + left,
        y: node.positionY - currentAnchor.minY + top,
      },
      data: {
        ...node,
        viewerState: {
          dimmed:
            relationScope === "focus" &&
            Boolean(selectedNodeId) &&
            relationMode !== "structure" &&
            highlightedNodeIds.size > 1 &&
            !highlightedNodeIds.has(node.id),
          emphasized:
            Boolean(selectedNodeId) &&
            node.id !== selectedNodeId &&
            highlightedNodeIds.has(node.id),
          isSectionHeader: isSectionHeader(node),
          editable: editable && !summary,
        },
      },
      initialWidth: 220,
      initialHeight: 106,
      draggable: editable && !summary,
      selectable: true,
    }));
  }, [
    currentAnchor.minX,
    currentAnchor.minY,
    editable,
    highlightedNodeIds,
    nodes,
    relationMode,
    relationScope,
    selectedNodeId,
    summary,
  ]);

  const [interactiveNodes, setInteractiveNodes] = useState<
    Node<FocusedNodeData>[]
  >(() => baseFlowNodes);

  useEffect(() => {
    if (draggingNodeIdRef.current) return;
    setInteractiveNodes(baseFlowNodes);
  }, [baseFlowNodes]);

  function handleNodesChange(changes: NodeChange[]) {
    if (!editable || summary) return;
    setInteractiveNodes((current) =>
      applyNodeChanges(changes, current) as Node<FocusedNodeData>[],
    );
  }

  const renderedNodes = editable && !summary ? interactiveNodes : baseFlowNodes;
  const renderedNodeById = useMemo(
    () => new Map(renderedNodes.map((node) => [node.id, node])),
    [renderedNodes],
  );

  const flowEdges = useMemo<Edge[]>(() => {
    const hierarchy = edges
      .filter((edge) => edge.type === "JERARQUICA")
      .map((edge) =>
        buildEdge(edge, relationMode, selectedNodeId, renderedNodeById, false),
      );

    if (relationMode === "structure") return hierarchy;

    const relationEdges = (summary ? summaryEdges : visibleRawRelations).map((edge) =>
      buildEdge(
        edge,
        relationMode,
        selectedNodeId,
        renderedNodeById,
        summary || relationScope === "focus",
      ),
    );
    return [...hierarchy, ...relationEdges];
  }, [
    edges,
    relationMode,
    relationScope,
    renderedNodeById,
    selectedNodeId,
    summary,
    summaryEdges,
    visibleRawRelations,
  ]);

  function handleNodeDragStop(_: unknown, flowNode: Node<FocusedNodeData>) {
    if (!editable || summary || !onNodeMove) {
      draggingNodeIdRef.current = null;
      return;
    }
    const original = nodeById.get(flowNode.id);
    const base = baseFlowNodes.find((node) => node.id === flowNode.id);
    if (!original || !base) {
      draggingNodeIdRef.current = null;
      return;
    }

    onNodeMove({
      nodeId: flowNode.id,
      positionX: original.positionX + (flowNode.position.x - base.position.x),
      positionY: original.positionY + (flowNode.position.y - base.position.y),
    });
    draggingNodeIdRef.current = null;
  }

  const relationModeCopy =
    relationMode === "integration"
      ? "Integra"
      : relationMode === "collaboration"
        ? "Colabora"
        : relationMode === "all"
          ? "Todas"
          : "Estructura";

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black text-slate-950">
            {summary ? "Resumen de relaciones entre áreas" : "Mapa global"}
          </p>
          <p className="mt-1 text-[0.7rem] font-semibold text-slate-500">
            {summary
              ? "Mantiene todas las cajas, pero agrupa los vínculos cruzados en pocos cables entre áreas."
              : editable
                ? "Esta es la posición real del organigrama. Los movimientos se guardan desde la vista Institucional."
                : "Muestra todo el organigrama en su posición real, como el esquema institucional original."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
            <SlidersHorizontal className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
            {relationOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                title={option.description}
                onClick={() => onRelationModeChange(option.key)}
                className={`shrink-0 rounded-lg px-3 py-2 text-[0.72rem] font-black transition ${
                  relationMode === option.key
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {relationMode !== "structure" ? (
            <div className="flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setRelationScope("all")}
                className={`rounded-lg px-3 py-2 text-[0.7rem] font-black transition ${
                  relationScope === "all"
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                Todos los cables
              </button>
              <button
                type="button"
                onClick={() => setRelationScope("focus")}
                className={`rounded-lg px-3 py-2 text-[0.7rem] font-black transition ${
                  relationScope === "focus"
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                Solo selección
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {relationScope === "focus" && relationMode !== "structure" ? (
        <div className="border-b border-blue-100 bg-blue-50/70 px-4 py-2.5 text-xs font-semibold text-blue-900 sm:px-6">
          {selectedNode
            ? `${relationModeCopy}: mostrando únicamente los vínculos directos de “${selectedNode.title}”.`
            : "Tocá una caja para mostrar únicamente sus relaciones directas."}
        </div>
      ) : null}

      {summary && editable ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900 sm:px-6">
          El resumen es solo una lectura. Para mover cajas, volvé a “Institucional”.
        </div>
      ) : null}

      <div className="relative h-[820px] bg-[#fbfcfe]">
        <ReactFlow
          nodes={renderedNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.1, minZoom: 0.08, maxZoom: 0.78 }}
          minZoom={0.06}
          maxZoom={1.35}
          panOnScroll
          nodesDraggable={editable && !summary}
          nodesConnectable={false}
          elementsSelectable
          onNodesChange={editable && !summary ? handleNodesChange : undefined}
          onNodeDragStart={(_, node) => {
            if (editable && !summary) draggingNodeIdRef.current = node.id;
          }}
          onNodeDragStop={handleNodeDragStop}
          onNodeClick={(_, node) => onNodeSelect(node.id)}
          onEdgeClick={
            !summary && onEdgeSelect
              ? (_, edge) => onEdgeSelect(edge.id)
              : undefined
          }
          onPaneClick={() => onNodeSelect(null)}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="#cbd5e1"
          />
          <Controls
            showInteractive={false}
            className="!overflow-hidden !rounded-xl !border-slate-200 !shadow-sm"
          />
        </ReactFlow>

        <div className="pointer-events-none absolute bottom-4 right-4 hidden items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[0.68rem] font-bold text-slate-500 shadow-sm backdrop-blur md:flex">
          <LegendItem color="#15803d" label="Jerarquía" />
          {relationMode !== "structure" ? (
            <>
              <LegendItem color="#2563eb" label="Colabora" dashed />
              <LegendItem color="#dc2626" label="Integra" dashed />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InstitutionalOrgChartCanvas({
  nodes,
  edges,
  schoolSlug,
  orgChartTitle,
  editable = false,
  selectedNodeId: controlledSelectedNodeId,
  hideDetailDrawer = false,
  onNodeSelect,
  onNodeMove,
  onNodesMove,
  onEdgeSelect,
}: Props) {
  const [canvasViewMode, setCanvasViewMode] = useState<CanvasViewMode>("institutional");
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [relationMode, setRelationMode] = useState<RelationMode>("all");
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(
    null,
  );
  const selectedNodeId =
    controlledSelectedNodeId === undefined
      ? internalSelectedNodeId
      : controlledSelectedNodeId;

  function selectNode(nodeId: string | null) {
    if (controlledSelectedNodeId === undefined) {
      setInternalSelectedNodeId(nodeId);
    }
    onNodeSelect?.(nodeId);
  }

  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const selectedNode = selectedNodeId
    ? nodeById.get(selectedNodeId) ?? null
    : null;

  // Institucional y Áreas comparten contenido, personas y relaciones, pero no
  // posiciones. Institucional usa las coordenadas oficiales de la base. Áreas
  // guarda un layout visual independiente para que acomodarla no rompa nada.
  const areasLayoutStorageKey = useMemo(
    () =>
      `apdes-org-areas-layout-v1:${schoolSlug}:${encodeURIComponent(
        orgChartTitle ?? "organigrama",
      )}`,
    [orgChartTitle, schoolSlug],
  );
  const [areasLayout, setAreasLayout] = useState<AreasLayoutMap>({});
  const [areasLayoutReady, setAreasLayoutReady] = useState(false);

  useEffect(() => {
    const institutionalSnapshot: AreasLayoutMap = Object.fromEntries(
      nodes.map((node) => [
        node.id,
        { positionX: node.positionX, positionY: node.positionY },
      ]),
    );

    try {
      const raw = window.localStorage.getItem(areasLayoutStorageKey);
      const saved = raw ? (JSON.parse(raw) as AreasLayoutMap) : {};
      const merged: AreasLayoutMap = { ...institutionalSnapshot };

      for (const node of nodes) {
        const point = saved[node.id];
        if (
          point &&
          Number.isFinite(point.positionX) &&
          Number.isFinite(point.positionY)
        ) {
          merged[node.id] = point;
        }
      }

      setAreasLayout(merged);
      if (!raw) {
        window.localStorage.setItem(
          areasLayoutStorageKey,
          JSON.stringify(merged),
        );
      }
    } catch {
      setAreasLayout(institutionalSnapshot);
    } finally {
      setAreasLayoutReady(true);
    }
  }, [areasLayoutStorageKey]);

  const nodeIdSignature = useMemo(
    () => nodes.map((node) => node.id).sort().join("|"),
    [nodes],
  );

  useEffect(() => {
    if (!areasLayoutReady) return;

    setAreasLayout((current) => {
      let changed = false;
      const next: AreasLayoutMap = { ...current };
      const validIds = new Set(nodes.map((node) => node.id));

      for (const id of Object.keys(next)) {
        if (!validIds.has(id)) {
          delete next[id];
          changed = true;
        }
      }

      for (const node of nodes) {
        if (!next[node.id]) {
          next[node.id] = {
            positionX: node.positionX,
            positionY: node.positionY,
          };
          changed = true;
        }
      }

      if (!changed) return current;
      try {
        window.localStorage.setItem(areasLayoutStorageKey, JSON.stringify(next));
      } catch {
        // El editor sigue funcionando aunque storage esté bloqueado.
      }
      return next;
    });
  }, [areasLayoutReady, areasLayoutStorageKey, nodeIdSignature, nodes]);

  function saveAreasLayout(next: AreasLayoutMap) {
    setAreasLayout(next);
    try {
      window.localStorage.setItem(areasLayoutStorageKey, JSON.stringify(next));
    } catch {
      // No bloqueamos la edición por un problema de storage local.
    }
  }

  const nodesBySection = useMemo(() => {
    const grouped = new Map<SectionKey | "governance", OrgNodeData[]>();
    for (const node of nodes) {
      const section = sectionForNode(node);
      grouped.set(section, [...(grouped.get(section) ?? []), node]);
    }
    for (const sectionNodes of grouped.values()) {
      sectionNodes.sort(
        (a, b) => a.positionY - b.positionY || a.positionX - b.positionX,
      );
    }
    return grouped;
  }, [nodes]);

  const areasNodesBySection = useMemo(() => {
    const grouped = new Map<SectionKey | "governance", OrgNodeData[]>();
    for (const [sectionKey, sectionNodes] of nodesBySection.entries()) {
      grouped.set(
        sectionKey,
        sectionNodes.map((node) => {
          const point = areasLayout[node.id];
          return point
            ? {
                ...node,
                positionX: point.positionX,
                positionY: point.positionY,
              }
            : node;
        }),
      );
    }
    return grouped;
  }, [areasLayout, nodesBySection]);

  const availableSections = sectionDefinitions.filter(
    (section) => (nodesBySection.get(section.key)?.length ?? 0) > 0,
  );

  const selectedRelations = useMemo(() => {
    if (!selectedNodeId) return [];
    return edges.filter(
      (edge) => edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId,
    );
  }, [edges, selectedNodeId]);

  const councilLinkedNodeIds = useMemo(() => {
    if (!selectedNode || !isCollectiveGovernanceNode(selectedNode)) {
      return new Set<string>();
    }
    const councilPeople = peopleIdsForNode(selectedNode);
    return new Set(
      nodes
        .filter(
          (node) =>
            node.id !== selectedNode.id &&
            [...peopleIdsForNode(node)].some((personId) =>
              councilPeople.has(personId),
            ),
        )
        .map((node) => node.id),
    );
  }, [nodes, selectedNode]);

  const focusedNodes = useMemo(() => {
    if (activeSection === "overview") return [];
    return areasNodesBySection.get(activeSection) ?? [];
  }, [activeSection, areasNodesBySection]);

  const baseNodeIds = useMemo(
    () => new Set(focusedNodes.map((node) => node.id)),
    [focusedNodes],
  );

  const visibleRelations = useMemo(() => {
    if (relationMode === "structure") return [];
    const matching = edges.filter((edge) => relationMatchesMode(edge, relationMode));

    if (selectedNodeId) {
      return matching.filter(
        (edge) => edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId,
      );
    }

    return matching.filter(
      (edge) => baseNodeIds.has(edge.sourceId) || baseNodeIds.has(edge.targetId),
    );
  }, [baseNodeIds, edges, relationMode, selectedNodeId]);

  const visibleSectionKeys = useMemo(() => {
    const keys = new Set<SectionKey | "governance">();
    if (activeSection !== "overview") keys.add(activeSection);

    if (selectedNode) keys.add(sectionForNode(selectedNode));
    for (const relation of visibleRelations) {
      const source = nodeById.get(relation.sourceId);
      const target = nodeById.get(relation.targetId);
      if (source) keys.add(sectionForNode(source));
      if (target) keys.add(sectionForNode(target));
    }
    return keys;
  }, [activeSection, nodeById, selectedNode, visibleRelations]);

  const canvasNodes = useMemo(() => {
    if (relationMode === "structure") return focusedNodes;
    const visible = new Map<string, OrgNodeData>();
    for (const key of visibleSectionKeys) {
      for (const node of areasNodesBySection.get(key) ?? []) {
        visible.set(node.id, node);
      }
    }
    return [...visible.values()].sort(
      (a, b) => a.positionY - b.positionY || a.positionX - b.positionX,
    );
  }, [areasNodesBySection, focusedNodes, relationMode, visibleSectionKeys]);

  const focusedNodeIds = useMemo(
    () => new Set(canvasNodes.map((node) => node.id)),
    [canvasNodes],
  );

  const relatedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedNodeId) ids.add(selectedNodeId);
    for (const relation of visibleRelations) {
      ids.add(relation.sourceId);
      ids.add(relation.targetId);
    }
    return ids;
  }, [selectedNodeId, visibleRelations]);

  const relationCandidates = useMemo(() => {
    if (relationMode === "structure") return [];
    return focusedNodes
      .map((node) => {
        const count = edges.filter(
          (edge) =>
            relationMatchesMode(edge, relationMode) &&
            (edge.sourceId === node.id || edge.targetId === node.id),
        ).length;
        return { node, count };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => {
        const collectiveDifference =
          Number(isCollectiveNode(b.node)) - Number(isCollectiveNode(a.node));
        return (
          collectiveDifference ||
          b.count - a.count ||
          a.node.title.localeCompare(b.node.title, "es")
        );
      });
  }, [edges, focusedNodes, relationMode]);

  // En edición, el origen visual de cada área queda congelado durante la sesión.
  // Así, mover una caja NO vuelve a calcular el minX/minY del área ni desplaza
  // todas las demás cajas al soltarla. Ese recalculo era una de las causas del
  // salto/titileo que se veía al editar.
  const editableLayoutAnchorsRef = useRef(
    new Map<
      string,
      { minX: number; minY: number; laneWidth: number }
    >(),
  );

  const displayLayout = useMemo(() => {
    const scaleX = 1.12;
    const scaleY = 0.82;
    const left = 90;
    const top = 90;
    const positions = new Map<string, { x: number; y: number }>();

    if (canvasNodes.length === 0) {
      return { positions, scaleX, scaleY };
    }

    function getAnchor(
      cacheKey: string,
      sectionNodes: OrgNodeData[],
      minimumLaneWidth = 780,
    ) {
      const minX = Math.min(...sectionNodes.map((node) => node.positionX));
      const maxX = Math.max(...sectionNodes.map((node) => node.positionX));
      const minY = Math.min(...sectionNodes.map((node) => node.positionY));
      const calculated = {
        minX,
        minY,
        laneWidth: Math.max(
          minimumLaneWidth,
          (maxX - minX) * scaleX + 300,
        ),
      };

      if (!editable) return calculated;

      const cached = editableLayoutAnchorsRef.current.get(cacheKey);
      if (cached) return cached;
      editableLayoutAnchorsRef.current.set(cacheKey, calculated);
      return calculated;
    }

    // En estructura conservamos exactamente la composición del área elegida,
    // pero con un origen estable mientras se está editando.
    if (relationMode === "structure") {
      const anchor = getAnchor(
        `structure:${activeSection}`,
        canvasNodes,
        0,
      );
      for (const node of canvasNodes) {
        positions.set(node.id, {
          x: (node.positionX - anchor.minX) * scaleX + left,
          y: (node.positionY - anchor.minY) * scaleY + top,
        });
      }
      return { positions, scaleX, scaleY };
    }

    // En Colabora / Integra / Todas cada área completa ocupa una columna.
    // El área en la que estamos queda a la izquierda y las relacionadas se
    // incorporan a la derecha. En edición también congelamos el ancho/origen
    // de cada columna para que ninguna otra sección salte durante un drag.
    const canonicalOrder: Array<SectionKey | "governance"> = [
      "governance",
      "academic",
      "orientation",
      "development",
      "administration",
      "operations",
    ];
    const orderedSections = [...visibleSectionKeys].sort((a, b) => {
      if (a === activeSection) return -1;
      if (b === activeSection) return 1;
      return canonicalOrder.indexOf(a) - canonicalOrder.indexOf(b);
    });

    let laneX = left;
    const laneGap = 260;

    for (const sectionKey of orderedSections) {
      const sectionNodes = (areasNodesBySection.get(sectionKey) ?? []).filter((node) =>
        focusedNodeIds.has(node.id),
      );
      if (sectionNodes.length === 0) continue;

      const anchor = getAnchor(
        `relations:${activeSection}:${relationMode}:${sectionKey}`,
        sectionNodes,
      );

      for (const node of sectionNodes) {
        positions.set(node.id, {
          x: laneX + (node.positionX - anchor.minX) * scaleX,
          y: top + (node.positionY - anchor.minY) * scaleY,
        });
      }

      laneX += anchor.laneWidth + laneGap;
    }

    return { positions, scaleX, scaleY };
  }, [
    activeSection,
    canvasNodes,
    editable,
    focusedNodeIds,
    areasNodesBySection,
    relationMode,
    visibleSectionKeys,
  ]);

  const flowNodes: Node<FocusedNodeData>[] = useMemo(() => {
    return canvasNodes.map((node) => {
      const emphasized =
        councilLinkedNodeIds.has(node.id) ||
        (selectedNodeId !== null &&
          node.id !== selectedNodeId &&
          relatedNodeIds.has(node.id));

      return {
        id: node.id,
        type: "focusedNode",
        position:
          displayLayout.positions.get(node.id) ??
          ({ x: node.positionX, y: node.positionY } as const),
        data: {
          ...node,
          viewerState: {
            dimmed: false,
            emphasized,
            isSectionHeader: isSectionHeader(node),
            editable,
          },
        },
        initialWidth: 220,
        initialHeight: 106,
        draggable: editable,
        selectable: true,
      };
    });
  }, [
    canvasNodes,
    councilLinkedNodeIds,
    displayLayout,
    editable,
    relatedNodeIds,
    selectedNodeId,
  ]);

  // React Flow necesita un estado local de nodos durante el drag cuando el
  // componente recibe `nodes` de manera controlada. Sin esto, la caja parece
  // quedarse quieta y recién salta a la nueva posición al soltar el mouse.
  // Este estado solo actualiza el canvas; la base de datos se guarda al final.
  const [interactiveNodes, setInteractiveNodes] = useState<
    Node<FocusedNodeData>[]
  >(() => flowNodes);
  const draggingNodeIdRef = useRef<string | null>(null);
  const interactionViewKey = `${activeSection}:${relationMode}`;
  const interactiveViewKeyRef = useRef(interactionViewKey);

  useEffect(() => {
    if (draggingNodeIdRef.current) return;
    interactiveViewKeyRef.current = interactionViewKey;
    setInteractiveNodes(flowNodes);
  }, [flowNodes, interactionViewKey]);

  function handleFlowNodesChange(changes: NodeChange[]) {
    if (!editable) return;
    setInteractiveNodes((current) =>
      applyNodeChanges(changes, current) as Node<FocusedNodeData>[],
    );
  }

  const renderedNodes =
    editable && interactiveViewKeyRef.current === interactionViewKey
      ? interactiveNodes
      : flowNodes;

  const flowNodeById = useMemo(
    () => new Map(flowNodes.map((node) => [node.id, node])),
    [flowNodes],
  );

  const flowEdges: Edge[] = useMemo(() => {
    const visibleRelationIds = new Set(visibleRelations.map((edge) => edge.id));
    return edges
      .filter((edge) => {
        if (!focusedNodeIds.has(edge.sourceId) || !focusedNodeIds.has(edge.targetId)) {
          return false;
        }
        if (edge.type === "JERARQUICA") return true;
        return relationMode !== "structure" && visibleRelationIds.has(edge.id);
      })
      .map((edge) => buildEdge(edge, relationMode, selectedNodeId, flowNodeById));
  }, [
    edges,
    flowNodeById,
    focusedNodeIds,
    relationMode,
    selectedNodeId,
    visibleRelations,
  ]);

  function openSection(section: Exclude<SectionKey, "overview">) {
    setActiveSection(section);
    selectNode(null);
    setRelationMode("structure");
  }

  function changeSection(section: SectionKey) {
    setActiveSection(section);
    selectNode(null);
    setRelationMode("structure");
  }

  function handleNodeDragStart(_: unknown, flowNode: Node<FocusedNodeData>) {
    if (!editable) return;
    draggingNodeIdRef.current = flowNode.id;
  }

  function handleNodeDragStop(_: unknown, flowNode: Node<FocusedNodeData>) {
    if (!editable) {
      draggingNodeIdRef.current = null;
      return;
    }

    const original = canvasNodes.find((node) => node.id === flowNode.id);
    const previousDisplayPosition = displayLayout.positions.get(flowNode.id);
    if (!original || !previousDisplayPosition) {
      draggingNodeIdRef.current = null;
      return;
    }

    const deltaX =
      (flowNode.position.x - previousDisplayPosition.x) / displayLayout.scaleX;
    const deltaY =
      (flowNode.position.y - previousDisplayPosition.y) / displayLayout.scaleY;

    const next: AreasLayoutMap = { ...areasLayout };
    next[flowNode.id] = {
      positionX: original.positionX + deltaX,
      positionY: original.positionY + deltaY,
    };
    saveAreasLayout(next);
    draggingNodeIdRef.current = null;
  }

  const collectiveSelection = Boolean(selectedNode && isCollectiveNode(selectedNode));

  const relationModeCopy =
    relationMode === "integration"
      ? "Integra"
      : relationMode === "collaboration"
        ? "Colabora"
        : relationMode === "all"
          ? "Todas"
          : "Estructura";

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-slate-950">
              <GitBranch className="h-4 w-4 text-blue-700" />
              Vista institucional
              {editable ? (
                <span className="rounded-full bg-blue-50 px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-blue-700">
                  Edición
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
              {editable
                ? "Es la misma vista del organigrama. Arrastrá una caja para moverla y tocala para editarla."
                : "Primero leé la estructura por áreas. Entrá a una para ver sus cargos y relaciones."}
            </p>
          </div>

          <nav
            className="flex max-w-full gap-1.5 overflow-x-auto rounded-2xl bg-slate-100 p-1.5"
            aria-label="Modo de lectura del organigrama"
          >
            <SectionButton
              active={canvasViewMode === "institutional"}
              label="Institucional"
              Icon={Landmark}
              onClick={() => {
                setCanvasViewMode("institutional");
                setRelationMode("all");
                selectNode(null);
              }}
            />
            <SectionButton
              active={canvasViewMode === "sections"}
              label="Áreas"
              Icon={Layers3}
              onClick={() => {
                setCanvasViewMode("sections");
                setRelationMode("structure");
                selectNode(null);
              }}
            />
          </nav>
        </div>
      </header>

      {canvasViewMode === "sections" ? (
        <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.7rem] font-bold text-slate-500">
              Acomodo independiente: mover cajas acá no modifica Institucional.
            </p>
            {editable ? (
              <button
                type="button"
                onClick={() => {
                  const reset = Object.fromEntries(
                    nodes.map((node) => [
                      node.id,
                      { positionX: node.positionX, positionY: node.positionY },
                    ]),
                  ) as AreasLayoutMap;
                  saveAreasLayout(reset);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[0.68rem] font-black text-slate-600 transition hover:bg-slate-50"
              >
                Restablecer acomodo de Áreas
              </button>
            ) : null}
          </div>
          <nav
            className="flex max-w-full gap-1.5 overflow-x-auto rounded-2xl bg-slate-100 p-1.5"
            aria-label="Áreas del organigrama"
          >
            <SectionButton
              active={activeSection === "overview"}
              label="Todo"
              Icon={Layers3}
              onClick={() => changeSection("overview")}
            />
            {availableSections.map((section) => (
              <SectionButton
                key={section.key}
                active={activeSection === section.key}
                label={section.shortLabel}
                Icon={section.Icon}
                onClick={() => changeSection(section.key)}
              />
            ))}
          </nav>
        </div>
      ) : null}

      {canvasViewMode === "institutional" ? (
        <StructuredInstitutionalCanvas
          nodes={nodes}
          edges={edges}
          editable={editable}
          relationMode={relationMode}
          onRelationModeChange={setRelationMode}
          selectedNodeId={selectedNodeId}
          onNodeSelect={selectNode}
          onNodeMove={onNodeMove}
          onNodesMove={onNodesMove}
          onEdgeSelect={onEdgeSelect}
        />
      ) : activeSection === "overview" ? (
        <InstitutionalOverview
          nodesBySection={areasNodesBySection}
          sections={availableSections}
          selectedNodeId={selectedNodeId}
          councilLinkedNodeIds={councilLinkedNodeIds}
          editable={editable}
          onNodeSelect={selectNode}
          onSectionOpen={openSection}
        />
      ) : (
        <div>
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <Eye className="h-4 w-4 text-blue-700" />
              {editable
                ? "Esta vista también es editable: tocá una caja para cambiar sus datos y arrastrala para moverla dentro del área."
                : "Elegí un filtro para ver la sección actual junto con las otras secciones relacionadas."}
            </div>

            <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
              <SlidersHorizontal className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
              {relationOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  title={option.description}
                  onClick={() => {
                    setRelationMode(option.key);
                    selectNode(null);
                  }}
                  className={`shrink-0 rounded-lg px-3 py-2 text-[0.72rem] font-black transition ${
                    relationMode === option.key
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {relationMode !== "structure" ? (
            <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 h-8 w-1.5 shrink-0 rounded-full ${
                    relationMode === "integration"
                      ? "bg-rose-600"
                      : relationMode === "collaboration"
                        ? "bg-blue-600"
                        : "bg-slate-900"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-950">
                    {relationModeCopy}: se muestran completas las secciones relacionadas
                  </p>
                  <p className="mt-1 text-[0.7rem] font-semibold leading-relaxed text-slate-500">
                    {selectedNodeId
                      ? "Al elegir una caja se conserva su sección completa y se agregan completas las secciones con las que tiene vínculos."
                      : "Sin elegir una caja se toman todos los vínculos de esta sección y se agregan completas las demás secciones relacionadas."}
                  </p>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {relationCandidates.length > 0 ? (
                      relationCandidates.map(({ node, count }) => (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => selectNode(node.id)}
                          className={`shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                            selectedNodeId === node.id
                              ? relationMode === "integration"
                                ? "border-rose-300 bg-rose-50 ring-4 ring-rose-100"
                                : "border-blue-300 bg-blue-50 ring-4 ring-blue-100"
                              : "border-slate-200 bg-white hover:border-blue-300"
                          }`}
                        >
                          <span className="block max-w-[210px] truncate text-[0.72rem] font-black text-slate-900">
                            {node.title}
                          </span>
                          <span className="mt-1 block text-[0.64rem] font-bold text-slate-500">
                            {count} {count === 1 ? "vínculo" : "vínculos"}
                          </span>
                        </button>
                      ))
                    ) : (
                      <span className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                        No hay vínculos de este tipo en el área.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="relative h-[760px] bg-[#fbfcfe]">
            <ReactFlow
              key={`${activeSection}-${relationMode}`}
              nodes={renderedNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              onNodesChange={editable ? handleFlowNodesChange : undefined}
              onNodeDragStart={editable ? handleNodeDragStart : undefined}
              onNodeDragStop={editable ? handleNodeDragStop : undefined}
              fitView
              fitViewOptions={{ padding: 0.22, minZoom: 0.3, maxZoom: 0.95 }}
              minZoom={0.18}
              maxZoom={1.3}
              panOnScroll
              nodesDraggable={editable}
              nodesConnectable={false}
              elementsSelectable
              onNodeClick={(_, node) => selectNode(node.id)}
              onEdgeClick={(_, edge) => onEdgeSelect?.(edge.id)}
              onPaneClick={() => selectNode(null)}
            >
              <Background
                variant={BackgroundVariant.Lines}
                gap={28}
                size={1}
                color="#d6e1ef"
              />
              <Controls
                showInteractive={false}
                className="!overflow-hidden !rounded-xl !border-slate-200 !shadow-sm"
              />
            </ReactFlow>

            <div className="pointer-events-none absolute bottom-4 right-4 hidden items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[0.68rem] font-bold text-slate-500 shadow-sm backdrop-blur md:flex">
              <LegendItem color="#15803d" label="Jerarquía" />
              {relationMode !== "structure" ? (
                <>
                  <LegendItem color="#2563eb" label="Colabora" dashed />
                  <LegendItem color="#dc2626" label="Integra" dashed />
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {!hideDetailDrawer && selectedNode ? (
        <DetailDrawer
          node={selectedNode}
          relations={selectedRelations}
          nodeById={nodeById}
          schoolSlug={schoolSlug}
          collective={collectiveSelection}
          councilLinkedNodeIds={councilLinkedNodeIds}
          onClose={() => selectNode(null)}
          onOpenSection={(section) => {
            setCanvasViewMode("sections");
            if (section === "governance") {
              changeSection("overview");
            } else {
              openSection(section);
            }
          }}
        />
      ) : null}
    </section>
  );
}

function SectionButton({
  active,
  label,
  Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  Icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition ${
        active
          ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
          : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function InstitutionalOverview({
  nodesBySection,
  sections,
  selectedNodeId,
  councilLinkedNodeIds,
  editable,
  onNodeSelect,
  onSectionOpen,
}: {
  nodesBySection: Map<SectionKey | "governance", OrgNodeData[]>;
  sections: SectionDefinition[];
  selectedNodeId: string | null;
  councilLinkedNodeIds: Set<string>;
  editable: boolean;
  onNodeSelect: (nodeId: string) => void;
  onSectionOpen: (section: Exclude<SectionKey, "overview">) => void;
}) {
  const governanceNodes = nodesBySection.get("governance") ?? [];
  const director = governanceNodes.find((node) =>
    normalize(node.title).includes("general"),
  );
  const council = governanceNodes.find((node) =>
    normalize(node.title).includes("consejo"),
  );

  return (
    <div
      className="min-h-[720px] px-4 py-8 sm:px-8 lg:px-10"
      style={{
        backgroundColor: "#fbfcfe",
        backgroundImage:
          "linear-gradient(rgba(23,84,165,0.075) 1px, transparent 1px), linear-gradient(90deg, rgba(23,84,165,0.075) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }}
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-col items-center">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-slate-400">
            Gobierno del colegio
          </p>

          <div className="mt-4 grid w-full max-w-[820px] gap-4 md:grid-cols-[1fr_80px_1.25fr] md:items-center">
            {director ? (
              <GovernanceCard
                node={director}
                selected={selectedNodeId === director.id}
                onClick={() => onNodeSelect(director.id)}
              />
            ) : (
              <div />
            )}

            <div className="hidden items-center justify-center md:flex">
              <div className="h-px w-full bg-slate-300" />
              <ChevronRight className="-ml-1 h-4 w-4 shrink-0 text-slate-400" />
            </div>

            {council ? (
              <GovernanceCard
                node={council}
                collective
                selected={selectedNodeId === council.id}
                onClick={() => onNodeSelect(council.id)}
              />
            ) : null}
          </div>

          <div className="mt-3 hidden h-12 w-px bg-gradient-to-b from-blue-600 to-blue-200 md:block" />
        </div>

        <div className="relative mt-4">
          <div className="pointer-events-none absolute left-[10%] right-[10%] top-0 hidden h-px bg-blue-200 xl:block" />

          <div className="grid gap-4 pt-0 md:grid-cols-2 xl:grid-cols-5 xl:pt-6">
            {sections.map((section) => {
              const sectionNodes = nodesBySection.get(section.key) ?? [];
              const sectionHeader =
                sectionNodes.find((node) => isSectionHeader(node)) ?? null;
              const peopleIds = new Set(
                sectionNodes.flatMap((node) => [...peopleIdsForNode(node)]),
              );
              const relevantTitles = sectionNodes
                .filter(
                  (node) =>
                    !isSectionHeader(node) &&
                    !/^(equipo docente|personal|tutoras|voluntarios)/.test(
                      normalize(node.title),
                    ),
                )
                .slice(0, 4);
              const linkedCount = sectionNodes.filter((node) =>
                councilLinkedNodeIds.has(node.id),
              ).length;

              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => {
                    if (editable && sectionHeader) {
                      onNodeSelect(sectionHeader.id);
                      return;
                    }
                    onSectionOpen(section.key);
                  }}
                  className={`group relative flex min-h-[330px] flex-col rounded-[1.5rem] border bg-white p-5 text-left transition duration-200 hover:-translate-y-1 hover:shadow-xl ${
                    linkedCount > 0
                      ? "border-amber-300 ring-4 ring-amber-100 shadow-lg"
                      : "border-slate-200 shadow-sm"
                  }`}
                >
                  <span className="absolute -top-6 left-1/2 hidden h-6 w-px bg-blue-200 xl:block" />
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <section.Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.67rem] font-black text-slate-500">
                      {sectionNodes.length} funciones
                    </span>
                  </span>

                  <span className="mt-5 block text-lg font-black tracking-tight text-slate-950">
                    {section.label}
                  </span>
                  <span className="mt-2 block min-h-10 text-xs font-semibold leading-relaxed text-slate-500">
                    {section.description}
                  </span>

                  <span className="mt-5 block flex-1 space-y-2">
                    {relevantTitles.map((node) => (
                      <span
                        key={node.id}
                        className="flex items-start gap-2 text-xs font-bold leading-snug text-slate-700"
                      >
                        <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                        {node.title}
                      </span>
                    ))}
                  </span>

                  {linkedCount > 0 ? (
                    <span className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">
                      <UsersRound className="h-4 w-4" />
                      {linkedCount}{" "}
                      {linkedCount === 1 ? "integrante del Consejo" : "integrantes del Consejo"}
                    </span>
                  ) : null}

                  <span className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500">
                      <UsersRound className="h-4 w-4" />
                      {peopleIds.size} personas
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-black text-blue-700">
                      {editable && sectionHeader ? "Editar área" : "Abrir área"}
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs font-semibold leading-relaxed text-blue-950">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
          <p>
            {editable
              ? "En Todo, tocá una tarjeta para editar su barra de área. Para entrar a sus cargos usá las pestañas de arriba; dentro de cada área también podés seleccionar, editar y mover cajas."
              : "Esta vista muestra la estructura general sin cruzar relaciones entre áreas. Abrí un sector para consultar todos sus cargos y activá “Colabora” o “Integra” solamente cuando necesites analizarlos."}
          </p>
        </div>
      </div>
    </div>
  );
}

function GovernanceCard({
  node,
  collective = false,
  selected,
  onClick,
}: {
  node: OrgNodeData;
  collective?: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const responsible = personName(getResponsible(node));
  const peopleCount = peopleIdsForNode(node).size;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[1.35rem] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
        collective
          ? "border-rose-300 bg-rose-50"
          : "border-slate-200 bg-white"
      } ${selected ? "ring-4 ring-blue-200 shadow-lg" : "shadow-sm"}`}
    >
      <span className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            collective
              ? "bg-rose-100 text-rose-700"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          {collective ? (
            <UsersRound className="h-5 w-5" />
          ) : (
            <Landmark className="h-5 w-5" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-base font-black text-slate-950">
            {node.title}
          </span>
          <span className="mt-1 block text-xs font-bold text-slate-500">
            {collective
              ? `${peopleCount} integrantes · Gobierno colegiado`
              : responsible ?? "Preside y articula"}
          </span>
        </span>
      </span>
    </button>
  );
}

function DetailDrawer({
  node,
  relations,
  nodeById,
  schoolSlug,
  collective,
  councilLinkedNodeIds,
  onClose,
  onOpenSection,
}: {
  node: OrgNodeData;
  relations: OrgEdgeData[];
  nodeById: Map<string, OrgNodeData>;
  schoolSlug: string;
  collective: boolean;
  councilLinkedNodeIds: Set<string>;
  onClose: () => void;
  onOpenSection: (section: Exclude<SectionKey, "overview"> | "governance") => void;
}) {
  const peopleIds = peopleIdsForNode(node);
  const totalHours =
    node.members?.reduce(
      (sum, member) => sum + (member.weeklyHours ?? 0),
      0,
    ) ||
    node.weeklyHours ||
    null;

  return (
    <>
      <button
        type="button"
        className="absolute inset-0 z-20 hidden bg-slate-950/10 backdrop-blur-[1px] md:block"
        onClick={onClose}
        aria-label="Cerrar detalle"
      />
      <aside className="absolute inset-x-0 bottom-0 z-30 max-h-[82%] overflow-y-auto rounded-t-[1.75rem] border border-slate-200 bg-white p-5 shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[390px] md:rounded-none md:rounded-l-[1.75rem] md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-blue-700">
              Detalle institucional
            </p>
            <h2 className="mt-2 text-xl font-black leading-tight tracking-tight text-slate-950">
              {node.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Cerrar detalle"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <InfoPill
            icon={<Layers3 className="h-4 w-4" />}
            label={areaLabels[node.area] ?? node.area}
          />
          <InfoPill
            icon={<UsersRound className="h-4 w-4" />}
            label={`${peopleIds.size} personas`}
          />
          {totalHours !== null ? (
            <InfoPill
              icon={<FileText className="h-4 w-4" />}
              label={`${totalHours} hs.`}
            />
          ) : null}
          <InfoPill
            icon={<BookOpenCheck className="h-4 w-4" />}
            label={`${relations.length} vínculos`}
          />
        </div>

        {collective ? (
          <div className="mt-5 rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-amber-950">
              <UsersRound className="h-4 w-4" />
              Órgano colegiado
            </div>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-amber-900">
              {councilLinkedNodeIds.size > 0
                ? `Sus integrantes aparecen en ${councilLinkedNodeIds.size} funciones del organigrama. En la vista general quedan resaltadas sus áreas.`
                : "Cuando sus integrantes también estén asignados a sus áreas funcionales, esas áreas se resaltarán automáticamente."}
            </p>
          </div>
        ) : null}

        {node.person ? (
          <div className="mt-5 rounded-[1.25rem] border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-blue-800">
              <UserRound className="h-4 w-4" />
              Responsable principal
            </div>
            <p className="mt-2 text-base font-black text-blue-950">
              {personName(node.person)}
            </p>
            {node.person.email ? (
              <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-blue-800">
                <Mail className="h-3.5 w-3.5" />
                {node.person.email}
              </p>
            ) : null}
            {node.person.phone ? (
              <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-blue-800">
                <Phone className="h-3.5 w-3.5" />
                {node.person.phone}
              </p>
            ) : null}
          </div>
        ) : null}

        {node.members && node.members.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              {collective ? "Integrantes del Consejo" : "Personas de esta función"}
            </p>
            <div className="mt-3 space-y-2">
              {node.members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                >
                  <p className="text-sm font-black text-slate-900">
                    {personName(member.person)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {memberRoleLabels[member.role] ?? member.role}
                    {member.roleTitle ? ` · ${member.roleTitle}` : ""}
                    {member.weeklyHours !== null
                      ? ` · ${member.weeklyHours} hs.`
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {node.formalRole ? (
            <DetailBlock label="Cargo formal" value={node.formalRole} />
          ) : null}
          {node.realFunction ? (
            <DetailBlock label="Función" value={node.realFunction} />
          ) : null}
          {node.description ? (
            <DetailBlock label="Observaciones" value={node.description} />
          ) : null}
        </div>

        {relations.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Relaciones directas
            </p>
            <div className="mt-3 space-y-2">
              {relations.map((relation) => {
                const outgoing = relation.sourceId === node.id;
                const relatedNode = nodeById.get(
                  outgoing ? relation.targetId : relation.sourceId,
                );
                if (!relatedNode) return null;
                const section = sectionForNode(relatedNode);

                return (
                  <button
                    key={relation.id}
                    type="button"
                    onClick={() => onOpenSection(section)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
                  >
                    <span
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          edgeColors[relation.type] ?? "#64748b",
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-400">
                        {relation.label || edgeLabels[relation.type]}
                      </span>
                      <span className="mt-1 block text-xs font-black text-slate-800">
                        {outgoing ? "Hacia" : "Desde"} {relatedNode.title}
                      </span>
                    </span>
                    {section !== sectionForNode(node) ? (
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[0.62rem] font-black text-blue-700">
                        Ver área
                      </span>
                    ) : (
                      <Check className="h-4 w-4 text-slate-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {node.person ? (
          <Link
            href={`/talento/${schoolSlug}`}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-800"
          >
            Ver ficha de talento
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </aside>
    </>
  );
}

function InfoPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-700">
      <span className="shrink-0 text-blue-700">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-700">
        {value}
      </p>
    </div>
  );
}

function LegendItem({
  color,
  label,
  dashed = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-5 border-t-2"
        style={{
          borderColor: color,
          borderStyle: dashed ? "dashed" : "solid",
        }}
      />
      {label}
    </span>
  );
}

export function OrgChartCanvas({
  nodes,
  edges,
  schoolSlug,
  orgChartTitle,
  designMode,
  editable,
  selectedNodeId,
  hideDetailDrawer,
  onNodeSelect,
  onNodeMove,
  onNodesMove,
  onEdgeSelect,
}: Props) {
  const resolvedDesignMode =
    designMode ??
    (isElBuenAyreNewProposal(schoolSlug, nodes, orgChartTitle)
      ? "institutional"
      : "legacy");

  if (resolvedDesignMode === "legacy") {
    return (
      <LegacyOrgChartCanvas
        nodes={nodes}
        edges={edges}
        schoolSlug={schoolSlug}
      />
    );
  }

  return (
    <InstitutionalOrgChartCanvas
      nodes={nodes}
      edges={edges}
      schoolSlug={schoolSlug}
      orgChartTitle={orgChartTitle}
      designMode="institutional"
      editable={editable}
      selectedNodeId={selectedNodeId}
      hideDetailDrawer={hideDetailDrawer}
      onNodeSelect={onNodeSelect}
      onNodeMove={onNodeMove}
      onNodesMove={onNodesMove}
      onEdgeSelect={onEdgeSelect}
    />
  );
}
