import {
  GraphNodeData,
  GraphEdgeData,
  Language,
  ChatMessage,
  AIArchitectDefinitions,
  AISuggestion,
  AttachedFile,
  AIMode
} from "../types";

async function callAiProxy(methodName: string, ...args: any[]) {
  const response = await fetch(`/api/ai/${methodName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ args })
  });
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Server error (${response.status})`);
  }
  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data.result;
}

export const generateImage = async (prompt: string): Promise<string | null> => {
  return callAiProxy('generateImage', prompt);
};

export const generateModeContent = async (
  item: GraphNodeData | GraphEdgeData,
  mode: AIMode,
  targetLanguage: Language
): Promise<string> => {
  return callAiProxy('generateModeContent', item, mode, targetLanguage);
};

export const generateFinalProjectArtifact = async (
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  mode: AIMode,
  targetLanguage: Language
): Promise<string> => {
  return callAiProxy('generateFinalProjectArtifact', nodes, edges, mode, targetLanguage);
};

export const generateCakePresentation = async (item: GraphNodeData | GraphEdgeData, targetLanguage: Language) => {
  return callAiProxy('generateCakePresentation', item, targetLanguage);
};

export const generateSmartGuide = async (item: GraphNodeData | GraphEdgeData, nodes: GraphNodeData[], edges: GraphEdgeData[], lang: Language) => {
  return callAiProxy('generateSmartGuide', item, nodes, edges, lang);
};

export const generatePresentation = async (item: GraphNodeData | GraphEdgeData, lang: Language) => {
  return callAiProxy('generatePresentation', item, lang);
};

export const chatWithAI = async (
  message: string,
  history: ChatMessage[],
  currentItem: any,
  allNodes: GraphNodeData[],
  allEdges: GraphEdgeData[],
  targetLanguage: Language
): Promise<string> => {
  return callAiProxy('chatWithAI', message, history, currentItem, allNodes, allEdges, targetLanguage);
};

export const generateGraphFromFiles = async (
  files: AttachedFile[],
  defs: AIArchitectDefinitions,
  lang: Language
): Promise<{ nodes: any[]; edges: any[] }> => {
  return callAiProxy('generateGraphFromFiles', files, defs, lang);
};

export const getBrainstormSuggestions = async (
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  defs: AIArchitectDefinitions,
  feedback: string,
  lang: Language
): Promise<AISuggestion[]> => {
  return callAiProxy('getBrainstormSuggestions', nodes, edges, defs, feedback, lang);
};

export const autoCompleteProject = async (
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
  defs: AIArchitectDefinitions,
  lang: Language
): Promise<any> => {
  return callAiProxy('autoCompleteProject', nodes, edges, defs, lang);
};
