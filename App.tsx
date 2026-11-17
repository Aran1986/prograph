import React, { useState, useCallback, useEffect, Suspense, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { GraphNode } from './components/GraphNode';
import { GraphEdge } from './components/GraphEdge';
import { UIOverlay } from './components/UIOverlay';
import {
  GraphNodeData,
  GraphEdgeData,
  AppState,
  UIPanelsState,
  AttachedFile,
  Language,
  AIArchitectDefinitions,
  ProjectWorkspace
} from './types';
import { generateCakePresentation, generateSmartGuide, generateModeContent } from './services/ai';
import { getDir, translations } from './utils/translations';
import { computeForceDirectedLayout, computeRadialLayout } from './utils/graphLayout';

const PROJECTS_STORAGE_KEY = 'graph_pro_projects_v1';
const LEGACY_STORAGE_KEY = 'graph_pro_data';

const toUtf8Base64 = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

interface CameraFocusRequest {
  id: number;
  position: [number, number, number];
  lookAt: [number, number, number];
}

// Keyboard Control Component for Arrow navigation ONLY
const KeyboardControls = () => {
  const { camera, controls } = useThree();
  const [keys, setKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      setKeys((k) => ({ ...k, [e.code]: true }));
    };
    const handleKeyUp = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.code]: false }));

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    // @ts-ignore
    if (!controls || !controls.enabled) return;

    const speed = 20 * delta;
    const moveVector = new THREE.Vector3();

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
    right.normalize();

    if (keys['ArrowUp']) moveVector.add(forward.clone().multiplyScalar(speed));
    if (keys['ArrowDown']) moveVector.add(forward.clone().multiplyScalar(-speed));
    if (keys['ArrowRight']) moveVector.add(right.clone().multiplyScalar(-speed));
    if (keys['ArrowLeft']) moveVector.add(right.clone().multiplyScalar(speed));

    if (moveVector.lengthSq() > 0) {
      camera.position.add(moveVector);
      // @ts-ignore
      if (controls.target) {
        // @ts-ignore
        controls.target.add(moveVector);
      }
    }
  });

  return null;
};

const CameraTracker: React.FC<{ onUpdate: (pos: THREE.Vector3) => void }> = ({ onUpdate }) => {
  const { camera } = useThree();
  const lastReported = useRef(new THREE.Vector3(Infinity, Infinity, Infinity));

  useFrame(() => {
    if (lastReported.current.distanceToSquared(camera.position) > 0.25) {
      lastReported.current.copy(camera.position);
      onUpdate(camera.position.clone());
    }
  });
  return null;
};

const CameraController: React.FC<{
  focusRequest: CameraFocusRequest | null;
  onFinishFocus: () => void;
}> = ({ focusRequest, onFinishFocus }) => {
  const { camera, controls } = useThree();
  const activeIdRef = useRef<number | null>(null);
  const targetCam = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  useEffect(() => {
    if (focusRequest && focusRequest.id !== activeIdRef.current) {
      activeIdRef.current = focusRequest.id;
      targetCam.current.set(...focusRequest.position);
      targetLookAt.current.set(...focusRequest.lookAt);
    } else if (!focusRequest) {
      activeIdRef.current = null;
    }
  }, [focusRequest]);

  useFrame((_, delta) => {
    if (!focusRequest || activeIdRef.current === null) return;

    const lambda = 7;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCam.current.x, lambda, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCam.current.y, lambda, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCam.current.z, lambda, delta);

    // @ts-ignore
    if (controls?.target) {
      // @ts-ignore
      controls.target.x = THREE.MathUtils.damp(controls.target.x, targetLookAt.current.x, lambda, delta);
      // @ts-ignore
      controls.target.y = THREE.MathUtils.damp(controls.target.y, targetLookAt.current.y, lambda, delta);
      // @ts-ignore
      controls.target.z = THREE.MathUtils.damp(controls.target.z, targetLookAt.current.z, lambda, delta);
      // @ts-ignore
      controls.update();
    }

    if (camera.position.distanceToSquared(targetCam.current) < 0.01) {
      camera.position.copy(targetCam.current);
      // @ts-ignore
      if (controls?.target) {
        // @ts-ignore
        controls.target.copy(targetLookAt.current);
        // @ts-ignore
        controls.update();
      }
      activeIdRef.current = null;
      onFinishFocus();
    }
  });

  return null;
};

const MarqueeProjector: React.FC<{
  nodes: GraphNodeData[];
  projectorRef: React.MutableRefObject<
    ((rect: { left: number; top: number; right: number; bottom: number }, width: number, height: number) => string[]) | null
  >;
}> = ({ nodes, projectorRef }) => {
  const { camera } = useThree();

  useEffect(() => {
    projectorRef.current = (rect, width, height) => {
      const vec = new THREE.Vector3();
      const selected: string[] = [];
      nodes.forEach((n) => {
        vec.set(n.position[0], n.position[1], n.position[2]);
        vec.project(camera);
        if (vec.z >= -1 && vec.z <= 1) {
          const sx = (vec.x * 0.5 + 0.5) * width;
          const sy = (-vec.y * 0.5 + 0.5) * height;
          if (sx >= rect.left && sx <= rect.right && sy >= rect.top && sy <= rect.bottom) {
            selected.push(n.id);
          }
        }
      });
      return selected;
    };
  }, [nodes, camera, projectorRef]);

  return null;
};

