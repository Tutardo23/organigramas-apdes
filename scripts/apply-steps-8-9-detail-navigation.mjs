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

if (source.includes('detailMode?: "automatic" | "manual";')) {
  console.log("Los Pasos 8 y 9 ya estaban aplicados. No se hicieron cambios.");
  process.exit(0);
}

function replaceOnce(label, before, after) {
  const index = source.indexOf(before);
  if (index === -1) {
    throw new Error(
      `No encontré el bloque requerido: ${label}. No se modificó el archivo. Confirmá que los Pasos 2 al 7 estén aplicados.`,
    );
  }

  if (source.indexOf(before, index + before.length) !== -1) {
    console.warn(
      `Aviso: el bloque “${label}” aparece más de una vez; se modifica solo el primero.`,
    );
  }

  source = source.slice(0, index) + after + source.slice(index + before.length);
}

// PASO 8: Explorar conserva la selección para navegar y el detalle deja de
// abrirse automáticamente. La vista normal mantiene el comportamiento previo.
replaceOnce(
  "prop detailMode",
  `  cameraMode?: "default" | "focus";\n  onNodeSelect?: (nodeId: string | null) => void;`,
  `  cameraMode?: "default" | "focus";\n  detailMode?: "automatic" | "manual";\n  onNodeSelect?: (nodeId: string | null) => void;`,
);

replaceOnce(
  "callback para abrir el detalle desde la navegación",
  `  areaNodeId,\n  onSelectNode,\n  onViewAll,`,
  `  areaNodeId,\n  onSelectNode,\n  onOpenDetail,\n  onViewAll,`,
);

replaceOnce(
  "tipo del callback de detalle",
  `  areaNodeId: string | null;\n  onSelectNode: (nodeId: string | null) => void;\n  onViewAll: () => void;`,
  `  areaNodeId: string | null;\n  onSelectNode: (nodeId: string | null) => void;\n  onOpenDetail: () => void;\n  onViewAll: () => void;`,
);

replaceOnce(
  "botón Ver detalle separado",
  `        {hasSelection && canReturnToArea ? (\n          <button\n            type="button"\n            onClick={() => onSelectNode(areaNodeId)}\n            className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"\n          >\n            Volver al área\n          </button>\n        ) : null}\n\n        <button`,
  `        {hasSelection && canReturnToArea ? (\n          <button\n            type="button"\n            onClick={() => onSelectNode(areaNodeId)}\n            className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"\n          >\n            Volver al área\n          </button>\n        ) : null}\n\n        {hasSelection ? (\n          <button\n            type="button"\n            onClick={onOpenDetail}\n            className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"\n          >\n            Ver detalle\n          </button>\n        ) : null}\n\n        <button`,
);

replaceOnce(
  "detailMode en InstitutionalOrgChartCanvas",
  `  hideDetailDrawer = false,\n  cameraMode = "default",\n  onNodeSelect,`,
  `  hideDetailDrawer = false,\n  cameraMode = "default",\n  detailMode = "automatic",\n  onNodeSelect,`,
);

replaceOnce(
  "estado independiente del detalle",
  `  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);`,
  `  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);\n  const [manualDetailOpen, setManualDetailOpen] = useState(false);`,
);

replaceOnce(
  "cerrar detalle al cambiar de caja sin perder la navegación",
  `  function selectNode(nodeId: string | null) {\n    if (controlledSelectedNodeId === undefined) {\n      setInternalSelectedNodeId(nodeId);\n    }\n    setSelectedEdgeId(null);\n    onNodeSelect?.(nodeId);\n  }`,
  `  function selectNode(nodeId: string | null) {\n    if (controlledSelectedNodeId === undefined) {\n      setInternalSelectedNodeId(nodeId);\n    }\n    if (detailMode === "manual") {\n      setManualDetailOpen(false);\n    }\n    setSelectedEdgeId(null);\n    onNodeSelect?.(nodeId);\n  }`,
);

replaceOnce(
  "abrir detalle desde las herramientas",
  `            areaNodeId={cameraHierarchyContext.areaNodeId}\n            onSelectNode={onNodeSelect}\n            onViewAll={() => onNodeSelect(null)}`,
  `            areaNodeId={cameraHierarchyContext.areaNodeId}\n            onSelectNode={onNodeSelect}\n            onOpenDetail={() => setManualDetailOpen(true)}\n            onViewAll={() => onNodeSelect(null)}`,
);

// PASO 9: cerrar el panel lateral solo cierra el panel. La caja continúa
// seleccionada, el foco y la barra de navegación permanecen activos.
replaceOnce(
  "condición manual del panel de detalle",
  `      {!hideDetailDrawer && selectedNode ? (`,
  `      {!hideDetailDrawer &&\n      selectedNode &&\n      (detailMode === "automatic" || manualDetailOpen) ? (`,
);

replaceOnce(
  "cerrar panel sin limpiar selección",
  `          onClose={() => selectNode(null)}`,
  `          onClose={() => {\n            if (detailMode === "manual") {\n              setManualDetailOpen(false);\n            } else {\n              selectNode(null);\n            }\n          }}`,
);

replaceOnce(
  "detailMode en OrgChartCanvas exportado",
  `  hideDetailDrawer,\n  cameraMode,\n  onNodeSelect,`,
  `  hideDetailDrawer,\n  cameraMode,\n  detailMode,\n  onNodeSelect,`,
);

replaceOnce(
  "pasar detailMode al canvas institucional",
  `      hideDetailDrawer={hideDetailDrawer}\n      cameraMode={cameraMode}\n      onNodeSelect={onNodeSelect}`,
  `      hideDetailDrawer={hideDetailDrawer}\n      cameraMode={cameraMode}\n      detailMode={detailMode}\n      onNodeSelect={onNodeSelect}`,
);

await writeFile(target, source, "utf8");
console.log(
  "Pasos 8 y 9 aplicados: detalle manual en Explorar y cierre sin perder la selección ni la navegación.",
);
