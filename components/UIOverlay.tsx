import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Plus, Link as LinkIcon, Upload,
  Trash2, Save, MapPin, ChevronUp, ChevronDown,
  Settings, Camera, MousePointer2,
  HelpCircle, Eye, X, Layers, FileText, Image as ImageIcon,
  Globe, Cake, Lightbulb, ArrowRightLeft,
  Undo2, Redo2, BrainCircuit, Bot, Sparkles, Box, Circle, Triangle, Database, Disc,
  AlertCircle, CheckCircle2, Info, Search, FolderOpen, Square, Network, Maximize2, Copy,
  Crosshair, Download, BarChart2, Filter, FilterX, Tag, Play, GitBranchPlus,
  Sun, Moon, Maximize, Minimize2, Lock, Unlock, Bookmark, FileCode, LayoutGrid,
  AlignCenterHorizontal, AlignCenterVertical, Paintbrush, ClipboardPaste, Sliders
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
  ProjectWorkspace,
  CameraBookmark
} from '../types';
import { translations, getDir } from '../utils/translations';
import { StarterTemplateId } from '../utils/starterTemplates';
import { AlignMode } from '../utils/graphLayout';
import { PresentationModal } from './PresentationModal';
import { AIArchitectModal } from './AIArchitectModal';
import { FinalizationModal } from './FinalizationModal';
import { ProjectManagerModal } from './ProjectManagerModal';
import { GraphAnalyticsModal } from './GraphAnalyticsModal';
import { ImportGraphModal } from './ImportGraphModal';

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
  focusNeighbors: boolean;
  setFocusNeighbors: React.Dispatch<React.SetStateAction<boolean>>;
  activeFilter: { color: string | null; tag: string | null };
  setActiveFilter: React.Dispatch<React.SetStateAction<{ color: string | null; tag: string | null }>>;
  hasActivePathHighlight: boolean;
  onHighlightPath: (nodeIds: string[], edgeIds: string[]) => void;
  onClearPath: () => void;
  onScaleByDegree: () => void;
  onStartTour: () => void;
  onAddChildNode: (parentId: string) => void;
  onBatchAddTag: (tag: string) => void;
  onCaptureScreenshot: () => void;
  onAutoLayout: (kind: 'force' | 'radial') => void;
  onFocusItem: (id: string, type: 'node' | 'edge') => void;
  onFitView: () => void;
  onDuplicateSelected: () => void;
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
  onCreateNodeFromChat: (title: string, content: string, parentItemId?: string | null) => void;
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
  onCreateProject: (name: string, templateId?: StarterTemplateId) => void;
  onRenameProject: (id: string, newName: string) => void;
  onDeleteProject: (id: string) => void;
  onBackupAll: () => void;
  onRestoreAll: (file: File) => void;
  sceneTheme: 'light' | 'dark';
  onToggleTheme: () => void;
  isZenMode: boolean;
  onToggleZenMode: () => void;
  onQuickConnect: (fromId: string, toId: string) => void;
  cameraBookmarks: CameraBookmark[];
  onSaveBookmark: (name: string) => void;
  onLoadBookmark: (bookmark: CameraBookmark) => void;
  onDeleteBookmark: (id: string) => void;
  onAlignSelected: (mode: AlignMode) => void;
  onImportParsedGraph: (nodes: GraphNodeData[], edges: GraphEdgeData[], replace: boolean) => void;
  showTagZones: boolean;
  setShowTagZones: React.Dispatch<React.SetStateAction<boolean>>;
  canPasteStyle: boolean;
  onCopyStyle: (id: string, type: 'node' | 'edge') => void;
  onPasteStyle: (id: string, type: 'node' | 'edge') => void;
}

