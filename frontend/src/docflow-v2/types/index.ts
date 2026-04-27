// ─── DOC.FLOW v2 — Types ────────────────────────────────────────────────────
// ISOLADO: não impacta o sistema Ação 3% IFPF

export type DFModule =
  | 'organizar'
  | 'otimizar'
  | 'converter'
  | 'editar'
  | 'seguranca'
  | 'ia';

export interface DFUser {
  email: string;
  name: string;
}

export interface DFModuleCard {
  id: DFModule;
  label: string;
  description: string;
  icon: string;
  route: string;
  subItems: string[];
}

export interface DFPDFFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
  pages?: number;
}

export interface DFAIResult {
  type: 'resumo' | 'traducao' | 'extracao';
  content: string;
  createdAt: Date;
}

export interface DFNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}
