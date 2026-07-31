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
      `No encontré el bloque requerido: ${label}. No se modificó el archivo. Confirmá que los Pasos 2 y 3 estén aplicados.`,
    );
  }

  if (source.indexOf(before, index + before.length) !== -1) {
    console.warn(
      `Aviso: el bloque “${label}” aparece más de una vez; se modifica solo el primero.`,
    );
  }

  source = source.slice(0, index) + after + source.slice(index + before.length);
}

// PASO 4: la ruta Explorar abre limpia, mostrando solamente la jerarquía.
// La vista normal y el editor mantienen el estado inicial anterior.
replaceOnce(
  "estado inicial de relaciones en Explorar",
  `  const [canvasViewMode, setCanvasViewMode] = useState<CanvasViewMode>("institutional");
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [relationMode, setRelationMode] = useState<RelationMode>("all");`,
  `  const [canvasViewMode, setCanvasViewMode] = useState<CanvasViewMode>("institutional");
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [relationMode, setRelationMode] = useState<RelationMode>(() =>
    cameraMode === "focus" ? "structure" : "all",
  );`,
);

replaceOnce(
  "volver a Institucional conserva lectura limpia en Explorar",
  `                setCanvasViewMode("institutional");
                setRelationMode("all");
                selectNode(null);`,
  `                setCanvasViewMode("institutional");
                setRelationMode(cameraMode === "focus" ? "structure" : "all");
                selectNode(null);`,
);

// PASO 5: al seleccionar una barra de área, se atenúan las demás áreas.
// No se oculta, mueve ni recalcula ninguna caja.
replaceOnce(
  "detectar área enfocada por cámara",
  `  const selectedNode = selectedNodeId
    ? nodeById.get(selectedNodeId) ?? null
    : null;

  const nodesBySection = useMemo(() => {`,
  `  const selectedNode = selectedNodeId
    ? nodeById.get(selectedNodeId) ?? null
    : null;

  const cameraFocusedSection = useMemo(() => {
    if (
      cameraMode !== "focus" ||
      !selectedNode ||
      !isSectionHeader(selectedNode)
    ) {
      return null;
    }

    return sectionForNode(selectedNode);
  }, [cameraMode, selectedNode]);

  const nodesBySection = useMemo(() => {`,
);

replaceOnce(
  "atenuar áreas fuera del foco",
  `              dimmed:
                relationScope === "focus" &&
                Boolean(selectedNodeId) &&
                relationMode !== "structure" &&
                highlightedNodeIds.size > 1 &&
                !highlightedNodeIds.has(node.id),`,
  `              dimmed:
                cameraFocusedSection !== null
                  ? sectionForNode(node) !== cameraFocusedSection &&
                    sectionForNode(node) !== "governance"
                  : relationScope === "focus" &&
                    Boolean(selectedNodeId) &&
                    relationMode !== "structure" &&
                    highlightedNodeIds.size > 1 &&
                    !highlightedNodeIds.has(node.id),`,
);

replaceOnce(
  "dependencia de área enfocada",
  `    [
      editable,
      highlightedNodeIds,
      layout,
      nodes,
      relationMode,
      relationScope,
      selectedNodeId,
    ],`,
  `    [
      cameraFocusedSection,
      editable,
      highlightedNodeIds,
      layout,
      nodes,
      relationMode,
      relationScope,
      selectedNodeId,
    ],`,
);

replaceOnce(
  "aviso de área enfocada",
  `      <div className="relative h-[900px] bg-[#fbfcfe]">`,
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
      ) : null}

      <div className="relative h-[900px] bg-[#fbfcfe]">`,
);

await writeFile(target, source, "utf8");
console.log(
  "Pasos 4 y 5 aplicados: Explorar inicia en Estructura y el foco de área atenúa el resto sin ocultar ni mover cajas.",
);