const createDefaultNode = (): GraphNodeData => ({
  id: crypto.randomUUID(),
  label: 'Node 1',
  summary: 'Short summary...',
  fullContent: '',
  color: '#2196F3',
  size: 1,
  position: [0, 0, 0],
  files: []
});

const App: React.FC = () => {
  const [projects, setProjects] = useState<ProjectWorkspace[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [isWorkspaceLoaded, setIsWorkspaceLoaded] = useState(false);

  const [nodes, setNodes] = useState<GraphNodeData[]>([]);
  const [edges, setEdges] = useState<GraphEdgeData[]>([]);
  const [architectDefs, setArchitectDefs] = useState<AIArchitectDefinitions>({
    nodeDefinition: '',
    edgeDefinition: '',
    projectGoals: ''
  });
  const [appState, setAppState] = useState<AppState>({
    nodes: [],
    edges: [],
    selectedIds: [],
    activeType: null,
    mode: 'select',
    edgeStartNodeId: null,
    appLanguage: 'fa',
    aiMode: 'presentation'
  });

  const [snapToGrid, setSnapToGrid] = useState(false);
  const [history, setHistory] = useState<{ nodes: GraphNodeData[]; edges: GraphEdgeData[] }[]>([]);
  const [future, setFuture] = useState<{ nodes: GraphNodeData[]; edges: GraphEdgeData[] }[]>([]);

  const [cameraPosDisplay, setCameraPosDisplay] = useState({ x: 0, y: 10, z: 20 });
  const [focusRequest, setFocusRequest] = useState<CameraFocusRequest | null>(null);
  const [hoverData, setHoverData] = useState<{ label: string; summary: string; full: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Marquee Box Selection state
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const marqueeProjectorRef = useRef<
    ((rect: { left: number; top: number; right: number; bottom: number }, width: number, height: number) => string[]) | null
  >(null);
  const [marqueeBox, setMarqueeBox] = useState<{ startX: number; startY: number; currX: number; currY: number } | null>(null);

  const [uiPanels, setUiPanels] = useState<UIPanelsState>({
    tools: true,
    properties: true,
    camera: true,
    hints: true,
    filePanel: false
  });

  const [presentationMode, setPresentationMode] = useState<{
    isOpen: boolean;
    content: string;
    isLoading: boolean;
    activeFiles: AttachedFile[];
    targetLanguage: Language;
    activeItemId: string | null;
    modeTitle?: string;
  }>({
    isOpen: false,
    content: '',
    isLoading: false,
    activeFiles: [],
    targetLanguage: 'fa',
    activeItemId: null
  });

  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 5000);
  }, []);

  // --- History Management ---
  const saveHistory = useCallback(() => {
    setHistory((prev) => [...prev, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
    setFuture([]);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    setFuture((prev) => [...prev, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setHistory(newHistory);
  }, [history, nodes, edges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[future.length - 1];
    const newFuture = future.slice(0, -1);

    setHistory((prev) => [...prev, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
    setNodes(next.nodes);
    setEdges(next.edges);
    setFuture(newFuture);
  }, [future, nodes, edges]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Initial Workspace Load (with legacy migration)
  useEffect(() => {
    const savedProjectsRaw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (savedProjectsRaw) {
      try {
        const parsed = JSON.parse(savedProjectsRaw);
        const list: ProjectWorkspace[] = parsed.projects || [];
        if (list.length > 0) {
          const active = list.find((p) => p.id === parsed.activeProjectId) || list[0];
          setProjects(list);
          setActiveProjectId(active.id);
          setNodes(active.nodes || []);
          setEdges(active.edges || []);
          setArchitectDefs(active.architectDefs || { nodeDefinition: '', edgeDefinition: '', projectGoals: '' });
          setIsWorkspaceLoaded(true);
          return;
        }
      } catch (e) {
        console.error('Failed to parse projects workspace', e);
      }
    }

    // Migrate legacy single-project storage or create fresh default
    let initialNodes: GraphNodeData[] = [createDefaultNode()];
    let initialEdges: GraphEdgeData[] = [];
    let initialDefs: AIArchitectDefinitions = { nodeDefinition: '', edgeDefinition: '', projectGoals: '' };

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw);
        initialNodes = legacy.nodes || initialNodes;
        initialEdges = legacy.edges || [];
        initialDefs = legacy.architectDefs || initialDefs;
      } catch {
        // ignore
      }
    }

    const firstProject: ProjectWorkspace = {
      id: crypto.randomUUID(),
      name: translations.fa.defaultProjectName,
      updatedAt: Date.now(),
      nodes: initialNodes,
      edges: initialEdges,
      architectDefs: initialDefs
    };

    setProjects([firstProject]);
    setActiveProjectId(firstProject.id);
    setNodes(initialNodes);
    setEdges(initialEdges);
    setArchitectDefs(initialDefs);
    if (initialNodes[0]) {
      setAppState((prev) => ({ ...prev, selectedIds: [initialNodes[0].id], activeType: 'node', mode: 'select' }));
    }
    setIsWorkspaceLoaded(true);
  }, []);

  // Persist active workspace changes
  useEffect(() => {
    if (!isWorkspaceLoaded || !activeProjectId) return;

    setProjects((prev) => {
      const updated = prev.map((p) =>
        p.id === activeProjectId
          ? { ...p, nodes, edges, architectDefs, updatedAt: Date.now() }
          : p
      );
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify({ activeProjectId, projects: updated }));
      return updated;
    });
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ nodes, edges, architectDefs }));
  }, [nodes, edges, architectDefs, activeProjectId, isWorkspaceLoaded]);

  useEffect(() => {
    document.documentElement.dir = getDir(appState.appLanguage);
    document.documentElement.lang = appState.appLanguage;
  }, [appState.appLanguage]);

  // --- Multi-Project Actions ---
  const handleSelectProject = useCallback(
    (projectId: string) => {
      const target = projects.find((p) => p.id === projectId);
      if (!target) return;
      setActiveProjectId(target.id);
      setNodes(target.nodes || []);
      setEdges(target.edges || []);
      setArchitectDefs(target.architectDefs || { nodeDefinition: '', edgeDefinition: '', projectGoals: '' });
      setHistory([]);
      setFuture([]);
      setAppState((prev) => ({ ...prev, selectedIds: [], activeType: null, mode: 'select', edgeStartNodeId: null }));
      setFocusRequest({ id: Date.now(), position: [0, 10, 20], lookAt: [0, 0, 0] });
    },
    [projects]
  );

  const handleCreateProject = useCallback((name: string) => {
    const initialNode = createDefaultNode();
    const newProject: ProjectWorkspace = {
      id: crypto.randomUUID(),
      name,
      updatedAt: Date.now(),
      nodes: [initialNode],
      edges: [],
      architectDefs: { nodeDefinition: '', edgeDefinition: '', projectGoals: '' }
    };
    setProjects((prev) => {
      const next = [newProject, ...prev];
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify({ activeProjectId: newProject.id, projects: next }));
      return next;
    });
    setActiveProjectId(newProject.id);
    setNodes([initialNode]);
    setEdges([]);
    setArchitectDefs(newProject.architectDefs);
    setHistory([]);
    setFuture([]);
    setAppState((prev) => ({ ...prev, selectedIds: [initialNode.id], activeType: 'node', mode: 'select' }));
    setFocusRequest({ id: Date.now(), position: [0, 10, 20], lookAt: [0, 0, 0] });
  }, []);

  const handleRenameProject = useCallback((id: string, newName: string) => {
    setProjects((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, name: newName } : p));
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify({ activeProjectId, projects: next }));
      return next;
    });
  }, [activeProjectId]);

  const handleDeleteProject = useCallback(
    (id: string) => {
      setProjects((prev) => {
        if (prev.length <= 1) return prev;
        const remaining = prev.filter((p) => p.id !== id);
        if (id === activeProjectId && remaining[0]) {
          const fallback = remaining[0];
          setActiveProjectId(fallback.id);
          setNodes(fallback.nodes || []);
          setEdges(fallback.edges || []);
          setArchitectDefs(fallback.architectDefs || { nodeDefinition: '', edgeDefinition: '', projectGoals: '' });
          setHistory([]);
          setFuture([]);
          setAppState((s) => ({ ...s, selectedIds: [], activeType: null, mode: 'select' }));
        }
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify({ activeProjectId: id === activeProjectId ? remaining[0].id : activeProjectId, projects: remaining }));
        return remaining;
      });
    },
    [activeProjectId]
  );

  // --- Graph Interaction ---
  const handleAddNode = useCallback(() => {
    saveHistory();
    const newNode: GraphNodeData = {
      id: crypto.randomUUID(),
      label: `Node ${nodes.length + 1}`,
      summary: 'Short summary...',
      fullContent: '',
      color: '#2196F3',
      size: 1,
      position: [Math.random() * 10 - 5, 0, Math.random() * 10 - 5],
      files: []
    };
    setNodes((prev) => [...prev, newNode]);
    setAppState((prev) => ({ ...prev, selectedIds: [newNode.id], activeType: 'node', mode: 'select' }));
  }, [nodes.length, saveHistory]);

  const handleNodeClick = useCallback(
    (e: any, id: string) => {
      e.stopPropagation();
      const isShift = Boolean(e.shiftKey || e.nativeEvent?.shiftKey);

      setAppState((prev) => {
        if (prev.mode === 'select') {
          if (isShift && (prev.activeType === 'node' || prev.selectedIds.length === 0)) {
            const exists = prev.selectedIds.includes(id);
            const nextIds = exists ? prev.selectedIds.filter((sid) => sid !== id) : [...prev.selectedIds, id];
            return {
              ...prev,
              selectedIds: nextIds,
              activeType: nextIds.length > 0 ? 'node' : null
            };
          }
          return { ...prev, selectedIds: [id], activeType: 'node' };
        } else if (prev.mode === 'edge-start') {
          return { ...prev, edgeStartNodeId: id, mode: 'edge-finish' };
        } else if (prev.mode === 'edge-finish') {
          if (prev.edgeStartNodeId && prev.edgeStartNodeId !== id) {
            saveHistory();
            const newEdge: GraphEdgeData = {
              id: crypto.randomUUID(),
              fromId: prev.edgeStartNodeId,
              toId: id,
              label: 'Connection',
              color: '#666666',
              size: 0.1,
              summary: 'Connection...',
              fullContent: '',
              files: [],
              direction: 'bidirectional'
            };
            setEdges((current) => [...current, newEdge]);
            return { ...prev, mode: 'select', selectedIds: [newEdge.id], activeType: 'edge', edgeStartNodeId: null };
          }
          return { ...prev, mode: 'select', edgeStartNodeId: null };
        }
        return prev;
      });
    },
    [saveHistory]
  );

  const handleEdgeClick = useCallback(
    (e: any, id: string) => {
      e.stopPropagation();
      if (appState.mode === 'select') {
        const isShift = Boolean(e.shiftKey || e.nativeEvent?.shiftKey);
        setAppState((prev) => {
          if (isShift && (prev.activeType === 'edge' || prev.selectedIds.length === 0)) {
            const exists = prev.selectedIds.includes(id);
            const nextIds = exists ? prev.selectedIds.filter((sid) => sid !== id) : [...prev.selectedIds, id];
            return {
              ...prev,
              selectedIds: nextIds,
              activeType: nextIds.length > 0 ? 'edge' : null
            };
          }
          return { ...prev, selectedIds: [id], activeType: 'edge' };
        });
      }
    },
    [appState.mode]
  );

  const handleBackgroundClick = useCallback(() => {
    if (appState.mode === 'select') {
      setAppState((prev) => ({ ...prev, selectedIds: [], activeType: null }));
    }
  }, [appState.mode]);

  // Focus camera smoothly on a node or edge
  const handleFocusItem = useCallback(
    (id: string, type: 'node' | 'edge') => {
      if (type === 'node') {
        const node = nodes.find((n) => n.id === id);
        if (!node) return;
        setAppState((prev) => ({ ...prev, selectedIds: [id], activeType: 'node', mode: 'select' }));
        setFocusRequest({
          id: Date.now(),
          position: [node.position[0], node.position[1] + 5, node.position[2] + 10],
          lookAt: [...node.position]
        });
      } else {
        const edge = edges.find((e) => e.id === id);
        const from = nodes.find((n) => n.id === edge?.fromId);
        const to = nodes.find((n) => n.id === edge?.toId);
        if (!edge || !from || !to) return;
        const mid: [number, number, number] = [
          (from.position[0] + to.position[0]) / 2,
          (from.position[1] + to.position[1]) / 2,
          (from.position[2] + to.position[2]) / 2
        ];
        setAppState((prev) => ({ ...prev, selectedIds: [id], activeType: 'edge', mode: 'select' }));
        setFocusRequest({
          id: Date.now(),
          position: [mid[0], mid[1] + 6, mid[2] + 12],
          lookAt: mid
        });
      }
    },
    [nodes, edges]
  );

  // Auto-Layout actions
  const handleAutoLayout = useCallback(
    (kind: 'force' | 'radial') => {
      saveHistory();
      setNodes((prev) => (kind === 'force' ? computeForceDirectedLayout(prev, edges) : computeRadialLayout(prev)));
      setFocusRequest({ id: Date.now(), position: [0, 12, 22], lookAt: [0, 0, 0] });
    },
    [edges, saveHistory]
  );

  // Marquee Box Selection pointer handlers
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (appState.mode !== 'box-select' || e.button !== 0 || !canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMarqueeBox({ startX: x, startY: y, currX: x, currY: y });
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!marqueeBox || !canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    setMarqueeBox((prev) =>
      prev ? { ...prev, currX: e.clientX - rect.left, currY: e.clientY - rect.top } : null
    );
  };

  const handleCanvasPointerUp = () => {
    if (!marqueeBox || !canvasContainerRef.current || !marqueeProjectorRef.current) {
      setMarqueeBox(null);
      return;
    }
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const box = {
      left: Math.min(marqueeBox.startX, marqueeBox.currX),
      top: Math.min(marqueeBox.startY, marqueeBox.currY),
      right: Math.max(marqueeBox.startX, marqueeBox.currX),
      bottom: Math.max(marqueeBox.startY, marqueeBox.currY)
    };
    const matchedIds = marqueeProjectorRef.current(box, rect.width, rect.height);
    setAppState((prev) => ({
      ...prev,
      selectedIds: matchedIds,
      activeType: matchedIds.length > 0 ? 'node' : null,
      mode: 'select'
    }));
    setMarqueeBox(null);
  };

  const handleAddFile = useCallback(
    (file: AttachedFile, itemId: string) => {
      saveHistory();
      setNodes((prev) => prev.map((n) => (n.id === itemId ? { ...n, files: [...(n.files || []), file] } : n)));
      setEdges((prev) => prev.map((e) => (e.id === itemId ? { ...e, files: [...(e.files || []), file] } : e)));
    },
    [saveHistory]
  );

  const handleRemoveFile = useCallback(
    (fileId: string, itemId: string) => {
      saveHistory();
      setNodes((prev) => prev.map((n) => (n.id === itemId ? { ...n, files: (n.files || []).filter((f) => f.id !== fileId) } : n)));
      setEdges((prev) => prev.map((e) => (e.id === itemId ? { ...e, files: (e.files || []).filter((f) => f.id !== fileId) } : e)));
    },
    [saveHistory]
  );

  const handleSaveModalContent = useCallback(
    (newContent: string, itemIdOverride?: string) => {
      const id = itemIdOverride || presentationMode.activeItemId;
      if (!id) return;
      saveHistory();
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, fullContent: newContent } : n)));
      setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, fullContent: newContent } : e)));
      setPresentationMode((prev) => (prev.activeItemId === id ? { ...prev, content: newContent } : prev));
    },
    [presentationMode.activeItemId, saveHistory]
  );

  const openPresentation = (content: string, item: GraphNodeData | GraphEdgeData, title: string, isLoading = false) => {
    setPresentationMode({
      isOpen: true,
      content,
      isLoading,
      activeFiles: item.files || [],
      targetLanguage: appState.appLanguage,
      activeItemId: item.id,
      modeTitle: title
    });
  };

  const handleDoubleClick = useCallback(
    async (e: any, id: string) => {
      e.stopPropagation();
      const target = nodes.find((n) => n.id === id) || edges.find((edge) => edge.id === id);
      if (target) {
        const t = translations[appState.appLanguage];
        let modeTitle = t.presentationTitle;
        if (appState.aiMode !== 'presentation') {
          modeTitle = t.modes[appState.aiMode];
        }
        openPresentation(target.fullContent || '', target, modeTitle, false);
      }
    },
    [nodes, edges, appState.appLanguage, appState.aiMode]
  );

  const handleCakePresentation = useCallback(async () => {
    const id = appState.selectedIds[0];
    const target = nodes.find((n) => n.id === id) || edges.find((e) => e.id === id);
    if (!target) return;
    const t = translations[appState.appLanguage];
    openPresentation(target.fullContent || '', target, t.cakePres, true);
    try {
      const htmlContent = await generateCakePresentation(target, appState.appLanguage);
      handleSaveModalContent(htmlContent, target.id);
      setPresentationMode((prev) => ({ ...prev, content: htmlContent, isLoading: false }));
    } catch (err: any) {
      setPresentationMode((prev) => ({ ...prev, isLoading: false }));
      showToast(err?.message || 'Error generating presentation', 'error');
    }
  }, [nodes, edges, appState.selectedIds, appState.appLanguage, handleSaveModalContent, showToast]);

  const handleSmartGuide = useCallback(async () => {
    const id = appState.selectedIds[0];
    const target = nodes.find((n) => n.id === id) || edges.find((e) => e.id === id);
    if (!target) return;
    const t = translations[appState.appLanguage];
    openPresentation(target.fullContent || '', target, t.smartGuide, true);
    try {
      const htmlContent = await generateSmartGuide(target, nodes, edges, appState.appLanguage);
      handleSaveModalContent(htmlContent, target.id);
      setPresentationMode((prev) => ({ ...prev, content: htmlContent, isLoading: false }));
    } catch (err: any) {
      setPresentationMode((prev) => ({ ...prev, isLoading: false }));
      showToast(err?.message || 'Error generating smart guide', 'error');
    }
  }, [nodes, edges, appState.selectedIds, appState.appLanguage, handleSaveModalContent, showToast]);

  const regeneratePresentation = async (lang: Language) => {
    const id = presentationMode.activeItemId;
    if (!id) return;
    const target = nodes.find((n) => n.id === id) || edges.find((e) => e.id === id);
    if (!target) return;

    setPresentationMode((prev) => ({ ...prev, isLoading: true, targetLanguage: lang }));
    try {
      const htmlContent = await generateModeContent(target, appState.aiMode, lang);
      handleSaveModalContent(htmlContent, target.id);
      setPresentationMode((prev) => ({ ...prev, content: htmlContent, isLoading: false }));
    } catch (err: any) {
      setPresentationMode((prev) => ({ ...prev, isLoading: false }));
      showToast(err?.message || 'Error generating content', 'error');
    }
  };

  const handleDragNode = useCallback(
    (id: string, rawPos: [number, number, number]) => {
      const newPos: [number, number, number] = snapToGrid
        ? [Math.round(rawPos[0] * 2) / 2, Math.round(rawPos[1] * 2) / 2, Math.round(rawPos[2] * 2) / 2]
        : rawPos;

      setNodes((prev) => {
        const draggedNode = prev.find((n) => n.id === id);
        if (!draggedNode) return prev;
        const dx = newPos[0] - draggedNode.position[0];
        const dy = newPos[1] - draggedNode.position[1];
        const dz = newPos[2] - draggedNode.position[2];

        if (appState.selectedIds.includes(id)) {
          return prev.map((n) => {
            if (appState.selectedIds.includes(n.id)) {
              return { ...n, position: [n.position[0] + dx, n.position[1] + dy, n.position[2] + dz] };
            }
            return n;
          });
        }
        return prev.map((n) => (n.id === id ? { ...n, position: newPos } : n));
      });
    },
    [appState.selectedIds, snapToGrid]
  );

  const handleUpdateItem = useCallback(
    (id: string, type: 'node' | 'edge', data: any) => {
      const targetIds = appState.selectedIds.includes(id) ? appState.selectedIds : [id];
      if (type === 'node') {
        setNodes((prev) => prev.map((n) => (targetIds.includes(n.id) ? { ...n, ...data } : n)));
      } else {
        setEdges((prev) => prev.map((e) => (targetIds.includes(e.id) ? { ...e, ...data } : e)));
      }
    },
    [appState.selectedIds]
  );

  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        saveHistory();
        const result = e.target?.result as string;
        const newFile: AttachedFile = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type || 'text/plain',
          content: result
        };
        const { selectedIds, activeType } = appState;
        if (activeType === 'node') {
          setNodes((prev) => prev.map((n) => (selectedIds.includes(n.id) ? { ...n, files: [...(n.files || []), newFile] } : n)));
        } else if (activeType === 'edge') {
          setEdges((prev) => prev.map((ed) => (selectedIds.includes(ed.id) ? { ...ed, files: [...(ed.files || []), newFile] } : ed)));
        }
      };
      reader.readAsDataURL(file);
    },
    [appState, saveHistory]
  );

  const handleDeleteFile = useCallback(
    (fileId: string) => {
      saveHistory();
      const { selectedIds, activeType } = appState;
      if (activeType === 'node') {
        setNodes((prev) => prev.map((n) => (selectedIds.includes(n.id) ? { ...n, files: (n.files || []).filter((f) => f.id !== fileId) } : n)));
      } else if (activeType === 'edge') {
        setEdges((prev) => prev.map((ed) => (selectedIds.includes(ed.id) ? { ...ed, files: (ed.files || []).filter((f) => f.id !== fileId) } : ed)));
      }
    },
    [appState, saveHistory]
  );

  const handleDeleteItem = useCallback(() => {
    saveHistory();
    const { selectedIds, activeType } = appState;
    if (selectedIds.length === 0) return;
    if (activeType === 'node') {
      setNodes((prev) => prev.filter((n) => !selectedIds.includes(n.id)));
      setEdges((prev) => prev.filter((e) => !selectedIds.includes(e.fromId) && !selectedIds.includes(e.toId)));
    } else {
      setEdges((prev) => prev.filter((e) => !selectedIds.includes(e.id)));
    }
    setAppState((prev) => ({ ...prev, selectedIds: [], activeType: null }));
  }, [appState, saveHistory]);

  const handleSelectSameColor = useCallback(() => {
    const { selectedIds, activeType } = appState;
    if (selectedIds.length === 0 || !activeType) return;
    const refColor =
      activeType === 'node'
        ? nodes.find((n) => n.id === selectedIds[0])?.color
        : edges.find((e) => e.id === selectedIds[0])?.color;
    if (!refColor) return;
    const newSelection =
      activeType === 'node'
        ? nodes.filter((n) => n.color === refColor).map((n) => n.id)
        : edges.filter((e) => e.color === refColor).map((e) => e.id);
    setAppState((prev) => ({ ...prev, selectedIds: newSelection }));
  }, [appState, nodes, edges]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ nodes, edges, architectDefs }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `graph-project-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        saveHistory();
        const result = JSON.parse(e.target?.result as string);
        if (result.nodes) setNodes(result.nodes);
        if (result.edges) setEdges(result.edges);
        if (result.architectDefs) setArchitectDefs(result.architectDefs);
        showToast(appState.appLanguage === 'fa' ? 'پروژه با موفقیت بارگذاری شد.' : 'Project loaded successfully.', 'success');
      } catch {
        showToast(appState.appLanguage === 'fa' ? 'فایل JSON نامعتبر است.' : 'Invalid JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // AI Architect: Replace Graph Structure from Files with Force-Directed Layout
  const handleApplyGraphFromAI = useCallback(
    (newNodesRaw: any[], newEdgesRaw: any[]) => {
      saveHistory();
      const count = Math.max(1, newNodesRaw.length);
      const radius = Math.max(5, count * 1.3);

      const initialNodes: GraphNodeData[] = newNodesRaw.map((n, idx) => {
        const angle = (idx / count) * Math.PI * 2;
        return {
          id: crypto.randomUUID(),
          label: n.label || `Node ${idx + 1}`,
          summary: n.summary || '',
          fullContent: n.fullContent || '',
          color: n.color || `hsl(${Math.round((idx / count) * 320)}, 70%, 50%)`,
          size: n.size || 1,
          position: [Math.cos(angle) * radius, ((idx % 3) - 1) * 1.2, Math.sin(angle) * radius],
          files: []
        };
      });

      const mappedEdges: GraphEdgeData[] = (newEdgesRaw || [])
        .map((e): GraphEdgeData | null => {
          const fromNode = initialNodes.find((n) => n.label.toLowerCase() === String(e.fromLabel || '').toLowerCase());
          const toNode = initialNodes.find((n) => n.label.toLowerCase() === String(e.toLabel || '').toLowerCase());
          if (fromNode && toNode && fromNode.id !== toNode.id) {
            return {
              id: crypto.randomUUID(),
              fromId: fromNode.id,
              toId: toNode.id,
              label: e.label || 'Connection',
              color: '#64748b',
              size: 0.12,
              summary: e.summary || '',
              fullContent: '',
              files: [],
              direction: 'source-to-target'
            };
          }
          return null;
        })
        .filter((e): e is GraphEdgeData => e !== null);

      const relaxedNodes = computeForceDirectedLayout(initialNodes, mappedEdges, 140);

      setNodes(relaxedNodes);
      setEdges(mappedEdges);
      setAppState((prev) => ({ ...prev, selectedIds: relaxedNodes[0] ? [relaxedNodes[0].id] : [], activeType: relaxedNodes[0] ? 'node' : null }));
      setFocusRequest({ id: Date.now(), position: [0, 14, 24], lookAt: [0, 0, 0] });
      showToast(
        appState.appLanguage === 'fa'
          ? `گراف با ${relaxedNodes.length} نود و ${mappedEdges.length} یال ساخته شد.`
          : `Built graph with ${relaxedNodes.length} nodes and ${mappedEdges.length} edges.`,
        'success'
      );
    },
    [saveHistory, appState.appLanguage, showToast]
  );

  // AI Architect: Apply incremental changes
  const handleApplyChangesFromAI = useCallback(
    (changes: {
      modifiedNodes?: { id?: string; nodeLabel?: string; content: string }[];
      newNodes?: any[];
      newEdges?: any[];
      deleteNodeIds?: string[];
      deleteEdgeIds?: string[];
    }) => {
      saveHistory();

      const addedNodes: GraphNodeData[] = (changes.newNodes || []).map((n, idx) => {
        const angle = ((nodes.length + idx) / Math.max(1, nodes.length + (changes.newNodes?.length || 1))) * Math.PI * 2;
        const radius = Math.max(6, nodes.length * 1.2 + 4);
        return {
          id: crypto.randomUUID(),
          label: n.label || `AI Node ${idx + 1}`,
          summary: n.summary || 'AI Generated',
          fullContent: n.fullContent || '',
          color: n.color || '#9333ea',
          size: n.size || 1,
          position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
          files: []
        };
      });

      const updatedExistingNodes = nodes
        .filter((n) => !(changes.deleteNodeIds || []).includes(n.id))
        .map((node) => {
          const mod = (changes.modifiedNodes || []).find(
            (m) => (m.id && m.id === node.id) || (m.nodeLabel && m.nodeLabel.toLowerCase() === node.label.toLowerCase())
          );
          if (mod && mod.content) {
            const shadowFile: AttachedFile = {
              id: crypto.randomUUID(),
              name: `AI_Shadow_${Date.now()}.txt`,
              type: 'text/plain',
              content: `data:text/plain;base64,${toUtf8Base64(mod.content)}`,
              isAiGenerated: true
            };
            return { ...node, files: [...(node.files || []), shadowFile] };
          }
          return node;
        });

      const allNodesPool = [...updatedExistingNodes, ...addedNodes];

      const addedEdges: GraphEdgeData[] = (changes.newEdges || [])
        .map((e): GraphEdgeData | null => {
          const fromNode = allNodesPool.find((n) => n.label.toLowerCase() === String(e.fromLabel || '').toLowerCase());
          const toNode = allNodesPool.find((n) => n.label.toLowerCase() === String(e.toLabel || '').toLowerCase());
          if (fromNode && toNode && fromNode.id !== toNode.id) {
            return {
              id: crypto.randomUUID(),
              fromId: fromNode.id,
              toId: toNode.id,
              label: e.label || 'Connection',
              color: '#8b5cf6',
              size: 0.12,
              summary: e.summary || '',
              fullContent: '',
              files: [],
              direction: 'source-to-target'
            };
          }
          return null;
        })
        .filter((e): e is GraphEdgeData => e !== null);

      const deletedNodeSet = new Set(changes.deleteNodeIds || []);
      const deletedEdgeSet = new Set(changes.deleteEdgeIds || []);

      setNodes(allNodesPool);
      setEdges((prev) => [
        ...prev.filter((e) => !deletedEdgeSet.has(e.id) && !deletedNodeSet.has(e.fromId) && !deletedNodeSet.has(e.toId)),
        ...addedEdges
      ]);
    },
    [nodes, saveHistory]
  );

  const handlePointerOver = useCallback((e: any, data: GraphNodeData | GraphEdgeData) => {
    e.stopPropagation();
    if ('summary' in data) {
      setHoverData({ label: data.label, summary: data.summary || '', full: data.fullContent || '' });
    }
  }, []);

  const handlePointerOut = useCallback(() => {
    setHoverData(null);
  }, []);

  return (
    <div className="w-full h-screen relative bg-slate-100 overflow-hidden flex flex-col font-sans">
      <UIOverlay
        appState={appState}
        nodes={nodes}
        edges={edges}
        cameraPos={cameraPosDisplay}
        uiPanels={uiPanels}
        setUiPanels={setUiPanels}
        setAppState={setAppState}
        onAddNode={handleAddNode}
        onToggleEdgeMode={() =>
          setAppState((prev) => ({ ...prev, mode: prev.mode === 'edge-start' || prev.mode === 'edge-finish' ? 'select' : 'edge-start', edgeStartNodeId: null }))
        }
        onToggleBoxSelectMode={() =>
          setAppState((prev) => ({ ...prev, mode: prev.mode === 'box-select' ? 'select' : 'box-select', edgeStartNodeId: null }))
        }
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        onAutoLayout={handleAutoLayout}
        onFocusItem={handleFocusItem}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onExport={handleExport}
        onImport={handleImport}
        onCameraTeleport={(x, y, z) =>
          setFocusRequest({ id: Date.now(), position: [x, y, z], lookAt: [x, 0, z - 10] })
        }
        hoverInfo={hoverData}
        onSelectSameColor={handleSelectSameColor}
        onFileUpload={handleFileUpload}
        onDeleteFile={handleDeleteFile}
        presentationMode={presentationMode}
        setPresentationMode={setPresentationMode}
        onRegeneratePresentation={regeneratePresentation}
        onSavePresentationContent={handleSaveModalContent}
        onCakePresentation={handleCakePresentation}
        onSmartGuide={handleSmartGuide}
        onAddFile={handleAddFile}
        onRemoveFile={handleRemoveFile}
        onUndo={undo}
        onRedo={redo}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onPushHistory={saveHistory}
        onApplyGraphFromAI={handleApplyGraphFromAI}
        onApplyChangesFromAI={handleApplyChangesFromAI}
        architectDefs={architectDefs}
        setArchitectDefs={setArchitectDefs}
        onNotify={showToast}
        toast={toast}
        onDismissToast={() => setToast(null)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
      />

      <div
        ref={canvasContainerRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        className={`flex-1 min-h-0 w-full relative pt-12 ${appState.mode === 'box-select' ? 'cursor-crosshair' : ''}`}
      >
        <Canvas className="w-full h-full block" camera={{ position: [0, 10, 20], fov: 60 }} onPointerMissed={handleBackgroundClick}>
          <color attach="background" args={['#f0f2f5']} />
          <Suspense fallback={null}>
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 20, 10]} intensity={0.8} />
            <Grid infiniteGrid fadeDistance={50} sectionColor="#cbd5e1" cellColor="#e2e8f0" />
            <CameraController focusRequest={focusRequest} onFinishFocus={() => setFocusRequest(null)} />
            <CameraTracker onUpdate={(pos) => setCameraPosDisplay({ x: pos.x, y: pos.y, z: pos.z })} />
            <MarqueeProjector nodes={nodes} projectorRef={marqueeProjectorRef} />
            <KeyboardControls />
            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.1}
              onStart={() => setFocusRequest(null)}
              mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }}
            />
            {nodes.map((node) => (
              <GraphNode
                key={node.id}
                data={node}
                isSelected={appState.selectedIds.includes(node.id)}
                isEdgeStart={appState.mode === 'edge-finish' && appState.edgeStartNodeId === node.id}
                onClick={handleNodeClick}
                onDoubleClick={handleDoubleClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                onDrag={handleDragNode}
                onDragStart={saveHistory}
                isDraggingEnabled={appState.mode === 'select'}
              />
            ))}
            {edges.map((edge) => (
              <GraphEdge
                key={edge.id}
                data={edge}
                fromNode={nodes.find((n) => n.id === edge.fromId)}
                toNode={nodes.find((n) => n.id === edge.toId)}
                isSelected={appState.selectedIds.includes(edge.id)}
                onClick={handleEdgeClick}
                onDoubleClick={handleDoubleClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
              />
            ))}
          </Suspense>
        </Canvas>

        {/* Marquee Selection Overlay */}
        {marqueeBox && (
          <div
            className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/15 rounded-sm z-20"
            style={{
              left: Math.min(marqueeBox.startX, marqueeBox.currX),
              top: Math.min(marqueeBox.startY, marqueeBox.currY),
              width: Math.abs(marqueeBox.currX - marqueeBox.startX),
              height: Math.abs(marqueeBox.currY - marqueeBox.startY)
            }}
          />
        )}
      </div>
    </div>
  );
};

export default App;