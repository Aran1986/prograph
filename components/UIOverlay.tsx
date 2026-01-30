import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Link as LinkIcon, Download, Upload, 
  Trash2, Save, MapPin, ChevronUp, ChevronDown, 
  Settings, Camera, FileJson, MousePointer2,
  Menu, HelpCircle, Eye, Check, X, Layers, FileText, Image as ImageIcon,
  Loader2, Globe, RefreshCw, Cake, Lightbulb, MessageSquare, Send, ArrowRightLeft,
  Undo2, Redo2, BrainCircuit
} from 'lucide-react';
import { AppState, GraphNodeData, GraphEdgeData, UIPanelsState, AttachedFile, Language, ChatMessage } from '../types';
import { translations, getDir } from '../utils/translations';
import { PresentationModal } from './PresentationModal';
import { AIArchitectModal } from './AIArchitectModal';

interface UIOverlayProps {
  appState: AppState;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  cameraPos: { x: number; y: number; z: number };
  uiPanels: UIPanelsState;
  setUiPanels: React.Dispatch<React.SetStateAction<UIPanelsState>>;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  onAddNode: () => void;
  onToggleEdgeMode: () => void;
  onUpdateItem: (id: string, type: 'node' | 'edge', data: Partial<GraphNodeData | GraphEdgeData>) => void;
  onDeleteItem: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onCameraTeleport: (x: number, y: number, z: number) => void;
  hoverInfo: { label: string; summary: string; full: string } | null;
  onSelectSameColor: () => void;
  onFileUpload: (file: File) => void;
  onDeleteFile: (fileId: string) => void;
  presentationMode: { 
    isOpen: boolean; 
    content: string; 
    isLoading: boolean;
    activeFiles: AttachedFile[];
    targetLanguage: Language;
    activeItemId: string | null;
  };
  setPresentationMode: (mode: any) => void;
  onRegeneratePresentation: (lang: Language) => void;
  onCakePresentation: () => void;
  onSmartGuide: () => void;
  onAddFile: (file: AttachedFile, itemId: string) => void;
  onRemoveFile: (fileId: string, itemId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onPushHistory: () => void;
  // AI Architect Props
  onApplyGraphFromAI: (nodes: any[], edges: any[]) => void;
  onApplyChangesFromAI: (changes: any) => void;
}

// Compact Panel (w-48)
const Panel: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ 
  title, icon, children, defaultOpen = true 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg overflow-hidden w-48 transition-all duration-200 pointer-events-auto shrink-0">
      <div 
        className="bg-gray-100 p-2 flex items-center justify-between cursor-pointer hover:bg-gray-200 select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
          {icon}
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
      {isOpen && <div className="p-2 text-xs">{children}</div>}
    </div>
  );
};

const HelpModal: React.FC<{ onClose: () => void; lang: Language }> = ({ onClose, lang }) => {
  const t = translations[lang];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir={getDir(lang)}>
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <HelpCircle size={20} /> {t.helpModal.title}
          </h2>
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded"><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4 text-gray-700 text-sm">
           <div className="space-y-2">
            <h3 className="font-bold border-b pb-1 text-slate-800">{t.helpModal.interaction}</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="font-semibold">{t.helpModal.interactionDesc1}</span></li>
              <li><span className="font-semibold">{t.helpModal.interactionDesc2}</span></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold border-b pb-1 text-slate-800">{t.helpModal.manage}</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="font-semibold">{t.helpModal.manageDesc1}</span></li>
              <li><span className="font-semibold">{t.helpModal.manageDesc2}</span></li>
            </ul>
          </div>
        </div>
        <div className="bg-gray-100 p-4 flex justify-end">
          <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{t.helpModal.btn}</button>
        </div>
      </div>
    </div>
  );
};

