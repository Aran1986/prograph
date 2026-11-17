import React, { useMemo, useState } from 'react';
import { Replace, ReplaceAll, Search, X, Crosshair } from 'lucide-react';
import { GraphEdgeData, GraphNodeData, Language } from '../types';
import { translations, getDir } from '../utils/translations';

interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  onApplyReplace: (
    findText: string,
    replaceText: string,
    options: { caseSensitive: boolean; inNodes: boolean; inEdges: boolean }
  ) => number;
  onFocusItem: (id: string, type: 'node' | 'edge') => void;
}

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  isOpen,
  onClose,
  lang,
  nodes,
  edges,
  onApplyReplace,
  onFocusItem
}) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [inNodes, setInNodes] = useState(true);
  const [inEdges, setInEdges] = useState(true);

  const matches = useMemo(() => {
    const query = findText;
    if (!query) return [];
    const regex = new RegExp(escapeRegExp(query), caseSensitive ? 'g' : 'gi');
    const results: {
      id: string;
      type: 'node' | 'edge';
      label: string;
      color: string;
      count: number;
      fields: string[];
    }[] = [];

    const countIn = (val?: string) => {
      if (!val) return 0;
      const m = val.match(regex);
      return m ? m.length : 0;
    };

    if (inNodes) {
      nodes.forEach((n) => {
        const cLabel = countIn(n.label);
        const cSummary = countIn(n.summary);
        const cFull = countIn(n.fullContent);
        const total = cLabel + cSummary + cFull;
        if (total > 0) {
          const fields: string[] = [];
          if (cLabel > 0) fields.push(translations[lang].label);
          if (cSummary > 0) fields.push(translations[lang].summary);
          if (cFull > 0) fields.push(translations[lang].fullContent);
          results.push({ id: n.id, type: 'node', label: n.label, color: n.color, count: total, fields });
        }
      });
    }

    if (inEdges) {
      edges.forEach((e) => {
        const cLabel = countIn(e.label);
        const cSummary = countIn(e.summary);
        const cFull = countIn(e.fullContent);
        const total = cLabel + cSummary + cFull;
        if (total > 0) {
          const fields: string[] = [];
          if (cLabel > 0) fields.push(translations[lang].label);
          if (cSummary > 0) fields.push(translations[lang].summary);
          if (cFull > 0) fields.push(translations[lang].fullContent);
          results.push({ id: e.id, type: 'edge', label: e.label || 'Edge', color: e.color, count: total, fields });
        }
      });
    }

    return results;
  }, [findText, caseSensitive, inNodes, inEdges, nodes, edges, lang]);

  if (!isOpen) return null;

  const t = translations[lang];
  const dir = getDir(lang);
  const totalOccurrences = matches.reduce((sum, m) => sum + m.count, 0);

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir={dir}>
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 font-bold text-base md:text-lg">
            <Replace className="text-blue-400" size={20} />
            <span>{t.findReplace}</span>
          </div>
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3 border-b bg-slate-50 shrink-0">
          <div className="relative">
            <Search size={15} className="text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder={t.findPlaceholder}
              autoFocus
              className="w-full border border-slate-200 rounded-lg ps-9 pe-3 py-2 text-sm bg-white focus:outline-blue-500"
            />
          </div>
          <div className="relative">
            <Replace size={15} className="text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder={t.replacePlaceholder}
              className="w-full border border-slate-200 rounded-lg ps-9 pe-3 py-2 text-sm bg-white focus:outline-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={inNodes}
                  onChange={(e) => setInNodes(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>{t.searchNodes}</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={inEdges}
                  onChange={(e) => setInEdges(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>{t.searchEdges}</span>
              </label>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>{t.caseSensitive}</span>
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {findText === '' ? (
            <div className="text-center text-slate-400 text-xs py-8">{t.findPlaceholder}</div>
          ) : matches.length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-8">{t.noResults}</div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 mb-2 tabular-nums">
                {totalOccurrences} {t.matchesFound} ({matches.length} {matches.length === 1 ? 'item' : 'items'})
              </div>
              {matches.map((m) => (
                <div
                  key={`${m.type}-${m.id}`}
                  className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 truncate">{m.label}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span>{m.type === 'node' ? t.searchNodes : t.searchEdges}</span>
                        <span>·</span>
                        <span>{m.fields.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-blue-100 text-blue-700 font-mono text-[11px] px-1.5 py-0.5 rounded tabular-nums">
                      ×{m.count}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onFocusItem(m.id, m.type);
                        onClose();
                      }}
                      className="text-slate-500 hover:text-blue-600 p-1 rounded hover:bg-blue-50"
                      title={t.ctxFocus}
                    >
                      <Crosshair size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t bg-slate-50 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
          >
            {t.close}
          </button>
          <button
            type="button"
            disabled={!findText || matches.length === 0}
            onClick={() => {
              onApplyReplace(findText, replaceText, { caseSensitive, inNodes, inEdges });
            }}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ReplaceAll size={14} />
            <span>{t.replaceAll}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
