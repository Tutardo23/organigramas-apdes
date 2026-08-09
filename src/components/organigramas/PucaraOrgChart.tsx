"use client";

import dagre from "dagre";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  getIncomers,
  getOutgoers,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  ImageIcon,
  LayoutGrid,
  Loader2,
  Mail,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  createPucaraChildAction,
  createPucaraStarterChartAction,
  importPucaraHitoAction,
  deletePucaraMemberAction,
  deletePucaraNodeAction,
  movePucaraNodeAction,
  reparentPucaraNodeAction,
  savePucaraPositionsAction,
  updatePucaraNodeAction,
  upsertPucaraMemberAction,
} from "../../app/organigramas/[schoolSlug]/pucara/actions";

type Person = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  photoUrl?: string | null;
};

type Member = {
  id: string;
  role: string;
  roleTitle?: string | null;
  weeklyHours?: number | null;
  person: Person;
};

type SourceNode = {
  id: string;
  title: string;
  area: string;
  formalRole?: string | null;
  realFunction?: string | null;
  description?: string | null;
  weeklyHours?: number | null;
  positionX: number;
  positionY: number;
  color?: string | null;
  person?: Person | null;
  members: Member[];
};

type SourceEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  label?: string | null;
};

type CardData = SourceNode & {
  schoolLogoUrl?: string | null;
  isFocused: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  cardHeight: number;
  onToggle: (nodeId: string) => void;
  onOpenPeople: (nodeId: string) => void;
};

type Props = {
  schoolSlug: string;
  schoolName: string;
  schoolLogoUrl?: string | null;
  orgChartId: string;
  orgChartTitle: string;
  initialNodes: SourceNode[];
  initialEdges: SourceEdge[];
  existingPeople: Person[];
};

type Mode = "view" | "edit";
type EditorSection = "function" | "team";
type ViewSnapshot = { expanded: string[]; focusedId: string | null };

const NODE_WIDTH = 380;
const SIMPLE_NODE_HEIGHT = 205;
const fallbackColors = ["#1C3A62", "#2E6B4B", "#C9A400", "#64748B", "#94A3B8"];

function fullName(person?: Person | null) {
  if (!person) return "Cargo sin persona asignada";
  return `${person.firstName} ${person.lastName}`.trim();
}

function photoSource(person?: Person | null) {
  if (!person) return null;
  return person.photoUrl?.trim() || `/images/personas/${person.id}.jpg`;
}

function peopleForNode(node: SourceNode) {
  const result: {
    id: string;
    name: string;
    role: string;
    email?: string | null;
    weeklyHours?: number | null;
    photoUrl?: string | null;
  }[] = [];
  if (node.person) {
    result.push({
      id: node.person.id,
      name: fullName(node.person),
      role: node.formalRole || node.realFunction || node.title,
      email: node.person.email,
      weeklyHours: node.weeklyHours,
      photoUrl: photoSource(node.person),
    });
  }
  node.members.forEach((member) => {
    result.push({
      id: member.person.id,
      name: fullName(member.person),
      role: member.roleTitle || "Equipo",
      email: member.person.email,
      weeklyHours: member.weeklyHours,
      photoUrl: photoSource(member.person),
    });
  });
  return result;
}

function nodeDescription(node: SourceNode) {
  const saved = node.description?.trim();
  if (saved) return saved;

  const text = `${node.title} ${node.formalRole ?? ""} ${node.realFunction ?? ""}`.toLowerCase();

  if (text.includes("consejo")) {
    return "Define criterios, prioridades y acompaña la conducción general del colegio.";
  }
  if (text.includes("director general")) {
    return "Conduce la vida institucional y articula las decisiones de los distintos equipos.";
  }
  if (text.includes("nivel primario") && (text.includes("director") || text.includes("secretar"))) {
    return text.includes("secretar")
      ? "Organiza la gestión administrativa y el funcionamiento cotidiano del Nivel Primario."
      : "Coordina y acompaña la gestión académica y operativa del Nivel Primario.";
  }
  if (text.includes("nivel secundario") && (text.includes("rector") || text.includes("secretar"))) {
    return text.includes("secretar")
      ? "Organiza la gestión administrativa y el funcionamiento cotidiano del Nivel Secundario."
      : "Conduce y acompaña la gestión académica, formativa y cotidiana del Nivel Secundario.";
  }
  if (text.includes("docente")) {
    return "Reúne a los docentes responsables de la enseñanza y el acompañamiento de los alumnos.";
  }
  if (text.includes("profesores especiales")) {
    return "Articula las propuestas de Educación Física, Música, Artística, Tecnología y otras áreas especiales.";
  }
  if (text.includes("preceptor")) {
    return "Acompaña la vida escolar cotidiana, la organización y el seguimiento de los alumnos.";
  }
  if (text.includes("tutor")) {
    return "Brinda acompañamiento personal a los alumnos y articula el vínculo con sus familias y docentes.";
  }
  if (text.includes("inglés") || text.includes("ingles")) {
    return "Coordina la enseñanza de inglés y el trabajo de los equipos docentes de los distintos niveles.";
  }
  if (text.includes("familia") || text.includes("comunic")) {
    return "Fortalece el vínculo con las familias y organiza la comunicación institucional.";
  }
  if (text.includes("postul")) {
    return "Acompaña el ingreso de nuevas familias y su experiencia de incorporación al colegio.";
  }
  if (text.includes("legal")) {
    return "Brinda asesoramiento legal y acompaña decisiones que requieren soporte jurídico.";
  }
  if (text.includes("capellan")) {
    return "Acompaña la formación espiritual de alumnos, familias y colaboradores.";
  }
  if (text.includes("recepción") || text.includes("recepcion")) {
    return "Recibe y orienta a las familias y brinda soporte cotidiano a la comunidad educativa.";
  }
  if (text.includes("tic") || text.includes("colegium")) {
    return "Da soporte a las herramientas tecnológicas y plataformas utilizadas por el colegio.";
  }
  if (text.includes("factur") || text.includes("cobran")) {
    return "Gestiona la facturación, cobranzas y seguimiento administrativo de las familias.";
  }
  if (text.includes("contabil") || text.includes("tesorer")) {
    return "Organiza la gestión contable, financiera y de tesorería del colegio.";
  }
  if (text.includes("rrhh") || text.includes("recursos humanos")) {
    return "Acompaña la gestión de las personas, documentación laboral y procesos de Recursos Humanos.";
  }
  if (text.includes("mantenimiento") || text.includes("operaciones")) {
    return "Sostiene el funcionamiento cotidiano, los recursos, servicios e infraestructura del colegio.";
  }
  if (text.includes("limpieza") || text.includes("conserj")) {
    return "Asegura la limpieza, el orden y el soporte general de los espacios institucionales.";
  }
  if (text.includes("orientación escolar") || text.includes("orientacion escolar") || text.includes("doe")) {
    return "Acompaña las necesidades pedagógicas, psicológicas y de orientación de alumnos y equipos docentes.";
  }
  if (text.includes("admin")) {
    return "Ordena procesos administrativos, documentación y soporte institucional.";
  }

  return node.realFunction?.trim() || node.formalRole?.trim() || "Función institucional dentro de la estructura del colegio.";
}