export const UIOverlay: React.FC<UIOverlayProps> = ({
  appState, nodes, edges, cameraPos, uiPanels, setUiPanels, setAppState,
  onAddNode, onToggleEdgeMode, onUpdateItem, onDeleteItem,
  onExport, onImport, onCameraTeleport, hoverInfo, onSelectSameColor,
  onFileUpload, onDeleteFile, presentationMode, setPresentationMode,
  onRegeneratePresentation, onCakePresentation, onSmartGuide,
  onAddFile, onRemoveFile, onUndo, onRedo, canUndo, canRedo, onPushHistory,
  onApplyGraphFromAI, onApplyChangesFromAI
}) => {
  const [camInput, setCamInput] = useState({ x: 0, y: 10, z: 20 });
  const [activeMenu, setActiveMenu] = useState<'file' | 'view' | 'lang' | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showArchitect, setShowArchitect] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const lang = appState.appLanguage;
  const t = translations[lang];

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const togglePanel = (key: keyof UIPanelsState) => {
    setUiPanels(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const isMultiSelect = appState.selectedIds.length > 1;
  const activeNode = appState.activeType === 'node' ? nodes.find(n => n.id === appState.selectedIds[0]) : null;
  const activeEdge = appState.activeType === 'edge' ? edges.find(e => e.id === appState.selectedIds[0]) : null;
  const activeFiles = activeNode?.files || activeEdge?.files || [];

  return (
    <>
      {/* --- Top Navigation Bar --- */}
      <div 
        className="fixed top-0 left-0 right-0 h-12 bg-slate-800 text-white shadow-md z-40 flex items-center px-4 justify-between select-none pointer-events-auto"
        onClick={(e) => e.stopPropagation()} 
        dir={getDir(lang)}
      >
        <div className="flex items-center gap-6 h-full">
          <div className="font-bold text-lg tracking-wider flex items-center gap-2">
            <span className="text-blue-400">Graph</span>Pro
          </div>

          <div className="flex items-center h-full gap-1">
             {/* Undo / Redo */}
             <div className="flex items-center gap-1 border-r border-slate-600 px-2 mx-2">
                <button 
                  onClick={onUndo} 
                  disabled={!canUndo} 
                  className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                  title={t.undo}
                >
                  <Undo2 size={16} />
                </button>
                <button 
                  onClick={onRedo} 
                  disabled={!canRedo} 
                  className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                  title={t.redo}
                >
                  <Redo2 size={16} />
                </button>
             </div>

             <div className="relative h-full flex items-center">
              <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'file' ? null : 'file'); }} className="px-3 py-1 rounded hover:bg-slate-700 transition-colors">{t.file}</button>
              {activeMenu === 'file' && <div className={`absolute top-10 ${lang === 'fa' ? 'right-0' : 'left-0'} w-48 bg-white text-slate-800 rounded shadow-xl z-50`}>
                   <button className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 w-full" onClick={onExport}><Save size={16}/> {t.save}</button>
                   <button className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 w-full" onClick={() => fileInputRef.current?.click()}><Upload size={16}/> {t.load}</button>
                   <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => { if (e.target.files?.[0]) onImport(e.target.files[0]); setActiveMenu(null); }} />
              </div>}
            </div>
             <div className="relative h-full flex items-center">
              <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'view' ? null : 'view'); }} className="px-3 py-1 rounded hover:bg-slate-700 transition-colors">{t.view}</button>
              {activeMenu === 'view' && <div className={`absolute top-10 ${lang === 'fa' ? 'right-0' : 'left-0'} w-56 bg-white text-slate-800 rounded shadow-xl z-50 p-2`}>
                   <label className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" checked={uiPanels.tools} onChange={() => togglePanel('tools')} className="rounded text-blue-600"/><span>{t.toolsPanel}</span></label>
                   <label className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" checked={uiPanels.properties} onChange={() => togglePanel('properties')} className="rounded text-blue-600"/><span>{t.propsPanel}</span></label>
                   <label className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" checked={uiPanels.camera} onChange={() => togglePanel('camera')} className="rounded text-blue-600"/><span>{t.camPanel}</span></label>
                   <label className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer"><input type="checkbox" checked={uiPanels.hints} onChange={() => togglePanel('hints')} className="rounded text-blue-600"/><span>{t.hintsPanel}</span></label>
              </div>}
            </div>
             <div className="relative h-full flex items-center">
              <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'lang' ? null : 'lang'); }} className="px-3 py-1 rounded hover:bg-slate-700 flex gap-1"><Globe size={16}/> {lang.toUpperCase()}</button>
              {activeMenu === 'lang' && <div className={`absolute top-10 ${lang === 'fa' ? 'right-0' : 'left-0'} w-32 bg-white text-slate-800 rounded shadow-xl z-50`}>
                   <button className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 w-full" onClick={() => setAppState(prev => ({ ...prev, appLanguage: 'fa' }))}>{t.persian}</button>
                   <button className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 w-full" onClick={() => setAppState(prev => ({ ...prev, appLanguage: 'en' }))}>{t.english}</button>
              </div>}
            </div>
             
             {/* AI Architect Button */}
             <button 
                onClick={() => setShowArchitect(true)}
                className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 flex items-center gap-2 transition-colors mx-2 shadow-sm font-medium"
             >
                <BrainCircuit size={16} /> 
                <span className="hidden md:inline">{t.aiArchitect}</span>
             </button>

             <button onClick={() => setShowHelp(true)} className="px-3 py-1 rounded hover:bg-slate-700">{t.help}</button>
          </div>
        </div>
      </div>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} lang={lang} />}
      
      <AIArchitectModal 
        isOpen={showArchitect} 
        onClose={() => setShowArchitect(false)}
        lang={lang}
        nodes={nodes}
        edges={edges}
        onApplyGraph={onApplyGraphFromAI}
        onApplyChanges={onApplyChangesFromAI}
      />

      <PresentationModal 
        isOpen={presentationMode.isOpen} 
        isLoading={presentationMode.isLoading}
        content={presentationMode.content}
        files={presentationMode.activeFiles}
        targetLanguage={presentationMode.targetLanguage}
        activeItemId={presentationMode.activeItemId}
        nodes={nodes}
        edges={edges}
        uiLang={lang}
        onClose={() => setPresentationMode({ ...presentationMode, isOpen: false })}
        onRegenerate={onRegeneratePresentation}
        onAddFile={onAddFile}
        onRemoveFile={onRemoveFile}
      />

      {/* --- AI Actions Bar (Bottom Left) --- */}
      {(activeNode || activeEdge) && !presentationMode.isOpen && (
        <div 
          className="fixed z-30 flex flex-col gap-2 animate-in slide-in-from-bottom-5 pointer-events-auto"
          style={{ bottom: '4rem', left: '1rem' }}
        >
           <button 
              onClick={onCakePresentation}
              className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition-transform hover:scale-105 shadow-md justify-start w-40"
              title="Strict format presentation"
            >
              <Cake size={16} /> <span>{t.cakePres}</span>
            </button>
            <button 
              onClick={onSmartGuide}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition-transform hover:scale-105 shadow-md justify-start w-40"
              title="Analyze connections and topology"
            >
              <Lightbulb size={16} /> <span>{t.smartGuide}</span>
            </button>
        </div>
      )}

      {/* Sidebar Container: Tools & Camera (STACKED to prevent overlap) */}
      <div className={`absolute top-16 ${lang === 'fa' ? 'right-4' : 'left-4'} z-10 flex flex-col gap-4 pointer-events-none`}>
        {uiPanels.tools && (
          <Panel title={t.toolTitle} icon={<Settings size={16} />}>
            <div className="flex flex-col gap-2">
              <button onClick={onAddNode} className="flex items-center gap-2 bg-blue-500 text-white p-2 rounded justify-center"><Plus size={16}/>{t.newNode}</button>
              <button onClick={onToggleEdgeMode} className="flex items-center gap-2 bg-gray-500 text-white p-2 rounded justify-center"><LinkIcon size={16}/>{appState.mode === 'select' ? t.connect : t.cancelConnect}</button>
              {appState.mode !== 'select' && (
                <div className="text-xs text-center text-orange-600 font-bold bg-orange-100 p-1 rounded border border-orange-200">
                  {appState.mode === 'edge-start' ? t.selectSource : t.selectTarget}
                </div>
              )}
            </div>
          </Panel>
        )}

        {/* Camera Panel is now strictly UNDER the tools panel in the flex container */}
        {uiPanels.camera && (
          <Panel title={t.camTitle} icon={<Camera size={16} />}>
             <div className="flex gap-1 mb-2">
                <input type="number" placeholder="X" className="w-1/3 border rounded p-1 text-xs text-center" value={camInput.x} onChange={e => setCamInput({...camInput, x: parseFloat(e.target.value)})} />
                <input type="number" placeholder="Y" className="w-1/3 border rounded p-1 text-xs text-center" value={camInput.y} onChange={e => setCamInput({...camInput, y: parseFloat(e.target.value)})} />
                <input type="number" placeholder="Z" className="w-1/3 border rounded p-1 text-xs text-center" value={camInput.z} onChange={e => setCamInput({...camInput, z: parseFloat(e.target.value)})} />
             </div>
             <button 
              onClick={() => onCameraTeleport(camInput.x, camInput.y, camInput.z)}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white p-1.5 rounded text-xs flex items-center justify-center gap-1 transition-colors"
            >
               <MapPin size={12} /> {t.jump}
             </button>
             <div className="mt-2 text-center text-xs text-gray-500 font-mono">
               Pos: {Math.round(cameraPos.x)}, {Math.round(cameraPos.y)}, {Math.round(cameraPos.z)}
             </div>
          </Panel>
        )}
      </div>

      {/* Sidebar: Properties (Opposite Side) */}
      {uiPanels.properties && (
        <div className={`absolute top-16 ${lang === 'fa' ? 'left-4' : 'right-4'} z-10 flex flex-col max-h-[90vh] overflow-y-auto pl-1 gap-0 pointer-events-none`}>
          <Panel title={t.propTitle} icon={<MousePointer2 size={16} />}>
            {(activeNode || activeEdge) && (
              <div className="flex flex-col gap-3">
                 
                 {/* Multi Select Header */}
                 {isMultiSelect && (
                   <div className="bg-blue-50 border-b border-blue-100 p-2 mb-2 rounded text-blue-800 text-xs font-bold flex items-center gap-2">
                      <Layers size={14} />
                      <span>{appState.selectedIds.length} {t.multiSelect}</span>
                   </div>
                 )}
                 
                 {!isMultiSelect && (
                   <button onClick={onSelectSameColor} className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 p-1.5 rounded text-xs transition-colors mb-1">
                     <Eye size={14} /> <span>{t.selectSimilar}</span>
                   </button>
                 )}

                 <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.label}</label>
                  <input 
                    type="text" 
                    className="w-full border rounded p-1 text-sm bg-gray-50 focus:bg-white transition-colors" 
                    value={activeNode?.label || activeEdge?.label} 
                    onFocus={onPushHistory} // Save history on focus
                    onChange={(e) => onUpdateItem(activeNode?.id || activeEdge!.id, activeNode ? 'node' : 'edge', { label: e.target.value })} 
                  />
                 </div>
                 
                 {/* Edge Direction Selector */}
                 {activeEdge && (
                    <div className="bg-orange-50 p-2 rounded border border-orange-100">
                      <label className="text-xs text-orange-800 block mb-1 font-bold flex items-center gap-1"><ArrowRightLeft size={10}/> Flow Direction</label>
                      <select 
                        className="w-full text-xs p-1 rounded border border-orange-200 bg-white"
                        value={activeEdge.direction || 'bidirectional'}
                        onFocus={onPushHistory}
                        onChange={(e) => onUpdateItem(activeEdge.id, 'edge', { direction: e.target.value as any })}
                      >
                         <option value="bidirectional">Bidirectional (Mutual)</option>
                         <option value="source-to-target">Source &rarr; Target</option>
                         <option value="target-to-source">Target &rarr; Source</option>
                      </select>
                    </div>
                 )}

                 <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.size}</label>
                  <input 
                    type="range" min={activeNode ? "0.5" : "0.05"} max={activeNode ? "3" : "0.5"} step="0.01" className="w-full" 
                    value={activeNode?.size || activeEdge?.size || 0.1} 
                    onPointerDown={onPushHistory} // Save history on drag start
                    onChange={(e) => onUpdateItem(activeNode?.id || activeEdge!.id, activeNode ? 'node' : 'edge', { size: parseFloat(e.target.value) })} 
                  />
                 </div>
                 
                 <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.color}</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" className="w-8 h-8 cursor-pointer rounded border border-gray-300 p-0 overflow-hidden" 
                      value={activeNode?.color || activeEdge?.color} 
                      onClick={onPushHistory} // Save history on click/open
                      onChange={(e) => onUpdateItem(activeNode?.id || activeEdge!.id, activeNode ? 'node' : 'edge', { color: e.target.value })} 
                    />
                    <div className="text-xs text-gray-400 flex items-center">{activeNode?.color || activeEdge?.color}</div>
                  </div>
                 </div>

                 <hr className="border-gray-200" />
                 
                 <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-bold text-slate-600">{t.files}</span>
                     <button onClick={() => attachmentInputRef.current?.click()} className="text-xs bg-slate-200 p-1 rounded"><Plus size={14} /></button>
                     <input type="file" ref={attachmentInputRef} className="hidden" onChange={(e) => { if(e.target.files?.[0]) onFileUpload(e.target.files[0]); }} />
                  </div>
                  {activeFiles.length === 0 ? <div className="text-xs text-gray-400 text-center py-2">{t.noFiles}</div> : 
                    <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                      {activeFiles.map(file => (
                        <div key={file.id} className="flex justify-between items-center bg-white border p-1 rounded text-xs">
                           <div className="flex items-center gap-1 overflow-hidden">
                             {file.type.startsWith('image') ? <ImageIcon size={10} className="text-blue-500"/> : <FileText size={10} className="text-gray-500"/>}
                             {file.isAiGenerated && <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded">AI</span>}
                             <span className="truncate max-w-[120px]">{file.name}</span>
                           </div>
                           <button onClick={() => onDeleteFile(file.id)} className="text-red-500 hover:bg-red-50 p-0.5 rounded"><X size={12}/></button>
                        </div>
                      ))}
                    </div>
                  }
                </div>

                <hr className="border-gray-200" />

                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.summary}</label>
                  <textarea 
                    className="w-full border rounded p-1 text-sm h-16 bg-gray-50 focus:bg-white transition-colors" 
                    value={activeNode?.summary || activeEdge?.summary || ""} 
                    onFocus={onPushHistory}
                    onChange={(e) => onUpdateItem(activeNode?.id || activeEdge!.id, activeNode ? 'node' : 'edge', { summary: e.target.value })} 
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.fullContent}</label>
                  <textarea 
                    className="w-full border rounded p-1 text-sm h-24 bg-gray-50 focus:bg-white transition-colors" 
                    value={activeNode?.fullContent || activeEdge?.fullContent || ""} 
                    onFocus={onPushHistory}
                    onChange={(e) => onUpdateItem(activeNode?.id || activeEdge!.id, activeNode ? 'node' : 'edge', { fullContent: e.target.value })} 
                  />
                </div>

                <button onClick={onDeleteItem} className="mt-2 bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded flex items-center justify-center gap-2 text-sm font-medium transition-colors">
                  <Trash2 size={16} /> <span>{t.delete}</span>
                </button>
              </div>
            )}
            
            {!activeNode && !activeEdge && (
              <div className="text-center text-gray-400 py-4 text-xs italic">
                {t.selectSource}
              </div>
            )}
          </Panel>
        </div>
      )}
      
      {/* Tooltip & Hints */}
      {hoverInfo && !presentationMode.isOpen && (
        <div 
          className="fixed z-30 pointer-events-none bg-gray-900/95 backdrop-blur text-white p-4 rounded-lg shadow-2xl border border-gray-600 max-w-sm transition-opacity left-1/2 -translate-x-1/2"
          style={{ bottom: '2rem' }} 
          dir={getDir(lang)}
        >
          <div className="font-bold text-xl mb-2 text-blue-300">{hoverInfo.label}</div>
          <div className="text-gray-300 text-sm mb-3 border-b border-gray-700 pb-2 leading-relaxed">{hoverInfo.summary}</div>
          <div className="text-gray-400 text-xs whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{hoverInfo.full}</div>
        </div>
      )}

      {uiPanels.hints && (
        <div className="absolute bottom-4 right-4 text-xs text-gray-500 pointer-events-none bg-white/80 backdrop-blur-sm p-2 rounded border border-gray-200 shadow-sm z-10">
          {t.hints}
        </div>
      )}

    </>
  );
};