import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Link as LinkIcon, Download, Upload, 
  Trash2, Save, MapPin, ChevronUp, ChevronDown, 
  Settings, Camera, FileJson, MousePointer2,
  Menu, HelpCircle, Eye, Check, X, Layers, FileText, Image as ImageIcon,
  Loader2, Globe, RefreshCw
} from 'lucide-react';
import { AppState, GraphNodeData, GraphEdgeData, UIPanelsState, AttachedFile, Language } from '../types';
import { translations, getDir } from '../utils/translations';

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
  };
  setPresentationMode: (mode: any) => void;
  onRegeneratePresentation: (lang: Language) => void;
}

const Panel: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ 
  title, icon, children, defaultOpen = true 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg mb-4 overflow-hidden w-64 transition-all duration-200">
      <div 
        className="bg-gray-100 p-2 flex items-center justify-between cursor-pointer hover:bg-gray-200 select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
          {icon}
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
      {isOpen && <div className="p-3 text-sm">{children}</div>}
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

// New Presentation Modal with Image Injection
const PresentationModal: React.FC<{ 
  isOpen: boolean; 
  isLoading: boolean; 
  content: string; 
  files: AttachedFile[];
  targetLanguage: Language;
  onClose: () => void;
  onRegenerate: (lang: Language) => void;
  uiLang: Language;
}> = ({ isOpen, isLoading, content, files, targetLanguage, onClose, onRegenerate, uiLang }) => {
  if (!isOpen) return null;
  const t = translations[uiLang];

  // Process Content: Inject Base64 Images where AI placed placeholders
  let processedContent = content;
  if (!isLoading && files.length > 0) {
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        // AI uses <img src="FILE_ID" ...>
        // We replace "FILE_ID" with the actual Base64 content
        const placeholder = `"${file.id}"`;
        const replacement = `"${file.content}"`;
        // Replace all occurrences
        processedContent = processedContent.replaceAll(placeholder, replacement);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300" dir={getDir(uiLang)}>
      {/* Header */}
      <div className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 shadow-md">
        <div className="flex items-center gap-2">
          <Layers className="text-blue-400" />
          <h1 className="text-xl font-bold">{t.presentationTitle}</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Language Selector for Presentation */}
          <div className="flex items-center gap-2 bg-slate-800 rounded px-2 py-1">
             <span className="text-xs text-gray-400">{t.presLang}:</span>
             <select 
               className="bg-transparent text-sm outline-none cursor-pointer text-white"
               value={targetLanguage}
               disabled={isLoading}
               onChange={(e) => onRegenerate(e.target.value as Language)}
             >
               <option value="fa" className="text-slate-900">{t.persian}</option>
               <option value="en" className="text-slate-900">{t.english}</option>
             </select>
             {isLoading && <Loader2 size={14} className="animate-spin" />}
          </div>

          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors" title={t.close}>
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-gray-50 flex justify-center">
        <div className="w-full max-w-4xl bg-white shadow-xl rounded-xl min-h-[500px] p-8">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 py-20">
              <Loader2 size={48} className="animate-spin text-blue-500" />
              <p className="text-lg animate-pulse">{t.loadingAI}</p>
            </div>
          ) : (
             <div 
               className="prose prose-lg max-w-none"
               // The content direction depends on the GENERATED language, not UI language
               dir={targetLanguage === 'fa' ? 'rtl' : 'ltr'}
               dangerouslySetInnerHTML={{ __html: processedContent }}
             />
          )}
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
  onRegeneratePresentation
}) => {
  const [camInput, setCamInput] = useState({ x: 0, y: 10, z: 20 });
  const [activeMenu, setActiveMenu] = useState<'file' | 'view' | 'lang' | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const lang = appState.appLanguage;
  const t = translations[lang];

  // Close menus when clicking outside
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
        className="fixed top-0 left-0 right-0 h-12 bg-slate-800 text-white shadow-md z-40 flex items-center px-4 justify-between select-none"
        onClick={(e) => e.stopPropagation()} 
        dir={getDir(lang)}
      >
        <div className="flex items-center gap-6 h-full">
          <div className="font-bold text-lg tracking-wider flex items-center gap-2">
            <span className="text-blue-400">Graph</span>Pro
          </div>

          {/* Menus */}
          <div className="flex items-center h-full gap-1">
            
            {/* File Menu */}
            <div className="relative h-full flex items-center">
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'file' ? null : 'file'); }}
                className={`px-3 py-1 rounded hover:bg-slate-700 transition-colors ${activeMenu === 'file' ? 'bg-slate-700' : ''}`}
              >
                {t.file}
              </button>
              {activeMenu === 'file' && (
                <div className={`absolute top-10 ${lang === 'fa' ? 'right-0' : 'left-0'} w-48 bg-white text-slate-800 rounded shadow-xl border border-gray-200 overflow-hidden flex flex-col z-50`}>
                   <button 
                    className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 w-full transition-colors border-b border-gray-100"
                    onClick={onExport}
                   >
                     <Save size={16} className="text-blue-600" /> {t.save}
                   </button>
                   <button 
                    className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 w-full transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                   >
                     <Upload size={16} className="text-amber-600" /> {t.load}
                   </button>
                   <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json" 
                    onChange={(e) => {
                      if (e.target.files?.[0]) onImport(e.target.files[0]);
                      setActiveMenu(null);
                    }} 
                   />
                </div>
              )}
            </div>

            {/* View Menu */}
            <div className="relative h-full flex items-center">
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'view' ? null : 'view'); }}
                className={`px-3 py-1 rounded hover:bg-slate-700 transition-colors ${activeMenu === 'view' ? 'bg-slate-700' : ''}`}
              >
                {t.view}
              </button>
              {activeMenu === 'view' && (
                <div className={`absolute top-10 ${lang === 'fa' ? 'right-0' : 'left-0'} w-56 bg-white text-slate-800 rounded shadow-xl border border-gray-200 overflow-hidden flex flex-col z-50 p-2`}>
                   <label className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input type="checkbox" checked={uiPanels.tools} onChange={() => togglePanel('tools')} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span>{t.toolsPanel}</span>
                   </label>
                   <label className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input type="checkbox" checked={uiPanels.properties} onChange={() => togglePanel('properties')} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span>{t.propsPanel}</span>
                   </label>
                   <label className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input type="checkbox" checked={uiPanels.camera} onChange={() => togglePanel('camera')} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span>{t.camPanel}</span>
                   </label>
                   <div className="h-px bg-gray-200 my-1"></div>
                   <label className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input type="checkbox" checked={uiPanels.hints} onChange={() => togglePanel('hints')} className="rounded text-blue-600 focus:ring-blue-500" />
                      <span>{t.hintsPanel}</span>
                   </label>
                </div>
              )}
            </div>

             {/* Language Menu */}
             <div className="relative h-full flex items-center">
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'lang' ? null : 'lang'); }}
                className={`px-3 py-1 rounded hover:bg-slate-700 transition-colors flex items-center gap-1 ${activeMenu === 'lang' ? 'bg-slate-700' : ''}`}
              >
                <Globe size={16} /> {lang.toUpperCase()}
              </button>
              {activeMenu === 'lang' && (
                <div className={`absolute top-10 ${lang === 'fa' ? 'right-0' : 'left-0'} w-32 bg-white text-slate-800 rounded shadow-xl border border-gray-200 overflow-hidden flex flex-col z-50`}>
                   <button 
                    className={`flex items-center gap-2 px-4 py-2 hover:bg-blue-50 w-full transition-colors ${lang === 'fa' ? 'bg-blue-50 font-bold' : ''}`}
                    onClick={() => setAppState(prev => ({ ...prev, appLanguage: 'fa' }))}
                   >
                     {t.persian}
                   </button>
                   <button 
                    className={`flex items-center gap-2 px-4 py-2 hover:bg-blue-50 w-full transition-colors ${lang === 'en' ? 'bg-blue-50 font-bold' : ''}`}
                    onClick={() => setAppState(prev => ({ ...prev, appLanguage: 'en' }))}
                   >
                     {t.english}
                   </button>
                </div>
              )}
            </div>

            {/* Help Button */}
             <button 
                onClick={() => setShowHelp(true)}
                className="px-3 py-1 rounded hover:bg-slate-700 transition-colors flex items-center gap-1"
              >
                {t.help}
              </button>
          </div>
        </div>
      </div>

      {/* --- Help Modal --- */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} lang={lang} />}
      
      {/* --- Presentation Modal --- */}
      <PresentationModal 
        isOpen={presentationMode.isOpen} 
        isLoading={presentationMode.isLoading}
        content={presentationMode.content}
        files={presentationMode.activeFiles}
        targetLanguage={presentationMode.targetLanguage}
        uiLang={lang}
        onClose={() => setPresentationMode({ ...presentationMode, isOpen: false })}
        onRegenerate={onRegeneratePresentation}
      />

      {/* --- Tooltip Modal (Positioned Bottom Right) --- */}
      {hoverInfo && !presentationMode.isOpen && (
        <div 
          className="fixed z-30 pointer-events-none bg-gray-900/95 backdrop-blur text-white p-4 rounded-lg shadow-2xl border border-gray-600 max-w-sm transition-opacity"
          style={{ bottom: '80px', [lang === 'fa' ? 'right' : 'left']: '20px' }} 
          dir={getDir(lang)}
        >
          <div className="font-bold text-xl mb-2 text-blue-300">{hoverInfo.label}</div>
          <div className="text-gray-300 text-sm mb-3 border-b border-gray-700 pb-2 leading-relaxed">{hoverInfo.summary}</div>
          <div className="text-gray-400 text-xs whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{hoverInfo.full}</div>
        </div>
      )}

      {/* --- Right/Left Sidebar (Tools) --- */}
      {uiPanels.tools && (
        <div className={`absolute top-16 ${lang === 'fa' ? 'right-4' : 'left-4'} z-10 flex flex-col max-h-[90vh] overflow-y-auto pr-1`}>
          <Panel title={t.toolTitle} icon={<Settings size={16} />}>
            <div className="flex flex-col gap-2">
              <button 
                onClick={onAddNode}
                className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded transition-colors"
              >
                <Plus size={16} />
                <span>{t.newNode}</span>
              </button>
              <button 
                onClick={onToggleEdgeMode}
                className={`flex items-center justify-center gap-2 p-2 rounded transition-colors text-white ${
                  appState.mode !== 'select' ? 'bg-green-600 ring-2 ring-green-300' : 'bg-gray-500 hover:bg-gray-600'
                }`}
              >
                <LinkIcon size={16} />
                <span>{appState.mode === 'select' ? t.connect : t.cancelConnect}</span>
              </button>
              {appState.mode !== 'select' && (
                <div className="text-xs text-center text-orange-600 font-bold bg-orange-100 p-1 rounded border border-orange-200">
                  {appState.mode === 'edge-start' ? t.selectSource : t.selectTarget}
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* --- Left/Right Sidebar (Properties & Camera) --- */}
      <div className={`absolute top-16 ${lang === 'fa' ? 'left-4' : 'right-4'} z-10 flex flex-col max-h-[90vh] overflow-y-auto pl-1 gap-0`}>
        
        {uiPanels.properties && (
          <Panel title={t.propTitle} icon={<MousePointer2 size={16} />}>
            {/* Multi Select Header */}
            {isMultiSelect && (
              <div className="bg-blue-50 border-b border-blue-100 p-2 mb-2 rounded text-blue-800 text-xs font-bold flex items-center gap-2">
                 <Layers size={14} />
                 <span>{appState.selectedIds.length} {t.multiSelect}</span>
              </div>
            )}

            {activeNode && (
              <div className="flex flex-col gap-3">
                 {/* Select Similar Button */}
                 {!isMultiSelect && (
                   <button 
                    onClick={onSelectSameColor}
                    className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 p-1.5 rounded text-xs transition-colors mb-1"
                    title={t.selectSimilar}
                   >
                     <Eye size={14} /> <span>{t.selectSimilar}</span>
                   </button>
                 )}

                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.label}</label>
                  <input 
                    type="text" 
                    className="w-full border rounded p-1 text-sm bg-gray-50 focus:bg-white transition-colors" 
                    value={activeNode.label}
                    onChange={(e) => onUpdateItem(activeNode.id, 'node', { label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.size}</label>
                  <input 
                    type="range" min="0.5" max="3" step="0.1" 
                    className="w-full"
                    value={activeNode.size}
                    onChange={(e) => onUpdateItem(activeNode.id, 'node', { size: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.color}</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      className="w-8 h-8 cursor-pointer rounded border border-gray-300 p-0 overflow-hidden"
                      value={activeNode.color}
                      onChange={(e) => onUpdateItem(activeNode.id, 'node', { color: e.target.value })}
                    />
                    <div className="text-xs text-gray-400 flex items-center">{activeNode.color}</div>
                  </div>
                </div>
                <hr className="border-gray-200" />
                
                {/* File Upload Section */}
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-bold text-slate-600">{t.files}</span>
                     <button 
                       onClick={() => attachmentInputRef.current?.click()}
                       className="text-xs bg-slate-200 hover:bg-slate-300 p-1 rounded transition-colors"
                     >
                       <Plus size={14} />
                     </button>
                     <input 
                       type="file" 
                       ref={attachmentInputRef} 
                       className="hidden" 
                       multiple={false}
                       onChange={(e) => {
                         if(e.target.files?.[0]) onFileUpload(e.target.files[0]);
                       }} 
                     />
                  </div>
                  {activeFiles.length === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-2">{t.noFiles}</div>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                      {activeFiles.map(file => (
                        <div key={file.id} className="flex justify-between items-center bg-white border p-1 rounded text-xs">
                           <div className="flex items-center gap-1 overflow-hidden">
                             {file.type.startsWith('image') ? <ImageIcon size={10} className="text-blue-500"/> : <FileText size={10} className="text-gray-500"/>}
                             <span className="truncate max-w-[120px]">{file.name}</span>
                           </div>
                           <button onClick={() => onDeleteFile(file.id)} className="text-red-500 hover:bg-red-50 p-0.5 rounded"><X size={12}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-gray-200" />
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.summary}</label>
                  <textarea 
                    className="w-full border rounded p-1 text-sm h-16 bg-gray-50 focus:bg-white transition-colors"
                    value={activeNode.summary}
                    onChange={(e) => onUpdateItem(activeNode.id, 'node', { summary: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.fullContent}</label>
                  <textarea 
                    className="w-full border rounded p-1 text-sm h-24 bg-gray-50 focus:bg-white transition-colors"
                    value={activeNode.fullContent}
                    onChange={(e) => onUpdateItem(activeNode.id, 'node', { fullContent: e.target.value })}
                  />
                </div>
                <button onClick={onDeleteItem} className="mt-2 bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded flex items-center justify-center gap-2 text-sm font-medium transition-colors">
                  <Trash2 size={16} /> <span>{t.delete}</span>
                </button>
              </div>
            )}

            {activeEdge && (
              <div className="flex flex-col gap-3">
                 {/* Select Similar Button */}
                 {!isMultiSelect && (
                   <button 
                    onClick={onSelectSameColor}
                    className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 p-1.5 rounded text-xs transition-colors mb-1"
                    title={t.selectSimilar}
                   >
                     <Eye size={14} /> <span>{t.selectSimilar}</span>
                   </button>
                 )}

                 <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.label}</label>
                  <input 
                    type="text" 
                    className="w-full border rounded p-1 text-sm bg-gray-50 focus:bg-white" 
                    value={activeEdge.label}
                    onChange={(e) => onUpdateItem(activeEdge.id, 'edge', { label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.size}</label>
                  <input 
                    type="range" min="0.05" max="0.5" step="0.01" 
                    className="w-full"
                    value={activeEdge.size || 0.1}
                    onChange={(e) => onUpdateItem(activeEdge.id, 'edge', { size: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.color}</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      className="w-8 h-8 cursor-pointer rounded border border-gray-300 p-0 overflow-hidden"
                      value={activeEdge.color}
                      onChange={(e) => onUpdateItem(activeEdge.id, 'edge', { color: e.target.value })}
                    />
                    <div className="text-xs text-gray-400 flex items-center">{activeEdge.color}</div>
                  </div>
                </div>
                <hr className="border-gray-200" />
                
                {/* File Upload Section (Duplicated for Edge) */}
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-bold text-slate-600">{t.files}</span>
                     <button 
                       onClick={() => attachmentInputRef.current?.click()}
                       className="text-xs bg-slate-200 hover:bg-slate-300 p-1 rounded transition-colors"
                     >
                       <Plus size={14} />
                     </button>
                     <input 
                       type="file" 
                       ref={attachmentInputRef} 
                       className="hidden" 
                       multiple={false}
                       onChange={(e) => {
                         if(e.target.files?.[0]) onFileUpload(e.target.files[0]);
                       }} 
                     />
                  </div>
                  {activeFiles.length === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-2">{t.noFiles}</div>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                      {activeFiles.map(file => (
                        <div key={file.id} className="flex justify-between items-center bg-white border p-1 rounded text-xs">
                           <div className="flex items-center gap-1 overflow-hidden">
                             {file.type.startsWith('image') ? <ImageIcon size={10} className="text-blue-500"/> : <FileText size={10} className="text-gray-500"/>}
                             <span className="truncate max-w-[120px]">{file.name}</span>
                           </div>
                           <button onClick={() => onDeleteFile(file.id)} className="text-red-500 hover:bg-red-50 p-0.5 rounded"><X size={12}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-gray-200" />
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.summary}</label>
                  <textarea 
                    className="w-full border rounded p-1 text-sm h-16 bg-gray-50 focus:bg-white transition-colors"
                    value={activeEdge.summary || ""}
                    onChange={(e) => onUpdateItem(activeEdge.id, 'edge', { summary: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.fullContent}</label>
                  <textarea 
                    className="w-full border rounded p-1 text-sm h-24 bg-gray-50 focus:bg-white transition-colors"
                    value={activeEdge.fullContent || ""}
                    onChange={(e) => onUpdateItem(activeEdge.id, 'edge', { fullContent: e.target.value })}
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
        )}

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
               Position: {Math.round(cameraPos.x)}, {Math.round(cameraPos.y)}, {Math.round(cameraPos.z)}
             </div>
          </Panel>
        )}
      </div>

      {/* --- Footer Hints --- */}
      {uiPanels.hints && (
        <div className="absolute bottom-4 left-4 text-xs text-gray-500 pointer-events-none bg-white/80 backdrop-blur-sm p-2 rounded border border-gray-200 shadow-sm z-10">
          {t.hints}
        </div>
      )}
    </>
  );
};