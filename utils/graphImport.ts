import { EdgeDirection, GraphEdgeData, GraphNodeData, NodeShape } from '../types';
import { computeForceDirectedLayout } from './graphLayout';

export type TextImportFormat = 'auto' | 'mermaid' | 'outline';

const PALETTE = ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'];

const parseMermaidNodeToken = (token: string): { key: string; label: string; shape?: NodeShape } => {
  const trimmed = token.trim();
  const cleanQuotes = (s: string) => s.trim().replace(/^["']|["']$/g, '').trim();

  // Key((Label))
  let m = trimmed.match(/^([A-Za-z0-9_\-\u0600-\u06FF]+)\s*\(\(([\s\S]+?)\)\)$/);
  if (m) return { key: m[1], label: cleanQuotes(m[2]), shape: 'sphere' };

  // Key[(Label)]
  m = trimmed.match(/^([A-Za-z0-9_\-\u0600-\u06FF]+)\s*\[\(([\s\S]+?)\)\]$/);
  if (m) return { key: m[1], label: cleanQuotes(m[2]), shape: 'cylinder' };

  // Key[Label]
  m = trimmed.match(/^([A-Za-z0-9_\-\u0600-\u06FF]+)\s*\[([\s\S]+?)\]$/);
  if (m) return { key: m[1], label: cleanQuotes(m[2]), shape: 'box' };

  // Key(Label)
  m = trimmed.match(/^([A-Za-z0-9_\-\u0600-\u06FF]+)\s*\(([\s\S]+?)\)$/);
  if (m) return { key: m[1], label: cleanQuotes(m[2]), shape: 'capsule' };

  // Key{Label}
  m = trimmed.match(/^([A-Za-z0-9_\-\u0600-\u06FF]+)\s*\{([\s\S]+?)\}$/);
  if (m) return { key: m[1], label: cleanQuotes(m[2]), shape: 'cone' };

  const keyOnly = cleanQuotes(trimmed);
  return { key: keyOnly, label: keyOnly };
};

export const parseMermaidToGraph = (raw: string): { nodes: GraphNodeData[]; edges: GraphEdgeData[] } => {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('%%'));

  const nodeMap = new Map<string, { label: string; shape?: NodeShape }>();
  const rawEdges: { fromKey: string; toKey: string; label: string; direction: EdgeDirection }[] = [];

  const ensureNode = (token: string) => {
    const parsed = parseMermaidNodeToken(token);
    if (!parsed.key) return '';
    const existing = nodeMap.get(parsed.key);
    if (!existing) {
      nodeMap.set(parsed.key, { label: parsed.label, shape: parsed.shape });
    } else {
      if (parsed.label !== parsed.key) existing.label = parsed.label;
      if (parsed.shape) existing.shape = parsed.shape;
    }
    return parsed.key;
  };

  const edgeRegex =
    /^(.+?)\s*(<-->|<->|-->|---|-\.->|==>)\s*(?:\|([^|]+)\|\s*)?(.+)$/;

  for (const line of lines) {
    if (/^(graph|flowchart|subgraph|end|classDef|class|style|linkStyle|click)\b/i.test(line)) {
      continue;
    }
    const cleanLine = line.replace(/;+$/, '').trim();
    const match = cleanLine.match(edgeRegex);
    if (match) {
      const leftRaw = match[1].trim();
      const arrow = match[2];
      const edgeLabel = (match[3] || '').trim();
      const rightRaw = match[4].trim();

      const fromKey = ensureNode(leftRaw);
      const toKey = ensureNode(rightRaw);
      if (fromKey && toKey && fromKey !== toKey) {
        const direction: EdgeDirection =
          arrow === '<-->' || arrow === '<->' || arrow === '---' ? 'bidirectional' : 'source-to-target';
        rawEdges.push({ fromKey, toKey, label: edgeLabel, direction });
      }
      continue;
    }

    // Standalone node line like `A[Node Name]`
    if (/^[A-Za-z0-9_\-\u0600-\u06FF]+\s*[\[\(\{]/.test(cleanLine)) {
      ensureNode(cleanLine);
    }
  }

  const keys = Array.from(nodeMap.keys());
  const idByKey = new Map<string, string>();
  const nodes: GraphNodeData[] = keys.map((key, idx) => {
    const info = nodeMap.get(key)!;
    const id = crypto.randomUUID();
    idByKey.set(key, id);
    const angle = (idx / Math.max(1, keys.length)) * Math.PI * 2;
    const r = Math.max(4, keys.length * 1.1);
    return {
      id,
      label: info.label || key,
      summary: '',
      fullContent: '',
      color: PALETTE[idx % PALETTE.length],
      size: 1,
      shape: info.shape || 'sphere',
      position: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      files: [],
      tags: ['imported']
    };
  });

  const edges: GraphEdgeData[] = rawEdges
    .map((e): GraphEdgeData | null => {
      const fromId = idByKey.get(e.fromKey);
      const toId = idByKey.get(e.toKey);
      if (!fromId || !toId) return null;
      return {
        id: crypto.randomUUID(),
        fromId,
        toId,
        label: e.label,
        color: '#64748b',
        size: 0.11,
        summary: '',
        fullContent: '',
        files: [],
        direction: e.direction
      };
    })
    .filter((e): e is GraphEdgeData => e !== null);

  return {
    nodes: nodes.length > 1 ? computeForceDirectedLayout(nodes, edges, 120) : nodes,
    edges
  };
};

export const parseOutlineToGraph = (raw: string): { nodes: GraphNodeData[]; edges: GraphEdgeData[] } => {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const stack: { depth: number; id: string }[] = [];
  const nodes: GraphNodeData[] = [];
  const edges: GraphEdgeData[] = [];

  for (const line of lines) {
    let depth = 0;
    let label = line.trim();

    const headingMatch = label.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      depth = headingMatch[1].length - 1;
      label = headingMatch[2].trim();
    } else {
      const expanded = line.replace(/\t/g, '  ');
      const indentMatch = expanded.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.+)$/);
      if (indentMatch) {
        depth = Math.floor(indentMatch[1].length / 2) + 1;
        label = indentMatch[2].trim();
      } else {
        const leadingSpaces = expanded.match(/^(\s*)/)?.[1].length ?? 0;
        depth = Math.floor(leadingSpaces / 2);
      }
    }

    if (!label) continue;

    // Optional inline summary separated by `:` or ` - `
    let summary = '';
    const colonIdx = label.indexOf(': ');
    if (colonIdx > 0 && colonIdx < label.length - 2) {
      summary = label.slice(colonIdx + 2).trim();
      label = label.slice(0, colonIdx).trim();
    }

    const id = crypto.randomUUID();
    const idx = nodes.length;
    const angle = idx * 0.8;
    const r = 2 + idx * 0.6;

    nodes.push({
      id,
      label,
      summary,
      fullContent: '',
      color: PALETTE[depth % PALETTE.length],
      size: Math.max(0.85, 1.3 - depth * 0.12),
      shape: depth === 0 ? 'sphere' : depth === 1 ? 'box' : 'capsule',
      position: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
      files: [],
      tags: ['outline']
    });

    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    if (stack.length > 0) {
      const parent = stack[stack.length - 1];
      edges.push({
        id: crypto.randomUUID(),
        fromId: parent.id,
        toId: id,
        label: '',
        color: '#64748b',
        size: 0.1,
        summary: '',
        fullContent: '',
        files: [],
        direction: 'source-to-target'
      });
    }
    stack.push({ depth, id });
  }

  return {
    nodes: nodes.length > 1 ? computeForceDirectedLayout(nodes, edges, 120) : nodes,
    edges
  };
};

export const parseTextToGraph = (
  raw: string,
  format: TextImportFormat = 'auto'
): { nodes: GraphNodeData[]; edges: GraphEdgeData[]; detected: 'mermaid' | 'outline' } => {
  const trimmed = raw.trim();
  if (!trimmed) return { nodes: [], edges: [], detected: 'outline' };

  const looksLikeMermaid =
    /^(graph|flowchart)\s+/im.test(trimmed) || /(-->|<-->|-\.->|==>)/.test(trimmed);

  const chosen = format === 'auto' ? (looksLikeMermaid ? 'mermaid' : 'outline') : format;
  const result = chosen === 'mermaid' ? parseMermaidToGraph(trimmed) : parseOutlineToGraph(trimmed);
  return { ...result, detected: chosen };
};
