"use client";

import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  applyNodeChanges,
  getSmoothStepPath,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Check,
  ChevronDown,
  CircleAlert,
  GitBranch,
  Grip,
  Link2,
  ListTree,
  LoaderCircle,
  Move,
  Pencil,
  Plus,
  Route,
  Save,
  Search,
  Send,
  Trash2,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  createElement,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  createEdgeAction,
  createNodeAction,
  createOrUpdateNodeMemberAction,
  deleteEdgeAction,
  deleteNodeAction,
  deleteNodeMemberAction,
  moveNodeAction,
  updateEdgeAction,
  updateNodeAction,
  updateNodesPositionsAction,
  updateOrgChartStatusAction,
} from "../../app/organigramas/[schoolSlug]/editar/actions";
import { isCollectiveGovernanceNode } from "../../lib/org-chart-template";
import {
  arrangeRelationAreaScene,
  buildRelationAreaScene,
  relationMatchesAreaFilter,
  type RelationAreaFilter,
} from "../../lib/relation-area-scene";
import { OrgChartCanvas } from "./OrgChartCanvas";
import {
  areaLabels,
  edgeLabels,
  getDefaultColorForArea,
  getDefaultIconForArea,
  getIcon,
  memberRoleLabels,
  type OrgNodeData,
  type OrgNodeMemberPreview,
  type PersonPreview,
} from "./OrgNodeCard";

type EditorNodeData = OrgNodeData & {
  person: PersonPreview | null;
  members: OrgNodeMemberPreview[];
  workspace?: {
    mode: WorkspaceMode;
    dimmed: boolean;
    related: boolean;
  };
};

type EditorEdgeData = {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  label: string | null;
};

type ReviewNoteData = {
  id: string;
  nodeId: string | null;
  title: string;
  body: string | null;
  status: string;
};

type Props = {
  schoolSlug: string;
  schoolName: string;
  orgChartId: string;
  orgChartTitle: string;
  orgChartStatus: string;
  orgChartVersion: number;
  initialNodes: EditorNodeData[];
  initialEdges: EditorEdgeData[];
  initialPeople: PersonPreview[];
  initialReviewNotes: ReviewNoteData[];
};

type WorkspaceMode = "structure" | "relations";
type InspectorTab = "function" | "people" | "relations";
type RelationFilter = RelationAreaFilter;

