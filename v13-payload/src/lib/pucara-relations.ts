export type PucaraRelationView = "all" | "integration" | "collaboration";

export type PucaraRelationLike = {
  type: string;
  sourceId: string;
  targetId: string;
};

export function pucaraRelationMatchesView(
  edge: Pick<PucaraRelationLike, "type">,
  view: PucaraRelationView,
) {
  if (view === "integration") return edge.type === "DECISION";
  if (view === "collaboration") return edge.type === "COLABORACION";
  return edge.type === "DECISION" || edge.type === "COLABORACION";
}

export function countPucaraRelationsByView(
  edges: Array<Pick<PucaraRelationLike, "type">>,
) {
  let integration = 0;
  let collaboration = 0;

  for (const edge of edges) {
    if (edge.type === "DECISION") integration += 1;
    if (edge.type === "COLABORACION") collaboration += 1;
  }

  return {
    all: integration + collaboration,
    integration,
    collaboration,
  };
}

export function relatedPucaraNodeIds(
  edges: PucaraRelationLike[],
  focusNodeId: string,
  view: PucaraRelationView,
) {
  const related = new Set<string>();

  for (const edge of edges) {
    if (!pucaraRelationMatchesView(edge, view)) continue;
    if (edge.sourceId === focusNodeId) related.add(edge.targetId);
    if (edge.targetId === focusNodeId) related.add(edge.sourceId);
  }

  return related;
}
