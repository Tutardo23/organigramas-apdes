import Link from "next/link";
import { ArrowLeft, Network } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import {
  TalentDashboard,
  type TalentPerson,
} from "../../../components/talento/TalentDashboard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;

  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
    select: { name: true },
  });

  if (!school) {
    return { title: "Talento no encontrado" };
  }

  return {
    title: `Talento ${school.name} | APDES`,
    description: `Dashboard de talento institucional del colegio ${school.name}.`,
  };
}

type JsonItem = {
  title?: string;
  detail?: string;
  score?: number;
  date?: string;
};

function normalizeJsonItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as JsonItem;
      return {
        title: String(record.title ?? "Sin título"),
        detail: record.detail ? String(record.detail) : undefined,
        score:
          typeof record.score === "number" && Number.isFinite(record.score)
            ? record.score
            : undefined,
        date: record.date ? String(record.date) : undefined,
      };
    })
    .filter(Boolean) as Array<{
    title: string;
    detail?: string;
    score?: number;
    date?: string;
  }>;
}

function areaLabel(area: string) {
  const labels: Record<string, string> = {
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

  return labels[area] ?? area;
}

export default async function SchoolTalentPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;

  const school = await (prisma as any).school.findUnique({
    where: { slug: schoolSlug },
    include: {
      people: {
        where: { active: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      },
      orgCharts: {
        orderBy: { year: "desc" },
        take: 1,
        include: {
          nodes: {
            include: {
              person: true,
              members: {
                include: { person: true },
                orderBy: [{ role: "asc" }, { order: "asc" }],
              },
            },
          },
        },
      },
    },
  });

  if (!school) notFound();

  const currentChart = school.orgCharts[0] ?? null;
  const nodes = currentChart?.nodes ?? [];

  const people: TalentPerson[] = school.people.map((person: any) => {
    const nodeParticipations = [] as TalentPerson["nodes"];

    nodes.forEach((node: any) => {
      if (node.personId === person.id) {
        nodeParticipations.push({
          nodeId: node.id,
          title: node.title,
          area: node.area,
          role: "RESPONSABLE",
          roleTitle: node.formalRole,
          weeklyHours: node.weeklyHours,
        });
      }

      node.members?.forEach((member: any) => {
        if (member.personId === person.id) {
          nodeParticipations.push({
            nodeId: node.id,
            title: node.title,
            area: node.area,
            role: member.role,
            roleTitle: member.roleTitle,
            weeklyHours: member.weeklyHours,
          });
        }
      });
    });

    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      phone: person.phone,
      formalRole: person.formalRole,
      realFunction: person.realFunction,
      weeklyHours: person.weeklyHours,
      potentialLevel: person.potentialLevel,
      talentNotes: person.talentNotes,
      competencies: normalizeJsonItems(person.competencies),
      trainings: normalizeJsonItems(person.trainings),
      evaluations: normalizeJsonItems(person.evaluations),
      nodes: nodeParticipations,
    };
  });

  const coverageMap = new Map<
    string,
    { area: string; people: Set<string>; hours: number; nodes: Set<string> }
  >();

  nodes.forEach((node: any) => {
    const existing = coverageMap.get(node.area) ?? {
      area: node.area,
      people: new Set<string>(),
      hours: 0,
      nodes: new Set<string>(),
    };

    existing.nodes.add(node.id);

    if (node.personId) existing.people.add(node.personId);
    if (node.weeklyHours) existing.hours += node.weeklyHours;

    node.members?.forEach((member: any) => {
      existing.people.add(member.personId);
      existing.hours += member.weeklyHours ?? 0;
    });

    coverageMap.set(node.area, existing);
  });

  const areaCoverage = Array.from(coverageMap.values())
    .map((item) => ({
      area: item.area,
      label: areaLabel(item.area),
      peopleCount: item.people.size,
      hours: item.hours,
      nodesCount: item.nodes.size,
    }))
    .sort((a, b) => b.peopleCount - a.peopleCount || a.label.localeCompare(b.label));

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-6">
      <section className="mx-auto max-w-[1980px]">
        <div className="mb-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/talento"
                className="inline-flex items-center gap-2 text-sm font-black text-blue-700 hover:text-blue-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al dashboard de talento
              </Link>
              <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                Talento institucional
              </p>
              <h1 className="mt-1 text-3xl font-black text-slate-950">
                {school.name}
              </h1>
              <p className="mt-1 max-w-3xl text-sm font-semibold leading-relaxed text-slate-500">
                Perfil dinámico de personas, horas, áreas cubiertas, funciones
                reales, potencial, competencias, capacitaciones y evaluaciones.
              </p>
            </div>

            <Link
              href={`/organigramas/${school.slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Network className="h-4 w-4" />
              Ver organigrama
            </Link>
          </div>
        </div>

        <TalentDashboard
          schoolSlug={school.slug}
          schoolName={school.name}
          people={people}
          areaCoverage={areaCoverage}
        />
      </section>
    </main>
  );
}
