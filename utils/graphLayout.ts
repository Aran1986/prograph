import { GraphEdgeData, GraphNodeData } from '../types';

export const computeForceDirectedLayout = (
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  iterations = 140
): GraphNodeData[] => {
  if (nodes.length <= 1) {
    return nodes.map((n) => ({ ...n, position: [0, 0, 0] }));
  }

  // Initialize positions (spread slightly if two nodes share exact coordinates)
  const pos: [number, number, number][] = nodes.map((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    const x = n.position[0] + Math.cos(angle) * 0.05;
    const y = n.position[1];
    const z = n.position[2] + Math.sin(angle) * 0.05;
    return [x, y, z];
  });

  const indexMap = new Map<string, number>();
  nodes.forEach((n, idx) => indexMap.set(n.id, idx));

  const repulsionStrength = 28;
  const idealEdgeLength = 5.5;
  const springStrength = 0.08;
  const centerGravity = 0.03;
  const damping = 0.85;

  const vel: [number, number, number][] = nodes.map(() => [0, 0, 0]);

  for (let iter = 0; iter < iterations; iter++) {
    const forces: [number, number, number][] = nodes.map(() => [0, 0, 0]);

    // Pairwise repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = pos[i][0] - pos[j][0];
        let dy = pos[i][1] - pos[j][1];
        let dz = pos[i][2] - pos[j][2];
        let distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < 0.04) {
          dx = (Math.random() - 0.5) * 0.5;
          dy = (Math.random() - 0.5) * 0.2;
          dz = (Math.random() - 0.5) * 0.5;
          distSq = dx * dx + dy * dy + dz * dz + 0.04;
        }
        const dist = Math.sqrt(distSq);
        const rep = repulsionStrength / distSq;
        const fx = (dx / dist) * rep;
        const fy = (dy / dist) * rep * 0.45; // keep graph reasonably planar-friendly in 3D
        const fz = (dz / dist) * rep;

        forces[i][0] += fx;
        forces[i][1] += fy;
        forces[i][2] += fz;
        forces[j][0] -= fx;
        forces[j][1] -= fy;
        forces[j][2] -= fz;
      }
    }

    // Spring attraction along edges
    for (const edge of edges) {
      const i = indexMap.get(edge.fromId);
      const j = indexMap.get(edge.toId);
      if (i === undefined || j === undefined || i === j) continue;

      const dx = pos[j][0] - pos[i][0];
      const dy = pos[j][1] - pos[i][1];
      const dz = pos[j][2] - pos[i][2];
      const dist = Math.max(0.1, Math.sqrt(dx * dx + dy * dy + dz * dz));
      const displacement = dist - idealEdgeLength;
      const force = displacement * springStrength;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;

      forces[i][0] += fx;
      forces[i][1] += fy;
      forces[i][2] += fz;
      forces[j][0] -= fx;
      forces[j][1] -= fy;
      forces[j][2] -= fz;
    }

    // Center gravity & velocity integration
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].locked) continue;

      forces[i][0] -= pos[i][0] * centerGravity;
      forces[i][1] -= pos[i][1] * centerGravity * 1.6;
      forces[i][2] -= pos[i][2] * centerGravity;

      vel[i][0] = (vel[i][0] + forces[i][0]) * damping;
      vel[i][1] = (vel[i][1] + forces[i][1]) * damping;
      vel[i][2] = (vel[i][2] + forces[i][2]) * damping;

      // Clamp max step
      const maxStep = 1.5;
      pos[i][0] += Math.max(-maxStep, Math.min(maxStep, vel[i][0]));
      pos[i][1] += Math.max(-maxStep, Math.min(maxStep, vel[i][1]));
      pos[i][2] += Math.max(-maxStep, Math.min(maxStep, vel[i][2]));
    }
  }

  return nodes.map((n, i) =>
    n.locked
      ? n
      : {
          ...n,
          position: [
            Math.round(pos[i][0] * 100) / 100,
            Math.round(pos[i][1] * 100) / 100,
            Math.round(pos[i][2] * 100) / 100
          ]
        }
  );
};

export const computeRadialLayout = (nodes: GraphNodeData[]): GraphNodeData[] => {
  if (nodes.length <= 1) {
    return nodes.map((n) => (n.locked ? n : { ...n, position: [0, 0, 0] }));
  }
  const unlockedCount = nodes.filter((n) => !n.locked).length;
  if (unlockedCount === 0) return nodes;
  const radius = Math.max(5, unlockedCount * 1.25);
  let slot = 0;
  return nodes.map((n) => {
    if (n.locked) return n;
    const angle = (slot / unlockedCount) * Math.PI * 2;
    const y = ((slot % 3) - 1) * 1.4;
    slot++;
    return {
      ...n,
      position: [
        Math.round(Math.cos(angle) * radius * 100) / 100,
        y,
        Math.round(Math.sin(angle) * radius * 100) / 100
      ]
    };
  });
};

