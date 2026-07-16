"use client";

import {
  Award,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Filter,
  HelpCircle,
  Layers3,
  MessageSquareText,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { updatePersonTalentAction } from "../../app/talento/[schoolSlug]/actions";

type TalentItem = {
  title: string;
  detail?: string;
  score?: number;
  date?: string;
};

type PersonNode = {
  nodeId: string;
  title: string;
  area: string;
  role: string;
  roleTitle: string | null;
  weeklyHours: number | null;
};

export type TalentPerson = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  formalRole: string | null;
  realFunction: string | null;
  weeklyHours: number | null;
  potentialLevel: string | null;
  talentNotes: string | null;
  competencies: TalentItem[];
  trainings: TalentItem[];
  evaluations: TalentItem[];
  nodes: PersonNode[];
};

type AreaCoverage = {
  area: string;
  peopleCount: number;
  hours: number;
  nodesCount: number;
};

type Props = {
  schoolSlug: string;
  schoolName: string;
  people: TalentPerson[];
  areaCoverage: AreaCoverage[];
};

const potentialLabels: Record<string, string> = {
  SIN_DEFINIR: "Sin definir",
  ALTO: "Alto potencial",
  MEDIO: "Potencial medio",
  EN_DESARROLLO: "En desarrollo",
  CRITICO: "Perfil crítico",
};

const potentialOptions = [
  { value: "SIN_DEFINIR", label: "Sin definir" },
  { value: "ALTO", label: "Alto potencial" },
  { value: "MEDIO", label: "Potencial medio" },
  { value: "EN_DESARROLLO", label: "En desarrollo" },
  { value: "CRITICO", label: "Perfil crítico" },
];

const areaLabels: Record<string, string> = {
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

function fullName(person: TalentPerson) {
  return `${person.firstName} ${person.lastName}`.trim();
}

function normalizePotential(value: string | null) {
  return value || "SIN_DEFINIR";
}

function getPotentialColor(value: string | null) {
  const normalized = normalizePotential(value);
  if (normalized === "ALTO") return "bg-emerald-50 text-emerald-800 border-emerald-100";
  if (normalized === "MEDIO") return "bg-blue-50 text-blue-800 border-blue-100";
  if (normalized === "EN_DESARROLLO") return "bg-amber-50 text-amber-800 border-amber-100";
  if (normalized === "CRITICO") return "bg-rose-50 text-rose-800 border-rose-100";
  return "bg-slate-50 text-slate-600 border-slate-100";
}

function inputClass(extra = "") {
  return `w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${extra}`;
}

function textareaClass(extra = "") {
  return `w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${extra}`;
}

function parseLinesToItems(value: string): TalentItem[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, detail, scoreRaw] = line.split("|").map((part) => part?.trim());
      const score = scoreRaw ? Number(scoreRaw) : undefined;
      return {
        title: title || "Sin título",
        detail: detail || undefined,
        score: Number.isFinite(score) ? score : undefined,
      };
    });
}

function itemsToLines(items: TalentItem[]) {
  return items
    .map((item) => [item.title, item.detail, item.score].filter((part) => part !== undefined && part !== null && String(part).length > 0).join(" | "))
    .join("\n");
}

function calculatePersonHours(person: TalentPerson) {
  const nodeHours = person.nodes.reduce((acc, node) => acc + (node.weeklyHours ?? 0), 0);
  return nodeHours || person.weeklyHours || 0;
}

