// ─── DOC.FLOW v2 — ProjectSelector ───────────────────────────────────────────
// Componente adicionado PÓS-LOGIN para seleção de sistema.
// Substituir o seletor de módulo atual no App.tsx quando integrado.
import React from 'react';
import { BarChart2, FileText, ChevronRight } from 'lucide-react';
import '../styles/global.css';

interface ProjectSelectorProps {
  onSelect: (project: 'acao3pct' | 'docflow-v2') => void;
  userEmail?: string;
}

export function ProjectSelector({ onSelect, userEmail }: ProjectSelectorProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--df-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--df-space-8)',
        fontFamily: 'var(--df-font-body)'
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 'var(--df-space-8)', textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 28 28" fill="none" style={{ margin: '0 auto var(--df-space-3)' }}>
          <rect width="28" height="28" rx="7" fill="var(--df-primary)" />
          <path d="M7 9h10M7 14h14M7 19h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <circle cx="21" cy="9" r="3" fill="var(--df-accent)" />
        </svg>
        <h1
          style={{
            fontFamily: 'var(--df-font-display)',
            fontSize: 'var(--df-text-xl)',
            fontWeight: 800,
            color: 'var(--df-text)'
          }}
        >
          DOC.FLOW <span style={{ color: 'var(--df-primary)' }}>NP</span>
        </h1>
        {userEmail && (
          <p style={{ fontSize: 'var(--df-text-sm)', color: 'var(--df-text-muted)', marginTop: 'var(--df-space-2)' }}>
            Bem-vindo, {userEmail}
          </p>
        )}
        <p style={{ fontSize: 'var(--df-text-sm)', color: 'var(--df-text-faint)', marginTop: 'var(--df-space-1)' }}>
          Selecione o sistema
        </p>
      </div>

      {/* Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--df-space-4)',
          width: '100%',
          maxWidth: '600px'
        }}
      >
        {/* Card: Ação 3% IFPF */}
        <button
          onClick={() => onSelect('acao3pct')}
          style={{
            background: 'var(--df-surface)',
            border: '2px solid var(--df-border)',
            borderRadius: 'var(--df-radius-xl)',
            padding: 'var(--df-space-6)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 180ms ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--df-space-3)',
            boxShadow: 'var(--df-shadow-sm)'
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#1064AE')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--df-border)')}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--df-radius-lg)',
              background: '#EBF2FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1064AE'
            }}
          >
            <BarChart2 size={24} />
          </div>
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--df-space-2)',
                marginBottom: 'var(--df-space-1)'
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--df-font-display)',
                  fontWeight: 700,
                  fontSize: 'var(--df-text-base)',
                  color: 'var(--df-text)'
                }}
              >
                Ação 3% IFPF
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: '#dcfce7',
                  color: '#16a34a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                ATIVO
              </span>
            </div>
            <p style={{ fontSize: 'var(--df-text-sm)', color: 'var(--df-text-muted)' }}>
              Sistema de auditoria documental para repasse IFPF
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: 'var(--df-text-xs)',
              color: '#1064AE',
              fontWeight: 600,
              marginTop: 'auto'
            }}
          >
            Acessar sistema <ChevronRight size={14} />
          </div>
        </button>

        {/* Card: DOC.FLOW v2 */}
        <button
          onClick={() => onSelect('docflow-v2')}
          style={{
            background: 'var(--df-surface)',
            border: '2px solid var(--df-border)',
            borderRadius: 'var(--df-radius-xl)',
            padding: 'var(--df-space-6)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 180ms ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--df-space-3)',
            boxShadow: 'var(--df-shadow-sm)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--df-primary)';
            e.currentTarget.style.boxShadow = 'var(--df-shadow-lg)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--df-border)';
            e.currentTarget.style.boxShadow = 'var(--df-shadow-sm)';
          }}
        >
          {/* Gradient top bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: 'linear-gradient(90deg, var(--df-primary), var(--df-accent))'
            }}
          />
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--df-radius-lg)',
              background: 'var(--df-primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--df-primary)'
            }}
          >
            <FileText size={24} />
          </div>
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--df-space-2)',
                marginBottom: 'var(--df-space-1)'
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--df-font-display)',
                  fontWeight: 700,
                  fontSize: 'var(--df-text-base)',
                  color: 'var(--df-text)'
                }}
              >
                DOC.FLOW v2
              </span>
              <span
                className="df-badge df-badge-new"
                style={{ fontSize: '10px' }}
              >
                NOVO
              </span>
            </div>
            <p style={{ fontSize: 'var(--df-text-sm)', color: 'var(--df-text-muted)' }}>
              Plataforma avançada de PDF com IA Gemini integrada
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: 'var(--df-text-xs)',
              color: 'var(--df-primary)',
              fontWeight: 600,
              marginTop: 'auto'
            }}
          >
            Explorar plataforma <ChevronRight size={14} />
          </div>
        </button>
      </div>
    </div>
  );
}
