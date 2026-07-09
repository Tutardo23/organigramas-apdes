"use client";

import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CheckCircle2,
  CircleAlert,
  GitBranch,
  HelpCircle,
  Layers3,
  Link2,
  MousePointer2,
  Paintbrush,
  Plus,
  Route,
  Save,
  Send,
  Shuffle,
  Trash2,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createEdgeAction,
  createNodeAction,
  createOrUpdateNodeMemberAction,
  createReviewNoteAction,
  deleteEdgeAction,
  deleteNodeAction,
  deleteNodeMemberAction,
  moveNodeAction,
  updateEdgeAction,
  updateNodeAction,
  updateNodesPositionsAction,
  updateOrgChartStatusAction,
} from "../../app/organigramas/[schoolSlug]/editar/actions";
import {
  OrgNodeCard,
  areaLabels,
  colorPresets,
  edgeLabels,
  getNodeColor,
  iconOptions,
  memberRoleLabels,
  type OrgNodeData,
  type OrgNodeMemberPreview,
  type PersonPreview,
} from "./OrgNodeCard";

type EditorNodeData = OrgNodeData & {
  person: PersonPreview | null;
  members: OrgNodeMemberPreview[];
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
  orgChartStatus: string;
  orgChartVersion: number;
  initialNodes: EditorNodeData[];
  initialEdges: EditorEdgeData[];
  initialPeople: PersonPreview[];
  initialReviewNotes: ReviewNoteData[];
};

type EditDraft = {
  title: string;
  area: string;
  formalRole: string;
  realFunction: string;
  description: string;
  weeklyHours: string;
  color: string;
  icon: string;
  personId: string;
  personFirstName: string;
  personLastName: string;
  personEmail: string;
  personPhone: string;
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
  color: string;
  icon: string;
};

type RelationDraft = {
  sourceId: string;
  targetId: string;
  type: string;
  label: string;
};

const areaOptions = Object.keys(areaLabels);
const edgeTypeOptions = Object.keys(edgeLabels);
const memberRoleOptions = Object.keys(memberRoleLabels);

const defaultNewNode: NewNodeDraft = {
  title: "Nuevo cargo o área",
  area: "OTRO",
  color: "#2563eb",
  icon: "network",
};

const defaultRelation: RelationDraft = {
  sourceId: "",
  targetId: "",
  type: "JERARQUICA",
  label: "",
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

const edgeColors: Record<string, string> = {
  JERARQUICA: "#1d4ed8",
  TRANSVERSAL: "#d97706",
  COLABORACION: "#0f766e",
  ACOMPANAMIENTO: "#7c3aed",
  DECISION: "#be123c",
  INFORMACION: "#64748b",
};

function inputClass(extra = "") {
  return `w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${extra}`;
}

function textareaClass(extra = "") {
  return `w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${extra}`;
}

function EditorNode({ data, selected }: NodeProps<Node<EditorNodeData>>) {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3.5 !w-3.5 !border-2 !border-white !bg-blue-700"
      />
      <OrgNodeCard data={data} selected={selected} editor />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3.5 !w-3.5 !border-2 !border-white !bg-blue-700"
      />
    </>
  );
}

const nodeTypes: NodeTypes = {
  editorNode: EditorNode,
};

function toFlowNode(node: EditorNodeData): Node<EditorNodeData> {
  return {
    id: node.id,
    type: "editorNode",
    position: { x: node.positionX, y: node.positionY },
    data: node,
  };
}

function toFlowEdge(edge: EditorEdgeData): Edge {
  const isMain = edge.type === "JERARQUICA";
  const stroke = edgeColors[edge.type] ?? "#64748b";

  return {
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    label: edge.label || (!isMain ? edgeLabels[edge.type] : undefined),
    type: "smoothstep",
    animated: !isMain,
    markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
    style: {
      strokeWidth: isMain ? 2.8 : 2.2,
      stroke,
      strokeDasharray: isMain ? undefined : "8 8",
    },
    labelStyle: { fontWeight: 900, fill: "#334155", fontSize: 11 },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.96 },
    labelBgPadding: [8, 5],
    labelBgBorderRadius: 999,
    data: { edgeType: edge.type, rawLabel: edge.label },
  };
}