export function TalentDashboard({ schoolSlug, schoolName, people, areaCoverage }: Props) {
  const [selectedId, setSelectedId] = useState(people[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [potentialFilter, setPotentialFilter] = useState("TODOS");
  const [localPeople, setLocalPeople] = useState(people);
  const [isPending, startTransition] = useTransition();
  const [showGuide, setShowGuide] = useState(false);

  const selectedPerson = useMemo(
    () => localPeople.find((person) => person.id === selectedId) ?? localPeople[0] ?? null,
    [localPeople, selectedId],
  );

  const filteredPeople = useMemo(() => {
    const query = search.toLowerCase().trim();

    return localPeople.filter((person) => {
      const matchesSearch =
        !query ||
        fullName(person).toLowerCase().includes(query) ||
        (person.formalRole ?? "").toLowerCase().includes(query) ||
        (person.realFunction ?? "").toLowerCase().includes(query) ||
        person.nodes.some((node) => node.title.toLowerCase().includes(query));

      const matchesPotential =
        potentialFilter === "TODOS" || normalizePotential(person.potentialLevel) === potentialFilter;

      return matchesSearch && matchesPotential;
    });
  }, [localPeople, potentialFilter, search]);

  const stats = useMemo(() => {
    const totalHours = localPeople.reduce((acc, person) => acc + calculatePersonHours(person), 0);
    const peopleWithPotential = localPeople.filter((person) => normalizePotential(person.potentialLevel) !== "SIN_DEFINIR").length;
    const criticalPeople = localPeople.filter((person) => normalizePotential(person.potentialLevel) === "CRITICO").length;
    const multiRolePeople = localPeople.filter((person) => person.nodes.length > 1).length;

    return {
      totalPeople: localPeople.length,
      totalHours,
      peopleWithPotential,
      criticalPeople,
      multiRolePeople,
    };
  }, [localPeople]);

  function updateSelectedPerson(next: Partial<TalentPerson>) {
    if (!selectedPerson) return;
    setLocalPeople((current) =>
      current.map((person) =>
        person.id === selectedPerson.id ? { ...person, ...next } : person,
      ),
    );
  }

  function handleSave(formData: FormData) {
    if (!selectedPerson) return;

    const potentialLevel = String(formData.get("potentialLevel") ?? "SIN_DEFINIR");
    const talentNotes = String(formData.get("talentNotes") ?? "");
    const competencies = parseLinesToItems(String(formData.get("competenciesText") ?? ""));
    const trainings = parseLinesToItems(String(formData.get("trainingsText") ?? ""));
    const evaluations = parseLinesToItems(String(formData.get("evaluationsText") ?? ""));

    const payload = new FormData();
    payload.set("personId", selectedPerson.id);
    payload.set("schoolSlug", schoolSlug);
    payload.set("potentialLevel", potentialLevel);
    payload.set("talentNotes", talentNotes);
    payload.set("competencies", JSON.stringify(competencies));
    payload.set("trainings", JSON.stringify(trainings));
    payload.set("evaluations", JSON.stringify(evaluations));

    updateSelectedPerson({
      potentialLevel,
      talentNotes,
      competencies,
      trainings,
      evaluations,
    });

    startTransition(async () => {
      await updatePersonTalentAction(payload);
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleSave(new FormData(event.currentTarget));
  }

  return (
    <>
      {showGuide ? <TalentGuide onClose={() => setShowGuide(false)} /> : null}
      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-5 xl:h-[calc(100vh-2.5rem)] xl:overflow-y-auto">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-sm">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              Talento
            </p>
            <h2 className="text-xl font-black text-slate-950">{schoolName}</h2>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-3xl bg-slate-50 p-4">
            <UsersRound className="h-5 w-5 text-blue-700" />
            <p className="mt-2 text-2xl font-black text-slate-950">{stats.totalPeople}</p>
            <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">Personas</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <Clock3 className="h-5 w-5 text-amber-700" />
            <p className="mt-2 text-2xl font-black text-slate-950">{stats.totalHours}</p>
            <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">Horas</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <TrendingUp className="h-5 w-5 text-emerald-700" />
            <p className="mt-2 text-2xl font-black text-slate-950">{stats.peopleWithPotential}</p>
            <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">Perfilados</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <Layers3 className="h-5 w-5 text-violet-700" />
            <p className="mt-2 text-2xl font-black text-slate-950">{stats.multiRolePeople}</p>
            <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">Multirol</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar persona, cargo o área"
              className={inputClass("pl-11")}
            />
          </div>

          <div className="relative">
            <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={potentialFilter}
              onChange={(event) => setPotentialFilter(event.target.value)}
              className={inputClass("pl-11")}
            >
              <option value="TODOS">Todos los potenciales</option>
              {potentialOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {filteredPeople.map((person) => {
            const active = selectedPerson?.id === person.id;
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => setSelectedId(person.id)}
                className={`w-full rounded-3xl border p-4 text-left transition ${
                  active
                    ? "border-blue-200 bg-blue-50 shadow-sm"
                    : "border-slate-100 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      {fullName(person)}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                      {person.formalRole || person.nodes[0]?.title || "Sin cargo definido"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-black ${getPotentialColor(person.potentialLevel)}`}>
                    {potentialLabels[normalizePotential(person.potentialLevel)]}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-black text-slate-600">
                    {calculatePersonHours(person)} hs.
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-4">
          {areaCoverage.map((area) => (
            <div key={area.area} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                {areaLabels[area.area] ?? area.area}
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {area.peopleCount}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                personas · {area.hours} hs. · {area.nodesCount} funciones
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-700"
                  style={{ width: `${Math.min(100, area.peopleCount * 18 + area.hours)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {selectedPerson ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <UserRound className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                      Ficha de talento
                    </p>
                    <h2 className="text-3xl font-black text-slate-950">
                      {fullName(selectedPerson)}
                    </h2>
                  </div>
                </div>
                <p className="mt-4 max-w-3xl text-sm font-semibold leading-relaxed text-slate-500">
                  Esta ficha toma datos del organigrama y permite completar
                  potencial, competencias, capacitaciones, evaluaciones y notas
                  para acompañar decisiones institucionales con información clara.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full border px-4 py-2 text-sm font-black ${getPotentialColor(selectedPerson.potentialLevel)}`}>
                  {potentialLabels[normalizePotential(selectedPerson.potentialLevel)]}
                </span>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                  {calculatePersonHours(selectedPerson)} hs. totales
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Cargo formal
                    </p>
                    <p className="mt-2 text-lg font-black text-slate-950">
                      {selectedPerson.formalRole || "Sin definir"}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Contacto
                    </p>
                    <p className="mt-2 text-sm font-black text-slate-950">
                      {selectedPerson.email || "Sin email"}
                    </p>
                    {selectedPerson.phone ? (
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {selectedPerson.phone}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Layers3 className="h-5 w-5 text-blue-700" />
                    <h3 className="text-lg font-black text-slate-950">
                      Participación en organigrama
                    </h3>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {selectedPerson.nodes.length > 0 ? (
                      selectedPerson.nodes.map((node) => (
                        <div key={`${node.nodeId}-${node.role}`} className="rounded-3xl bg-slate-50 p-4">
                          <p className="text-sm font-black text-slate-950">{node.title}</p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                            {areaLabels[node.area] ?? node.area}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            {node.roleTitle || node.role} · {node.weeklyHours ?? 0} hs.
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-3xl bg-amber-50 p-4 text-sm font-bold text-amber-800 md:col-span-2">
                        Esta persona todavía no está asociada a un área del organigrama.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <TalentMiniList
                    title="Competencias"
                    icon={<Award className="h-5 w-5" />}
                    items={selectedPerson.competencies}
                  />
                  <TalentMiniList
                    title="Capacitaciones"
                    icon={<BookOpenCheck className="h-5 w-5" />}
                    items={selectedPerson.trainings}
                  />
                  <TalentMiniList
                    title="Evaluaciones"
                    icon={<ClipboardCheck className="h-5 w-5" />}
                    items={selectedPerson.evaluations}
                  />
                </div>
              </div>

              <form key={selectedPerson.id} onSubmit={handleSubmit} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                      Edición rápida
                    </p>
                    <h3 className="text-xl font-black text-slate-950">
                      Completar talento
                    </h3>
                  </div>
                  <Sparkles className="h-5 w-5 text-blue-700" />
                </div>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">
                      Potencial
                    </span>
                    <select name="potentialLevel" defaultValue={normalizePotential(selectedPerson.potentialLevel)} className={inputClass()}>
                      {potentialOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">
                      Notas de talento
                    </span>
                    <textarea
                      name="talentNotes"
                      defaultValue={selectedPerson.talentNotes ?? ""}
                      rows={4}
                      className={textareaClass()}
                      placeholder="Fortalezas, riesgos, posibles próximos pasos, necesidades de acompañamiento..."
                    />
                  </label>

                  <TalentItemsEditor
                    name="competenciesText"
                    label="Competencias"
                    initialItems={selectedPerson.competencies}
                    placeholder="Ej. Liderazgo de equipos"
                  />

                  <TalentItemsEditor
                    name="trainingsText"
                    label="Capacitaciones"
                    initialItems={selectedPerson.trainings}
                    placeholder="Ej. Gestión educativa"
                  />

                  <TalentItemsEditor
                    name="evaluationsText"
                    label="Evaluaciones"
                    initialItems={selectedPerson.evaluations}
                    placeholder="Ej. Evaluación anual"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? <CircleAlert className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
                  {isPending ? "Guardando..." : "Guardar ficha"}
                </button>

                <div className="mt-4 rounded-2xl bg-white p-4 text-xs font-semibold leading-relaxed text-slate-500">
                  <div className="mb-2 flex items-center gap-2 font-black text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Guardado dinámico
                  </div>
                  Al guardar, la ficha se actualiza en pantalla y queda lista
                  para futuras lecturas institucionales. La plataforma separa
                  el avance de carga de cualquier indicador de talento oficial.
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <X className="mx-auto h-8 w-8 text-slate-400" />
            <h2 className="mt-3 text-2xl font-black text-slate-950">
              No hay personas para mostrar
            </h2>
          </div>
        )}
      </section>
    </div>
    </>
  );
}

function TalentGuide({ onClose }: { onClose: () => void }) {
  const items = [
    {
      title: "Personas",
      body: "Son las personas cargadas en el organigrama. Talento no duplica datos: lee cargos, áreas y horas desde ahí.",
    },
    {
      title: "Horas totales",
      body: "Suma las horas de las áreas donde participa cada persona. Sirve para ver carga y cobertura.",
    },
    {
      title: "Potencial",
      body: "Es una lectura interna: alto, medio, en desarrollo, crítico o sin definir. Ayuda a priorizar acompañamiento.",
    },
    {
      title: "Competencias, capacitaciones y evaluaciones",
      body: "Se agregan como registros independientes para que sean fáciles de actualizar y comparar.",
    },
    {
      title: "Información completada",
      body: "Muestra cuánto se avanzó en la carga. No representa todavía la densidad de talento, que requerirá indicadores acordados por APDES.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="max-h-[86vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Guía rápida</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Cómo leer el tablero de talento</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">Este tablero usa la información del organigrama para empezar a leer personas, carga, cobertura y potencial.</p>
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
      </div>
    </div>
  );
}

function TalentItemsEditor({
  name,
  label,
  initialItems,
  placeholder,
}: {
  name: string;
  label: string;
  initialItems: TalentItem[];
  placeholder: string;
}) {
  const [items, setItems] = useState<TalentItem[]>(initialItems);
  const [draft, setDraft] = useState<TalentItem>({ title: "", detail: "" });

  function addItem() {
    if (!draft.title.trim()) return;
    setItems((current) => [...current, { title: draft.title.trim(), detail: draft.detail?.trim() || undefined }]);
    setDraft({ title: "", detail: "" });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <input type="hidden" name={name} value={itemsToLines(items)} />
      <span className="block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="mt-2 space-y-2">
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="flex items-start gap-2 rounded-xl bg-slate-50 p-2.5">
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-slate-900">{item.title}</p>{item.detail ? <p className="mt-0.5 text-[0.7rem] font-semibold text-slate-500">{item.detail}</p> : null}</div>
            <button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Quitar ${item.title}`}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      <div className="mt-2 grid gap-2">
        <input className={inputClass("px-3 py-2 text-xs")} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder={placeholder} />
        <div className="flex gap-2">
          <input className={inputClass("px-3 py-2 text-xs")} value={draft.detail ?? ""} onChange={(event) => setDraft((current) => ({ ...current, detail: event.target.value }))} placeholder="Detalle o resultado" />
          <button type="button" onClick={addItem} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100"><Plus className="h-3.5 w-3.5" /> Agregar</button>
        </div>
      </div>
    </div>
  );
}

function TalentMiniList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: ReactNode;
  items: TalentItem[];
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-blue-700">
        {icon}
        <h3 className="font-black text-slate-950">{title}</h3>
      </div>

      <div className="mt-4 space-y-2">
        {items.length > 0 ? (
          items.slice(0, 5).map((item, index) => (
            <div key={`${item.title}-${index}`} className="rounded-2xl bg-slate-50 p-3">
              <p className="text-sm font-black text-slate-900">{item.title}</p>
              {item.detail ? (
                <p className="mt-1 text-xs font-semibold text-slate-500">{item.detail}</p>
              ) : null}
              {item.score !== undefined ? (
                <p className="mt-1 text-xs font-black text-blue-700">Puntaje {item.score}</p>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            Todavía no hay datos cargados.
          </div>
        )}
      </div>
    </div>
  );
}
