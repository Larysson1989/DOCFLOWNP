// ─── DOC.FLOW v2 — Sidebar Component ─────────────────────────────────────────
import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Zap,
  RefreshCw,
  Edit3,
  Shield,
  Sparkles
} from 'lucide-react';
import type { DFModule } from '../types';

interface NavItem {
  id: DFModule | 'dashboard';
  label: string;
  icon: React.ReactNode;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
    description: 'Visão geral'
  },
  {
    id: 'organizar',
    label: 'Organizar PDF',
    icon: <Layers size={18} />,
    description: 'Merge, split, reorder'
  },
  {
    id: 'otimizar',
    label: 'Otimizar',
    icon: <Zap size={18} />,
    description: 'Compress, repair'
  },
  {
    id: 'converter',
    label: 'Converter',
    icon: <RefreshCw size={18} />,
    description: 'PDF ↔ outros formatos'
  },
  {
    id: 'editar',
    label: 'Editar',
    icon: <Edit3 size={18} />,
    description: 'Texto, imagens, anotações'
  },
  {
    id: 'seguranca',
    label: 'Segurança',
    icon: <Shield size={18} />,
    description: 'Senha, assinatura, redact'
  },
  {
    id: 'ia',
    label: 'IA Gemini',
    icon: <Sparkles size={18} />,
    description: 'Resumir, traduzir, extrair'
  }
];

interface DFSidebarProps {
  activeModule: DFModule | 'dashboard' | null;
  onNavigate: (module: DFModule | 'dashboard') => void;
}

export function DFSidebar({ activeModule, onNavigate }: DFSidebarProps) {
  return (
    <aside className="df-sidebar" role="navigation" aria-label="Módulos DOC.FLOW v2">
      <div className="df-sidebar-label">Módulos</div>

      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          className={`df-nav-item ${
            activeModule === item.id ? 'df-active' : ''
          }`}
          onClick={() => onNavigate(item.id as DFModule | 'dashboard')}
          title={item.description}
          aria-current={activeModule === item.id ? 'page' : undefined}
        >
          <span className="df-nav-icon">{item.icon}</span>
          {item.label}
          {item.id === 'ia' && (
            <span className="df-badge df-badge-new" style={{ marginLeft: 'auto', fontSize: '10px' }}>
              IA
            </span>
          )}
        </button>
      ))}
    </aside>
  );
}
