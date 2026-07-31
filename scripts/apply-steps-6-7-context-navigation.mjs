import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const target = path.join(
  root,
  "src",
  "components",
  "organigramas",
  "OrgChartCanvas.tsx",
);

let source = await readFile(target, "utf8");

function replaceOnce(label, before, after) {
  const index = source.indexOf(before);
  if (index === -1) {
    throw new Error(
      `No encontré el bloque requerido: ${label}. No se modificó el archivo. Confirmá que los Pasos 2 al 5 estén aplicados.`,
    );
  }

  if (source.indexOf(before, index + before.length) !== -1) {
    console.warn(
      `Aviso: el bloque “${label}” aparece más de una vez; se modifica solo el primero.`,
    );
  }

  source = source.slice(0, index) + after + source.slice(index + before.length);
}

function replaceBetween(label, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start === -1) {
    throw new Error(
      `No encontré el comienzo requerido: ${label}. No se modificó el archivo.`,
    );
  }

  const end = source.indexOf(endMarker, start);
  if (end === -1) {
    throw new Error(
      `No encontré el final requerido: ${label}. No se modificó el archivo.`,
    );
  }

  source = source.slice(0, start) + replacement + source.slice(end);
}

function insertBeforeOnce(label, marker, insertion) {
  const index = source.indexOf(marker);
  if (index === -1) {
    throw new Error(
      `No encontré el punto de inserción: ${label}. No se modificó el archivo.`,
    );
  }

  source = source.slice(0, index) + insertion + source.slice(index);
}

// PASO 7: reemplazamos solamente las herramientas de cámara de Explorar.
// La vista normal y el editor usan cameraMode="default" y no muestran estos controles.
replaceBetween(
  "herramientas de cámara y navegación",
  "function InstitutionalCameraTools({",
  "function defaultExternalRelationRoute(",
  `function InstitutionalCameraTools({
  enabled,
  selectedNodeId,
  parentNodeId,
  childNodeIds,
  areaNodeId,
  onSelectNode,
  onViewAll,
}: {
  enabled: boolean;
  selectedNodeId: string | null;
  parentNodeId: string | null;
  childNodeIds: string[];
  areaNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onViewAll: () => void;
}) {
  const { fitView, getNode, getNodes, setCenter } = useReactFlow();

  function fitNodeIds(
    nodeIds: string[],
    options: { padding?: number; maxZoom?: number } = {},
  ) {
    const validIds = new Set(nodeIds);
    const visibleNodes = getNodes().filter((node) => validIds.has(node.id));
    if (visibleNodes.length === 0) return;

    void fitView({
      nodes: visibleNodes.map((node) => ({ id: node.id })),
      duration: 650,
      padding: options.padding ?? 0.22,
      minZoom: 0.1,
      maxZoom: options.maxZoom ?? 0.84,
    });
  }

  useEffect(() => {
    if (!enabled || !selectedNodeId) return;

    const timeout = window.setTimeout(() => {
      const selectedNode = getNode(selectedNodeId);
      if (!selectedNode) return;

      const selectedData = selectedNode.data as InstitutionalMapNodeData;

      // Una barra azul representa el área completa: se encuadra la sección sin
      // cambiar posiciones, ocultar cajas ni recalcular el organigrama.
      if (selectedData.mapState?.kind === "section") {
        const selectedSection = sectionForNode(selectedData);
        const sectionNodes = getNodes().filter((candidate) => {
          const candidateData = candidate.data as
            | InstitutionalMapNodeData
            | undefined;

          return (
            Boolean(candidateData) &&
            sectionForNode(candidateData!) === selectedSection
          );
        });

        if (sectionNodes.length > 0) {
          void fitView({
            nodes: sectionNodes.map((node) => ({ id: node.id })),
            duration: 650,
            padding: 0.18,
            minZoom: 0.1,
            maxZoom: 0.78,
          });
          return;
        }
      }

      // Una caja común conserva el enfoque individual estable.
      const width = selectedNode.width ?? 190;
      const height = selectedNode.height ?? 90;
      void setCenter(
        selectedNode.position.x + width / 2,
        selectedNode.position.y + height / 2,
        { zoom: 0.82, duration: 650 },
      );
    }, 40);

    return () => window.clearTimeout(timeout);
  }, [
    enabled,
    fitView,
    getNode,
    getNodes,
    selectedNodeId,
    setCenter,
  ]);

  if (!enabled) return null;

  const hasSelection = Boolean(selectedNodeId);
  const canReturnToArea = Boolean(
    areaNodeId && selectedNodeId && areaNodeId !== selectedNodeId,
  );

  return (
    <Panel position="top-left" className="!m-4">
      <div className="flex max-w-[calc(100vw-7rem)] flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
        {hasSelection && parentNodeId ? (
          <button
            type="button"
            onClick={() => onSelectNode(parentNodeId)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            ↑ Subir al superior
          </button>
        ) : null}

        {hasSelection && childNodeIds.length > 0 ? (
          <button
            type="button"
            onClick={() =>
              fitNodeIds(
                [selectedNodeId!, ...childNodeIds],
                { padding: 0.24, maxZoom: 0.86 },
              )
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            ↓ Ver {childNodeIds.length === 1 ? "hijo" : childNodeIds.length + " hijos"}
          </button>
        ) : null}

        {hasSelection && canReturnToArea ? (
          <button
            type="button"
            onClick={() => onSelectNode(areaNodeId)}
            className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
          >
            Volver al área
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            onViewAll();
            window.setTimeout(() => {
              void fitView({
                duration: 650,
                padding: 0.06,
                minZoom: 0.04,
                maxZoom: 0.72,
              });
            }, 0);
          }}
          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-slate-700"
        >
          Ver todo
        </button>
      </div>
    </Panel>
  );
}

`,
);

