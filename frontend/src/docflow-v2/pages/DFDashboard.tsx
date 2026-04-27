// ─── DOC.FLOW v2 — Dashboard Page ────────────────────────────────────────────
import React from 'react';
import { FileText, Cpu, CheckCircle, TrendingUp } from 'lucide-react';
import { DFModuleGrid } from '../components/DFModuleGrid';
import { DFModulePlaceholder } from '../components/DFModulePlaceholder';
import type { DFModule } from '../types';

interface DFDashboardProps {
  activeModule: DFModule | null;
  onSelectModule: (module: DFModule) => void;
  onBackToDashboard: () => void;
}

const STATS = [
  { value: '6', label: 'Módulos', icon: <Cpu size={18} /> },
  { value: 'IA', label: 'Gemini Integrado', icon: <CheckCircle size={18} /> },
  { value: '100%', label: 'Isolado', icon: <CheckCircle size={18} /> },
  { value: 'v2', label: 'Versão', icon: <TrendingUp size={18} /> }
];

export function DFDashboard({ activeModule, onSelectModule, onBackToDashboard }: DFDashboardProps) {
  if (activeModule) {
    return (
      <DFModulePlaceholder
        module={activeModule}
        onBack={onBackToDashboard}
      />
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="df-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--df-space-3)', marginBottom: 'var(--df-space-2)' }}>
          <h1 className="df-page-title" style={{ marginBottom: 0 }}>DOC.FLOW v2</h1>
          <span className="df-badge df-badge-new">NOVO</span>
        </div>
        <p className="df-page-subtitle">
          Plataforma avançada de gestão, edição e inteligência artificial para documentos PDF.
        </p>
      </div>

      {/* Stats */}
      <div className="df-stats-strip">
        {STATS.map(stat => (
          <div key={stat.label} className="df-stat">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--df-space-2)',
                color: 'var(--df-primary)',
                marginBottom: 'var(--df-space-1)'
              }}
            >
              {stat.icon}
            </div>
            <div className="df-stat-value">{stat.value}</div>
            <div className="df-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Module grid */}
      <div style={{ marginBottom: 'var(--df-space-6)' }}>
        <h2
          style={{
            fontFamily: 'var(--df-font-display)',
            fontSize: 'var(--df-text-lg)',
            fontWeight: 700,
            color: 'var(--df-text)',
            marginBottom: 'var(--df-space-4)'
          }}
        >
          Acesso rápido
        </h2>
        <DFModuleGrid onSelectModule={onSelectModule} />
      </div>
    </div>
  );
}
