'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();

  return (
    <div>
      <div className="mb-8 sm:mb-10">
        <p
          className="font-montserrat text-[12px] font-semibold tracking-[0.12em] uppercase text-sett-primary mb-3 animate-sidebar-fade-up"
          style={{ animationDelay: '60ms' }}
        >
          {t.login.formEyebrow}
        </p>
        <h2
          className="font-montserrat text-[28px] sm:text-[32px] font-extrabold leading-tight text-sett-text-primary animate-sidebar-fade-up"
          style={{ animationDelay: '120ms' }}
        >
          {t.login.forgotPasswordTitle}
        </h2>
        <p
          className="mt-2 font-montserrat text-[15px] font-normal text-sett-text-secondary leading-relaxed animate-sidebar-fade-up"
          style={{ animationDelay: '200ms' }}
        >
          {t.login.forgotPasswordDesc}
        </p>
      </div>

      <div className="animate-sidebar-fade-up" style={{ animationDelay: '300ms' }}>
        <Link href="/login" className="block">
          <Button variant="primary" fullWidth>
            <ArrowLeft className="w-4 h-4" />
            {t.login.backToSignIn}
          </Button>
        </Link>
      </div>
    </div>
  );
}
