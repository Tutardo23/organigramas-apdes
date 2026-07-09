import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Edit3, GitBranch } from "lucide-react";
import { notFound } from "next/navigation";
import { OrgChartCanvas } from "../../../components/organigramas/OrgChartCanvas";
import { prisma } from "../../../lib/prisma";

type PageProps = {
  params: Promise<{ schoolSlug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { schoolSlug } = await params;
  const school = await prisma.school.findUnique({ where: { slug: schoolSlug } });

  if (!school) return { title: "Organigrama no encontrado" };

  return {
    title: `Organigrama ${school.name} | APDES`,
    description: `Organigrama institucional del colegio ${school.name}.`,
  };
}

export default async function SchoolOrganigramaPage({ params }: PageProps) {
  const { schoolSlug } = await params;

  const school = await (prisma as any).school.findUnique({
    where: { slug: schoolSlug },
    include: {
      orgCharts: {
        orderBy: { year: "desc" },
        include: {
          nodes: {
            orderBy: { order: "asc" },
            include: {
              person: true,
              members: {
                include: { person: true },
                orderBy: [{ role: "asc" }, { order: "asc" }],
              },
            },
          },
          edges: true,
          reviewNotes: true,
        },
      },
    },
  });

  if (!school) notFound();

  const currentChart = school.orgCharts[0];

  const visualNodes = currentChart?.nodes.map((node: any) => ({
    id: node.id,
    title: node.title,
    area: node.area,
    formalRole: node.formalRole,
    realFunction: node.realFunction,
    description: node.description,
    weeklyHours: node.weeklyHours,
    positionX: node.positionX,
    positionY: node.positionY,
    color: node.color,
    icon: node.icon ?? null,
    person: node.person,
    members: node.members ?? [],
  })) ?? [];

  const visualEdges = currentChart?.edges.map((edge: any) => ({
    id: edge.id,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    type: edge.type,
    label: edge.label,
  })) ?? [];

  const totalPeople = new Set(
    visualNodes.flatMap((node: any) => [
      node.person?.id,
      ...(node.members ?? []).map((member: any) => member.person?.id),
    ]).filter(Boolean),
  ).size;
  const totalHours = visualNodes.reduce((acc: number, node: any) => {
    const memberHours = (node.members ?? []).reduce((sum: number, member: any) => sum + (member.weeklyHours ?? 0), 0);
    return acc + (memberHours || node.weeklyHours || 0);
  }, 0);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <section className="mx-auto max-w-[1800px]">
        <Link href="/organigramas" className="inline-flex items-center gap-2 text-sm font-black text-blue-700 hover:text-blue-900">
          <ArrowLeft className="h-4 w-4" />
          Volver a organigramas
        </Link>

        <div className="mt-6">
          <div className="mb-6 flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-end">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-blue-700">
                <GitBranch className="h-4 w-4" />
                Organigrama institucional
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">{school.name}</h1>
              <p className="mt-2 text-slate-600">{school.city} · {school.province}</p>
            </div>

            {currentChart ? (
              <div className="flex flex-wrap gap-3">
                <Badge>Año {currentChart.year}</Badge>
                <Badge>Versión {currentChart.version ?? 1}</Badge>
                <Badge>{currentChart.status}</Badge>
                <Badge>{totalPeople} personas</Badge>
                <Badge>{totalHours} hs.</Badge>
                <Link href={`/organigramas/${school.slug}/editar`} className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-800">
                  <Edit3 className="h-4 w-4" /> Editar
                </Link>
              </div>
            ) : null}
          </div>

          {currentChart && visualNodes.length > 0 ? (
            <OrgChartCanvas nodes={visualNodes} edges={visualEdges} />
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h2 className="text-xl font-black text-slate-950">Este colegio todavía no tiene nodos cargados</h2>
              <p className="mx-auto mt-3 max-w-2xl text-slate-600">Entrá al editor para cargar cargos, personas, horas y relaciones.</p>
              <Link href={`/organigramas/${school.slug}/editar`} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800">
                <Edit3 className="h-4 w-4" /> Abrir editor
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">{children}</span>;
}
