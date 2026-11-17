import React from 'react';
import { Play, Pause, SkipBack, SkipForward, X, FileText } from 'lucide-react';
import { GraphNodeData, Language } from '../types';
import { getDir, translations } from '../utils/translations';

interface WalkthroughBarProps {
  isOpen: boolean;
  orderedNodes: GraphNodeData[];
  currentIndex: number;
  isPlaying: boolean;
  lang: Language;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenFull: (node: GraphNodeData) => void;
  onClose: () => void;
}

export const WalkthroughBar: React.FC<WalkthroughBarProps> = ({
  isOpen,
  orderedNodes,
  currentIndex,
  isPlaying,
  lang,
  onTogglePlay,
  onPrev,
  onNext,
  onOpenFull,
  onClose
}) => {
  if (!isOpen || orderedNodes.length === 0) return null;
  const t = translations[lang];
  const node = orderedNodes[currentIndex] || orderedNodes[0];

  const plainExcerpt = (node.fullContent || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);

  return (
    <div
      dir={getDir(lang)}
      onClick={(e) => e.stopPropagation()}
      className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[125] w-[92vw] max-w-lg bg-white/95 border border-slate-200 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
    >
      <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-3 rounded-full shrink-0 border border-white/40" style={{ backgroundColor: node.color }} />
          <span className="font-bold text-sm truncate">{node.label}</span>
          <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono tabular-nums shrink-0">
            {currentIndex + 1} / {orderedNodes.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors shrink-0"
          title={t.close}
        >
          <X size={15} />
        </button>
      </div>

      <div className="p-3.5 space-y-2.5">
        {node.summary && (
          <p className="text-xs font-semibold text-slate-700 leading-relaxed">{node.summary}</p>
        )}
        {plainExcerpt && (
          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{plainExcerpt}</p>
        )}
        {node.tags && node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {node.tags.map((tg) => (
              <span key={tg} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                #{tg}
              </span>
            ))}
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPrev}
              disabled={orderedNodes.length <= 1}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 transition-colors"
              title={t.tourPrev}
            >
              <SkipBack size={14} />
            </button>
            <button
              onClick={onTogglePlay}
              disabled={orderedNodes.length <= 1}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } disabled:opacity-40`}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? t.tourPause : t.tourPlay}</span>
            </button>
            <button
              onClick={onNext}
              disabled={orderedNodes.length <= 1}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 transition-colors"
              title={t.tourNext}
            >
              <SkipForward size={14} />
            </button>
          </div>

          <button
            onClick={() => onOpenFull(node)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <FileText size={13} />
            <span>{t.tourOpenDetails}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
