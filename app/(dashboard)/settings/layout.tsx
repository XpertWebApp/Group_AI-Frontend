'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/hooks/useAppSelector';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = useAppSelector((s) => s.auth.user);
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Wait for user to be hydrated from JWT
    if (!user) return;
    if (user.role !== 'ADMIN') {
      router.replace('/dashboard');
    } else {
      setAllowed(true);
    }
  }, [user, router]);

  if (!allowed) return null;

  return <>{children}</>;
}
