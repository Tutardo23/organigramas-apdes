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
      `No encontré el bloque requerido: ${label}. No se modificó el archivo. Confirmá que el Paso 2 esté aplicado.`,
    );
  }

  if (source.indexOf(before, index + before.length) !== -1) {
    console.warn(
      `Aviso: el bloque “${label}” aparece más de una vez; se modifica solo el primero.`,
    );
  }

  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  "habilitar lectura de todos los nodos para enfocar un área",
  `  const { fitView, getNode, setCenter } = useReactFlow();`,
  `  const { fitView, getNode, getNodes, setCenter } = useReactFlow();`,
);

replaceOnce(
  "enfoque individual del Paso 2",
  `  useEffect(() => {
    if (!enabled || !selectedNodeId) return;

    const timeout = window.setTimeout(() => {
      const node = getNode(selectedNodeId);
      if (!node) return;

      const width = node.width ?? 190;
      const height = node.height ?? 90;
      void setCenter(
        node.position.x + width / 2,
        node.position.y + height / 2,
        { zoom: 0.82, duration: 650 },
      );
    }, 40);

    return () => window.clearTimeout(timeout);
  }, [enabled, getNode, selectedNodeId, setCenter]);`,
  `  useEffect(() => {
    if (!enabled || !selectedNodeId) return;

    const timeout = window.setTimeout(() => {
      const selectedNode = getNode(selectedNodeId);
      if (!selectedNode) return;

      const selectedData = selectedNode.data as InstitutionalMapNodeData;

      // Las barras azules representan un área completa. En ese caso no
      // enfocamos solamente la barra: encuadramos todas las cajas del área,
      // conservando exactamente sus posiciones actuales.
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

      // Las cajas comunes mantienen el comportamiento estable del Paso 2:
      // la cámara se centra suavemente sobre la caja seleccionada.
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
  ]);`,
);

await writeFile(target, source, "utf8");
console.log(
  "Paso 3 aplicado: las barras de área enfocan el área completa y las cajas comunes mantienen el enfoque individual.",
);
