import * as THREE from 'three';

export type Language = 'fa' | 'en';
export type AIMode = 
  | 'presentation' 
  | 'writing' 
  | 'coding' 
  | 'law' 
  | 'chemistry'
  | 'investigation'
  | 'journalism'
  | 'genealogy'
  | 'network'
  | 'supplyChain'
  | 'seo'
  | 'financial'
  | 'pkm'
  | 'mindMap'
  | 'gameDesign';

export type NodeShape = 'sphere' | 'box' | 'cylinder' | 'capsule' | 'torus' | 'cone';

export interface AttachedFile {
  id: string;
  name: string;
  type: string; // MIME type (image/png, text/plain, etc.)
  content: string; // Base64 string
  isAiGenerated?: boolean; // Flag for shadow copies
  originalFileId?: string; // Reference to original if this is a shadow copy
}

export interface GraphNodeData {
  id: string;
  label: string;
  summary: string;
  fullContent: string;
  color: string;
  size: number;
  position: [number, number, number];
  files: AttachedFile[];
  shape?: NodeShape;
}

export type EdgeDirection = 'bidirectional' | 'source-to-target' | 'target-to-source';

export interface GraphEdgeData {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  color: string;
  size: number;
  summary: string;
  fullContent: string;
  files: AttachedFile[];
  direction: EdgeDirection; // Added direction field
}

export interface CameraState {
  x: number;
  y: number;
  z: number;
}

export type InteractionMode = 'select' | 'edge-start' | 'edge-finish';

export interface AppState {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  selectedIds: string[];
  activeType: 'node' | 'edge' | null;
  mode: InteractionMode;
  edgeStartNodeId: string | null;
  appLanguage: Language; 
  aiMode: AIMode; // New field for AI Mode
}

export interface UIPanelsState {
  tools: boolean;
  properties: boolean;
  camera: boolean;
  hints: boolean;
  filePanel: boolean; 
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface AIArchitectDefinitions {
  nodeDefinition: string; // e.g. "Characters in the novel"
  edgeDefinition: string; // e.g. "Conflicts between characters"
  projectGoals: string;   // e.g. "Make the butler the killer"
}

export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  type: 'add_node' | 'add_edge' | 'modify_content' | 'delete_item';
  data: any; // The payload to apply
  status: 'pending' | 'accepted' | 'rejected';
}