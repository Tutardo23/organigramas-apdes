import {
  BookOpen,
  Building2,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Landmark,
  Layers3,
  Megaphone,
  Network,
  PenTool,
  ShieldCheck,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type PersonPreview = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  formalRole: string | null;
  realFunction: string | null;
  weeklyHours: number | null;
  active?: boolean;
};

export type OrgNodeMemberPreview = {
  id: string;
  role: string;
  roleTitle: string | null;
  weeklyHours: number | null;
  notes: string | null;
  person: PersonPreview;
};

export type OrgNodeData = {
  id: string;
  title: string;
  area: string;
  formalRole: string | null;
  realFunction: string | null;
  description: string | null;
  weeklyHours: number | null;
  positionX: number;
  positionY: number;
  color: string | null;
  icon: string | null;
  person?: PersonPreview | null;
  members?: OrgNodeMemberPreview[];
};

export type OrgEdgeData = {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  label: string | null;
};

export const areaLabels: Record<string, string> = {
  DIRECCION: "Dirección",
  ACADEMICA: "Académica",
  FORMACION: "Formación integral",
  FAMILIA: "Familia",
  COMUNICACION: "Comunicación",
  POSTULACIONES: "Postulaciones",
  OPERACIONES: "Operaciones",
  ADMINISTRACION: "Administración",
  TUTORIA: "Tutoría",
  CAPELLANIA: "Capellanía",
  OTRO: "Otro",
};

export const edgeLabels: Record<string, string> = {
  JERARQUICA: "Jerárquica",
  TRANSVERSAL: "Transversal",
  COLABORACION: "Colaboración",
  ACOMPANAMIENTO: "Acompañamiento",
  DECISION: "Decisión",
  INFORMACION: "Información",
};

export const memberRoleLabels: Record<string, string> = {
  RESPONSABLE: "Responsable",
  EQUIPO: "Equipo",
  APOYO: "Apoyo",
  EXTERNO: "Externo",
};

export const areaColors: Record<string, string> = {
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

export const colorPresets = [
  "#1d4ed8",
  "#2563eb",
  "#0284c7",
  "#0f766e",
  "#166534",
  "#7c3aed",
  "#9333ea",
  "#be123c",
  "#d97706",
  "#475569",
  "#334155",
  "#111827",
];

export const iconOptions = [
  { value: "network", label: "Red", Icon: Network },
  { value: "landmark", label: "Dirección", Icon: Landmark },
  { value: "graduation-cap", label: "Académica", Icon: GraduationCap },
  { value: "book-open", label: "Formación", Icon: BookOpen },
  { value: "users", label: "Personas", Icon: UsersRound },
  { value: "megaphone", label: "Comunicación", Icon: Megaphone },
  { value: "pen-tool", label: "Postulaciones", Icon: PenTool },
  { value: "building", label: "Operaciones", Icon: Building2 },
  { value: "shield-check", label: "Administración", Icon: ShieldCheck },
  { value: "handshake", label: "Tutoría", Icon: Handshake },
  { value: "heart-handshake", label: "Acompañamiento", Icon: HeartHandshake },
  { value: "layers", label: "Área", Icon: Layers3 },
];

const iconMap = iconOptions.reduce<Record<string, LucideIcon>>((acc, item) => {
  acc[item.value] = item.Icon;
  return acc;
}, {});

export function getNodeColor(color: string | null | undefined, area: string) {
  return color || areaColors[area] || areaColors.OTRO;
}

export function getIcon(icon: string | null | undefined) {
  return iconMap[icon || "network"] || Network;
}

function formatPersonName(person?: PersonPreview | null) {
  if (!person) return null;
  const name = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
  return name.length > 0 ? name : null;
}

function getResponsible(data: OrgNodeData) {
  const fromMembers = data.members?.find((member) => member.role === "RESPONSABLE")?.person;
  return fromMembers ?? data.person ?? data.members?.[0]?.person ?? null;
}

function getTotalHours(data: OrgNodeData) {
  const memberHours = data.members?.reduce((acc, member) => acc + (member.weeklyHours ?? 0), 0) ?? 0;
  return memberHours || data.weeklyHours || null;
}

export function OrgNodeCard({
  data,
  selected,
  editor = false,
  compact = false,
}: {
  data: OrgNodeData;
  selected?: boolean;
  editor?: boolean;
  compact?: boolean;
}) {
  const color = getNodeColor(data.color, data.area);
  const Icon = getIcon(data.icon);
  const responsible = getResponsible(data);
  const responsibleName = formatPersonName(responsible);
  const memberCount = data.members?.length ?? (data.person ? 1 : 0);
  const totalHours = getTotalHours(data);

  return (
    <div
      className={`group relative w-[235px] rounded-[1.5rem] p-[1px] transition ${
        selected ? "scale-[1.015] shadow-2xl" : "shadow-md hover:shadow-xl"
      }`}
      style={{ background: `linear-gradient(135deg, ${color}, rgba(226,232,240,0.92))` }}
    >
      <div className="rounded-[1.45rem] border border-white/80 bg-white p-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ backgroundColor: color }}
          >
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.67rem] font-black uppercase tracking-[0.16em] text-slate-400">
              {areaLabels[data.area] ?? data.area}
            </p>
            <h3 className="mt-1 text-[0.94rem] font-black leading-tight tracking-tight text-slate-950">
              {data.title}
            </h3>
          </div>
        </div>

        {responsibleName ? (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5 text-[0.72rem] font-black text-slate-700">
            <UserRound className="h-4 w-4" style={{ color }} />
            <span className="truncate">{responsibleName}</span>
          </div>
        ) : null}

        {data.formalRole ? (
          <p className="mt-2 rounded-xl border border-slate-100 bg-white px-2.5 py-1.5 text-[0.72rem] font-bold leading-snug text-slate-700 shadow-sm">
            {data.formalRole}
          </p>
        ) : null}

        {!compact && data.realFunction ? (
          <p className="mt-2 line-clamp-2 text-[0.72rem] leading-relaxed text-slate-600">
            {data.realFunction}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
          <span className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.13em] text-slate-400">
            <UsersRound className="h-3.5 w-3.5" />
            {memberCount} pers.
          </span>

          {totalHours !== null && totalHours !== undefined ? (
            <span
              className="rounded-full px-2.5 py-1 text-[0.7rem] font-black"
              style={{ backgroundColor: `${color}15`, color }}
            >
              {totalHours} hs.
            </span>
          ) : null}
        </div>

        {editor ? (
          <div className="mt-2 rounded-xl bg-blue-50 px-2.5 py-1.5 text-[0.68rem] font-black text-blue-700">
            Tocá para editar · arrastrá para mover
          </div>
        ) : null}
      </div>
    </div>
  );
}
