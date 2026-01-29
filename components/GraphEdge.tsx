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
  onPointerOver: (e: ThreeEvent<PointerEvent>, data: GraphEdgeData) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
}

export const GraphEdge: React.FC<GraphEdgeProps> = ({
  data,
  fromNode,
  toNode,
  isSelected,
  onClick,
  onPointerOver,
  onPointerOut
}) => {
  if (!fromNode || !toNode) return null;

  const start = new THREE.Vector3(...fromNode.position);
  const end = new THREE.Vector3(...toNode.position);
  const distance = start.distanceTo(end);
  
  // Calculate orientation
  const midPoint = start.clone().add(end).multiplyScalar(0.5);
  const direction = end.clone().sub(start).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  const emissiveColor = isSelected ? '#444444' : '#000000';

  return (
    <group position={midPoint} quaternion={quaternion}>
      <mesh
        onClick={(e) => onClick(e, data.id)}
        onPointerOver={(e) => onPointerOver(e, data)}
        onPointerOut={onPointerOut}
      >
        <cylinderGeometry args={[0.1, 0.1, distance, 8]} />
        <meshStandardMaterial 
          color={data.color} 
          emissive={emissiveColor}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
};