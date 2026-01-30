import * as THREE from 'three';

export type Language = 'fa' | 'en';

export interface AttachedFile {
  id: string;
  name: string;
  type: string; // MIME type (image/png, text/plain, etc.)
  content: string; // Base64 string
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