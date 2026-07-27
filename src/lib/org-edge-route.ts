export type StoredEdgeRoute = {
  orientation: "horizontal" | "vertical";
  offset: number;
};

const ROUTE_PREFIX = "[[APDES_ROUTE:";
const ROUTE_SUFFIX = "]]";

export function parseEdgeLabelStorage(value: string | null | undefined): {
  label: string | null;
  route: StoredEdgeRoute | null;
} {
  if (!value) return { label: null, route: null };

  const markerIndex = value.lastIndexOf(`\n${ROUTE_PREFIX}`);
  const inlineIndex = value.startsWith(ROUTE_PREFIX) ? 0 : -1;
  const index = markerIndex >= 0 ? markerIndex + 1 : inlineIndex;

  if (index < 0 || !value.endsWith(ROUTE_SUFFIX)) {
    return { label: value.trim() || null, route: null };
  }

  const jsonStart = index + ROUTE_PREFIX.length;
  const jsonEnd = value.length - ROUTE_SUFFIX.length;
  const rawJson = value.slice(jsonStart, jsonEnd);
  const visibleLabel = value.slice(0, markerIndex >= 0 ? markerIndex : 0).trim();

  try {
    const parsed = JSON.parse(rawJson) as Partial<StoredEdgeRoute>;
    if (
      (parsed.orientation === "horizontal" || parsed.orientation === "vertical") &&
      typeof parsed.offset === "number" &&
      Number.isFinite(parsed.offset)
    ) {
      return {
        label: visibleLabel || null,
        route: {
          orientation: parsed.orientation,
          offset: parsed.offset,
        },
      };
    }
  } catch {
    // Si el metadato quedó corrupto, mostramos la etiqueta completa y no rompemos el organigrama.
  }

  return { label: value.trim() || null, route: null };
}

export function packEdgeLabelStorage(
  label: string | null | undefined,
  route: StoredEdgeRoute | null | undefined,
) {
  const visible = label?.trim() || "";
  if (!route) return visible || null;

  const metadata = `${ROUTE_PREFIX}${JSON.stringify(route)}${ROUTE_SUFFIX}`;
  return visible ? `${visible}\n${metadata}` : metadata;
}
