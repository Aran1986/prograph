import React, { useEffect, useMemo, useState } from 'react';
import { BarChart2, GitBranch, X, Maximize2, AlertCircle, Crosshair } from 'lucide-react';
import { GraphEdgeData, GraphNodeData, Language } from '../types';
import { getDir, translations } from '../utils/translations';
import { computeGraphMetrics, findShortestPath, ShortestPathResult } from '../utils/graphAnalytics';

interface GraphAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  selectedNodeIds: string[];
  hasActivePathHighlight: boolean;
  onHighlightPath: (nodeIds: string[], edgeIds: string[]) => void;
  onClearPath: () => void;
  onFocusItem: (id: string, type: 'node' | 'edge') => void;
  onScaleByDegree: () => void;
}

export const GraphAnalyticsModal: React.FC<GraphAnalyticsModalProps> = ({
  isOpen,
  onClose,
  lang,
  nodes,
  edges,
  selectedNodeIds,
  hasActivePathHighlight,
  onHighlightPath,
  onClearPath,
  onFocusItem,
  onScaleByDegree
}) => {
  const t = translations[lang];
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [respectDirection, setRespectDirection] = useState(false);
  const [lastPathResult, setLastPathResult] = useState<ShortestPathResult | null>(null);

  const metrics = useMemo(() => computeGraphMetrics(nodes, edges), [nodes, edges]);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const edgeMap = useMemo(() => new Map(edges.map((e) => [e.id, e])), [edges]);

  useEffect(() => {
    if (!isOpen) return;
    if (selectedNodeIds.length >= 2) {
      setSourceId(selectedNodeIds[0]);
      setTargetId(selectedNodeIds[1]);
    } else if (selectedNodeIds.length === 1) {
      setSourceId(selectedNodeIds[0]);
      const other = nodes.find((n) => n.id !== selectedNodeIds[0]);
      if (other && (!targetId || targetId === selectedNodeIds[0])) {
        setTargetId(other.id);
      }
    } else if (nodes.length >= 2) {
      if (!sourceId || !nodeMap.has(sourceId)) setSourceId(nodes[0].id);
      if (!targetId || !nodeMap.has(targetId)) setTargetId(nodes[1].id);
    }
  }, [isOpen, selectedNodeIds, nodes]);

  if (!isOpen) return null;

  const handleFindPath = () => {
    const res = findShortestPath(nodes, edges, sourceId, targetId, respectDirection);
    setLastPathResult(res);
    if (res.found) {
      onHighlightPath(res.nodeIds, res.edgeIds);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[155] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      dir={getDir(lang)}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-base">
            <BarChart2 size={18} className="text-blue-400" />
            <span>{t.analyticsTitle}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Summary KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-500 font-medium">{t.searchNodes}</div>
              <div className="text-xl font-bold text-slate-800 mt-0.5 tabular-nums">{metrics.nodeCount}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-500 font-medium">{t.searchEdges}</div>
              <div className="text-xl font-bold text-slate-800 mt-0.5 tabular-nums">{metrics.edgeCount}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-500 font-medium">{t.components}</div>
              <div className="text-xl font-bold text-indigo-600 mt-0.5 tabular-nums">{metrics.components}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-500 font-medium">{t.density}</div>
              <div className="text-xl font-bold text-emerald-600 mt-0.5 tabular-nums">
                {Math.round(metrics.density * 100)}%
              </div>
            </div>
          </div>

          {/* Shortest Path Finder */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <GitBranch size={16} className="text-blue-600" />
                {t.pathFinder}
              </h3>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={respectDirection}
                  onChange={(e) => setRespectDirection(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>{t.respectDirection}</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">{t.sourceNode}</label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-blue-500"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">{t.targetNode}</label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-blue-500"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleFindPath}
                disabled={!sourceId || !targetId || nodes.length < 2}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Crosshair size={14} />
                {t.findPath}
              </button>
              {hasActivePathHighlight && (
                <button
                  onClick={() => {
                    onClearPath();
                    setLastPathResult(null);
                  }}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  {t.clearPath}
                </button>
              )}
            </div>

            {lastPathResult && (
              <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs">
                {!lastPathResult.found ? (
                  <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                    <AlertCircle size={14} />
                    <span>{t.pathNotFound}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-emerald-700 font-semibold">
                      {t.pathFound} ({lastPathResult.edgeIds.length} {t.stepsCount})
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {lastPathResult.nodeIds.map((nid, idx) => {
                        const node = nodeMap.get(nid);
                        const viaEdge = idx > 0 ? edgeMap.get(lastPathResult.edgeIds[idx - 1]) : undefined;
                        if (!node) return null;
                        return (
                          <React.Fragment key={nid}>
                            {idx > 0 && (
                              <span className="text-[10px] text-slate-400 px-1 font-mono">
                                {viaEdge?.label ? `—(${viaEdge.label})→` : '→'}
                              </span>
                            )}
                            <button
                              onClick={() => {
                                onFocusItem(node.id, 'node');
                                onClose();
                              }}
                              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 px-2 py-0.5 rounded-md font-medium text-slate-700 transition-colors"
                            >
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: node.color }} />
                              <span>{node.label}</span>
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top Hubs & Degree Scaling */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-800 text-sm">{t.topHubs}</h3>
              <button
                onClick={onScaleByDegree}
                disabled={nodes.length === 0}
                className="bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Maximize2 size={13} />
                {t.scaleByDegree}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {metrics.hubs.slice(0, 8).map((item) => (
                <button
                  key={item.node.id}
                  onClick={() => {
                    onFocusItem(item.node.id, 'node');
                    onClose();
                  }}
                  className="flex items-center justify-between gap-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-start transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.node.color }} />
                    <span className="truncate font-semibold text-slate-700">{item.node.label}</span>
                  </span>
                  <span className="text-[11px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 shrink-0 tabular-nums">
                    {item.degree} {t.connectionsLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Isolated Nodes */}
          {metrics.isolatedNodes.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide">
                {t.isolated} ({metrics.isolatedNodes.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {metrics.isolatedNodes.slice(0, 16).map((node) => (
                  <button
                    key={node.id}
                    onClick={() => {
                      onFocusItem(node.id, 'node');
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: node.color }} />
                    <span>{node.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
