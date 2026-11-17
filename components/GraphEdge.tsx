import React, { useEffect, useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { GraphEdgeData, GraphNodeData } from '../types';
import { BillboardLabel } from './BillboardLabel';

const UP_AXIS = new THREE.Vector3(0, 1, 0);
const ALT_AXIS = new THREE.Vector3(1, 0, 0);

interface GraphEdgeProps {
  data: GraphEdgeData;
  fromNode?: GraphNodeData;
  toNode?: GraphNodeData;
  isSelected: boolean;
  parallelIndex?: number;
  parallelTotal?: number;
  isDimmed?: boolean;
  darkTheme?: boolean;
  showLabel?: boolean;
  onClick: (e: ThreeEvent<MouseEvent>, id: string) => void;
  onDoubleClick: (e: ThreeEvent<MouseEvent>, id: string) => void;
  onContextMenu?: (e: ThreeEvent<MouseEvent>, id: string) => void;
  onPointerOver: (e: ThreeEvent<PointerEvent>, data: GraphEdgeData) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
}

export const GraphEdge: React.FC<GraphEdgeProps> = ({
  data,
  fromNode,
  toNode,
  isSelected,
  parallelIndex = 0,
  parallelTotal = 1,
  isDimmed = false,
  darkTheme = false,
  showLabel = true,
  onClick,
  onDoubleClick,
  onContextMenu,
  onPointerOver,
  onPointerOut
}) => {
  const thickness = data.size || 0.1;
  const isCurved = parallelTotal > 1;

  const geometryData = useMemo(() => {
    if (!fromNode || !toNode) return null;

    const start = new THREE.Vector3(...fromNode.position);
    const end = new THREE.Vector3(...toNode.position);
    const distance = start.distanceTo(end);
    if (distance < 0.001) return null;

    const midPoint = start.clone().add(end).multiplyScalar(0.5);
    const direction = end.clone().sub(start).normalize();
    const arrowRadius = Math.max(thickness * 2.4, 0.22);
    const arrowHeight = Math.max(thickness * 5, 0.55);

    if (!isCurved) {
      const quaternion = new THREE.Quaternion().setFromUnitVectors(UP_AXIS, direction);
      const toOffset = Math.max(0, distance / 2 - (toNode.size * 0.75 + arrowHeight * 0.6));
      const fromOffset = Math.max(0, distance / 2 - (fromNode.size * 0.75 + arrowHeight * 0.6));
      return {
        curved: false as const,
        distance,
        midPoint,
        quaternion,
        arrowRadius,
        arrowHeight,
        toOffset,
        fromOffset,
        labelPos: [midPoint.x, midPoint.y + 0.45, midPoint.z] as [number, number, number]
      };
    }

    // Canonical direction ensures A->B and B->A share the same perpendicular basis and bow apart
    const canonDir =
      fromNode.id < toNode.id
        ? end.clone().sub(start).normalize()
        : start.clone().sub(end).normalize();
    const perp = new THREE.Vector3().crossVectors(canonDir, UP_AXIS);
    if (perp.lengthSq() < 0.01) {
      perp.crossVectors(canonDir, ALT_AXIS);
    }
    perp.normalize();

    const signedStep = parallelIndex - (parallelTotal - 1) / 2;
    const curveScale = Math.min(4.5, Math.max(1.35, distance * 0.28));
    const controlPoint = midPoint.clone().addScaledVector(perp, signedStep * curveScale);

    const curve = new THREE.QuadraticBezierCurve3(start, controlPoint, end);
    const tubeGeo = new THREE.TubeGeometry(curve, 28, thickness, 10, false);
    const apex = curve.getPoint(0.5);

    // Arrowhead placement near source and target along the curve
    const tTo = Math.max(0.55, Math.min(0.95, 1 - (toNode.size * 0.75 + arrowHeight * 0.55) / distance));
    const tFrom = Math.min(0.45, Math.max(0.05, (fromNode.size * 0.75 + arrowHeight * 0.55) / distance));

    const toPos = curve.getPoint(tTo);
    const toQuat = new THREE.Quaternion().setFromUnitVectors(UP_AXIS, curve.getTangent(tTo).normalize());

    const fromPos = curve.getPoint(tFrom);
    const fromQuat = new THREE.Quaternion().setFromUnitVectors(UP_AXIS, curve.getTangent(tFrom).negate().normalize());

    return {
      curved: true as const,
      tubeGeo,
      arrowRadius,
      arrowHeight,
      toPos,
      toQuat,
      fromPos,
      fromQuat,
      labelPos: [apex.x, apex.y + 0.42, apex.z] as [number, number, number]
    };
  }, [fromNode, toNode, thickness, isCurved, parallelIndex, parallelTotal]);

  useEffect(() => {
    return () => {
      if (geometryData?.curved) {
        geometryData.tubeGeo.dispose();
      }
    };
  }, [geometryData]);

  if (!fromNode || !toNode || !geometryData) return null;

  const emissiveColor = isSelected ? '#3b82f6' : '#000000';
  const emissiveIntensity = isSelected ? 0.5 : 0;
  const edgeDirection = data.direction || 'bidirectional';
  const opacity = isDimmed ? 0.16 : 1;

  return (
    <group>
      {geometryData.curved ? (
        <>
          <mesh
            geometry={geometryData.tubeGeo}
            onClick={(e) => onClick(e, data.id)}
            onDoubleClick={(e) => onDoubleClick(e, data.id)}
            onContextMenu={(e) => {
              if (onContextMenu) {
                e.stopPropagation();
                onContextMenu(e, data.id);
              }
            }}
            onPointerOver={(e) => onPointerOver(e, data)}
            onPointerOut={onPointerOut}
          >
            <meshStandardMaterial
              color={data.color}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              transparent={isDimmed}
              opacity={opacity}
            />
          </mesh>

          {(edgeDirection === 'source-to-target' || edgeDirection === 'bidirectional') && (
            <mesh position={geometryData.toPos} quaternion={geometryData.toQuat}>
              <coneGeometry args={[geometryData.arrowRadius, geometryData.arrowHeight, 12]} />
              <meshStandardMaterial
                color={data.color}
                emissive={emissiveColor}
                emissiveIntensity={emissiveIntensity}
                transparent={isDimmed}
                opacity={opacity}
              />
            </mesh>
          )}

          {(edgeDirection === 'target-to-source' || edgeDirection === 'bidirectional') && (
            <mesh position={geometryData.fromPos} quaternion={geometryData.fromQuat}>
              <coneGeometry args={[geometryData.arrowRadius, geometryData.arrowHeight, 12]} />
              <meshStandardMaterial
                color={data.color}
                emissive={emissiveColor}
                emissiveIntensity={emissiveIntensity}
                transparent={isDimmed}
                opacity={opacity}
              />
            </mesh>
          )}
        </>
      ) : (
        <group position={geometryData.midPoint} quaternion={geometryData.quaternion}>
          <mesh
            onClick={(e) => onClick(e, data.id)}
            onDoubleClick={(e) => onDoubleClick(e, data.id)}
            onContextMenu={(e) => {
              if (onContextMenu) {
                e.stopPropagation();
                onContextMenu(e, data.id);
              }
            }}
            onPointerOver={(e) => onPointerOver(e, data)}
            onPointerOut={onPointerOut}
          >
            <cylinderGeometry args={[thickness, thickness, geometryData.distance, 12]} />
            <meshStandardMaterial
              color={data.color}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              transparent={isDimmed}
              opacity={opacity}
            />
          </mesh>

          {(edgeDirection === 'source-to-target' || edgeDirection === 'bidirectional') && geometryData.toOffset > 0.1 && (
            <mesh position={[0, geometryData.toOffset, 0]}>
              <coneGeometry args={[geometryData.arrowRadius, geometryData.arrowHeight, 12]} />
              <meshStandardMaterial
                color={data.color}
                emissive={emissiveColor}
                emissiveIntensity={emissiveIntensity}
                transparent={isDimmed}
                opacity={opacity}
              />
            </mesh>
          )}

          {(edgeDirection === 'target-to-source' || edgeDirection === 'bidirectional') && geometryData.fromOffset > 0.1 && (
            <mesh position={[0, -geometryData.fromOffset, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[geometryData.arrowRadius, geometryData.arrowHeight, 12]} />
              <meshStandardMaterial
                color={data.color}
                emissive={emissiveColor}
                emissiveIntensity={emissiveIntensity}
                transparent={isDimmed}
                opacity={opacity}
              />
            </mesh>
          )}
        </group>
      )}

      {showLabel && data.label && (
        <BillboardLabel
          text={data.label}
          position={geometryData.labelPos}
          fontSize={28}
          scaleFactor={0.007}
          opacity={isDimmed ? 0.25 : 1}
          textColor={isSelected ? '#1d4ed8' : darkTheme ? '#e2e8f0' : '#0f172a'}
          bgColor={
            isSelected
              ? darkTheme
                ? 'rgba(219, 234, 254, 0.96)'
                : 'rgba(239, 246, 255, 0.95)'
              : darkTheme
              ? 'rgba(30, 41, 59, 0.9)'
              : 'rgba(248, 250, 252, 0.85)'
          }
          borderColor={
            isSelected
              ? 'rgba(59, 130, 246, 0.95)'
              : darkTheme
              ? 'rgba(71, 85, 105, 0.85)'
              : 'rgba(203, 213, 225, 0.8)'
          }
        />
      )}
    </group>
  );
};