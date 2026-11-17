import React, { useMemo } from 'react';
import { Compass } from 'lucide-react';
import { GraphEdgeData, GraphNodeData, Language } from '../types';
import { getDir, translations } from '../utils/translations';

interface GraphMinimapProps {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  selectedIds: string[];
  activeType: 'node' | 'edge' | null;
  cameraPos: { x: number; y: number; z: number };
  dimmedNodeIds?: Set<string> | null;
  highlightedEdgeIds?: Set<string> | null;
  lang: Language;
  onFocusItem: (id: string, type: 'node' | 'edge') => void;
  onCameraTeleport: (x: number, y: number, z: number) => void;
}

const SIZE = 144;
const PAD = 14;

export const GraphMinimap: React.FC<GraphMinimapProps> = ({
  nodes,
  edges,
  selectedIds,
  activeType,
  cameraPos,
  dimmedNodeIds,
  highlightedEdgeIds,
  lang,
  onFocusItem,
  onCameraTeleport
}) => {
  const t = translations[lang];

  const bounds = useMemo(() => {
    let minX = -10;
    let maxX = 10;
    let minZ = -10;
    let maxZ = 10;

    if (nodes.length > 0) {
      minX = Infinity;
      maxX = -Infinity;
      minZ = Infinity;
      maxZ = -Infinity;
      nodes.forEach((n) => {
        if (n.position[0] < minX) minX = n.position[0];
        if (n.position[0] > maxX) maxX = n.position[0];
        if (n.position[2] < minZ) minZ = n.position[2];
        if (n.position[2] > maxZ) maxZ = n.position[2];
      });
    }

    // Include camera XZ within reasonable margin so marker stays visible
    minX = Math.min(minX, cameraPos.x);
    maxX = Math.max(maxX, cameraPos.x);
    minZ = Math.min(minZ, cameraPos.z);
    maxZ = Math.max(maxZ, cameraPos.z);

    const span = Math.max(maxX - minX, maxZ - minZ, 16);
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const half = span * 0.6;

    return {
      minX: cx - half,
      maxX: cx + half,
      minZ: cz - half,
      maxZ: cz + half,
      span: half * 2
    };
  }, [nodes, cameraPos.x, cameraPos.z]);

  const toSvgX = (wx: number) => PAD + ((wx - bounds.minX) / bounds.span) * (SIZE - PAD * 2);
  const toSvgY = (wz: number) => PAD + ((wz - bounds.minZ) / bounds.span) * (SIZE - PAD * 2);

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const normX = Math.max(0, Math.min(1, (sx - PAD) / (SIZE - PAD * 2)));
    const normZ = Math.max(0, Math.min(1, (sy - PAD) / (SIZE - PAD * 2)));
    const wx = bounds.minX + normX * bounds.span;
    const wz = bounds.minZ + normZ * bounds.span;
    onCameraTeleport(wx, Math.max(12, cameraPos.y), wz + 12);
  };

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const camSvgX = toSvgX(cameraPos.x);
  const camSvgY = toSvgY(cameraPos.z);

  return (
    <div
      dir={getDir(lang)}
      onClick={(e) => e.stopPropagation()}
      className={`hidden lg:flex flex-col fixed bottom-12 ${lang === 'fa' ? 'right-64' : 'left-64'} z-10 bg-white/95 border border-slate-200 rounded-xl shadow-lg overflow-hidden pointer-events-auto select-none`}
    >
      <div className="px-2.5 py-1 bg-slate-100/90 border-b border-slate-200/70 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-600">
        <span className="flex items-center gap-1">
          <Compass size={11} className="text-blue-600" />
          {t.minimapTitle}
        </span>
        <span dir="ltr" className="font-mono text-[9px] text-slate-400 tabular-nums">
          XZ
        </span>
      </div>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        onClick={handleMapClick}
        className="cursor-crosshair bg-slate-50/70"
      >
        {/* Subtle crosshairs */}
        <line x1={SIZE / 2} y1={4} x2={SIZE / 2} y2={SIZE - 4} stroke="#e2e8f0" strokeWidth={1} />
        <line x1={4} y1={SIZE / 2} x2={SIZE - 4} y2={SIZE / 2} stroke="#e2e8f0" strokeWidth={1} />

        {/* Edges */}
        {edges.map((edge) => {
          const from = nodeMap.get(edge.fromId);
          const to = nodeMap.get(edge.toId);
          if (!from || !to) return null;
          const isPathEdge = highlightedEdgeIds?.has(edge.id);
          return (
            <line
              key={edge.id}
              x1={toSvgX(from.position[0])}
              y1={toSvgY(from.position[2])}
              x2={toSvgX(to.position[0])}
              y2={toSvgY(to.position[2])}
              stroke={isPathEdge ? '#f59e0b' : edge.color || '#94a3b8'}
              strokeWidth={isPathEdge ? 2.2 : 1}
              strokeOpacity={isPathEdge ? 0.95 : 0.45}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const isSel = activeType === 'node' && selectedIds.includes(node.id);
          const isDim = Boolean(dimmedNodeIds?.has(node.id));
          const cx = toSvgX(node.position[0]);
          const cy = toSvgY(node.position[2]);
          return (
            <g
              key={node.id}
              onClick={(e) => {
                e.stopPropagation();
                onFocusItem(node.id, 'node');
              }}
              className="cursor-pointer"
            >
              {isSel && (
                <circle cx={cx} cy={cy} r={6.5} fill="none" stroke="#2563eb" strokeWidth={1.6} />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={isSel ? 4.2 : 3.2}
                fill={node.color || '#2196F3'}
                fillOpacity={isDim ? 0.22 : 0.95}
                stroke="#ffffff"
                strokeWidth={0.8}
              />
            </g>
          );
        })}

        {/* Camera indicator */}
        <g transform={`translate(${camSvgX}, ${camSvgY})`} pointerEvents="none">
          <circle r={4} fill="#0f172a" fillOpacity={0.18} stroke="#0f172a" strokeWidth={1.2} />
          <circle r={1.6} fill="#0f172a" />
        </g>
      </svg>
    </div>
  );
};
