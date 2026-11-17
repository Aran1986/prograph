import React, { useEffect, useRef, useState } from 'react';
import { ThreeEvent, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphNodeData } from '../types';
import { BillboardLabel } from './BillboardLabel';

// Pre-allocated math helpers outside component render/drag loop
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _viewDir = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();

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
  isDimmed?: boolean;
  darkTheme?: boolean;
  onContextMenu?: (e: ThreeEvent<MouseEvent>, id: string) => void;
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
  isDraggingEnabled,
  isDimmed = false,
  darkTheme = false,
  onContextMenu
}) => {
  const { camera, gl } = useThree();
  const [dragging, setDragging] = useState(false);

  const dragPlaneRef = useRef(new THREE.Plane());
  const dragOffsetRef = useRef(new THREE.Vector3());
  const startScreenPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);
  const suppressNextClickRef = useRef(false);

  const latestCallbacksRef = useRef({ onDrag, onDragStart, id: data.id });
  latestCallbacksRef.current = { onDrag, onDragStart, id: data.id };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isDraggingEnabled) return;
    if (e.button !== 0) return;
    e.stopPropagation();

    camera.getWorldDirection(_viewDir);
    const nodePos = new THREE.Vector3(...data.position);
    dragPlaneRef.current.setFromNormalAndCoplanarPoint(_viewDir, nodePos);

    if (e.ray.intersectPlane(dragPlaneRef.current, _hitPoint)) {
      dragOffsetRef.current.copy(nodePos).sub(_hitPoint);
    } else {
      dragOffsetRef.current.set(0, 0, 0);
    }

    startScreenPosRef.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;
    setDragging(true);

    try {
      gl.domElement.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unavailable
    }
  };

  useEffect(() => {
    if (!dragging) return;

    const handleWindowMove = (ev: PointerEvent) => {
      if (startScreenPosRef.current && !hasMovedRef.current) {
        const dx = ev.clientX - startScreenPosRef.current.x;
        const dy = ev.clientY - startScreenPosRef.current.y;
        if (dx * dx + dy * dy < 16) return; // 4px threshold before starting drag
        hasMovedRef.current = true;
        suppressNextClickRef.current = true;
        latestCallbacksRef.current.onDragStart?.();
      }

      const rect = gl.domElement.getBoundingClientRect();
      _ndc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1
      );
      _raycaster.setFromCamera(_ndc, camera);
      if (_raycaster.ray.intersectPlane(dragPlaneRef.current, _hitPoint)) {
        _hitPoint.add(dragOffsetRef.current);
        latestCallbacksRef.current.onDrag(latestCallbacksRef.current.id, [
          _hitPoint.x,
          _hitPoint.y,
          _hitPoint.z
        ]);
      }
    };

    const handleWindowUp = (ev: PointerEvent) => {
      setDragging(false);
      startScreenPosRef.current = null;
      try {
        if (gl.domElement.hasPointerCapture(ev.pointerId)) {
          gl.domElement.releasePointerCapture(ev.pointerId);
        }
      } catch {
        // Ignore
      }
      if (hasMovedRef.current) {
        window.setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 0);
      }
    };

    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);
    window.addEventListener('pointercancel', handleWindowUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowUp);
    };
  }, [dragging, camera, gl]);

  const emissiveColor = isSelected ? '#3b82f6' : isEdgeStart ? '#10b981' : '#000000';
  const emissiveIntensity = isSelected || isEdgeStart ? 0.45 : 0;
  const scale = dragging ? data.size * 1.08 : data.size;
  const shape = data.shape || 'sphere';

  const renderGeometry = () => {
    switch (shape) {
      case 'box':
        return <boxGeometry args={[0.9, 0.9, 0.9]} />;
      case 'cylinder':
        return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      case 'capsule':
        return <capsuleGeometry args={[0.4, 1, 4, 8]} />;
      case 'torus':
        return <torusGeometry args={[0.4, 0.2, 16, 64]} />;
      case 'cone':
        return <coneGeometry args={[0.5, 1, 32]} />;
      case 'sphere':
      default:
        return <sphereGeometry args={[0.7, 32, 32]} />;
    }
  };

  return (
    <group position={data.position}>
      <mesh
        onClick={(e) => {
          if (suppressNextClickRef.current) {
            e.stopPropagation();
            suppressNextClickRef.current = false;
            return;
          }
          onClick(e, data.id);
        }}
        onDoubleClick={(e) => onDoubleClick(e, data.id)}
        onContextMenu={(e) => {
          if (onContextMenu) {
            e.stopPropagation();
            onContextMenu(e, data.id);
          }
        }}
        onPointerOver={(e) => onPointerOver(e, data)}
        onPointerOut={onPointerOut}
        onPointerDown={handlePointerDown}
        scale={[scale, scale, scale]}
      >
        {renderGeometry()}
        <meshStandardMaterial
          color={data.color}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.32}
          metalness={0.18}
          transparent={isDimmed}
          opacity={isDimmed ? 0.22 : 1}
        />
      </mesh>

      {(isSelected || isEdgeStart || data.locked) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.78 * data.size, 0]}>
          <ringGeometry args={[0.85 * data.size, 1.04 * data.size, 40]} />
          <meshBasicMaterial
            color={isEdgeStart ? '#10b981' : isSelected ? '#2563eb' : '#f59e0b'}
            side={THREE.DoubleSide}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}

      <BillboardLabel
        text={data.locked ? `🔒 ${data.label}` : data.label}
        position={[0, 1.25 * data.size, 0]}
        opacity={isDimmed ? 0.25 : 1}
        textColor={isSelected ? '#1d4ed8' : darkTheme ? '#f8fafc' : '#0f172a'}
        bgColor={
          isSelected
            ? darkTheme
              ? 'rgba(219, 234, 254, 0.96)'
              : 'rgba(239, 246, 255, 0.96)'
            : darkTheme
            ? 'rgba(15, 23, 42, 0.92)'
            : 'rgba(255, 255, 255, 0.9)'
        }
        borderColor={
          isSelected
            ? 'rgba(59, 130, 246, 0.95)'
            : darkTheme
            ? 'rgba(71, 85, 105, 0.85)'
            : 'rgba(148, 163, 184, 0.7)'
        }
      />
    </group>
  );
};