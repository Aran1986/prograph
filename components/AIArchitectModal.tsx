import React, { useState, useRef } from 'react';
import { X, BrainCircuit, Play, Check, ThumbsDown, ArrowRight, Loader2, FolderOpen, FileText, Trash2 } from 'lucide-react';
import { AIArchitectDefinitions, AISuggestion, AttachedFile, Language, GraphNodeData, GraphEdgeData } from '../types';
import { translations, getDir } from '../utils/translations';
import { generateGraphFromFiles, getBrainstormSuggestions, autoCompleteProject } from '../services/ai';

interface AIArchitectModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  defs: AIArchitectDefinitions;
  setDefs: React.Dispatch<React.SetStateAction<AIArchitectDefinitions>>;
  onApplyGraph: (newNodes: any[], newEdges: any[]) => void;
  onApplyChanges: (suggestions: any) => void;
  onNotify: (message: string, type?: 'error' | 'success' | 'info') => void;
}

export const AIArchitectModal: React.FC<AIArchitectModalProps> = ({
  isOpen,
  onClose,
  lang,
  nodes,
  edges,
  defs,
  setDefs,
  onApplyGraph,
  onApplyChanges,
  onNotify
}) => {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [uploadedFiles, setUploadedFiles] = useState<AttachedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [feedback, setFeedback] = useState('');

  const t = translations[lang].architect;
  const dir = getDir(lang);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const validFiles = Array.from(e.target.files).filter(
      (file: any) =>
        file.type?.startsWith('text/') ||
        file.name.match(/\.(js|ts|tsx|jsx|json|md|txt|py|java|cs|css|html|csv)$/i)
    );

    const readPromises = validFiles.map(
      (file: any) =>
        new Promise<AttachedFile | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            resolve({
              id: crypto.randomUUID(),
              name: file.webkitRelativePath || file.name,
              type: file.type || 'text/plain',
              content: (ev.target?.result as string) || ''
            });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        })
    );

    const results = (await Promise.all(readPromises)).filter((f): f is AttachedFile => f !== null);
    setUploadedFiles(results);
    e.target.value = '';
  };

  const handleBuildGraph = async () => {
    setIsProcessing(true);
    try {
      const result = await generateGraphFromFiles(uploadedFiles, defs, lang);
      onApplyGraph(result.nodes || [], result.edges || []);
      onClose();
    } catch (err: any) {
      onNotify(err?.message || 'Failed to build graph from files', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGetSuggestions = async () => {
    setIsProcessing(true);
    try {
      const results = await getBrainstormSuggestions(nodes, edges, defs, feedback, lang);
      setSuggestions((results || []).map((r) => ({ ...r, id: r.id || crypto.randomUUID(), status: 'pending' })));
    } catch (err: any) {
      onNotify(err?.message || 'Failed to generate suggestions', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoComplete = async () => {
    setIsProcessing(true);
    try {
      const result = await autoCompleteProject(nodes, edges, defs, lang);
      onApplyChanges(result);
      onNotify(lang === 'fa' ? 'تکمیل خودکار روی پروژه اعمال شد.' : 'Auto-complete applied to project.', 'success');
      onClose();
    } catch (err: any) {
      onNotify(err?.message || 'Auto-complete failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptSuggestion = (s: AISuggestion) => {
    if (s.type === 'add_node' && s.data) {
      onApplyChanges({ newNodes: [s.data] });
    } else if (s.type === 'add_edge' && s.data) {
      onApplyChanges({ newEdges: [s.data] });
    } else if (s.type === 'modify_content' && s.data) {
      const matchedNode = nodes.find((n) => n.label.toLowerCase() === String(s.data.nodeLabel || '').toLowerCase());
      if (matchedNode) {
        onApplyChanges({
          modifiedNodes: [{ id: matchedNode.id, nodeLabel: matchedNode.label, content: s.data.newFullContent || '' }]
        });
      } else {
        onNotify(lang === 'fa' ? 'نود هدف برای اعمال تغییر پیدا نشد.' : 'Target node not found.', 'error');
        return;
      }
    } else if (s.type === 'delete_item' && s.data) {
      const matchedNode = nodes.find((n) => n.label.toLowerCase() === String(s.data.nodeLabel || s.data.label || '').toLowerCase());
      const matchedEdge = edges.find((e) => e.label.toLowerCase() === String(s.data.label || '').toLowerCase());
      onApplyChanges({
        deleteNodeIds: matchedNode ? [matchedNode.id] : [],
        deleteEdgeIds: matchedEdge ? [matchedEdge.id] : []
      });
    }
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir={dir}>
      <div className="bg-white w-full max-w-4xl h-[82vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 font-bold text-lg">
            <BrainCircuit className="text-purple-400" />
            {t.title}
          </div>
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded">
            <X />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50 shrink-0">
          <button
            onClick={() => setActiveTab(1)}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${activeTab === 1 ? 'bg-white border-b-2 border-purple-500 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {t.tabDef}
          </button>
          <button
            onClick={() => setActiveTab(2)}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${activeTab === 2 ? 'bg-white border-b-2 border-purple-500 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {t.tabUpload}
          </button>
          <button
            onClick={() => setActiveTab(3)}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${activeTab === 3 ? 'bg-white border-b-2 border-purple-500 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {t.tabBrain}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {/* TAB 1: DEFINITIONS */}
          {activeTab === 1 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <label className="block font-bold text-gray-700 mb-2">{t.nodeDefLabel}</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-3 focus:outline-purple-500 bg-gray-50"
                  placeholder={t.nodeDefPlace}
                  value={defs.nodeDefinition}
                  onChange={(e) => setDefs({ ...defs, nodeDefinition: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-2">{t.edgeDefLabel}</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-3 focus:outline-purple-500 bg-gray-50"
                  placeholder={t.edgeDefPlace}
                  value={defs.edgeDefinition}
                  onChange={(e) => setDefs({ ...defs, edgeDefinition: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-2">{t.goalsLabel}</label>
                <textarea
                  className="w-full border rounded-lg p-3 focus:outline-purple-500 bg-gray-50 h-32"
                  placeholder={t.goalsPlace}
                  value={defs.projectGoals}
                  onChange={(e) => setDefs({ ...defs, projectGoals: e.target.value })}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setActiveTab(2)}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  {t.tabUpload} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD */}
          {activeTab === 2 && (
            <div className="flex flex-col items-center justify-center min-h-full space-y-6">
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 w-full max-w-xl flex flex-col items-center justify-center bg-gray-50 hover:bg-purple-50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <FolderOpen size={48} className="text-purple-400 mb-4" />
                <h3 className="text-lg font-bold text-gray-700">{t.uploadLabel}</h3>
                <p className="text-sm text-gray-500 text-center mt-2">{t.uploadNote}</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={handleFolderUpload}
                />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="w-full max-w-xl space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-bold text-green-600 flex items-center gap-2">
                      <Check size={16} /> {uploadedFiles.length} {lang === 'fa' ? 'فایل آماده تحلیل است.' : 'files prepared.'}
                    </div>
                    <button
                      onClick={() => setUploadedFiles([])}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 size={13} /> {lang === 'fa' ? 'پاک کردن' : 'Clear'}
                    </button>
                  </div>
                  <div className="max-h-32 overflow-y-auto bg-gray-50 border rounded-lg p-2 text-xs text-gray-600 space-y-1" dir="ltr">
                    {uploadedFiles.slice(0, 30).map((f) => (
                      <div key={f.id} className="truncate">{f.name}</div>
                    ))}
                    {uploadedFiles.length > 30 && <div className="text-gray-400">+{uploadedFiles.length - 30} more...</div>}
                  </div>
                  <button
                    onClick={handleBuildGraph}
                    disabled={isProcessing}
                    className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                    {isProcessing ? t.processing : t.uploadBtn}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BRAINSTORM */}
          {activeTab === 3 && (
            <div className="flex flex-col h-full gap-4">
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-xs text-yellow-800 flex items-center gap-2">
                <FileText size={16} />
                {t.shadowCopyNote}
              </div>

              <div className="flex gap-4">
                <div className="flex-1 bg-gray-50 p-4 rounded-lg flex flex-col gap-3">
                  <h3 className="font-bold text-gray-700">{t.brainMode}</h3>
                  <textarea
                    className="w-full border rounded p-2 text-sm h-24 bg-white"
                    placeholder={t.feedbackPlace}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleGetSuggestions}
                      disabled={isProcessing}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
                      {t.getSuggestions}
                    </button>
                    <button
                      onClick={handleAutoComplete}
                      disabled={isProcessing}
                      className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                      {t.autoComplete}
                    </button>
                  </div>
                </div>
              </div>

              {/* Suggestions List */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {suggestions.map((s) => (
                  <div key={s.id} className="border rounded-lg p-4 bg-white shadow-sm flex justify-between items-start gap-4 hover:shadow-md transition-shadow">
                    <div>
                      <div className="font-bold text-purple-700 flex items-center gap-2">
                        <span className="bg-purple-100 text-[10px] px-2 py-0.5 rounded uppercase">{s.type.replace('_', ' ')}</span>
                        {s.title}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{s.description}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleAcceptSuggestion(s)} className="text-green-600 hover:bg-green-50 p-1.5 rounded" title={t.apply}>
                        <Check size={20} />
                      </button>
                      <button onClick={() => setSuggestions((prev) => prev.filter((x) => x.id !== s.id))} className="text-red-500 hover:bg-red-50 p-1.5 rounded" title={t.reject}>
                        <ThumbsDown size={20} />
                      </button>
                    </div>
                  </div>
                ))}
                {suggestions.length === 0 && !isProcessing && (
                  <div className="text-center text-gray-400 mt-10 italic">Ready for brainstorming...</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};