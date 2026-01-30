import React, { useState, useCallback, useEffect, Suspense, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { GraphNode } from './components/GraphNode';
import { GraphEdge } from './components/GraphEdge';
import { UIOverlay } from './components/UIOverlay';
import { GraphNodeData, GraphEdgeData, AppState, CameraState, UIPanelsState, AttachedFile, Language } from './types';
import { generatePresentation } from './services/ai';
import { getDir } from './utils/translations';

// Keyboard Control Component for WASD/Arrow navigation
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

    const speed = 20 * delta; // Movement speed
    const moveVector = new THREE.Vector3();

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
    right.normalize();

    if (keys['ArrowUp'] || keys['KeyW']) moveVector.add(forward.multiplyScalar(speed));
    if (keys['ArrowDown'] || keys['KeyS']) moveVector.add(forward.multiplyScalar(-speed));
    if (keys['ArrowRight'] || keys['KeyD']) moveVector.add(right.multiplyScalar(-speed));
    if (keys['ArrowLeft'] || keys['KeyA']) moveVector.add(right.multiplyScalar(speed));

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
  // --- State ---
  const [nodes, setNodes] = useState<GraphNodeData[]>([]);
  const [edges, setEdges] = useState<GraphEdgeData[]>([]);
  const [appState, setAppState] = useState<AppState>({
    nodes: [],
    edges: [],
    selectedIds: [],
    activeType: null,
    mode: 'select',
    edgeStartNodeId: null,
    appLanguage: 'fa' // Default Language
  });
  
  const [cameraPosDisplay, setCameraPosDisplay] = useState({ x: 0, y: 10, z: 20 });
  const [targetCameraPos, setTargetCameraPos] = useState<CameraState | null>(null);
  const [hoverData, setHoverData] = useState<{ label: string; summary: string; full: string } | null>(null);
  
  // UI Panels Visibility State
  const [uiPanels, setUiPanels] = useState<UIPanelsState>({
    tools: true,
    properties: true,
    camera: true,
    hints: true,
    filePanel: false 
  });

  // Presentation Mode State
  const [presentationMode, setPresentationMode] = useState<{ 
    isOpen: boolean; 
    content: string; 
    isLoading: boolean;
    activeFiles: AttachedFile[]; // Passed to modal for replacement
    targetLanguage: Language;
  }>({
    isOpen: false,
    content: '',
    isLoading: false,
    activeFiles: [],
    targetLanguage: 'fa'
  });

  // --- Persistence ---
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
    // Update HTML dir attribute
    document.documentElement.dir = getDir(appState.appLanguage);
    document.documentElement.lang = appState.appLanguage;
  }, [appState.appLanguage]);

  // --- Actions ---

  const handleAddNode = useCallback(() => {
    const newNode: GraphNodeData = {
      id: crypto.randomUUID(),
      label: `Node ${nodes.length + 1}`,
      summary: "Short summary...",
      fullContent: "Detailed description...",
      color: "#2196F3",
      size: 1,
      position: [(Math.random() * 10) - 5, 0, (Math.random() * 10) - 5],
      files: []
    };
    setNodes(prev => [...prev, newNode]);
    setAppState(prev => ({ ...prev, selectedIds: [newNode.id], activeType: 'node', mode: 'select' }));
  }, [nodes]);

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
           const newEdge: GraphEdgeData = {
             id: crypto.randomUUID(),
             fromId: prev.edgeStartNodeId,
             toId: id,
             label: 'Connection',
             color: '#666666',
             size: 0.1,
             summary: "Connection...",
             fullContent: "Description...",
             files: []
           };
           setEdges(current => [...current, newEdge]);
           return { ...prev, mode: 'select', selectedIds: [], activeType: null, edgeStartNodeId: null };
        }
        return { ...prev, mode: 'select' };
      }
      return prev;
    });
  }, []);

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

  // AI Presentation Logic
  const handleDoubleClick = useCallback(async (e: any, id: string) => {
    e.stopPropagation();
    
    const targetNode = nodes.find(n => n.id === id);
    const targetEdge = edges.find(e => e.id === id);
    const target = targetNode || targetEdge;

    if (target) {
      // Open modal immediately with loading state
      setPresentationMode({ 
        isOpen: true, 
        content: '', 
        isLoading: true, 
        activeFiles: target.files || [],
        targetLanguage: appState.appLanguage // Default to app language
      });
      
      const htmlContent = await generatePresentation(target, appState.appLanguage);
      
      setPresentationMode(prev => ({ 
        ...prev, 
        content: htmlContent, 
        isLoading: false 
      }));
    }
  }, [nodes, edges, appState.appLanguage]);

  // Handle language change within presentation mode to regenerate
  const regeneratePresentation = async (lang: Language) => {
    // Find active item from appState
    const id = appState.selectedIds[0];
    const target = nodes.find(n => n.id === id) || edges.find(e => e.id === id);
    
    if (target) {
      setPresentationMode(prev => ({ ...prev, isLoading: true, targetLanguage: lang }));
      const htmlContent = await generatePresentation(target, lang);
      setPresentationMode(prev => ({ ...prev, content: htmlContent, isLoading: false }));
    }
  };

  const handleDragNode = useCallback((id: string, newPos: [number, number, number]) => {
    setNodes(prev => {
      const draggedNode = prev.find(n => n.id === id);
      if (!draggedNode) return prev;

      const dx = newPos[0] - draggedNode.position[0];
      const dy = newPos[1] - draggedNode.position[1];
      const dz = newPos[2] - draggedNode.position[2];

      if (appState.selectedIds.includes(id)) {
        return prev.map(n => {
          if (appState.selectedIds.includes(n.id)) {
             return {
               ...n,
               position: [n.position[0] + dx, n.position[1] + dy, n.position[2] + dz]
             };
          }
          return n;
        });
      }
      return prev.map(n => n.id === id ? { ...n, position: newPos } : n);
    });
  }, [appState.selectedIds]);

  const handleUpdateItem = useCallback((id: string, type: 'node' | 'edge', data: any) => {
    const targetIds = appState.selectedIds.includes(id) ? appState.selectedIds : [id];
    if (type === 'node') {
      setNodes(prev => prev.map(n => targetIds.includes(n.id) ? { ...n, ...data } : n));
    } else {
      setEdges(prev => prev.map(e => targetIds.includes(e.id) ? { ...e, ...data } : e));
    }
  }, [appState.selectedIds]);

  // File Upload Logic
  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string; // This is the Base64 string
      const newFile: AttachedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        content: result
      };

      // Add to all selected items
      const { selectedIds, activeType } = appState;
      if (activeType === 'node') {
        setNodes(prev => prev.map(n => 
          selectedIds.includes(n.id) ? { ...n, files: [...(n.files || []), newFile] } : n
        ));
      } else if (activeType === 'edge') {
        setEdges(prev => prev.map(e => 
          selectedIds.includes(e.id) ? { ...e, files: [...(e.files || []), newFile] } : e
        ));
      }
    };
    reader.readAsDataURL(file);
  }, [appState]);

  const handleDeleteFile = useCallback((fileId: string) => {
    const { selectedIds, activeType } = appState;
    if (activeType === 'node') {
      setNodes(prev => prev.map(n => 
        selectedIds.includes(n.id) ? { ...n, files: n.files?.filter(f => f.id !== fileId) || [] } : n
      ));
    } else if (activeType === 'edge') {
      setEdges(prev => prev.map(e => 
        selectedIds.includes(e.id) ? { ...e, files: e.files?.filter(f => f.id !== fileId) || [] } : e
      ));
    }
  }, [appState]);

  const handleDeleteItem = useCallback(() => {
    const { selectedIds, activeType } = appState;
    if (selectedIds.length === 0) return;

    if (activeType === 'node') {
      setNodes(prev => prev.filter(n => !selectedIds.includes(n.id)));
      setEdges(prev => prev.filter(e => !selectedIds.includes(e.fromId) && !selectedIds.includes(e.toId)));
    } else {
      setEdges(prev => prev.filter(e => !selectedIds.includes(e.id)));
    }
    setAppState(prev => ({ ...prev, selectedIds: [], activeType: null }));
  }, [appState]);

  const handleSelectSameColor = useCallback(() => {
    const { selectedIds, activeType } = appState;
    if (selectedIds.length === 0 || !activeType) return;

    let refColor = '';
    if (activeType === 'node') {
      const node = nodes.find(n => n.id === selectedIds[0]);
      if (node) refColor = node.color;
    } else {
      const edge = edges.find(e => e.id === selectedIds[0]);
      if (edge) refColor = edge.color;
    }

    if (!refColor) return;

    let newSelection: string[] = [];
    if (activeType === 'node') {
      newSelection = nodes.filter(n => n.color === refColor).map(n => n.id);
    } else {
      newSelection = edges.filter(e => e.color === refColor).map(e => e.id);
    }

    setAppState(prev => ({ ...prev, selectedIds: newSelection }));
  }, [appState, nodes, edges]);

  const handleExport = () => {
    const dataStr = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph-project-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = JSON.parse(e.target?.result as string);
        if (result.nodes) setNodes(result.nodes);
        if (result.edges) setEdges(result.edges);
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handlePointerOver = useCallback((e: any, data: GraphNodeData | GraphEdgeData) => {
    e.stopPropagation();
    if ('summary' in data) {
      setHoverData({
        label: data.label,
        summary: data.summary || "",
        full: data.fullContent || ""
      });
    }
  }, []);

  const handlePointerOut = useCallback(() => {
    setHoverData(null);
  }, []);

  return (
    <div className={`w-full h-screen relative bg-gray-50 flex flex-col font-sans`}>
      
      <UIOverlay 
        appState={appState}
        nodes={nodes}
        edges={edges}
        cameraPos={cameraPosDisplay}
        uiPanels={uiPanels}
        setUiPanels={setUiPanels}
        setAppState={setAppState} // Pass setter for language toggle
        onAddNode={handleAddNode}
        onToggleEdgeMode={() => setAppState(prev => ({ 
          ...prev, 
          mode: prev.mode === 'select' ? 'edge-start' : 'select',
          edgeStartNodeId: null
        }))}
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
      />

      <div className="flex-1 relative mt-12"> 
        <Canvas shadows camera={{ position: [0, 10, 20], fov: 60 }} onPointerMissed={handleBackgroundClick}>
          <color attach="background" args={['#f0f2f5']} />
          
          <Suspense fallback={null}>
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 20, 10]} intensity={0.8} castShadow />
            <Grid infiniteGrid fadeDistance={50} sectionColor="#cbd5e1" cellColor="#e2e8f0" />
            
            <CameraController targetPos={targetCameraPos} />
            <CameraReporter onUpdate={(pos) => setCameraPosDisplay({ x: pos.x, y: pos.y, z: pos.z })} />
            
            <KeyboardControls />
            <OrbitControls 
              makeDefault 
              enableDamping 
              dampingFactor={0.1}
              mouseButtons={{
                LEFT: undefined, 
                MIDDLE: THREE.MOUSE.PAN,
                RIGHT: THREE.MOUSE.ROTATE
              }}
            />

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