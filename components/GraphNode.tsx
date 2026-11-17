import React, { useRef, useState } from 'react';
import { ThreeEvent, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphNodeData } from '../types';
import { BillboardLabel } from './BillboardLabel';

interface GraphNodeProps {
  data: GraphNodeData;
  isSelected: boolean;
  isEdgeStart: boolean;
  onClick: (e: ThreeEvent<MouseEvent>, id: string) => void;
  onDoubleClick: (e: ThreeEvent<MouseEvent>, id: string) => void;
  onPointerOver: (e: ThreeEvent<PointerEvent>, data: GraphNodeData) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
  onDrag: (id: string, newPos: [number, number, number]) => void;
  onDragStart?: () => void;
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
  onDragStart,
  isDraggingEnabled
}) => {
  const { camera } = useThree();
  const [dragging, setDragging] = useState(false);

  const dragPlaneRef = useRef(new THREE.Plane());
  const planeIntersectPoint = useRef(new THREE.Vector3());

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isDraggingEnabled) return;
    e.stopPropagation();

    if (e.button === 0) {
      if (onDragStart) onDragStart();
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
      const hit = e.ray.intersectPlane(dragPlaneRef.current, planeIntersectPoint.current);
      if (hit) {
        onDrag(data.id, [hit.x, hit.y, hit.z]);
      }
    }
  };

  const emissiveColor = isSelected ? '#444444' : (isEdgeStart ? '#00ff00' : '#000000');
  const scale = dragging ? data.size * 1.1 : data.size;
  const shape = data.shape || 'sphere';

  const renderGeometry = () => {
    switch (shape) {
      case 'box': return <boxGeometry args={[0.9, 0.9, 0.9]} />;
      case 'cylinder': return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      case 'capsule': return <capsuleGeometry args={[0.4, 1, 4, 8]} />;
      case 'torus': return <torusGeometry args={[0.4, 0.2, 16, 100]} />;
      case 'cone': return <coneGeometry args={[0.5, 1, 32]} />;
      case 'sphere':
      default: return <sphereGeometry args={[0.7, 32, 32]} />;
    }
  };

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
        {renderGeometry()}
        <meshStandardMaterial
          color={data.color}
          emissive={emissiveColor}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      <BillboardLabel
        text={data.label}
        position={[0, 1.25 * data.size, 0]}
        bgColor={isSelected ? 'rgba(239, 246, 255, 0.96)' : 'rgba(255, 255, 255, 0.9)'}
        borderColor={isSelected ? 'rgba(37, 99, 235, 0.9)' : 'rgba(148, 163, 184, 0.7)'}
      />
    </group>
  );
};