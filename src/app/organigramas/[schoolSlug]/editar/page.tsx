import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { notFound } from "next/navigation";
import { OrgChartEditor } from "../../../../components/organigramas/OrgChartEditor";
import { prisma } from "../../../../lib/prisma";

type PageProps = {
  params: Promise<{ schoolSlug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { schoolSlug } = await params;
  const school = await prisma.school.findUnique({ where: { slug: schoolSlug } });

  if (!school) return { title: "Editor no encontrado" };

  return {
    title: `Editar organigrama ${school.name} | APDES`,
    description: `Editor visual del organigrama institucional del colegio ${school.name}.`,
  };
}

export default async function EditOrganigramaPage({ params }: PageProps) {
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
          reviewNotes: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!school) notFound();

  const currentChart = school.orgCharts[0];
  if (!currentChart) notFound();

  const initialNodes = currentChart.nodes.map((node: any) => ({
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
  }));

  const initialEdges = currentChart.edges.map((edge: any) => ({
    id: edge.id,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    type: edge.type,
    label: edge.label,
  }));

  const initialReviewNotes = (currentChart.reviewNotes ?? []).map((note: any) => ({
    id: note.id,
    nodeId: note.nodeId,
    title: note.title,
    body: note.body,
    status: note.status,
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5">
      <section className="mx-auto max-w-[1680px]">
        <div className="mb-5 flex flex-col gap-4 rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <Link href={`/organigramas/${school.slug}`} className="inline-flex items-center gap-2 text-sm font-black text-blue-700 hover:text-blue-900">
              <ArrowLeft className="h-4 w-4" />
              Volver a la vista del organigrama
            </Link>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-blue-700">Editor visual</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">{school.name}</h1>
            <p className="mt-1 max-w-3xl text-sm font-semibold leading-relaxed text-slate-500">
              Mové cajas con el mouse, tocá para editar, agregá personas con horas y usá la guía rápida para entender cada campo. Esta base después alimenta el tablero de talento.
            </p>
          </div>

          <Link href={`/organigramas/${school.slug}`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
            <Eye className="h-4 w-4" />
            Ver organigrama
          </Link>
        </div>

        <OrgChartEditor
          schoolSlug={school.slug}
          schoolName={school.name}
          orgChartId={currentChart.id}
          orgChartStatus={currentChart.status}
          orgChartVersion={currentChart.version ?? 1}
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          initialPeople={school.people}
          initialReviewNotes={initialReviewNotes}
        />
      </section>
    </main>
  );
}
