'use client';

import { useEffect } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { setUser } from '@/lib/store/slices/authSlice';
import type { User } from '@/types';
import { decodeJwtPayload } from '@/lib/utils/jwt';

export function AuthHydration({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  useEffect(() => {
    if (user) return;
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const payload = decodeJwtPayload<{ id: string; email: string; role: string }>(token);
    if (payload?.id && payload?.email) {
      dispatch(
        setUser({
          id: payload.id,
          email: payload.email,
          firstName: null,
          lastName: null,
          role: payload.role ?? 'User',
        } as User)
      );
    }
  }, [dispatch, user]);

  return <>{children}</>;
}
