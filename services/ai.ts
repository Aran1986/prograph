import { GraphNodeData, GraphEdgeData, Language, ChatMessage, AIArchitectDefinitions, AISuggestion, AttachedFile, AIMode } from "../types";

async function callAiProxy(methodName: string, ...args: any[]) {
  const response = await fetch(`/api/ai/${methodName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ args })
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
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

export const generateSmartGuide = async (item: any, nodes: any, edges: any, lang: any) => {
  return callAiProxy('generateSmartGuide', item, nodes, edges, lang);
};

export const generatePresentation = async (item: any, lang: any) => {
  return callAiProxy('generatePresentation', item, lang);
};

export const chatWithAI = async (message: string, history: ChatMessage[], currentItem: any, allNodes: any[], allEdges: any[], targetLanguage: Language) => {
  return callAiProxy('chatWithAI', message, history, currentItem, allNodes, allEdges, targetLanguage);
};

export const generateGraphFromFiles = async (files: AttachedFile[], defs: AIArchitectDefinitions, lang: Language): Promise<{ nodes: any[], edges: any[] }> => {
  return callAiProxy('generateGraphFromFiles', files, defs, lang);
};

export const getBrainstormSuggestions = async (nodes: any[], edges: any[], defs: any, feedback: string): Promise<AISuggestion[]> => {
  return callAiProxy('getBrainstormSuggestions', nodes, edges, defs, feedback);
};

export const autoCompleteProject = async (nodes: any[], edges: any[], defs: any): Promise<any> => {
  return callAiProxy('autoCompleteProject', nodes, edges, defs);
};
