'use client';

import { createContext, useContext } from 'react';

type LogoutHandler = () => void;

const AppLayoutContext = createContext<{ onLogoutClick: LogoutHandler | null }>({
  onLogoutClick: null,
});

export function useAppLayout() {
  return useContext(AppLayoutContext);
}

export const AppLayoutProvider = AppLayoutContext.Provider;
