import { notFound } from "next/navigation";
import { PucaraOrgChart } from "../../../components/organigramas/PucaraOrgChart";
import { prisma } from "../../../lib/prisma";
import { parseEdgeLabelStorage } from "../../../lib/org-edge-route";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{
    organigrama?: string | string[];
    modo?: string | string[];
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { schoolSlug } = await params;
  const school = await prisma.school.findUnique({ where: { slug: schoolSlug } });

  if (!school) return { title: "Organigrama no encontrado" };

  return {
    title: `Organigrama ${school.name} | APDES`,
    description: `Organigrama institucional navegable y editable del colegio ${school.name}.`,
  };
}

export default async function SchoolOrganigramaPage({ params, searchParams }: PageProps) {
  const { schoolSlug } = await params;
  const search = await searchParams;
  const requestedParam = search.organigrama;
  const requestedId = Array.isArray(requestedParam) ? requestedParam[0] : requestedParam;
  const modeParam = Array.isArray(search.modo) ? search.modo[0] : search.modo;
  const initialMode = modeParam === "editar" ? "edit" : "view";

  const school = await (prisma as any).school.findUnique({
    where: { slug: schoolSlug },
    include: {
      people: {
        where: { active: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      },
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
          // IMPORTANTE: cargamos TODAS las relaciones. La jerarquía se ve
          // siempre y los vínculos Integra/Colabora solo aparecen al tocar
          // una caja, evitando una telaraña permanente.
          edges: true,
        },
      },
    },
  });

  if (!school) notFound();

  const currentChart =
    school.orgCharts.find((chart: any) => chart.id === requestedId) ??
    school.orgCharts[0] ??
    null;

  const nodes = (currentChart?.nodes ?? []).map((node: any) => ({
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
    person: node.person,
    members: node.members ?? [],
  }));

  const edges = (currentChart?.edges ?? []).map((edge: any) => {
    const stored = parseEdgeLabelStorage(edge.label);
    return {
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      type: edge.type,
      label: stored.label,
    };
  });

  const people = (school.people ?? []).map((person: any) => ({
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    email: person.email,
    photoUrl: person.photoUrl,
  }));

  const availableCharts = (school.orgCharts ?? []).map((chart: any) => ({
    id: chart.id,
    title: chart.title,
    year: chart.year,
    version: chart.version ?? 1,
    status: chart.status,
  }));

  return (
    <PucaraOrgChart
      schoolSlug={school.slug}
      schoolName={school.name}
      schoolLogoUrl={school.logoUrl}
      orgChartId={currentChart?.id ?? ""}
      orgChartTitle={currentChart?.title ?? "Todavía no hay un organigrama creado"}
      initialNodes={nodes}
      initialEdges={edges}
      existingPeople={people}
      initialMode={initialMode}
      availableCharts={availableCharts}
    />
  );
}
