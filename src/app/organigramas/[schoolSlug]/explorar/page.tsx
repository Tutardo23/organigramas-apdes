import Link from "next/link";
import { ArrowLeft, Compass, Edit3, GitBranch, Home } from "lucide-react";
import { notFound } from "next/navigation";
import { OrgChartCanvas } from "../../../../components/organigramas/OrgChartCanvas";
import { prisma } from "../../../../lib/prisma";
import { parseEdgeLabelStorage } from "../../../../lib/org-edge-route";

type PageProps = {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{ organigrama?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { schoolSlug } = await params;
  const school = await prisma.school.findUnique({
    where: { slug: schoolSlug },
  });

  if (!school) {
    return { title: "Organigrama no encontrado" };
  }

  return {
    title: `Explorar organigrama de ${school.name} | APDES`,
    description: `Vista experimental y segura del organigrama institucional de ${school.name}.`,
  };
}

export default async function ExploreSchoolOrganigramaPage({
  params,
  searchParams,
}: PageProps) {
  const { schoolSlug } = await params;
  const requestedChartParam = (await searchParams).organigrama;
  const requestedChartId = Array.isArray(requestedChartParam)
    ? requestedChartParam[0]
    : requestedChartParam;

  const school = await (prisma as any).school.findUnique({
    where: { slug: schoolSlug },
    include: {
      orgCharts: {
        orderBy: [
          { year: "desc" },
          { version: "desc" },
          { createdAt: "desc" },
        ],
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
        },
      },
    },
  });

  if (!school) notFound();

  const currentChart =
    school.orgCharts.find((chart: any) => chart.id === requestedChartId) ??
    school.orgCharts[0];

  const visualNodes =
    currentChart?.nodes.map((node: any) => ({
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

  const visualEdges =
    currentChart?.edges.map((edge: any) => {
      const stored = parseEdgeLabelStorage(edge.label);

      return {
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        type: edge.type,
        label: stored.label,
        routeOrientation: stored.route?.orientation ?? null,
        routeOffset: stored.route?.offset ?? null,
      };
    }) ?? [];

  const normalViewHref = currentChart
    ? `/organigramas/${school.slug}?organigrama=${currentChart.id}`
    : `/organigramas/${school.slug}`;

  const editHref = currentChart
    ? `/organigramas/${school.slug}/editar?organigrama=${currentChart.id}`
    : `/organigramas/${school.slug}/editar`;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-[1800px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Link
              href={normalViewHref}
              className="inline-flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al organigrama
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-slate-900"
            >
              <Home className="h-4 w-4" />
              Menú principal
            </Link>
          </div>

          {currentChart ? (
            <Link
              href={editHref}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
            >
              <Edit3 className="h-4 w-4" />
              Abrir editor estable
            </Link>
          ) : null}
        </div>

        <div className="mt-5 rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white to-blue-50/60 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                <Compass className="h-4 w-4" />
                Prueba separada · Paso 2
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Explorar el organigrama de {school.name}
              </h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-relaxed text-slate-600">
                Esta ruta usa el mismo organigrama estable, con sus posiciones y
                relaciones actuales. Tocá una caja para acercar la cámara y usá
                “Ver todo” para volver al encuadre completo.
              </p>
            </div>

            {currentChart ? (
              <div className="flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-white px-3 py-2 text-blue-700 shadow-sm ring-1 ring-blue-100">
                  Año {currentChart.year}
                </span>
                <span className="rounded-full bg-white px-3 py-2 text-slate-600 shadow-sm ring-1 ring-slate-200">
                  Versión {currentChart.version ?? 1}
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700 ring-1 ring-emerald-100">
                  Base estable
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          {currentChart && visualNodes.length > 0 ? (
            <OrgChartCanvas
              nodes={visualNodes}
              edges={visualEdges}
              schoolSlug={school.slug}
              orgChartId={currentChart.id}
              orgChartTitle={currentChart.title}
              cameraMode="focus"
            />
          ) : (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
              <GitBranch className="mx-auto h-8 w-8 text-slate-400" />
              <h2 className="mt-4 text-xl font-black text-slate-950">
                Este colegio todavía no tiene un organigrama cargado
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold text-slate-600">
                Creá o completá el organigrama desde el editor estable antes de
                probar esta vista.
              </p>
              <Link
                href={editHref}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800"
              >
                <Edit3 className="h-4 w-4" />
                Abrir editor
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