type NodeDraft = {
  title: string;
  area: string;
  formalRole: string;
  realFunction: string;
  description: string;
  weeklyHours: string;
  color: string;
  icon: string;
  personId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type MemberDraft = {
  memberId: string;
  personId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  roleTitle: string;
  weeklyHours: string;
  notes: string;
};

type NewNodeDraft = {
  title: string;
  area: string;
};

type RelationDraft = {
  targetId: string;
  type: string;
  label: string;
};

type RelationEdgeData = {
  edgeType: string;
  displayLabel: string;
  selected: boolean;
  onSelect: (edgeId: string) => void;
};

const defaultMemberDraft: MemberDraft = {
  memberId: "",
  personId: "__new__",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "RESPONSABLE",
  roleTitle: "",
  weeklyHours: "",
  notes: "",
};

const defaultNewNode: NewNodeDraft = {
  title: "",
  area: "OTRO",
};

const defaultRelation: RelationDraft = {
  targetId: "",
  type: "COLABORACION",
  label: "",
};

const relationColors: Record<string, string> = {
  JERARQUICA: "#15803d",
  TRANSVERSAL: "#b45309",
  COLABORACION: "#2563eb",
  ACOMPANAMIENTO: "#7c3aed",
  DECISION: "#dc2626",
  INFORMACION: "#64748b",
};

const relationNames: Record<string, string> = {
  JERARQUICA: "Jerarquía",
  TRANSVERSAL: "Transversal",
  COLABORACION: "Colabora",
  ACOMPANAMIENTO: "Acompaña",
  DECISION: "Integra",
  INFORMACION: "Informa",
};

const areaOptions = Object.keys(areaLabels);
const edgeTypeOptions = Object.keys(edgeLabels);
const memberRoleOptions = Object.keys(memberRoleLabels);

function relationFilterForType(type: string): RelationFilter {
  return type === "DECISION" ? "integration" : "collaboration";
}

function relationMatchesFilter(
  edge: Pick<EditorEdgeData, "type">,
  filter: RelationFilter,
) {
  return relationMatchesAreaFilter(edge, filter);
}

function relationFilterLabel(filter: RelationFilter) {
  if (filter === "integration") return "Integra";
  if (filter === "all") return "Todas";
  return "Colabora";
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isCollectiveNode(node: Pick<OrgNodeData, "title" | "formalRole">) {
  const title = normalize(node.title);
  const formalRole = normalize(node.formalRole ?? "");
  return (
    isCollectiveGovernanceNode(node) ||
    title.includes("consejo") ||
    title.includes("comite") ||
    title.startsWith("equipo directivo") ||
    formalRole.includes("organo colegiado")
  );
}

function isSectionHeader(node: Pick<OrgNodeData, "title">) {
  const title = normalize(node.title);
  return title.startsWith("area ") || title.startsWith("area de ");
}

function personName(person: PersonPreview | null | undefined) {
  if (!person) return null;
  return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || null;
}

function peopleCount(node: EditorNodeData) {
  return new Set([
    ...(node.person?.id ? [node.person.id] : []),
    ...node.members.map((member) => member.person.id),
  ]).size;
}

function relationLabel(edge: Pick<EditorEdgeData, "type" | "label">) {
  const custom = edge.label?.trim();
  if (custom) return custom;
  return relationNames[edge.type] ?? edgeLabels[edge.type] ?? "Relación";
}

function inputClass(extra = "") {
  return `w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${extra}`;
}

function textareaClass(extra = "") {
  return `w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium leading-relaxed text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${extra}`;
}

function nodeToDraft(node: EditorNodeData): NodeDraft {
  return {
    title: node.title,
    area: node.area,
    formalRole: node.formalRole ?? "",
    realFunction: node.realFunction ?? "",
    description: node.description ?? "",
    weeklyHours: node.weeklyHours?.toString() ?? "",
    color: node.color ?? getDefaultColorForArea(node.area),
    icon: node.icon ?? getDefaultIconForArea(node.area),
    personId: node.person?.id ?? "__new__",
    firstName: node.person?.firstName ?? "",
    lastName: node.person?.lastName ?? "",
    email: node.person?.email ?? "",
    phone: node.person?.phone ?? "",
  };
}

function memberToDraft(member: OrgNodeMemberPreview): MemberDraft {
  return {
    memberId: member.id,
    personId: member.person.id,
    firstName: member.person.firstName,
    lastName: member.person.lastName,
    email: member.person.email ?? "",
    phone: member.person.phone ?? "",
    role: member.role,
    roleTitle: member.roleTitle ?? "",
    weeklyHours: member.weeklyHours?.toString() ?? "",
    notes: member.notes ?? "",
  };
}

function toFlowNode(node: EditorNodeData): Node<EditorNodeData> {
  return {
    id: node.id,
    type: "institutionalNode",
    position: { x: node.positionX, y: node.positionY },
    data: node,
  };
}

function InstitutionalNode({
  data,
  selected,
}: NodeProps<Node<EditorNodeData>>) {
  const sectionHeader = isSectionHeader(data);
  const collective = isCollectiveNode(data);
  const team =
    data.formalRole === "Equipo" ||
    /^(personal|tutoras|voluntarios|presupuesto|cobranzas|liquidacion)/.test(
      normalize(data.title),
    );
  const responsible =
    personName(data.person) ??
    personName(
      data.members.find((member) => member.role === "RESPONSABLE")?.person,
    );
  const count = peopleCount(data);
  const mode = data.workspace?.mode ?? "structure";
  const handlesVisible = mode === "structure";

  const treatment = sectionHeader
    ? "w-[290px] border-blue-700 bg-blue-100 text-blue-950"
    : collective
      ? "w-[220px] border-rose-400 bg-rose-100 text-slate-950"
      : team
        ? "w-[210px] border-slate-300 bg-slate-100 text-slate-950"
        : "w-[210px] border-emerald-400 bg-white text-slate-950";

  return (
    <>
      <Handle
        id="top-target"
        type="target"
        position={Position.Top}
        className={
          handlesVisible
            ? "!h-3 !w-3 !border-2 !border-white !bg-emerald-700"
            : "!pointer-events-none !opacity-0"
        }
      />
      <Handle
        id="left-target"
        type="target"
        position={Position.Left}
        className="!pointer-events-none !opacity-0"
      />
      <div
        className={`group relative rounded-xl border px-3.5 py-3 text-center transition duration-150 ${treatment} ${
          selected
            ? "ring-4 ring-blue-200 shadow-xl"
            : data.workspace?.related
              ? "ring-4 ring-amber-200 shadow-lg"
              : "shadow-sm hover:-translate-y-0.5 hover:shadow-md"
        } ${data.workspace?.dimmed ? "opacity-20 saturate-50" : "opacity-100"}`}
      >
        <Grip className="absolute right-2 top-2 h-3.5 w-3.5 text-slate-400 opacity-0 transition group-hover:opacity-100" />
        <div className="flex items-center justify-center gap-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
              sectionHeader
                ? "bg-blue-700 text-white"
                : collective
                  ? "bg-rose-200 text-rose-700"
                  : team
                    ? "bg-white text-slate-500"
                    : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {createElement(getIcon(data.icon, data.area), {
              className: "h-3.5 w-3.5",
            })}
          </span>
          <span className="text-[0.78rem] font-black leading-tight">
            {data.title}
          </span>
        </div>

        {responsible ? (
          <p className="mt-1.5 truncate text-[0.67rem] font-bold text-slate-500">
            {responsible}
          </p>
        ) : collective ? (
          <p className="mt-1.5 text-[0.62rem] font-black uppercase tracking-[0.12em] text-rose-600">
            Órgano colegiado
          </p>
        ) : null}

        {data.formalRole &&
        normalize(data.formalRole) !== normalize(data.title) ? (
          <p className="mt-1 truncate text-[0.62rem] font-semibold text-slate-400">
            {data.formalRole}
          </p>
        ) : null}

        {count > 0 ? (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[0.62rem] font-black text-slate-500">
            <UsersRound className="h-3 w-3" />
            {count}
          </span>
        ) : null}

        <div
          className={`pointer-events-none mt-2 flex items-center justify-center gap-3 border-t pt-2 text-[0.6rem] font-black ${
            collective
              ? "border-rose-200 text-rose-700"
              : sectionHeader
                ? "border-blue-200 text-blue-800"
                : "border-slate-200 text-slate-500"
          }`}
        >
          <span className="inline-flex items-center gap-1">
            <Move className="h-3 w-3" />
            Mover
          </span>
          <span className="inline-flex items-center gap-1">
            <Pencil className="h-3 w-3" />
            Editar
          </span>
        </div>
      </div>
      <Handle
        id="right-source"
        type="source"
        position={Position.Right}
        className="!pointer-events-none !opacity-0"
      />
      <Handle
        id="bottom-source"
        type="source"
        position={Position.Bottom}
        className={
          handlesVisible
            ? "!h-3 !w-3 !border-2 !border-white !bg-emerald-700"
            : "!pointer-events-none !opacity-0"
        }
      />
    </>
  );
}

function InstitutionalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps<Edge<RelationEdgeData>>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 10,
    offset: 22,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
        interactionWidth={34}
      />
      {data?.displayLabel ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            className={`nodrag nopan absolute rounded-full border bg-white px-2.5 py-1 text-[0.65rem] font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              data.selected
                ? "border-blue-500 text-blue-700 ring-4 ring-blue-100"
                : "border-slate-200 text-slate-700"
            }`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              data.onSelect(id);
            }}
            aria-label={`Editar relación ${data.displayLabel}`}
          >
            {data.displayLabel}
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const nodeTypes: NodeTypes = {
  institutionalNode: InstitutionalNode,
};

const edgeTypes = {
  institutionalEdge: InstitutionalEdge,
};

function arrangeHierarchy(
  nodes: Node<EditorNodeData>[],
  edges: EditorEdgeData[],
) {
  const hierarchy = edges.filter((edge) => edge.type === "JERARQUICA");
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  const children = new Map(nodes.map((node) => [node.id, [] as string[]]));

  for (const edge of hierarchy) {
    if (!incoming.has(edge.sourceId) || !incoming.has(edge.targetId)) continue;
    incoming.set(edge.targetId, (incoming.get(edge.targetId) ?? 0) + 1);
    children.get(edge.sourceId)?.push(edge.targetId);
  }

  const roots = nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0);
  const levels = new Map<string, number>();
  const queue = roots.map((node) => ({ id: node.id, level: 0 }));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const previous = levels.get(current.id);
    if (previous !== undefined && previous <= current.level) continue;
    levels.set(current.id, current.level);
    for (const child of children.get(current.id) ?? []) {
      queue.push({ id: child, level: current.level + 1 });
    }
  }

  const byLevel = new Map<number, Node<EditorNodeData>[]>();
  for (const node of nodes) {
    const level = levels.get(node.id) ?? 0;
    byLevel.set(level, [...(byLevel.get(level) ?? []), node]);
  }

  return nodes.map((node) => {
    const level = levels.get(node.id) ?? 0;
    const group = (byLevel.get(level) ?? []).sort(
      (a, b) => a.position.x - b.position.x,
    );
    const index = group.findIndex((item) => item.id === node.id);
    const width = Math.max(330, group.length * 290);
    const x = 110 + (index + 0.5) * (width / group.length);
    const y = 80 + level * 210;
    return {
      ...node,
      position: { x, y },
      data: { ...node.data, positionX: x, positionY: y },
    };
  });
}

