import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Link as LinkIcon, Download, Upload, 
  Trash2, Save, MapPin, ChevronUp, ChevronDown, 
  Settings, Camera, FileJson, MousePointer2,
  Menu, HelpCircle, Eye, Check, X, Layers, FileText, Image as ImageIcon,
  Loader2, Globe, RefreshCw, Cake, Lightbulb, MessageSquare, Send, ArrowRightLeft,
  Undo2, Redo2, BrainCircuit, Bot, Sparkles, Box, Circle, Triangle, Database, Disc
} from 'lucide-react';
import { AppState, GraphNodeData, GraphEdgeData, UIPanelsState, AttachedFile, Language, ChatMessage, AIMode, NodeShape } from '../types';
import { translations, getDir } from '../utils/translations';
import { PresentationModal } from './PresentationModal';
import { AIArchitectModal } from './AIArchitectModal';
import { FinalizationModal } from './FinalizationModal';

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
    modeTitle?: string;
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

// Compact Panel
const Panel: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; widthClass?: string }> = ({ 
  title, icon, children, defaultOpen = true, widthClass = 'w-56'
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={`bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg overflow-hidden ${widthClass} transition-all duration-200 pointer-events-auto shrink-0`}>
      <div 
        className="bg-slate-100/90 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-200/80 select-none border-b border-slate-200/70"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 truncate">
          {icon}
          <span className="truncate">{title}</span>
        </div>
        {isOpen ? <ChevronUp size={14} className="shrink-0 text-slate-500" /> : <ChevronDown size={14} className="shrink-0 text-slate-500" />}
      </div>
      {isOpen && <div className="p-3 text-xs">{children}</div>}
    </div>
  );
};

