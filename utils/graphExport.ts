import { GraphEdgeData, GraphNodeData, Language } from '../types';

const stripHtml = (html: string): string => {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const escapeMermaidLabel = (text: string): string => {
  return (text || 'Item')
    .replace(/"/g, "'")
    .replace(/[\r\n]+/g, ' ')
    .trim() || 'Item';
};

export const generateMermaidDiagram = (nodes: GraphNodeData[], edges: GraphEdgeData[]): string => {
  const idMap = new Map<string, string>();
  nodes.forEach((n, idx) => {
    idMap.set(n.id, `N${idx + 1}`);
  });

  const lines: string[] = ['graph LR'];
  nodes.forEach((n) => {
    const varId = idMap.get(n.id)!;
    const label = escapeMermaidLabel(n.label);
    if (n.shape === 'box') {
      lines.push(`  ${varId}["${label}"]`);
    } else if (n.shape === 'cylinder') {
      lines.push(`  ${varId}[("${label}")]`);
    } else if (n.shape === 'cone') {
      lines.push(`  ${varId}{"${label}"}`);
    } else {
      lines.push(`  ${varId}(("${label}"))`);
    }
  });

  edges.forEach((e) => {
    const fromVar = idMap.get(e.fromId);
    const toVar = idMap.get(e.toId);
    if (!fromVar || !toVar) return;
    const edgeLabel = e.label ? escapeMermaidLabel(e.label) : '';
    if (e.direction === 'target-to-source') {
      lines.push(edgeLabel ? `  ${toVar} -->|"${edgeLabel}"| ${fromVar}` : `  ${toVar} --> ${fromVar}`);
    } else if (e.direction === 'bidirectional') {
      lines.push(edgeLabel ? `  ${fromVar} <-->|"${edgeLabel}"| ${toVar}` : `  ${fromVar} <--> ${toVar}`);
    } else {
      lines.push(edgeLabel ? `  ${fromVar} -->|"${edgeLabel}"| ${toVar}` : `  ${fromVar} --> ${toVar}`);
    }
  });

  return lines.join('\n');
};

export const generateMarkdownDocument = (
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  projectTitle: string,
  lang: Language
): string => {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const sections: string[] = [];
  sections.push(`# ${projectTitle}`);
  sections.push('');

  nodes.forEach((n, idx) => {
    sections.push(`## ${idx + 1}. ${n.label}`);
    if (n.tags && n.tags.length > 0) {
      sections.push(`**Tags:** ${n.tags.map((tg) => `#${tg}`).join(' ')}`);
    }
    if (n.summary) {
      sections.push(`> ${n.summary}`);
    }
    const body = n.fullContent ? stripHtml(n.fullContent) : '';
    if (body) {
      sections.push('');
      sections.push(body);
    }

    const relatedEdges = edges.filter((e) => e.fromId === n.id || e.toId === n.id);
    if (relatedEdges.length > 0) {
      sections.push('');
      sections.push(lang === 'fa' ? '### اتصالات' : '### Connections');
      relatedEdges.forEach((ed) => {
        const isOut = ed.fromId === n.id;
        const other = nodeMap.get(isOut ? ed.toId : ed.fromId);
        if (!other) return;
        const arrow = ed.direction === 'bidirectional' ? '↔' : isOut ? '→' : '←';
        sections.push(`- ${arrow} **${other.label}**${ed.label ? ` (${ed.label})` : ''}`);
      });
    }
    sections.push('');
  });

  sections.push('## Mermaid Graph');
  sections.push('```mermaid');
  sections.push(generateMermaidDiagram(nodes, edges));
  sections.push('```');

  return sections.join('\n');
};