function cardHeightFor(node: SourceNode) {
  const count = peopleForNode(node).length;
  if (count <= 1) return SIMPLE_NODE_HEIGHT + 28;
  const rows = Math.ceil(count / 2);
  return 126 + 70 + rows * 72 + 48;
}

function PersonAvatar({ person, className = "h-14 w-14" }: { person?: Person | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const photo = photoSource(person);
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/95 shadow-sm ${className}`}>
      {photo && !failed ? (
        <img src={photo} alt={fullName(person)} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <UserRound className="h-1/2 w-1/2 text-slate-400" />
      )}
    </div>
  );
}

function PucaraCard({ data }: NodeProps<Node<CardData>>) {
  const color = data.color || "#1C3A62";
  const people = peopleForNode(data);
  const shownPeople = people;
  const isCollective = people.length > 1;

  return (
    <div className="relative w-[380px]" style={{ minHeight: data.cardHeight }}>
      <Handle
        type="target"
        position={Position.Top}
        className="!z-30 !h-3.5 !w-3.5 !border-2 !border-white !bg-slate-400"
      />

      <div
        className={`overflow-hidden rounded-[26px] border bg-white shadow-xl transition-all duration-300 ${
          data.isFocused
            ? "scale-[1.025] border-amber-300 ring-4 ring-amber-300/70"
            : "border-slate-200 hover:-translate-y-0.5 hover:shadow-2xl"
        }`}
        style={{ minHeight: data.cardHeight }}
      >
        <div className="flex min-h-[126px] items-center gap-4 px-5 py-4 text-white" style={{ backgroundColor: color }}>
          {data.person ? (
            <PersonAvatar person={data.person} className="h-16 w-16" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/95 shadow-sm">
              <img
                src={data.schoolLogoUrl || "/images/escudo-pucara.png"}
                alt="Escudo"
                className="h-full w-full object-contain p-2"
              />
            </div>
          )}

          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-white/75">{data.formalRole || data.area}</p>
            <h3 className="mt-1 text-[22px] font-black leading-tight">{data.title}</h3>
            {data.person ? <p className="mt-2 text-base font-bold text-white/95">{fullName(data.person)}</p> : null}
          </div>
        </div>

        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3.5">
          <p className="text-sm font-semibold leading-relaxed text-slate-600">
            {nodeDescription(data)}
          </p>
        </div>

        {isCollective ? (
          <div className="grid grid-cols-2 bg-white">
            {shownPeople.map((person, index) => {
              const parts = person.name.split(" ");
              const first = parts.shift() || "";
              const rest = parts.join(" ");
              return (
                <button
                  type="button"
                  key={`${person.id}-${index}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    data.onOpenPeople(data.id);
                  }}
                  className="min-h-[72px] border-b border-slate-200 px-5 py-3 text-left transition hover:bg-slate-50 even:border-l"
                >
                  <p className="text-[15px] font-black leading-tight text-[#123868]">{first}</p>
                  <p className="mt-0.5 text-sm font-medium leading-tight text-slate-500">{rest || person.role}</p>
                  {person.role ? <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-slate-400">{person.role}</p> : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="min-h-[48px] px-5 py-3">
            {data.weeklyHours ? (
              <p className="text-xs font-black text-slate-400">{data.weeklyHours} hs. semanales</p>
            ) : (
              <p className="text-xs font-semibold text-slate-400">Tocá la tarjeta para ver la ficha completa.</p>
            )}
          </div>
        )}
      </div>

      {/* Los controles viven FUERA del bloque con overflow-hidden. Así nunca se
          recortan contra el borde inferior de la tarjeta. */}
      <div className="absolute -bottom-[22px] left-0 right-0 z-40 flex justify-center gap-3">
        {data.hasChildren ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              data.onToggle(data.id);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-white text-white shadow-lg transition hover:scale-105"
            style={{ backgroundColor: color }}
            aria-label={data.isExpanded ? "Cerrar dependencias" : "Abrir dependencias"}
          >
            {data.isExpanded ? <ChevronUp className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </button>
        ) : null}

        {people.length > 1 ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              data.onOpenPeople(data.id);
            }}
            className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border-4 border-white bg-amber-400 px-3 text-[#123868] shadow-lg transition hover:scale-105"
            aria-label="Ver todas las personas"
          >
            <UsersRound className="h-5 w-5" />
            <span className="text-xs font-black">{people.length}</span>
          </button>
        ) : null}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!z-30 !h-3.5 !w-3.5 !border-2 !border-white !bg-slate-400"
      />
    </div>
  );
}

const nodeTypes: NodeTypes = { pucaraCard: PucaraCard };


function buildDepthMap(nodes: SourceNode[], edges: SourceEdge[]) {
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  edges.forEach((edge) => incoming.set(edge.targetId, (incoming.get(edge.targetId) || 0) + 1));
  const roots = nodes.filter((node) => (incoming.get(node.id) || 0) === 0).map((node) => node.id);
  const depth = new Map<string, number>();
  const queue = roots.map((id) => ({ id, value: 0 }));

  while (queue.length) {
    const item = queue.shift()!;
    if (depth.has(item.id)) continue;
    depth.set(item.id, item.value);
    edges
      .filter((edge) => edge.sourceId === item.id)
      .forEach((edge) => queue.push({ id: edge.targetId, value: item.value + 1 }));
  }

  return { depth, roots };
}

function collectDescendants(nodeId: string, edges: SourceEdge[]) {
  const found = new Set<string>();
  const queue = [nodeId];
  while (queue.length) {
    const current = queue.shift()!;
    edges
      .filter((edge) => edge.sourceId === current)
      .forEach((edge) => {
        if (!found.has(edge.targetId)) {
          found.add(edge.targetId);
          queue.push(edge.targetId);
        }
      });
  }
  return found;
}

