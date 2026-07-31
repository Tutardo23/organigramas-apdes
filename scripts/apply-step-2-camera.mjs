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
    throw new Error(`No encontré el bloque requerido: ${label}. No se modificó el archivo.`);
  }
  if (source.indexOf(before, index + before.length) !== -1) {
    console.warn(`Aviso: el bloque “${label}” aparece más de una vez; se modifica solo el primero.`);
  }
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  "importar Panel",
  `  MarkerType,\n  Position,`,
  `  MarkerType,\n  Panel,\n  Position,`,
);

replaceOnce(
  "prop cameraMode",
  `  hideDetailDrawer?: boolean;\n  onNodeSelect?: (nodeId: string | null) => void;`,
  `  hideDetailDrawer?: boolean;\n  cameraMode?: "default" | "focus";\n  onNodeSelect?: (nodeId: string | null) => void;`,
);

replaceOnce(
  "herramientas de cámara",
  `const edgeTypes = {\n  movableRelationEdge: MovableRelationEdge,\n};\n`,
  `const edgeTypes = {\n  movableRelationEdge: MovableRelationEdge,\n};\n\nfunction InstitutionalCameraTools({\n  enabled,\n  selectedNodeId,\n  onViewAll,\n}: {\n  enabled: boolean;\n  selectedNodeId: string | null;\n  onViewAll: () => void;\n}) {\n  const { fitView, getNode, setCenter } = useReactFlow();\n\n  useEffect(() => {\n    if (!enabled || !selectedNodeId) return;\n\n    const timeout = window.setTimeout(() => {\n      const node = getNode(selectedNodeId);\n      if (!node) return;\n\n      const width = node.width ?? 190;\n      const height = node.height ?? 90;\n      void setCenter(\n        node.position.x + width / 2,\n        node.position.y + height / 2,\n        { zoom: 0.82, duration: 650 },\n      );\n    }, 40);\n\n    return () => window.clearTimeout(timeout);\n  }, [enabled, getNode, selectedNodeId, setCenter]);\n\n  if (!enabled) return null;\n\n  return (\n    <Panel position="top-left" className="!m-4">\n      <button\n        type="button"\n        onClick={() => {\n          onViewAll();\n          window.setTimeout(() => {\n            void fitView({\n              duration: 650,\n              padding: 0.06,\n              minZoom: 0.04,\n              maxZoom: 0.72,\n            });\n          }, 0);\n        }}\n        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-blue-700 shadow-md transition hover:border-blue-300 hover:bg-blue-50"\n      >\n        Ver todo\n      </button>\n    </Panel>\n  );\n}\n`,
);

replaceOnce(
  "cameraMode en StructuredInstitutionalCanvas",
  `  onEdgeRouteCommit,\n  onEdgeSelect,\n}: {`,
  `  onEdgeRouteCommit,\n  onEdgeSelect,\n  cameraMode,\n}: {`,
);

replaceOnce(
  "tipo cameraMode en StructuredInstitutionalCanvas",
  `  onEdgeRouteCommit?: (edgeId: string, route: ManualEdgeRoute | null) => void;\n  onEdgeSelect?: (edgeId: string) => void;\n}) {`,
  `  onEdgeRouteCommit?: (edgeId: string, route: ManualEdgeRoute | null) => void;\n  onEdgeSelect?: (edgeId: string) => void;\n  cameraMode?: "default" | "focus";\n}) {`,
);

replaceOnce(
  "control de cámara dentro de ReactFlow",
  `          onPaneClick={() => onNodeSelect(null)}\n        >\n          <Background`,
  `          onPaneClick={() => onNodeSelect(null)}\n        >\n          <InstitutionalCameraTools\n            enabled={cameraMode === "focus"}\n            selectedNodeId={selectedNodeId}\n            onViewAll={() => onNodeSelect(null)}\n          />\n          <Background`,
);

replaceOnce(
  "cameraMode en InstitutionalOrgChartCanvas",
  `  hideDetailDrawer = false,\n  onNodeSelect,`,
  `  hideDetailDrawer = false,\n  cameraMode = "default",\n  onNodeSelect,`,
);

replaceOnce(
  "pasar cameraMode al canvas institucional",
  `          onEdgeRouteCommit={commitEdgeRoute}\n          onEdgeSelect={selectEdge}\n        />`,
  `          onEdgeRouteCommit={commitEdgeRoute}\n          onEdgeSelect={selectEdge}\n          cameraMode={cameraMode}\n        />`,
);

replaceOnce(
  "cameraMode en OrgChartCanvas exportado",
  `  hideDetailDrawer,\n  onNodeSelect,`,
  `  hideDetailDrawer,\n  cameraMode,\n  onNodeSelect,`,
);

replaceOnce(
  "pasar cameraMode al wrapper institucional",
  `      hideDetailDrawer={hideDetailDrawer}\n      onNodeSelect={onNodeSelect}`,
  `      hideDetailDrawer={hideDetailDrawer}\n      cameraMode={cameraMode}\n      onNodeSelect={onNodeSelect}`,
);

await writeFile(target, source, "utf8");
console.log("Paso 2 aplicado: cámara al seleccionar + botón Ver todo.");