function nodeToDraft(node: EditorNodeData): EditDraft {
  return {
    title: node.title,
    area: node.area,
    formalRole: node.formalRole ?? "",
    realFunction: node.realFunction ?? "",
    description: node.description ?? "",
    weeklyHours: node.weeklyHours?.toString() ?? "",
    color: getNodeColor(node.color, node.area),
    icon: node.icon ?? "network",
    personId: node.person?.id ?? "__new__",
    personFirstName: node.person?.firstName ?? "",
    personLastName: node.person?.lastName ?? "",
    personEmail: node.person?.email ?? "",
    personPhone: node.person?.phone ?? "",
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

function buildAutoLayout(nodes: Node<EditorNodeData>[], edges: Edge[]) {
  const hierarchyEdges = edges.filter((edge) => edge.data?.edgeType === "JERARQUICA");
  const nodeIds = new Set(nodes.map((node) => node.id));
  const incoming = new Map<string, number>();
  const children = new Map<string, string[]>();

  for (const node of nodes) {
    incoming.set(node.id, 0);
    children.set(node.id, []);
  }

  for (const edge of hierarchyEdges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    children.set(edge.source, [...(children.get(edge.source) ?? []), edge.target]);
  }

  const roots = nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0).map((node) => node.id);
  const levelById = new Map<string, number>();
  const queue = (roots.length > 0 ? roots : nodes.map((node) => node.id)).map((id) => ({ id, level: 0 }));

  while (queue.length > 0) {
    const item = queue.shift()!;
    const currentLevel = levelById.get(item.id);
    if (currentLevel !== undefined && currentLevel <= item.level) continue;
    levelById.set(item.id, item.level);
    for (const childId of children.get(item.id) ?? []) {
      queue.push({ id: childId, level: item.level + 1 });
    }
  }

  let fallbackLevel = 0;
  for (const node of nodes) {
    if (!levelById.has(node.id)) {
      fallbackLevel += 1;
      levelById.set(node.id, fallbackLevel);
    }
  }

  const groups = new Map<number, Node<EditorNodeData>[]>();
  for (const node of nodes) {
    const level = levelById.get(node.id) ?? 0;
    groups.set(level, [...(groups.get(level) ?? []), node]);
  }

  const spacingX = 430;
  const spacingY = 300;
  const centerX = 950;

  return nodes.map((node) => {
    const level = levelById.get(node.id) ?? 0;
    const group = groups.get(level) ?? [];
    const index = group.findIndex((item) => item.id === node.id);
    const x = centerX + (index - (group.length - 1) / 2) * spacingX;
    const y = 80 + level * spacingY;
    return { ...node, position: { x, y }, data: { ...node.data, positionX: x, positionY: y } };
  });
}

function getReviewChecks(nodes: Node<EditorNodeData>[], edges: Edge[]) {
  const areas = new Set(nodes.map((node) => node.data.area));
  const requiredAreas = ["DIRECCION", "ACADEMICA", "FORMACION", "FAMILIA", "COMUNICACION", "POSTULACIONES", "OPERACIONES"];
  const hierarchyEdges = edges.filter((edge) => edge.data?.edgeType === "JERARQUICA");
  const transversalEdges = edges.filter((edge) => edge.data?.edgeType !== "JERARQUICA");
  const emptyPeople = nodes.filter((node) => !node.data.person && node.data.members.length === 0);
  const noRealFunction = nodes.filter((node) => !node.data.realFunction?.trim());
  const noHierarchy = nodes.length > 1 && hierarchyEdges.length === 0;

  return [
    {
      ok: nodes.length > 0,
      title: "Cajas cargadas",
      detail: nodes.length > 0 ? `${nodes.length} cajas en el organigrama.` : "Todavía no hay cargos ni áreas.",
    },
    {
      ok: !noHierarchy,
      title: "Relaciones jerárquicas",
      detail: noHierarchy ? "Falta conectar quién depende de quién." : `${hierarchyEdges.length} relaciones jerárquicas cargadas.`,
    },
    {
      ok: transversalEdges.length > 0,
      title: "Relaciones transversales",
      detail: transversalEdges.length > 0 ? `${transversalEdges.length} vínculos transversales.` : "Conviene agregar colaboración entre áreas.",
    },
    {
      ok: emptyPeople.length === 0,
      title: "Personas asignadas",
      detail: emptyPeople.length === 0 ? "Todas las cajas tienen personas o equipo." : `${emptyPeople.length} cajas sin personas.`,
    },
    {
      ok: noRealFunction.length === 0,
      title: "Función real",
      detail: noRealFunction.length === 0 ? "Todas las cajas tienen función real." : `${noRealFunction.length} cajas sin función real.`,
    },
    {
      ok: requiredAreas.every((area) => areas.has(area)),
      title: "Áreas institucionales clave",
      detail: requiredAreas.every((area) => areas.has(area))
        ? "Están las áreas críticas del modelo institucional."
        : "Revisar si faltan Dirección, Académica, Formación, Familia, Comunicación, Postulaciones u Operaciones.",
    },
  ];
}

export function OrgChartEditor({
  schoolSlug,
  schoolName,
  orgChartId,
  orgChartStatus,
  orgChartVersion,
  initialNodes,
  initialEdges,
  initialPeople,
  initialReviewNotes,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(orgChartStatus);
  const [version, setVersion] = useState(orgChartVersion);
  const [people, setPeople] = useState<PersonPreview[]>(initialPeople);
  const [nodes, setNodes] = useState<Node<EditorNodeData>[]>(() => initialNodes.map(toFlowNode));
  const [edges, setEdges] = useState<Edge[]>(() => initialEdges.map(toFlowEdge));
  const [reviewNotes, setReviewNotes] = useState<ReviewNoteData[]>(initialReviewNotes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [memberDraft, setMemberDraft] = useState<MemberDraft>(defaultMemberDraft);
  const [newNodeDraft, setNewNodeDraft] = useState<NewNodeDraft>(defaultNewNode);
  const [relationDraft, setRelationDraft] = useState<RelationDraft>(defaultRelation);
  const [reviewDraft, setReviewDraft] = useState({ title: "", body: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => edges.find((edge) => edge.id === selectedEdgeId) ?? null, [edges, selectedEdgeId]);
  const reviewChecks = useMemo(() => getReviewChecks(nodes, edges), [nodes, edges]);
  const readyCount = reviewChecks.filter((check) => check.ok).length;

  useEffect(() => {
    if (selectedNode) {
      setDraft(nodeToDraft(selectedNode.data));
      setRelationDraft((current) => ({
        ...current,
        sourceId: selectedNode.id,
        targetId: current.targetId === selectedNode.id ? "" : current.targetId,
      }));
      setMemberDraft(defaultMemberDraft);
    } else {
      setDraft(null);
    }
  }, [selectedNode]);

  function showMessage(value: string) {
    setMessage(value);
    window.setTimeout(() => setMessage(null), 2600);
  }

  function onNodesChange(changes: NodeChange[]) {
    setNodes((current) => applyNodeChanges(changes, current) as Node<EditorNodeData>[]);
  }

  function onEdgesChange(changes: EdgeChange[]) {
    setEdges((current) => applyEdgeChanges(changes, current));
  }

  function updateNodeInState(updated: EditorNodeData) {
    setNodes((current) =>
      current.map((node) =>
        node.id === updated.id
          ? { ...node, data: updated, position: { x: updated.positionX, y: updated.positionY } }
          : node,
      ),
    );
  }

  function handleNodeDragStop(_: unknown, node: Node<EditorNodeData>) {
    setNodes((current) =>
      current.map((item) =>
        item.id === node.id
          ? { ...item, position: node.position, data: { ...item.data, positionX: node.position.x, positionY: node.position.y } }
          : item,
      ),
    );

    startTransition(async () => {
      await moveNodeAction({ nodeId: node.id, schoolSlug, positionX: node.position.x, positionY: node.position.y });
      showMessage("Posición guardada");
    });
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    createRelation({ sourceId: connection.source, targetId: connection.target, type: "JERARQUICA", label: "" });
  }

  function createRelation(input: RelationDraft) {
    if (!input.sourceId || !input.targetId) return showMessage("Elegí origen y destino");
    if (input.sourceId === input.targetId) return showMessage("La relación no puede ir al mismo nodo");

    const temporaryId = `temp-edge-${Date.now()}`;
    const optimistic = toFlowEdge({ id: temporaryId, sourceId: input.sourceId, targetId: input.targetId, type: input.type, label: input.label || null });
    setEdges((current) => [...current, optimistic]);

    startTransition(async () => {
      try {
        const created = await createEdgeAction({ orgChartId, schoolSlug, sourceId: input.sourceId, targetId: input.targetId, type: input.type, label: input.label });
        setEdges((current) =>
          current.map((edge) =>
            edge.id === temporaryId
              ? toFlowEdge({ id: created.id, sourceId: created.sourceId, targetId: created.targetId, type: created.type, label: created.label })
              : edge,
          ),
        );
        setSelectedEdgeId(created.id);
        setSelectedNodeId(null);
        setRelationDraft(defaultRelation);
        showMessage("Relación creada");
      } catch {
        setEdges((current) => current.filter((edge) => edge.id !== temporaryId));
        showMessage("No se pudo crear la relación");
      }
    });
  }

  function handleCreateNode() {
    const nextIndex = nodes.length;
    const positionX = 180 + (nextIndex % 4) * 430;
    const positionY = 740 + Math.floor(nextIndex / 4) * 300;

    startTransition(async () => {
      const created = await createNodeAction({
        orgChartId,
        schoolSlug,
        title: newNodeDraft.title,
        area: newNodeDraft.area,
        color: newNodeDraft.color,
        icon: newNodeDraft.icon,
        positionX,
        positionY,
      });
      const newNode = toFlowNode(created as EditorNodeData);
      setNodes((current) => [...current, newNode]);
      setSelectedNodeId(created.id);
      setSelectedEdgeId(null);
      setNewNodeDraft(defaultNewNode);
      showMessage("Caja creada");
    });
  }

  function handleAutoArrange() {
    const arranged = buildAutoLayout(nodes, edges);
    setNodes(arranged);
    startTransition(async () => {
      await updateNodesPositionsAction({
        schoolSlug,
        positions: arranged.map((node) => ({ nodeId: node.id, positionX: node.position.x, positionY: node.position.y })),
      });
      showMessage("Organigrama ordenado");
    });
  }

  function handleDeleteNode() {
    if (!selectedNode) return;
    const nodeId = selectedNode.id;
    setNodes((current) => current.filter((node) => node.id !== nodeId));
    setEdges((current) => current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNodeId(null);
    startTransition(async () => {
      await deleteNodeAction({ nodeId, schoolSlug });
      showMessage("Caja eliminada");
    });
  }

  function handleSaveNode() {
    if (!selectedNode || !draft) return;
    startTransition(async () => {
      const result = await updateNodeAction({
        nodeId: selectedNode.id,
        schoolSlug,
        title: draft.title,
        area: draft.area,
        formalRole: draft.formalRole,
        realFunction: draft.realFunction,
        description: draft.description,
        weeklyHours: draft.weeklyHours,
        color: draft.color,
        icon: draft.icon,
        personId: draft.personId,
        personFirstName: draft.personFirstName,
        personLastName: draft.personLastName,
        personEmail: draft.personEmail,
        personPhone: draft.personPhone,
      });
      updateNodeInState(result.node as EditorNodeData);
      if (result.person) {
        setPeople((current) => (current.some((person) => person.id === result.person.id) ? current : [...current, result.person]));
      }
      showMessage("Caja guardada");
    });
  }

  function handleSaveMember() {
    if (!selectedNode) return;
    startTransition(async () => {
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
      setPeople((current) => (current.some((person) => person.id === result.member.person.id) ? current : [...current, result.member.person]));
      setMemberDraft(defaultMemberDraft);
      showMessage("Persona guardada en el nodo");
    });
  }

  function handleDeleteMember(memberId: string) {
    if (!selectedNode) return;
    startTransition(async () => {
      const result = await deleteNodeMemberAction({ schoolSlug, memberId, orgNodeId: selectedNode.id });
      updateNodeInState(result.node as EditorNodeData);
      showMessage("Persona quitada del nodo");
    });
  }

  function handleSaveEdge() {
    if (!selectedEdge) return;
    const edgeType = (selectedEdge.data?.edgeType as string | undefined) ?? "JERARQUICA";
    const rawLabel = (selectedEdge.data?.rawLabel as string | undefined) ?? "";
    startTransition(async () => {
      const updated = await updateEdgeAction({ edgeId: selectedEdge.id, schoolSlug, type: edgeType, label: rawLabel });
      setEdges((current) => current.map((edge) => (edge.id === updated.id ? toFlowEdge({ id: updated.id, sourceId: updated.sourceId, targetId: updated.targetId, type: updated.type, label: updated.label }) : edge)));
      showMessage("Relación guardada");
    });
  }

  function handleDeleteEdge() {
    if (!selectedEdge) return;
    const edgeId = selectedEdge.id;
    setEdges((current) => current.filter((edge) => edge.id !== edgeId));
    setSelectedEdgeId(null);
    startTransition(async () => {
      await deleteEdgeAction({ edgeId, schoolSlug });
      showMessage("Relación eliminada");
    });
  }

  function handleChangeStatus(nextStatus: "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED") {
    startTransition(async () => {
      const chart = await updateOrgChartStatusAction({ orgChartId, schoolSlug, status: nextStatus });
      setStatus(chart.status);
      setVersion(chart.version);
      showMessage(nextStatus === "REVIEW" ? "Enviado a revisión" : nextStatus === "PUBLISHED" ? "Organigrama publicado" : "Estado actualizado");
    });
  }

  function handleCreateReviewNote() {
    if (!reviewDraft.title.trim()) return showMessage("Escribí un título para la observación");
    startTransition(async () => {
      const note = await createReviewNoteAction({ orgChartId, schoolSlug, nodeId: selectedNodeId, title: reviewDraft.title, body: reviewDraft.body });
      setReviewNotes((current) => [note, ...current]);
      setReviewDraft({ title: "", body: "" });
      showMessage("Observación agregada");
    });
  }

  return (
    <>
      {showGuide ? <EditorGuide onClose={() => setShowGuide(false)} /> : null}
      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
      <aside className="space-y-4 rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-5 xl:h-[720px] xl:overflow-y-auto">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Panel de trabajo</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{schoolName}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">Versión {version}</span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{status}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
          >
            <HelpCircle className="h-4 w-4" />
            Cómo leer y editar
          </button>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Plus className="h-4 w-4 text-blue-700" />
            Crear nueva caja
          </div>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">
            Una caja representa un cargo, área o equipo del colegio. Después la podés mover, conectar y completar con personas.
          </p>
          <div className="mt-4 space-y-3">
            <input className={inputClass()} value={newNodeDraft.title} onChange={(event) => setNewNodeDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Nombre del cargo o área" />
            <select className={inputClass()} value={newNodeDraft.area} onChange={(event) => setNewNodeDraft((current) => ({ ...current, area: event.target.value }))}>
              {areaOptions.map((area) => <option key={area} value={area}>{areaLabels[area]}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className={inputClass("h-[46px]")} type="color" value={newNodeDraft.color} onChange={(event) => setNewNodeDraft((current) => ({ ...current, color: event.target.value }))} />
              <select className={inputClass()} value={newNodeDraft.icon} onChange={(event) => setNewNodeDraft((current) => ({ ...current, icon: event.target.value }))}>
                {iconOptions.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}
              </select>
            </div>
            <button type="button" onClick={handleCreateNode} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800">
              <Plus className="h-4 w-4" />
              Crear caja
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Route className="h-4 w-4 text-blue-700" />
            Crear relación
          </div>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">
            Origen es desde dónde sale la línea. Destino es hacia dónde llega. Usá jerárquica para dependencia y transversal para trabajo compartido.
          </p>
          <div className="mt-4 space-y-3">
            <select className={inputClass()} value={relationDraft.sourceId} onChange={(event) => setRelationDraft((current) => ({ ...current, sourceId: event.target.value }))}>
              <option value="">Origen</option>
              {nodes.map((node) => <option key={node.id} value={node.id}>{node.data.title}</option>)}
            </select>
            <select className={inputClass()} value={relationDraft.targetId} onChange={(event) => setRelationDraft((current) => ({ ...current, targetId: event.target.value }))}>
              <option value="">Destino</option>
              {nodes.map((node) => <option key={node.id} value={node.id}>{node.data.title}</option>)}
            </select>
            <select className={inputClass()} value={relationDraft.type} onChange={(event) => setRelationDraft((current) => ({ ...current, type: event.target.value }))}>
              {edgeTypeOptions.map((type) => <option key={type} value={type}>{edgeLabels[type]}</option>)}
            </select>
            <input className={inputClass()} value={relationDraft.label} onChange={(event) => setRelationDraft((current) => ({ ...current, label: event.target.value }))} placeholder="Etiqueta opcional" />
            <button type="button" onClick={() => createRelation(relationDraft)} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-100">
              <Link2 className="h-4 w-4" />
              Crear relación
            </button>
          </div>
        </div>

        <button type="button" onClick={handleAutoArrange} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
          <Shuffle className="h-4 w-4" />
          Ordenar automático
        </button>
      </aside>

      <section className="relative h-[720px] overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
        <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[320px] rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <MousePointer2 className="h-4 w-4 text-blue-700" />
            Editor visual
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">Tocá una caja para editar. Arrastrá para mover. Usá “Ordenar automático” si queda desprolijo.</p>
        </div>

        {message ? (
          <div className="absolute right-5 top-5 z-20 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 shadow-sm">
            {message}
          </div>
        ) : null}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={handleNodeDragStop}
          onConnect={handleConnect}
          onNodeClick={(_, node) => {
            setSelectedNodeId(node.id);
            setSelectedEdgeId(null);
          }}
          onEdgeClick={(_, edge) => {
            setSelectedEdgeId(edge.id);
            setSelectedNodeId(null);
          }}
          onPaneClick={() => {
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
          }}
          fitView
          fitViewOptions={{ padding: 0.18, minZoom: 0.22, maxZoom: 0.72 }}
          minZoom={0.12}
          maxZoom={1.15}
          panOnScroll
          onlyRenderVisibleElements
        >
          <Background gap={34} size={1} color="#d7deea" />
          <Controls />
          <MiniMap pannable zoomable nodeStrokeWidth={3} nodeColor={(node) => getNodeColor((node.data?.color as string | null | undefined) ?? null, (node.data?.area as string | undefined) ?? "OTRO")} />
        </ReactFlow>
      </section>

      <aside className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-5 xl:h-[720px] xl:overflow-y-auto">
        {selectedNode && draft ? (
          <div className="space-y-5">
            <PanelHeader title="Editar caja" subtitle="Contenido, color, icono, responsable y equipo." onClose={() => setSelectedNodeId(null)} />

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs font-semibold leading-relaxed text-blue-900">
              <p><strong>Título:</strong> nombre visible de la caja. <strong>Cargo formal:</strong> puesto oficial. <strong>Función real:</strong> lo que efectivamente sostiene esa área. <strong>Horas:</strong> carga semanal estimada para lectura de talento.</p>
            </div>

            <div className="space-y-3">
              <input className={inputClass()} value={draft.title} onChange={(event) => setDraft((current) => current ? { ...current, title: event.target.value } : current)} placeholder="Título de la caja" />
              <select className={inputClass()} value={draft.area} onChange={(event) => setDraft((current) => current ? { ...current, area: event.target.value } : current)}>
                {areaOptions.map((area) => <option key={area} value={area}>{areaLabels[area]}</option>)}
              </select>
              <input className={inputClass()} value={draft.formalRole} onChange={(event) => setDraft((current) => current ? { ...current, formalRole: event.target.value } : current)} placeholder="Cargo formal" />
              <textarea className={textareaClass("min-h-24")} value={draft.realFunction} onChange={(event) => setDraft((current) => current ? { ...current, realFunction: event.target.value } : current)} placeholder="Función real" />
              <textarea className={textareaClass("min-h-20")} value={draft.description} onChange={(event) => setDraft((current) => current ? { ...current, description: event.target.value } : current)} placeholder="Observaciones" />
              <input className={inputClass()} type="number" value={draft.weeklyHours} onChange={(event) => setDraft((current) => current ? { ...current, weeklyHours: event.target.value } : current)} placeholder="Horas semanales del nodo" />
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900"><Paintbrush className="h-4 w-4 text-blue-700" /> Color e icono</div>
              <div className="grid grid-cols-2 gap-2">
                <input className={inputClass("h-[46px]")} type="color" value={draft.color} onChange={(event) => setDraft((current) => current ? { ...current, color: event.target.value } : current)} />
                <select className={inputClass()} value={draft.icon} onChange={(event) => setDraft((current) => current ? { ...current, icon: event.target.value } : current)}>
                  {iconOptions.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}
                </select>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {colorPresets.map((color) => (
                  <button key={color} type="button" onClick={() => setDraft((current) => current ? { ...current, color } : current)} className="h-8 w-8 rounded-full border-2 border-white shadow ring-1 ring-slate-200" style={{ backgroundColor: color }} aria-label={`Color ${color}`} />
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-black text-blue-900"><UserRound className="h-4 w-4" /> Responsable principal</div>
              <p className="mb-3 text-xs font-semibold leading-relaxed text-blue-800/80">Persona que aparece como referente principal de la caja. El equipo ampliado se carga más abajo.</p>
              <select className={inputClass()} value={draft.personId} onChange={(event) => {
                const person = people.find((item) => item.id === event.target.value);
                setDraft((current) => current ? {
                  ...current,
                  personId: event.target.value,
                  personFirstName: person?.firstName ?? "",
                  personLastName: person?.lastName ?? "",
                  personEmail: person?.email ?? "",
                  personPhone: person?.phone ?? "",
                } : current);
              }}>
                <option value="__new__">Crear nueva persona</option>
                {people.map((person) => <option key={person.id} value={person.id}>{`${person.firstName} ${person.lastName}`.trim()}</option>)}
              </select>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <input className={inputClass()} value={draft.personFirstName} onChange={(event) => setDraft((current) => current ? { ...current, personFirstName: event.target.value } : current)} placeholder="Nombre" />
                <input className={inputClass()} value={draft.personLastName} onChange={(event) => setDraft((current) => current ? { ...current, personLastName: event.target.value } : current)} placeholder="Apellido" />
              </div>
              <input className={`${inputClass()} mt-2`} value={draft.personEmail} onChange={(event) => setDraft((current) => current ? { ...current, personEmail: event.target.value } : current)} placeholder="Email" />
              <input className={`${inputClass()} mt-2`} value={draft.personPhone} onChange={(event) => setDraft((current) => current ? { ...current, personPhone: event.target.value } : current)} placeholder="Teléfono" />
            </div>

            <button type="button" onClick={handleSaveNode} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800">
              <Save className="h-4 w-4" /> Guardar caja
            </button>

            <div className="rounded-3xl border border-slate-100 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900"><UsersRound className="h-4 w-4 text-blue-700" /> Personas del nodo</div>
                <button type="button" onClick={() => setMemberDraft(defaultMemberDraft)} className="text-xs font-black text-blue-700">Nuevo</button>
              </div>

              <p className="mb-3 text-xs font-semibold leading-relaxed text-slate-500">Acá van las personas que participan en esta caja. El rol puede ser responsable, equipo, apoyo o externo; esto después alimenta el tablero de talento.</p>
              <div className="space-y-2">
                {selectedNode.data.members.map((member) => (
                  <div key={member.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-slate-900">{`${member.person.firstName} ${member.person.lastName}`.trim()}</p>
                        <p className="text-xs font-bold text-slate-500">{memberRoleLabels[member.role] ?? member.role}{member.roleTitle ? ` · ${member.roleTitle}` : ""}</p>
                        {member.weeklyHours !== null ? <p className="mt-1 text-xs font-black text-blue-700">{member.weeklyHours} hs.</p> : null}
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setMemberDraft(memberToDraft(member))} className="rounded-full bg-white px-2 py-1 text-xs font-black text-blue-700 shadow-sm">Editar</button>
                        <button type="button" onClick={() => handleDeleteMember(member.id)} className="rounded-full bg-white px-2 py-1 text-xs font-black text-rose-700 shadow-sm">Quitar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900"><UserPlus className="h-4 w-4 text-blue-700" /> Agregar/editar persona</div>
                <select className={inputClass()} value={memberDraft.personId} onChange={(event) => {
                  const person = people.find((item) => item.id === event.target.value);
                  setMemberDraft((current) => ({
                    ...current,
                    personId: event.target.value,
                    firstName: person?.firstName ?? "",
                    lastName: person?.lastName ?? "",
                    email: person?.email ?? "",
                    phone: person?.phone ?? "",
                  }));
                }}>
                  <option value="__new__">Crear nueva persona</option>
                  {people.map((person) => <option key={person.id} value={person.id}>{`${person.firstName} ${person.lastName}`.trim()}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputClass()} value={memberDraft.firstName} onChange={(event) => setMemberDraft((current) => ({ ...current, firstName: event.target.value }))} placeholder="Nombre" />
                  <input className={inputClass()} value={memberDraft.lastName} onChange={(event) => setMemberDraft((current) => ({ ...current, lastName: event.target.value }))} placeholder="Apellido" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select className={inputClass()} value={memberDraft.role} onChange={(event) => setMemberDraft((current) => ({ ...current, role: event.target.value }))}>
                    {memberRoleOptions.map((role) => <option key={role} value={role}>{memberRoleLabels[role]}</option>)}
                  </select>
                  <input className={inputClass()} value={memberDraft.weeklyHours} onChange={(event) => setMemberDraft((current) => ({ ...current, weeklyHours: event.target.value }))} placeholder="Horas" />
                </div>
                <input className={inputClass()} value={memberDraft.roleTitle} onChange={(event) => setMemberDraft((current) => ({ ...current, roleTitle: event.target.value }))} placeholder="Cargo dentro del nodo" />
                <button type="button" onClick={handleSaveMember} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                  <UserPlus className="h-4 w-4" /> Guardar persona
                </button>
              </div>
            </div>

            <button type="button" onClick={handleDeleteNode} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100">
              <Trash2 className="h-4 w-4" /> Eliminar caja
            </button>
          </div>
        ) : selectedEdge ? (
          <div className="space-y-5">
            <PanelHeader title="Editar relación" subtitle="Definí el tipo de vínculo entre áreas." onClose={() => setSelectedEdgeId(null)} />
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs font-semibold leading-relaxed text-blue-900">
              <strong>Jerárquica</strong> muestra dependencia directa. <strong>Transversal</strong> muestra colaboración sin dependencia. <strong>Decisión</strong> marca vínculos clave para tomar decisiones.
            </div>
            <select className={inputClass()} value={(selectedEdge.data?.edgeType as string) ?? "JERARQUICA"} onChange={(event) => setEdges((current) => current.map((edge) => edge.id === selectedEdge.id ? toFlowEdge({ id: edge.id, sourceId: edge.source, targetId: edge.target, type: event.target.value, label: (edge.data?.rawLabel as string | undefined) ?? null }) : edge))}>
              {edgeTypeOptions.map((type) => <option key={type} value={type}>{edgeLabels[type]}</option>)}
            </select>
            <input className={inputClass()} value={(selectedEdge.data?.rawLabel as string | undefined) ?? ""} onChange={(event) => setEdges((current) => current.map((edge) => edge.id === selectedEdge.id ? toFlowEdge({ id: edge.id, sourceId: edge.source, targetId: edge.target, type: (edge.data?.edgeType as string | undefined) ?? "JERARQUICA", label: event.target.value }) : edge))} placeholder="Etiqueta" />
            <button type="button" onClick={handleSaveEdge} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white"><Save className="h-4 w-4" /> Guardar relación</button>
            <button type="button" onClick={handleDeleteEdge} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700"><Trash2 className="h-4 w-4" /> Eliminar relación</button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 text-center">
              <Layers3 className="mx-auto h-9 w-9 text-blue-700" />
              <h2 className="mt-3 text-xl font-black text-slate-950">Seleccioná una caja</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">Al tocar una caja vas a editar contenido, personas, horas, color, icono y función real.</p>
              <button type="button" onClick={() => setShowGuide(true)} className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700">
                <HelpCircle className="h-4 w-4" /> Ver guía rápida
              </button>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Revisión</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">Checklist institucional</h3>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{readyCount}/{reviewChecks.length}</span>
              </div>
              <div className="space-y-2">
                {reviewChecks.map((check) => (
                  <div key={check.title} className="flex gap-3 rounded-2xl bg-slate-50 p-3">
                    {check.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
                    <div>
                      <p className="text-sm font-black text-slate-900">{check.title}</p>
                      <p className="text-xs font-semibold leading-relaxed text-slate-500">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-2">
                <button type="button" onClick={() => handleChangeStatus("REVIEW")} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-600"><Send className="h-4 w-4" /> Enviar a revisión</button>
                <button type="button" onClick={() => handleChangeStatus("PUBLISHED")} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700"><CheckCircle2 className="h-4 w-4" /> Publicar</button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900"><CircleAlert className="h-4 w-4 text-blue-700" /> Observaciones de revisión</div>
              <div className="mt-3 space-y-2">
                <input className={inputClass()} value={reviewDraft.title} onChange={(event) => setReviewDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Título" />
                <textarea className={textareaClass("min-h-20")} value={reviewDraft.body} onChange={(event) => setReviewDraft((current) => ({ ...current, body: event.target.value }))} placeholder="Detalle" />
                <button type="button" onClick={handleCreateReviewNote} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm"><Plus className="h-4 w-4" /> Agregar observación</button>
              </div>
              <div className="mt-4 space-y-2">
                {reviewNotes.slice(0, 8).map((note) => (
                  <div key={note.id} className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-sm font-black text-slate-900">{note.title}</p>
                    {note.body ? <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{note.body}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
    </>
  );
}

function EditorGuide({ onClose }: { onClose: () => void }) {
  const items = [
    {
      title: "Caja",
      body: "Representa un cargo, área o equipo. No tiene que ser siempre una persona: también puede ser Formación, Comunicación, Tutorías u Operaciones.",
    },
    {
      title: "Cargo formal y función real",
      body: "Cargo formal es el puesto oficial. Función real es lo que esa persona o equipo realmente sostiene en la vida del colegio.",
    },
    {
      title: "Personas y horas",
      body: "Dentro de cada caja podés cargar responsable, equipo, apoyo o externo. Las horas ayudan a leer carga, cobertura y luego densidad de talento.",
    },
    {
      title: "Relaciones",
      body: "La línea jerárquica muestra dependencia. Las relaciones transversales, colaboración, acompañamiento, decisión e información muestran cómo se trabaja entre áreas.",
    },
    {
      title: "Revisión",
      body: "El checklist ayuda a detectar si faltan áreas críticas, funciones reales, personas asignadas o vínculos transversales antes de publicar.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="max-h-[86vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Guía rápida</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Cómo leer y editar el organigrama</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">Esta pantalla sirve para armar el organigrama real del colegio y dejarlo listo para revisión y talento.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900" aria-label="Cerrar guía">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 font-black text-slate-950">
                <HelpCircle className="h-4 w-4 text-blue-700" />
                {item.title}
              </div>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-relaxed text-blue-900">
          Consejo práctico: primero creá o revisá las cajas principales, después asigná personas y horas, luego conectá las relaciones. Al final usá “Ordenar automático” y revisá el checklist.
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">{subtitle}</p>
      </div>
      <button type="button" onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900" aria-label="Cerrar panel">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
