// ─── DOC.FLOW v2 — Root App Component ────────────────────────────────────────
// Ponto de entrada isolado. Não interfere com Ação 3% IFPF.
import React, { useState } from 'react';
import { DFHeader } from './components/DFHeader';
import { DFSidebar } from './components/DFSidebar';
import { DFDashboard } from './pages/DFDashboard';
import type { DFModule } from './types';
import './styles/global.css';

interface DocflowV2AppProps {
  userEmail?: string;
  onLogout: () => void;
}

type ActiveView = 'dashboard' | DFModule;

export function DocflowV2App({ userEmail = '', onLogout }: DocflowV2AppProps) {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleNavigate = (view: ActiveView) => {
    setActiveView(view);
  };

  const handleToggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.setAttribute('data-df-theme', next ? 'dark' : 'light');
  };

  const handleBackToDashboard = () => setActiveView('dashboard');

  const activeModule: DFModule | null =
    activeView === 'dashboard' ? null : (activeView as DFModule);

  return (
    <div className="df-app">
      {/* Header global DOC.FLOW v2 */}
      <DFHeader
        userEmail={userEmail}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onLogout={onLogout}
      />

      {/* Layout: sidebar + conteúdo */}
      <div className="df-layout">
        <DFSidebar
          activeModule={activeView}
          onNavigate={handleNavigate}
        />

        <main className="df-main" id="df-main-content">
          <DFDashboard
            activeModule={activeModule}
            onSelectModule={mod => handleNavigate(mod)}
            onBackToDashboard={handleBackToDashboard}
          />

          {/* Footer */}
          <footer className="df-footer">
            <span className="df-footer-text">
              DOC.FLOW v2 — Sistema isolado em desenvolvimento
            </span>
            <span className="df-footer-text">v2.0.0-alpha</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
