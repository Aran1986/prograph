import React, { useRef, useState } from 'react';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { GraphNodeData } from '../types';

interface GraphNodeProps {
  data: GraphNodeData;
  isSelected: boolean;
  isEdgeStart: boolean;
  onClick: (e: ThreeEvent<MouseEvent>, id: string) => void;
  onDoubleClick: (e: ThreeEvent<MouseEvent>, id: string) => void; // Added
  onPointerOver: (e: ThreeEvent<PointerEvent>, data: GraphNodeData) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
  onDrag: (id: string, newPos: [number, number, number]) => void;
  isDraggingEnabled: boolean;
}

export const GraphNode: React.FC<GraphNodeProps> = ({
  data,
  isSelected,
  isEdgeStart,
  onClick,
  onDoubleClick,
  onPointerOver,
  onPointerOut,
  onDrag,
  isDraggingEnabled
}) => {
  const { camera } = useThree();
  const [dragging, setDragging] = useState(false);
  
  // Use a ref for the drag plane to avoid re-renders during drag
  const dragPlaneRef = useRef(new THREE.Plane());
  const planeIntersectPoint = new THREE.Vector3();

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isDraggingEnabled) return;
    e.stopPropagation();
    
    // Only allow left click drag (button 0)
    if (e.button === 0) {
      setDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      
      const viewDir = new THREE.Vector3();
      camera.getWorldDirection(viewDir);
      dragPlaneRef.current.setFromNormalAndCoplanarPoint(viewDir, new THREE.Vector3(...data.position));
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (dragging) {
      setDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (dragging && isDraggingEnabled) {
      e.stopPropagation();
      e.ray.intersectPlane(dragPlaneRef.current, planeIntersectPoint);
      
      if (planeIntersectPoint) {
        onDrag(data.id, [planeIntersectPoint.x, planeIntersectPoint.y, planeIntersectPoint.z]);
      }
    }
  };

  const emissiveColor = isSelected ? '#444444' : (isEdgeStart ? '#00ff00' : '#000000');
  const scale = dragging ? data.size * 1.1 : data.size;

  return (
    <group position={data.position}>
      <mesh
        onClick={(e) => onClick(e, data.id)}
        onDoubleClick={(e) => onDoubleClick(e, data.id)}
        onPointerOver={(e) => onPointerOver(e, data)}
        onPointerOut={onPointerOut}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        scale={[scale, scale, scale]}
      >
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial
          color={data.color}
          emissive={emissiveColor}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
      
      <Text
        position={[0, 1.2 * data.size, 0]}
        fontSize={0.5}
        color="black"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="white"
      >
        {data.label}
      </Text>
    </group>
  );
};