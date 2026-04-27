// ─── DOC.FLOW v2 — Store (state management simples sem dependência externa) ──
import { useState, createContext, useContext } from 'react';
import type { DFPDFFile, DFModule } from '../types';

export interface DocflowStore {
  files: DFPDFFile[];
  activeModule: DFModule | null;
  selectedFiles: string[];
  addFiles: (files: DFPDFFile[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  setActiveModule: (module: DFModule | null) => void;
  toggleSelectFile: (id: string) => void;
  clearSelection: () => void;
}

// Contexto isolado com prefixo df
import React from 'react';
export const DocflowContext = createContext<DocflowStore | null>(null);

export function useDocflowStore(): DocflowStore {
  const ctx = useContext(DocflowContext);
  if (!ctx) throw new Error('[DOC.FLOW v2] useDocflowStore must be used inside DocflowProvider');
  return ctx;
}

export function useDocflowStoreProvider(): DocflowStore {
  const [files, setFiles] = useState<DFPDFFile[]>([]);
  const [activeModule, setActiveModuleState] = useState<DFModule | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const addFiles = (newFiles: DFPDFFile[]) =>
    setFiles(prev => [...prev, ...newFiles]);

  const removeFile = (id: string) =>
    setFiles(prev => prev.filter(f => f.id !== id));

  const clearFiles = () => setFiles([]);

  const setActiveModule = (module: DFModule | null) =>
    setActiveModuleState(module);

  const toggleSelectFile = (id: string) =>
    setSelectedFiles(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const clearSelection = () => setSelectedFiles([]);

  return {
    files,
    activeModule,
    selectedFiles,
    addFiles,
    removeFile,
    clearFiles,
    setActiveModule,
    toggleSelectFile,
    clearSelection
  };
}
