import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Building2,
  Clock3,
  Network,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { prisma } from "../../lib/prisma";

export const metadata = {
  title: "Talento | APDES",
  description:
    "Dashboard dinámico de talento institucional conectado con organigramas, personas, funciones y horas.",
};

type SchoolWithTalent = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  province: string | null;
  people: Array<{
    id: string;
    potentialLevel: string | null;
    weeklyHours: number | null;
  }>;
  orgCharts: Array<{
    id: string;
    status: string;
    year: number;
    nodes: Array<{
      id: string;
      area: string;
      personId: string | null;
      weeklyHours: number | null;
      members: Array<{ weeklyHours: number | null }>;
    }>;
  }>;
};

function getLatestChart(school: SchoolWithTalent) {
  return school.orgCharts[0] ?? null;
}

function getSchoolStats(school: SchoolWithTalent) {
  const chart = getLatestChart(school);
  const nodes = chart?.nodes ?? [];
  const peopleCount = school.people.length;
  const areas = new Set(nodes.map((node) => node.area));

  const assignedNodePeople = new Set<string>();
  nodes.forEach((node) => {
    if (node.personId) assignedNodePeople.add(node.personId);
  });

  const nodeMemberHours = nodes.reduce((acc, node) => {
    const membersHours = node.members.reduce(
      (sum, member) => sum + (member.weeklyHours ?? 0),
      0,
    );
    return acc + membersHours + (membersHours === 0 ? node.weeklyHours ?? 0 : 0);
  }, 0);

  const peopleHours = school.people.reduce(
    (acc, person) => acc + (person.weeklyHours ?? 0),
    0,
  );

  const totalHours = nodeMemberHours || peopleHours;

  const peopleWithTalent = school.people.filter(
    (person) => person.potentialLevel && person.potentialLevel !== "SIN_DEFINIR",
  ).length;

  const density = Math.min(
    100,
    Math.round(
      peopleCount === 0
        ? 0
        : areas.size * 8 + assignedNodePeople.size * 4 + peopleWithTalent * 5,
    ),
  );

  return {
    chart,
    nodesCount: nodes.length,
    peopleCount,
    areasCount: areas.size,
    totalHours,
    peopleWithTalent,
    density,
  };
}

function densityLabel(value: number) {
  if (value >= 75) return "Alta";
  if (value >= 45) return "Media";
  if (value > 0) return "Inicial";
  return "Sin datos";
}

export default async function TalentoPage() {
  const schools = (await (prisma as any).school.findMany({
    orderBy: { name: "asc" },
    include: {
      people: {
        where: { active: true },
        select: {
          id: true,
          weeklyHours: true,
          potentialLevel: true,
        },
      },
      orgCharts: {
        orderBy: { year: "desc" },
        take: 1,
        include: {
          nodes: {
            select: {
              id: true,
              area: true,
              personId: true,
              weeklyHours: true,
              members: {
                select: {
                  weeklyHours: true,
                },
              },
            },
          },
        },
      },
    },
  })) as SchoolWithTalent[];

  const totals = schools.reduce(
    (acc, school) => {
      const stats = getSchoolStats(school);
      acc.people += stats.peopleCount;
      acc.nodes += stats.nodesCount;
      acc.hours += stats.totalHours;
      acc.withTalent += stats.peopleWithTalent;
      acc.density += stats.density;
      return acc;
    },
    { people: 0, nodes: 0, hours: 0, withTalent: 0, density: 0 },
  );

  const averageDensity = schools.length
    ? Math.round(totals.density / schools.length)
    : 0;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-7 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-black text-blue-700 hover:text-blue-900"
              >
                <Network className="h-4 w-4" />
                Plataforma institucional
              </Link>

              <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-blue-700">
                Talento APDES
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                Dashboard de talento institucional
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-slate-500">
                Una primera versión dinámica para leer personas, funciones, horas,
                áreas cubiertas y potencial desde la misma base del organigrama.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-3xl bg-blue-50 p-4 text-blue-800">
                <UsersRound className="h-5 w-5" />
                <p className="mt-2 text-2xl font-black">{totals.people}</p>
                <p className="text-xs font-black uppercase tracking-wide">
                  Personas
                </p>
              </div>
              <div className="rounded-3xl bg-slate-100 p-4 text-slate-800">
                <Building2 className="h-5 w-5" />
                <p className="mt-2 text-2xl font-black">{schools.length}</p>
                <p className="text-xs font-black uppercase tracking-wide">
                  Colegios
                </p>
              </div>
              <div className="rounded-3xl bg-amber-50 p-4 text-amber-800">
                <Clock3 className="h-5 w-5" />
                <p className="mt-2 text-2xl font-black">{totals.hours}</p>
                <p className="text-xs font-black uppercase tracking-wide">
                  Horas
                </p>
              </div>
              <div className="rounded-3xl bg-emerald-50 p-4 text-emerald-800">
                <BrainCircuit className="h-5 w-5" />
                <p className="mt-2 text-2xl font-black">{averageDensity}%</p>
                <p className="text-xs font-black uppercase tracking-wide">
                  Densidad
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {schools.map((school) => {
            const stats = getSchoolStats(school);
            const density = densityLabel(stats.density);

            return (
              <Link
                key={school.id}
                href={`/talento/${school.slug}`}
                className="group rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                      {school.city ?? "Colegio"}
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                      {school.name}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {school.province ?? "APDES"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 p-3 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-lg font-black text-slate-950">
                      {stats.peopleCount}
                    </p>
                    <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">
                      Personas
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-lg font-black text-slate-950">
                      {stats.areasCount}
                    </p>
                    <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">
                      Áreas
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-lg font-black text-slate-950">
                      {stats.totalHours}
                    </p>
                    <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">
                      Horas
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                        Densidad de talento
                      </p>
                      <p className="mt-1 text-xl font-black text-slate-950">
                        {density}
                      </p>
                    </div>
                    <BarChart3 className="h-6 w-6 text-blue-700" />
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-blue-700"
                      style={{ width: `${stats.density}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs font-black text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  {stats.chart?.status ?? "Sin organigrama"} · Año{" "}
                  {stats.chart?.year ?? "sin definir"}
                </div>
              </Link>
            );
          })}
        </div>

        {schools.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-blue-700" />
            <h2 className="mt-3 text-2xl font-black text-slate-950">
              Todavía no hay colegios cargados
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-slate-500">
              Primero cargá colegios y organigramas. Después este tablero se
              actualiza automáticamente.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
