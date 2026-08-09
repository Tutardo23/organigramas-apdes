"use client";

/* eslint-disable @next/next/no-img-element -- Las fotos pueden venir de rutas locales o URLs HTTPS cargadas por cada colegio; no abrimos remotePatterns globales por seguridad. */

import dagre from "dagre";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
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
  ChevronUp,
  Edit3,
  Eye,
  ImageIcon,
  Info,
  LayoutGrid,
  Link2,
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
  createPucaraRelationAction,
  createPucaraStarterChartAction,
  deletePucaraRelationAction,
  importPucaraHitoAction,
  deletePucaraMemberAction,
  deletePucaraNodeAction,
  movePucaraNodeAction,
  normalizePucaraHierarchyAction,
  reparentPucaraNodeAction,
  savePucaraPositionsAction,
  updatePucaraNodeAction,
  updatePucaraRelationAction,
  upsertPucaraMemberAction,
} from "../../app/organigramas/[schoolSlug]/pucara/actions";
import { ORG_SIMPLE_PRESETS } from "../../lib/org-simple-presets";
import { isBuenAyreSchoolSlug } from "../../lib/buen-ayre-simple-hierarchy";
import {
  countPucaraRelationsByView,
  pucaraRelationMatchesView,
  type PucaraRelationView,
} from "../../lib/pucara-relations";

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

type RelationHighlight = "integration" | "collaboration" | "both" | null;

type CardData = SourceNode & {
  schoolSlug: string;
  schoolName: string;
  schoolLogoUrl?: string | null;
  isFocused: boolean;
  relationHighlight: RelationHighlight;
  isExpanded: boolean;
  hasChildren: boolean;
  cardHeight: number;
  onToggle: (nodeId: string) => void;
  onOpenPeople: (nodeId: string) => void;
  onFocusPerson: (nodeId: string, personId: string) => void;
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
  initialMode?: "view" | "edit";
  availableCharts?: {
    id: string;
    title: string;
    year: number;
    version?: number | null;
    status?: string | null;
  }[];
};

type Mode = "view" | "edit";
type EditorSection = "function" | "team" | "relations";
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
  // No adivinamos un archivo por ID: si no hay foto cargada, mostramos el avatar.
  // Así evitamos cientos de 404 como /images/personas/demo-person-*.jpg.
  return person.photoUrl?.trim() || null;
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

function SchoolLogo({
  schoolSlug,
  schoolName,
  schoolLogoUrl,
  className = "h-14 w-14",
}: {
  schoolSlug: string;
  schoolName: string;
  schoolLogoUrl?: string | null;
  className?: string;
}) {
  const candidates = useMemo(() => {
    const values = [
      schoolLogoUrl?.trim() || null,
      `/images/colegios/${schoolSlug}.png`,
      schoolSlug === "pucara" ? "/images/escudo-pucara.png" : null,
    ].filter((value): value is string => Boolean(value));
    return Array.from(new Set(values));
  }, [schoolLogoUrl, schoolSlug]);
  const [failedSources, setFailedSources] = useState<Set<string>>(() => new Set());
  const src = candidates.find((candidate) => !failedSources.has(candidate)) ?? null;
  const initials = schoolName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {src ? (
        <img src={src} alt={`Escudo de ${schoolName}`} className="h-full w-full object-contain p-1" onError={() => {
          if (!src) return;
          setFailedSources((current) => {
            const next = new Set(current);
            next.add(src);
            return next;
          });
        }} />
      ) : (
        <span className="text-sm font-black text-slate-500">{initials || "AP"}</span>
      )}
    </div>
  );
}

