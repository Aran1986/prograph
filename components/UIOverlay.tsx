import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Plus, Link as LinkIcon, Upload,
  Trash2, Save, MapPin, ChevronUp, ChevronDown,
  Settings, Camera, MousePointer2,
  HelpCircle, Eye, X, Layers, FileText, Image as ImageIcon,
  Globe, Cake, Lightbulb, ArrowRightLeft,
  Undo2, Redo2, BrainCircuit, Bot, Sparkles, Box, Circle, Triangle, Database, Disc,
  AlertCircle, CheckCircle2, Info, Search, FolderOpen, Square, Network
} from 'lucide-react';
import {
  AppState,
  GraphNodeData,
  GraphEdgeData,
  UIPanelsState,
  AttachedFile,
  Language,
  AIMode,
  NodeShape,
  AIArchitectDefinitions,
  ProjectWorkspace
} from '../types';
import { translations, getDir } from '../utils/translations';
import { PresentationModal } from './PresentationModal';
import { AIArchitectModal } from './AIArchitectModal';
import { FinalizationModal } from './FinalizationModal';
import { ProjectManagerModal } from './ProjectManagerModal';

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
  onToggleBoxSelectMode: () => void;
  snapToGrid: boolean;
  setSnapToGrid: React.Dispatch<React.SetStateAction<boolean>>;
  onAutoLayout: (kind: 'force' | 'radial') => void;
  onFocusItem: (id: string, type: 'node' | 'edge') => void;
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
  onSavePresentationContent: (newContent: string, itemId?: string) => void;
  onCakePresentation: () => void;
  onSmartGuide: () => void;
  onAddFile: (file: AttachedFile, itemId: string) => void;
  onRemoveFile: (fileId: string, itemId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onPushHistory: () => void;
  onApplyGraphFromAI: (nodes: any[], edges: any[]) => void;
  onApplyChangesFromAI: (changes: any) => void;
  architectDefs: AIArchitectDefinitions;
  setArchitectDefs: React.Dispatch<React.SetStateAction<AIArchitectDefinitions>>;
  onNotify: (message: string, type?: 'error' | 'success' | 'info') => void;
  toast: { message: string; type: 'error' | 'success' | 'info' } | null;
  onDismissToast: () => void;
  projects: ProjectWorkspace[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onDeleteProject: (id: string) => void;
}

const AI_MODES_LIST: AIMode[] = [
  'presentation',
  'writing',
  'coding',
  'law',
  'chemistry',
  'investigation',
  'journalism',
  'genealogy',
  'network',
  'supplyChain',
  'seo',
  'financial',
  'pkm',
  'mindMap',
  'gameDesign'
];

const Panel: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; widthClass?: string }> = ({
  title,
  icon,
  children,
  defaultOpen = true,
  widthClass = 'w-56'
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
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <HelpCircle size={20} /> {t.helpModal.title}
          </h2>
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded"><X size={20} /></button>
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
          <button onClick={onClose} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t.helpModal.btn}</button>
        </div>
      </div>
    </div>
  );
};

