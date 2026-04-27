// ─── DOC.FLOW v2 — Header Component ──────────────────────────────────────────
import React from 'react';
import { LogOut, Moon, Sun } from 'lucide-react';

interface DFHeaderProps {
  userEmail?: string;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onLogout?: () => void;
}

function getInitials(email: string): string {
  const parts = email.split('@')[0].split('.');
  return parts
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('');
}

export function DFHeader({
  userEmail = '',
  isDarkMode = false,
  onToggleTheme,
  onLogout
}: DFHeaderProps) {
  return (
    <header className="df-header">
      {/* Logo DOC.FLOW v2 */}
      <div className="df-header-logo">
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          aria-label="DOC.FLOW v2 logo"
        >
          <rect width="28" height="28" rx="7" fill="var(--df-primary)" />
          <path
            d="M7 9h10M7 14h14M7 19h8"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="21" cy="9" r="3" fill="var(--df-accent)" />
        </svg>
        <span>DOC.FLOW <span className="df-accent-text">v2</span></span>
      </div>

      <div className="df-header-spacer" />

      <div className="df-header-actions">
        {/* Theme toggle */}
        {onToggleTheme && (
          <button
            className="df-btn df-btn-ghost df-btn-sm"
            onClick={onToggleTheme}
            aria-label={isDarkMode ? 'Modo claro' : 'Modo escuro'}
            title={isDarkMode ? 'Modo claro' : 'Modo escuro'}
          >
            {isDarkMode
              ? <Sun size={16} />
              : <Moon size={16} />
            }
          </button>
        )}

        {/* Avatar + email */}
        {userEmail && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--df-space-2)' }}>
            <div className="df-avatar">
              {getInitials(userEmail) || '?'}
            </div>
            <span style={{ fontSize: 'var(--df-text-sm)', color: 'var(--df-text-muted)' }}>
              {userEmail}
            </span>
          </div>
        )}

        {/* Logout */}
        {onLogout && (
          <button
            className="df-btn df-btn-ghost df-btn-sm"
            onClick={onLogout}
            aria-label="Sair"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