function autoLayout(
  nodes: SourceNode[],
  edges: SourceEdge[],
  visibleIds: Set<string>,
  depth: Map<string, number>,
) {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "TB",
    ranksep: 185,
    nodesep: 125,
    marginx: 70,
    marginy: 60,
    ranker: "network-simplex",
  });

  const visibleNodes = nodes.filter((node) => visibleIds.has(node.id));
  visibleNodes
    .slice()
    .sort((a, b) => a.positionX - b.positionX)
    .forEach((node) => {
      graph.setNode(node.id, { width: NODE_WIDTH, height: cardHeightFor(node) });
    });

  edges
    .filter((edge) => visibleIds.has(edge.sourceId) && visibleIds.has(edge.targetId))
    .forEach((edge) => graph.setEdge(edge.sourceId, edge.targetId));

  dagre.layout(graph);

  return nodes.map((node) => {
    const point = graph.node(node.id);
    if (!point || !visibleIds.has(node.id)) return node;
    const height = cardHeightFor(node);
    return {
      ...node,
      positionX: point.x - NODE_WIDTH / 2,
      positionY: point.y - height / 2,
      color: node.color || fallbackColors[Math.min(depth.get(node.id) || 0, fallbackColors.length - 1)],
    };
  });
}

function ChartInner(props: Props) {
  const { fitView, setCenter } = useReactFlow();
  const [mode, setMode] = useState<Mode>("view");
  const [sourceNodes, setSourceNodes] = useState(props.initialNodes);
  const [sourceEdges, setSourceEdges] = useState(props.initialEdges);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [peoplePanelNodeId, setPeoplePanelNodeId] = useState<string | null>(null);
  const [editorSection, setEditorSection] = useState<EditorSection>("function");
  const [editingMemberId, setEditingMemberId] = useState<string | "new" | null>(null);
  const [history, setHistory] = useState<ViewSnapshot[]>([]);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [showCreateChart, setShowCreateChart] = useState(false);
  const [directoryPeople, setDirectoryPeople] = useState<Person[]>(props.existingPeople);
  const pendingFitNodeRef = useRef<string | null>(null);
  const pendingNavigationFocusRef = useRef<string | null>(null);

  const { depth, roots } = useMemo(() => buildDepthMap(sourceNodes, sourceEdges), [sourceNodes, sourceEdges]);

  useEffect(() => {
    if (!focusedId && roots[0]) setFocusedId(roots[0]);
  }, [focusedId, roots]);

  const visibleIds = useMemo(() => {
    if (mode === "edit") return new Set(sourceNodes.map((node) => node.id));
    const visible = new Set(roots);
    let changed = true;
    while (changed) {
      changed = false;
      sourceEdges.forEach((edge) => {
        if (visible.has(edge.sourceId) && expanded.has(edge.sourceId) && !visible.has(edge.targetId)) {
          visible.add(edge.targetId);
          changed = true;
        }
      });
    }
    return visible;
  }, [mode, sourceNodes, sourceEdges, roots, expanded]);

  // En esta versión la vista usa exactamente las posiciones guardadas.
  // Así mover una caja en Editar cambia de verdad el diseño que después ve el colegio.
  const displayNodes = sourceNodes;

  const pushHistory = useCallback(() => {
    if (mode !== "view") return;
    setHistory((current) => [
      ...current.slice(-24),
      { expanded: Array.from(expanded), focusedId },
    ]);
  }, [mode, expanded, focusedId]);

  const openPeople = useCallback((nodeId: string) => setPeoplePanelNodeId(nodeId), []);

  const toggleNode = useCallback(
    (nodeId: string) => {
      pushHistory();
      pendingFitNodeRef.current = nodeId;
      setExpanded((current) => {
        const next = new Set(current);
        if (next.has(nodeId)) {
          next.delete(nodeId);
          collectDescendants(nodeId, sourceEdges).forEach((id) => next.delete(id));
        } else {
          next.add(nodeId);
        }
        return next;
      });
      setFocusedId(nodeId);
    },
    [pushHistory, sourceEdges],
  );

  const flowNodes = useMemo<Node<CardData>[]>(
    () =>
      displayNodes.map((node) => ({
        id: node.id,
        type: "pucaraCard",
        position: { x: node.positionX, y: node.positionY },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        hidden: !visibleIds.has(node.id),
        draggable: mode === "edit",
        data: {
          ...node,
          schoolLogoUrl: props.schoolLogoUrl,
          color: node.color || fallbackColors[Math.min(depth.get(node.id) || 0, fallbackColors.length - 1)],
          isFocused: focusedId === node.id,
          isExpanded: expanded.has(node.id),
          hasChildren: sourceEdges.some((edge) => edge.sourceId === node.id),
          cardHeight: cardHeightFor(node),
          onToggle: toggleNode,
          onOpenPeople: openPeople,
        },
      })),
    [displayNodes, visibleIds, mode, props.schoolLogoUrl, depth, focusedId, expanded, sourceEdges, toggleNode, openPeople],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      sourceEdges.map((edge) => ({
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: "smoothstep",
        hidden: mode === "view"
          ? !visibleIds.has(edge.sourceId) || !visibleIds.has(edge.targetId)
          : false,
        interactionWidth: 24,
        style: {
          stroke: "#475569",
          strokeWidth: 3.2,
          opacity: 1,
        },
      })),
    [sourceEdges, visibleIds, mode],
  );

  useEffect(() => {
    if (mode !== "view") return;
    const targetId = pendingNavigationFocusRef.current;
    if (!targetId) return;

    const target = flowNodes.find((node) => node.id === targetId && !node.hidden);
    if (!target) return;

    pendingNavigationFocusRef.current = null;
    pendingFitNodeRef.current = null;

    const timer = window.setTimeout(() => {
      setFocusedId(target.id);
      setCenter(
        target.position.x + NODE_WIDTH / 2,
        target.position.y + cardHeightFor(target.data) / 2,
        { zoom: 1.08, duration: 520 },
      );
    }, 70);

    return () => window.clearTimeout(timer);
  }, [mode, flowNodes, setCenter]);

  useEffect(() => {
    if (mode !== "view") return;
    const nodeId = pendingFitNodeRef.current;
    if (!nodeId || pendingNavigationFocusRef.current) return;
    pendingFitNodeRef.current = null;

    const relatedIds = new Set([
      nodeId,
      ...sourceEdges.filter((edge) => edge.sourceId === nodeId).map((edge) => edge.targetId),
    ]);
    const related = flowNodes.filter((node) => !node.hidden && relatedIds.has(node.id));

    const timer = window.setTimeout(() => {
      if (related.length > 1) {
        fitView({ nodes: related, padding: 0.32, duration: 560, maxZoom: 1.04 });
      } else {
        const node = flowNodes.find((item) => item.id === nodeId);
        if (node) {
          setCenter(
            node.position.x + NODE_WIDTH / 2,
            node.position.y + cardHeightFor(node.data) / 2,
            { zoom: 1.05, duration: 500 },
          );
        }
      }
    }, 70);

    return () => window.clearTimeout(timer);
  }, [mode, flowNodes, sourceEdges, fitView, setCenter]);

  const focusNode = useCallback(
    (id: string, record = true) => {
      const node = flowNodes.find((item) => item.id === id);
      if (!node) return;
      if (record) pushHistory();
      setFocusedId(id);
      if (mode === "edit") setSelectedId(id);
      setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + cardHeightFor(node.data) / 2, {
        zoom: mode === "edit" ? 0.92 : 1.08,
        duration: 500,
      });
    },
    [flowNodes, mode, pushHistory, setCenter],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (mode !== "edit") return;
      const next = applyNodeChanges(changes, flowNodes);
      const byId = new Map(next.map((node) => [node.id, node.position]));
      setSourceNodes((current) =>
        current.map((node) => {
          const position = byId.get(node.id);
          return position ? { ...node, positionX: position.x, positionY: position.y } : node;
        }),
      );
    },
    [mode, flowNodes],
  );

  const persistDraggedNode = useCallback(
    (nodeId: string, positionX: number, positionY: number) => {
      if (mode !== "edit") return;
      setSourceNodes((current) =>
        current.map((node) =>
          node.id === nodeId ? { ...node, positionX, positionY } : node,
        ),
      );
      startTransition(async () => {
        try {
          await movePucaraNodeAction({
            schoolSlug: props.schoolSlug,
            nodeId,
            positionX,
            positionY,
          });
        } catch (error) {
          setMessage({
            type: "error",
            text: error instanceof Error ? error.message : "No se pudo guardar la nueva posición.",
          });
        }
      });
    },
    [mode, props.schoolSlug],
  );

  const currentNode = sourceNodes.find((node) => node.id === selectedId) ?? null;
  const peoplePanelNode = sourceNodes.find((node) => node.id === peoplePanelNodeId) ?? null;
  const currentParentId = currentNode
    ? sourceEdges.find((edge) => edge.targetId === currentNode.id)?.sourceId ?? ""
    : "";
  const blockedParentIds = currentNode
    ? new Set([currentNode.id, ...collectDescendants(currentNode.id, sourceEdges)])
    : new Set<string>();
  const parentCandidates = currentNode
    ? sourceNodes.filter((node) => !blockedParentIds.has(node.id))
    : [];
  const focusedFlowNode = flowNodes.find((node) => node.id === focusedId);

  const navigation = useMemo(() => {
    if (!focusedFlowNode) return { parent: null, children: [], siblings: [], index: -1 };
    const parent = getIncomers(focusedFlowNode, flowNodes, flowEdges)[0] ?? null;
    const children = getOutgoers(focusedFlowNode, flowNodes, flowEdges);
    const siblings = parent ? getOutgoers(parent, flowNodes, flowEdges) : [];
    return { parent, children, siblings, index: siblings.findIndex((node) => node.id === focusedFlowNode.id) };
  }, [focusedFlowNode, flowNodes, flowEdges]);

  const navigateDown = useCallback(() => {
    const child = navigation.children[0];
    if (!focusedId || !child) return;

    if (!expanded.has(focusedId)) {
      pendingNavigationFocusRef.current = child.id;
      toggleNode(focusedId);
      // toggleNode prepara un encuadre del padre; al navegar hacia abajo queremos
      // que mande el hijo cuando el nuevo layout ya exista.
      pendingFitNodeRef.current = null;
      return;
    }

    focusNode(child.id);
  }, [navigation.children, focusedId, expanded, toggleNode, focusNode]);

  const goBack = useCallback(() => {
    setHistory((current) => {
      const previous = current[current.length - 1];
      if (!previous) return current;

      const nextExpanded = new Set(previous.expanded);

      // Si estamos parados en un hijo y volvemos a su superior, cerramos esa
      // rama. Así "Atrás" recupera también el estado visual anterior y no
      // deja al hijo abierto debajo del padre.
      if (focusedId && previous.focusedId) {
        const cameFromDirectChild = sourceEdges.some(
          (edge) => edge.sourceId === previous.focusedId && edge.targetId === focusedId,
        );

        if (cameFromDirectChild) {
          nextExpanded.delete(previous.focusedId);
          collectDescendants(previous.focusedId, sourceEdges).forEach((id) =>
            nextExpanded.delete(id),
          );
        }
      }

      setExpanded(nextExpanded);
      setFocusedId(previous.focusedId);
      if (previous.focusedId) pendingFitNodeRef.current = previous.focusedId;
      return current.slice(0, -1);
    });
  }, [focusedId, sourceEdges]);

  const showAll = useCallback(() => {
    pushHistory();
    setExpanded(new Set(sourceNodes.map((node) => node.id)));
    setFocusedId(roots[0] || null);
    window.setTimeout(() => fitView({ duration: 600, padding: 0.08, maxZoom: 0.85 }), 60);
  }, [pushHistory, sourceNodes, roots, fitView]);

  const restartView = useCallback(() => {
    setHistory([]);
    setExpanded(new Set());
    setFocusedId(roots[0] || null);
    setPeoplePanelNodeId(null);
    window.setTimeout(() => fitView({ duration: 500, padding: 0.3, maxZoom: 1.1 }), 50);
  }, [roots, fitView]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select") || target?.isContentEditable) return;
      if (mode !== "view") return;
      if (event.key === "Backspace") {
        event.preventDefault();
        goBack();
      }
      if (event.key === "ArrowUp" && navigation.parent) focusNode(navigation.parent.id);
      if (event.key === "ArrowDown" && navigation.children[0]) navigateDown();
      if (event.key === "ArrowLeft" && navigation.siblings[navigation.index - 1]) focusNode(navigation.siblings[navigation.index - 1].id);
      if (event.key === "ArrowRight" && navigation.siblings[navigation.index + 1]) focusNode(navigation.siblings[navigation.index + 1].id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, goBack, navigation, focusNode, navigateDown]);

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setMessage(null);
    setPeoplePanelNodeId(null);
    if (nextMode === "edit") {
      const allIds = new Set(sourceNodes.map((node) => node.id));
      setExpanded(allIds);
      // No reordenamos al entrar: editar muestra exactamente el diseño guardado.
      setSelectedId(focusedId || roots[0] || null);
      setEditorSection("function");
      window.setTimeout(() => fitView({ duration: 560, padding: 0.12, maxZoom: 0.78 }), 90);
    } else {
      setSelectedId(null);
      setEditingMemberId(null);
      setHistory([]);
      setExpanded(new Set());
      setFocusedId(roots[0] || null);
      window.setTimeout(() => fitView({ duration: 500, padding: 0.26, maxZoom: 1.1 }), 60);
    }
  };

  const runAction = (action: () => Promise<void>) => {
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        setMessage({ type: "error", text: error instanceof Error ? error.message : "No se pudo completar la acción." });
      }
    });
  };

  const mergeDirectoryPerson = (person?: Person | null) => {
    if (!person) return;
    setDirectoryPeople((current) => {
      const exists = current.some((item) => item.id === person.id);
      return exists
        ? current.map((item) => (item.id === person.id ? { ...item, ...person } : item))
        : [...current, person].sort((a, b) => fullName(a).localeCompare(fullName(b), "es"));
    });
  };

  const createNewChart = (formData: FormData) => {
    runAction(async () => {
      const result = await createPucaraStarterChartAction({
        schoolSlug: props.schoolSlug,
        title: String(formData.get("chartTitle") ?? ""),
        year: String(formData.get("chartYear") ?? new Date().getFullYear()),
        starter: String(formData.get("starter") ?? "basic") === "single" ? "single" : "basic",
      });
      window.location.href = `/organigramas/${props.schoolSlug}/pucara?organigrama=${result.chartId}`;
    });
  };

  const savePositions = () => runAction(async () => {
    await savePucaraPositionsAction({
      schoolSlug: props.schoolSlug,
      positions: sourceNodes.map((node) => ({ nodeId: node.id, positionX: node.positionX, positionY: node.positionY })),
    });
    setMessage({ type: "ok", text: "Diseño guardado correctamente." });
  });

  const autoOrderEditor = () => {
    const allIds = new Set(sourceNodes.map((node) => node.id));
    const ordered = autoLayout(sourceNodes, sourceEdges, allIds, depth);
    setSourceNodes(ordered);
    window.setTimeout(() => fitView({ duration: 560, padding: 0.12, maxZoom: 0.78 }), 70);
    runAction(async () => {
      await savePucaraPositionsAction({
        schoolSlug: props.schoolSlug,
        positions: ordered.map((node) => ({
          nodeId: node.id,
          positionX: node.positionX,
          positionY: node.positionY,
        })),
      });
      setMessage({ type: "ok", text: "Organigrama ordenado y guardado." });
    });
  };

  const importHito = () => {
    if (props.schoolSlug !== "pucara") return;
    if (!window.confirm("Se va a crear/actualizar un organigrama de prueba separado con toda la estructura y personas del Pucará original. El organigrama actual no se borra. ¿Continuar?")) return;
    runAction(async () => {
      const result = await importPucaraHitoAction({ schoolSlug: props.schoolSlug });
      window.location.href = `/organigramas/${props.schoolSlug}/pucara?organigrama=${result.chartId}`;
    });
  };

  const saveNode = (formData: FormData) => {
    if (!currentNode) return;
    runAction(async () => {
      const updated = await updatePucaraNodeAction({
        schoolSlug: props.schoolSlug,
        nodeId: currentNode.id,
        title: String(formData.get("title") ?? ""),
        formalRole: String(formData.get("formalRole") ?? ""),
        realFunction: String(formData.get("realFunction") ?? ""),
        description: String(formData.get("description") ?? ""),
        weeklyHours: String(formData.get("weeklyHours") ?? ""),
        personId: String(formData.get("personId") ?? ""),
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        email: String(formData.get("email") ?? ""),
        photoUrl: String(formData.get("photoUrl") ?? ""),
      });
      setSourceNodes((current) => current.map((node) => (node.id === updated.id ? { ...node, ...updated } : node)));
      mergeDirectoryPerson(updated.person);

      const requestedParentId = String(formData.get("parentNodeId") ?? "");
      if (requestedParentId !== currentParentId) {
        const reparented = await reparentPucaraNodeAction({
          schoolSlug: props.schoolSlug,
          orgChartId: props.orgChartId,
          nodeId: currentNode.id,
          parentNodeId: requestedParentId || null,
        });
        setSourceEdges((current) => {
          const rest = current.filter((edge) => edge.targetId !== currentNode.id);
          return reparented.edge
            ? [...rest, {
                id: reparented.edge.id,
                sourceId: reparented.edge.sourceId,
                targetId: reparented.edge.targetId,
                type: reparented.edge.type,
                label: reparented.edge.label,
              }]
            : rest;
        });
      }

      setMessage({ type: "ok", text: "La caja, la persona y su dependencia quedaron guardadas." });
    });
  };

  const addChild = () => {
    if (!currentNode) return;
    runAction(async () => {
      const created = await createPucaraChildAction({
        schoolSlug: props.schoolSlug,
        orgChartId: props.orgChartId,
        parentNodeId: currentNode.id,
      });
      setSourceNodes((current) => [...current, created.node]);
      setSourceEdges((current) => [...current, {
        id: created.edge.id,
        sourceId: created.edge.sourceId,
        targetId: created.edge.targetId,
        type: created.edge.type,
        label: created.edge.label,
      }]);
      setSelectedId(created.node.id);
      setFocusedId(created.node.id);
      window.setTimeout(() => {
        setCenter(
          created.node.positionX + NODE_WIDTH / 2,
          created.node.positionY + cardHeightFor(created.node) / 2,
          { zoom: 0.95, duration: 420 },
        );
      }, 60);
      setMessage({ type: "ok", text: "Se agregó una nueva dependencia. Ahora completá sus datos." });
    });
  };

  const deleteNode = () => {
    if (!currentNode || !window.confirm(`¿Eliminar “${currentNode.title}”?`)) return;
    runAction(async () => {
      await deletePucaraNodeAction({ schoolSlug: props.schoolSlug, nodeId: currentNode.id });
      setSourceNodes((current) => current.filter((node) => node.id !== currentNode.id));
      setSourceEdges((current) => current.filter((edge) => edge.sourceId !== currentNode.id && edge.targetId !== currentNode.id));
      setSelectedId(null);
      setFocusedId(roots[0] || null);
      setMessage({ type: "ok", text: "La caja se eliminó correctamente." });
    });
  };

  const saveMember = (formData: FormData) => {
    if (!currentNode) return;
    runAction(async () => {
      const updated = await upsertPucaraMemberAction({
        schoolSlug: props.schoolSlug,
        orgNodeId: currentNode.id,
        memberId: editingMemberId && editingMemberId !== "new" ? editingMemberId : null,
        personId: String(formData.get("memberPersonId") ?? ""),
        firstName: String(formData.get("memberFirstName") ?? ""),
        lastName: String(formData.get("memberLastName") ?? ""),
        roleTitle: String(formData.get("memberRoleTitle") ?? ""),
        weeklyHours: String(formData.get("memberWeeklyHours") ?? ""),
        email: String(formData.get("memberEmail") ?? ""),
        photoUrl: String(formData.get("memberPhotoUrl") ?? ""),
      });
      setSourceNodes((current) => current.map((node) => (node.id === updated.id ? { ...node, ...updated } : node)));
      mergeDirectoryPerson(updated.person);
      (updated.members ?? []).forEach((member: Member) => mergeDirectoryPerson(member.person));
      setEditingMemberId(null);
      setMessage({ type: "ok", text: "La persona quedó guardada dentro del equipo." });
    });
  };

  const removeMember = (member: Member) => {
    if (!currentNode || !window.confirm(`¿Quitar a ${fullName(member.person)} de esta caja?`)) return;
    runAction(async () => {
      const updated = await deletePucaraMemberAction({
        schoolSlug: props.schoolSlug,
        orgNodeId: currentNode.id,
        memberId: member.id,
      });
      setSourceNodes((current) => current.map((node) => (node.id === updated.id ? { ...node, ...updated } : node)));
      setEditingMemberId(null);
      setMessage({ type: "ok", text: "La persona se quitó del equipo." });
    });
  };

  const editingMember = currentNode?.members.find((member) => member.id === editingMemberId) ?? null;

  return (
    <main className="min-h-screen bg-[#eef2f7] p-2 md:p-5">
      <section className="mx-auto max-w-[1920px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <img src={props.schoolLogoUrl || "/images/escudo-pucara.png"} alt={props.schoolName} className="h-full w-full object-contain p-1" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Organigrama institucional</p>
                <h1 className="text-2xl font-black text-slate-950">{props.schoolName}</h1>
                <p className="text-sm font-semibold text-slate-500">{props.orgChartTitle}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/organigramas/${props.schoolSlug}?organigrama=${props.orgChartId}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                <ArrowLeft className="h-4 w-4" /> Volver a organigramas
              </Link>
              <button
                type="button"
                onClick={() => setShowCreateChart(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
              >
                <Plus className="h-4 w-4" /> Nuevo organigrama
              </button>
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button type="button" onClick={() => changeMode("view")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition ${mode === "view" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>
                  <Eye className="h-4 w-4" /> Ver
                </button>
                <button type="button" onClick={() => changeMode("edit")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition ${mode === "edit" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500"}`}>
                  <Edit3 className="h-4 w-4" /> Editar
                </button>
              </div>
            </div>
          </div>
        </header>

        {message ? (
          <div className={`flex items-center gap-2 border-b px-6 py-3 text-sm font-black ${message.type === "ok" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"}`}>
            {message.type === "ok" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />} {message.text}
          </div>
        ) : null}

        {mode === "edit" ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 md:px-6">
            <button type="button" onClick={autoOrderEditor} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700">
              <LayoutGrid className="h-4 w-4" /> Auto ordenar
            </button>
            <button type="button" onClick={savePositions} disabled={isPending} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar diseño
            </button>
            {props.schoolSlug === "pucara" ? (
              <button type="button" onClick={importHito} disabled={isPending} className="inline-flex items-center gap-2 rounded-xl bg-[#1C3A62] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#152f50] disabled:opacity-60">
                <UsersRound className="h-4 w-4" /> Cargar Pucará completo
              </button>
            ) : null}
            <p className="text-xs font-semibold text-slate-500">Arrastrá una caja: al soltarla su posición queda guardada. “Auto ordenar” también guarda el nuevo diseño.</p>
          </div>
        ) : null}

        <div className={`grid ${mode === "edit" ? "xl:grid-cols-[minmax(0,1fr)_430px]" : "grid-cols-1"}`}>
          <div className="relative h-[78vh] min-h-[680px] bg-[#f8fafc]">
            {sourceNodes.length === 0 ? (
              <div className="absolute inset-0 z-30 flex items-center justify-center p-6">
                <div className="max-w-md rounded-[28px] border border-slate-200 bg-white p-7 text-center shadow-2xl">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Plus className="h-7 w-7" />
                  </div>
                  <h2 className="mt-4 text-xl font-black text-slate-950">Empezá con una base simple</h2>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
                    Creá Consejo + Dirección o una sola Dirección General. Después armás el resto tocando “Dependencia”.
                  </p>
                  <button type="button" onClick={() => setShowCreateChart(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800">
                    <Plus className="h-4 w-4" /> Crear organigrama
                  </button>
                </div>
              </div>
            ) : null}
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onNodeDragStop={(_, node) => persistDraggedNode(node.id, node.position.x, node.position.y)}
              onNodeClick={(_, node) => {
                focusNode(node.id);
                if (mode === "view") setPeoplePanelNodeId(node.id);
              }}
              nodesDraggable={mode === "edit"}
              panOnDrag
              zoomOnScroll
              zoomOnPinch
              zoomOnDoubleClick={false}
              minZoom={0.12}
              maxZoom={2.2}
              fitView
              fitViewOptions={{ padding: 0.22 }}
              elevateEdgesOnSelect
              defaultEdgeOptions={{ type: "smoothstep" }}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#cbd5e1" />
              <Controls position="top-left" showInteractive={false} />
              <div className="pointer-events-none absolute right-5 top-5 z-20 flex min-h-[92px] min-w-[92px] items-center justify-center rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
                <img
                  src={props.schoolLogoUrl || "/images/escudo-pucara.png"}
                  alt={`Escudo de ${props.schoolName}`}
                  className="h-[68px] w-[68px] object-contain"
                />
              </div>
            </ReactFlow>

            {mode === "view" ? (
              <>
                <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur">
                  <UtilityNavButton label="Atrás" disabled={history.length === 0} onClick={goBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </UtilityNavButton>
                  <UtilityNavButton label="Ver todo" disabled={sourceNodes.length === 0} onClick={showAll}>
                    <Eye className="h-4 w-4" />
                  </UtilityNavButton>
                  <UtilityNavButton label="Reiniciar" disabled={false} onClick={restartView}>
                    <RotateCcw className="h-4 w-4" />
                  </UtilityNavButton>
                </div>

                <div className="absolute bottom-6 left-1/2 z-20 grid w-[168px] -translate-x-1/2 grid-cols-3 gap-2 rounded-[26px] border border-slate-200 bg-white/90 p-3 shadow-2xl backdrop-blur">
                  <div className="col-span-3 flex justify-center">
                    <ArrowPadButton label="Subir" disabled={!navigation.parent} onClick={() => navigation.parent && focusNode(navigation.parent.id)}>
                      <ArrowUp className="h-5 w-5" />
                    </ArrowPadButton>
                  </div>
                  <div className="flex justify-end">
                    <ArrowPadButton label="Anterior" disabled={navigation.index <= 0} onClick={() => navigation.siblings[navigation.index - 1] && focusNode(navigation.siblings[navigation.index - 1].id)}>
                      <ArrowLeft className="h-5 w-5" />
                    </ArrowPadButton>
                  </div>
                  <div className="flex justify-center">
                    <ArrowPadButton label="Bajar" disabled={!navigation.children[0]} onClick={navigateDown}>
                      <ArrowDown className="h-5 w-5" />
                    </ArrowPadButton>
                  </div>
                  <div className="flex justify-start">
                    <ArrowPadButton label="Siguiente" disabled={!navigation.siblings[navigation.index + 1]} onClick={() => navigation.siblings[navigation.index + 1] && focusNode(navigation.siblings[navigation.index + 1].id)}>
                      <ArrowRight className="h-5 w-5" />
                    </ArrowPadButton>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {mode === "edit" ? (
            <aside className="max-h-[78vh] overflow-y-auto border-l border-slate-200 bg-white">
              {currentNode ? (
                <>
                  <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-5 backdrop-blur">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Caja seleccionada</p>
                        <h2 className="mt-1 text-xl font-black text-slate-950">{currentNode.title}</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Editá la función, la foto y todas las personas desde acá.</p>
                      </div>
                      <button type="button" onClick={addChild} disabled={isPending} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-800 disabled:opacity-60">
                        <Plus className="h-4 w-4" /> Dependencia
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                      <button type="button" onClick={() => setEditorSection("function")} className={`rounded-lg px-3 py-2 text-sm font-black transition ${editorSection === "function" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Función</button>
                      <button type="button" onClick={() => setEditorSection("team")} className={`rounded-lg px-3 py-2 text-sm font-black transition ${editorSection === "team" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Equipo ({currentNode.members.length})</button>
                    </div>
                  </div>

                  {editorSection === "function" ? (
                    <form action={saveNode} key={`node-${currentNode.id}`} className="space-y-4 p-5">
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <PersonAvatar person={currentNode.person} className="h-16 w-16" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">{fullName(currentNode.person)}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">La foto se ve igual en la vista y en el editor.</p>
                        </div>
                      </div>

                      <label className="block">
                        <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Depende de</span>
                        <select
                          name="parentNodeId"
                          defaultValue={currentParentId}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        >
                          <option value="">Sin superior · caja raíz</option>
                          {parentCandidates.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.title}
                            </option>
                          ))}
                        </select>
                        <span className="mt-1.5 block text-xs font-semibold text-slate-400">Cambiar este campo mueve la dependencia jerárquica y su línea.</span>
                      </label>

                      <Field label="Título de la caja" name="title" defaultValue={currentNode.title} />
                      <Field label="Cargo formal" name="formalRole" defaultValue={currentNode.formalRole || ""} />
                      <Field label="Función real" name="realFunction" defaultValue={currentNode.realFunction || ""} />
                      <TextArea label="Descripción" name="description" defaultValue={currentNode.description || ""} />
                      <Field label="Horas semanales" name="weeklyHours" type="number" defaultValue={currentNode.weeklyHours?.toString() || ""} />
                      <ExistingPersonSelect
                        label="Responsable"
                        name="personId"
                        people={directoryPeople}
                        defaultValue={currentNode.person?.id || "__new__"}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Nombre" name="firstName" defaultValue={currentNode.person?.firstName || ""} />
                        <Field label="Apellido" name="lastName" defaultValue={currentNode.person?.lastName || ""} />
                      </div>
                      <Field label="Correo / Gmail" name="email" type="email" defaultValue={currentNode.person?.email || ""} placeholder="nombre@colegio.edu.ar" icon={<Mail className="h-4 w-4" />} />
                      <Field label="Foto (archivo o URL)" name="photoUrl" defaultValue={currentNode.person?.photoUrl || ""} placeholder="juan-perez.jpg" icon={<ImageIcon className="h-4 w-4" />} />
                      <PhotoHelp />

                      <button type="submit" disabled={isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:opacity-60">
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar función y responsable
                      </button>

                      <button type="button" onClick={deleteNode} disabled={isPending || sourceEdges.some((edge) => edge.sourceId === currentNode.id)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45">
                        <Trash2 className="h-4 w-4" /> Eliminar esta caja
                      </button>
                      {sourceEdges.some((edge) => edge.sourceId === currentNode.id) ? <p className="text-center text-xs font-semibold text-slate-400">No se puede eliminar mientras tenga dependencias inferiores.</p> : null}
                    </form>
                  ) : (
                    <div className="space-y-4 p-5">
                      <button type="button" onClick={() => setEditingMemberId("new")} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-[#123868] transition hover:bg-amber-300">
                        <UserPlus className="h-4 w-4" /> Agregar persona al equipo
                      </button>

                      {currentNode.members.length ? (
                        <div className="space-y-2">
                          {currentNode.members.map((member) => (
                            <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                              <PersonAvatar person={member.person} className="h-12 w-12" />
                              <button type="button" onClick={() => setEditingMemberId(member.id)} className="min-w-0 flex-1 text-left">
                                <p className="truncate text-sm font-black text-slate-950">{fullName(member.person)}</p>
                                <p className="truncate text-xs font-semibold text-slate-500">{member.roleTitle || "Equipo"}{member.weeklyHours ? ` · ${member.weeklyHours} hs.` : ""}</p>
                              </button>
                              <button type="button" onClick={() => removeMember(member)} className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-600 transition hover:bg-rose-50" aria-label="Quitar persona"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500">Esta caja todavía no tiene personas adicionales.</div>
                      )}

                      {editingMemberId ? (
                        <form action={saveMember} key={`member-${editingMemberId}-${currentNode.id}`} className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{editingMemberId === "new" ? "Nueva persona" : "Editar persona"}</p>
                              <p className="mt-1 text-sm font-semibold text-slate-500">Se mostrará dentro de esta caja.</p>
                            </div>
                            <button type="button" onClick={() => setEditingMemberId(null)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm"><X className="h-4 w-4" /></button>
                          </div>
                          <ExistingPersonSelect
                            label="Persona"
                            name="memberPersonId"
                            people={directoryPeople}
                            defaultValue={editingMember?.person.id || "__new__"}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Nombre" name="memberFirstName" defaultValue={editingMember?.person.firstName || ""} />
                            <Field label="Apellido" name="memberLastName" defaultValue={editingMember?.person.lastName || ""} />
                          </div>
                          <Field label="Función dentro del equipo" name="memberRoleTitle" defaultValue={editingMember?.roleTitle || ""} />
                          <Field label="Horas semanales" name="memberWeeklyHours" type="number" defaultValue={editingMember?.weeklyHours?.toString() || ""} />
                          <Field label="Correo / Gmail" name="memberEmail" type="email" defaultValue={editingMember?.person.email || ""} placeholder="nombre@colegio.edu.ar" icon={<Mail className="h-4 w-4" />} />
                          <Field label="Foto (archivo o URL)" name="memberPhotoUrl" defaultValue={editingMember?.person.photoUrl || ""} placeholder="nombre-apellido.jpg" icon={<ImageIcon className="h-4 w-4" />} />
                          <PhotoHelp compact />
                          <button type="submit" disabled={isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:opacity-60">
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar persona
                          </button>
                        </form>
                      ) : null}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-6">
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                    <Edit3 className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-black text-slate-700">Tocá una caja para editarla</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">También podés arrastrarla directamente en el organigrama.</p>
                  </div>
                </div>
              )}
            </aside>
          ) : null}
        </div>
      </section>

      {peoplePanelNode ? (
        <PeopleDrawer node={peoplePanelNode} onClose={() => setPeoplePanelNodeId(null)} />
      ) : null}

      {showCreateChart ? (
        <CreateChartModal
          schoolName={props.schoolName}
          pending={isPending}
          onClose={() => setShowCreateChart(false)}
          onSubmit={createNewChart}
        />
      ) : null}
    </main>
  );
}

function PeopleDrawer({ node, onClose }: { node: SourceNode; onClose: () => void }) {
  const people = peopleForNode(node);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-sm" onMouseDown={onClose}>
      <aside className="h-full w-full max-w-[520px] overflow-y-auto bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Ficha de la función</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">{node.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{nodeDescription(node)}</p>
              <p className="mt-2 text-xs font-black text-slate-400">
                {people.length} {people.length === 1 ? "persona" : "personas"}
              </p>
            </div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="space-y-3 p-5">
          {people.length ? people.map((person) => (
            <div key={person.id} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-4">
                <SimplePhoto src={person.photoUrl} name={person.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-black text-slate-950">{person.name}</p>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">{person.role}</p>
                  {person.weeklyHours ? (
                    <p className="mt-2 text-xs font-black text-slate-400">{person.weeklyHours} hs. semanales</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3">
                {person.email ? (
                  <a
                    href={`mailto:${person.email}`}
                    className="inline-flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-900"
                  >
                    <Mail className="h-4 w-4" />
                    {person.email}
                  </a>
                ) : (
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400">
                    <Mail className="h-4 w-4" />
                    Correo todavía no cargado
                  </p>
                )}
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500">
              Esta función todavía no tiene una persona asignada.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function SimplePhoto({ src, name }: { src?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100">
      {src && !failed ? <img src={src} alt={name} className="h-full w-full object-cover" onError={() => setFailed(true)} /> : <UserRound className="h-7 w-7 text-slate-400" />}
    </div>
  );
}

function ArrowPadButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1C3A62] shadow-lg transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:translate-y-0"
    >
      {children}
    </button>
  );
}

function UtilityNavButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
    >
      {children}<span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ExistingPersonSelect({
  label,
  name,
  people,
  defaultValue,
}: {
  label: string;
  name: string;
  people: Person[];
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.11em] text-slate-500">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      >
        <option value="__new__">+ Cargar una persona nueva</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {fullName(person)}{person.email ? ` · ${person.email}` : ""}
          </option>
        ))}
      </select>
      <span className="mt-1.5 block text-xs font-semibold leading-relaxed text-slate-400">
        Elegí alguien ya cargado para no duplicarlo, o dejá “persona nueva” y completá los campos de abajo.
      </span>
    </label>
  );
}

function CreateChartModal({
  schoolName,
  pending,
  onClose,
  onSubmit,
}: {
  schoolName: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const year = new Date().getFullYear();
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="w-full max-w-[620px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 md:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Nuevo organigrama</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Empezar simple</h2>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-slate-500">
              Se crea una base chica para {schoolName}. Después agregás dependencias y personas desde el mismo editor, sin cargar todo de una.
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={onSubmit} className="space-y-5 p-5 md:p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_120px]">
            <Field label="Nombre" name="chartTitle" defaultValue={`Organigrama ${schoolName} ${year}`} />
            <Field label="Año" name="chartYear" type="number" defaultValue={String(year)} />
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-black uppercase tracking-[0.11em] text-slate-500">Base inicial</legend>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="cursor-pointer rounded-2xl border-2 border-blue-200 bg-blue-50/70 p-4 transition has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50">
                <input type="radio" name="starter" value="basic" defaultChecked className="sr-only" />
                <p className="font-black text-slate-950">Consejo + Dirección</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">La recomendada. Arranca con dos cajas unidas y desde Dirección agregás las áreas.</p>
              </label>
              <label className="cursor-pointer rounded-2xl border-2 border-slate-200 bg-white p-4 transition has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50">
                <input type="radio" name="starter" value="single" className="sr-only" />
                <p className="font-black text-slate-950">Solo Dirección</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">Una sola caja raíz para construir toda la estructura desde cero.</p>
              </label>
            </div>
          </fieldset>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-black text-emerald-800">Después es todo desde Editar</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-700">
              Tocás una caja → “Dependencia” para crear otra. Podés elegir personas ya cargadas o crear nuevas, agregar foto, correo, descripción y mover cada tarjeta con el mouse.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:opacity-60">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear y empezar a editar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, defaultValue, type = "text", placeholder, icon }: { label: string; name: string; defaultValue: string; type?: string; placeholder?: string; icon?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.11em] text-slate-500">{icon}{label}</span>
      <input type={type} name={name} defaultValue={defaultValue} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
    </label>
  );
}

function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.11em] text-slate-500">{label}</span>
      <textarea name={name} defaultValue={defaultValue} rows={4} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold leading-relaxed text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
    </label>
  );
}

function PhotoHelp({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`rounded-xl bg-blue-50 text-xs font-semibold leading-relaxed text-blue-700 ${compact ? "p-2.5" : "p-3"}`}>
      Poné la imagen en <strong>public/images/personas</strong>. En el campo de foto podés escribir solo <strong>juan-perez.jpg</strong> y la página usa automáticamente <strong>/images/personas/juan-perez.jpg</strong>. También acepta una URL <strong>https</strong>.
    </p>
  );
}

export function PucaraOrgChart(props: Props) {
  return (
    <ReactFlowProvider>
      <ChartInner {...props} />
    </ReactFlowProvider>
  );
}
