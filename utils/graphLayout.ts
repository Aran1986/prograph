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

  return nodes.map((n, i) => ({
    ...n,
    position: [
      Math.round(pos[i][0] * 100) / 100,
      Math.round(pos[i][1] * 100) / 100,
      Math.round(pos[i][2] * 100) / 100
    ]
  }));
};

export const computeRadialLayout = (nodes: GraphNodeData[]): GraphNodeData[] => {
  if (nodes.length <= 1) {
    return nodes.map((n) => ({ ...n, position: [0, 0, 0] }));
  }
  const radius = Math.max(5, nodes.length * 1.25);
  return nodes.map((n, idx) => {
    const angle = (idx / nodes.length) * Math.PI * 2;
    const y = ((idx % 3) - 1) * 1.4;
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
