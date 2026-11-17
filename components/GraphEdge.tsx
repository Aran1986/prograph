import React from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphEdgeData, GraphNodeData } from '../types';
import { BillboardLabel } from './BillboardLabel';

interface GraphEdgeProps {
  data: GraphEdgeData;
  fromNode?: GraphNodeData;
  toNode?: GraphNodeData;
  isSelected: boolean;
  onClick: (e: ThreeEvent<MouseEvent>, id: string) => void;
  onDoubleClick: (e: ThreeEvent<MouseEvent>, id: string) => void;
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

  if (distance < 0.001) return null;

  const midPoint = start.clone().add(end).multiplyScalar(0.5);
  const direction = end.clone().sub(start).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  const emissiveColor = isSelected ? '#444444' : '#000000';
  const thickness = data.size || 0.1;
  const edgeDirection = data.direction || 'bidirectional';

  // Position arrowheads just outside the destination/source node surface
  const arrowRadius = Math.max(thickness * 2.4, 0.22);
  const arrowHeight = Math.max(thickness * 5, 0.55);
  const toOffset = Math.max(0, distance / 2 - (toNode.size * 0.75 + arrowHeight * 0.6));
  const fromOffset = Math.max(0, distance / 2 - (fromNode.size * 0.75 + arrowHeight * 0.6));

  return (
    <group>
      <group position={midPoint} quaternion={quaternion}>
        <mesh
          onClick={(e) => onClick(e, data.id)}
          onDoubleClick={(e) => onDoubleClick(e, data.id)}
          onPointerOver={(e) => onPointerOver(e, data)}
          onPointerOut={onPointerOut}
        >
          <cylinderGeometry args={[thickness, thickness, distance, 12]} />
          <meshStandardMaterial
            color={data.color}
            emissive={emissiveColor}
            emissiveIntensity={0.5}
          />
        </mesh>

        {/* Source -> Target arrowhead */}
        {(edgeDirection === 'source-to-target' || edgeDirection === 'bidirectional') && toOffset > 0.1 && (
          <mesh position={[0, toOffset, 0]}>
            <coneGeometry args={[arrowRadius, arrowHeight, 12]} />
            <meshStandardMaterial
              color={data.color}
              emissive={emissiveColor}
              emissiveIntensity={0.5}
            />
          </mesh>
        )}

        {/* Target -> Source arrowhead */}
        {(edgeDirection === 'target-to-source' || edgeDirection === 'bidirectional') && fromOffset > 0.1 && (
          <mesh position={[0, -fromOffset, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[arrowRadius, arrowHeight, 12]} />
            <meshStandardMaterial
              color={data.color}
              emissive={emissiveColor}
              emissiveIntensity={0.5}
            />
          </mesh>
        )}
      </group>

      {/* Edge Label */}
      {data.label && (
        <BillboardLabel
          text={data.label}
          position={[midPoint.x, midPoint.y + 0.45, midPoint.z]}
          fontSize={28}
          scaleFactor={0.007}
          bgColor={isSelected ? 'rgba(239, 246, 255, 0.95)' : 'rgba(248, 250, 252, 0.85)'}
          borderColor={isSelected ? 'rgba(37, 99, 235, 0.9)' : 'rgba(203, 213, 225, 0.8)'}
        />
      )}
    </group>
  );
};