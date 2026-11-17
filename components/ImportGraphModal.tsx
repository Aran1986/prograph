import React, { useMemo, useState } from 'react';
import { FileCode, Plus, RefreshCw, Sparkles, X } from 'lucide-react';
import { GraphEdgeData, GraphNodeData, Language } from '../types';
import { getDir, translations } from '../utils/translations';
import { parseTextToGraph, TextImportFormat } from '../utils/graphImport';

interface ImportGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onApplyImport: (nodes: GraphNodeData[], edges: GraphEdgeData[], replace: boolean) => void;
}

const SAMPLE_MERMAID_FA = `graph LR
  User["کاربر نهایی"] -->|درخواست| Gateway["درگاه API"]
  Gateway -->|احراز هویت| Auth["سرویس ورود"]
  Gateway -->|پردازش| Core["هسته سیستم"]
  Core -->|ذخیره| DB[("پایگاه داده")]`;

const SAMPLE_MERMAID_EN = `graph LR
  User["End User"] -->|Request| Gateway["API Gateway"]
  Gateway -->|Verify| Auth["Auth Service"]
  Gateway -->|Process| Core["Core Engine"]
  Core -->|Persist| DB[("Database")]`;

const SAMPLE_OUTLINE_FA = `# نقشه راه محصول
  - کشف نیازها: مصاحبه با کاربران و تحلیل رقبا
    - پرسش‌نامه آنلاین
    - تحلیل بازخوردها
  - طراحی و نمونه اولیه: طراحی رابط کاربری سه‌بعدی
    - تست کاربردپذیری
  - پیاده‌سازی و انتشار: توسعه نسخه نهایی`;

const SAMPLE_OUTLINE_EN = `# Product Roadmap
  - Discovery: User interviews & market analysis
    - Online survey
    - Feedback synthesis
  - Design & Prototype: Interactive 3D UX wireframe
    - Usability testing
  - Build & Launch: Final rollout`;

export const ImportGraphModal: React.FC<ImportGraphModalProps> = ({
  isOpen,
  onClose,
  lang,
  onApplyImport
}) => {
  const [text, setText] = useState('');
  const [format, setFormat] = useState<TextImportFormat>('auto');

  const preview = useMemo(() => parseTextToGraph(text, format), [text, format]);

  if (!isOpen) return null;

  const t = translations[lang];
  const dir = getDir(lang);

  const handleLoadSample = (kind: 'mermaid' | 'outline') => {
    setFormat(kind);
    if (kind === 'mermaid') {
      setText(lang === 'fa' ? SAMPLE_MERMAID_FA : SAMPLE_MERMAID_EN);
    } else {
      setText(lang === 'fa' ? SAMPLE_OUTLINE_FA : SAMPLE_OUTLINE_EN);
    }
  };

  const handleSubmit = (replace: boolean) => {
    if (preview.nodes.length === 0) return;
    onApplyImport(preview.nodes, preview.edges, replace);
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir={dir}>
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 font-bold text-base md:text-lg">
            <FileCode className="text-blue-400" size={20} />
            <span>{t.importTextTitle}</span>
          </div>
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <p className="text-xs text-slate-600 leading-relaxed">{t.importTextDesc}</p>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {(['auto', 'mermaid', 'outline'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormat(key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    format === key ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {key === 'auto' ? t.importModeAuto : key === 'mermaid' ? t.importModeMermaid : t.importModeOutline}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleLoadSample('mermaid')}
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 flex items-center gap-1 transition-colors"
              >
                <Sparkles size={12} /> {t.loadSample} (Mermaid)
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('outline')}
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 flex items-center gap-1 transition-colors"
              >
                <Sparkles size={12} /> {t.loadSample} (Outline)
              </button>
            </div>
          </div>

          <textarea
            dir="auto"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={lang === 'fa' ? 'A[مبدا] --> B[مقصد]\nیا:\n# موضوع اصلی\n  - زیرموضوع ۱' : 'graph LR\n  A[Start] --> B[End]\nOr:\n# Topic\n  - Subtopic'}
            className="w-full h-52 border border-slate-200 rounded-xl p-3 text-xs font-mono bg-slate-50 focus:bg-white focus:outline-blue-500 resize-none leading-relaxed"
          />

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-700">{t.importPreview}:</span>
            {preview.nodes.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold tabular-nums">
                  {preview.nodes.length} {t.nodesCount}
                </span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold tabular-nums">
                  {preview.edges.length} {t.edgesCount}
                </span>
                <span className="text-[11px] text-slate-500 uppercase font-mono">({preview.detected})</span>
              </div>
            ) : (
              <span className="text-slate-400">{t.importEmpty}</span>
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex flex-wrap items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium"
          >
            {t.close}
          </button>
          <button
            type="button"
            disabled={preview.nodes.length === 0}
            onClick={() => handleSubmit(false)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1.5"
          >
            <Plus size={14} /> {t.importMerge}
          </button>
          <button
            type="button"
            disabled={preview.nodes.length === 0}
            onClick={() => handleSubmit(true)}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> {t.importReplace}
          </button>
        </div>
      </div>
    </div>
  );
};
