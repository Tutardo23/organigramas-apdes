export type RelationAreaFilter = "collaboration" | "integration" | "all";

export type RelationAreaNode = {
  id: string;
  title: string;
  area: string;
  positionX: number;
  positionY: number;
};

export type RelationAreaEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
};

export type RelationAreaScene = {
  visibleNodeIds: Set<string>;
  visibleRelationIds: Set<string>;
  visibleHierarchyIds: Set<string>;
  groupKeyByNodeId: Map<string, string>;
  groupOrder: string[];
  selectedGroupKey: string | null;
};

const HIERARCHY_TYPE = "JERARQUICA";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isSectionHeader(title: string) {
  const normalized = normalize(title);
  return normalized.startsWith("area ") || normalized.startsWith("area de ");
}

export function relationMatchesAreaFilter(
  edge: Pick<RelationAreaEdge, "type">,
  filter: RelationAreaFilter,
) {
  if (edge.type === HIERARCHY_TYPE) return false;
  if (filter === "all") return true;
  if (filter === "integration") return edge.type === "DECISION";
  return edge.type !== "DECISION";
}

function createGroupIndex(
  nodes: RelationAreaNode[],
  edges: RelationAreaEdge[],
) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const hierarchy = edges.filter((edge) => edge.type === HIERARCHY_TYPE);
  const parentsByNodeId = new Map<string, string[]>();

  for (const edge of hierarchy) {
    if (!nodeById.has(edge.sourceId) || !nodeById.has(edge.targetId)) continue;
    parentsByNodeId.set(edge.targetId, [
      ...(parentsByNodeId.get(edge.targetId) ?? []),
      edge.sourceId,
    ]);
  }

  const groupKeyByNodeId = new Map<string, string>();

  function resolveGroupKey(nodeId: string) {
    const cached = groupKeyByNodeId.get(nodeId);
    if (cached) return cached;

    const start = nodeById.get(nodeId);
    if (!start) return `node:${nodeId}`;

    let current = start;
    const visited = new Set<string>();

    while (!visited.has(current.id)) {
      visited.add(current.id);
      if (isSectionHeader(current.title)) {
        const key = `section:${current.id}`;
        for (const visitedId of visited) groupKeyByNodeId.set(visitedId, key);
        return key;
      }

      const parents = (parentsByNodeId.get(current.id) ?? [])
        .map((parentId) => nodeById.get(parentId))
        .filter((parent): parent is RelationAreaNode => Boolean(parent))
        .sort((a, b) => a.positionX - b.positionX);

      if (parents.length === 0) break;
      current = parents[0];
    }

    const normalizedArea = normalize(start.area);
    const key =
      normalizedArea && normalizedArea !== "otro"
        ? `area:${normalizedArea}`
        : `root:${current.id}`;
    for (const visitedId of visited) groupKeyByNodeId.set(visitedId, key);
    return key;
  }

  for (const node of nodes) resolveGroupKey(node.id);

  return groupKeyByNodeId;
}

export function buildRelationAreaScene(
  nodes: RelationAreaNode[],
  edges: RelationAreaEdge[],
  filter: RelationAreaFilter,
  selectedNodeId: string | null,
): RelationAreaScene {
  const groupKeyByNodeId = createGroupIndex(nodes, edges);
  const filteredRelations = edges.filter((edge) =>
    relationMatchesAreaFilter(edge, filter),
  );
  const selectedGroupKey = selectedNodeId
    ? groupKeyByNodeId.get(selectedNodeId) ?? null
    : null;

  const visibleRelations = selectedGroupKey
    ? filteredRelations.filter(
        (edge) =>
          groupKeyByNodeId.get(edge.sourceId) === selectedGroupKey ||
          groupKeyByNodeId.get(edge.targetId) === selectedGroupKey,
      )
    : filteredRelations;

  const visibleGroupKeys = new Set<string>();
  if (selectedGroupKey) visibleGroupKeys.add(selectedGroupKey);

  for (const edge of visibleRelations) {
    const sourceGroup = groupKeyByNodeId.get(edge.sourceId);
    const targetGroup = groupKeyByNodeId.get(edge.targetId);
    if (sourceGroup) visibleGroupKeys.add(sourceGroup);
    if (targetGroup) visibleGroupKeys.add(targetGroup);
  }

  // Una vista sin relaciones no debe dejar un lienzo vacío.
  if (visibleGroupKeys.size === 0) {
    for (const node of nodes) {
      const groupKey = groupKeyByNodeId.get(node.id);
      if (groupKey) visibleGroupKeys.add(groupKey);
    }
  }

  const visibleNodeIds = new Set(
    nodes
      .filter((node) => {
        const groupKey = groupKeyByNodeId.get(node.id);
        return Boolean(groupKey && visibleGroupKeys.has(groupKey));
      })
      .map((node) => node.id),
  );

  const visibleHierarchyIds = new Set(
    edges
      .filter(
        (edge) =>
          edge.type === HIERARCHY_TYPE &&
          visibleNodeIds.has(edge.sourceId) &&
          visibleNodeIds.has(edge.targetId),
      )
      .map((edge) => edge.id),
  );

  const groupMinX = new Map<string, number>();
  for (const node of nodes) {
    const groupKey = groupKeyByNodeId.get(node.id);
    if (!groupKey || !visibleGroupKeys.has(groupKey)) continue;
    groupMinX.set(
      groupKey,
      Math.min(groupMinX.get(groupKey) ?? Number.POSITIVE_INFINITY, node.positionX),
    );
  }

  const groupOrder = [...visibleGroupKeys].sort((a, b) => {
    if (a === selectedGroupKey) return -1;
    if (b === selectedGroupKey) return 1;
    return (groupMinX.get(a) ?? 0) - (groupMinX.get(b) ?? 0);
  });

  return {
    visibleNodeIds,
    visibleRelationIds: new Set(visibleRelations.map((edge) => edge.id)),
    visibleHierarchyIds,
    groupKeyByNodeId,
    groupOrder,
    selectedGroupKey,
  };
}

export function arrangeRelationAreaScene(
  nodes: RelationAreaNode[],
  scene: RelationAreaScene,
) {
  const positions = new Map<string, { x: number; y: number }>();
  const laneGap = 260;
  const minimumLaneWidth = 760;
  let laneX = 100;

  for (const groupKey of scene.groupOrder) {
    const groupNodes = nodes.filter(
      (node) =>
        scene.visibleNodeIds.has(node.id) &&
        scene.groupKeyByNodeId.get(node.id) === groupKey,
    );
    if (groupNodes.length === 0) continue;

    const minX = Math.min(...groupNodes.map((node) => node.positionX));
    const maxX = Math.max(...groupNodes.map((node) => node.positionX));
    const minY = Math.min(...groupNodes.map((node) => node.positionY));
    const laneWidth = Math.max(minimumLaneWidth, maxX - minX + 260);

    for (const node of groupNodes) {
      positions.set(node.id, {
        x: laneX + node.positionX - minX,
        y: 100 + node.positionY - minY,
      });
    }

    laneX += laneWidth + laneGap;
  }

  return positions;
}
