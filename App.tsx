import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { GraphNode } from './components/GraphNode';
import { GraphEdge } from './components/GraphEdge';
import { UIOverlay } from './components/UIOverlay';
import { GraphNodeData, GraphEdgeData, AppState, CameraState, UIPanelsState } from './types';

// Helper component to report camera position back to UI
const CameraReporter: React.FC<{ onUpdate: (pos: THREE.Vector3) => void }> = ({ onUpdate }) => {
  const { camera } = useThree();
  useThree(({ camera }) => {
    // We can use a ref or simplified throttled update if performance is an issue, 
    // but for UI display every frame is okay for this scale.
    onUpdate(camera.position);
  });
  return null;
};

// Helper to move camera programmatically
const CameraController: React.FC<{ targetPos: CameraState | null }> = ({ targetPos }) => {
  const { camera, controls } = useThree();
  useEffect(() => {
    if (targetPos) {
      camera.position.set(targetPos.x, targetPos.y, targetPos.z);
      // @ts-ignore - OrbitControls type definition issues in some versions
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
    activeId: null,
    activeType: null,
    mode: 'select',
    edgeStartNodeId: null,
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
    filePanel: false // We moved file actions to Top Bar, default off
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
      // Init with one node if empty
      handleAddNode();
    }
  }, []);

  useEffect(() => {
    const data = { nodes, edges };
    localStorage.setItem('graph_pro_data', JSON.stringify(data));
  }, [nodes, edges]);

  // --- Actions ---

  const handleAddNode = useCallback(() => {
    const newNode: GraphNodeData = {
      id: crypto.randomUUID(),
      label: `Node ${nodes.length + 1}`,
      summary: "Short summary here...",
      fullContent: "Full RAG content or detailed description goes here.",
      color: "#2196F3",
      size: 1,
      position: [(Math.random() * 10) - 5, 0, (Math.random() * 10) - 5],
    };
    setNodes(prev => [...prev, newNode]);
    // Auto select
    setAppState(prev => ({ ...prev, activeId: newNode.id, activeType: 'node', mode: 'select' }));
  }, [nodes]);

  const handleNodeClick = useCallback((e: any, id: string) => {
    e.stopPropagation();
    
    setAppState(prev => {
      if (prev.mode === 'select') {
        return { ...prev, activeId: id, activeType: 'node' };
      } 
      else if (prev.mode === 'edge-start') {
        return { ...prev, edgeStartNodeId: id, mode: 'edge-finish' };
      } 
      else if (prev.mode === 'edge-finish') {
        // Create edge
        if (prev.edgeStartNodeId && prev.edgeStartNodeId !== id) {
           const newEdge: GraphEdgeData = {
             id: crypto.randomUUID(),
             fromId: prev.edgeStartNodeId,
             toId: id,
             label: 'Connection',
             color: '#666666'
           };
           setEdges(current => [...current, newEdge]);
           return { ...prev, mode: 'select', activeId: null, activeType: null, edgeStartNodeId: null };
        }
        // Cancel if clicking same node
        return { ...prev, mode: 'select' };
      }
      return prev;
    });
  }, []);

  const handleEdgeClick = useCallback((e: any, id: string) => {
    e.stopPropagation();
    if (appState.mode === 'select') {
      setAppState(prev => ({ ...prev, activeId: id, activeType: 'edge' }));
    }
  }, [appState.mode]);

  const handleBackgroundClick = useCallback(() => {
    if (appState.mode === 'select') {
      setAppState(prev => ({ ...prev, activeId: null, activeType: null }));
    }
  }, [appState.mode]);

  const handleDragNode = useCallback((id: string, newPos: [number, number, number]) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, position: newPos } : n));
  }, []);

  const handleUpdateItem = useCallback((id: string, type: 'node' | 'edge', data: any) => {
    if (type === 'node') {
      setNodes(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));
    } else {
      setEdges(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
    }
  }, []);

  const handleDeleteItem = useCallback(() => {
    const { activeId, activeType } = appState;
    if (!activeId) return;

    if (activeType === 'node') {
      setNodes(prev => prev.filter(n => n.id !== activeId));
      // Delete associated edges
      setEdges(prev => prev.filter(e => e.fromId !== activeId && e.toId !== activeId));
    } else {
      setEdges(prev => prev.filter(e => e.id !== activeId));
    }
    setAppState(prev => ({ ...prev, activeId: null, activeType: null }));
  }, [appState]);

  // --- Import/Export ---
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

  // --- Hover Logic ---
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
    <div className="w-full h-screen relative bg-gray-50 flex flex-col">
      
      <UIOverlay 
        appState={appState}
        nodes={nodes}
        edges={edges}
        cameraPos={cameraPosDisplay}
        uiPanels={uiPanels}
        setUiPanels={setUiPanels}
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
            <OrbitControls makeDefault enableDamping dampingFactor={0.1} />

            {/* Render Nodes */}
            {nodes.map(node => (
              <GraphNode 
                key={node.id} 
                data={node} 
                isSelected={appState.activeId === node.id}
                isEdgeStart={appState.mode === 'edge-finish' && appState.edgeStartNodeId === node.id}
                onClick={handleNodeClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                onDrag={handleDragNode}
                isDraggingEnabled={appState.mode === 'select'}
              />
            ))}

            {/* Render Edges */}
            {edges.map(edge => (
              <GraphEdge 
                key={edge.id}
                data={edge}
                fromNode={nodes.find(n => n.id === edge.fromId)}
                toNode={nodes.find(n => n.id === edge.toId)}
                isSelected={appState.activeId === edge.id}
                onClick={handleEdgeClick}
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