'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/hooks/useAppSelector';
import { AppLayout } from '@/components/layout/AppLayout';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAppSelector((s) => s.auth.user);
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
    }
    setChecked(true);
  }, [router]);

  if (!checked && typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
  }

  return (
    <LanguageProvider>
      <AppLayout>{children}</AppLayout>
    </LanguageProvider>
  );
}