// PASO 6: calculamos únicamente el contexto inmediato de la caja seleccionada.
// Incluye superior, hijos, barra de área y relaciones directas visibles.
insertBeforeOnce(
  "contexto jerárquico de la selección",
  `  const baseFlowNodes = useMemo<Node<InstitutionalMapNodeData>[]>(`,
  `  const cameraHierarchyContext = useMemo(() => {
    const emptyContext = {
      active: false,
      parentNodeIds: [] as string[],
      childNodeIds: [] as string[],
      areaNodeId: null as string | null,
      contextNodeIds: new Set<string>(),
    };

    if (
      cameraMode !== "focus" ||
      !selectedNode ||
      isSectionHeader(selectedNode)
    ) {
      return emptyContext;
    }

    const hierarchyPairs: Array<{ sourceId: string; targetId: string }> = edges
      .filter((edge) => edge.type === "JERARQUICA")
      .map((edge) => ({
        sourceId: edge.sourceId,
        targetId: edge.targetId,
      }));

    // La composición Institucional dibuja estas uniones visuales aunque no
    // siempre estén guardadas como relaciones físicas en la base.
    if (director && council) {
      hierarchyPairs.push({ sourceId: director.id, targetId: council.id });
    }

    if (council) {
      for (const header of layout.sectionHeaderByKey.values()) {
        hierarchyPairs.push({ sourceId: council.id, targetId: header.id });
      }
    }

    const parentNodeIds = [
      ...new Set(
        hierarchyPairs
          .filter((edge) => edge.targetId === selectedNode.id)
          .map((edge) => edge.sourceId),
      ),
    ].filter((nodeId) => nodeById.has(nodeId));

    const childNodeIds = [
      ...new Set(
        hierarchyPairs
          .filter((edge) => edge.sourceId === selectedNode.id)
          .map((edge) => edge.targetId),
      ),
    ].filter((nodeId) => nodeById.has(nodeId));

    const selectedSection = sectionForNode(selectedNode);
    const areaNodeId =
      selectedSection === "governance"
        ? null
        : layout.sectionHeaderByKey.get(selectedSection)?.id ?? null;

    const contextNodeIds = new Set<string>([
      selectedNode.id,
      ...parentNodeIds,
      ...childNodeIds,
    ]);

    if (areaNodeId) contextNodeIds.add(areaNodeId);

    // Cuando el usuario activa Colabora/Integra/Todas, también conservamos
    // visibles los extremos directos de esas relaciones de la caja elegida.
    if (relationMode !== "structure") {
      for (const edge of edges) {
        if (edge.type === "JERARQUICA") continue;
        if (edge.sourceId === selectedNode.id) contextNodeIds.add(edge.targetId);
        if (edge.targetId === selectedNode.id) contextNodeIds.add(edge.sourceId);
      }
    }

    return {
      active: true,
      parentNodeIds,
      childNodeIds,
      areaNodeId,
      contextNodeIds,
    };
  }, [
    cameraMode,
    council,
    director,
    edges,
    layout.sectionHeaderByKey,
    nodeById,
    relationMode,
    selectedNode,
  ]);

`,
);