export const UIOverlay: React.FC<UIOverlayProps> = ({
  appState,
  nodes,
  edges,
  cameraPos,
  uiPanels,
  setUiPanels,
  setAppState,
  onAddNode,
  onToggleEdgeMode,
  onToggleBoxSelectMode,
  snapToGrid,
  setSnapToGrid,
  onAutoLayout,
  onFocusItem,
  onUpdateItem,
  onDeleteItem,
  onExport,
  onImport,
  onCameraTeleport,
  hoverInfo,
  onSelectSameColor,
  onFileUpload,
  onDeleteFile,
  presentationMode,
  setPresentationMode,
  onRegeneratePresentation,
  onSavePresentationContent,
  onCakePresentation,
  onSmartGuide,
  onAddFile,
  onRemoveFile,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onPushHistory,
  onApplyGraphFromAI,
  onApplyChangesFromAI,
  architectDefs,
  setArchitectDefs,
  onNotify,
  toast,
  onDismissToast,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject
}) => {
  const [camInput, setCamInput] = useState({ x: 0, y: 10, z: 20 });
  const [activeMenu, setActiveMenu] = useState<'file' | 'view' | 'lang' | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showArchitect, setShowArchitect] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
    setUiPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isMultiSelect = appState.selectedIds.length > 1;
  const activeNode = appState.activeType === 'node' ? nodes.find((n) => n.id === appState.selectedIds[0]) : null;
  const activeEdge = appState.activeType === 'edge' ? edges.find((e) => e.id === appState.selectedIds[0]) : null;
  const activeFiles = activeNode?.files || activeEdge?.files || [];
  const activeProject = projects.find((p) => p.id === activeProjectId);

  const modalActiveFiles =
    nodes.find((n) => n.id === presentationMode.activeItemId)?.files ||
    edges.find((e) => e.id === presentationMode.activeItemId)?.files ||
    presentationMode.activeFiles;

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const matchedNodes = nodes
      .filter((n) => n.label.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q))
      .map((n) => ({ id: n.id, label: n.label, color: n.color, type: 'node' as const }));
    const matchedEdges = edges
      .filter((e) => e.label.toLowerCase().includes(q) || e.summary.toLowerCase().includes(q))
      .map((e) => ({ id: e.id, label: e.label, color: e.color, type: 'edge' as const }));
    return [...matchedNodes, ...matchedEdges].slice(0, 12);
  }, [searchQuery, nodes, edges]);

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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenu(activeMenu === 'file' ? null : 'file');
                }}
                className="px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                {t.file}
              </button>
              {activeMenu === 'file' && (
                <div className={`absolute top-full mt-1 ${lang === 'fa' ? 'right-0' : 'left-0'} w-52 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden`}>
                  <button
                    className="flex items-center justify-between gap-2 px-3.5 py-2.5 hover:bg-blue-50 w-full text-start text-xs font-medium border-b border-slate-100"
                    onClick={() => {
                      setShowProjects(true);
                      setActiveMenu(null);
                    }}
                  >
                    <span className="flex items-center gap-2"><FolderOpen size={15} className="text-blue-600" /> {t.projects}</span>
                    {activeProject && <span className="text-[10px] text-slate-500 truncate max-w-[85px]">{activeProject.name}</span>}
                  </button>
                  <button
                    className="flex items-center gap-2 px-3.5 py-2.5 hover:bg-blue-50 w-full text-start text-xs font-medium"
                    onClick={() => {
                      onExport();
                      setActiveMenu(null);
                    }}
                  >
                    <Save size={15} /> {t.save}
                  </button>
                  <button
                    className="flex items-center gap-2 px-3.5 py-2.5 hover:bg-blue-50 w-full text-start text-xs font-medium"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={15} /> {t.load}
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

            <div className="relative h-full flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenu(activeMenu === 'view' ? null : 'view');
                }}
                className="px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                {t.view}
              </button>
              {activeMenu === 'view' && (
                <div className={`absolute top-full mt-1 ${lang === 'fa' ? 'right-0' : 'left-0'} w-52 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 z-50 p-1.5`}>
                  <label className="flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 rounded-md cursor-pointer text-xs">
                    <input type="checkbox" checked={uiPanels.tools} onChange={() => togglePanel('tools')} className="rounded text-blue-600" />
                    <span>{t.toolsPanel}</span>
                  </label>
                  <label className="flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 rounded-md cursor-pointer text-xs">
                    <input type="checkbox" checked={uiPanels.properties} onChange={() => togglePanel('properties')} className="rounded text-blue-600" />
                    <span>{t.propsPanel}</span>
                  </label>
                  <label className="flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 rounded-md cursor-pointer text-xs">
                    <input type="checkbox" checked={uiPanels.camera} onChange={() => togglePanel('camera')} className="rounded text-blue-600" />
                    <span>{t.camPanel}</span>
                  </label>
                  <label className="flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 rounded-md cursor-pointer text-xs">
                    <input type="checkbox" checked={uiPanels.hints} onChange={() => togglePanel('hints')} className="rounded text-blue-600" />
                    <span>{t.hintsPanel}</span>
                  </label>
                </div>
              )}
            </div>

            <div className="relative h-full flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenu(activeMenu === 'lang' ? null : 'lang');
                }}
                className="px-2.5 py-1.5 rounded-md hover:bg-slate-800 flex items-center gap-1 whitespace-nowrap"
              >
                <Globe size={15} /> <span>{lang.toUpperCase()}</span>
              </button>
              {activeMenu === 'lang' && (
                <div className={`absolute top-full mt-1 ${lang === 'fa' ? 'right-0' : 'left-0'} w-32 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden`}>
                  <button
                    className="flex items-center gap-2 px-3.5 py-2 hover:bg-blue-50 w-full text-start text-xs font-medium"
                    onClick={() => {
                      setAppState((prev) => ({ ...prev, appLanguage: 'fa' }));
                      setActiveMenu(null);
                    }}
                  >
                    {t.persian}
                  </button>
                  <button
                    className="flex items-center gap-2 px-3.5 py-2 hover:bg-blue-50 w-full text-start text-xs font-medium"
                    onClick={() => {
                      setAppState((prev) => ({ ...prev, appLanguage: 'en' }));
                      setActiveMenu(null);
                    }}
                  >
                    {t.english}
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => setShowProjects(true)} className="px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap hidden lg:inline-flex items-center gap-1.5 text-slate-200">
              <FolderOpen size={14} className="text-blue-400" />
              <span className="max-w-[110px] truncate">{activeProject?.name || t.projects}</span>
            </button>

            <button onClick={() => setShowHelp(true)} className="px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap hidden sm:inline-flex">
              {t.help}
            </button>
          </div>
        </div>

        {/* Right / End AI & Mode Controls */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
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

          {/* Mode Selector (All 15 Modes) */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-md px-2 py-1 shrink-0">
            <Bot size={15} className="text-emerald-400 shrink-0" />
            <select
              className="bg-transparent text-xs text-white outline-none cursor-pointer max-w-[115px] sm:max-w-[155px]"
              value={appState.aiMode}
              onChange={(e) => setAppState((prev) => ({ ...prev, aiMode: e.target.value as AIMode }))}
            >
              {AI_MODES_LIST.map((m) => (
                <option key={m} value={m} className="text-slate-900">
                  {t.modes[m]}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowArchitect(true)}
            className="px-2.5 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 flex items-center gap-1.5 transition-colors shadow-sm font-medium text-xs whitespace-nowrap shrink-0"
            title={t.aiArchitect}
          >
            <BrainCircuit size={15} className="shrink-0" />
            <span className="hidden md:inline">{t.aiArchitect}</span>
          </button>

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

      {/* Toast Notification Banner */}
      {toast && (
        <div
          dir={getDir(lang)}
          className={`fixed top-14 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl border text-xs md:text-sm font-medium max-w-md ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-slate-800 text-white border-slate-700'
          }`}
        >
          {toast.type === 'error' && <AlertCircle size={16} className="shrink-0 text-red-600" />}
          {toast.type === 'success' && <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />}
          {toast.type === 'info' && <Info size={16} className="shrink-0 text-blue-400" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={onDismissToast} className="opacity-60 hover:opacity-100 p-0.5">
            <X size={14} />
          </button>
        </div>
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} lang={lang} />}

      <ProjectManagerModal
        isOpen={showProjects}
        onClose={() => setShowProjects(false)}
        lang={lang}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={onSelectProject}
        onCreateProject={onCreateProject}
        onRenameProject={onRenameProject}
        onDeleteProject={onDeleteProject}
      />

      <AIArchitectModal
        isOpen={showArchitect}
        onClose={() => setShowArchitect(false)}
        lang={lang}
        nodes={nodes}
        edges={edges}
        defs={architectDefs}
        setDefs={setArchitectDefs}
        onApplyGraph={onApplyGraphFromAI}
        onApplyChanges={onApplyChangesFromAI}
        onNotify={onNotify}
      />

      <FinalizationModal
        isOpen={showFinalize}
        onClose={() => setShowFinalize(false)}
        lang={lang}
        aiMode={appState.aiMode}
        nodes={nodes}
        edges={edges}
        onNotify={onNotify}
      />

      <PresentationModal
        isOpen={presentationMode.isOpen}
        isLoading={presentationMode.isLoading}
        content={presentationMode.content}
        files={modalActiveFiles}
        targetLanguage={presentationMode.targetLanguage}
        activeItemId={presentationMode.activeItemId}
        modeTitle={presentationMode.modeTitle}
        nodes={nodes}
        edges={edges}
        uiLang={lang}
        onClose={() => setPresentationMode({ ...presentationMode, isOpen: false })}
        onRegenerate={onRegeneratePresentation}
        onSaveContent={onSavePresentationContent}
        onAddFile={onAddFile}
        onRemoveFile={onRemoveFile}
        onNotify={onNotify}
      />

      {/* Sidebar Container: Tools & Camera */}
      <div className={`absolute top-16 ${lang === 'fa' ? 'right-3 md:right-4' : 'left-3 md:left-4'} z-10 flex flex-col gap-3 max-h-[calc(100vh-5rem)] overflow-y-auto pointer-events-none`}>
        {uiPanels.tools && (
          <Panel title={t.toolTitle} icon={<Settings size={15} />} widthClass="w-56">
            <div className="flex flex-col gap-2">
              {/* Search Nodes & Edges */}
              <div className="relative">
                <Search size={13} className={`absolute top-2.5 ${lang === 'fa' ? 'right-2.5' : 'left-2.5'} text-slate-400 pointer-events-none`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchNode}
                  className={`w-full border border-slate-200 rounded-lg py-1.5 ${lang === 'fa' ? 'pr-7 pl-6' : 'pl-7 pr-6'} text-xs bg-slate-50 focus:bg-white focus:outline-blue-500`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className={`absolute top-2 ${lang === 'fa' ? 'left-2' : 'right-2'} text-slate-400 hover:text-slate-600`}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {searchQuery.trim() && (
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                  {searchResults.length === 0 ? (
                    <div className="p-2 text-[11px] text-slate-400 text-center">{t.noResults}</div>
                  ) : (
                    searchResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onFocusItem(item.id, item.type);
                          setSearchQuery('');
                        }}
                        className="w-full px-2.5 py-1.5 text-start hover:bg-blue-50 flex items-center gap-2 text-xs"
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="truncate flex-1 text-slate-700 font-medium">{item.label}</span>
                        <span className="text-[10px] text-slate-400 uppercase shrink-0">{item.type}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              <button onClick={onAddNode} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg justify-center font-medium transition-colors shadow-sm">
                <Plus size={16} />
                {t.newNode}
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={onToggleEdgeMode}
                  className={`flex items-center gap-1 text-white py-1.5 px-2 rounded-lg justify-center font-medium transition-colors shadow-sm text-[11px] ${
                    appState.mode === 'edge-start' || appState.mode === 'edge-finish'
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-slate-600 hover:bg-slate-700'
                  }`}
                >
                  <LinkIcon size={13} />
                  <span className="truncate">
                    {appState.mode === 'edge-start' || appState.mode === 'edge-finish' ? t.cancelConnect : t.connect}
                  </span>
                </button>

                <button
                  onClick={onToggleBoxSelectMode}
                  className={`flex items-center gap-1 py-1.5 px-2 rounded-lg justify-center font-medium transition-colors shadow-sm text-[11px] ${
                    appState.mode === 'box-select'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  <Square size={12} />
                  <span className="truncate">{t.boxSelect}</span>
                </button>
              </div>

              {appState.mode !== 'select' && (
                <div className="text-[11px] text-center text-orange-700 font-semibold bg-orange-50 p-1.5 rounded-md border border-orange-200">
                  {appState.mode === 'edge-start'
                    ? t.selectSource
                    : appState.mode === 'edge-finish'
                    ? t.selectTarget
                    : t.boxSelectActive}
                </div>
              )}

              {/* Auto Layout */}
              <div className="pt-1 border-t border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">{t.autoLayout}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => onAutoLayout('force')}
                    className="flex items-center justify-center gap-1 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 py-1.5 px-2 rounded-md text-[11px] font-medium transition-colors"
                  >
                    <Network size={12} />
                    <span className="truncate">{t.forceLayout}</span>
                  </button>
                  <button
                    onClick={() => onAutoLayout('radial')}
                    className="flex items-center justify-center gap-1 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 py-1.5 px-2 rounded-md text-[11px] font-medium transition-colors"
                  >
                    <Circle size={12} />
                    <span className="truncate">{t.radialLayout}</span>
                  </button>
                </div>
              </div>

              {/* Snap to Grid */}
              <label className="flex items-center justify-between pt-1 border-t border-slate-100 cursor-pointer select-none">
                <span className="text-[11px] font-medium text-slate-600">{t.snapToGrid}</span>
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(e) => setSnapToGrid(e.target.checked)}
                  className="rounded text-blue-600 cursor-pointer"
                />
              </label>
            </div>
          </Panel>
        )}

        {uiPanels.camera && (
          <Panel title={t.camTitle} icon={<Camera size={15} />} widthClass="w-56">
            <div className="flex gap-1.5 mb-2" dir="ltr">
              <input
                type="number"
                placeholder="X"
                className="w-1/3 min-w-0 border border-slate-200 rounded-md p-1.5 text-xs text-center bg-slate-50 focus:bg-white focus:outline-blue-500"
                value={camInput.x}
                onChange={(e) => setCamInput({ ...camInput, x: parseFloat(e.target.value) || 0 })}
              />
              <input
                type="number"
                placeholder="Y"
                className="w-1/3 min-w-0 border border-slate-200 rounded-md p-1.5 text-xs text-center bg-slate-50 focus:bg-white focus:outline-blue-500"
                value={camInput.y}
                onChange={(e) => setCamInput({ ...camInput, y: parseFloat(e.target.value) || 0 })}
              />
              <input
                type="number"
                placeholder="Z"
                className="w-1/3 min-w-0 border border-slate-200 rounded-md p-1.5 text-xs text-center bg-slate-50 focus:bg-white focus:outline-blue-500"
                value={camInput.z}
                onChange={(e) => setCamInput({ ...camInput, z: parseFloat(e.target.value) || 0 })}
              />
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
                    <span>
                      {appState.selectedIds.length} {t.multiSelect}
                    </span>
                  </div>
                )}

                {!isMultiSelect && (
                  <button
                    onClick={onSelectSameColor}
                    className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 p-1.5 rounded-lg text-xs font-medium transition-colors"
                  >
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
                    <label className="text-xs text-orange-800 block mb-1 font-bold flex items-center gap-1">
                      <ArrowRightLeft size={10} /> Flow Direction
                    </label>
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
                          onClick={() => {
                            onPushHistory();
                            onUpdateItem(activeNode.id, 'node', { shape: shape as NodeShape });
                          }}
                          className={`p-1 rounded border flex flex-col items-center justify-center gap-1 text-[10px] ${
                            activeNode.shape === shape || (!activeNode.shape && shape === 'sphere')
                              ? 'bg-blue-100 border-blue-400 text-blue-700'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
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
                    type="range"
                    min={activeNode ? '0.5' : '0.05'}
                    max={activeNode ? '3' : '0.5'}
                    step="0.01"
                    className="w-full"
                    value={activeNode?.size || activeEdge?.size || 0.1}
                    onPointerDown={onPushHistory}
                    onChange={(e) =>
                      onUpdateItem(activeNode?.id || activeEdge!.id, activeNode ? 'node' : 'edge', { size: parseFloat(e.target.value) })
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">{t.color}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="w-8 h-8 cursor-pointer rounded border border-slate-300 p-0 overflow-hidden shrink-0"
                      value={activeNode?.color ?? activeEdge?.color ?? '#2196F3'}
                      onClick={onPushHistory}
                      onChange={(e) => onUpdateItem(activeNode?.id || activeEdge!.id, activeNode ? 'node' : 'edge', { color: e.target.value })}
                    />
                    <div dir="ltr" className="text-xs text-slate-500 font-mono">
                      {activeNode?.color ?? activeEdge?.color}
                    </div>
                  </div>
                </div>

                <hr className="border-gray-200" />

                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-600">{t.files}</span>
                    <button onClick={() => attachmentInputRef.current?.click()} className="text-xs bg-slate-200 hover:bg-slate-300 p-1 rounded">
                      <Plus size={14} />
                    </button>
                    <input
                      type="file"
                      ref={attachmentInputRef}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) onFileUpload(e.target.files[0]);
                      }}
                    />
                  </div>
                  {activeFiles.length === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-2">{t.noFiles}</div>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                      {activeFiles.map((file) => (
                        <div key={file.id} className="flex justify-between items-center bg-white border p-1 rounded text-xs">
                          <div className="flex items-center gap-1 overflow-hidden">
                            {file.type.startsWith('image') ? (
                              <ImageIcon size={10} className="text-blue-500 shrink-0" />
                            ) : (
                              <FileText size={10} className="text-gray-500 shrink-0" />
                            )}
                            {file.isAiGenerated && <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded shrink-0">AI</span>}
                            <span className="truncate max-w-[120px]">{file.name}</span>
                          </div>
                          <button onClick={() => onDeleteFile(file.id)} className="text-red-500 hover:bg-red-50 p-0.5 rounded shrink-0">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-gray-200" />

                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.summary}</label>
                  <textarea
                    className="w-full border rounded p-1.5 text-sm h-16 bg-gray-50 focus:bg-white transition-colors"
                    value={activeNode?.summary || activeEdge?.summary || ''}
                    onFocus={onPushHistory}
                    onChange={(e) => onUpdateItem(activeNode?.id || activeEdge!.id, activeNode ? 'node' : 'edge', { summary: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t.fullContent}</label>
                  <textarea
                    className="w-full border rounded p-1.5 text-sm h-24 bg-gray-50 focus:bg-white transition-colors"
                    value={activeNode?.fullContent || activeEdge?.fullContent || ''}
                    onFocus={onPushHistory}
                    onChange={(e) => onUpdateItem(activeNode?.id || activeEdge!.id, activeNode ? 'node' : 'edge', { fullContent: e.target.value })}
                  />
                </div>

                <button
                  onClick={onDeleteItem}
                  className="mt-2 bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                >
                  <Trash2 size={16} /> <span>{t.delete}</span>
                </button>
              </div>
            )}

            {!activeNode && !activeEdge && (
              <div className="text-center text-gray-400 py-4 text-xs italic">{t.selectSource}</div>
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