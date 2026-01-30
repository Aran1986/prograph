import React, { useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphEdgeData, GraphNodeData } from '../types';

interface GraphEdgeProps {
  data: GraphEdgeData;
  fromNode?: GraphNodeData;
  toNode?: GraphNodeData;
  isSelected: boolean;
  onClick: (e: ThreeEvent<MouseEvent>, id: string) => void;
  onDoubleClick: (e: ThreeEvent<MouseEvent>, id: string) => void; // Added
  onPointerOver: (e: ThreeEvent<PointerEvent>, data: GraphEdgeData) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
}

export const GraphEdge: React.FC<GraphEdgeProps> = ({
  data,
  fromNode,
  toNode,
  isSelected,
  onClick,
  onDoubleClick,
  onPointerOver,
  onPointerOut
}) => {
  if (!fromNode || !toNode) return null;

  const start = new THREE.Vector3(...fromNode.position);
  const end = new THREE.Vector3(...toNode.position);
  const distance = start.distanceTo(end);
  
  const midPoint = start.clone().add(end).multiplyScalar(0.5);
  const direction = end.clone().sub(start).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  const emissiveColor = isSelected ? '#444444' : '#000000';
  const thickness = data.size || 0.1;

  return (
    <group position={midPoint} quaternion={quaternion}>
      <mesh
        onClick={(e) => onClick(e, data.id)}
        onDoubleClick={(e) => onDoubleClick(e, data.id)}
        onPointerOver={(e) => onPointerOver(e, data)}
        onPointerOut={onPointerOut}
      >
        <cylinderGeometry args={[thickness, thickness, distance, 8]} />
        <meshStandardMaterial 
          color={data.color} 
          emissive={emissiveColor}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
};