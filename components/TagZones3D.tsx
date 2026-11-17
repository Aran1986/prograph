import React, { useMemo } from 'react';
import * as THREE from 'three';
import { GraphNodeData } from '../types';
import { BillboardLabel } from './BillboardLabel';

interface TagZones3DProps {
  nodes: GraphNodeData[];
  darkTheme?: boolean;
}

const ZONE_COLORS = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#0ea5e9', '#ef4444'];

export const TagZones3D: React.FC<TagZones3DProps> = ({ nodes, darkTheme = false }) => {
  const zones = useMemo(() => {
    const groups = new Map<string, GraphNodeData[]>();
    nodes.forEach((n) => {
      (n.tags || []).forEach((tag) => {
        const clean = tag.trim();
        if (!clean) return;
        const list = groups.get(clean) || [];
        list.push(n);
        groups.set(clean, list);
      });
    });

    const result: {
      tag: string;
      cx: number;
      cz: number;
      radius: number;
      color: string;
    }[] = [];

    let colorIdx = 0;
    groups.forEach((members, tag) => {
      if (members.length < 2) return;
      const cx = members.reduce((s, m) => s + m.position[0], 0) / members.length;
      const cz = members.reduce((s, m) => s + m.position[2], 0) / members.length;
      let maxDist = 0;
      members.forEach((m) => {
        const dx = m.position[0] - cx;
        const dz = m.position[2] - cz;
        const d = Math.sqrt(dx * dx + dz * dz) + m.size * 0.9;
        if (d > maxDist) maxDist = d;
      });
      result.push({
        tag,
        cx,
        cz,
        radius: Math.max(2.6, maxDist + 1.5),
        color: members[0]?.color || ZONE_COLORS[colorIdx % ZONE_COLORS.length]
      });
      colorIdx++;
    });

    return result;
  }, [nodes]);

  if (zones.length === 0) return null;

  return (
    <group>
      {zones.map((z) => (
        <group key={z.tag} position={[z.cx, -0.03, z.cz]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
            <circleGeometry args={[z.radius, 48]} />
            <meshBasicMaterial
              color={z.color}
              transparent
              opacity={darkTheme ? 0.14 : 0.08}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} raycast={() => null}>
            <ringGeometry args={[Math.max(0.1, z.radius - 0.09), z.radius, 48]} />
            <meshBasicMaterial
              color={z.color}
              transparent
              opacity={darkTheme ? 0.55 : 0.38}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <BillboardLabel
            text={`#${z.tag}`}
            position={[0, 0.28, z.radius]}
            fontSize={24}
            scaleFactor={0.0065}
            textColor={darkTheme ? '#e2e8f0' : '#1e293b'}
            bgColor={darkTheme ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.88)'}
            borderColor={z.color}
          />
        </group>
      ))}
    </group>
  );
};
