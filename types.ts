import * as THREE from 'three';

export interface GraphNodeData {
  id: string;
  label: string;
  summary: string;
  fullContent: string;
  color: string;
  size: number;
  position: [number, number, number];
}

export interface GraphEdgeData {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  color: string;
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
  activeId: string | null; // ID of selected node or edge
  activeType: 'node' | 'edge' | null;
  mode: InteractionMode;
  edgeStartNodeId: string | null;
}

export interface UIPanelsState {
  tools: boolean;
  properties: boolean;
  camera: boolean;
  hints: boolean;
  filePanel: boolean; // Legacy panel, kept for compatibility if needed or merged into TopBar
}