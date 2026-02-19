import React, { useState, useCallback, useEffect, Suspense, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { GraphNode } from './components/GraphNode';
import { GraphEdge } from './components/GraphEdge';
import { UIOverlay } from './components/UIOverlay';
import { GraphNodeData, GraphEdgeData, AppState, CameraState, UIPanelsState, AttachedFile, Language } from './types';
import { generatePresentation, generateCakePresentation, generateSmartGuide, generateModeContent } from './services/ai';
import { getDir, translations } from './utils/translations';

// Keyboard Control Component for Arrow navigation ONLY
const KeyboardControls = () => {
  const { camera, controls } = useThree();
  const [keys, setKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.code]: true }));
    const handleKeyUp = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.code]: false }));

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
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

    // Removed WASD to prevent typing conflict
    if (keys['ArrowUp']) moveVector.add(forward.multiplyScalar(speed));
    if (keys['ArrowDown']) moveVector.add(forward.multiplyScalar(-speed));
    if (keys['ArrowRight']) moveVector.add(right.multiplyScalar(-speed));
    if (keys['ArrowLeft']) moveVector.add(right.multiplyScalar(speed));

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

const CameraReporter: React.FC<{ onUpdate: (pos: THREE.Vector3) => void }> = ({ onUpdate }) => {
  const { camera } = useThree();
  useThree(({ camera }) => {
    onUpdate(camera.position);
  });
  return null;
};

const CameraController: React.FC<{ targetPos: CameraState | null }> = ({ targetPos }) => {
  const { camera, controls } = useThree();
  useEffect(() => {
    if (targetPos) {
      camera.position.set(targetPos.x, targetPos.y, targetPos.z);
      // @ts-ignore
      controls?.target?.set(targetPos.x, 0, targetPos.z - 10);
      // @ts-ignore
      controls?.update();
    }
  }, [targetPos, camera, controls]);
  return null;
};

