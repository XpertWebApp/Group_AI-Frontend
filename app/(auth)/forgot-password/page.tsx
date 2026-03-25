'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-sett-background p-4">
      <div className="w-full max-w-md bg-sett-card rounded-card shadow-card p-8">
        <h1 className="text-heading-md font-bold text-sett-text-primary text-center mb-2">
          {t.login.forgotPasswordTitle}
        </h1>
        <p className="text-body text-sett-text-secondary text-center mb-6">
          {t.login.forgotPasswordDesc}
        </p>
        <Link href="/login" className="block">
          <Button variant="primary" fullWidth>
            {t.login.backToSignIn}
          </Button>
        </Link>
      </div>
    </div>
  );
}
