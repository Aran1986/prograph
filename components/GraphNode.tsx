import React, { useRef, useState } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { GraphNodeData } from '../types';

interface GraphNodeProps {
  data: GraphNodeData;
  isSelected: boolean;
  isEdgeStart: boolean;
  onClick: (e: ThreeEvent<MouseEvent>, id: string) => void;
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
  onPointerOver,
  onPointerOut,
  onDrag,
  isDraggingEnabled
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [dragging, setDragging] = useState(false);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const planeIntersectPoint = new THREE.Vector3();

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isDraggingEnabled) return;
    e.stopPropagation();
    // Only allow left click drag
    if (e.button === 0) {
      setDragging(true);
      // Capture pointer to ensure we receive move events even if mouse leaves the mesh
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
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
      // Raycast to the XZ plane
      e.ray.intersectPlane(plane, planeIntersectPoint);
      onDrag(data.id, [planeIntersectPoint.x, 0, planeIntersectPoint.z]);
    }
  };

  // Visual feedback
  const emissiveColor = isSelected ? '#444444' : (isEdgeStart ? '#00ff00' : '#000000');
  const scale = dragging ? data.size * 1.1 : data.size;

  return (
    <group position={data.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => onClick(e, data.id)}
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
      
      {/* Text Label */}
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