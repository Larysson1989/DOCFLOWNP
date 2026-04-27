// ─── DOC.FLOW v2 — Module Placeholder (em desenvolvimento) ───────────────────
import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import type { DFModule } from '../types';

const MODULE_LABELS: Record<DFModule, string> = {
  organizar: 'Organizar PDF',
  otimizar: 'Otimizar',
  converter: 'Converter',
  editar: 'Editar',
  seguranca: 'Segurança',
  ia: 'IA Gemini'
};

interface DFModulePlaceholderProps {
  module: DFModule;
  onBack: () => void;
}

export function DFModulePlaceholder({ module, onBack }: DFModulePlaceholderProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        textAlign: 'center',
        gap: 'var(--df-space-4)'
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 'var(--df-radius-xl)',
          background: 'var(--df-primary-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--df-primary)'
        }}
      >
        <Construction size={36} />
      </div>

      <div>
        <h2
          style={{
            fontFamily: 'var(--df-font-display)',
            fontSize: 'var(--df-text-lg)',
            fontWeight: 700,
            color: 'var(--df-text)',
            marginBottom: 'var(--df-space-2)'
          }}
        >
          {MODULE_LABELS[module]}
        </h2>
        <p style={{ fontSize: 'var(--df-text-sm)', color: 'var(--df-text-muted)', maxWidth: '36ch' }}>
          Este módulo está em desenvolvimento e será entregue nas próximas fases.
          A estrutura base já está isolada e pronta para implementação.
        </p>
      </div>

      <button className="df-btn df-btn-secondary" onClick={onBack}>
        <ArrowLeft size={16} /> Voltar ao Dashboard
      </button>
    </div>
  );
}
