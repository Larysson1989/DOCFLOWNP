// ─── DOC.FLOW v2 — Hook principal ────────────────────────────────────────────
import { useState, useCallback } from 'react';
import type { DFModule, DFNotification } from '../types';

export interface DocflowV2State {
  activeModule: DFModule | null;
  notifications: DFNotification[];
  isDarkMode: boolean;
}

export function useDocflowV2() {
  const [state, setState] = useState<DocflowV2State>({
    activeModule: null,
    notifications: [],
    isDarkMode: false
  });

  const setActiveModule = useCallback((module: DFModule | null) => {
    setState(prev => ({ ...prev, activeModule: module }));
  }, []);

  const toggleTheme = useCallback(() => {
    setState(prev => {
      const next = !prev.isDarkMode;
      document.documentElement.setAttribute(
        'data-df-theme',
        next ? 'dark' : 'light'
      );
      return { ...prev, isDarkMode: next };
    });
  }, []);

  const addNotification = useCallback((notification: Omit<DFNotification, 'id'>) => {
    const id = Math.random().toString(36).substring(2);
    const full: DFNotification = { ...notification, id };
    setState(prev => ({
      ...prev,
      notifications: [...prev.notifications, full]
    }));
    if (notification.duration !== 0) {
      setTimeout(() => removeNotification(id), notification.duration ?? 4000);
    }
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id)
    }));
  }, []);

  return {
    ...state,
    setActiveModule,
    toggleTheme,
    addNotification,
    removeNotification
  };
}