const App: React.FC = () => {
  const [nodes, setNodes] = useState<GraphNodeData[]>([]);
  const [edges, setEdges] = useState<GraphEdgeData[]>([]);
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

  // History Stacks for Undo/Redo
  const [history, setHistory] = useState<{nodes: GraphNodeData[], edges: GraphEdgeData[]}[]>([]);
  const [future, setFuture] = useState<{nodes: GraphNodeData[], edges: GraphEdgeData[]}[]>([]);
  
  const [cameraPosDisplay, setCameraPosDisplay] = useState({ x: 0, y: 10, z: 20 });
  const [targetCameraPos, setTargetCameraPos] = useState<CameraState | null>(null);
  const [hoverData, setHoverData] = useState<{ label: string; summary: string; full: string } | null>(null);
  
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

  // --- History Management ---
  const saveHistory = useCallback(() => {
    setHistory(prev => {
      // Optimization: Optionally check if the new state is identical to the last to avoid dups
      // But for simplicity and correctness with "pre-action" saving, we just push.
      return [...prev, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }];
    });
    setFuture([]); // Clear redo stack on new action
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    setFuture(prev => [...prev, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setHistory(newHistory);
  }, [history, nodes, edges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[future.length - 1];
    const newFuture = future.slice(0, -1);

    setHistory(prev => [...prev, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
    setNodes(next.nodes);
    setEdges(next.edges);
    setFuture(newFuture);
  }, [future, nodes, edges]);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    const saved = localStorage.getItem('graph_pro_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNodes(parsed.nodes || []);
        setEdges(parsed.edges || []);
      } catch (e) {
        console.error("Failed to load save data", e);
      }
    } else {
      handleAddNode();
    }
  }, []);

  useEffect(() => {
    const data = { nodes, edges };
    localStorage.setItem('graph_pro_data', JSON.stringify(data));
  }, [nodes, edges]);

  useEffect(() => {
    document.documentElement.dir = getDir(appState.appLanguage);
    document.documentElement.lang = appState.appLanguage;
  }, [appState.appLanguage]);

  const handleAddNode = useCallback(() => {
    saveHistory(); // Snapshot
    const newNode: GraphNodeData = {
      id: crypto.randomUUID(),
      label: `Node ${nodes.length + 1}`,
      summary: "Short summary...",
      fullContent: "", // Initialize empty as per requirement
      color: "#2196F3",
      size: 1,
      position: [(Math.random() * 10) - 5, 0, (Math.random() * 10) - 5],
      files: []
    };
    setNodes(prev => [...prev, newNode]);
    setAppState(prev => ({ ...prev, selectedIds: [newNode.id], activeType: 'node', mode: 'select' }));
  }, [nodes, saveHistory]);

  const handleNodeClick = useCallback((e: any, id: string) => {
    e.stopPropagation();
    setAppState(prev => {
      if (prev.mode === 'select') {
        return { ...prev, selectedIds: [id], activeType: 'node' };
      } 
      else if (prev.mode === 'edge-start') {
        return { ...prev, edgeStartNodeId: id, mode: 'edge-finish' };
      } 
      else if (prev.mode === 'edge-finish') {
        if (prev.edgeStartNodeId && prev.edgeStartNodeId !== id) {
           saveHistory(); // Snapshot before creating edge
           const newEdge: GraphEdgeData = {
             id: crypto.randomUUID(),
             fromId: prev.edgeStartNodeId,
             toId: id,
             label: 'Connection',
             color: '#666666',
             size: 0.1,
             summary: "Connection...",
             fullContent: "",
             files: [],
             direction: 'bidirectional'
           };
           setEdges(current => [...current, newEdge]);
           return { ...prev, mode: 'select', selectedIds: [], activeType: null, edgeStartNodeId: null };
        }
        return { ...prev, mode: 'select' };
      }
      return prev;
    });
  }, [saveHistory]);

  const handleEdgeClick = useCallback((e: any, id: string) => {
    e.stopPropagation();
    if (appState.mode === 'select') {
      setAppState(prev => ({ ...prev, selectedIds: [id], activeType: 'edge' }));
    }
  }, [appState.mode]);

  const handleBackgroundClick = useCallback(() => {
    if (appState.mode === 'select') {
      setAppState(prev => ({ ...prev, selectedIds: [], activeType: null }));
    }
  }, [appState.mode]);

  // --- Image Save Handler (for Generated Images) ---
  const handleAddFile = useCallback((file: AttachedFile, itemId: string) => {
    saveHistory();
    // Save generated image to node/edge state
    const targetNode = nodes.find(n => n.id === itemId);
    if (targetNode) {
        setNodes(prev => prev.map(n => n.id === itemId ? { ...n, files: [...n.files, file] } : n));
        return;
    }
    const targetEdge = edges.find(e => e.id === itemId);
    if (targetEdge) {
        setEdges(prev => prev.map(e => e.id === itemId ? { ...e, files: [...e.files, file] } : e));
    }
  }, [nodes, edges, saveHistory]);

  const handleRemoveFile = useCallback((fileId: string, itemId: string) => {
    saveHistory();
    const targetNode = nodes.find(n => n.id === itemId);
    if (targetNode) {
        setNodes(prev => prev.map(n => n.id === itemId ? { ...n, files: n.files.filter(f => f.id !== fileId) } : n));
        return;
    }
    const targetEdge = edges.find(e => e.id === itemId);
    if (targetEdge) {
        setEdges(prev => prev.map(e => e.id === itemId ? { ...e, files: e.files.filter(f => f.id !== fileId) } : e));
    }
  }, [nodes, edges, saveHistory]);

  // --- AI Presentation Handlers ---
  const openPresentation = (content: string, item: GraphNodeData | GraphEdgeData, title: string, isLoading = false) => {
     setPresentationMode({
        isOpen: true,
        content: content,
        isLoading: isLoading,
        activeFiles: item.files || [],
        targetLanguage: appState.appLanguage,
        activeItemId: item.id,
        modeTitle: title
      });
  };

  const handleDoubleClick = useCallback(async (e: any, id: string) => {
    e.stopPropagation();
    const target = nodes.find(n => n.id === id) || edges.find(e => e.id === id);
    if (target) {
      // Determine title based on current mode
      const t = translations[appState.appLanguage];
      let modeTitle = t.presentationTitle;
      if (appState.aiMode !== 'presentation') {
        modeTitle = t.modes[appState.aiMode];
      }

      // NO AUTOMATIC GENERATION here. Just open with existing content.
      openPresentation(target.fullContent || "", target, modeTitle, false);
    }
  }, [nodes, edges, appState.appLanguage, appState.aiMode]);

  const handleCakePresentation = useCallback(async () => {
    const id = appState.selectedIds[0];
    const target = nodes.find(n => n.id === id) || edges.find(e => e.id === id);
    if (target) {
      const t = translations[appState.appLanguage];
      openPresentation(target.fullContent || "", target, t.cakePres, true);
      const htmlContent = await generateCakePresentation(target, appState.appLanguage);
      handleSaveModalContent(htmlContent); // Save result
      setPresentationMode(prev => ({ ...prev, content: htmlContent, isLoading: false }));
    }
  }, [nodes, edges, appState.selectedIds, appState.appLanguage]);

  const handleSmartGuide = useCallback(async () => {
    const id = appState.selectedIds[0];
    const target = nodes.find(n => n.id === id) || edges.find(e => e.id === id);
    if (target) {
      const t = translations[appState.appLanguage];
      openPresentation(target.fullContent || "", target, t.smartGuide, true);
      const htmlContent = await generateSmartGuide(target, nodes, edges, appState.appLanguage);
      handleSaveModalContent(htmlContent); // Save result
      setPresentationMode(prev => ({ ...prev, content: htmlContent, isLoading: false }));
    }
  }, [nodes, edges, appState.selectedIds, appState.appLanguage]);

  const handleSaveModalContent = useCallback((newContent: string) => {
     saveHistory();
     const id = presentationMode.activeItemId;
     if (!id) return;
     
     // Update Node/Edge State
     const targetNode = nodes.find(n => n.id === id);
     if (targetNode) {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, fullContent: newContent } : n));
     } else {
        const targetEdge = edges.find(e => e.id === id);
        if (targetEdge) {
            setEdges(prev => prev.map(e => e.id === id ? { ...e, fullContent: newContent } : e));
        }
     }
  }, [nodes, edges, presentationMode.activeItemId, saveHistory]);

  const regeneratePresentation = async (lang: Language) => {
    const id = presentationMode.activeItemId;
    if (!id) return;
    const target = nodes.find(n => n.id === id) || edges.find(e => e.id === id);
    if (target) {
      setPresentationMode(prev => ({ ...prev, isLoading: true, targetLanguage: lang }));
      const htmlContent = await generateModeContent(target, appState.aiMode, lang);
      handleSaveModalContent(htmlContent); // Save result
      setPresentationMode(prev => ({ ...prev, content: htmlContent, isLoading: false }));
    }
  };

  const handleDragNode = useCallback((id: string, newPos: [number, number, number]) => {
    // Note: saveHistory is triggered by onDragStart in GraphNode component
    setNodes(prev => {
      const draggedNode = prev.find(n => n.id === id);
      if (!draggedNode) return prev;
      const dx = newPos[0] - draggedNode.position[0];
      const dy = newPos[1] - draggedNode.position[1];
      const dz = newPos[2] - draggedNode.position[2];

      if (appState.selectedIds.includes(id)) {
        return prev.map(n => {
          if (appState.selectedIds.includes(n.id)) {
             return { ...n, position: [n.position[0] + dx, n.position[1] + dy, n.position[2] + dz] };
          }
          return n;
        });
      }
      return prev.map(n => n.id === id ? { ...n, position: newPos } : n);
    });
  }, [appState.selectedIds]);

  const handleUpdateItem = useCallback((id: string, type: 'node' | 'edge', data: any) => {
    // Note: saveHistory is triggered by onPushHistory (onFocus/onClick) in UIOverlay
    const targetIds = appState.selectedIds.includes(id) ? appState.selectedIds : [id];
    if (type === 'node') {
      setNodes(prev => prev.map(n => targetIds.includes(n.id) ? { ...n, ...data } : n));
    } else {
      setEdges(prev => prev.map(e => targetIds.includes(e.id) ? { ...e, ...data } : e));
    }
  }, [appState.selectedIds]);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      saveHistory();
      const result = e.target?.result as string; 
      const newFile: AttachedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        content: result
      };
      const { selectedIds, activeType } = appState;
      if (activeType === 'node') {
        setNodes(prev => prev.map(n => selectedIds.includes(n.id) ? { ...n, files: [...(n.files || []), newFile] } : n));
      } else if (activeType === 'edge') {
        setEdges(prev => prev.map(e => selectedIds.includes(e.id) ? { ...e, files: [...(e.files || []), newFile] } : e));
      }
    };
    reader.readAsDataURL(file);
  }, [appState, saveHistory]);

  const handleDeleteFile = useCallback((fileId: string) => {
    saveHistory();
    const { selectedIds, activeType } = appState;
    if (activeType === 'node') {
      setNodes(prev => prev.map(n => selectedIds.includes(n.id) ? { ...n, files: n.files?.filter(f => f.id !== fileId) || [] } : n));
    } else if (activeType === 'edge') {
      setEdges(prev => prev.map(e => selectedIds.includes(e.id) ? { ...e, files: e.files?.filter(f => f.id !== fileId) || [] } : e));
    }
  }, [appState, saveHistory]);

  const handleDeleteItem = useCallback(() => {
    saveHistory();
    const { selectedIds, activeType } = appState;
    if (selectedIds.length === 0) return;
    if (activeType === 'node') {
      setNodes(prev => prev.filter(n => !selectedIds.includes(n.id)));
      setEdges(prev => prev.filter(e => !selectedIds.includes(e.fromId) && !selectedIds.includes(e.toId)));
    } else {
      setEdges(prev => prev.filter(e => !selectedIds.includes(e.id)));
    }
    setAppState(prev => ({ ...prev, selectedIds: [], activeType: null }));
  }, [appState, saveHistory]);

  const handleSelectSameColor = useCallback(() => {
    const { selectedIds, activeType } = appState;
    if (selectedIds.length === 0 || !activeType) return;
    let refColor = activeType === 'node' ? nodes.find(n => n.id === selectedIds[0])?.color : edges.find(e => e.id === selectedIds[0])?.color;
    if (!refColor) return;
    let newSelection = activeType === 'node' ? nodes.filter(n => n.color === refColor).map(n => n.id) : edges.filter(e => e.color === refColor).map(e => e.id);
    setAppState(prev => ({ ...prev, selectedIds: newSelection }));
  }, [appState, nodes, edges]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: "application/json" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `graph-project-${new Date().toISOString().slice(0,10)}.json`;
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
      } catch (err) { alert("Invalid JSON"); }
    };
    reader.readAsText(file);
  };

  // AI Architect: Apply Graph Structure from Files
  const handleApplyGraphFromAI = useCallback((newNodesRaw: any[], newEdgesRaw: any[]) => {
    saveHistory();
    
    // Map raw AI JSON to GraphNodeData
    const mappedNodes: GraphNodeData[] = newNodesRaw.map((n, idx) => ({
       id: crypto.randomUUID(),
       label: n.label,
       summary: n.summary || "",
       fullContent: n.fullContent || "",
       color: n.color || `hsl(${Math.random() * 360}, 70%, 50%)`,
       size: n.size || 1,
       position: [(Math.random() * 20) - 10, (Math.random() * 10) - 5, (Math.random() * 20) - 10], // Random pos for now
       files: []
    }));

    // Map raw AI JSON to GraphEdgeData
    const mappedEdges: GraphEdgeData[] = newEdgesRaw.map(e => {
       const fromNode = mappedNodes.find(n => n.label === e.fromLabel);
       const toNode = mappedNodes.find(n => n.label === e.toLabel);
       if (fromNode && toNode) {
         return {
           id: crypto.randomUUID(),
           fromId: fromNode.id,
           toId: toNode.id,
           label: e.label,
           color: '#888',
           size: 0.2,
           summary: e.summary || "",
           fullContent: "",
           files: [],
           direction: 'bidirectional'
         };
       }
       return null;
    }).filter(e => e !== null) as GraphEdgeData[];

    setNodes(mappedNodes);
    setEdges(mappedEdges);
  }, [saveHistory]);

  // AI Architect: Apply Changes (Shadow Copy logic)
  const handleApplyChangesFromAI = useCallback((changes: { modifiedNodes: {id: string, content: string}[], newNodes: any[], newEdges: any[] }) => {
     saveHistory();
     
     // 1. Handle Content Updates as Shadow Files
     if (changes.modifiedNodes && changes.modifiedNodes.length > 0) {
        setNodes(prev => prev.map(node => {
           const mod = changes.modifiedNodes.find(m => m.id === node.id);
           if (mod) {
             // Create a Shadow File instead of overwriting content directly
             const shadowFile: AttachedFile = {
               id: crypto.randomUUID(),
               name: `AI_Generated_Content_${Date.now()}.txt`,
               type: 'text/plain',
               content: `data:text/plain;base64,${btoa(unescape(encodeURIComponent(mod.content)))}`,
               isAiGenerated: true
             };
             return { ...node, files: [...node.files, shadowFile] };
           }
           return node;
        }));
     }

     // 2. Handle New Nodes
     if (changes.newNodes && changes.newNodes.length > 0) {
        const addedNodes: GraphNodeData[] = changes.newNodes.map(n => ({
          id: crypto.randomUUID(),
          label: n.label,
          summary: n.summary || "AI Generated",
          fullContent: n.fullContent || "",
          color: '#A020F0', // Purple for AI nodes
          size: 1,
          position: [(Math.random() * 20) - 10, 0, (Math.random() * 20) - 10],
          files: []
        }));
        setNodes(prev => [...prev, ...addedNodes]);
     }

     // 3. Handle New Edges (Note: this is complex as it needs to link to potentially new nodes)
     // For this prototype, we'll skip complex edge linking for auto-pilot to avoid ID mismatch errors,
     // or only link if nodes exist.
  }, [saveHistory]);

  const handlePointerOver = useCallback((e: any, data: GraphNodeData | GraphEdgeData) => {
    e.stopPropagation();
    if ('summary' in data) {
      setHoverData({ label: data.label, summary: data.summary || "", full: data.fullContent || "" });
    }
  }, []);

  const handlePointerOut = useCallback(() => { setHoverData(null); }, []);

  return (
    <div className={`w-full h-screen relative bg-gray-50 flex flex-col font-sans`}>
      <UIOverlay 
        appState={appState}
        nodes={nodes}
        edges={edges}
        cameraPos={cameraPosDisplay}
        uiPanels={uiPanels}
        setUiPanels={setUiPanels}
        setAppState={setAppState}
        onAddNode={handleAddNode}
        onToggleEdgeMode={() => setAppState(prev => ({ ...prev, mode: prev.mode === 'select' ? 'edge-start' : 'select', edgeStartNodeId: null }))}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onExport={handleExport}
        onImport={handleImport}
        onCameraTeleport={(x, y, z) => setTargetCameraPos({ x, y, z })}
        hoverInfo={hoverData}
        onSelectSameColor={handleSelectSameColor}
        onFileUpload={handleFileUpload}
        onDeleteFile={handleDeleteFile}
        presentationMode={presentationMode}
        setPresentationMode={setPresentationMode}
        onRegeneratePresentation={regeneratePresentation}
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
      />
      
      <div className="flex-1 relative mt-12"> 
        <Canvas camera={{ position: [0, 10, 20], fov: 60 }} onPointerMissed={handleBackgroundClick}>
          <color attach="background" args={['#f0f2f5']} />
          <Suspense fallback={null}>
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 20, 10]} intensity={0.8} />
            <Grid infiniteGrid fadeDistance={50} sectionColor="#cbd5e1" cellColor="#e2e8f0" />
            <CameraController targetPos={targetCameraPos} />
            <CameraReporter onUpdate={(pos) => setCameraPosDisplay({ x: pos.x, y: pos.y, z: pos.z })} />
            <KeyboardControls />
            <OrbitControls makeDefault enableDamping dampingFactor={0.1} mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }} />
            {nodes.map(node => (
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
                onDragStart={saveHistory} // Trigger save on drag start
                isDraggingEnabled={appState.mode === 'select'}
              />
            ))}
            {edges.map(edge => (
              <GraphEdge 
                key={edge.id}
                data={edge}
                fromNode={nodes.find(n => n.id === edge.fromId)}
                toNode={nodes.find(n => n.id === edge.toId)}
                isSelected={appState.selectedIds.includes(edge.id)}
                onClick={handleEdgeClick}
                onDoubleClick={handleDoubleClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
              />
            ))}
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
};

export default App;