import React, { useState, useEffect } from 'react';
import { X, Loader2, FileText, Sparkles, Copy, Check, Download, Printer, FileCode, FileDown } from 'lucide-react';
import { translations, getDir } from '../utils/translations';
import { Language, AIMode, GraphNodeData, GraphEdgeData } from '../types';
import { generateFinalProjectArtifact } from '../services/ai';
import { generateMarkdownDocument, generateMermaidDiagram } from '../utils/graphExport';

interface FinalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  aiMode: AIMode;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  onNotify: (message: string, type?: 'error' | 'success' | 'info') => void;
}

export const FinalizationModal: React.FC<FinalizationModalProps> = ({
  isOpen,
  onClose,
  lang,
  aiMode,
  nodes,
  edges,
  onNotify
}) => {
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'selection' | 'result'>('selection');
  const [copied, setCopied] = useState(false);
  const [copiedMermaid, setCopiedMermaid] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    if (isOpen) {
      setStep('selection');
      setResult('');
      setCopied(false);
      setCopiedMermaid(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMerge = () => {
    setIsLoading(true);
    setStep('result');
    setTimeout(() => {
      let content = `<div dir="${getDir(lang)}">`;
      content += `<h1 style="text-align:center; margin-bottom: 20px;">${t.finalizeTitle} (${t.modes[aiMode]})</h1>`;

      nodes.forEach((node) => {
        content += `<div style="border-bottom: 1px solid #eee; padding: 20px 0; margin-bottom: 20px;">`;
        content += `<h2 style="color: ${node.color};">${node.label}</h2>`;
        content += `<p><strong>${t.summary}:</strong> ${node.summary}</p>`;
        if (node.fullContent) {
          content += `<div style="margin-top: 10px;">${node.fullContent}</div>`;
        }
        content += `</div>`;
      });
      content += `</div>`;

      setResult(content);
      setIsLoading(false);
    }, 300);
  };

  const handleAIGenerate = async () => {
    setIsLoading(true);
    setStep('result');
    try {
      const aiContent = await generateFinalProjectArtifact(nodes, edges, aiMode, lang);
      setResult(aiContent);
    } catch (err: any) {
      onNotify(err?.message || 'Failed to generate final project output', 'error');
      setStep('selection');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        const blob = new Blob([result], { type: 'text/html' });
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]);
      } else {
        await navigator.clipboard.writeText(result);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        await navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        onNotify(lang === 'fa' ? 'کپی به کلیپ‌بورد امکان‌پذیر نیست.' : 'Unable to copy to clipboard.', 'error');
      }
    }
  };

  const downloadHtml = () => {
    const doc = `<!DOCTYPE html><html lang="${lang}" dir="${getDir(lang)}"><head><meta charset="UTF-8"><title>${t.finalizeTitle}</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;line-height:1.7;color:#1e293b;}</style></head><body>${result}</body></html>`;
    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph-pro-${aiMode}-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const printDocument = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      return;
    }

    doc.open();
    doc.write(`<!DOCTYPE html><html lang="${lang}" dir="${getDir(lang)}"><head><meta charset="UTF-8"><title>${t.finalizeTitle}</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:850px;margin:24px auto;padding:0 20px;line-height:1.7;color:#0f172a;}h1,h2,h3{color:#0f172a;}img{max-width:100%;height:auto;}</style></head><body>${result}</body></html>`);
    doc.close();

    window.setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => iframe.remove(), 1500);
    }, 250);
  };

  const downloadMarkdown = () => {
    const md = generateMarkdownDocument(nodes, edges, `${t.finalizeTitle} (${t.modes[aiMode]})`, lang);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph-pro-${aiMode}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyMermaid = async () => {
    const code = generateMermaidDiagram(nodes, edges);
    try {
      await navigator.clipboard.writeText(code);
      setCopiedMermaid(true);
      setTimeout(() => setCopiedMermaid(false), 2000);
    } catch {
      onNotify(lang === 'fa' ? 'کپی به کلیپ‌بورد امکان‌پذیر نیست.' : 'Unable to copy to clipboard.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" dir={getDir(lang)}>
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Sparkles className="text-yellow-400" />
            {t.finalizeTitle}: {t.modes[aiMode]}
          </div>
          <button onClick={onClose} className="hover:bg-slate-700 p-2 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-gray-50">
          {step === 'selection' && (
            <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
              <h2 className="text-2xl font-bold text-gray-700 text-center">{t.finalizeDesc}</h2>
              <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
                <button
                  onClick={handleMerge}
                  className="flex-1 bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 p-8 rounded-xl flex flex-col items-center gap-4 transition-all shadow-sm group"
                >
                  <div className="bg-blue-100 p-4 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
                    <FileText size={48} />
                  </div>
                  <span className="font-bold text-lg text-gray-800">{t.mergeContent}</span>
                </button>

                <button
                  onClick={handleAIGenerate}
                  className="flex-1 bg-white border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 p-8 rounded-xl flex flex-col items-center gap-4 transition-all shadow-sm group"
                >
                  <div className="bg-purple-100 p-4 rounded-full text-purple-600 group-hover:scale-110 transition-transform">
                    <Sparkles size={48} />
                  </div>
                  <span className="font-bold text-lg text-gray-800">{t.aiFinalize}</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={downloadMarkdown}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <FileDown size={15} className="text-emerald-600" />
                  <span>{t.exportMarkdown}</span>
                </button>
                <button
                  onClick={copyMermaid}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  {copiedMermaid ? <Check size={15} className="text-emerald-600" /> : <FileCode size={15} className="text-blue-600" />}
                  <span>{copiedMermaid ? t.mermaidCopied : t.copyMermaid}</span>
                </button>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="flex flex-col h-full">
              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <Loader2 size={48} className="animate-spin text-purple-600" />
                  <p className="text-gray-500 animate-pulse">{t.loadingAI}</p>
                </div>
              ) : (
                <>
                  <div className="bg-gray-100 border-b p-2 flex flex-wrap justify-end gap-2">
                    <button
                      onClick={() => setStep('selection')}
                      className="px-3 py-1.5 text-xs bg-white border rounded-md hover:bg-gray-50"
                    >
                      {t.undo}
                    </button>
                    <button
                      onClick={downloadMarkdown}
                      className="px-3 py-1.5 text-xs bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 flex items-center gap-1"
                    >
                      <FileDown size={14} />
                      {t.exportMarkdown}
                    </button>
                    <button
                      onClick={copyMermaid}
                      className="px-3 py-1.5 text-xs bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 flex items-center gap-1"
                    >
                      {copiedMermaid ? <Check size={14} className="text-emerald-600" /> : <FileCode size={14} />}
                      {copiedMermaid ? t.mermaidCopied : t.copyMermaid}
                    </button>
                    <button
                      onClick={printDocument}
                      className="px-3 py-1.5 text-xs bg-slate-700 text-white rounded-md hover:bg-slate-800 flex items-center gap-1"
                    >
                      <Printer size={14} />
                      {t.printPdf}
                    </button>
                    <button
                      onClick={downloadHtml}
                      className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center gap-1"
                    >
                      <Download size={14} />
                      HTML
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? t.copied : t.copyHtml}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 bg-white">
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: result }} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};