replaceOnce(
  "atenuar fuera del contexto inmediato",
  `              dimmed:
                cameraFocusedSection !== null
                  ? sectionForNode(node) !== cameraFocusedSection &&
                    sectionForNode(node) !== "governance"
                  : relationScope === "focus" &&
                    Boolean(selectedNodeId) &&
                    relationMode !== "structure" &&
                    highlightedNodeIds.size > 1 &&
                    !highlightedNodeIds.has(node.id),`,
  `              dimmed:
                cameraFocusedSection !== null
                  ? sectionForNode(node) !== cameraFocusedSection &&
                    sectionForNode(node) !== "governance"
                  : cameraHierarchyContext.active
                    ? !cameraHierarchyContext.contextNodeIds.has(node.id)
                    : relationScope === "focus" &&
                      Boolean(selectedNodeId) &&
                      relationMode !== "structure" &&
                      highlightedNodeIds.size > 1 &&
                      !highlightedNodeIds.has(node.id),`,
);

replaceOnce(
  "resaltar superior, hijos y área",
  `              emphasized:
                Boolean(selectedNodeId) &&
                node.id !== selectedNodeId &&
                highlightedNodeIds.has(node.id),`,
  `              emphasized:
                cameraHierarchyContext.active &&
                node.id !== selectedNodeId &&
                cameraHierarchyContext.contextNodeIds.has(node.id)
                  ? true
                  : Boolean(selectedNodeId) &&
                    node.id !== selectedNodeId &&
                    highlightedNodeIds.has(node.id),`,
);

replaceOnce(
  "dependencia del contexto inmediato",
  `    [
      cameraFocusedSection,
      editable,
      highlightedNodeIds,`,
  `    [
      cameraFocusedSection,
      cameraHierarchyContext,
      editable,
      highlightedNodeIds,`,
);

replaceOnce(
  "mensaje de foco contextual",
  `      {cameraMode === "focus" && cameraFocusedSection && selectedNode ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 bg-blue-50/70 px-4 py-2.5 text-xs font-semibold text-blue-950 sm:px-6">
          <span>
            Área enfocada: <strong>{selectedNode.title}</strong>. Las demás áreas
            quedan atenuadas, pero siguen en su posición original.
          </span>
          <span className="font-black text-blue-700">
            Usá “Ver todo” para regresar.
          </span>
        </div>
      ) : null}`,
  `      {cameraMode === "focus" && cameraFocusedSection && selectedNode ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 bg-blue-50/70 px-4 py-2.5 text-xs font-semibold text-blue-950 sm:px-6">
          <span>
            Área enfocada: <strong>{selectedNode.title}</strong>. Las demás áreas
            quedan atenuadas, pero siguen en su posición original.
          </span>
          <span className="font-black text-blue-700">
            Usá “Ver todo” para regresar.
          </span>
        </div>
      ) : cameraMode === "focus" && cameraHierarchyContext.active && selectedNode ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-50/70 px-4 py-2.5 text-xs font-semibold text-emerald-950 sm:px-6">
          <span>
            En foco: <strong>{selectedNode.title}</strong>. Se mantienen destacados
            su superior, sus hijos directos y su barra de área.
          </span>
          <span className="font-black text-emerald-700">
            {cameraHierarchyContext.parentNodeIds.length} superior · {cameraHierarchyContext.childNodeIds.length} dependientes
          </span>
        </div>
      ) : null}`,
);

replaceOnce(
  "pasar navegación a las herramientas de cámara",
  `          <InstitutionalCameraTools
            enabled={cameraMode === "focus"}
            selectedNodeId={selectedNodeId}
            onViewAll={() => onNodeSelect(null)}
          />`,
  `          <InstitutionalCameraTools
            enabled={cameraMode === "focus"}
            selectedNodeId={selectedNodeId}
            parentNodeId={cameraHierarchyContext.parentNodeIds[0] ?? null}
            childNodeIds={cameraHierarchyContext.childNodeIds}
            areaNodeId={cameraHierarchyContext.areaNodeId}
            onSelectNode={onNodeSelect}
            onViewAll={() => onNodeSelect(null)}
          />`,
);

await writeFile(target, source, "utf8");
console.log(
  "Pasos 6 y 7 aplicados: foco contextual inmediato y navegación por superior, hijos, área y vista completa.",
);
