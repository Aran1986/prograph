import { GraphEdgeData, GraphNodeData } from '../types';

export interface NodeDegreeStat {
  node: GraphNodeData;
  degree: number;
  inDegree: number;
  outDegree: number;
}

export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  components: number;
  isolatedNodes: GraphNodeData[];
  hubs: NodeDegreeStat[];
}

export interface ShortestPathResult {
  found: boolean;
  nodeIds: string[];
  edgeIds: string[];
}

export const computeGraphMetrics = (nodes: GraphNodeData[], edges: GraphEdgeData[]): GraphMetrics => {
  const nodeCount = nodes.length;
  const edgeCount = edges.length;

  const adj = new Map<string, Set<string>>();
  const inCount = new Map<string, number>();
  const outCount = new Map<string, number>();

  nodes.forEach((n) => {
    adj.set(n.id, new Set());
    inCount.set(n.id, 0);
    outCount.set(n.id, 0);
  });

  const uniquePairs = new Set<string>();

  edges.forEach((e) => {
    if (!adj.has(e.fromId) || !adj.has(e.toId)) return;
    adj.get(e.fromId)!.add(e.toId);
    adj.get(e.toId)!.add(e.fromId);

    if (e.fromId !== e.toId) {
      uniquePairs.add([e.fromId, e.toId].sort().join('::'));
    }

    if (e.direction === 'target-to-source') {
      outCount.set(e.toId, (outCount.get(e.toId) || 0) + 1);
      inCount.set(e.fromId, (inCount.get(e.fromId) || 0) + 1);
    } else if (e.direction === 'source-to-target') {
      outCount.set(e.fromId, (outCount.get(e.fromId) || 0) + 1);
      inCount.set(e.toId, (inCount.get(e.toId) || 0) + 1);
    } else {
      outCount.set(e.fromId, (outCount.get(e.fromId) || 0) + 1);
      inCount.set(e.fromId, (inCount.get(e.fromId) || 0) + 1);
      outCount.set(e.toId, (outCount.get(e.toId) || 0) + 1);
      inCount.set(e.toId, (inCount.get(e.toId) || 0) + 1);
    }
  });

  const density = nodeCount > 1 ? (2 * uniquePairs.size) / (nodeCount * (nodeCount - 1)) : 0;

  // Connected components via BFS
  const visited = new Set<string>();
  let components = 0;
  nodes.forEach((n) => {
    if (visited.has(n.id)) return;
    components += 1;
    const queue: string[] = [n.id];
    visited.add(n.id);
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const neighbors = adj.get(curr);
      if (!neighbors) continue;
      neighbors.forEach((nextId) => {
        if (!visited.has(nextId)) {
          visited.add(nextId);
          queue.push(nextId);
        }
      });
    }
  });

  const totalEdgesPerNode = new Map<string, number>();
  nodes.forEach((n) => totalEdgesPerNode.set(n.id, 0));
  edges.forEach((e) => {
    if (totalEdgesPerNode.has(e.fromId)) {
      totalEdgesPerNode.set(e.fromId, totalEdgesPerNode.get(e.fromId)! + 1);
    }
    if (e.toId !== e.fromId && totalEdgesPerNode.has(e.toId)) {
      totalEdgesPerNode.set(e.toId, totalEdgesPerNode.get(e.toId)! + 1);
    }
  });

  const hubs: NodeDegreeStat[] = nodes
    .map((node) => ({
      node,
      degree: totalEdgesPerNode.get(node.id) || 0,
      inDegree: inCount.get(node.id) || 0,
      outDegree: outCount.get(node.id) || 0
    }))
    .sort((a, b) => b.degree - a.degree);

  const isolatedNodes = hubs.filter((h) => h.degree === 0).map((h) => h.node);

  return {
    nodeCount,
    edgeCount,
    density,
    components,
    isolatedNodes,
    hubs
  };
};

export const findShortestPath = (
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  startId: string,
  endId: string,
  respectDirection = false
): ShortestPathResult => {
  if (!startId || !endId) return { found: false, nodeIds: [], edgeIds: [] };
  if (startId === endId) return { found: true, nodeIds: [startId], edgeIds: [] };

  const nodeIdsSet = new Set(nodes.map((n) => n.id));
  if (!nodeIdsSet.has(startId) || !nodeIdsSet.has(endId)) {
    return { found: false, nodeIds: [], edgeIds: [] };
  }

  const adj = new Map<string, { nextId: string; edgeId: string }[]>();
  nodes.forEach((n) => adj.set(n.id, []));

  edges.forEach((e) => {
    if (!nodeIdsSet.has(e.fromId) || !nodeIdsSet.has(e.toId)) return;
    if (!respectDirection || e.direction === 'bidirectional') {
      adj.get(e.fromId)!.push({ nextId: e.toId, edgeId: e.id });
      adj.get(e.toId)!.push({ nextId: e.fromId, edgeId: e.id });
    } else if (e.direction === 'source-to-target') {
      adj.get(e.fromId)!.push({ nextId: e.toId, edgeId: e.id });
    } else if (e.direction === 'target-to-source') {
      adj.get(e.toId)!.push({ nextId: e.fromId, edgeId: e.id });
    }
  });

  const visited = new Set<string>([startId]);
  const parent = new Map<string, { prevNodeId: string; viaEdgeId: string }>();
  const queue: string[] = [startId];

  let reached = false;
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === endId) {
      reached = true;
      break;
    }
    const neighbors = adj.get(curr) || [];
    for (const step of neighbors) {
      if (!visited.has(step.nextId)) {
        visited.add(step.nextId);
        parent.set(step.nextId, { prevNodeId: curr, viaEdgeId: step.edgeId });
        queue.push(step.nextId);
      }
    }
  }

  if (!reached) {
    return { found: false, nodeIds: [], edgeIds: [] };
  }

  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  let cursor: string | undefined = endId;

  while (cursor) {
    nodeIds.unshift(cursor);
    const p = parent.get(cursor);
    if (!p) break;
    edgeIds.unshift(p.viaEdgeId);
    cursor = p.prevNodeId;
  }

  return { found: true, nodeIds, edgeIds };
};

export const computeDegreeScaledSizes = (nodes: GraphNodeData[], edges: GraphEdgeData[]): Map<string, number> => {
  const degrees = new Map<string, number>();
  nodes.forEach((n) => degrees.set(n.id, 0));
  edges.forEach((e) => {
    if (degrees.has(e.fromId)) degrees.set(e.fromId, degrees.get(e.fromId)! + 1);
    if (e.toId !== e.fromId && degrees.has(e.toId)) degrees.set(e.toId, degrees.get(e.toId)! + 1);
  });

  let maxDeg = 0;
  degrees.forEach((d) => {
    if (d > maxDeg) maxDeg = d;
  });

  const result = new Map<string, number>();
  nodes.forEach((n) => {
    const d = degrees.get(n.id) || 0;
    const ratio = maxDeg > 0 ? d / maxDeg : 0;
    const scaled = Math.round((0.8 + ratio * 1.4) * 100) / 100;
    result.set(n.id, scaled);
  });
  return result;
};
