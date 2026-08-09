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
  description: "Dashboard dinámico de talento institucional conectado con organigramas, personas, funciones y horas.",
};

export const dynamic = "force-dynamic";

type SchoolWithTalent = Awaited<ReturnType<typeof loadSchools>>[number];

async function loadSchools() {
  return prisma.school.findMany({
    orderBy: { name: "asc" },
    include: {
      people: {
        where: { active: true },
        select: {
          id: true,
          weeklyHours: true,
          potentialLevel: true,
          competencies: true,
          trainings: true,
          evaluations: true,
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
              members: { select: { weeklyHours: true } },
            },
          },
        },
      },
    },
  });
}

function getLatestChart(school: SchoolWithTalent) {
  return school.orgCharts[0] ?? null;
}

function getSchoolStats(school: SchoolWithTalent) {
  const chart = getLatestChart(school);
  const nodes = chart?.nodes ?? [];
  const peopleCount = school.people.length;
  const areas = new Set(nodes.map((node) => node.area));

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

  const completionPoints = school.people.reduce((total, person) => {
    const hasItems = (value: unknown) => Array.isArray(value) && value.length > 0;
    return total
      + (person.potentialLevel && person.potentialLevel !== "SIN_DEFINIR" ? 1 : 0)
      + (hasItems(person.competencies) ? 1 : 0)
      + (hasItems(person.trainings) ? 1 : 0)
      + (hasItems(person.evaluations) ? 1 : 0);
  }, 0);

  const informationCompletion = peopleCount === 0
    ? 0
    : Math.round((completionPoints / (peopleCount * 4)) * 100);

  return {
    chart,
    nodesCount: nodes.length,
    peopleCount,
    areasCount: areas.size,
    totalHours,
    peopleWithTalent,
    informationCompletion,
  };
}

function completionLabel(value: number) {
  if (value >= 85) return "Información completa";
  if (value >= 50) return "En progreso";
  if (value > 0) return "Recién iniciada";
  return "Sin datos";
}

export default async function TalentoPage() {
  const schools = await loadSchools();

  const totals = schools.reduce(
    (acc, school) => {
      const stats = getSchoolStats(school);
      acc.people += stats.peopleCount;
      acc.nodes += stats.nodesCount;
      acc.hours += stats.totalHours;
      acc.withTalent += stats.peopleWithTalent;
      acc.completion += stats.informationCompletion;
      return acc;
    },
    { people: 0, nodes: 0, hours: 0, withTalent: 0, completion: 0 },
  );

  const averageCompletion = schools.length
    ? Math.round(totals.completion / schools.length)
    : 0;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-7 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-blue-700 hover:text-blue-900">
                <Network className="h-4 w-4" /> Plataforma institucional
              </Link>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-blue-700">Talento APDES</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">Dashboard de talento institucional</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-slate-500">
                Leé personas, funciones, horas, competencias, capacitaciones y evaluaciones desde la misma base del organigrama.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric icon={<UsersRound className="h-5 w-5" />} value={totals.people} label="Personas" className="bg-blue-50 text-blue-800" />
              <Metric icon={<Building2 className="h-5 w-5" />} value={schools.length} label="Colegios" className="bg-slate-100 text-slate-800" />
              <Metric icon={<Clock3 className="h-5 w-5" />} value={totals.hours} label="Horas" className="bg-amber-50 text-amber-800" />
              <Metric icon={<BrainCircuit className="h-5 w-5" />} value={`${averageCompletion}%`} label="Información completa" className="bg-emerald-50 text-emerald-800" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {schools.map((school) => {
            const stats = getSchoolStats(school);
            const completion = completionLabel(stats.informationCompletion);
            return (
              <Link key={school.id} href={`/talento/${school.slug}`} className="group rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">{school.city ?? "Colegio"}</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">{school.name}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{school.province ?? "APDES"}</p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 p-3 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <SmallStat value={stats.peopleCount} label="Personas" />
                  <SmallStat value={stats.areasCount} label="Áreas" />
                  <SmallStat value={stats.totalHours} label="Horas" />
                </div>

                <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">Información de talento</p>
                      <p className="mt-1 text-xl font-black text-slate-950">{completion}</p>
                    </div>
                    <BarChart3 className="h-6 w-6 text-blue-700" />
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-blue-700" style={{ width: `${stats.informationCompletion}%` }} />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs font-black text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  {stats.chart?.status ?? "Sin organigrama"} · Año {stats.chart?.year ?? "sin definir"}
                </div>
              </Link>
            );
          })}
        </div>

        {schools.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-blue-700" />
            <h2 className="mt-3 text-2xl font-black text-slate-950">Todavía no hay colegios cargados</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-slate-500">
              Primero cargá colegios y organigramas. Después este tablero se actualiza automáticamente.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Metric({ icon, value, label, className }: { icon: React.ReactNode; value: React.ReactNode; label: string; className: string }) {
  return (
    <div className={`rounded-3xl p-4 ${className}`}>
      {icon}
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="text-xs font-black uppercase tracking-wide">{label}</p>
    </div>
  );
}

function SmallStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-lg font-black text-slate-950">{value}</p>
      <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
