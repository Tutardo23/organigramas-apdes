import { notFound } from "next/navigation";
import { PucaraOrgChart } from "../../../../components/organigramas/PucaraOrgChart";
import { prisma } from "../../../../lib/prisma";
import { parseEdgeLabelStorage } from "../../../../lib/org-edge-route";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{ organigrama?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { schoolSlug } = await params;
  const school = await prisma.school.findUnique({ where: { slug: schoolSlug } });
  return {
    title: school ? `Organigrama ${school.name} | APDES` : "Organigrama",
    description: school
      ? `Organigrama jerárquico simple y editable de ${school.name}.`
      : "Organigrama jerárquico institucional.",
  };
}

export default async function PucaraOrganigramaPage({ params, searchParams }: PageProps) {
  const { schoolSlug } = await params;
  const requested = (await searchParams).organigrama;
  const requestedId = Array.isArray(requested) ? requested[0] : requested;

  const school = await (prisma as any).school.findUnique({
    where: { slug: schoolSlug },
    include: {
      people: {
        where: { active: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      },
      orgCharts: {
        orderBy: [{ year: "desc" }, { version: "desc" }, { createdAt: "desc" }],
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

  const chart = school.orgCharts.find((item: any) => item.id === requestedId) ?? school.orgCharts[0] ?? null;

  const nodes = (chart?.nodes ?? []).map((node: any) => ({
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

  const edges = (chart?.edges ?? [])
    .filter((edge: any) => edge.type === "JERARQUICA")
    .map((edge: any) => {
      const stored = parseEdgeLabelStorage(edge.label);
      return {
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        type: edge.type,
        label: stored.label,
      };
    });

  return (
    <PucaraOrgChart
      schoolSlug={school.slug}
      schoolName={school.name}
      schoolLogoUrl={school.logoUrl}
      orgChartId={chart?.id ?? ""}
      orgChartTitle={chart?.title ?? "Todavía no hay un organigrama creado"}
      initialNodes={nodes}
      initialEdges={edges}
      existingPeople={(school.people ?? []).map((person: any) => ({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        photoUrl: person.photoUrl,
      }))}
    />
  );
}