const HelpModal: React.FC<{ onClose: () => void; lang: Language }> = ({ onClose, lang }) => {
  const t = translations[lang];
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir={getDir(lang)}>
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
  const [showFinalize, setShowFinalize] = useState(false);
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
        className="fixed top-0 left-0 right-0 h-12 bg-slate-900 text-white shadow-md z-[120] flex items-center px-3 md:px-4 justify-between gap-2 select-none pointer-events-auto border-b border-slate-700/80"
        onClick={(e) => e.stopPropagation()} 
        dir={getDir(lang)}
      >
        <div className="flex items-center gap-2 md:gap-3 h-full min-w-0">
          <div dir="ltr" className="font-bold text-base md:text-lg tracking-wider flex items-center shrink-0">
            <span className="text-blue-400">Graph</span><span>Pro</span>
          </div>

          <div className="h-5 w-px bg-slate-700 shrink-0" />

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button 
              onClick={onUndo} 
              disabled={!canUndo} 
              className="p-1.5 rounded-md hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title={t.undo}
            >
              <Undo2 size={16} />
            </button>
            <button 
              onClick={onRedo} 
              disabled={!canRedo} 
              className="p-1.5 rounded-md hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title={t.redo}
            >
              <Redo2 size={16} />
            </button>
          </div>

          <div className="h-5 w-px bg-slate-700 shrink-0 hidden sm:block" />

          {/* Primary Menus */}
          <div className="flex items-center h-full gap-1 text-xs md:text-sm">
            <div className="relative h-full flex items-center">
              <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'file' ? null : 'file'); }} className="px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap">{t.file}</button>
              {activeMenu === 'file' && (
                <div className={`absolute top-full mt-1 ${lang === 'fa' ? 'right-0' : 'left-0'} w-44 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden`}>
                  <button className="flex items-center gap-2 px-3.5 py-2.5 hover:bg-blue-50 w-full text-start text-xs font-medium" onClick={() => { onExport(); setActiveMenu(null); }}><Save size={15}/> {t.save}</button>
                  <button className="flex items-center gap-2 px-3.5 py-2.5 hover:bg-blue-50 w-full text-start text-xs font-medium" onClick={() => fileInputRef.current?.click()}><Upload size={15}/> {t.load}</button>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => { if (e.target.files?.[0]) onImport(e.target.files[0]); setActiveMenu(null); }} />
                </div>
              )}
            </div>

            <div className="relative h-full flex items-center">
              <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'view' ? null : 'view'); }} className="px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap">{t.view}</button>
              {activeMenu === 'view' && (
                <div className={`absolute top-full mt-1 ${lang === 'fa' ? 'right-0' : 'left-0'} w-52 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 z-50 p-1.5`}>
                  <label className="flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 rounded-md cursor-pointer text-xs"><input type="checkbox" checked={uiPanels.tools} onChange={() => togglePanel('tools')} className="rounded text-blue-600"/><span>{t.toolsPanel}</span></label>
                  <label className="flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 rounded-md cursor-pointer text-xs"><input type="checkbox" checked={uiPanels.properties} onChange={() => togglePanel('properties')} className="rounded text-blue-600"/><span>{t.propsPanel}</span></label>
                  <label className="flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 rounded-md cursor-pointer text-xs"><input type="checkbox" checked={uiPanels.camera} onChange={() => togglePanel('camera')} className="rounded text-blue-600"/><span>{t.camPanel}</span></label>
                  <label className="flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 rounded-md cursor-pointer text-xs"><input type="checkbox" checked={uiPanels.hints} onChange={() => togglePanel('hints')} className="rounded text-blue-600"/><span>{t.hintsPanel}</span></label>
                </div>
              )}
            </div>

            <div className="relative h-full flex items-center">
              <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'lang' ? null : 'lang'); }} className="px-2.5 py-1.5 rounded-md hover:bg-slate-800 flex items-center gap-1 whitespace-nowrap"><Globe size={15}/> <span>{lang.toUpperCase()}</span></button>
              {activeMenu === 'lang' && (
                <div className={`absolute top-full mt-1 ${lang === 'fa' ? 'right-0' : 'left-0'} w-32 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden`}>
                  <button className="flex items-center gap-2 px-3.5 py-2 hover:bg-blue-50 w-full text-start text-xs font-medium" onClick={() => { setAppState(prev => ({ ...prev, appLanguage: 'fa' })); setActiveMenu(null); }}>{t.persian}</button>
                  <button className="flex items-center gap-2 px-3.5 py-2 hover:bg-blue-50 w-full text-start text-xs font-medium" onClick={() => { setAppState(prev => ({ ...prev, appLanguage: 'en' })); setActiveMenu(null); }}>{t.english}</button>
                </div>
              )}
            </div>

            <button onClick={() => setShowHelp(true)} className="px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap hidden sm:inline-flex">{t.help}</button>
          </div>
        </div>

        {/* Right / End AI & Mode Controls */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {/* Dynamic AI Buttons (Visible when item selected) */}
          {(activeNode || activeEdge) && !presentationMode.isOpen && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={onCakePresentation}
                className="px-2.5 py-1.5 rounded-md bg-pink-600 hover:bg-pink-700 flex items-center gap-1.5 transition-colors shadow-sm font-medium text-xs whitespace-nowrap"
                title={t.cakePres}
              >
                <Cake size={14} className="shrink-0" /> 
                <span className="hidden xl:inline">{t.cakePres}</span>
              </button>
              <button 
                onClick={onSmartGuide}
                className="px-2.5 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 flex items-center gap-1.5 transition-colors shadow-sm font-medium text-xs whitespace-nowrap"
                title={t.smartGuide}
              >
                <Lightbulb size={14} className="shrink-0" /> 
                <span className="hidden xl:inline">{t.smartGuide}</span>
              </button>
            </div>
          )}

          {/* Mode Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-md px-2 py-1 shrink-0">
            <Bot size={15} className="text-emerald-400 shrink-0"/>
            <select 
              className="bg-transparent text-xs text-white outline-none cursor-pointer max-w-[105px] sm:max-w-[140px]"
              value={appState.aiMode}
              onChange={(e) => setAppState(prev => ({ ...prev, aiMode: e.target.value as AIMode }))}
            >
              <option value="presentation" className="text-slate-900">{t.modes.presentation}</option>
              <option value="writing" className="text-slate-900">{t.modes.writing}</option>
              <option value="coding" className="text-slate-900">{t.modes.coding}</option>
              <option value="law" className="text-slate-900">{t.modes.law}</option>
              <option value="chemistry" className="text-slate-900">{t.modes.chemistry}</option>
              <option value="investigation" className="text-slate-900">{t.modes.investigation}</option>
              <option value="journalism" className="text-slate-900">{t.modes.journalism}</option>
              <option value="gameDesign" className="text-slate-900">{t.modes.gameDesign}</option>
            </select>
          </div>

          {/* AI Architect Button */}
          <button 
            onClick={() => setShowArchitect(true)}
            className="px-2.5 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 flex items-center gap-1.5 transition-colors shadow-sm font-medium text-xs whitespace-nowrap shrink-0"
            title={t.aiArchitect}
          >
            <BrainCircuit size={15} className="shrink-0" /> 
            <span className="hidden md:inline">{t.aiArchitect}</span>
          </button>

          {/* Finalize Button */}
          <button 
            onClick={() => setShowFinalize(true)}
            className="px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 transition-colors shadow-sm font-medium text-xs whitespace-nowrap shrink-0"
            title={t.finalize}
          >
            <Sparkles size={15} className="shrink-0" /> 
            <span className="hidden md:inline">{t.finalize}</span>
          </button>
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
      
      <FinalizationModal
        isOpen={showFinalize}
        onClose={() => setShowFinalize(false)}
        lang={lang}
        aiMode={appState.aiMode}
        nodes={nodes}
        edges={edges}
      />

      <PresentationModal 
        isOpen={presentationMode.isOpen} 
        isLoading={presentationMode.isLoading}
        content={presentationMode.content}
        files={presentationMode.activeFiles}
        targetLanguage={presentationMode.targetLanguage}
        activeItemId={presentationMode.activeItemId}
        modeTitle={presentationMode.modeTitle}
        nodes={nodes}
        edges={edges}
        uiLang={lang}
        onClose={() => setPresentationMode({ ...presentationMode, isOpen: false })}
        onRegenerate={onRegeneratePresentation}
        onSaveContent={(c) => {}} // Placeholder
        onAddFile={onAddFile}
        onRemoveFile={onRemoveFile}
      />

      {/* Sidebar Container: Tools & Camera */}
      <div className={`absolute top-16 ${lang === 'fa' ? 'right-3 md:right-4' : 'left-3 md:left-4'} z-10 flex flex-col gap-3 max-h-[calc(100vh-5rem)] overflow-y-auto pointer-events-none`}>
        {uiPanels.tools && (
          <Panel title={t.toolTitle} icon={<Settings size={15} />} widthClass="w-56">
            <div className="flex flex-col gap-2">
              <button onClick={onAddNode} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg justify-center font-medium transition-colors shadow-sm"><Plus size={16}/>{t.newNode}</button>
              <button onClick={onToggleEdgeMode} className={`flex items-center gap-2 text-white py-2 px-3 rounded-lg justify-center font-medium transition-colors shadow-sm ${appState.mode === 'select' ? 'bg-slate-600 hover:bg-slate-700' : 'bg-orange-600 hover:bg-orange-700'}`}><LinkIcon size={16}/>{appState.mode === 'select' ? t.connect : t.cancelConnect}</button>
              {appState.mode !== 'select' && (
                <div className="text-xs text-center text-orange-700 font-semibold bg-orange-50 p-1.5 rounded-md border border-orange-200">
                  {appState.mode === 'edge-start' ? t.selectSource : t.selectTarget}
                </div>
              )}
            </div>
          </Panel>
        )}

        {uiPanels.camera && (
          <Panel title={t.camTitle} icon={<Camera size={15} />} widthClass="w-56">
             <div className="flex gap-1.5 mb-2" dir="ltr">
                <input type="number" placeholder="X" className="w-1/3 min-w-0 border border-slate-200 rounded-md p-1.5 text-xs text-center bg-slate-50 focus:bg-white focus:outline-blue-500" value={camInput.x} onChange={e => setCamInput({...camInput, x: parseFloat(e.target.value) || 0})} />
                <input type="number" placeholder="Y" className="w-1/3 min-w-0 border border-slate-200 rounded-md p-1.5 text-xs text-center bg-slate-50 focus:bg-white focus:outline-blue-500" value={camInput.y} onChange={e => setCamInput({...camInput, y: parseFloat(e.target.value) || 0})} />
                <input type="number" placeholder="Z" className="w-1/3 min-w-0 border border-slate-200 rounded-md p-1.5 text-xs text-center bg-slate-50 focus:bg-white focus:outline-blue-500" value={camInput.z} onChange={e => setCamInput({...camInput, z: parseFloat(e.target.value) || 0})} />
             </div>
             <button 
              onClick={() => onCameraTeleport(camInput.x, camInput.y, camInput.z)}
              className="w-full bg-slate-700 hover:bg-slate-800 text-white py-1.5 px-2 rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors font-medium"
            >
               <MapPin size={13} /> {t.jump}
             </button>
             <div dir="ltr" className="mt-2 text-center text-[11px] text-slate-500 font-mono">
               Pos: {Math.round(cameraPos.x)}, {Math.round(cameraPos.y)}, {Math.round(cameraPos.z)}
             </div>
          </Panel>
        )}
      </div>

      {/* Sidebar: Properties */}
      {uiPanels.properties && (
        <div className={`absolute top-16 ${lang === 'fa' ? 'left-3 md:left-4' : 'right-3 md:right-4'} z-10 flex flex-col max-h-[calc(100vh-5rem)] overflow-y-auto pointer-events-none`}>
          <Panel title={t.propTitle} icon={<MousePointer2 size={15} />} widthClass="w-64">
            {(activeNode || activeEdge) && (
              <div className="flex flex-col gap-3">
                 
                 {isMultiSelect && (
                   <div className="bg-blue-50 border border-blue-100 p-2 rounded-lg text-blue-800 text-xs font-bold flex items-center gap-2">
                      <Layers size={14} />
                      <span>{appState.selectedIds.length} {t.multiSelect}</span>
                   </div>
                 )}
                 
                 {!isMultiSelect && (
                   <button onClick={onSelectSameColor} className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 p-1.5 rounded-lg text-xs font-medium transition-colors">
                     <Eye size={14} /> <span>{t.selectSimilar}</span>
                   </button>
                 )}

                 <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">{t.label}</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm bg-slate-50 focus:bg-white focus:outline-blue-500 transition-colors" 
                    value={activeNode?.label ?? activeEdge?.label ?? ''} 
                    onFocus={onPushHistory} 
                    onChange={(e) => onUpdateItem(activeNode?.id || activeEdge!.id, activeNode ? 'node' : 'edge', { label: e.target.value })} 
                  />
                 </div>
                 
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

                 {activeNode && (
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">{t.shape}</label>
                      <div className="grid grid-cols-3 gap-1">
                        {['sphere', 'box', 'cylinder', 'capsule', 'torus', 'cone'].map((shape) => (
                           <button
                             key={shape}
                             onClick={() => { onPushHistory(); onUpdateItem(activeNode.id, 'node', { shape: shape as NodeShape }) }}
                             className={`p-1 rounded border flex flex-col items-center justify-center gap-1 text-[10px] ${activeNode.shape === shape || (!activeNode.shape && shape === 'sphere') ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                             title={t.shapes[shape as keyof typeof t.shapes]}
                           >
                             {shape === 'sphere' && <Circle size={12} />}
                             {shape === 'box' && <Box size={12} />}
                             {shape === 'cylinder' && <Database size={12} />}
                             {shape === 'capsule' && <div className="w-2 h-3 border rounded-full border-current" />}
                             {shape === 'torus' && <Disc size={12} />}
                             {shape === 'cone' && <Triangle size={12} />}
                             <span className="truncate w-full text-center">{t.shapes[shape as keyof typeof t.shapes]}</span>
                           </button>
                        ))}
                      </div>
                    </div>
                 )}

                 <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.size}</label>
                  <input 
                    type="range" min={activeNode ? "0.5" : "0.05"} max={activeNode ? "3" : "0.5"} step="0.01" className="w-full" 
                    value={activeNode?.size || activeEdge?.size || 0.1} 
                    onPointerDown={onPushHistory}
                    onChange={(e) => onUpdateItem(activeNode?.id || activeEdge!.id, activeNode ? 'node' : 'edge', { size: parseFloat(e.target.value) })} 
                  />
                 </div>
                 
                 <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">{t.color}</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" className="w-8 h-8 cursor-pointer rounded border border-slate-300 p-0 overflow-hidden shrink-0" 
                      value={activeNode?.color ?? activeEdge?.color ?? '#2196F3'} 
                      onClick={onPushHistory} 
                      onChange={(e) => onUpdateItem(activeNode?.id || activeEdge!.id, activeNode ? 'node' : 'edge', { color: e.target.value })} 
                    />
                    <div dir="ltr" className="text-xs text-slate-500 font-mono">{activeNode?.color ?? activeEdge?.color}</div>
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
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
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
          className="fixed z-30 pointer-events-none bg-slate-900/95 backdrop-blur text-white p-4 rounded-xl shadow-2xl border border-slate-700 max-w-sm transition-opacity left-1/2 -translate-x-1/2 bottom-12"
          dir={getDir(lang)}
        >
          <div className="font-bold text-lg mb-1.5 text-blue-300">{hoverInfo.label}</div>
          <div className="text-slate-300 text-xs mb-2 border-b border-slate-700 pb-2 leading-relaxed">{hoverInfo.summary}</div>
          <div className="text-slate-400 text-xs whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{hoverInfo.full}</div>
        </div>
      )}

      {uiPanels.hints && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 text-xs text-slate-600 pointer-events-none bg-white/85 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm z-10 whitespace-nowrap">
          {t.hints}
        </div>
      )}

    </>
  );
};