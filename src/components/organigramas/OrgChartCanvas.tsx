"use client";

import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { ArrowRight, FileText, GitBranch, Info, Layers3, Mail, Phone, UserRound, UsersRound, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  OrgNodeCard,
  areaLabels,
  edgeLabels,
  getNodeColor,
  memberRoleLabels,
  type OrgEdgeData,
  type OrgNodeData,
} from "./OrgNodeCard";

type Props = {
  nodes: OrgNodeData[];
  edges: OrgEdgeData[];
  schoolSlug: string;
};

function ViewerNode({ data, selected }: NodeProps<Node<OrgNodeData>>) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <OrgNodeCard data={data} selected={selected} />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </>
  );
}

const nodeTypes: NodeTypes = {
  orgNode: ViewerNode,
};

function buildEdge(edge: OrgEdgeData): Edge {
  const edgeColors: Record<string, string> = {
    JERARQUICA: "#1d4ed8",
    TRANSVERSAL: "#d97706",
    COLABORACION: "#0f766e",
    ACOMPANAMIENTO: "#7c3aed",
    DECISION: "#be123c",
    INFORMACION: "#64748b",
  };
  const isHierarchy = edge.type === "JERARQUICA";
  const stroke = edgeColors[edge.type] ?? "#64748b";

  return {
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    label: edge.label || (!isHierarchy ? edgeLabels[edge.type] : undefined),
    type: "smoothstep",
    animated: !isHierarchy,
    markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
    style: {
      stroke,
      strokeWidth: isHierarchy ? 2.7 : 2.2,
      strokeDasharray: isHierarchy ? undefined : "8 8",
    },
    labelStyle: { fill: "#334155", fontWeight: 900, fontSize: 11 },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.96 },
    labelBgPadding: [8, 5],
    labelBgBorderRadius: 999,
  };
}

export function OrgChartCanvas({ nodes, edges, schoolSlug }: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;

  const flowNodes: Node<OrgNodeData>[] = useMemo(() => {
    return nodes.map((node) => ({
      id: node.id,
      type: "orgNode",
      position: { x: node.positionX, y: node.positionY },
      data: node,
      // La vista es de solo lectura y no usa onNodesChange. Sin medidas
      // iniciales, React Flow muestra las tarjetas pero no crea sus figuras
      // dentro del MiniMap.
      initialWidth: 235,
      initialHeight: 180,
      draggable: false,
      selectable: true,
    }));
  }, [nodes]);

  const flowEdges: Edge[] = useMemo(() => edges.map(buildEdge), [edges]);

  const totalPeople = selectedNode?.members?.length ?? (selectedNode?.person ? 1 : 0);
  const totalHours = selectedNode?.members?.reduce((acc, member) => acc + (member.weeklyHours ?? 0), 0) || selectedNode?.weeklyHours || null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
      <div className="relative h-[840px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="pointer-events-none absolute left-5 top-5 z-10 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <GitBranch className="h-4 w-4 text-blue-700" />
            Vista institucional
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Tocá un área o función para ver personas, horas y vínculos.
          </p>
        </div>

        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25, minZoom: 0.3, maxZoom: 0.86 }}
          minZoom={0.14}
          maxZoom={1.18}
          panOnScroll
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
        >
          <Background gap={34} size={1} color="#d7deea" />
          <Controls />
          <MiniMap
            pannable
            zoomable
            nodeStrokeWidth={3}
            nodeColor={(node) =>
              getNodeColor(
                (node.data?.color as string | null | undefined) ?? null,
                (node.data?.area as string | undefined) ?? "OTRO",
              )
            }
          />
        </ReactFlow>
      </div>

      <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-6 xl:h-[840px] xl:overflow-y-auto">
        {selectedNode ? (
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Detalle institucional</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{selectedNode.title}</h2>
              </div>
              <button type="button" onClick={() => setSelectedNodeId(null)} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900" aria-label="Cerrar detalle">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <InfoPill icon={<Layers3 className="h-4 w-4" />} label={areaLabels[selectedNode.area] ?? selectedNode.area} />
              <InfoPill icon={<UsersRound className="h-4 w-4" />} label={`${totalPeople} personas`} />
              {totalHours !== null ? <InfoPill icon={<FileText className="h-4 w-4" />} label={`${totalHours} hs.`} /> : null}
            </div>

            {selectedNode.person ? (
              <div className="mt-5 rounded-[1.4rem] border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center gap-2 text-sm font-black text-blue-900"><UserRound className="h-4 w-4" /> Responsable principal</div>
                <p className="mt-2 text-lg font-black text-blue-950">{`${selectedNode.person.firstName} ${selectedNode.person.lastName}`.trim()}</p>
                {selectedNode.person.email ? <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-blue-800"><Mail className="h-4 w-4" />{selectedNode.person.email}</p> : null}
                {selectedNode.person.phone ? <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-blue-800"><Phone className="h-4 w-4" />{selectedNode.person.phone}</p> : null}
              </div>
            ) : null}

            {selectedNode.members && selectedNode.members.length > 0 ? (
              <div className="mt-5 rounded-[1.4rem] border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900"><UsersRound className="h-4 w-4 text-blue-700" /> Equipo del nodo</div>
                <div className="mt-3 space-y-2">
                  {selectedNode.members.map((member) => (
                    <div key={member.id} className="rounded-2xl bg-white p-3 shadow-sm">
                      <p className="text-sm font-black text-slate-900">{`${member.person.firstName} ${member.person.lastName}`.trim()}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{memberRoleLabels[member.role] ?? member.role}{member.roleTitle ? ` · ${member.roleTitle}` : ""}</p>
                      {member.weeklyHours !== null ? <p className="mt-1 text-xs font-black text-blue-700">{member.weeklyHours} hs.</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 space-y-4">
              {selectedNode.formalRole ? <DetailBlock label="Cargo formal" value={selectedNode.formalRole} /> : null}
              {selectedNode.realFunction ? <DetailBlock label="Función real" value={selectedNode.realFunction} /> : null}
              {selectedNode.description ? <DetailBlock label="Observaciones" value={selectedNode.description} /> : null}
            </div>
            {selectedNode.person ? (
              <Link href={`/talento/${schoolSlug}`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-800">
                Ver ficha de talento <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Info className="h-6 w-6" /></div>
            <h2 className="mt-4 text-xl font-black text-slate-950">Seleccioná un área o función</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Al tocar un cargo o área vas a ver responsables, equipo, horas, función real y observaciones.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function InfoPill({ icon, label }: { icon: ReactNode; label: string }) {
  return <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-800">{icon}<span>{label}</span></div>;
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-700">{value}</p>
    </div>
  );
}