function PucaraCard({ data }: NodeProps<Node<CardData>>) {
  const color = data.color || "#1C3A62";
  const people = peopleForNode(data);
  const shownPeople = people;
  const isCollective = people.length > 1;
  const relationStyle =
    data.relationHighlight === "integration"
      ? "scale-[1.035] border-red-500 ring-[8px] ring-red-300/65 shadow-2xl shadow-red-300/70"
      : data.relationHighlight === "collaboration"
        ? "scale-[1.035] border-blue-500 ring-[8px] ring-blue-300/65 shadow-2xl shadow-blue-300/70"
        : data.relationHighlight === "both"
          ? "scale-[1.035] border-violet-500 ring-[8px] ring-violet-300/65 shadow-2xl shadow-violet-300/70"
          : "border-slate-200 hover:-translate-y-0.5 hover:shadow-2xl";

  return (
    <div className="relative w-[380px]" style={{ minHeight: data.cardHeight }}>
      <Handle
        id="hierarchy-target"
        type="target"
        position={Position.Top}
        className="!h-1 !w-1 !border-0 !bg-transparent !opacity-0"
      />

      <div
        className={`overflow-hidden rounded-[26px] border bg-white shadow-xl transition-all duration-300 ${
          data.isFocused
            ? "scale-[1.025] border-amber-300 ring-4 ring-amber-300/70"
            : relationStyle
        }`}
        style={{ minHeight: data.cardHeight }}
      >
        {data.relationHighlight ? (
          <div className={`absolute right-3 top-3 z-20 rounded-full border-2 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] shadow-lg ${
            data.relationHighlight === "integration"
              ? "border-red-200 bg-red-50 text-red-700"
              : data.relationHighlight === "collaboration"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-violet-200 bg-violet-50 text-violet-700"
          }`}>
            {data.relationHighlight === "integration" ? "Integra" : data.relationHighlight === "collaboration" ? "Colabora" : "Integra + Colabora"}
          </div>
        ) : null}
        <div className="flex min-h-[126px] items-center gap-4 px-5 py-4 text-white" style={{ backgroundColor: color }}>
          {data.person ? (
            <PersonAvatar person={data.person} className="h-16 w-16" />
          ) : (
            <SchoolLogo schoolSlug={data.schoolSlug} schoolName={data.schoolName} schoolLogoUrl={data.schoolLogoUrl} className="h-16 w-16 !rounded-full !border-0" />
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
                    data.onFocusPerson(data.id, person.id);
                  }}
                  title="Ir a la función de esta persona"
                  className="min-h-[72px] border-b border-slate-200 px-5 py-3 text-left transition hover:bg-blue-50 even:border-l"
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
              <p className="text-xs font-semibold text-slate-400">Tocá la tarjeta para enfocarla. La ficha se abre con el botón de información.</p>
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

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            data.onOpenPeople(data.id);
          }}
          className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border-4 border-white bg-amber-400 px-3 text-[#123868] shadow-lg transition hover:scale-105"
          aria-label="Ver ficha de la función"
          title="Ver ficha"
        >
          <Info className="h-5 w-5" />
          {people.length > 1 ? <span className="text-xs font-black">{people.length}</span> : null}
        </button>
      </div>

      {/* Handles laterales exclusivos para Integra / Colabora. Son invisibles,
          pero hacen que el vínculo salga por el costado de una card y entre por
          el costado de la otra, en lugar de mezclarse con la jerarquía. */}
      <Handle id="relation-source-left" type="source" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0" />
      <Handle id="relation-target-left" type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0" />
      <Handle id="relation-source-right" type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0" />
      <Handle id="relation-target-right" type="target" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0" />

      <Handle
        id="hierarchy-source"
        type="source"
        position={Position.Bottom}
        className="!h-1 !w-1 !border-0 !bg-transparent !opacity-0"
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


function normalizedTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_·–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


/**
 * Buen Ayre se ordena como un árbol limpio de arriba hacia abajo.
 *
 * La versión anterior intentaba empaquetar cinco subgrafos Dagre por separado.
 * Eso podía generar ramas enormes, cruces y nodos visualmente desconectados si
 * una dependencia histórica terminaba cruzando de un área a otra.
 *
 * Este layout calcula el ancho de CADA subárbol y coloca al padre centrado sobre
 * todos sus hijos. De esta forma las dependencias jerárquicas quedan verticales,
 * predecibles y sin recorridos laterales absurdos.
 */
function autoLayoutBuenAyre(nodes: SourceNode[], edges: SourceEdge[]) {
  if (nodes.length <= 1) return nodes;

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map<string, string[]>();
  const parent = new Map<string, string>();

  for (const edge of edges) {
    if (!nodeById.has(edge.sourceId) || !nodeById.has(edge.targetId)) continue;
    const list = children.get(edge.sourceId) ?? [];
    if (!list.includes(edge.targetId)) list.push(edge.targetId);
    children.set(edge.sourceId, list);
    parent.set(edge.targetId, edge.sourceId);
  }

  const semanticOrder = (node: SourceNode) => {
    const title = normalizedTitle(node.title);
    const rules: Array<[RegExp, number]> = [
      [/director general|direccion general/, 0],
      [/consejo de direccion/, 1],
      [/area academica/, 10],
      [/area de orientacion|area orientacion/, 20],
      [/area de desarrollo institucional|area desarrollo institucional/, 30],
      [/area de administracion|area administracion/, 40],
      [/area de operaciones|area operaciones/, 50],
      [/nivel inicial/, 100],
      [/nivel primar/, 110],
      [/nivel secundar/, 120],
      [/familia/, 200],
      [/comunicacion/, 210],
      [/postulaciones|admisiones/, 220],
      [/administr/, 300],
      [/operaciones|mantenimiento|limpieza|seguridad/, 310],
    ];
    for (const [pattern, value] of rules) if (pattern.test(title)) return value;
    return 500;
  };

  for (const [id, list] of children) {
    list.sort((a, b) => {
      const na = nodeById.get(a)!;
      const nb = nodeById.get(b)!;
      return semanticOrder(na) - semanticOrder(nb)
        || na.positionX - nb.positionX
        || na.title.localeCompare(nb.title, "es");
    });
    children.set(id, list);
  }

  const roots = nodes
    .filter((node) => !parent.has(node.id))
    .sort((a, b) => semanticOrder(a) - semanticOrder(b) || a.positionX - b.positionX);
  const rootsToPlace = roots.length ? roots : [nodes[0]];

  const H_GAP = 78;
  const V_GAP = 118;
  const OUTER_MARGIN = 90;
  const subtreeWidth = new Map<string, number>();
  const visiting = new Set<string>();

  const measure = (id: string): number => {
    if (subtreeWidth.has(id)) return subtreeWidth.get(id)!;
    if (visiting.has(id)) return NODE_WIDTH;
    visiting.add(id);
    const kids = (children.get(id) ?? []).filter((childId) => childId !== id);
    const width = kids.length
      ? Math.max(
          NODE_WIDTH,
          kids.reduce((sum, childId) => sum + measure(childId), 0) + H_GAP * Math.max(0, kids.length - 1),
        )
      : NODE_WIDTH;
    visiting.delete(id);
    subtreeWidth.set(id, width);
    return width;
  };

  rootsToPlace.forEach((root) => measure(root.id));

  // Altura máxima de cada nivel para que tarjetas con muchas personas nunca
  // se pisen con el siguiente nivel.
  const depthById = new Map<string, number>();
  const depthQueue = rootsToPlace.map((node) => ({ id: node.id, depth: 0 }));
  while (depthQueue.length) {
    const item = depthQueue.shift()!;
    if (depthById.has(item.id)) continue;
    depthById.set(item.id, item.depth);
    for (const childId of children.get(item.id) ?? []) {
      depthQueue.push({ id: childId, depth: item.depth + 1 });
    }
  }

  // Cualquier caja suelta queda en un nivel propio al final, en vez de cruzar
  // ramas existentes.
  const unresolved = nodes.filter((node) => !depthById.has(node.id));
  const maxKnownDepth = Math.max(0, ...depthById.values());
  unresolved.forEach((node) => depthById.set(node.id, maxKnownDepth + 1));

  const maxHeightByDepth = new Map<number, number>();
  for (const node of nodes) {
    const d = depthById.get(node.id) ?? 0;
    maxHeightByDepth.set(d, Math.max(maxHeightByDepth.get(d) ?? 0, cardHeightFor(node)));
  }

  const yByDepth = new Map<number, number>();
  let yCursor = 70;
  const deepest = Math.max(0, ...depthById.values());
  for (let d = 0; d <= deepest; d += 1) {
    yByDepth.set(d, yCursor);
    yCursor += (maxHeightByDepth.get(d) ?? SIMPLE_NODE_HEIGHT) + V_GAP;
  }

  const positions = new Map<string, { x: number; y: number }>();
  const placed = new Set<string>();

  const placeSubtree = (id: string, left: number) => {
    if (placed.has(id)) return;
    const node = nodeById.get(id);
    if (!node) return;
    placed.add(id);

    const width = subtreeWidth.get(id) ?? NODE_WIDTH;
    const depthValue = depthById.get(id) ?? 0;
    positions.set(id, {
      x: left + width / 2 - NODE_WIDTH / 2,
      y: yByDepth.get(depthValue) ?? 70,
    });

    const kids = (children.get(id) ?? []).filter((childId) => !placed.has(childId));
    if (!kids.length) return;
    const kidsWidth = kids.reduce((sum, childId) => sum + (subtreeWidth.get(childId) ?? NODE_WIDTH), 0)
      + H_GAP * Math.max(0, kids.length - 1);
    let childLeft = left + (width - kidsWidth) / 2;
    for (const childId of kids) {
      placeSubtree(childId, childLeft);
      childLeft += (subtreeWidth.get(childId) ?? NODE_WIDTH) + H_GAP;
    }
  };

  let rootLeft = OUTER_MARGIN;
  for (const root of rootsToPlace) {
    placeSubtree(root.id, rootLeft);
    rootLeft += (subtreeWidth.get(root.id) ?? NODE_WIDTH) + 180;
  }

  // Cajas que quedaron fuera de la jerarquía: fila ordenada al final. No se
  // mezclan dentro de ningún subárbol ni generan cruces inesperados.
  let looseX = OUTER_MARGIN;
  const looseY = yByDepth.get(maxKnownDepth + 1) ?? yCursor;
  for (const node of unresolved) {
    if (positions.has(node.id)) continue;
    positions.set(node.id, { x: looseX, y: looseY });
    looseX += NODE_WIDTH + H_GAP;
  }

  return nodes.map((node) => {
    const position = positions.get(node.id);
    return position ? { ...node, positionX: position.x, positionY: position.y } : node;
  });
}

function ChartInner(props: Props) {
  const { fitView, setCenter } = useReactFlow();
  const [mode, setMode] = useState<Mode>(props.initialMode === "edit" ? "edit" : "view");
  const [sourceNodes, setSourceNodes] = useState(props.initialNodes);
  const [sourceEdges, setSourceEdges] = useState(props.initialEdges);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(() => {
    const hierarchyTargets = new Set(
      props.initialEdges
        .filter((edge) => edge.type === "JERARQUICA")
        .map((edge) => edge.targetId),
    );
    return props.initialNodes.find((node) => !hierarchyTargets.has(node.id))?.id
      ?? props.initialNodes[0]?.id
      ?? null;
  });
  const [relationFocusId, setRelationFocusId] = useState<string | null>(null);
  const [relationView, setRelationView] = useState<PucaraRelationView>("all");
  // Los vínculos transversales se entienden primero por el brillo de las cards.
  // Las flechas quedan apagadas por defecto y se pueden prender solo cuando haga falta.
  const [showRelationArrows, setShowRelationArrows] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [peoplePanelNodeId, setPeoplePanelNodeId] = useState<string | null>(null);
  const [editorSection, setEditorSection] = useState<EditorSection>("function");
  const [editingMemberId, setEditingMemberId] = useState<string | "new" | null>(null);
  const [history, setHistory] = useState<ViewSnapshot[]>([]);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [showCreateChart, setShowCreateChart] = useState(false);
  const [showCreateNode, setShowCreateNode] = useState(false);
  const [createNodeParentId, setCreateNodeParentId] = useState<string | null>(null);
  const [directoryPeople, setDirectoryPeople] = useState<Person[]>(props.existingPeople);
  const [showQualityPanel, setShowQualityPanel] = useState(false);
  const pendingFitNodeRef = useRef<string | null>(null);
  const pendingNavigationFocusRef = useRef<string | null>(null);
  const pendingRelationFitRef = useRef<string | null>(null);
  const isBuenAyre = isBuenAyreSchoolSlug(props.schoolSlug);

  const hierarchyEdges = useMemo(
    () => sourceEdges.filter((edge) => edge.type === "JERARQUICA"),
    [sourceEdges],
  );
  const relationEdges = useMemo(
    () => sourceEdges.filter((edge) => edge.type !== "JERARQUICA"),
    [sourceEdges],
  );
  const { depth, roots } = useMemo(
    () => buildDepthMap(sourceNodes, hierarchyEdges),
    [sourceNodes, hierarchyEdges],
  );

  const allFocusedRelations = useMemo(
    () => relationFocusId
      ? relationEdges.filter(
          (edge) =>
            pucaraRelationMatchesView(edge, "all") &&
            (edge.sourceId === relationFocusId || edge.targetId === relationFocusId),
        )
      : [],
    [relationFocusId, relationEdges],
  );

  const focusedRelationCounts = useMemo(
    () => countPucaraRelationsByView(allFocusedRelations),
    [allFocusedRelations],
  );

  const focusedRelations = useMemo(
    () => allFocusedRelations.filter((edge) => pucaraRelationMatchesView(edge, relationView)),
    [allFocusedRelations, relationView],
  );

  const visibleIds = useMemo(() => {
    if (mode === "edit") return new Set(sourceNodes.map((node) => node.id));
    const visible = new Set(roots);
    let changed = true;
    while (changed) {
      changed = false;
      hierarchyEdges.forEach((edge) => {
        if (visible.has(edge.sourceId) && expanded.has(edge.sourceId) && !visible.has(edge.targetId)) {
          visible.add(edge.targetId);
          changed = true;
        }
      });
    }

    // Integra / Colabora agregan solo las cajas directamente relacionadas.
    // El filtro permite ver Todas, solo Integra o solo Colabora sin abrir
    // áreas completas ni alterar la jerarquía normal.
    if (relationFocusId) {
      focusedRelations.forEach((edge) => {
        if (edge.sourceId === relationFocusId) visible.add(edge.targetId);
        if (edge.targetId === relationFocusId) visible.add(edge.sourceId);
      });
    }
    return visible;
  }, [mode, sourceNodes, hierarchyEdges, roots, expanded, relationFocusId, focusedRelations]);

  const relationHighlightByNode = useMemo(() => {
    const map = new Map<string, RelationHighlight>();
    if (!relationFocusId) return map;
    const add = (nodeId: string, type: string) => {
      const next: RelationHighlight = type === "DECISION" ? "integration" : "collaboration";
      const current = map.get(nodeId) ?? null;
      map.set(nodeId, current && current !== next ? "both" : next);
    };
    focusedRelations.forEach((edge) => {
      if (edge.sourceId === relationFocusId) add(edge.targetId, edge.type);
      if (edge.targetId === relationFocusId) add(edge.sourceId, edge.type);
    });
    return map;
  }, [relationFocusId, focusedRelations]);

  // La vista usa exactamente las posiciones guardadas. Mover una caja en
  // Editar cambia de verdad la vista del colegio.
  const displayNodes = sourceNodes;

  const pushHistory = useCallback(() => {
    if (mode !== "view") return;
    setHistory((current) => [
      ...current.slice(-24),
      { expanded: Array.from(expanded), focusedId },
    ]);
  }, [mode, expanded, focusedId]);

  const openPeople = useCallback((nodeId: string) => setPeoplePanelNodeId(nodeId), []);

  const toggleRelationArrows = useCallback(() => {
    setShowRelationArrows((current) => {
      const next = !current;
      if (next && relationFocusId) pendingRelationFitRef.current = relationFocusId;
      return next;
    });
  }, [relationFocusId]);

  const focusPersonInChart = useCallback((fromNodeId: string, personId: string) => {
    const principalTarget = sourceNodes.find(
      (node) => node.id !== fromNodeId && node.person?.id === personId,
    );
    const memberTarget = sourceNodes.find(
      (node) =>
        node.id !== fromNodeId &&
        node.members.some((member) => member.person.id === personId),
    );
    const target = principalTarget ?? memberTarget ?? null;

    if (!target) {
      setMessage({
        type: "ok",
        text: "Esta persona todavía no tiene otra función cargada en el organigrama.",
      });
      return;
    }

    if (mode === "view") pushHistory();

    const parentByChild = new Map(
      hierarchyEdges.map((edge) => [edge.targetId, edge.sourceId]),
    );
    const ancestors: string[] = [];
    let currentId: string | undefined = target.id;
    const seen = new Set<string>();
    while (currentId && !seen.has(currentId)) {
      seen.add(currentId);
      const parentId = parentByChild.get(currentId);
      if (!parentId) break;
      ancestors.push(parentId);
      currentId = parentId;
    }

    setExpanded((current) => {
      const next = new Set(current);
      ancestors.forEach((id) => next.add(id));
      return next;
    });
    setPeoplePanelNodeId(null);
    setFocusedId(target.id);
    setRelationFocusId(target.id);
    if (mode === "edit") setSelectedId(target.id);
    pendingNavigationFocusRef.current = target.id;
  }, [sourceNodes, hierarchyEdges, mode, pushHistory]);

  const toggleNode = useCallback(
    (nodeId: string) => {
      pushHistory();
      pendingFitNodeRef.current = nodeId;
      setExpanded((current) => {
        const next = new Set(current);
        if (next.has(nodeId)) {
          next.delete(nodeId);
          collectDescendants(nodeId, hierarchyEdges).forEach((id) => next.delete(id));
        } else {
          next.add(nodeId);
        }
        return next;
      });
      setFocusedId(nodeId);
      setRelationFocusId(nodeId);
    },
    [pushHistory, hierarchyEdges],
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
          schoolSlug: props.schoolSlug,
          schoolName: props.schoolName,
          schoolLogoUrl: props.schoolLogoUrl,
          color: node.color || fallbackColors[Math.min(depth.get(node.id) || 0, fallbackColors.length - 1)],
          isFocused: focusedId === node.id,
          relationHighlight: relationHighlightByNode.get(node.id) ?? null,
          isExpanded: expanded.has(node.id),
          hasChildren: hierarchyEdges.some((edge) => edge.sourceId === node.id),
          cardHeight: cardHeightFor(node),
          onToggle: toggleNode,
          onOpenPeople: openPeople,
          onFocusPerson: focusPersonInChart,
        },
      })),
    [displayNodes, visibleIds, mode, props.schoolSlug, props.schoolName, props.schoolLogoUrl, depth, focusedId, expanded, hierarchyEdges, relationHighlightByNode, toggleNode, openPeople, focusPersonInChart],
  );

  const flowEdges = useMemo<Edge[]>(
    () => {
      const positionById = new Map(sourceNodes.map((node) => [node.id, node]));
      return sourceEdges.map((edge) => {
        const hierarchy = edge.type === "JERARQUICA";
        const directRelation =
          !hierarchy &&
          pucaraRelationMatchesView(edge, relationView) &&
          !!relationFocusId &&
          (edge.sourceId === relationFocusId || edge.targetId === relationFocusId);
        const integration = edge.type === "DECISION";
        const relationColor = integration ? "#dc2626" : "#2563eb";
        const hierarchyActive = hierarchy && !!selectedId && (edge.sourceId === selectedId || edge.targetId === selectedId);
        const hierarchyColor = hierarchyActive ? "#2563eb" : "#334155";
        const sourceNode = positionById.get(edge.sourceId);
        const targetNode = positionById.get(edge.targetId);
        const targetIsRight = sourceNode && targetNode ? targetNode.positionX >= sourceNode.positionX : true;

        return {
          id: edge.id,
          source: edge.sourceId,
          target: edge.targetId,
          sourceHandle: hierarchy ? "hierarchy-source" : targetIsRight ? "relation-source-right" : "relation-source-left",
          targetHandle: hierarchy ? "hierarchy-target" : targetIsRight ? "relation-target-left" : "relation-target-right",
          type: hierarchy ? "smoothstep" : "default",
          hidden: hierarchy
            ? mode === "view"
              ? !visibleIds.has(edge.sourceId) || !visibleIds.has(edge.targetId)
              : false
            // Integra / Colabora aparecen SOLO cuando una de las dos cajas está
            // seleccionada. Así mantenemos el organigrama limpio, pero el vínculo
            // se ve de verdad además del brillo de la caja relacionada.
            : !showRelationArrows || !directRelation || !visibleIds.has(edge.sourceId) || !visibleIds.has(edge.targetId),
          interactionWidth: hierarchy ? 28 : 24,
          animated: false,
          // La jerarquía tiene prioridad visual. Integra/Colabora son secundarios.
          zIndex: hierarchy ? (mode === "edit" ? 30 : 12) : 5,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: hierarchy ? hierarchyColor : relationColor,
            width: hierarchy ? 22 : 14,
            height: hierarchy ? 22 : 14,
          },
          label: !hierarchy && directRelation ? (integration ? "INTEGRA" : "COLABORA") : undefined,
          labelStyle: !hierarchy ? { fill: relationColor, fontWeight: 900, fontSize: 11 } : undefined,
          labelBgStyle: !hierarchy ? { fill: "#ffffff", fillOpacity: 0.98, stroke: relationColor, strokeWidth: 1 } : undefined,
          labelBgPadding: !hierarchy ? [8, 5] : undefined,
          labelBgBorderRadius: !hierarchy ? 999 : undefined,
          style: hierarchy
            ? { stroke: hierarchyColor, strokeWidth: hierarchyActive ? 4.4 : mode === "edit" ? 3.6 : 3.1, opacity: 1 }
            : { stroke: relationColor, strokeWidth: 2.1, opacity: 0.58, strokeDasharray: integration ? "5 8" : "3 8" },
        };
      });
    },
    [sourceEdges, sourceNodes, visibleIds, mode, relationFocusId, relationView, selectedId, showRelationArrows],
  );

  const hierarchyFlowEdges = useMemo(
    () => flowEdges.filter((flowEdge) => hierarchyEdges.some((edge) => edge.id === flowEdge.id)),
    [flowEdges, hierarchyEdges],
  );

  useEffect(() => {
    if (mode !== "view" || !showRelationArrows) return;
    const sourceId = pendingRelationFitRef.current;
    if (!sourceId || relationFocusId !== sourceId) return;

    const relationIds = new Set<string>([sourceId]);
    focusedRelations.forEach((edge) => {
      if (edge.sourceId === sourceId) relationIds.add(edge.targetId);
      if (edge.targetId === sourceId) relationIds.add(edge.sourceId);
    });
    const relatedNodes = flowNodes.filter((node) => !node.hidden && relationIds.has(node.id));
    if (relatedNodes.length <= 1) {
      pendingRelationFitRef.current = null;
      return;
    }

    pendingRelationFitRef.current = null;
    const timer = window.setTimeout(() => {
      void fitView({
        nodes: relatedNodes,
        padding: 0.28,
        duration: 520,
        maxZoom: 1.04,
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [mode, showRelationArrows, relationFocusId, focusedRelations, flowNodes, fitView]);

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
      ...hierarchyEdges.filter((edge) => edge.sourceId === nodeId).map((edge) => edge.targetId),
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
  }, [mode, flowNodes, hierarchyEdges, fitView, setCenter]);

  const focusNode = useCallback(
    (id: string, record = true) => {
      const node = flowNodes.find((item) => item.id === id);
      if (!node) return;
      if (record) pushHistory();
      setFocusedId(id);
      setRelationFocusId(id);
      if (mode === "view" && showRelationArrows && relationEdges.some((edge) => edge.sourceId === id || edge.targetId === id)) {
        pendingRelationFitRef.current = id;
      }
      if (mode === "edit") setSelectedId(id);
      setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + cardHeightFor(node.data) / 2, {
        zoom: mode === "edit" ? 0.92 : 1.08,
        duration: 500,
      });
    },
    [flowNodes, mode, pushHistory, relationEdges, setCenter, showRelationArrows],
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
      const previous = sourceNodes.find((node) => node.id === nodeId);
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
          if (previous) {
            setSourceNodes((current) =>
              current.map((node) =>
                node.id === nodeId
                  ? { ...node, positionX: previous.positionX, positionY: previous.positionY }
                  : node,
              ),
            );
          }
          setMessage({
            type: "error",
            text: error instanceof Error
              ? `${error.message} La caja volvió a su posición anterior.`
              : "No se pudo guardar la nueva posición. La caja volvió a su posición anterior.",
          });
        }
      });
    },
    [mode, props.schoolSlug, sourceNodes],
  );

  const currentNode = sourceNodes.find((node) => node.id === selectedId) ?? null;
  const peoplePanelNode = sourceNodes.find((node) => node.id === peoplePanelNodeId) ?? null;
  const hierarchyTargets = new Set(hierarchyEdges.map((edge) => edge.targetId));
  const preferredRootId = roots[0] ?? null;
  const currentIsRoot = Boolean(currentNode && currentNode.id === preferredRootId);
  const missingDependencyCount = sourceNodes.filter(
    (node) => node.id !== preferredRootId && !hierarchyTargets.has(node.id),
  ).length;
  const unassignedFunctionCount = sourceNodes.filter(
    (node) => !node.person && (node.members?.length ?? 0) === 0,
  ).length;
  const peopleWithoutPhotoCount = sourceNodes.reduce((total, node) => {
    const people = peopleForNode(node);
    return total + people.filter((person) => !person.photoUrl?.trim()).length;
  }, 0);
  const qualityReady = missingDependencyCount === 0 && unassignedFunctionCount === 0;
  const currentRelations = currentNode
    ? relationEdges.filter((edge) => edge.sourceId === currentNode.id || edge.targetId === currentNode.id)
    : [];
  const currentParentId = currentNode
    ? hierarchyEdges.find((edge) => edge.targetId === currentNode.id)?.sourceId ?? ""
    : "";
  const blockedParentIds = currentNode
    ? new Set([currentNode.id, ...collectDescendants(currentNode.id, hierarchyEdges)])
    : new Set<string>();
  const parentCandidates = currentNode
    ? sourceNodes.filter((node) => !blockedParentIds.has(node.id))
    : [];
  const focusedFlowNode = flowNodes.find((node) => node.id === focusedId);

  const navigation = useMemo(() => {
    if (!focusedFlowNode) return { parent: null, children: [], siblings: [], index: -1 };
    const parent = getIncomers(focusedFlowNode, flowNodes, hierarchyFlowEdges)[0] ?? null;
    const byVisualOrder = (a: Node<CardData>, b: Node<CardData>) =>
      a.position.x - b.position.x || a.position.y - b.position.y || String(a.data.title).localeCompare(String(b.data.title), "es");
    const children = getOutgoers(focusedFlowNode, flowNodes, hierarchyFlowEdges).slice().sort(byVisualOrder);
    const siblings = parent
      ? getOutgoers(parent, flowNodes, hierarchyFlowEdges).slice().sort(byVisualOrder)
      : [];
    return { parent, children, siblings, index: siblings.findIndex((node) => node.id === focusedFlowNode.id) };
  }, [focusedFlowNode, flowNodes, hierarchyFlowEdges]);

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
        const cameFromDirectChild = hierarchyEdges.some(
          (edge) => edge.sourceId === previous.focusedId && edge.targetId === focusedId,
        );

        if (cameFromDirectChild) {
          nextExpanded.delete(previous.focusedId);
          collectDescendants(previous.focusedId, hierarchyEdges).forEach((id) =>
            nextExpanded.delete(id),
          );
        }
      }

      setExpanded(nextExpanded);
      setFocusedId(previous.focusedId);
      setRelationFocusId(null);
      if (previous.focusedId) pendingFitNodeRef.current = previous.focusedId;
      return current.slice(0, -1);
    });
  }, [focusedId, hierarchyEdges]);

  const showAll = useCallback(() => {
    pushHistory();
    setExpanded(new Set(sourceNodes.map((node) => node.id)));
    setFocusedId(roots[0] || null);
    setRelationFocusId(null);
    window.setTimeout(() => fitView({ duration: 600, padding: 0.08, maxZoom: 0.85 }), 60);
  }, [pushHistory, sourceNodes, roots, fitView]);

  const restartView = useCallback(() => {
    setHistory([]);
    setExpanded(new Set());
    setFocusedId(roots[0] || null);
    setRelationFocusId(null);
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
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (nextMode === "edit") url.searchParams.set("modo", "editar");
      else url.searchParams.delete("modo");
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }
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
      setRelationFocusId(null);
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
        starter: String(formData.get("starter") ?? "basic") === "single"
          ? "single"
          : String(formData.get("starter") ?? "basic") === "core"
            ? "core"
            : "basic",
      });
      window.location.href = `/organigramas/${props.schoolSlug}?organigrama=${result.chartId}&modo=editar`;
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
    const previousNodes = sourceNodes;
    const allIds = new Set(sourceNodes.map((node) => node.id));
    const ordered = isBuenAyre
      ? autoLayoutBuenAyre(sourceNodes, hierarchyEdges)
      : autoLayout(sourceNodes, hierarchyEdges, allIds, depth);
    setSourceNodes(ordered);
    window.setTimeout(() => fitView({ duration: 560, padding: 0.12, maxZoom: 0.78 }), 70);
    runAction(async () => {
      try {
        await savePucaraPositionsAction({
          schoolSlug: props.schoolSlug,
          positions: ordered.map((node) => ({
            nodeId: node.id,
            positionX: node.positionX,
            positionY: node.positionY,
          })),
        });
        setMessage({ type: "ok", text: "Organigrama ordenado y guardado." });
      } catch (error) {
        setSourceNodes(previousNodes);
        window.setTimeout(() => fitView({ duration: 420, padding: 0.12, maxZoom: 0.78 }), 60);
        throw error;
      }
    });
  };

  const importHito = () => {
    if (props.schoolSlug !== "pucara") return;
    if (!window.confirm("Se va a crear/actualizar un organigrama separado con toda la estructura y personas del Pucará original. El organigrama actual no se borra. ¿Continuar?")) return;
    runAction(async () => {
      const result = await importPucaraHitoAction({ schoolSlug: props.schoolSlug });
      window.location.href = `/organigramas/${props.schoolSlug}?organigrama=${result.chartId}&modo=editar`;
    });
  };

  const saveNode = (formData: FormData) => {
    if (!currentNode) return;
    const requestedParentIdBeforeSave = String(formData.get("parentNodeId") ?? "");
    if (!currentIsRoot && !requestedParentIdBeforeSave) {
      setMessage({ type: "error", text: "Toda caja debe depender de una caja superior. Elegí ‘Depende de’ antes de guardar." });
      return;
    }
    runAction(async () => {
      const updated = await updatePucaraNodeAction({
        schoolSlug: props.schoolSlug,
        nodeId: currentNode.id,
        title: String(formData.get("title") ?? ""),
        area: String(formData.get("area") ?? currentNode.area),
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

      const requestedParentId = requestedParentIdBeforeSave;
      if (requestedParentId !== currentParentId) {
        const reparented = await reparentPucaraNodeAction({
          schoolSlug: props.schoolSlug,
          orgChartId: props.orgChartId,
          nodeId: currentNode.id,
          parentNodeId: requestedParentId || null,
        });
        setSourceEdges((current) => {
          const rest = current.filter((edge) => !(edge.type === "JERARQUICA" && edge.targetId === currentNode.id));
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

  const openCreateNode = (parentId?: string | null) => {
    setCreateNodeParentId(parentId || currentNode?.id || roots[0] || null);
    setShowCreateNode(true);
  };

  const createNodeFromModal = (formData: FormData) => {
    const parentNodeId = String(formData.get("newNodeParentId") ?? createNodeParentId ?? "");
    if (!parentNodeId) {
      setMessage({ type: "error", text: "Elegí de qué caja depende la nueva función." });
      return;
    }
    runAction(async () => {
      const presetKey = String(formData.get("presetKey") ?? "custom");
      const created = await createPucaraChildAction({
        schoolSlug: props.schoolSlug,
        orgChartId: props.orgChartId,
        parentNodeId,
        presetKey: presetKey === "custom" ? null : presetKey,
        title: String(formData.get("newNodeTitle") ?? ""),
        area: String(formData.get("newNodeArea") ?? ""),
        formalRole: String(formData.get("newNodeFormalRole") ?? ""),
        realFunction: String(formData.get("newNodeRealFunction") ?? ""),
        description: String(formData.get("newNodeDescription") ?? ""),
      });
      setSourceNodes((current) => [...current, created.node]);
      setSourceEdges((current) => [...current, {
        id: created.edge.id,
        sourceId: created.edge.sourceId,
        targetId: created.edge.targetId,
        type: created.edge.type,
        label: created.edge.label,
      }]);
      setShowCreateNode(false);
      setSelectedId(created.node.id);
      setFocusedId(created.node.id);
      setRelationFocusId(null);
      setEditorSection("function");
      window.setTimeout(() => {
        setCenter(created.node.positionX + NODE_WIDTH / 2, created.node.positionY + cardHeightFor(created.node) / 2, { zoom: 0.95, duration: 420 });
      }, 60);
      setMessage({ type: "ok", text: "Nueva caja creada y conectada. Ahora podés completar persona, foto y equipo." });
    });
  };

  const completeMissingDependencies = () => {
    runAction(async () => {
      const result = await normalizePucaraHierarchyAction({
        schoolSlug: props.schoolSlug,
        orgChartId: props.orgChartId,
      });

      const rebuiltHierarchy = (result.hierarchyEdges ?? []).map((edge: SourceEdge) => ({
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        type: edge.type,
        label: edge.label,
      }));
      const transversal = sourceEdges.filter((edge) => edge.type !== "JERARQUICA");
      const nextEdges = [...rebuiltHierarchy, ...transversal];
      const createdTeams = ("createdTeamNodes" in result ? result.createdTeamNodes : []) as SourceNode[];
      const nextNodes = [
        ...sourceNodes,
        ...createdTeams.filter((team) => !sourceNodes.some((node) => node.id === team.id)),
      ];
      const nextHierarchyInfo = buildDepthMap(nextNodes, rebuiltHierarchy);
      const nextDepth = nextHierarchyInfo.depth;
      const nextRootId = nextHierarchyInfo.roots[0] ?? nextNodes[0]?.id ?? null;
      const allIds = new Set(nextNodes.map((node) => node.id));
      const ordered = isBuenAyre
        ? autoLayoutBuenAyre(nextNodes, rebuiltHierarchy)
        : autoLayout(nextNodes, rebuiltHierarchy, allIds, nextDepth);

      await savePucaraPositionsAction({
        schoolSlug: props.schoolSlug,
        positions: ordered.map((node) => ({
          nodeId: node.id,
          positionX: node.positionX,
          positionY: node.positionY,
        })),
      });

      setSourceEdges(nextEdges);
      setSourceNodes(ordered);
      setExpanded(allIds);
      setRelationFocusId(null);
      setSelectedId(nextRootId);
      setFocusedId(nextRootId);
      window.setTimeout(() => fitView({ duration: 650, padding: 0.1, maxZoom: 0.8 }), 80);
      setMessage({
        type: "ok",
        text: result.rebuilt
          ? createdTeams.length > 0
            ? `Buen Ayre quedó reacomodado y se recuperaron ${createdTeams.length} ${createdTeams.length === 1 ? "Equipo Directivo" : "Equipos Directivos"} que faltaban. Integra y Colabora se conservaron.`
            : "Buen Ayre quedó pasado a una jerarquía simple. Integra y Colabora se conservaron como vínculos adicionales."
          : result.created > 0
            ? `Se completaron ${result.created} dependencias y el organigrama quedó ordenado.`
            : "La jerarquía ya estaba completa; igual se volvió a ordenar el organigrama.",
      });
    });
  };

  const addRelation = (formData: FormData) => {
    if (!currentNode) return;
    const targetNodeId = String(formData.get("relationTargetId") ?? "");
    const type = String(formData.get("relationType") ?? "COLABORACION") === "DECISION" ? "DECISION" : "COLABORACION";
    if (!targetNodeId) return;
    runAction(async () => {
      const edge = await createPucaraRelationAction({
        schoolSlug: props.schoolSlug,
        orgChartId: props.orgChartId,
        sourceNodeId: currentNode.id,
        targetNodeId,
        type,
      });
      setSourceEdges((current) => current.some((item) => item.id === edge.id)
        ? current
        : [...current, { id: edge.id, sourceId: edge.sourceId, targetId: edge.targetId, type: edge.type, label: edge.label }]);
      setFocusedId(currentNode.id);
      setRelationFocusId(currentNode.id);
      setRelationView(type === "DECISION" ? "integration" : "collaboration");
      setMessage({ type: "ok", text: type === "DECISION" ? "Vínculo Integra guardado." : "Vínculo Colabora guardado." });
    });
  };

  const changeRelationType = (edge: SourceEdge) => {
    const nextType = edge.type === "DECISION" ? "COLABORACION" : "DECISION";
    runAction(async () => {
      const updated = await updatePucaraRelationAction({
        schoolSlug: props.schoolSlug,
        edgeId: edge.id,
        type: nextType,
      });
      setSourceEdges((current) =>
        current.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                type: updated.type,
                label: updated.label,
              }
            : item,
        ),
      );
      setRelationFocusId(currentNode?.id ?? relationFocusId);
      setRelationView(nextType === "DECISION" ? "integration" : "collaboration");
      setMessage({
        type: "ok",
        text: nextType === "DECISION" ? "El vínculo ahora es Integra." : "El vínculo ahora es Colabora.",
      });
    });
  };

  const removeRelation = (edgeId: string) => {
    runAction(async () => {
      await deletePucaraRelationAction({ schoolSlug: props.schoolSlug, edgeId });
      setSourceEdges((current) => current.filter((edge) => edge.id !== edgeId));
      setMessage({ type: "ok", text: "Vínculo eliminado." });
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
  const currentChartMeta = props.availableCharts?.find((chart) => chart.id === props.orgChartId) ?? null;

  return (
    <main className="min-h-screen bg-[#eef2f7] p-2 md:p-5">
      <section className="mx-auto max-w-[1920px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div className="flex items-center gap-4">
              <SchoolLogo schoolSlug={props.schoolSlug} schoolName={props.schoolName} schoolLogoUrl={props.schoolLogoUrl} className="h-14 w-14" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Organigrama institucional</p>
                <h1 className="text-2xl font-black text-slate-950">{props.schoolName}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-500">{props.orgChartTitle}</p>
                  {currentChartMeta ? (
                    <>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-600">{currentChartMeta.year}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-600">v{currentChartMeta.version ?? 1}</span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-blue-700">{currentChartMeta.status || "DRAFT"}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/organigramas" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                <ArrowLeft className="h-4 w-4" /> Organigramas
              </Link>
              {props.availableCharts && props.availableCharts.length > 1 ? (
                <select
                  value={props.orgChartId}
                  onChange={(event) => { window.location.href = `/organigramas/${props.schoolSlug}?organigrama=${event.target.value}`; }}
                  className="max-w-[300px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-black text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  aria-label="Cambiar organigrama"
                >
                  {props.availableCharts.map((chart) => (
                    <option key={chart.id} value={chart.id}>{chart.title} · {chart.year}</option>
                  ))}
                </select>
              ) : null}
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
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 md:px-6">
              <button type="button" onClick={() => openCreateNode(selectedId || roots[0] || null)} disabled={!props.orgChartId || sourceNodes.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40">
                <Plus className="h-4 w-4" /> Nueva caja
              </button>
              <button type="button" onClick={autoOrderEditor} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700">
                <LayoutGrid className="h-4 w-4" /> Auto ordenar
              </button>
              <button type="button" onClick={savePositions} disabled={isPending} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar diseño
              </button>
              <button
                type="button"
                onClick={() => setShowQualityPanel((current) => !current)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black transition ${
                  qualityReady
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                <Check className="h-4 w-4" /> Control
              </button>
              {isBuenAyre ? (
                <button type="button" onClick={completeMissingDependencies} disabled={isPending} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60">
                  <LayoutGrid className="h-4 w-4" /> Reacomodar Buen Ayre
                </button>
              ) : missingDependencyCount > 0 ? (
                <button type="button" onClick={completeMissingDependencies} disabled={isPending} className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-800 transition hover:bg-amber-100 disabled:opacity-60">
                  <Link2 className="h-4 w-4" /> Completar dependencias ({missingDependencyCount})
                </button>
              ) : null}
              {props.schoolSlug === "pucara" ? (
                <details className="relative">
                  <summary className="cursor-pointer list-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50">Herramientas Pucará</summary>
                  <div className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
                    <button type="button" onClick={importHito} disabled={isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C3A62] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#152f50] disabled:opacity-60">
                      <UsersRound className="h-4 w-4" /> Importar estructura completa
                    </button>
                  </div>
                </details>
              ) : null}
              <p className="text-xs font-semibold text-slate-500">Nueva caja permite elegir áreas y funciones prearmadas. Al mover una tarjeta, su posición queda guardada.</p>
            </div>
            {showQualityPanel ? (
              <div className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <QualityMetric label="Cajas" value={sourceNodes.length} ok={sourceNodes.length > 0} />
                  <QualityMetric label="Sin superior" value={missingDependencyCount} ok={missingDependencyCount === 0} />
                  <QualityMetric label="Sin persona/equipo" value={unassignedFunctionCount} ok={unassignedFunctionCount === 0} />
                  <QualityMetric label="Personas sin foto" value={peopleWithoutPhotoCount} ok={peopleWithoutPhotoCount === 0} warningOnly />
                  <QualityMetric label="Integra / Colabora" value={relationEdges.length} ok />
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-500">
                  Este control no bloquea la edición. Sirve para saber qué falta antes de dar el organigrama por listo. Fotos y vínculos son opcionales; una dependencia clara y una persona/equipo por función son lo prioritario.
                </p>
              </div>
            ) : null}
            {isBuenAyre ? (
              <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 md:px-6">
                Buen Ayre conserva todas sus cajas, personas, fotos e Integra/Colabora. “Reacomodar Buen Ayre” reconstruye la dependencia directa y vuelve a agrupar las cinco áreas como en la vista institucional anterior.
              </div>
            ) : missingDependencyCount > 0 ? (
              <div className="border-b border-amber-100 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 md:px-6">
                Hay {missingDependencyCount} {missingDependencyCount === 1 ? "caja" : "cajas"} sin superior jerárquico. “Completar dependencias” las integra a la estructura sin borrar sus vínculos Integra o Colabora.
              </div>
            ) : null}
          </>
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
                    Creá una base simple o una base por niveles. Después armás el resto con “Nueva caja” o desde una caja seleccionada.
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
                // Tocar una caja solo la enfoca y muestra sus vínculos directos.
                // La ficha se abre únicamente desde el botón de información.
                focusNode(node.id);
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
                <SchoolLogo schoolSlug={props.schoolSlug} schoolName={props.schoolName} schoolLogoUrl={props.schoolLogoUrl} className="h-[68px] w-[68px] !border-0 !shadow-none" />
              </div>
            </ReactFlow>

            {relationFocusId && allFocusedRelations.length > 0 ? (
              <div className="absolute left-1/2 top-5 z-30 flex max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur">
                <div className="hidden px-2 text-xs font-black text-slate-500 lg:block">
                  Vínculos visibles: <span className="text-slate-950">{focusedRelations.length}</span> de {allFocusedRelations.length}
                </div>
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <RelationViewButton
                    label={`Todas ${focusedRelationCounts.all}`}
                    active={relationView === "all"}
                    onClick={() => setRelationView("all")}
                  />
                  <RelationViewButton
                    label={`Integra ${focusedRelationCounts.integration}`}
                    active={relationView === "integration"}
                    tone="integration"
                    onClick={() => setRelationView("integration")}
                  />
                  <RelationViewButton
                    label={`Colabora ${focusedRelationCounts.collaboration}`}
                    active={relationView === "collaboration"}
                    tone="collaboration"
                    onClick={() => setRelationView("collaboration")}
                  />
                </div>
                <button
                  type="button"
                  onClick={toggleRelationArrows}
                  disabled={focusedRelations.length === 0}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    showRelationArrows
                      ? "bg-slate-900 text-white shadow-sm hover:bg-slate-800"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
                  }`}
                  title={showRelationArrows ? "Ocultar flechas de Integra y Colabora" : "Mostrar flechas de Integra y Colabora"}
                >
                  <Link2 className="h-4 w-4" />
                  {showRelationArrows ? "Ocultar flechas" : "Ver flechas"}
                </button>
              </div>
            ) : null}

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

                {focusedRelations.length ? (
                  <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-[11px] font-black shadow-xl backdrop-blur">
                    <span className="inline-flex items-center gap-1.5 text-red-700"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Integra</span>
                    <span className="inline-flex items-center gap-1.5 text-blue-700"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Colabora</span>
                  </div>
                ) : null}
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
                      <button type="button" onClick={() => openCreateNode(currentNode.id)} disabled={isPending} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-800 disabled:opacity-60">
                        <Plus className="h-4 w-4" /> Agregar debajo
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-3 rounded-xl bg-slate-100 p-1">
                      <button type="button" onClick={() => setEditorSection("function")} className={`rounded-lg px-2 py-2 text-sm font-black transition ${editorSection === "function" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Función</button>
                      <button type="button" onClick={() => setEditorSection("team")} className={`rounded-lg px-2 py-2 text-sm font-black transition ${editorSection === "team" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Equipo ({currentNode.members.length})</button>
                      <button type="button" onClick={() => setEditorSection("relations")} className={`rounded-lg px-2 py-2 text-sm font-black transition ${editorSection === "relations" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Vínculos ({currentRelations.length})</button>
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
                          required={!currentIsRoot}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        >
                          {currentIsRoot ? (
                            <option value="">Sin superior · caja raíz</option>
                          ) : (
                            <option value="" disabled>Elegir caja superior</option>
                          )}
                          {parentCandidates.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.title}
                            </option>
                          ))}
                        </select>
                        <span className="mt-1.5 block text-xs font-semibold text-slate-400">Toda caja, salvo la raíz, debe tener un superior. Cambiar este campo mueve la dependencia jerárquica y su línea.</span>
                      </label>

                      <Field label="Título de la caja" name="title" defaultValue={currentNode.title} />
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.11em] text-slate-500">Área</span>
                        <select name="area" defaultValue={currentNode.area} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
                          <option value="DIRECCION">Dirección</option>
                          <option value="ACADEMICA">Académica</option>
                          <option value="FORMACION">Formación</option>
                          <option value="FAMILIA">Familias</option>
                          <option value="COMUNICACION">Comunicación</option>
                          <option value="POSTULACIONES">Postulaciones</option>
                          <option value="ADMINISTRACION">Administración</option>
                          <option value="OPERACIONES">Operaciones</option>
                          <option value="TUTORIA">Tutorías</option>
                          <option value="CAPELLANIA">Capellanía</option>
                          <option value="OTRO">Otro</option>
                        </select>
                      </label>
                      <Field label="Cargo formal" name="formalRole" defaultValue={currentNode.formalRole || ""} />
                      <Field label="Función real" name="realFunction" defaultValue={currentNode.realFunction || ""} />
                      <TextArea label="Descripción" name="description" defaultValue={currentNode.description || ""} />
                      <Field label="Horas semanales" name="weeklyHours" type="number" defaultValue={currentNode.weeklyHours?.toString() || ""} />
                      <ExistingPersonSelect
                        label="Responsable"
                        name="personId"
                        people={directoryPeople}
                        defaultValue={currentNode.person?.id || "__new__"}
                        fieldNames={{
                          firstName: "firstName",
                          lastName: "lastName",
                          email: "email",
                          photoUrl: "photoUrl",
                        }}
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

                      <button type="button" onClick={deleteNode} disabled={isPending || hierarchyEdges.some((edge) => edge.sourceId === currentNode.id)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45">
                        <Trash2 className="h-4 w-4" /> Eliminar esta caja
                      </button>
                      {hierarchyEdges.some((edge) => edge.sourceId === currentNode.id) ? <p className="text-center text-xs font-semibold text-slate-400">No se puede eliminar mientras tenga dependencias inferiores.</p> : null}
                    </form>
                  ) : editorSection === "team" ? (
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
                            fieldNames={{
                              firstName: "memberFirstName",
                              lastName: "memberLastName",
                              email: "memberEmail",
                              photoUrl: "memberPhotoUrl",
                            }}
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
                  ) : (
                    <div className="space-y-5 p-5">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start gap-3">
                          <Link2 className="mt-0.5 h-5 w-5 text-blue-700" />
                          <div>
                            <p className="text-sm font-black text-slate-950">Integra y Colabora</p>
                            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                              La jerarquía queda siempre limpia. Al tocar una caja, solo sus vínculos directos se resaltan: Integra en rojo suave y Colabora en azul. No se dibuja una telaraña permanente.
                            </p>
                          </div>
                        </div>
                      </div>

                      <form action={addRelation} className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Agregar vínculo</p>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.11em] text-slate-500">Tipo</span>
                          <select name="relationType" defaultValue="COLABORACION" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
                            <option value="COLABORACION">Colabora · azul</option>
                            <option value="DECISION">Integra · rojo</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.11em] text-slate-500">Con qué caja</span>
                          <select name="relationTargetId" defaultValue="" required className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
                            <option value="" disabled>Elegir función</option>
                            {sourceNodes.filter((node) => node.id !== currentNode.id).map((node) => (
                              <option key={node.id} value={node.id}>{node.title}</option>
                            ))}
                          </select>
                        </label>
                        <button type="submit" disabled={isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:opacity-60">
                          <Plus className="h-4 w-4" /> Guardar vínculo
                        </button>
                      </form>

                      <div className="space-y-2">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Vínculos de esta caja</p>
                        {currentRelations.length ? currentRelations.map((edge) => {
                          const otherId = edge.sourceId === currentNode.id ? edge.targetId : edge.sourceId;
                          const other = sourceNodes.find((node) => node.id === otherId);
                          const integration = edge.type === "DECISION";
                          return (
                            <div key={edge.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${integration ? "border-red-100 bg-red-50/70" : "border-blue-100 bg-blue-50/70"}`}>
                              <div className={`h-3 w-3 shrink-0 rounded-full ${integration ? "bg-red-500" : "bg-blue-500"}`} />
                              <button
                                type="button"
                                onClick={() => other && focusNode(other.id)}
                                disabled={!other}
                                className="min-w-0 flex-1 text-left disabled:cursor-default"
                                title={other ? `Ir a ${other.title}` : undefined}
                              >
                                <p className={`text-xs font-black uppercase tracking-[0.12em] ${integration ? "text-red-700" : "text-blue-700"}`}>{integration ? "Integra" : "Colabora"}</p>
                                <p className="truncate text-sm font-black text-slate-900">{other?.title || "Caja relacionada"}</p>
                                {other ? <p className="mt-0.5 text-[10px] font-bold text-slate-400">Tocar para ir a esta caja</p> : null}
                              </button>
                              <button
                                type="button"
                                onClick={() => changeRelationType(edge)}
                                className={`rounded-xl px-2.5 py-2 text-[10px] font-black transition ${integration ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
                                title={integration ? "Cambiar este vínculo a Colabora" : "Cambiar este vínculo a Integra"}
                              >
                                {integration ? "→ Colabora" : "→ Integra"}
                              </button>
                              <button type="button" onClick={() => removeRelation(edge.id)} className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-600 transition hover:bg-white" aria-label="Eliminar vínculo">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        }) : (
                          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500">Todavía no tiene vínculos Integra o Colabora.</div>
                        )}
                      </div>
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

      {showCreateNode ? (
        <CreateNodeModal
          nodes={sourceNodes}
          defaultParentId={createNodeParentId || selectedId || roots[0] || ""}
          pending={isPending}
          onClose={() => setShowCreateNode(false)}
          onSubmit={createNodeFromModal}
        />
      ) : null}
    </main>
  );
}

function PeopleDrawer({ node, onClose }: { node: SourceNode; onClose: () => void }) {
  const people = peopleForNode(node);
  return (
    <aside className="fixed bottom-5 right-5 top-24 z-[70] w-[min(430px,calc(100vw-2rem))] overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-5 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Ficha de la función</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{node.title}</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{nodeDescription(node)}</p>
            <p className="mt-2 text-xs font-black text-slate-400">
              {people.length} {people.length === 1 ? "persona" : "personas"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"><X className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {people.length ? people.map((person) => (
          <div key={person.id} className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-4">
              <SimplePhoto src={person.photoUrl} name={person.name} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-950">{person.name}</p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">{person.role}</p>
                {person.weeklyHours ? <p className="mt-2 text-xs font-black text-slate-400">{person.weeklyHours} hs. semanales</p> : null}
              </div>
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3">
              {person.email ? (
                <a href={`mailto:${person.email}`} className="inline-flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-900">
                  <Mail className="h-4 w-4" />{person.email}
                </a>
              ) : (
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400"><Mail className="h-4 w-4" />Correo todavía no cargado</p>
              )}
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500">Esta función todavía no tiene una persona asignada.</div>
        )}
      </div>
    </aside>
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

function QualityMetric({
  label,
  value,
  ok,
  warningOnly = false,
}: {
  label: string;
  value: number;
  ok: boolean;
  warningOnly?: boolean;
}) {
  const tone = ok
    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
    : warningOnly
      ? "border-amber-100 bg-amber-50 text-amber-800"
      : "border-rose-100 bg-rose-50 text-rose-800";
  return (
    <div className={`rounded-2xl border p-3 ${tone}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.12em] opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
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

function RelationViewButton({
  label,
  active,
  tone = "all",
  onClick,
}: {
  label: string;
  active: boolean;
  tone?: PucaraRelationView;
  onClick: () => void;
}) {
  const activeClass =
    tone === "integration"
      ? "bg-red-600 text-white shadow-sm"
      : tone === "collaboration"
        ? "bg-blue-700 text-white shadow-sm"
        : "bg-slate-900 text-white shadow-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition ${
        active ? activeClass : "text-slate-500 hover:bg-white hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}

type ExistingPersonFieldNames = {
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string;
};

function setFormInputValue(form: HTMLFormElement | null, name: string, value: string) {
  const field = form?.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
    field.value = value;
  }
}

function ExistingPersonSelect({
  label,
  name,
  people,
  defaultValue,
  fieldNames,
}: {
  label: string;
  name: string;
  people: Person[];
  defaultValue: string;
  fieldNames?: ExistingPersonFieldNames;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.11em] text-slate-500">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        onChange={(event) => {
          if (!fieldNames || event.currentTarget.value === "__new__") return;
          const person = people.find((item) => item.id === event.currentTarget.value);
          if (!person) return;
          const form = event.currentTarget.form;
          setFormInputValue(form, fieldNames.firstName, person.firstName);
          setFormInputValue(form, fieldNames.lastName, person.lastName);
          setFormInputValue(form, fieldNames.email, person.email ?? "");
          setFormInputValue(form, fieldNames.photoUrl, person.photoUrl ?? "");
        }}
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
        Elegí alguien ya cargado para no duplicarlo. Al elegirlo se completan automáticamente nombre, apellido, correo y foto.
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="w-full max-w-[590px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 md:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Nuevo organigrama</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">¿Con qué base querés empezar?</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">No cargamos todo de una. Elegís una base y después agregás las cajas que realmente usa {schoolName}.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"><X className="h-5 w-5" /></button>
        </div>

        <form action={onSubmit} className="space-y-4 p-5 md:p-6">
          <input type="hidden" name="chartTitle" value="" />
          <input type="hidden" name="chartYear" value={String(year)} />

          <label className="block cursor-pointer rounded-2xl border-2 border-blue-200 bg-blue-50/70 p-4 transition has-[:checked]:border-blue-600 has-[:checked]:ring-4 has-[:checked]:ring-blue-100">
            <input type="radio" name="starter" value="basic" defaultChecked className="sr-only" />
            <p className="font-black text-slate-950">Base simple · recomendada</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">Consejo de Dirección → Dirección General. Desde ahí agregás Nivel Primario, Administración o lo que necesites.</p>
          </label>

          <label className="block cursor-pointer rounded-2xl border-2 border-slate-200 bg-white p-4 transition has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:ring-4 has-[:checked]:ring-blue-100">
            <input type="radio" name="starter" value="core" className="sr-only" />
            <p className="font-black text-slate-950">Base por áreas</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">Consejo + Dirección + Inicial + Primaria + Secundaria + Formación + Familias + Administración.</p>
          </label>

          <label className="block cursor-pointer rounded-2xl border-2 border-slate-200 bg-white p-4 transition has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:ring-4 has-[:checked]:ring-blue-100">
            <input type="radio" name="starter" value="single" className="sr-only" />
            <p className="font-black text-slate-950">Desde cero</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">Solo Dirección General. Útil si el colegio tiene una estructura muy distinta.</p>
          </label>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:opacity-60">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear y editar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateNodeModal({
  nodes,
  defaultParentId,
  pending,
  onClose,
  onSubmit,
}: {
  nodes: SourceNode[];
  defaultParentId: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const categories = [
    {
      key: "niveles",
      label: "Niveles",
      presets: ["nivel-inicial", "nivel-primario", "nivel-secundario", "equipo-directivo-inicial", "equipo-directivo-primario", "equipo-directivo-secundario", "equipo-docente", "secretaria-nivel", "preceptoria"],
    },
    {
      key: "formacion",
      label: "Académica y Formación",
      presets: ["coordinacion-academica", "consejo-academico", "formacion-integral", "tutorias", "doe", "coordinacion-ingles", "capellania"],
    },
    {
      key: "familias",
      label: "Familias y Comunicación",
      presets: ["familias", "comunicacion", "postulaciones", "comite-admisiones"],
    },
    {
      key: "gestion",
      label: "Administración y Soporte",
      presets: ["administracion", "facturacion-cobranzas", "contabilidad-tesoreria", "rrhh", "operaciones", "mantenimiento-servicios", "limpieza-conserjeria", "recepcion", "tic"],
    },
  ] as const;

  const [step, setStep] = useState<1 | 2>(1);
  const [parentId, setParentId] = useState(defaultParentId);
  const [categoryKey, setCategoryKey] = useState<(typeof categories)[number]["key"]>("niveles");
  const [presetKey, setPresetKey] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [customArea, setCustomArea] = useState("OTRO");
  const isCustom = presetKey === "custom";
  const selectedPreset = ORG_SIMPLE_PRESETS.find((preset) => preset.key === presetKey) ?? null;
  const category = categories.find((item) => item.key === categoryKey) ?? categories[0];
  const categoryPresets = category.presets
    .map((key) => ORG_SIMPLE_PRESETS.find((preset) => preset.key === key))
    .filter(Boolean) as typeof ORG_SIMPLE_PRESETS;
  const parentNode = nodes.find((node) => node.id === parentId) ?? null;
  const canCreate = Boolean(parentId && (selectedPreset || (isCustom && customTitle.trim())));

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="w-full max-w-[720px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 md:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Nueva caja · paso {step} de 2</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{step === 1 ? "¿De quién depende?" : "¿Qué querés agregar?"}</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              {step === 1
                ? "Primero elegí la caja superior. Esa será la línea normal del organigrama."
                : "Elegí una base. Después de crearla se abre el editor para agregar persona, foto, correo y ajustar el texto."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"><X className="h-5 w-5" /></button>
        </div>

        {step === 1 ? (
          <div className="space-y-5 p-5 md:p-6">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Caja superior</p>
              <select value={parentId} onChange={(event) => setParentId(event.target.value)} className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-3.5 py-3 text-base font-black text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                <option value="" disabled>Elegir de quién depende</option>
                {nodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
              </select>
              {parentNode ? (
                <>
                  <p className="mt-2 text-sm font-semibold text-blue-800">La nueva caja va a aparecer debajo de <strong>{parentNode.title}</strong>.</p>
                  <div className="mt-4 flex flex-col items-center rounded-2xl border border-blue-100 bg-white p-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm font-black text-slate-800">{parentNode.title}</div>
                    <div className="my-1 flex h-10 flex-col items-center text-blue-700">
                      <div className="h-5 w-0.5 bg-blue-400" />
                      <ArrowDown className="-mt-1 h-5 w-5" />
                    </div>
                    <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-2 text-center text-sm font-black text-blue-700">Nueva función</div>
                    <p className="mt-2 text-[11px] font-semibold text-slate-400">Esta es la dependencia jerárquica que se va a crear.</p>
                  </div>
                </>
              ) : null}
            </div>
            <div className="flex justify-end">
              <button type="button" disabled={!parentId} onClick={() => setStep(2)} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:opacity-40">
                Siguiente <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <form action={onSubmit} className="p-5 md:p-6">
            <input type="hidden" name="newNodeParentId" value={parentId} />
            <input type="hidden" name="presetKey" value={presetKey || "custom"} />
            <input type="hidden" name="newNodeTitle" value={isCustom ? customTitle : ""} />
            <input type="hidden" name="newNodeArea" value={isCustom ? customArea : "OTRO"} />
            <input type="hidden" name="newNodeFormalRole" value="" />
            <input type="hidden" name="newNodeRealFunction" value="" />
            <input type="hidden" name="newNodeDescription" value="" />

            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => { setCategoryKey(item.key); setPresetKey(""); }}
                  className={`rounded-full px-3.5 py-2 text-xs font-black transition ${categoryKey === item.key && !isCustom ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {item.label}
                </button>
              ))}
              <button type="button" onClick={() => setPresetKey("custom")} className={`rounded-full px-3.5 py-2 text-xs font-black transition ${isCustom ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}>Otra caja</button>
            </div>

            {!isCustom ? (
              <div className="mt-4 grid max-h-[390px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {categoryPresets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => setPresetKey(preset.key)}
                    className={`rounded-2xl border p-4 text-left transition ${presetKey === preset.key ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`}
                  >
                    <p className="text-sm font-black text-slate-950">{preset.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-500">{preset.description}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.11em] text-slate-500">Nombre de la caja</span>
                  <input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} placeholder="Ej. Coordinación de Primaria" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.11em] text-slate-500">Área</span>
                  <select value={customArea} onChange={(event) => setCustomArea(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
                    <option value="DIRECCION">Dirección</option><option value="ACADEMICA">Académica</option><option value="FORMACION">Formación</option><option value="FAMILIA">Familias</option><option value="COMUNICACION">Comunicación</option><option value="POSTULACIONES">Postulaciones</option><option value="ADMINISTRACION">Administración</option><option value="OPERACIONES">Operaciones</option><option value="TUTORIA">Tutorías</option><option value="CAPELLANIA">Capellanía</option><option value="OTRO">Otro</option>
                  </select>
                </label>
              </div>
            )}

            {selectedPreset ? (
              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-800">Se va a crear <strong>{selectedPreset.title}</strong> debajo de <strong>{parentNode?.title}</strong>. Después podés cambiar todo.</p>
                <div className="mt-3 flex items-center justify-center gap-3 overflow-hidden rounded-xl bg-white p-3">
                  <div className="max-w-[210px] truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">{parentNode?.title}</div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-emerald-600" />
                  <div className="max-w-[210px] truncate rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800">{selectedPreset.title}</div>
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <button type="button" onClick={() => setStep(1)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /> Atrás</button>
              <button type="submit" disabled={pending || !canCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:opacity-40">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear caja
              </button>
            </div>
          </form>
        )}
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