const COLOR_PRESETS = ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

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
    <div className={`bg-white/95 border border-slate-200 rounded-xl shadow-lg overflow-hidden ${widthClass} transition-all duration-200 pointer-events-auto shrink-0`}>
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
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <HelpCircle size={20} /> {t.helpModal.title}
          </h2>
          <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4 text-gray-700 text-sm max-h-[75vh] overflow-y-auto">
          <div className="space-y-2">
            <h3 className="font-bold border-b pb-1 text-slate-800">{t.helpModal.interaction}</h3>
            <ul className="list-disc list-inside space-y-1.5 leading-relaxed">
              <li><span className="font-semibold">{t.helpModal.interactionDesc1}</span></li>
              <li><span className="font-semibold">{t.helpModal.interactionDesc2}</span></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold border-b pb-1 text-slate-800">{t.helpModal.manage}</h3>
            <ul className="list-disc list-inside space-y-1.5 leading-relaxed">
              <li><span className="font-semibold">{t.helpModal.manageDesc1}</span></li>
              <li><span className="font-semibold">{t.helpModal.manageDesc2}</span></li>
              <li><span className="font-semibold">{t.helpModal.manageDesc3}</span></li>
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
  focusNeighbors,
  setFocusNeighbors,
  activeFilter,
  setActiveFilter,
  hasActivePathHighlight,
  onHighlightPath,
  onClearPath,
  onScaleByDegree,
  onStartTour,
  onAddChildNode,
  onBatchAddTag,
  onCaptureScreenshot,
  onAutoLayout,
  onFocusItem,
  onFitView,
  onDuplicateSelected,
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
  onCreateNodeFromChat,
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
  onDeleteProject,
  onBackupAll,
  onRestoreAll,
  sceneTheme,
  onToggleTheme,
  isZenMode,
  onToggleZenMode,
  onQuickConnect,
  cameraBookmarks,
  onSaveBookmark,
  onLoadBookmark,
  onDeleteBookmark,
  onAlignSelected,
  onImportParsedGraph,
  showTagZones,
  setShowTagZones,
  canPasteStyle,
  onCopyStyle,
  onPasteStyle
}) => {
  const [camInput, setCamInput] = useState({ x: 0, y: 10, z: 20 });
  const [bookmarkName, setBookmarkName] = useState('');
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'tools' | 'properties'>('none');
  const [activeMenu, setActiveMenu] = useState<'file' | 'view' | 'lang' | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showArchitect, setShowArchitect] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showImportText, setShowImportText] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [quickTargetId, setQuickTargetId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'node' | 'edge'>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const lang = appState.appLanguage;
  const t = translations[lang];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      setActiveMenu(null);
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      } else if (!isTyping && e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  const togglePanel = (key: keyof UIPanelsState) => {
    setUiPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isMultiSelect = appState.selectedIds.length > 1;
  const activeNode = appState.activeType === 'node' ? nodes.find((n) => n.id === appState.selectedIds[0]) : null;
  const activeEdge = appState.activeType === 'edge' ? edges.find((e) => e.id === appState.selectedIds[0]) : null;
  const activeFiles = activeNode?.files || activeEdge?.files || [];
  const activeProject = projects.find((p) => p.id === activeProjectId);

  useEffect(() => {
    setQuickTargetId('');
  }, [activeNode?.id]);

  const modalActiveFiles =
    nodes.find((n) => n.id === presentationMode.activeItemId)?.files ||
    edges.find((e) => e.id === presentationMode.activeItemId)?.files ||
    presentationMode.activeFiles;

  const connectedItems = useMemo(() => {
    if (!activeNode || isMultiSelect) return [];
    return edges
      .filter((e) => e.fromId === activeNode.id || e.toId === activeNode.id)
      .map((edge) => {
        const isOutgoing = edge.fromId === activeNode.id;
        const neighborId = isOutgoing ? edge.toId : edge.fromId;
        const neighbor = nodes.find((n) => n.id === neighborId);
        return neighbor ? { edge, neighbor, isOutgoing } : null;
      })
      .filter((item): item is { edge: GraphEdgeData; neighbor: GraphNodeData; isOutgoing: boolean } => item !== null);
  }, [activeNode, isMultiSelect, edges, nodes]);

  const availableColors = useMemo(() => {
    return Array.from(new Set(nodes.map((n) => n.color).filter(Boolean)));
  }, [nodes]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    nodes.forEach((n) => (n.tags || []).forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [nodes]);

  const handleAddTagToNode = () => {
    if (!activeNode) return;
    const cleaned = newTagInput.trim();
    if (!cleaned) return;
    const existing = activeNode.tags || [];
    if (!existing.includes(cleaned)) {
      onPushHistory();
      onUpdateItem(activeNode.id, 'node', { tags: [...existing, cleaned] });
    }
    setNewTagInput('');
  };

  const handleRemoveTagFromNode = (tagToRemove: string) => {
    if (!activeNode) return;
    onPushHistory();
    onUpdateItem(activeNode.id, 'node', { tags: (activeNode.tags || []).filter((tg) => tg !== tagToRemove) });
  };

  const searchResults = useMemo(() => {
    const raw = searchQuery.trim().toLowerCase();
    if (!raw) return [];
    const tagTerm = raw.startsWith('#') ? raw.slice(1) : raw;
    const stripHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').toLowerCase();

    const matchedNodes =
      searchFilter === 'edge'
        ? []
        : nodes
            .filter((n) => {
              const inLabel = n.label.toLowerCase().includes(raw);
              const inSummary = (n.summary || '').toLowerCase().includes(raw);
              const inContent = stripHtml(n.fullContent || '').includes(raw);
              const inTags = Boolean(tagTerm) && (n.tags || []).some((tg) => tg.toLowerCase().includes(tagTerm));
              return inLabel || inSummary || inContent || inTags;
            })
            .map((n) => ({
              id: n.id,
              label: n.label,
              summary: n.summary || '',
              color: n.color,
              tags: n.tags || [],
              type: 'node' as const
            }));
    const matchedEdges =
      searchFilter === 'node'
        ? []
        : edges
            .filter(
              (e) =>
                e.label.toLowerCase().includes(raw) ||
                (e.summary || '').toLowerCase().includes(raw) ||
                stripHtml(e.fullContent || '').includes(raw)
            )
            .map((e) => ({
              id: e.id,
              label: e.label,
              summary: e.summary || '',
              color: e.color,
              tags: [] as string[],
              type: 'edge' as const
            }));
    return [...matchedNodes, ...matchedEdges].slice(0, 20);
  }, [searchQuery, searchFilter, nodes, edges]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, searchFilter]);

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
                  <button
                    className="flex items-center gap-2 px-3.5 py-2.5 hover:bg-blue-50 w-full text-start text-xs font-medium border-t border-slate-100"
                    onClick={() => {
                      setShowImportText(true);
                      setActiveMenu(null);
                    }}
                  >
                    <FileCode size={15} className="text-emerald-600" /> {t.importText}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".json"
                    onChange={(e) => {
                      if (e.target.files?.[0]) onImport(e.target.files[0]);
                      e.target.value = '';
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
                  <label className="flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 rounded-md cursor-pointer text-xs">
                    <input type="checkbox" checked={uiPanels.minimap} onChange={() => togglePanel('minimap')} className="rounded text-blue-600" />
                    <span>{t.minimapPanel}</span>
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

          <div className="h-5 w-px bg-slate-700 shrink-0 hidden sm:block" />

          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-200 transition-colors shrink-0"
            title={sceneTheme === 'dark' ? t.themeLight : t.themeDark}
          >
            {sceneTheme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
          </button>

          <button
            onClick={onToggleZenMode}
            className={`p-1.5 rounded-md transition-colors shrink-0 ${
              isZenMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-slate-800 text-slate-200'
            }`}
            title={isZenMode ? t.exitZenMode : t.zenMode}
          >
            {isZenMode ? <Minimize2 size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>

      {/* Floating Quick Search Bar */}
      {!presentationMode.isOpen && !isZenMode && (
        <div
          ref={searchContainerRef}
          dir={getDir(lang)}
          onClick={(e) => e.stopPropagation()}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-[115] w-72 sm:w-88 max-w-[calc(100vw-2rem)] pointer-events-auto"
        >
          <div className={`bg-white/95 border rounded-xl shadow-lg transition-all ${isSearchFocused ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'}`}>
            <div className="flex items-center px-3 py-1.5 gap-2">
              <Search size={15} className="text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    setIsSearchFocused(false);
                    searchInputRef.current?.blur();
                  } else if (e.key === 'ArrowDown' && searchResults.length > 0) {
                    e.preventDefault();
                    setHighlightedIndex((prev) => (prev + 1) % searchResults.length);
                  } else if (e.key === 'ArrowUp' && searchResults.length > 0) {
                    e.preventDefault();
                    setHighlightedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
                  } else if (e.key === 'Enter' && searchResults[highlightedIndex]) {
                    e.preventDefault();
                    const picked = searchResults[highlightedIndex];
                    onFocusItem(picked.id, picked.type);
                    setIsSearchFocused(false);
                  }
                }}
                placeholder={t.searchNode}
                className="flex-1 min-w-0 bg-transparent text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd dir="ltr" className="hidden sm:inline-block text-[10px] text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-mono">
                  Ctrl+K
                </kbd>
              )}
            </div>

            {isSearchFocused && searchQuery.trim() !== '' && (
              <div className="border-t border-slate-100">
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50/80 border-b border-slate-100 gap-1">
                  <div className="flex items-center gap-1">
                    {(['all', 'node', 'edge'] as const).map((filterKey) => (
                      <button
                        key={filterKey}
                        onClick={() => setSearchFilter(filterKey)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          searchFilter === filterKey
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        {filterKey === 'all' ? t.searchAll : filterKey === 'node' ? t.searchNodes : t.searchEdges}
                      </button>
                    ))}
                  </div>
                  {searchResults.filter((r) => r.type === 'node').length > 1 && (
                    <button
                      onClick={() => {
                        const nodeIds = searchResults.filter((r) => r.type === 'node').map((r) => r.id);
                        setAppState((prev) => ({ ...prev, selectedIds: nodeIds, activeType: 'node', mode: 'select' }));
                        setIsSearchFocused(false);
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-medium px-1.5 py-0.5 rounded hover:bg-blue-50"
                    >
                      {t.selectMatches}
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">{t.noResults}</div>
                  ) : (
                    searchResults.map((item, idx) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onFocusItem(item.id, item.type);
                          setIsSearchFocused(false);
                        }}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full px-3 py-2 text-start flex items-start gap-2.5 transition-colors ${
                          idx === highlightedIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: item.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-bold text-slate-800">{item.label}</span>
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase shrink-0">
                              {item.type === 'node' ? t.searchNodes : t.searchEdges}
                            </span>
                          </div>
                          {item.summary && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.summary}</p>
                          )}
                          {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.tags.slice(0, 4).map((tg) => (
                                <span key={tg} className="text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-1 rounded">
                                  #{tg}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toast && (
        <div
          dir={getDir(lang)}
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl border text-xs md:text-sm font-medium max-w-md ${
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
        onBackupAll={onBackupAll}
        onRestoreAll={onRestoreAll}
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
        onCreateNodeFromChat={onCreateNodeFromChat}
        onNotify={onNotify}
      />

      <GraphAnalyticsModal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        lang={lang}
        nodes={nodes}
        edges={edges}
        selectedNodeIds={appState.activeType === 'node' ? appState.selectedIds : []}
        hasActivePathHighlight={hasActivePathHighlight}
        onHighlightPath={onHighlightPath}
        onClearPath={onClearPath}
        onFocusItem={onFocusItem}
        onScaleByDegree={onScaleByDegree}
      />

      <ImportGraphModal
        isOpen={showImportText}
        onClose={() => setShowImportText(false)}
        lang={lang}
        onApplyImport={onImportParsedGraph}
      />

      {/* Sidebar Container: Tools & Camera */}
      {!isZenMode && (
      <div className={`absolute top-16 ${lang === 'fa' ? 'right-3 md:right-4' : 'left-3 md:left-4'} z-10 ${mobileDrawer === 'tools' ? 'flex' : 'hidden md:flex'} flex-col gap-3 max-h-[calc(100vh-8.5rem)] md:max-h-[calc(100vh-5rem)] overflow-y-auto pointer-events-none`}>
        {uiPanels.tools && (
          <Panel title={t.toolTitle} icon={<Settings size={15} />} widthClass="w-56">
            <div className="flex flex-col gap-2">

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

              {/* Focus Connected & Tag Zones */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setFocusNeighbors((prev) => !prev)}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-medium border transition-colors ${
                    focusNeighbors
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 hover:bg-indigo-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <Crosshair size={12} />
                  <span className="truncate">{t.focusNeighbors}</span>
                </button>
                <button
                  onClick={() => setShowTagZones((prev) => !prev)}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-medium border transition-colors ${
                    showTagZones
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-slate-50 hover:bg-teal-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <Layers size={12} />
                  <span className="truncate">{t.showTagZones}</span>
                </button>
              </div>

              {/* Import Text / Mermaid */}
              <button
                onClick={() => setShowImportText(true)}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium border bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border-slate-200 transition-colors"
              >
                <FileCode size={12} />
                <span className="truncate">{t.importText}</span>
              </button>

              {/* Analytics & Path Finder + 3D Tour */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowAnalytics(true)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                      hasActivePathHighlight
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <BarChart2 size={12} />
                    <span className="truncate">{t.analytics}</span>
                  </button>
                  {hasActivePathHighlight && (
                    <button
                      onClick={onClearPath}
                      className="p-1.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300"
                      title={t.clearPath}
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
                <button
                  onClick={onStartTour}
                  disabled={nodes.length === 0}
                  className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-md text-[11px] font-medium border bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border-slate-200 disabled:opacity-40 transition-colors"
                >
                  <Play size={11} />
                  <span className="truncate">{t.tourStart}</span>
                </button>
              </div>

              {/* Visual Color & Tag Filter */}
              {(availableColors.length > 1 || availableTags.length > 0 || activeFilter.color || activeFilter.tag) && (
                <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1">
                      <Filter size={11} /> {t.filterTitle}
                    </span>
                    {(activeFilter.color || activeFilter.tag) && (
                      <button
                        onClick={() => setActiveFilter({ color: null, tag: null })}
                        className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                        title={t.clearFilters}
                      >
                        <FilterX size={11} />
                      </button>
                    )}
                  </div>
                  {availableColors.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {availableColors.slice(0, 10).map((col) => {
                        const isActive = activeFilter.color === col;
                        return (
                          <button
                            key={col}
                            onClick={() => setActiveFilter((prev) => ({ ...prev, color: isActive ? null : col }))}
                            className={`w-4 h-4 rounded-full border transition-transform ${
                              isActive ? 'ring-2 ring-blue-500 ring-offset-1 scale-110 border-white' : 'border-slate-300 hover:scale-110'
                            }`}
                            style={{ backgroundColor: col }}
                            title={col}
                          />
                        );
                      })}
                    </div>
                  )}
                  {availableTags.length > 0 && (
                    <select
                      value={activeFilter.tag || ''}
                      onChange={(e) => setActiveFilter((prev) => ({ ...prev, tag: e.target.value || null }))}
                      className="w-full border border-slate-200 rounded-md px-1.5 py-1 text-[11px] bg-slate-50 text-slate-700 focus:outline-blue-500"
                    >
                      <option value="">{t.allTags}</option>
                      {availableTags.map((tg) => (
                        <option key={tg} value={tg}>
                          #{tg}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-400 text-center tabular-nums">
                {nodes.length} {t.nodesCount} · {edges.length} {t.edgesCount}
              </div>
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
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onCameraTeleport(camInput.x, camInput.y, camInput.z)}
                className="bg-slate-700 hover:bg-slate-800 text-white py-1.5 px-2 rounded-md text-xs flex items-center justify-center gap-1 transition-colors font-medium"
              >
                <MapPin size={13} /> {t.jump}
              </button>
              <button
                onClick={onFitView}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-1.5 px-2 rounded-md text-xs flex items-center justify-center gap-1 transition-colors font-medium"
              >
                <Maximize2 size={12} /> {t.fitView}
              </button>
            </div>
            <button
              onClick={onCaptureScreenshot}
              className="mt-1.5 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-1.5 px-2 rounded-md text-[11px] flex items-center justify-center gap-1.5 transition-colors font-medium"
            >
              <Download size={12} /> {t.screenshot}
            </button>
            <div dir="ltr" className="mt-2 text-center text-[11px] text-slate-500 font-mono tabular-nums">
              Pos: {Math.round(cameraPos.x)}, {Math.round(cameraPos.y)}, {Math.round(cameraPos.z)}
            </div>

            {/* Saved Camera Bookmarks */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Bookmark size={11} className="text-blue-600" />
                <span>{t.cameraBookmarks}</span>
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={bookmarkName}
                  onChange={(e) => setBookmarkName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && bookmarkName.trim()) {
                      e.preventDefault();
                      onSaveBookmark(bookmarkName.trim());
                      setBookmarkName('');
                    }
                  }}
                  placeholder={t.bookmarkNamePlaceholder}
                  className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1 text-[11px] bg-slate-50 focus:bg-white focus:outline-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const fallback = `${t.saveView} ${cameraBookmarks.length + 1}`;
                    onSaveBookmark(bookmarkName.trim() || fallback);
                    setBookmarkName('');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[11px] font-medium shrink-0"
                  title={t.saveView}
                >
                  <Plus size={12} />
                </button>
              </div>
              {cameraBookmarks.length === 0 ? (
                <div className="text-[10px] text-slate-400 text-center py-0.5">{t.noBookmarks}</div>
              ) : (
                <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
                  {cameraBookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="flex items-center justify-between gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px]"
                    >
                      <button
                        type="button"
                        onClick={() => onLoadBookmark(bm)}
                        className="flex-1 min-w-0 text-start truncate font-medium text-slate-700 hover:text-blue-600 transition-colors"
                      >
                        {bm.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteBookmark(bm.id)}
                        className="text-slate-400 hover:text-red-600 p-0.5 shrink-0"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>
      )}

      {/* Sidebar: Properties */}
      {!isZenMode && uiPanels.properties && (
        <div className={`absolute top-16 ${lang === 'fa' ? 'left-3 md:left-4' : 'right-3 md:right-4'} z-10 ${mobileDrawer === 'properties' ? 'flex' : 'hidden md:flex'} flex-col max-h-[calc(100vh-8.5rem)] md:max-h-[calc(100vh-5rem)] overflow-y-auto pointer-events-none`}>
          <Panel title={t.propTitle} icon={<MousePointer2 size={15} />} widthClass="w-64">
            {(activeNode || activeEdge) && (
              <div className="flex flex-col gap-3">
                {isMultiSelect && (
                  <div className="bg-blue-50 border border-blue-100 p-2 rounded-lg text-blue-800 text-xs flex flex-col gap-1">
                    <div className="font-bold flex items-center gap-2">
                      <Layers size={14} />
                      <span>
                        {appState.selectedIds.length} {t.multiSelect}
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-700/90 leading-relaxed">{t.multiSelectNote}</p>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  {!isMultiSelect && (
                    <button
                      onClick={onSelectSameColor}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 p-1.5 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Eye size={13} /> <span>{t.selectSimilar}</span>
                    </button>
                  )}
                  {appState.activeType === 'node' && (
                    <button
                      onClick={onDuplicateSelected}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 p-1.5 rounded-lg text-xs font-medium transition-colors"
                      title="Ctrl+D"
                    >
                      <Copy size={13} /> <span>{t.duplicate}</span>
                    </button>
                  )}
                </div>

                {(activeNode || activeEdge) && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {!isMultiSelect && (
                      <button
                        type="button"
                        onClick={() => onCopyStyle(activeNode?.id || activeEdge!.id, activeNode ? 'node' : 'edge')}
                        className="flex items-center justify-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 p-1.5 rounded-lg text-[11px] font-medium transition-colors"
                      >
                        <Paintbrush size={12} />
                        <span className="truncate">{t.copyStyle}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!canPasteStyle}
                      onClick={() => onPasteStyle(activeNode?.id || activeEdge!.id, activeNode ? 'node' : 'edge')}
                      className={`${isMultiSelect ? 'col-span-2' : ''} flex items-center justify-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 disabled:opacity-40 disabled:pointer-events-none p-1.5 rounded-lg text-[11px] font-medium transition-colors`}
                    >
                      <ClipboardPaste size={12} />
                      <span className="truncate">{t.pasteStyle}</span>
                    </button>
                  </div>
                )}

                {activeNode && !isMultiSelect && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => onAddChildNode(activeNode.id)}
                      className="flex items-center justify-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 p-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                    >
                      <GitBranchPlus size={13} />
                      <span className="truncate">{t.addChildNode}</span>
                    </button>
                    <button
                      onClick={() => {
                        onPushHistory();
                        onUpdateItem(activeNode.id, 'node', { locked: !activeNode.locked });
                      }}
                      className={`flex items-center justify-center gap-1 border p-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                        activeNode.locked
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300'
                          : 'bg-slate-50 hover:bg-amber-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {activeNode.locked ? <Unlock size={12} /> : <Lock size={12} />}
                      <span className="truncate">{activeNode.locked ? t.unlockNode : t.lockNode}</span>
                    </button>
                  </div>
                )}

                {isMultiSelect && appState.activeType === 'node' && (
                  <div className="bg-slate-50 p-2 rounded border border-slate-200 space-y-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                        <LayoutGrid size={11} className="text-indigo-600" /> {t.alignArrange}
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => onAlignSelected('y')}
                          className="bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded py-1 px-1 text-[10px] font-medium flex items-center justify-center gap-0.5"
                        >
                          <AlignCenterVertical size={10} /> {t.alignY}
                        </button>
                        <button
                          type="button"
                          onClick={() => onAlignSelected('x')}
                          className="bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded py-1 px-1 text-[10px] font-medium flex items-center justify-center gap-0.5"
                        >
                          <AlignCenterHorizontal size={10} /> {t.alignX}
                        </button>
                        <button
                          type="button"
                          onClick={() => onAlignSelected('z')}
                          className="bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded py-1 px-1 text-[10px] font-medium flex items-center justify-center gap-0.5"
                        >
                          <AlignCenterHorizontal size={10} /> {t.alignZ}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => onAlignSelected('grid')}
                          className="bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded py-1 px-1.5 text-[10px] font-medium flex items-center justify-center gap-1"
                        >
                          <LayoutGrid size={10} /> {t.arrangeGrid}
                        </button>
                        <button
                          type="button"
                          onClick={() => onAlignSelected('circle')}
                          className="bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded py-1 px-1.5 text-[10px] font-medium flex items-center justify-center gap-1"
                        >
                          <Circle size={10} /> {t.arrangeCircle}
                        </button>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200 space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                        <Tag size={11} className="text-blue-600" /> {t.batchAddTag}
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newTagInput.trim()) {
                                onBatchAddTag(newTagInput);
                                setNewTagInput('');
                              }
                            }
                          }}
                          placeholder={t.addTagPlaceholder}
                          className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1 text-xs bg-white focus:outline-blue-500"
                        />
                        <button
                          onClick={() => {
                            if (newTagInput.trim()) {
                              onBatchAddTag(newTagInput);
                              setNewTagInput('');
                            }
                          }}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 rounded text-xs font-bold"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!isMultiSelect && (
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
                )}

                {activeEdge && !isMultiSelect && (
                  <div className="bg-orange-50 p-2 rounded border border-orange-100">
                    <label className="text-xs text-orange-800 block mb-1 font-bold flex items-center gap-1">
                      <ArrowRightLeft size={10} /> {t.edgeDirection}
                    </label>
                    <select
                      className="w-full text-xs p-1 rounded border border-orange-200 bg-white"
                      value={activeEdge.direction || 'bidirectional'}
                      onFocus={onPushHistory}
                      onChange={(e) => onUpdateItem(activeEdge.id, 'edge', { direction: e.target.value as any })}
                    >
                      <option value="bidirectional">{t.dirBidirectional}</option>
                      <option value="source-to-target">{t.dirSourceToTarget}</option>
                      <option value="target-to-source">{t.dirTargetToSource}</option>
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
                  <div className="flex items-center gap-2 mb-1.5">
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
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_PRESETS.map((hex) => {
                      const currentHex = (activeNode?.color ?? activeEdge?.color ?? '').toLowerCase();
                      const isMatch = currentHex === hex.toLowerCase();
                      return (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => {
                            onPushHistory();
                            onUpdateItem(activeNode?.id || activeEdge!.id, activeNode ? 'node' : 'edge', { color: hex });
                          }}
                          className={`w-5 h-5 rounded-full border transition-transform ${
                            isMatch ? 'ring-2 ring-blue-500 ring-offset-1 scale-110 border-white' : 'border-slate-300 hover:scale-110'
                          }`}
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      );
                    })}
                  </div>
                </div>

                {activeNode && !isMultiSelect && (
                  <div className="bg-slate-50 p-2 rounded border border-slate-200 space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 block">{t.positionXYZ}</label>
                    <div className="grid grid-cols-3 gap-1.5" dir="ltr">
                      {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                        <div key={axis} className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-slate-400 font-mono text-center">{axis}</span>
                          <input
                            type="number"
                            step="0.5"
                            disabled={Boolean(activeNode.locked)}
                            value={Math.round(activeNode.position[idx] * 100) / 100}
                            onFocus={onPushHistory}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (Number.isNaN(val)) return;
                              const nextPos: [number, number, number] = [...activeNode.position] as [number, number, number];
                              nextPos[idx] = val;
                              onUpdateItem(activeNode.id, 'node', { position: nextPos });
                            }}
                            className="w-full min-w-0 border border-slate-200 rounded px-1 py-1 text-[11px] text-center bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:outline-blue-500 tabular-nums"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeNode && !isMultiSelect && (
                  <div className="bg-slate-50 p-2 rounded border border-slate-200 space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <Tag size={12} className="text-blue-600" /> {t.tags}
                    </label>
                    {(activeNode.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(activeNode.tags || []).map((tg) => (
                          <span
                            key={tg}
                            className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[11px] font-medium"
                          >
                            <span>#{tg}</span>
                            <button
                              onClick={() => handleRemoveTagFromNode(tg)}
                              className="hover:text-red-600"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTagToNode();
                          }
                        }}
                        placeholder={t.addTagPlaceholder}
                        className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1 text-xs bg-white focus:outline-blue-500"
                      />
                      <button
                        onClick={handleAddTagToNode}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 rounded text-xs font-bold"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                )}

                {!isMultiSelect && (
                  <>
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
                            e.target.value = '';
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

                    {activeNode && (
                      <>
                        <hr className="border-gray-200" />
                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-bold text-slate-600">{t.connectedItems}</span>
                            <span className="text-[10px] font-mono bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded tabular-nums">
                              {connectedItems.length}
                            </span>
                          </div>
                          {connectedItems.length === 0 ? (
                            <div className="text-[11px] text-slate-400 text-center py-1.5">{t.noConnections}</div>
                          ) : (
                            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-0.5">
                              {connectedItems.map(({ edge, neighbor, isOutgoing }) => (
                                <div
                                  key={edge.id}
                                  className="flex items-center justify-between gap-1.5 bg-white border border-slate-200 rounded px-2 py-1 text-[11px]"
                                >
                                  <button
                                    onClick={() => onFocusItem(neighbor.id, 'node')}
                                    className="flex items-center gap-1.5 min-w-0 flex-1 text-start hover:text-blue-600 transition-colors"
                                    title={neighbor.label}
                                  >
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: neighbor.color }} />
                                    <span className="text-slate-400 shrink-0 font-mono">
                                      {edge.direction === 'bidirectional' ? '↔' : isOutgoing ? '→' : '←'}
                                    </span>
                                    <span className="truncate font-medium text-slate-700">{neighbor.label}</span>
                                  </button>
                                  {edge.label && (
                                    <button
                                      onClick={() => onFocusItem(edge.id, 'edge')}
                                      className="text-[10px] text-slate-500 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 px-1.5 py-0.5 rounded truncate max-w-[75px] shrink-0"
                                      title={edge.label}
                                    >
                                      {edge.label}
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {nodes.length > 1 && (
                            <div className="mt-2 pt-2 border-t border-slate-200/80 space-y-1">
                              <label className="text-[10px] font-semibold text-slate-500 block">{t.quickConnect}</label>
                              <div className="flex gap-1">
                                <select
                                  value={quickTargetId}
                                  onChange={(e) => setQuickTargetId(e.target.value)}
                                  className="flex-1 min-w-0 border border-slate-200 rounded px-1.5 py-1 text-[11px] bg-white text-slate-700 focus:outline-blue-500"
                                >
                                  <option value="">{t.selectTargetNode}</option>
                                  {nodes
                                    .filter((n) => n.id !== activeNode.id)
                                    .map((n) => (
                                      <option key={n.id} value={n.id}>
                                        {n.label}
                                      </option>
                                    ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={!quickTargetId}
                                  onClick={() => {
                                    if (quickTargetId) {
                                      onQuickConnect(activeNode.id, quickTargetId);
                                      setQuickTargetId('');
                                    }
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-2 py-1 rounded text-[11px] font-medium shrink-0"
                                  title={t.connectAction}
                                >
                                  <LinkIcon size={12} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}

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
                  </>
                )}

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
          className="fixed z-30 pointer-events-none bg-slate-900/95 text-white p-4 rounded-xl shadow-2xl border border-slate-700 max-w-sm transition-opacity left-1/2 -translate-x-1/2 bottom-12"
          dir={getDir(lang)}
        >
          <div className="font-bold text-lg mb-1.5 text-blue-300">{hoverInfo.label}</div>
          <div className="text-slate-300 text-xs mb-2 border-b border-slate-700 pb-2 leading-relaxed">{hoverInfo.summary}</div>
          <div className="text-slate-400 text-xs whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{hoverInfo.full}</div>
        </div>
      )}

      {!isZenMode && uiPanels.hints && (
        <div className="hidden md:block fixed bottom-3 left-1/2 -translate-x-1/2 text-xs text-slate-600 pointer-events-none bg-white/95 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm z-10 whitespace-nowrap">
          {t.hints} • {t.doubleClickHint}
        </div>
      )}

      {/* Mobile Compact Drawer Switcher */}
      {!isZenMode && !presentationMode.isOpen && (
        <div
          className="md:hidden fixed bottom-3 left-3 z-20 flex items-center gap-1.5 bg-slate-900/95 text-white p-1.5 rounded-xl border border-slate-700 shadow-xl pointer-events-auto"
          dir={getDir(lang)}
        >
          <button
            type="button"
            onClick={() => setMobileDrawer((prev) => (prev === 'tools' ? 'none' : 'tools'))}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mobileDrawer === 'tools' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-200'
            }`}
          >
            <Settings size={14} />
            <span>{t.toolTitle}</span>
          </button>
          {uiPanels.properties && (
            <button
              type="button"
              onClick={() => setMobileDrawer((prev) => (prev === 'properties' ? 'none' : 'properties'))}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mobileDrawer === 'properties' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <Sliders size={14} />
              <span>{t.propTitle}</span>
            </button>
          )}
          {mobileDrawer !== 'none' && (
            <button
              type="button"
              onClick={() => setMobileDrawer('none')}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
              title={t.close}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
    </>
  );
};