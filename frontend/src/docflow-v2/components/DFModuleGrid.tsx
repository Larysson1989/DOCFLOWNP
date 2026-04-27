// ─── DOC.FLOW v2 — Module Grid (Dashboard quick-access) ──────────────────────
import React from 'react';
import {
  Layers,
  Zap,
  RefreshCw,
  Edit3,
  Shield,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import type { DFModule } from '../types';

const MODULES = [
  {
    id: 'organizar' as DFModule,
    label: 'Organizar PDF',
    description: 'Mescle, divida, reordene e manipule páginas de PDFs com facilidade.',
    icon: <Layers size={24} />,
    tags: ['Merge', 'Split', 'Reorder', 'Rotate', 'Insert']
  },
  {
    id: 'otimizar' as DFModule,
    label: 'Otimizar',
    description: 'Comprima arquivos, repare PDFs corrompidos e controle a qualidade.',
    icon: <Zap size={24} />,
    tags: ['Compress', 'Repair', 'Quality']
  },
  {
    id: 'converter' as DFModule,
    label: 'Converter',
    description: 'Converta documentos para e a partir de PDF em múltiplos formatos.',
    icon: <RefreshCw size={24} />,
    tags: ['→ PDF', 'PDF →', 'Word', 'Excel', 'Imagem']
  },
  {
    id: 'editar' as DFModule,
    label: 'Editar',
    description: 'Edite texto, imagens, formas, anotações e aplique marcações.',
    icon: <Edit3 size={24} />,
    tags: ['Texto', 'Imagens', 'Anotações', 'Crop', 'Numeração']
  },
  {
    id: 'seguranca' as DFModule,
    label: 'Segurança',
    description: 'Proteja com senha, adicione assinatura, watermark e redação.',
    icon: <Shield size={24} />,
    tags: ['Senha', 'Assinatura', 'Watermark', 'Redact']
  },
  {
    id: 'ia' as DFModule,
    label: 'IA Gemini',
    description: 'Resuma, traduza e extraia dados de documentos com Google Gemini.',
    icon: <Sparkles size={24} />,
    tags: ['Resumir', 'Traduzir', 'Extrair dados'],
    highlight: true
  }
];

interface DFModuleGridProps {
  onSelectModule: (module: DFModule) => void;
}

export function DFModuleGrid({ onSelectModule }: DFModuleGridProps) {
  return (
    <div className="df-modules-grid">
      {MODULES.map(mod => (
        <div
          key={mod.id}
          className="df-module-card df-card-clickable"
          onClick={() => onSelectModule(mod.id)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onSelectModule(mod.id)}
          aria-label={`Acessar módulo ${mod.label}`}
          style={mod.highlight ? { borderColor: 'var(--df-primary-mid)' } : {}}
        >
          <div
            className="df-module-icon"
            style={
              mod.highlight
                ? {
                    background: 'linear-gradient(135deg, var(--df-primary-light), var(--df-accent-light))',
                    color: 'var(--df-primary)'
                  }
                : {}
            }
          >
            {mod.icon}
          </div>

          <div>
            <div className="df-module-title">
              {mod.label}
              {mod.highlight && (
                <span
                  className="df-badge df-badge-new"
                  style={{ marginLeft: '8px', fontSize: '10px', verticalAlign: 'middle' }}
                >
                  IA
                </span>
              )}
            </div>
            <div className="df-module-desc">{mod.description}</div>
          </div>

          <div className="df-module-tags">
            {mod.tags.map(tag => (
              <span key={tag} className="df-tag">{tag}</span>
            ))}
          </div>

          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: 'var(--df-text-xs)',
              color: 'var(--df-primary)',
              fontWeight: 600
            }}
          >
            Acessar módulo <ArrowRight size={14} />
          </div>
        </div>
      ))}
    </div>
  );
}
