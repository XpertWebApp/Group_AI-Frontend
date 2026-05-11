'use client';

import { createContext, useContext } from 'react';

type LogoutHandler = () => void;

interface AppLayoutContextValue {
  onLogoutClick: LogoutHandler | null;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const AppLayoutContext = createContext<AppLayoutContextValue>({
  onLogoutClick: null,
  sidebarCollapsed: false,
  toggleSidebar: () => {},
  setSidebarCollapsed: () => {},
});

export function useAppLayout() {
  return useContext(AppLayoutContext);
}

export const AppLayoutProvider = AppLayoutContext.Provider;
