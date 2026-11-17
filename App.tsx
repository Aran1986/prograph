import React, { useState, useCallback, useEffect, Suspense, useRef, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { GraphNode } from './components/GraphNode';
import { GraphEdge } from './components/GraphEdge';
import { UIOverlay } from './components/UIOverlay';
import { UploadCloud } from 'lucide-react';
import {
  GraphNodeData,
  GraphEdgeData,
  AppState,
  UIPanelsState,
  AttachedFile,
  Language,
  AIArchitectDefinitions,
  ProjectWorkspace,
  CameraBookmark,
  NodeShape,
  EdgeDirection
} from './types';
import { generateCakePresentation, generateSmartGuide, generateModeContent } from './services/ai';
import { getDir, translations } from './utils/translations';
import { alignSelectedNodes, AlignMode, computeForceDirectedLayout, computeRadialLayout } from './utils/graphLayout';
import { LEGACY_STORAGE_KEY, loadWorkspaceState, saveWorkspaceState } from './utils/workspaceStorage';
import { computeDegreeScaledSizes } from './utils/graphAnalytics';
import { GraphMinimap } from './components/GraphMinimap';
import { WalkthroughBar } from './components/WalkthroughBar';
import { CanvasContextMenu, CanvasContextMenuState } from './components/CanvasContextMenu';
import { TagZones3D } from './components/TagZones3D';
import { buildTemplateGraph, StarterTemplateId } from './utils/starterTemplates';

const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _groundRaycaster = new THREE.Raycaster();
const _groundNdc = new THREE.Vector2();
const _groundHit = new THREE.Vector3();

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

const CameraTracker: React.FC<{
  onUpdate: (pos: THREE.Vector3) => void;
  lookAtRef: React.MutableRefObject<[number, number, number]>;
}> = ({ onUpdate, lookAtRef }) => {
  const { camera, controls } = useThree();
  const lastReported = useRef(new THREE.Vector3(Infinity, Infinity, Infinity));

  useFrame(() => {
    // @ts-ignore
    if (controls?.target) {
      // @ts-ignore
      const tgt = controls.target as THREE.Vector3;
      lookAtRef.current = [
        Math.round(tgt.x * 100) / 100,
        Math.round(tgt.y * 100) / 100,
        Math.round(tgt.z * 100) / 100
      ];
    }
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

const SnapshotBridge: React.FC<{
  snapshotRef: React.MutableRefObject<(() => string | null) | null>;
}> = ({ snapshotRef }) => {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    snapshotRef.current = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/png');
    };
    return () => {
      snapshotRef.current = null;
    };
  }, [gl, scene, camera, snapshotRef]);

  return null;
};

const GroundProjector: React.FC<{
  projectorRef: React.MutableRefObject<((clientX: number, clientY: number) => [number, number, number] | null) | null>;
}> = ({ projectorRef }) => {
  const { camera, gl } = useThree();

  useEffect(() => {
    projectorRef.current = (clientX, clientY) => {
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      _groundNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _groundNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      _groundRaycaster.setFromCamera(_groundNdc, camera);
      const hit = _groundRaycaster.ray.intersectPlane(_groundPlane, _groundHit);
      if (!hit) return null;
      return [Math.round(hit.x * 100) / 100, 0, Math.round(hit.z * 100) / 100];
    };
    return () => {
      projectorRef.current = null;
    };
  }, [camera, gl, projectorRef]);

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
  const [focusNeighbors, setFocusNeighbors] = useState(false);
  const [activeFilter, setActiveFilter] = useState<{ color: string | null; tag: string | null }>({ color: null, tag: null });
  const [activePathHighlight, setActivePathHighlight] = useState<{ nodes: Set<string>; edges: Set<string> } | null>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const [sceneTheme, setSceneTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem('graph_pro_theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [isZenMode, setIsZenMode] = useState(false);
  const [showTagZones, setShowTagZones] = useState(true);
  const [copiedStyle, setCopiedStyle] = useState<
    | { type: 'node'; color: string; size: number; shape?: NodeShape }
    | { type: 'edge'; color: string; size: number; direction?: EdgeDirection }
    | null
  >(null);
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(null);
  const [tourState, setTourState] = useState<{ isOpen: boolean; isPlaying: boolean; currentIndex: number; orderedIds: string[] }>({
    isOpen: false,
    isPlaying: false,
    currentIndex: 0,
    orderedIds: []
  });
  const [history, setHistory] = useState<{ nodes: GraphNodeData[]; edges: GraphEdgeData[] }[]>([]);
  const [future, setFuture] = useState<{ nodes: GraphNodeData[]; edges: GraphEdgeData[] }[]>([]);

  const [cameraPosDisplay, setCameraPosDisplay] = useState({ x: 0, y: 10, z: 20 });
  const cameraLookAtRef = useRef<[number, number, number]>([0, 0, 0]);
  const [cameraBookmarks, setCameraBookmarks] = useState<CameraBookmark[]>([]);
  const [focusRequest, setFocusRequest] = useState<CameraFocusRequest | null>(null);
  const [hoverData, setHoverData] = useState<{ label: string; summary: string; full: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Marquee Box Selection, Snapshot & Ground Raycast state
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const snapshotCaptureRef = useRef<(() => string | null) | null>(null);
  const groundProjectorRef = useRef<((clientX: number, clientY: number) => [number, number, number] | null) | null>(null);
  const lastItemDoubleClickRef = useRef<number>(0);
  const lastItemContextMenuRef = useRef<number>(0);
  const rightDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const marqueeProjectorRef = useRef<
    ((rect: { left: number; top: number; right: number; bottom: number }, width: number, height: number) => string[]) | null
  >(null);
  const [marqueeBox, setMarqueeBox] = useState<{ startX: number; startY: number; currX: number; currY: number } | null>(null);

  const [uiPanels, setUiPanels] = useState<UIPanelsState>({
    tools: true,
    properties: true,
    camera: true,
    hints: true,
    filePanel: false,
    minimap: true
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
    try {
      localStorage.setItem('graph_pro_theme', sceneTheme);
    } catch {
      // ignore
    }
  }, [sceneTheme]);

  // Initial Workspace Load (IndexedDB with localStorage & legacy migration)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadWorkspaceState();
      if (cancelled) return;
      if (loaded && loaded.projects.length > 0) {
        const list = loaded.projects;
        const active = list.find((p) => p.id === loaded.activeProjectId) || list[0];
        setProjects(list);
        setActiveProjectId(active.id);
        setNodes(active.nodes || []);
        setEdges(active.edges || []);
        setArchitectDefs(active.architectDefs || { nodeDefinition: '', edgeDefinition: '', projectGoals: '' });
        setCameraBookmarks(active.cameraBookmarks || []);
        setIsWorkspaceLoaded(true);
        return;
      }

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
        architectDefs: initialDefs,
        cameraBookmarks: []
      };

      setProjects([firstProject]);
      setActiveProjectId(firstProject.id);
      setNodes(initialNodes);
      setEdges(initialEdges);
      setArchitectDefs(initialDefs);
      setCameraBookmarks([]);
      if (initialNodes[0]) {
        setAppState((prev) => ({ ...prev, selectedIds: [initialNodes[0].id], activeType: 'node', mode: 'select' }));
      }
      setIsWorkspaceLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist active workspace changes (debounced to keep 3D dragging smooth)
  useEffect(() => {
    if (!isWorkspaceLoaded || !activeProjectId) return;

    const timer = window.setTimeout(() => {
      setProjects((prev) => {
        const updated = prev.map((p) =>
          p.id === activeProjectId
            ? { ...p, nodes, edges, architectDefs, cameraBookmarks, updatedAt: Date.now() }
            : p
        );
        saveWorkspaceState(activeProjectId, updated).then((res) => {
          if (!res.ok) {
            showToast(translations[appState.appLanguage].storageFull, 'error');
          }
        });
        return updated;
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [nodes, edges, architectDefs, cameraBookmarks, activeProjectId, isWorkspaceLoaded, appState.appLanguage, showToast]);

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
      setCameraBookmarks(target.cameraBookmarks || []);
      setHistory([]);
      setFuture([]);
      setActivePathHighlight(null);
      setActiveFilter({ color: null, tag: null });
      setAppState((prev) => ({ ...prev, selectedIds: [], activeType: null, mode: 'select', edgeStartNodeId: null }));
      setFocusRequest({ id: Date.now(), position: [0, 10, 20], lookAt: [0, 0, 0] });
    },
    [projects]
  );

  const handleCreateProject = useCallback(
    (name: string, templateId: StarterTemplateId = 'blank') => {
      const built = buildTemplateGraph(templateId, appState.appLanguage);
      const newProject: ProjectWorkspace = {
        id: crypto.randomUUID(),
        name,
        updatedAt: Date.now(),
        nodes: built.nodes,
        edges: built.edges,
        architectDefs: built.architectDefs,
        cameraBookmarks: []
      };
      setProjects((prev) => {
        const next = [newProject, ...prev];
        saveWorkspaceState(newProject.id, next);
        return next;
      });
      setActiveProjectId(newProject.id);
      setNodes(built.nodes);
      setEdges(built.edges);
      setArchitectDefs(built.architectDefs);
      setCameraBookmarks([]);
      setHistory([]);
      setFuture([]);
      setActivePathHighlight(null);
      setActiveFilter({ color: null, tag: null });
      setAppState((prev) => ({
        ...prev,
        selectedIds: built.nodes[0] ? [built.nodes[0].id] : [],
        activeType: built.nodes[0] ? 'node' : null,
        mode: 'select'
      }));
      setFocusRequest({ id: Date.now(), position: [0, 12, 22], lookAt: [0, 0, 0] });
    },
    [appState.appLanguage]
  );

  const handleRenameProject = useCallback((id: string, newName: string) => {
    setProjects((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, name: newName } : p));
      saveWorkspaceState(activeProjectId, next);
      return next;
    });
  }, [activeProjectId]);

  const handleDeleteProject = useCallback(
    (id: string) => {
      setProjects((prev) => {
        if (prev.length <= 1) return prev;
        const remaining = prev.filter((p) => p.id !== id);
        const nextActiveId = id === activeProjectId ? remaining[0].id : activeProjectId;
        if (id === activeProjectId && remaining[0]) {
          const fallback = remaining[0];
          setActiveProjectId(fallback.id);
          setNodes(fallback.nodes || []);
          setEdges(fallback.edges || []);
          setArchitectDefs(fallback.architectDefs || { nodeDefinition: '', edgeDefinition: '', projectGoals: '' });
          setCameraBookmarks(fallback.cameraBookmarks || []);
          setHistory([]);
          setFuture([]);
          setActivePathHighlight(null);
          setActiveFilter({ color: null, tag: null });
          setAppState((s) => ({ ...s, selectedIds: [], activeType: null, mode: 'select' }));
        }
        saveWorkspaceState(nextActiveId, remaining);
        return remaining;
      });
    },
    [activeProjectId]
  );

  // --- Graph Interaction ---
  const handleAddNodeAt = useCallback(
    (position?: [number, number, number]) => {
      saveHistory();
      const rawPos: [number, number, number] = position || [Math.random() * 10 - 5, 0, Math.random() * 10 - 5];
      const finalPos: [number, number, number] = snapToGrid
        ? [Math.round(rawPos[0] * 2) / 2, Math.round(rawPos[1] * 2) / 2, Math.round(rawPos[2] * 2) / 2]
        : rawPos;
      const newNode: GraphNodeData = {
        id: crypto.randomUUID(),
        label: `Node ${nodes.length + 1}`,
        summary: 'Short summary...',
        fullContent: '',
        color: '#2196F3',
        size: 1,
        position: finalPos,
        files: [],
        tags: []
      };
      setNodes((prev) => [...prev, newNode]);
      setAppState((prev) => ({ ...prev, selectedIds: [newNode.id], activeType: 'node', mode: 'select' }));
    },
    [nodes.length, saveHistory, snapToGrid]
  );

  const handleAddNode = useCallback(() => {
    handleAddNodeAt();
  }, [handleAddNodeAt]);

  const handleAddChildNode = useCallback(
    (parentId: string) => {
      const parent = nodes.find((n) => n.id === parentId);
      if (!parent) return;
      saveHistory();
      const angle = Math.random() * Math.PI * 2;
      const dist = 3.2;
      const rawPos: [number, number, number] = [
        parent.position[0] + Math.cos(angle) * dist,
        parent.position[1],
        parent.position[2] + Math.sin(angle) * dist
      ];
      const finalPos: [number, number, number] = snapToGrid
        ? [Math.round(rawPos[0] * 2) / 2, Math.round(rawPos[1] * 2) / 2, Math.round(rawPos[2] * 2) / 2]
        : rawPos;
      const childNode: GraphNodeData = {
        id: crypto.randomUUID(),
        label: `Node ${nodes.length + 1}`,
        summary: '',
        fullContent: '',
        color: parent.color,
        size: 1,
        position: finalPos,
        files: [],
        tags: [...(parent.tags || [])]
      };
      const newEdge: GraphEdgeData = {
        id: crypto.randomUUID(),
        fromId: parent.id,
        toId: childNode.id,
        label: appState.appLanguage === 'fa' ? 'زیرمجموعه' : 'Child',
        color: '#64748b',
        size: 0.1,
        summary: '',
        fullContent: '',
        files: [],
        direction: 'source-to-target'
      };
      setNodes((prev) => [...prev, childNode]);
      setEdges((prev) => [...prev, newEdge]);
      setAppState((prev) => ({ ...prev, selectedIds: [childNode.id], activeType: 'node', mode: 'select' }));
    },
    [nodes, saveHistory, snapToGrid, appState.appLanguage]
  );

  const handleBatchAddTag = useCallback(
    (rawTag: string) => {
      const cleaned = rawTag.trim();
      if (!cleaned || appState.activeType !== 'node' || appState.selectedIds.length === 0) return;
      saveHistory();
      const selSet = new Set(appState.selectedIds);
      setNodes((prev) =>
        prev.map((n) => {
          if (!selSet.has(n.id)) return n;
          const existing = n.tags || [];
          return existing.includes(cleaned) ? n : { ...n, tags: [...existing, cleaned] };
        })
      );
    },
    [appState.activeType, appState.selectedIds, saveHistory]
  );

  const handleDuplicateSelected = useCallback(() => {
    if (appState.activeType !== 'node' || appState.selectedIds.length === 0) return;
    const selectedNodes = nodes.filter((n) => appState.selectedIds.includes(n.id));
    if (selectedNodes.length === 0) return;
    saveHistory();
    const copies: GraphNodeData[] = selectedNodes.map((n) => ({
      ...JSON.parse(JSON.stringify(n)),
      id: crypto.randomUUID(),
      label: `${n.label} (Copy)`,
      position: [n.position[0] + 1.8, n.position[1], n.position[2] + 1.8] as [number, number, number]
    }));
    setNodes((prev) => [...prev, ...copies]);
    setAppState((prev) => ({
      ...prev,
      selectedIds: copies.map((c) => c.id),
      activeType: 'node',
      mode: 'select'
    }));
  }, [appState.activeType, appState.selectedIds, nodes, saveHistory]);

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

  const handleFitView = useCallback(() => {
    if (nodes.length === 0) {
      setFocusRequest({ id: Date.now(), position: [0, 10, 20], lookAt: [0, 0, 0] });
      return;
    }
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    nodes.forEach((n) => {
      const [x, y, z] = n.position;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    });
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 6);
    const dist = Math.max(12, span * 1.45);
    setFocusRequest({
      id: Date.now(),
      position: [cx, cy + dist * 0.45, cz + dist * 0.9],
      lookAt: [cx, cy, cz]
    });
  }, [nodes]);

  const handleQuickConnect = useCallback(
    (fromId: string, toId: string) => {
      if (!fromId || !toId || fromId === toId) return;
      saveHistory();
      const newEdge: GraphEdgeData = {
        id: crypto.randomUUID(),
        fromId,
        toId,
        label: appState.appLanguage === 'fa' ? 'ارتباط' : 'Connection',
        color: '#64748b',
        size: 0.1,
        summary: '',
        fullContent: '',
        files: [],
        direction: 'source-to-target'
      };
      setEdges((prev) => [...prev, newEdge]);
      showToast(appState.appLanguage === 'fa' ? 'اتصال بین نودها ایجاد شد.' : 'Connection created.', 'success');
    },
    [saveHistory, appState.appLanguage, showToast]
  );

  const handleFlipEdgeDirection = useCallback(
    (edgeId: string) => {
      saveHistory();
      setEdges((prev) =>
        prev.map((edge) => {
          if (edge.id !== edgeId) return edge;
          if (edge.direction === 'source-to-target') {
            return { ...edge, direction: 'target-to-source' };
          }
          if (edge.direction === 'target-to-source') {
            return { ...edge, direction: 'source-to-target' };
          }
          return { ...edge, fromId: edge.toId, toId: edge.fromId };
        })
      );
    },
    [saveHistory]
  );

  const handleDeleteSpecificItem = useCallback(
    (id: string, type: 'node' | 'edge') => {
      saveHistory();
      if (type === 'node') {
        setNodes((prev) => prev.filter((n) => n.id !== id));
        setEdges((prev) => prev.filter((e) => e.fromId !== id && e.toId !== id));
      } else {
        setEdges((prev) => prev.filter((e) => e.id !== id));
      }
      setAppState((prev) => {
        const nextIds = prev.selectedIds.filter((sid) => sid !== id);
        return {
          ...prev,
          selectedIds: nextIds,
          activeType: nextIds.length > 0 ? prev.activeType : null
        };
      });
    },
    [saveHistory]
  );

  const handleDuplicateSpecificNode = useCallback(
    (nodeId: string) => {
      const target = nodes.find((n) => n.id === nodeId);
      if (!target) return;
      saveHistory();
      const copy: GraphNodeData = {
        ...JSON.parse(JSON.stringify(target)),
        id: crypto.randomUUID(),
        label: `${target.label} (Copy)`,
        position: [target.position[0] + 1.8, target.position[1], target.position[2] + 1.8]
      };
      setNodes((prev) => [...prev, copy]);
      setAppState((prev) => ({ ...prev, selectedIds: [copy.id], activeType: 'node', mode: 'select' }));
    },
    [nodes, saveHistory]
  );

  const handleToggleLockNode = useCallback(
    (nodeId: string) => {
      saveHistory();
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, locked: !n.locked } : n)));
    },
    [saveHistory]
  );

  const handleAlignSelected = useCallback(
    (mode: AlignMode) => {
      if (appState.activeType !== 'node' || appState.selectedIds.length < 2) return;
      saveHistory();
      setNodes((prev) => alignSelectedNodes(prev, appState.selectedIds, mode));
    },
    [appState.activeType, appState.selectedIds, saveHistory]
  );

  const handleCopyStyle = useCallback(
    (id: string, type: 'node' | 'edge') => {
      if (type === 'node') {
        const target = nodes.find((n) => n.id === id);
        if (!target) return;
        setCopiedStyle({ type: 'node', color: target.color, size: target.size, shape: target.shape || 'sphere' });
      } else {
        const target = edges.find((e) => e.id === id);
        if (!target) return;
        setCopiedStyle({ type: 'edge', color: target.color, size: target.size, direction: target.direction || 'bidirectional' });
      }
      showToast(translations[appState.appLanguage].styleCopied, 'info');
    },
    [nodes, edges, appState.appLanguage, showToast]
  );

  const handlePasteStyle = useCallback(
    (id: string, type: 'node' | 'edge') => {
      if (!copiedStyle || copiedStyle.type !== type) return;
      saveHistory();
      const targetIds = appState.selectedIds.includes(id) ? appState.selectedIds : [id];
      if (type === 'node' && copiedStyle.type === 'node') {
        setNodes((prev) =>
          prev.map((n) =>
            targetIds.includes(n.id)
              ? { ...n, color: copiedStyle.color, size: copiedStyle.size, shape: copiedStyle.shape || n.shape }
              : n
          )
        );
      } else if (type === 'edge' && copiedStyle.type === 'edge') {
        setEdges((prev) =>
          prev.map((e) =>
            targetIds.includes(e.id)
              ? { ...e, color: copiedStyle.color, size: copiedStyle.size, direction: copiedStyle.direction || e.direction }
              : e
          )
        );
      }
      showToast(translations[appState.appLanguage].stylePasted, 'success');
    },
    [copiedStyle, saveHistory, appState.selectedIds, appState.appLanguage, showToast]
  );

  const handleImportParsedGraph = useCallback(
    (importedNodes: GraphNodeData[], importedEdges: GraphEdgeData[], replace: boolean) => {
      if (importedNodes.length === 0) return;
      saveHistory();
      if (replace) {
        setNodes(importedNodes);
        setEdges(importedEdges);
        setAppState((prev) => ({
          ...prev,
          selectedIds: importedNodes[0] ? [importedNodes[0].id] : [],
          activeType: importedNodes[0] ? 'node' : null,
          mode: 'select'
        }));
      } else {
        // Offset merged cluster slightly so it doesn't overlap existing origin nodes
        const offsetX = nodes.length > 0 ? 7 : 0;
        const shiftedNodes = importedNodes.map((n) => ({
          ...n,
          position: [n.position[0] + offsetX, n.position[1], n.position[2]] as [number, number, number]
        }));
        setNodes((prev) => [...prev, ...shiftedNodes]);
        setEdges((prev) => [...prev, ...importedEdges]);
        setAppState((prev) => ({
          ...prev,
          selectedIds: shiftedNodes.map((n) => n.id),
          activeType: 'node',
          mode: 'select'
        }));
      }
      setFocusRequest({ id: Date.now(), position: [0, 14, 24], lookAt: [0, 0, 0] });
      showToast(translations[appState.appLanguage].importSuccess, 'success');
    },
    [nodes.length, saveHistory, appState.appLanguage, showToast]
  );

  const handleSaveBookmark = useCallback(
    (name: string) => {
      const bm: CameraBookmark = {
        id: crypto.randomUUID(),
        name,
        position: [
          Math.round(cameraPosDisplay.x * 100) / 100,
          Math.round(cameraPosDisplay.y * 100) / 100,
          Math.round(cameraPosDisplay.z * 100) / 100
        ],
        lookAt: [...cameraLookAtRef.current]
      };
      setCameraBookmarks((prev) => [...prev, bm]);
    },
    [cameraPosDisplay]
  );

  const handleLoadBookmark = useCallback((bm: CameraBookmark) => {
    setFocusRequest({ id: Date.now(), position: [...bm.position], lookAt: [...bm.lookAt] });
  }, []);

  const handleDeleteBookmark = useCallback((id: string) => {
    setCameraBookmarks((prev) => prev.filter((bm) => bm.id !== id));
  }, []);

  // Marquee Box Selection & Right-Click pointer tracking
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 2) {
      rightDownPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
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

  const handleOpenDetailsById = useCallback(
    (id: string) => {
      const target = nodes.find((n) => n.id === id) || edges.find((edge) => edge.id === id);
      if (!target) return;
      const t = translations[appState.appLanguage];
      let modeTitle = t.presentationTitle;
      if (appState.aiMode !== 'presentation') {
        modeTitle = t.modes[appState.aiMode];
      }
      openPresentation(target.fullContent || '', target, modeTitle, false);
    },
    [nodes, edges, appState.appLanguage, appState.aiMode]
  );

  const handleDoubleClick = useCallback(
    async (e: any, id: string) => {
      e.stopPropagation();
      lastItemDoubleClickRef.current = performance.now();
      handleOpenDetailsById(id);
    },
    [handleOpenDetailsById]
  );

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (appState.mode !== 'select' || presentationMode.isOpen) return;
      if (performance.now() - lastItemDoubleClickRef.current < 180) return;
      const point = groundProjectorRef.current?.(e.clientX, e.clientY);
      if (point) {
        handleAddNodeAt(point);
      }
    },
    [appState.mode, presentationMode.isOpen, handleAddNodeAt]
  );

  const wasRightClickStationary = (clientX: number, clientY: number) => {
    const down = rightDownPosRef.current;
    if (!down) return true;
    const dx = clientX - down.x;
    const dy = clientY - down.y;
    return dx * dx + dy * dy <= 25;
  };

  const handleItemContextMenu = useCallback(
    (e: any, id: string, type: 'node' | 'edge') => {
      lastItemContextMenuRef.current = performance.now();
      e.nativeEvent?.preventDefault?.();
      const clientX = e.nativeEvent?.clientX ?? e.clientX ?? 0;
      const clientY = e.nativeEvent?.clientY ?? e.clientY ?? 0;
      if (!wasRightClickStationary(clientX, clientY)) return;
      setAppState((prev) => ({ ...prev, selectedIds: [id], activeType: type, mode: 'select', edgeStartNodeId: null }));
      setContextMenu({ x: clientX, y: clientY, type, itemId: id });
    },
    []
  );

  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (presentationMode.isOpen) return;
      if (performance.now() - lastItemContextMenuRef.current < 180) return;
      if (!wasRightClickStationary(e.clientX, e.clientY)) return;
      const worldPos = groundProjectorRef.current?.(e.clientX, e.clientY) ?? undefined;
      setContextMenu({ x: e.clientX, y: e.clientY, type: 'canvas', worldPos });
    },
    [presentationMode.isOpen]
  );

  // Global Keyboard Shortcuts: Undo/Redo, Delete, Escape, Duplicate, Enter (Open), F (Fit View)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      ) {
        return;
      }
      if (presentationMode.isOpen) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        if (appState.activeType === 'node' && appState.selectedIds.length > 0) {
          e.preventDefault();
          saveHistory();
          const selectedNodes = nodes.filter((n) => appState.selectedIds.includes(n.id));
          if (selectedNodes.length > 0) {
            const copies: GraphNodeData[] = selectedNodes.map((n) => ({
              ...JSON.parse(JSON.stringify(n)),
              id: crypto.randomUUID(),
              label: `${n.label} (Copy)`,
              position: [n.position[0] + 1.8, n.position[1], n.position[2] + 1.8] as [number, number, number]
            }));
            setNodes((prev) => [...prev, ...copies]);
            setAppState((prev) => ({
              ...prev,
              selectedIds: copies.map((c) => c.id),
              activeType: 'node',
              mode: 'select'
            }));
          }
        }
      } else if (e.key === 'Enter' && appState.selectedIds.length === 1 && !contextMenu) {
        e.preventDefault();
        handleOpenDetailsById(appState.selectedIds[0]);
      } else if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleFitView();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (appState.selectedIds.length > 0) {
          e.preventDefault();
          saveHistory();
          const { selectedIds, activeType } = appState;
          if (activeType === 'node') {
            setNodes((prev) => prev.filter((n) => !selectedIds.includes(n.id)));
            setEdges((prev) => prev.filter((ed) => !selectedIds.includes(ed.fromId) && !selectedIds.includes(ed.toId)));
          } else {
            setEdges((prev) => prev.filter((ed) => !selectedIds.includes(ed.id)));
          }
          setAppState((prev) => ({ ...prev, selectedIds: [], activeType: null }));
        }
      } else if (e.key === 'Escape') {
        if (contextMenu) {
          setContextMenu(null);
          return;
        }
        if (appState.mode !== 'select') {
          setAppState((prev) => ({ ...prev, mode: 'select', edgeStartNodeId: null }));
          return;
        }
        if (appState.selectedIds.length > 0) {
          setAppState((prev) => ({ ...prev, selectedIds: [], activeType: null }));
          return;
        }
        if (isZenMode) {
          setIsZenMode(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo,
    redo,
    presentationMode.isOpen,
    appState.selectedIds,
    appState.activeType,
    appState.mode,
    nodes,
    saveHistory,
    handleOpenDetailsById,
    handleFitView,
    contextMenu,
    isZenMode
  ]);

  // Clipboard Image Paste (Ctrl+V onto 3D Canvas)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (presentationMode.isOpen) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      ) {
        return;
      }
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find((item) => item.type.startsWith('image/'));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;

      e.preventDefault();
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        if (!dataUrl) return;
        saveHistory();
        const look = cameraLookAtRef.current;
        const pos: [number, number, number] = [
          Math.round((look[0] + (Math.random() * 2 - 1)) * 100) / 100,
          0,
          Math.round((look[2] + (Math.random() * 2 - 1)) * 100) / 100
        ];
        const ext = (file.type.split('/')[1] || 'png').replace(/[^a-z0-9]/gi, '');
        const fileName = file.name && file.name !== 'image.png' ? file.name : `pasted-image-${Date.now()}.${ext}`;
        const attached: AttachedFile = {
          id: crypto.randomUUID(),
          name: fileName,
          type: file.type || 'image/png',
          content: dataUrl
        };
        const newNode: GraphNodeData = {
          id: crypto.randomUUID(),
          label: appState.appLanguage === 'fa' ? `تصویر ${nodes.length + 1}` : `Image ${nodes.length + 1}`,
          summary: fileName,
          fullContent: `<div class="p-4"><img src="${dataUrl}" alt="${fileName}" class="max-w-full rounded-lg shadow" /></div>`,
          color: '#ec4899',
          size: 1,
          position: pos,
          files: [attached],
          tags: ['media']
        };
        setNodes((prev) => [...prev, newNode]);
        setAppState((prev) => ({ ...prev, selectedIds: [newNode.id], activeType: 'node', mode: 'select' }));
        showToast(translations[appState.appLanguage].clipboardImageAdded, 'success');
      };
      reader.readAsDataURL(file);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [presentationMode.isOpen, saveHistory, appState.appLanguage, nodes.length, showToast]);

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
        if (!draggedNode || draggedNode.locked) return prev;
        const dx = newPos[0] - draggedNode.position[0];
        const dy = newPos[1] - draggedNode.position[1];
        const dz = newPos[2] - draggedNode.position[2];

        if (appState.selectedIds.includes(id)) {
          return prev.map((n) => {
            if (appState.selectedIds.includes(n.id) && !n.locked) {
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
    const activeName = projects.find((p) => p.id === activeProjectId)?.name || 'graph-project';
    const safeName = activeName.replace(/[^\w\u0600-\u06FF-]+/g, '_');
    const blob = new Blob([JSON.stringify({ nodes, edges, architectDefs }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = JSON.parse(e.target?.result as string);
        if (!Array.isArray(result.nodes)) {
          throw new Error('Missing nodes array');
        }
        saveHistory();
        const normalizedNodes: GraphNodeData[] = result.nodes.map((n: any, idx: number) => ({
          id: n.id || crypto.randomUUID(),
          label: typeof n.label === 'string' ? n.label : `Node ${idx + 1}`,
          summary: typeof n.summary === 'string' ? n.summary : '',
          fullContent: typeof n.fullContent === 'string' ? n.fullContent : '',
          color: typeof n.color === 'string' ? n.color : '#2196F3',
          size: typeof n.size === 'number' && !Number.isNaN(n.size) ? n.size : 1,
          position: Array.isArray(n.position) && n.position.length === 3 ? n.position : [idx * 2, 0, 0],
          files: Array.isArray(n.files) ? n.files : [],
          shape: n.shape || 'sphere',
          tags: Array.isArray(n.tags) ? n.tags.filter((tag: unknown) => typeof tag === 'string') : [],
          locked: Boolean(n.locked)
        }));
        const validIds = new Set(normalizedNodes.map((n) => n.id));
        const normalizedEdges: GraphEdgeData[] = (Array.isArray(result.edges) ? result.edges : [])
          .filter((ed: any) => validIds.has(ed.fromId) && validIds.has(ed.toId))
          .map((ed: any) => ({
            id: ed.id || crypto.randomUUID(),
            fromId: ed.fromId,
            toId: ed.toId,
            label: typeof ed.label === 'string' ? ed.label : '',
            color: typeof ed.color === 'string' ? ed.color : '#666666',
            size: typeof ed.size === 'number' ? ed.size : 0.1,
            summary: typeof ed.summary === 'string' ? ed.summary : '',
            fullContent: typeof ed.fullContent === 'string' ? ed.fullContent : '',
            files: Array.isArray(ed.files) ? ed.files : [],
            direction: ed.direction || 'bidirectional'
          }));

        setNodes(normalizedNodes);
        setEdges(normalizedEdges);
        if (result.architectDefs) setArchitectDefs(result.architectDefs);
        setAppState((prev) => ({ ...prev, selectedIds: [], activeType: null, mode: 'select' }));
        showToast(appState.appLanguage === 'fa' ? 'پروژه با موفقیت بارگذاری شد.' : 'Project loaded successfully.', 'success');
      } catch {
        showToast(appState.appLanguage === 'fa' ? 'فایل JSON نامعتبر است.' : 'Invalid JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleCaptureScreenshot = useCallback(() => {
    const capture = snapshotCaptureRef.current;
    if (!capture) return;
    try {
      const dataUrl = capture();
      if (!dataUrl) return;
      const activeName = projects.find((p) => p.id === activeProjectId)?.name || 'graph';
      const safeName = activeName.replace(/[^\w\u0600-\u06FF-]+/g, '_');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${safeName}-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      showToast(translations[appState.appLanguage].snapshotSaved, 'success');
    } catch {
      showToast(appState.appLanguage === 'fa' ? 'خطا در ذخیره تصویر سه‌بعدی' : 'Failed to capture 3D snapshot', 'error');
    }
  }, [projects, activeProjectId, appState.appLanguage, showToast]);

  const handleBackupAll = useCallback(() => {
    const updatedProjects = projects.map((p) =>
      p.id === activeProjectId ? { ...p, nodes, edges, architectDefs, cameraBookmarks, updatedAt: Date.now() } : p
    );
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      activeProjectId,
      projects: updatedProjects
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph-pro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [projects, activeProjectId, nodes, edges, architectDefs, cameraBookmarks]);

  const handleRestoreAll = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (!parsed || !Array.isArray(parsed.projects) || parsed.projects.length === 0) {
            throw new Error('Invalid backup');
          }
          const restored: ProjectWorkspace[] = parsed.projects.map((p: any, idx: number) => ({
            id: typeof p.id === 'string' && p.id ? p.id : crypto.randomUUID(),
            name: typeof p.name === 'string' && p.name.trim() ? p.name : `Project ${idx + 1}`,
            updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
            nodes: Array.isArray(p.nodes) ? p.nodes : [],
            edges: Array.isArray(p.edges) ? p.edges : [],
            architectDefs: p.architectDefs || { nodeDefinition: '', edgeDefinition: '', projectGoals: '' },
            cameraBookmarks: Array.isArray(p.cameraBookmarks) ? p.cameraBookmarks : []
          }));
          const nextActive = restored.find((p) => p.id === parsed.activeProjectId) || restored[0];
          saveWorkspaceState(nextActive.id, restored).then((res) => {
            if (!res.ok) {
              showToast(translations[appState.appLanguage].storageFull, 'error');
            }
          });
          setProjects(restored);
          setActiveProjectId(nextActive.id);
          setNodes(nextActive.nodes || []);
          setEdges(nextActive.edges || []);
          setArchitectDefs(nextActive.architectDefs || { nodeDefinition: '', edgeDefinition: '', projectGoals: '' });
          setCameraBookmarks(nextActive.cameraBookmarks || []);
          setHistory([]);
          setFuture([]);
          setActivePathHighlight(null);
          setActiveFilter({ color: null, tag: null });
          setAppState((prev) => ({ ...prev, selectedIds: [], activeType: null, mode: 'select', edgeStartNodeId: null }));
          setFocusRequest({ id: Date.now(), position: [0, 10, 20], lookAt: [0, 0, 0] });
          showToast(translations[appState.appLanguage].backupRestored, 'success');
        } catch {
          showToast(translations[appState.appLanguage].backupInvalid, 'error');
        }
      };
      reader.readAsText(file);
    },
    [appState.appLanguage, showToast]
  );

  const handleCreateNodeFromChat = useCallback(
    (title: string, content: string, parentItemId?: string | null) => {
      saveHistory();
      const parentNode = parentItemId ? nodes.find((n) => n.id === parentItemId) : undefined;
      const angle = Math.random() * Math.PI * 2;
      const dist = 3.5 + Math.random() * 1.5;
      const position: [number, number, number] = parentNode
        ? [parentNode.position[0] + Math.cos(angle) * dist, parentNode.position[1], parentNode.position[2] + Math.sin(angle) * dist]
        : [Math.random() * 6 - 3, 0, Math.random() * 6 - 3];

      const cleanSummary = content.replace(/<[^>]+>/g, '').slice(0, 140);
      const newNode: GraphNodeData = {
        id: crypto.randomUUID(),
        label: title || `Note ${nodes.length + 1}`,
        summary: cleanSummary,
        fullContent: `<div class="p-4 leading-relaxed">${content.replace(/\n/g, '<br/>')}</div>`,
        color: '#8b5cf6',
        size: 1,
        position,
        files: []
      };

      setNodes((prev) => [...prev, newNode]);
      if (parentNode) {
        const newEdge: GraphEdgeData = {
          id: crypto.randomUUID(),
          fromId: parentNode.id,
          toId: newNode.id,
          label: appState.appLanguage === 'fa' ? 'یادداشت مرتبط' : 'Related Note',
          color: '#8b5cf6',
          size: 0.1,
          summary: '',
          fullContent: '',
          files: [],
          direction: 'source-to-target'
        };
        setEdges((prev) => [...prev, newEdge]);
      }
      showToast(translations[appState.appLanguage].createdFromChat, 'success');
    },
    [nodes, saveHistory, appState.appLanguage, showToast]
  );

  const handleScaleByDegree = useCallback(() => {
    if (nodes.length === 0) return;
    saveHistory();
    const sizeMap = computeDegreeScaledSizes(nodes, edges);
    setNodes((prev) => prev.map((n) => ({ ...n, size: sizeMap.get(n.id) ?? n.size })));
    showToast(translations[appState.appLanguage].scaledSuccess, 'success');
  }, [nodes, edges, saveHistory, appState.appLanguage, showToast]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (!isDragOverCanvas) setIsDragOverCanvas(true);
    }
  }, [isDragOverCanvas]);

  const handleCanvasDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsDragOverCanvas(false);
    }
  }, []);

  const handleCanvasDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOverCanvas(false);
      const droppedFiles = Array.from(e.dataTransfer?.files || []);
      if (droppedFiles.length === 0) return;

      const basePoint = groundProjectorRef.current?.(e.clientX, e.clientY) || [0, 0, 0];
      const readDataUrl = (file: File) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      const readText = (file: File) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => resolve('');
          reader.readAsText(file);
        });

      saveHistory();
      const createdNodes: GraphNodeData[] = [];
      for (let i = 0; i < droppedFiles.length; i++) {
        const file = droppedFiles[i];
        const dataUrl = await readDataUrl(file);
        const isImage = file.type.startsWith('image/');
        let summaryText = file.type || 'File';
        let htmlBody = '';
        if (isImage && dataUrl) {
          htmlBody = `<div class="p-4"><img src="${dataUrl}" alt="${file.name.replace(/"/g, '')}" class="max-w-full rounded-lg shadow" /></div>`;
        } else if (!isImage && file.size < 400_000) {
          const rawText = await readText(file);
          const escaped = rawText
            .slice(0, 6000)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          summaryText = rawText.replace(/\s+/g, ' ').trim().slice(0, 140) || summaryText;
          htmlBody = `<pre class="p-4 bg-slate-50 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">${escaped}</pre>`;
        }

        const angle = (i / Math.max(1, droppedFiles.length)) * Math.PI * 2;
        const spread = droppedFiles.length > 1 ? 2.6 : 0;
        const pos: [number, number, number] = [
          Math.round((basePoint[0] + Math.cos(angle) * spread) * 100) / 100,
          0,
          Math.round((basePoint[2] + Math.sin(angle) * spread) * 100) / 100
        ];

        const attached: AttachedFile = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type || 'application/octet-stream',
          content: dataUrl
        };

        createdNodes.push({
          id: crypto.randomUUID(),
          label: file.name.replace(/\.[^/.]+$/, '') || file.name,
          summary: summaryText,
          fullContent: htmlBody,
          color: isImage ? '#ec4899' : '#0ea5e9',
          size: 1,
          position: pos,
          files: dataUrl ? [attached] : [],
          tags: [isImage ? 'media' : 'file']
        });
      }

      if (createdNodes.length > 0) {
        setNodes((prev) => [...prev, ...createdNodes]);
        setAppState((prev) => ({
          ...prev,
          selectedIds: createdNodes.map((n) => n.id),
          activeType: 'node',
          mode: 'select'
        }));
        showToast(`${createdNodes.length} ${translations[appState.appLanguage].filesImportedCount}`, 'success');
      }
    },
    [saveHistory, appState.appLanguage, showToast]
  );

  // 3D Walkthrough Tour helpers
  const orderedTourNodes = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return tourState.orderedIds.map((id) => nodeMap.get(id)).filter((n): n is GraphNodeData => Boolean(n));
  }, [tourState.orderedIds, nodes]);

  const handleStartTour = useCallback(() => {
    if (nodes.length === 0) return;
    const adj = new Map<string, string[]>();
    nodes.forEach((n) => adj.set(n.id, []));
    edges.forEach((e) => {
      if (adj.has(e.fromId) && adj.has(e.toId)) {
        adj.get(e.fromId)!.push(e.toId);
        adj.get(e.toId)!.push(e.fromId);
      }
    });

    const startId = (appState.activeType === 'node' && appState.selectedIds[0]) || nodes[0].id;
    const visited = new Set<string>();
    const orderedIds: string[] = [];

    const bfsFrom = (seedId: string) => {
      const queue = [seedId];
      visited.add(seedId);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        orderedIds.push(curr);
        (adj.get(curr) || []).forEach((nextId) => {
          if (!visited.has(nextId)) {
            visited.add(nextId);
            queue.push(nextId);
          }
        });
      }
    };

    if (adj.has(startId)) bfsFrom(startId);
    nodes.forEach((n) => {
      if (!visited.has(n.id)) bfsFrom(n.id);
    });

    setTourState({ isOpen: true, isPlaying: false, currentIndex: 0, orderedIds });
    if (orderedIds[0]) handleFocusItem(orderedIds[0], 'node');
  }, [nodes, edges, appState.activeType, appState.selectedIds, handleFocusItem]);

  useEffect(() => {
    if (!tourState.isOpen || !tourState.isPlaying || orderedTourNodes.length <= 1) return;
    const timer = window.setInterval(() => {
      setTourState((prev) => {
        const nextIdx = (prev.currentIndex + 1) % orderedTourNodes.length;
        const nextNode = orderedTourNodes[nextIdx];
        if (nextNode) {
          handleFocusItem(nextNode.id, 'node');
        }
        return { ...prev, currentIndex: nextIdx };
      });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [tourState.isOpen, tourState.isPlaying, orderedTourNodes, handleFocusItem]);

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

  const edgeParallelMap = useMemo(() => {
    const groups = new Map<string, GraphEdgeData[]>();
    edges.forEach((edge) => {
      const key = [edge.fromId, edge.toId].sort().join('::');
      const list = groups.get(key) || [];
      list.push(edge);
      groups.set(key, list);
    });
    const meta = new Map<string, { index: number; total: number }>();
    groups.forEach((list) => {
      list.forEach((edge, index) => {
        meta.set(edge.id, { index, total: list.length });
      });
    });
    return meta;
  }, [edges]);

  const activeHighlight = useMemo(() => {
    if (activePathHighlight) {
      return activePathHighlight;
    }

    let filterNodes: Set<string> | null = null;
    if (activeFilter.color || activeFilter.tag) {
      filterNodes = new Set<string>();
      nodes.forEach((n) => {
        const colorMatch = !activeFilter.color || n.color === activeFilter.color;
        const tagMatch = !activeFilter.tag || (n.tags || []).includes(activeFilter.tag);
        if (colorMatch && tagMatch) {
          filterNodes!.add(n.id);
        }
      });
    }

    let neighborHighlight: { nodes: Set<string>; edges: Set<string> } | null = null;
    if (focusNeighbors && appState.selectedIds.length > 0) {
      const selectedSet = new Set(appState.selectedIds);
      const highlightedNodes = new Set<string>();
      const highlightedEdges = new Set<string>();

      if (appState.activeType === 'node') {
        appState.selectedIds.forEach((id) => highlightedNodes.add(id));
        edges.forEach((edge) => {
          if (selectedSet.has(edge.fromId) || selectedSet.has(edge.toId)) {
            highlightedEdges.add(edge.id);
            highlightedNodes.add(edge.fromId);
            highlightedNodes.add(edge.toId);
          }
        });
      } else if (appState.activeType === 'edge') {
        edges.forEach((edge) => {
          if (selectedSet.has(edge.id)) {
            highlightedEdges.add(edge.id);
            highlightedNodes.add(edge.fromId);
            highlightedNodes.add(edge.toId);
          }
        });
      }
      neighborHighlight = { nodes: highlightedNodes, edges: highlightedEdges };
    }

    if (filterNodes && neighborHighlight) {
      const combinedNodes = new Set<string>();
      filterNodes.forEach((id) => {
        if (neighborHighlight!.nodes.has(id)) combinedNodes.add(id);
      });
      const combinedEdges = new Set<string>();
      neighborHighlight.edges.forEach((eid) => {
        const ed = edges.find((e) => e.id === eid);
        if (ed && combinedNodes.has(ed.fromId) && combinedNodes.has(ed.toId)) {
          combinedEdges.add(eid);
        }
      });
      return { nodes: combinedNodes, edges: combinedEdges };
    }

    if (neighborHighlight) return neighborHighlight;

    if (filterNodes) {
      const visibleEdges = new Set<string>();
      edges.forEach((e) => {
        if (filterNodes!.has(e.fromId) && filterNodes!.has(e.toId)) {
          visibleEdges.add(e.id);
        }
      });
      return { nodes: filterNodes, edges: visibleEdges };
    }

    return null;
  }, [activePathHighlight, activeFilter, focusNeighbors, appState.selectedIds, appState.activeType, nodes, edges]);

  const dimmedNodeIds = useMemo(() => {
    if (!activeHighlight) return null;
    const set = new Set<string>();
    nodes.forEach((n) => {
      if (!activeHighlight.nodes.has(n.id)) set.add(n.id);
    });
    return set;
  }, [activeHighlight, nodes]);

  return (
    <div className={`w-full h-screen relative overflow-hidden flex flex-col font-sans ${sceneTheme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'}`}>
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
        focusNeighbors={focusNeighbors}
        setFocusNeighbors={setFocusNeighbors}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        hasActivePathHighlight={Boolean(activePathHighlight)}
        onHighlightPath={(nodeIds, edgeIds) => {
          setActivePathHighlight({ nodes: new Set(nodeIds), edges: new Set(edgeIds) });
          if (nodeIds[0]) handleFocusItem(nodeIds[0], 'node');
        }}
        onClearPath={() => setActivePathHighlight(null)}
        onScaleByDegree={handleScaleByDegree}
        onStartTour={handleStartTour}
        onAddChildNode={handleAddChildNode}
        onBatchAddTag={handleBatchAddTag}
        onCaptureScreenshot={handleCaptureScreenshot}
        onAutoLayout={handleAutoLayout}
        onFocusItem={handleFocusItem}
        onFitView={handleFitView}
        onDuplicateSelected={handleDuplicateSelected}
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
        onCreateNodeFromChat={handleCreateNodeFromChat}
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
        onBackupAll={handleBackupAll}
        onRestoreAll={handleRestoreAll}
        sceneTheme={sceneTheme}
        onToggleTheme={() => setSceneTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        isZenMode={isZenMode}
        onToggleZenMode={() => setIsZenMode((prev) => !prev)}
        onQuickConnect={handleQuickConnect}
        cameraBookmarks={cameraBookmarks}
        onSaveBookmark={handleSaveBookmark}
        onLoadBookmark={handleLoadBookmark}
        onDeleteBookmark={handleDeleteBookmark}
        onAlignSelected={handleAlignSelected}
        onImportParsedGraph={handleImportParsedGraph}
        showTagZones={showTagZones}
        setShowTagZones={setShowTagZones}
        canPasteStyle={Boolean(copiedStyle && appState.activeType === copiedStyle.type)}
        onCopyStyle={handleCopyStyle}
        onPasteStyle={handlePasteStyle}
      />

      <CanvasContextMenu
        menu={contextMenu}
        lang={appState.appLanguage}
        sceneTheme={sceneTheme}
        isZenMode={isZenMode}
        onClose={() => setContextMenu(null)}
        onOpenDetails={handleOpenDetailsById}
        onFocusItem={handleFocusItem}
        onAddChildNode={handleAddChildNode}
        onStartConnectFromNode={(nodeId) =>
          setAppState((prev) => ({
            ...prev,
            mode: 'edge-finish',
            edgeStartNodeId: nodeId,
            selectedIds: [nodeId],
            activeType: 'node'
          }))
        }
        onDuplicateNode={handleDuplicateSpecificNode}
        onFlipEdgeDirection={handleFlipEdgeDirection}
        onDeleteItem={handleDeleteSpecificItem}
        onAddNodeAt={handleAddNodeAt}
        onFitView={handleFitView}
        onToggleTheme={() => setSceneTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onToggleZenMode={() => setIsZenMode((prev) => !prev)}
        isTargetLocked={Boolean(
          contextMenu?.type === 'node' &&
            contextMenu.itemId &&
            nodes.find((n) => n.id === contextMenu.itemId)?.locked
        )}
        onToggleLockNode={handleToggleLockNode}
        canPasteStyle={Boolean(copiedStyle && contextMenu && copiedStyle.type === contextMenu.type)}
        onCopyStyle={handleCopyStyle}
        onPasteStyle={handlePasteStyle}
      />

      {tourState.isOpen && !presentationMode.isOpen && (
        <WalkthroughBar
          isOpen={tourState.isOpen}
          orderedNodes={orderedTourNodes}
          currentIndex={tourState.currentIndex}
          isPlaying={tourState.isPlaying}
          lang={appState.appLanguage}
          onTogglePlay={() => setTourState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }))}
          onPrev={() => {
            if (orderedTourNodes.length === 0) return;
            const prevIdx = (tourState.currentIndex - 1 + orderedTourNodes.length) % orderedTourNodes.length;
            setTourState((prev) => ({ ...prev, isPlaying: false, currentIndex: prevIdx }));
            if (orderedTourNodes[prevIdx]) handleFocusItem(orderedTourNodes[prevIdx].id, 'node');
          }}
          onNext={() => {
            if (orderedTourNodes.length === 0) return;
            const nextIdx = (tourState.currentIndex + 1) % orderedTourNodes.length;
            setTourState((prev) => ({ ...prev, isPlaying: false, currentIndex: nextIdx }));
            if (orderedTourNodes[nextIdx]) handleFocusItem(orderedTourNodes[nextIdx].id, 'node');
          }}
          onOpenFull={(node) => {
            setTourState((prev) => ({ ...prev, isPlaying: false }));
            const t = translations[appState.appLanguage];
            const modeTitle = appState.aiMode !== 'presentation' ? t.modes[appState.aiMode] : t.presentationTitle;
            openPresentation(node.fullContent || '', node, modeTitle, false);
          }}
          onClose={() => setTourState((prev) => ({ ...prev, isOpen: false, isPlaying: false }))}
        />
      )}

      {!isZenMode && uiPanels.minimap && !presentationMode.isOpen && (
        <GraphMinimap
          nodes={nodes}
          edges={edges}
          selectedIds={appState.selectedIds}
          activeType={appState.activeType}
          cameraPos={cameraPosDisplay}
          dimmedNodeIds={dimmedNodeIds}
          highlightedEdgeIds={activePathHighlight?.edges || null}
          lang={appState.appLanguage}
          onFocusItem={handleFocusItem}
          onCameraTeleport={(x, y, z) =>
            setFocusRequest({ id: Date.now(), position: [x, y, z], lookAt: [x, 0, z - 12] })
          }
        />
      )}

      <div
        ref={canvasContainerRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onDoubleClick={handleCanvasDoubleClick}
        onContextMenu={handleCanvasContextMenu}
        onDragOver={handleCanvasDragOver}
        onDragLeave={handleCanvasDragLeave}
        onDrop={handleCanvasDrop}
        className={`flex-1 min-h-0 w-full relative pt-12 ${appState.mode === 'box-select' ? 'cursor-crosshair' : ''}`}
      >
        {isDragOverCanvas && (
          <div className="absolute inset-0 z-30 pointer-events-none bg-blue-600/15 border-4 border-dashed border-blue-500 flex items-center justify-center">
            <div className="bg-white/95 border border-blue-200 rounded-2xl px-6 py-4 shadow-2xl flex flex-col items-center gap-2 text-center" dir={getDir(appState.appLanguage)}>
              <UploadCloud size={34} className="text-blue-600" />
              <div className="font-bold text-slate-800 text-sm">{translations[appState.appLanguage].dropFilesTitle}</div>
              <div className="text-xs text-slate-500">{translations[appState.appLanguage].dropFilesSub}</div>
            </div>
          </div>
        )}
        <Canvas
          className="w-full h-full block"
          camera={{ position: [0, 10, 20], fov: 60 }}
          onPointerMissed={handleBackgroundClick}
          onCreated={({ gl }) => {
            const canvas = gl.domElement;
            canvas.addEventListener('webglcontextlost', (ev) => {
              ev.preventDefault();
              showToast(appState.appLanguage === 'fa' ? 'ارتباط گرافیکی WebGL قطع شد؛ در حال بازیابی...' : 'WebGL context lost; restoring...', 'info');
            });
            canvas.addEventListener('webglcontextrestored', () => {
              showToast(appState.appLanguage === 'fa' ? 'نمای سه‌بعدی بازیابی شد.' : '3D viewport restored.', 'success');
            });
          }}
        >
          <color attach="background" args={[sceneTheme === 'dark' ? '#0f172a' : '#f0f2f5']} />
          <Suspense fallback={null}>
            <hemisphereLight args={[sceneTheme === 'dark' ? '#93c5fd' : '#e0f2fe', sceneTheme === 'dark' ? '#1e293b' : '#cbd5e1', sceneTheme === 'dark' ? 0.75 : 0.65]} />
            <directionalLight position={[12, 22, 14]} intensity={1.1} color="#fff7ed" />
            <directionalLight position={[-14, 8, -12]} intensity={0.45} color="#dbeafe" />
            <Grid
              infiniteGrid
              fadeDistance={55}
              sectionColor={sceneTheme === 'dark' ? '#334155' : '#cbd5e1'}
              cellColor={sceneTheme === 'dark' ? '#1e293b' : '#e2e8f0'}
            />
            <CameraController focusRequest={focusRequest} onFinishFocus={() => setFocusRequest(null)} />
            <CameraTracker onUpdate={(pos) => setCameraPosDisplay({ x: pos.x, y: pos.y, z: pos.z })} lookAtRef={cameraLookAtRef} />
            <MarqueeProjector nodes={nodes} projectorRef={marqueeProjectorRef} />
            <SnapshotBridge snapshotRef={snapshotCaptureRef} />
            <GroundProjector projectorRef={groundProjectorRef} />
            <KeyboardControls />
            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.1}
              onStart={() => setFocusRequest(null)}
              mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }}
            />
            {showTagZones && <TagZones3D nodes={nodes} darkTheme={sceneTheme === 'dark'} />}
            {nodes.map((node) => (
              <GraphNode
                key={node.id}
                data={node}
                isSelected={appState.selectedIds.includes(node.id)}
                isEdgeStart={appState.mode === 'edge-finish' && appState.edgeStartNodeId === node.id}
                isDimmed={Boolean(activeHighlight && !activeHighlight.nodes.has(node.id))}
                darkTheme={sceneTheme === 'dark'}
                onClick={handleNodeClick}
                onDoubleClick={handleDoubleClick}
                onContextMenu={(ev, id) => handleItemContextMenu(ev, id, 'node')}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                onDrag={handleDragNode}
                onDragStart={saveHistory}
                isDraggingEnabled={appState.mode === 'select' && !node.locked}
              />
            ))}
            {edges.map((edge) => {
              const pMeta = edgeParallelMap.get(edge.id);
              return (
                <GraphEdge
                  key={edge.id}
                  data={edge}
                  fromNode={nodes.find((n) => n.id === edge.fromId)}
                  toNode={nodes.find((n) => n.id === edge.toId)}
                  isSelected={appState.selectedIds.includes(edge.id)}
                  parallelIndex={pMeta?.index ?? 0}
                  parallelTotal={pMeta?.total ?? 1}
                  isDimmed={Boolean(activeHighlight && !activeHighlight.edges.has(edge.id))}
                  darkTheme={sceneTheme === 'dark'}
                  onClick={handleEdgeClick}
                  onDoubleClick={handleDoubleClick}
                  onContextMenu={(ev, id) => handleItemContextMenu(ev, id, 'edge')}
                  onPointerOver={handlePointerOver}
                  onPointerOut={handlePointerOut}
                />
              );
            })}
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