export function InstitutionalOrgChartEditor({
  schoolSlug,
  schoolName,
  orgChartId,
  orgChartTitle,
  orgChartStatus,
  orgChartVersion,
  initialNodes,
  initialEdges,
  initialPeople,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(orgChartStatus);
  const [version, setVersion] = useState(orgChartVersion);
  const [mode, setMode] = useState<WorkspaceMode>("structure");
  const [relationFilter, setRelationFilter] =
    useState<RelationFilter>("collaboration");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("function");
  const [nodes, setNodes] = useState<Node<EditorNodeData>[]>(() =>
    initialNodes.map(toFlowNode),
  );
  const [edges, setEdges] = useState<EditorEdgeData[]>(initialEdges);
  const [people, setPeople] = useState<PersonPreview[]>(initialPeople);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [relationLayout, setRelationLayout] = useState<{
    key: string;
    positions: Map<string, { x: number; y: number }>;
  } | null>(null);
  const [nodeDraft, setNodeDraft] = useState<NodeDraft | null>(null);
  const [memberDraft, setMemberDraft] =
    useState<MemberDraft>(defaultMemberDraft);
  const [relationDraft, setRelationDraft] =
    useState<RelationDraft>(defaultRelation);
  const [newNodeDraft, setNewNodeDraft] =
    useState<NewNodeDraft>(defaultNewNode);
  const [showNewNode, setShowNewNode] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );
  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const filteredRelations = useMemo(
    () => edges.filter((edge) => relationMatchesFilter(edge, relationFilter)),
    [edges, relationFilter],
  );
  const relationScene = useMemo(
    () =>
      buildRelationAreaScene(
        nodes.map((node) => ({
          id: node.id,
          title: node.data.title,
          area: node.data.area,
          positionX: node.position.x,
          positionY: node.position.y,
        })),
        edges,
        relationFilter,
        selectedNodeId,
      ),
    [edges, nodes, relationFilter, selectedNodeId],
  );
  const relationSceneKey = useMemo(
    () =>
      [
        relationFilter,
        selectedNodeId ?? "all",
        [...relationScene.visibleNodeIds].sort().join(","),
        [...relationScene.visibleRelationIds].sort().join(","),
        relationScene.groupOrder.join(","),
      ].join("|"),
    [relationFilter, relationScene, selectedNodeId],
  );

  useEffect(() => {
    if (mode !== "relations") return;
    setRelationLayout((current) => {
      if (current?.key === relationSceneKey) return current;
      return {
        key: relationSceneKey,
        positions: arrangeRelationAreaScene(
          nodes.map((node) => ({
            id: node.id,
            title: node.data.title,
            area: node.data.area,
            positionX: node.position.x,
            positionY: node.position.y,
          })),
          relationScene,
        ),
      };
    });
  }, [mode, nodes, relationScene, relationSceneKey]);

  const relationsForSelected = useMemo(
    () =>
      selectedNodeId
        ? edges.filter(
            (edge) =>
              edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId,
          )
        : [],
    [edges, selectedNodeId],
  );

  const displayedNodes = useMemo(
    () => {
      const visible =
        mode === "relations"
          ? nodes.filter((node) => relationScene.visibleNodeIds.has(node.id))
          : nodes;

      return visible.map((node) => {
        const relationPosition =
          mode === "relations" && relationLayout?.key === relationSceneKey
            ? relationLayout.positions.get(node.id)
            : null;
        const nodeGroup = relationScene.groupKeyByNodeId.get(node.id);
        return {
          ...node,
          position: relationPosition ?? node.position,
          data: {
            ...node.data,
            workspace: {
              mode,
              related:
                mode === "relations" &&
                Boolean(relationScene.selectedGroupKey) &&
                nodeGroup !== relationScene.selectedGroupKey,
              dimmed: false,
            },
          },
        };
      });
    },
    [mode, nodes, relationLayout, relationScene, relationSceneKey],
  );

  function selectEdge(edgeId: string) {
    const edge = edges.find((item) => item.id === edgeId);
    if (!edge) return;
    const sourceNode = nodes.find((node) => node.id === edge.sourceId);
    if (edge.type === "JERARQUICA") {
      setMode("structure");
    } else {
      setMode("relations");
      if (relationFilter !== "all") {
        setRelationFilter(relationFilterForType(edge.type));
      }
    }
    setSelectedNodeId(edge.sourceId);
    setNodeDraft(sourceNode ? nodeToDraft(sourceNode.data) : null);
    setSelectedEdgeId(edge.id);
    setInspectorTab("relations");
  }

  const displayedEdges: Edge<RelationEdgeData>[] = (() => {
    const visible = edges.filter((edge) => {
      if (mode === "structure") return edge.type === "JERARQUICA";
      if (edge.type === "JERARQUICA") {
        return relationScene.visibleHierarchyIds.has(edge.id);
      }
      if (selectedEdgeId === edge.id) return true;
      return relationScene.visibleRelationIds.has(edge.id);
    });

    return visible.map((edge): Edge<RelationEdgeData> => {
      const hierarchy = edge.type === "JERARQUICA";
      const color = relationColors[edge.type] ?? "#64748b";
      return {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        sourceHandle: "bottom-source",
        targetHandle: "top-target",
        type: "institutionalEdge",
        interactionWidth: 36,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: 14,
          height: 14,
        },
        style: {
          stroke: color,
          strokeWidth: selectedEdgeId === edge.id ? 3 : hierarchy ? 2.1 : 2.3,
          strokeDasharray: hierarchy ? undefined : "6 7",
          opacity: 0.94,
        },
        data: {
          edgeType: edge.type,
          displayLabel: hierarchy ? "" : relationLabel(edge),
          selected: selectedEdgeId === edge.id,
          onSelect: selectEdge,
        },
      };
    });
  })();

  const filteredNodes = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return [];
    return nodes
      .filter((node) => normalize(node.data.title).includes(normalizedQuery))
      .slice(0, 8);
  }, [nodes, query]);

  const nonHierarchicalCount = edges.filter(
    (edge) => edge.type !== "JERARQUICA",
  ).length;
  const hierarchyCount = edges.length - nonHierarchicalCount;
  const collaborationCount = edges.filter((edge) =>
    relationMatchesFilter(edge, "collaboration"),
  ).length;
  const integrationCount = edges.filter((edge) =>
    relationMatchesFilter(edge, "integration"),
  ).length;
  const activeRelationCount = filteredRelations.length;

  function changeRelationFilter(next: RelationFilter) {
    setMode("relations");
    setRelationFilter(next);
    setSelectedNodeId(null);
    setNodeDraft(null);
    setSelectedEdgeId(null);
    setMemberDraft(defaultMemberDraft);
    setRelationDraft({
      ...defaultRelation,
      type: next === "integration" ? "DECISION" : "COLABORACION",
    });
    setInspectorTab("relations");
  }

  function notify(text: string, tone: "success" | "error" = "success") {
    setMessage({ text, tone });
    window.setTimeout(() => setMessage(null), 3200);
  }

  function updateNodeInState(updated: EditorNodeData) {
    setNodes((current) =>
      current.map((node) =>
        node.id === updated.id
          ? {
              ...node,
              data: updated,
              position: { x: updated.positionX, y: updated.positionY },
            }
          : node,
      ),
    );
  }

  function addPersonToState(person: PersonPreview) {
    setPeople((current) => {
      const exists = current.some((item) => item.id === person.id);
      const next = exists
        ? current.map((item) => (item.id === person.id ? person : item))
        : [...current, person];
      return next.sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
          "es",
        ),
      );
    });
  }

  function handleNodesChange(changes: NodeChange[]) {
    setNodes(
      (current) => applyNodeChanges(changes, current) as Node<EditorNodeData>[],
    );
    if (mode === "relations") {
      setRelationLayout((current) => {
        if (!current || current.key !== relationSceneKey) return current;
        const positions = new Map(current.positions);
        for (const change of changes) {
          if (change.type === "position" && change.position) {
            positions.set(change.id, change.position);
          }
        }
        return { ...current, positions };
      });
    }
  }

  function handleNodeDragStop(_: unknown, node: Node<EditorNodeData>) {
    setNodes((current) =>
      current.map((item) =>
        item.id === node.id
          ? {
              ...item,
              position: node.position,
              data: {
                ...item.data,
                positionX: node.position.x,
                positionY: node.position.y,
              },
            }
          : item,
      ),
    );
    if (mode === "relations") {
      setRelationLayout((current) => {
        if (!current || current.key !== relationSceneKey) return current;
        const positions = new Map(current.positions);
        positions.set(node.id, node.position);
        return { ...current, positions };
      });
    }

    startTransition(async () => {
      try {
        await moveNodeAction({
          nodeId: node.id,
          schoolSlug,
          positionX: node.position.x,
          positionY: node.position.y,
        });
        notify("Posición guardada");
      } catch {
        notify("No se pudo guardar la posición", "error");
      }
    });
  }

  function handleUnifiedNodeMove(input: {
    nodeId: string;
    positionX: number;
    positionY: number;
  }) {
    setNodes((current) =>
      current.map((item) =>
        item.id === input.nodeId
          ? {
              ...item,
              position: { x: input.positionX, y: input.positionY },
              data: {
                ...item.data,
                positionX: input.positionX,
                positionY: input.positionY,
              },
            }
          : item,
      ),
    );

    startTransition(async () => {
      try {
        await moveNodeAction({
          nodeId: input.nodeId,
          schoolSlug,
          positionX: input.positionX,
          positionY: input.positionY,
        });
        notify("Posición guardada");
      } catch {
        notify("No se pudo guardar la posición", "error");
      }
    });
  }

  function handleUnifiedNodesMove(
    positions: Array<{
      nodeId: string;
      positionX: number;
      positionY: number;
    }>,
  ) {
    const positionById = new Map(
      positions.map((position) => [position.nodeId, position]),
    );

    setNodes((current) =>
      current.map((item) => {
        const position = positionById.get(item.id);
        if (!position) return item;
        return {
          ...item,
          position: { x: position.positionX, y: position.positionY },
          data: {
            ...item.data,
            positionX: position.positionX,
            positionY: position.positionY,
          },
        };
      }),
    );

    startTransition(async () => {
      try {
        await updateNodesPositionsAction({
          schoolSlug,
          positions,
        });
        notify("Vista Institucional guardada como posición principal");
      } catch {
        notify("No se pudo guardar la composición Institucional", "error");
      }
    });
  }

  function handleNodeClick(nodeId: string) {
    const node = nodes.find((item) => item.id === nodeId);
    setSelectedNodeId(nodeId);
    setNodeDraft(node ? nodeToDraft(node.data) : null);
    setSelectedEdgeId(null);
    setMemberDraft(defaultMemberDraft);
    setRelationDraft({
      ...defaultRelation,
      type:
        mode === "relations" && relationFilter === "integration"
          ? "DECISION"
          : "COLABORACION",
    });
    setInspectorTab(mode === "relations" ? "relations" : "function");
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    createRelation({
      sourceId: connection.source,
      targetId: connection.target,
      type: "JERARQUICA",
      label: "",
    });
  }

  function createRelation(input: {
    sourceId: string;
    targetId: string;
    type: string;
    label: string;
  }) {
    if (!input.sourceId || !input.targetId) {
      notify("Elegí origen y destino", "error");
      return;
    }
    if (input.sourceId === input.targetId) {
      notify("Una caja no puede vincularse consigo misma", "error");
      return;
    }

    startTransition(async () => {
      try {
        const created = await createEdgeAction({
          orgChartId,
          schoolSlug,
          sourceId: input.sourceId,
          targetId: input.targetId,
          type: input.type,
          label: input.label,
        });
        const next = {
          id: created.id,
          sourceId: created.sourceId,
          targetId: created.targetId,
          type: created.type,
          label: created.label,
        };
        setEdges((current) => [
          ...current.filter(
            (edge) =>
              !(
                edge.sourceId === next.sourceId &&
                edge.targetId === next.targetId
              ),
          ),
          next,
        ]);
        setMode(input.type === "JERARQUICA" ? "structure" : "relations");
        if (input.type !== "JERARQUICA") {
          setRelationFilter(relationFilterForType(input.type));
        }
        setSelectedNodeId(input.sourceId);
        setSelectedEdgeId(next.id);
        setInspectorTab("relations");
        setRelationDraft({
          ...defaultRelation,
          type: input.type === "DECISION" ? "DECISION" : "COLABORACION",
        });
        notify("Relación guardada");
      } catch (error) {
        notify(
          error instanceof Error
            ? error.message
            : "No se pudo guardar la relación",
          "error",
        );
      }
    });
  }

  function handleCreateNode() {
    if (!newNodeDraft.title.trim()) {
      notify("Escribí el nombre de la nueva caja", "error");
      return;
    }
    const positionX = 160 + (nodes.length % 5) * 280;
    const positionY = 300 + Math.floor(nodes.length / 5) * 190;

    startTransition(async () => {
      try {
        const created = (await createNodeAction({
          orgChartId,
          schoolSlug,
          title: newNodeDraft.title,
          area: newNodeDraft.area,
          color: getDefaultColorForArea(newNodeDraft.area),
          icon: getDefaultIconForArea(newNodeDraft.area),
          positionX,
          positionY,
        })) as EditorNodeData;
        setNodes((current) => [...current, toFlowNode(created)]);
        setNewNodeDraft(defaultNewNode);
        setShowNewNode(false);
        setSelectedNodeId(created.id);
        setNodeDraft(nodeToDraft(created));
        setInspectorTab("function");
        notify("Caja creada");
      } catch {
        notify("No se pudo crear la caja", "error");
      }
    });
  }

  function handleAutoArrange() {
    const arranged = arrangeHierarchy(nodes, edges);
    setNodes(arranged);
    startTransition(async () => {
      try {
        await updateNodesPositionsAction({
          schoolSlug,
          positions: arranged.map((node) => ({
            nodeId: node.id,
            positionX: node.position.x,
            positionY: node.position.y,
          })),
        });
        notify("Estructura ordenada y guardada");
      } catch {
        notify("No se pudo guardar el orden", "error");
      }
    });
  }

  function handleSaveNode() {
    if (!selectedNode || !nodeDraft) return;
    if (!nodeDraft.title.trim()) {
      notify("La caja necesita un título", "error");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateNodeAction({
          nodeId: selectedNode.id,
          schoolSlug,
          title: nodeDraft.title,
          area: nodeDraft.area,
          formalRole: nodeDraft.formalRole,
          realFunction: nodeDraft.realFunction,
          description: nodeDraft.description,
          weeklyHours: nodeDraft.weeklyHours,
          color: nodeDraft.color,
          icon: nodeDraft.icon,
          personId: isCollectiveNode(selectedNode.data)
            ? "__new__"
            : nodeDraft.personId,
          personFirstName: isCollectiveNode(selectedNode.data)
            ? ""
            : nodeDraft.firstName,
          personLastName: isCollectiveNode(selectedNode.data)
            ? ""
            : nodeDraft.lastName,
          personEmail: isCollectiveNode(selectedNode.data)
            ? ""
            : nodeDraft.email,
          personPhone: isCollectiveNode(selectedNode.data)
            ? ""
            : nodeDraft.phone,
        });
        const updated = result.node as EditorNodeData;
        updateNodeInState(updated);
        setNodeDraft(nodeToDraft(updated));
        if (result.person) addPersonToState(result.person);
        notify("Cambios guardados");
      } catch (error) {
        notify(
          error instanceof Error ? error.message : "No se pudo guardar",
          "error",
        );
      }
    });
  }

  function handleSaveMember() {
    if (!selectedNode) return;
    if (
      memberDraft.personId === "__new__" &&
      !memberDraft.firstName.trim() &&
      !memberDraft.lastName.trim()
    ) {
      notify("Escribí al menos el nombre o el apellido", "error");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createOrUpdateNodeMemberAction({
          schoolSlug,
          orgNodeId: selectedNode.id,
          memberId: memberDraft.memberId || null,
          personId: memberDraft.personId,
          firstName: memberDraft.firstName,
          lastName: memberDraft.lastName,
          email: memberDraft.email,
          phone: memberDraft.phone,
          role: memberDraft.role,
          roleTitle: memberDraft.roleTitle,
          weeklyHours: memberDraft.weeklyHours,
          notes: memberDraft.notes,
        });
        updateNodeInState(result.node as EditorNodeData);
        addPersonToState(result.member.person);
        setMemberDraft(defaultMemberDraft);
        notify("Persona guardada y asignada");
      } catch (error) {
        notify(
          error instanceof Error
            ? error.message
            : "No se pudo guardar la persona",
          "error",
        );
      }
    });
  }

  function handleDeleteMember(memberId: string) {
    if (!selectedNode) return;
    startTransition(async () => {
      try {
        const result = await deleteNodeMemberAction({
          schoolSlug,
          memberId,
          orgNodeId: selectedNode.id,
        });
        updateNodeInState(result.node as EditorNodeData);
        notify("Persona quitada de esta caja");
      } catch {
        notify("No se pudo quitar la persona", "error");
      }
    });
  }

  function handleSaveEdge() {
    if (!selectedEdge) return;
    startTransition(async () => {
      try {
        const updated = await updateEdgeAction({
          edgeId: selectedEdge.id,
          schoolSlug,
          type: selectedEdge.type,
          label: selectedEdge.label,
        });
        setEdges((current) =>
          current.map((edge) =>
            edge.id === updated.id
              ? {
                  id: updated.id,
                  sourceId: updated.sourceId,
                  targetId: updated.targetId,
                  type: updated.type,
                  label: updated.label,
                }
              : edge,
          ),
        );
        if (updated.type === "JERARQUICA") {
          setMode("structure");
        } else {
          setMode("relations");
          if (relationFilter !== "all") {
            setRelationFilter(relationFilterForType(updated.type));
          }
        }
        notify("Relación actualizada");
      } catch {
        notify("No se pudo actualizar la relación", "error");
      }
    });
  }

  function handleDeleteEdge(edgeId: string) {
    startTransition(async () => {
      try {
        await deleteEdgeAction({ edgeId, schoolSlug });
        setEdges((current) => current.filter((edge) => edge.id !== edgeId));
        setSelectedEdgeId(null);
        notify("Relación eliminada");
      } catch {
        notify("No se pudo eliminar la relación", "error");
      }
    });
  }

  function handleDeleteNode() {
    if (!selectedNode) return;
    const nodeId = selectedNode.id;
    startTransition(async () => {
      try {
        await deleteNodeAction({ nodeId, schoolSlug });
        setNodes((current) => current.filter((node) => node.id !== nodeId));
        setEdges((current) =>
          current.filter(
            (edge) => edge.sourceId !== nodeId && edge.targetId !== nodeId,
          ),
        );
        setSelectedNodeId(null);
        setNodeDraft(null);
        notify("Caja eliminada");
      } catch {
        notify("No se pudo eliminar la caja", "error");
      }
    });
  }

  function handleStatus(next: "REVIEW" | "PUBLISHED") {
    startTransition(async () => {
      try {
        const chart = await updateOrgChartStatusAction({
          orgChartId,
          schoolSlug,
          status: next,
        });
        setStatus(chart.status);
        setVersion(chart.version);
        notify(next === "REVIEW" ? "Enviado a revisión" : "Publicado");
      } catch {
        notify("No se pudo cambiar el estado", "error");
      }
    });
  }

  // Mantener estable la referencia evita recalcular todo el canvas cuando
  // cambia un mensaje, el estado de guardado o cualquier panel lateral.
  // Solo cambia cuando realmente cambia una caja del organigrama.
  const canvasNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node.data,
        positionX: node.position.x,
        positionY: node.position.y,
      })),
    [nodes],
  );

  return (
    <div className="space-y-4">
      <header className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                Editor institucional
              </p>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.65rem] font-black text-slate-600">
                Versión {version}
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[0.65rem] font-black text-amber-700">
                {status}
              </span>
            </div>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
              {schoolName}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              La posición real se administra en la vista Global. Resumen y Por áreas sirven para leer el mismo organigrama sin alterar su geometría.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNewNode((current) => !current)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3.5 py-2.5 text-xs font-black text-white transition hover:bg-blue-800"
            >
              {showNewNode ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showNewNode ? "Cerrar" : "Nueva caja"}
            </button>
            <button
              type="button"
              onClick={() => handleStatus("REVIEW")}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Revisar
            </button>
            <button
              type="button"
              onClick={() => handleStatus("PUBLISHED")}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-black text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Publicar
            </button>
          </div>
        </div>
      </header>

      <div className="relative">
        <OrgChartCanvas
          nodes={canvasNodes}
          edges={edges}
          schoolSlug={schoolSlug}
          orgChartTitle={orgChartTitle}
          designMode="institutional"
          editable
          selectedNodeId={selectedNodeId}
          hideDetailDrawer
          onNodeSelect={(nodeId) => {
            if (!nodeId) {
              setSelectedNodeId(null);
              setNodeDraft(null);
              setSelectedEdgeId(null);
              setMemberDraft(defaultMemberDraft);
              return;
            }
            handleNodeClick(nodeId);
          }}
          onNodeMove={handleUnifiedNodeMove}
          onNodesMove={handleUnifiedNodesMove}
          onEdgeSelect={selectEdge}
        />

        {showNewNode ? (
          <div className="absolute left-4 top-24 z-[70] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-blue-100 bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                  Nueva caja
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Se crea en el mismo organigrama y después la podés mover y editar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewNode(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Cerrar creación de caja"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2">
              <input
                className={inputClass()}
                value={newNodeDraft.title}
                onChange={(event) =>
                  setNewNodeDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Nombre del cargo o equipo"
              />
              <select
                className={inputClass()}
                value={newNodeDraft.area}
                onChange={(event) =>
                  setNewNodeDraft((current) => ({
                    ...current,
                    area: event.target.value,
                  }))
                }
              >
                {areaOptions.map((area) => (
                  <option key={area} value={area}>
                    {areaLabels[area]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleCreateNode}
                disabled={isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Crear y editar
              </button>
            </div>
          </div>
        ) : null}

        {message ? (
          <div
            aria-live="polite"
            className={`absolute left-1/2 top-24 z-[80] flex max-w-sm -translate-x-1/2 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black shadow-lg ${
              message.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {message.tone === "success" ? (
              <Check className="h-4 w-4" />
            ) : (
              <CircleAlert className="h-4 w-4" />
            )}
            {message.text}
          </div>
        ) : null}

        {isPending ? (
          <div className="pointer-events-none absolute bottom-4 left-4 z-[70] inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-black text-slate-500 shadow-sm">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            Guardando…
          </div>
        ) : null}

        {selectedNode && nodeDraft ? (
          <aside className="absolute bottom-4 right-4 top-24 z-[70] w-[calc(100%-2rem)] max-w-[430px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-blue-700">
                      Editar caja
                    </p>
                    <h3 className="mt-1 truncate text-lg font-black text-slate-950">
                      {selectedNode.data.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNodeId(null);
                      setNodeDraft(null);
                      setSelectedEdgeId(null);
                    }}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                    aria-label="Cerrar panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 rounded-xl bg-slate-100 p-1">
                  <InspectorTabButton
                    active={inspectorTab === "function"}
                    label="Función"
                    onClick={() => setInspectorTab("function")}
                  />
                  <InspectorTabButton
                    active={inspectorTab === "people"}
                    label={`Personas (${peopleCount(selectedNode.data)})`}
                    onClick={() => setInspectorTab("people")}
                  />
                  <InspectorTabButton
                    active={inspectorTab === "relations"}
                    label={`Vínculos (${relationsForSelected.length})`}
                    onClick={() => setInspectorTab("relations")}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {inspectorTab === "function" ? (
                  <FunctionPanel
                    draft={nodeDraft}
                    people={people}
                    collective={isCollectiveNode(selectedNode.data)}
                    onChange={setNodeDraft}
                    onSave={handleSaveNode}
                    onDelete={handleDeleteNode}
                    pending={isPending}
                  />
                ) : inspectorTab === "people" ? (
                  <PeoplePanel
                    node={selectedNode.data}
                    people={people}
                    draft={memberDraft}
                    onDraftChange={setMemberDraft}
                    onEdit={setMemberDraft}
                    onSave={handleSaveMember}
                    onDelete={handleDeleteMember}
                    pending={isPending}
                  />
                ) : (
                  <RelationsPanel
                    selectedNode={selectedNode}
                    relations={relationsForSelected}
                    selectedEdge={selectedEdge}
                    nodeById={nodeById}
                    draft={relationDraft}
                    onDraftChange={setRelationDraft}
                    onCreate={() =>
                      createRelation({
                        sourceId: selectedNode.id,
                        targetId: relationDraft.targetId,
                        type: relationDraft.type,
                        label: relationDraft.label,
                      })
                    }
                    onSelect={selectEdge}
                    onSelectedEdgeChange={(patch) => {
                      if (!selectedEdge) return;
                      setEdges((current) =>
                        current.map((edge) =>
                          edge.id === selectedEdge.id ? { ...edge, ...patch } : edge,
                        ),
                      );
                    }}
                    onSave={handleSaveEdge}
                    onDelete={handleDeleteEdge}
                    pending={isPending}
                  />
                )}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  Icon,
  label,
  onClick,
}: {
  active: boolean;
  Icon: typeof ListTree;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-black transition ${
        active
          ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
          : "text-slate-500 hover:text-slate-900"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function InspectorTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2 py-2 text-[0.68rem] font-black transition ${
        active
          ? "bg-white text-blue-700 shadow-sm"
          : "text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}

function FunctionPanel({
  draft,
  people,
  collective,
  onChange,
  onSave,
  onDelete,
  pending,
}: {
  draft: NodeDraft;
  people: PersonPreview[];
  collective: boolean;
  onChange: (draft: NodeDraft) => void;
  onSave: () => void;
  onDelete: () => void;
  pending: boolean;
}) {
  return (
    <div className="space-y-3">
      <FieldLabel label="Nombre visible">
        <input
          className={inputClass()}
          value={draft.title}
          onChange={(event) =>
            onChange({ ...draft, title: event.target.value })
          }
        />
      </FieldLabel>
      <FieldLabel label="Área">
        <select
          className={inputClass()}
          value={draft.area}
          onChange={(event) => {
            const area = event.target.value;
            onChange({
              ...draft,
              area,
              color: getDefaultColorForArea(area),
              icon: getDefaultIconForArea(area),
            });
          }}
        >
          {areaOptions.map((area) => (
            <option key={area} value={area}>
              {areaLabels[area]}
            </option>
          ))}
        </select>
      </FieldLabel>
      <FieldLabel label="Cargo formal">
        <input
          className={inputClass()}
          value={draft.formalRole}
          onChange={(event) =>
            onChange({ ...draft, formalRole: event.target.value })
          }
          placeholder="Ej.: Coordinadora"
        />
      </FieldLabel>
      <FieldLabel label="Función real">
        <textarea
          className={textareaClass("min-h-24")}
          value={draft.realFunction}
          onChange={(event) =>
            onChange({ ...draft, realFunction: event.target.value })
          }
          placeholder="Qué sostiene realmente esta función"
        />
      </FieldLabel>
      <FieldLabel label="Descripción u observaciones">
        <textarea
          className={textareaClass("min-h-20")}
          value={draft.description}
          onChange={(event) =>
            onChange({ ...draft, description: event.target.value })
          }
        />
      </FieldLabel>
      <FieldLabel label="Horas semanales">
        <input
          className={inputClass()}
          type="number"
          min="0"
          value={draft.weeklyHours}
          onChange={(event) =>
            onChange({ ...draft, weeklyHours: event.target.value })
          }
          placeholder="Ej.: 20"
        />
      </FieldLabel>

      {!collective ? (
        <details className="group rounded-2xl border border-blue-100 bg-blue-50 p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-black text-blue-950">
            <span className="inline-flex items-center gap-2">
              <UserRound className="h-4 w-4 text-blue-700" />
              Responsable principal
            </span>
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </summary>
          <div className="mt-3 space-y-2">
            <select
              className={inputClass()}
              value={draft.personId}
              onChange={(event) => {
                const person = people.find(
                  (item) => item.id === event.target.value,
                );
                onChange({
                  ...draft,
                  personId: event.target.value,
                  firstName: person?.firstName ?? "",
                  lastName: person?.lastName ?? "",
                  email: person?.email ?? "",
                  phone: person?.phone ?? "",
                });
              }}
            >
              <option value="__new__">Crear una persona nueva</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {`${person.firstName} ${person.lastName}`.trim()}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                className={inputClass()}
                value={draft.firstName}
                onChange={(event) =>
                  onChange({ ...draft, firstName: event.target.value })
                }
                placeholder="Nombre"
              />
              <input
                className={inputClass()}
                value={draft.lastName}
                onChange={(event) =>
                  onChange({ ...draft, lastName: event.target.value })
                }
                placeholder="Apellido"
              />
            </div>
            <input
              className={inputClass()}
              value={draft.email}
              onChange={(event) =>
                onChange({ ...draft, email: event.target.value })
              }
              placeholder="Email"
            />
            <input
              className={inputClass()}
              value={draft.phone}
              onChange={(event) =>
                onChange({ ...draft, phone: event.target.value })
              }
              placeholder="Teléfono"
            />
          </div>
        </details>
      ) : (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold leading-relaxed text-rose-900">
          Este es un órgano colegiado. Sus integrantes se cargan en la pestaña
          <strong> Personas</strong>; no se fuerza un único responsable.
        </div>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        Guardar función
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
        Eliminar caja
      </button>
    </div>
  );
}

function PeoplePanel({
  node,
  people,
  draft,
  onDraftChange,
  onEdit,
  onSave,
  onDelete,
  pending,
}: {
  node: EditorNodeData;
  people: PersonPreview[];
  draft: MemberDraft;
  onDraftChange: (draft: MemberDraft) => void;
  onEdit: (draft: MemberDraft) => void;
  onSave: () => void;
  onDelete: (memberId: string) => void;
  pending: boolean;
}) {
  return (
    <div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
        <div className="flex items-center gap-2 text-sm font-black text-blue-950">
          <UserPlus className="h-4 w-4 text-blue-700" />
          Crear o asignar persona
        </div>
        <p className="mt-1.5 text-xs font-semibold leading-relaxed text-blue-900/75">
          Podés crearla acá o reutilizar una existente. Queda disponible en todo
          el colegio y no hace falta cargarla de nuevo.
        </p>
      </div>

      {node.person ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-blue-700">
            Responsable principal
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {personName(node.person)}
          </p>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {node.members.map((member) => (
          <div
            key={member.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">
                  {personName(member.person)}
                </p>
                <p className="mt-1 text-[0.68rem] font-bold text-slate-500">
                  {memberRoleLabels[member.role] ?? member.role}
                  {member.roleTitle ? ` · ${member.roleTitle}` : ""}
                  {member.weeklyHours !== null
                    ? ` · ${member.weeklyHours} hs.`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(memberToDraft(member))}
                  className="rounded-lg bg-white px-2 py-1.5 text-[0.65rem] font-black text-blue-700 shadow-sm"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(member.id)}
                  className="rounded-lg bg-white px-2 py-1.5 text-[0.65rem] font-black text-rose-700 shadow-sm"
                >
                  Quitar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-black text-slate-950">
            {draft.memberId ? "Editar asignación" : "Nueva persona"}
          </p>
          {draft.memberId ? (
            <button
              type="button"
              onClick={() => onDraftChange(defaultMemberDraft)}
              className="text-[0.68rem] font-black text-blue-700"
            >
              Crear otra
            </button>
          ) : null}
        </div>
        <select
          className={inputClass()}
          value={draft.personId}
          onChange={(event) => {
            const person = people.find(
              (item) => item.id === event.target.value,
            );
            onDraftChange({
              ...draft,
              personId: event.target.value,
              firstName: person?.firstName ?? "",
              lastName: person?.lastName ?? "",
              email: person?.email ?? "",
              phone: person?.phone ?? "",
            });
          }}
        >
          <option value="__new__">Crear una persona nueva</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {`${person.firstName} ${person.lastName}`.trim()}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            className={inputClass()}
            value={draft.firstName}
            onChange={(event) =>
              onDraftChange({ ...draft, firstName: event.target.value })
            }
            placeholder="Nombre"
          />
          <input
            className={inputClass()}
            value={draft.lastName}
            onChange={(event) =>
              onDraftChange({ ...draft, lastName: event.target.value })
            }
            placeholder="Apellido"
          />
        </div>
        <input
          className={inputClass()}
          value={draft.email}
          onChange={(event) =>
            onDraftChange({ ...draft, email: event.target.value })
          }
          placeholder="Email"
        />
        <input
          className={inputClass()}
          value={draft.phone}
          onChange={(event) =>
            onDraftChange({ ...draft, phone: event.target.value })
          }
          placeholder="Teléfono"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            className={inputClass()}
            value={draft.role}
            onChange={(event) =>
              onDraftChange({ ...draft, role: event.target.value })
            }
          >
            {memberRoleOptions.map((role) => (
              <option key={role} value={role}>
                {memberRoleLabels[role]}
              </option>
            ))}
          </select>
          <input
            className={inputClass()}
            type="number"
            min="0"
            value={draft.weeklyHours}
            onChange={(event) =>
              onDraftChange({ ...draft, weeklyHours: event.target.value })
            }
            placeholder="Horas"
          />
        </div>
        <input
          className={inputClass()}
          value={draft.roleTitle}
          onChange={(event) =>
            onDraftChange({ ...draft, roleTitle: event.target.value })
          }
          placeholder="Cargo dentro de esta caja"
        />
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          Guardar persona
        </button>
      </div>
    </div>
  );
}

function RelationsPanel({
  selectedNode,
  relations,
  selectedEdge,
  nodeById,
  draft,
  onDraftChange,
  onCreate,
  onSelect,
  onSelectedEdgeChange,
  onSave,
  onDelete,
  pending,
}: {
  selectedNode: Node<EditorNodeData>;
  relations: EditorEdgeData[];
  selectedEdge: EditorEdgeData | null;
  nodeById: Map<string, Node<EditorNodeData>>;
  draft: RelationDraft;
  onDraftChange: (draft: RelationDraft) => void;
  onCreate: () => void;
  onSelect: (edgeId: string) => void;
  onSelectedEdgeChange: (patch: Partial<EditorEdgeData>) => void;
  onSave: () => void;
  onDelete: (edgeId: string) => void;
  pending: boolean;
}) {
  return (
    <div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs font-semibold leading-relaxed text-blue-900">
        El mapa muestra únicamente estos vínculos. Tocá la etiqueta de una línea
        o elegila en la lista: ambos abren este mismo editor.
      </div>

      <div className="mt-3 space-y-2">
        {relations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs font-semibold text-slate-500">
            Esta caja todavía no tiene vínculos.
          </div>
        ) : (
          relations.map((edge) => {
            const outgoing = edge.sourceId === selectedNode.id;
            const other = nodeById.get(
              outgoing ? edge.targetId : edge.sourceId,
            );
            const color = relationColors[edge.type] ?? "#64748b";
            return (
              <button
                key={edge.id}
                type="button"
                onClick={() => onSelect(edge.id)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                  selectedEdge?.id === edge.id
                    ? "border-blue-400 bg-blue-50 ring-4 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-blue-300"
                }`}
              >
                <span
                  className="h-9 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-black text-slate-950">
                    {outgoing ? "Hacia" : "Desde"}{" "}
                    {other?.data.title ?? "otra caja"}
                  </span>
                  <span className="mt-1 block text-[0.66rem] font-black text-slate-500">
                    {relationLabel(edge)}
                  </span>
                </span>
                <span className="text-[0.64rem] font-black text-blue-700">
                  Editar
                </span>
              </button>
            );
          })
        )}
      </div>

      {selectedEdge ? (
        <div className="mt-4 space-y-2 rounded-2xl border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-black text-blue-950">Editar vínculo</p>
            <button
              type="button"
              onClick={() => onDelete(selectedEdge.id)}
              disabled={pending}
              className="rounded-lg bg-white p-2 text-rose-700 shadow-sm disabled:opacity-50"
              aria-label="Eliminar relación"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <select
            className={inputClass()}
            value={selectedEdge.type}
            onChange={(event) =>
              onSelectedEdgeChange({ type: event.target.value })
            }
          >
            {edgeTypeOptions.map((type) => (
              <option key={type} value={type}>
                {relationNames[type] ?? edgeLabels[type]}
              </option>
            ))}
          </select>
          <input
            className={inputClass()}
            value={selectedEdge.label ?? ""}
            onChange={(event) =>
              onSelectedEdgeChange({ label: event.target.value })
            }
            placeholder="Etiqueta opcional"
          />
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Guardar vínculo
          </button>
        </div>
      ) : null}

      <details className="group mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-black text-slate-950">
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-700" />
            Crear relación
          </span>
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-slate-500">
            Desde <strong>{selectedNode.data.title}</strong> hacia:
          </p>
          <select
            className={inputClass()}
            value={draft.targetId}
            onChange={(event) =>
              onDraftChange({ ...draft, targetId: event.target.value })
            }
          >
            <option value="">Elegir destino</option>
            {[...nodeById.values()]
              .filter((node) => node.id !== selectedNode.id)
              .sort((a, b) => a.data.title.localeCompare(b.data.title, "es"))
              .map((node) => (
                <option key={node.id} value={node.id}>
                  {node.data.title}
                </option>
              ))}
          </select>
          <select
            className={inputClass()}
            value={draft.type}
            onChange={(event) =>
              onDraftChange({ ...draft, type: event.target.value })
            }
          >
            {edgeTypeOptions.map((type) => (
              <option key={type} value={type}>
                {relationNames[type] ?? edgeLabels[type]}
              </option>
            ))}
          </select>
          <input
            className={inputClass()}
            value={draft.label}
            onChange={(event) =>
              onDraftChange({ ...draft, label: event.target.value })
            }
            placeholder="Etiqueta opcional"
          />
          <button
            type="button"
            onClick={onCreate}
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            <Link2 className="h-4 w-4" />
            Crear vínculo
          </button>
        </div>
      </details>
    </div>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.65rem] font-black uppercase tracking-[0.11em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
