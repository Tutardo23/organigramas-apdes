type DesignNode = {
  title: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isElBuenAyreNewProposal(
  schoolSlug: string,
  nodes: DesignNode[],
  orgChartTitle?: string | null,
) {
  if (!normalize(schoolSlug).includes("buen-ayre")) return false;

  const normalizedChartTitle = normalize(orgChartTitle ?? "");
  const explicitlyNewProposal =
    normalizedChartTitle.includes("nueva propuesta") ||
    normalizedChartTitle.includes("nuevo formato") ||
    normalizedChartTitle.includes("diseno institucional");

  if (explicitlyNewProposal) return true;

  const titles = new Set(nodes.map((node) => normalize(node.title)));
  const hasAdmissionsCommittee = titles.has("comite de admisiones");
  const hasAcademicCouncil = titles.has("consejo academico");
  const executiveTeams = [...titles].filter((title) =>
    title.startsWith("equipo directivo"),
  ).length;

  return (
    nodes.length >= 40 &&
    hasAdmissionsCommittee &&
    hasAcademicCouncil &&
    executiveTeams >= 3
  );
}