export type AlignMode = 'x' | 'y' | 'z' | 'grid' | 'circle';

export const alignSelectedNodes = (
  nodes: GraphNodeData[],
  selectedIds: string[],
  mode: AlignMode
): GraphNodeData[] => {
  const selSet = new Set(selectedIds);
  const targets = nodes.filter((n) => selSet.has(n.id) && !n.locked);
  if (targets.length < 2) return nodes;

  const round2 = (v: number) => Math.round(v * 100) / 100;
  const avgX = targets.reduce((sum, n) => sum + n.position[0], 0) / targets.length;
  const avgY = targets.reduce((sum, n) => sum + n.position[1], 0) / targets.length;
  const avgZ = targets.reduce((sum, n) => sum + n.position[2], 0) / targets.length;

  const posMap = new Map<string, [number, number, number]>();

  if (mode === 'x') {
    targets.forEach((n) => posMap.set(n.id, [round2(avgX), n.position[1], n.position[2]]));
  } else if (mode === 'y') {
    targets.forEach((n) => posMap.set(n.id, [n.position[0], round2(avgY), n.position[2]]));
  } else if (mode === 'z') {
    targets.forEach((n) => posMap.set(n.id, [n.position[0], n.position[1], round2(avgZ)]));
  } else if (mode === 'grid') {
    const cols = Math.ceil(Math.sqrt(targets.length));
    const rows = Math.ceil(targets.length / cols);
    const spacing = 4.2;
    targets.forEach((n, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = avgX + (col - (cols - 1) / 2) * spacing;
      const z = avgZ + (row - (rows - 1) / 2) * spacing;
      posMap.set(n.id, [round2(x), round2(avgY), round2(z)]);
    });
  } else if (mode === 'circle') {
    const radius = Math.max(3.5, targets.length * 1.15);
    targets.forEach((n, idx) => {
      const angle = (idx / targets.length) * Math.PI * 2;
      posMap.set(n.id, [
        round2(avgX + Math.cos(angle) * radius),
        round2(avgY),
        round2(avgZ + Math.sin(angle) * radius)
      ]);
    });
  }

  return nodes.map((n) => {
    const nextPos = posMap.get(n.id);
    return nextPos ? { ...n, position: nextPos } : n;
  });
};

export const computeTagClusterLayout = (nodes: GraphNodeData[]): GraphNodeData[] => {
  if (nodes.length <= 1) {
    return nodes.map((n) => (n.locked ? n : { ...n, position: [0, 0, 0] }));
  }

  const unlocked = nodes.filter((n) => !n.locked);
  if (unlocked.length === 0) return nodes;

  const groups = new Map<string, GraphNodeData[]>();
  unlocked.forEach((n) => {
    const primaryTag = (n.tags || []).find((tg) => tg.trim() !== '')?.trim() || '__untagged__';
    const list = groups.get(primaryTag) || [];
    list.push(n);
    groups.set(primaryTag, list);
  });

  const groupEntries = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  const clusterCount = groupEntries.length;
  const maxGroupSize = Math.max(...groupEntries.map(([, list]) => list.length));
  const macroRadius = clusterCount <= 1 ? 0 : Math.max(7, clusterCount * 2.8 + Math.sqrt(maxGroupSize) * 1.8);

  const round2 = (v: number) => Math.round(v * 100) / 100;
  const posMap = new Map<string, [number, number, number]>();

  groupEntries.forEach(([, members], gIdx) => {
    const macroAngle = (gIdx / Math.max(1, clusterCount)) * Math.PI * 2;
    const cx = Math.cos(macroAngle) * macroRadius;
    const cz = Math.sin(macroAngle) * macroRadius;

    if (members.length === 1) {
      posMap.set(members[0].id, [round2(cx), 0, round2(cz)]);
      return;
    }

    const innerRadius = Math.max(2.2, Math.sqrt(members.length) * 1.75);
    members.forEach((m, idx) => {
      const innerAngle = (idx / members.length) * Math.PI * 2;
      const ringFactor = members.length > 8 ? 0.55 + (idx % 2) * 0.45 : 1;
      const px = cx + Math.cos(innerAngle) * innerRadius * ringFactor;
      const pz = cz + Math.sin(innerAngle) * innerRadius * ringFactor;
      posMap.set(m.id, [round2(px), ((idx % 3) - 1) * 0.6, round2(pz)]);
    });
  });

  return nodes.map((n) => {
    const nextPos = posMap.get(n.id);
    return nextPos ? { ...n, position: nextPos } : n;
  });
};
