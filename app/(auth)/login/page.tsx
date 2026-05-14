'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { getApiError } from '@/lib/api/auth';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setUser } from '@/lib/store/slices/authSlice';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type LoginFormValues = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export default function LoginPage() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { t } = useLanguage();

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, t.login.emailRequired).email(t.login.emailInvalid),
        password: z.string().min(1, t.login.passwordRequired),
        rememberMe: z.boolean().optional(),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setSubmitError(null);
      const result = await authApi.login(data.email, data.password, data.rememberMe);
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', result.tokens.accessToken);
        localStorage.setItem('refreshToken', result.tokens.refreshToken);
      }
      dispatch(setUser(result.user));
      toast.success(t.toasts.loginSuccess);
      router.push('/dashboard');
    } catch (err) {
      const apiErr = getApiError(err);
      const message = apiErr.message || 'Invalid credentials';
      setSubmitError(message);
    }
  };

  return (
    <div>
      {/* Page heading — true H1 per §3 (weight 800, 28–36px range) */}
      <div className="mb-8 sm:mb-10">
        <p
          className="font-montserrat text-[12px] font-semibold tracking-[0.12em] uppercase text-sett-primary mb-3 animate-sidebar-fade-up"
          style={{ animationDelay: '60ms' }}
        >
          {t.login.eyebrow}
        </p>
        <h2
          className="font-montserrat text-[28px] sm:text-[32px] font-extrabold leading-tight text-sett-text-primary animate-sidebar-fade-up"
          style={{ animationDelay: '120ms' }}
        >
          {t.login.welcomeBack}
        </h2>
        <p
          className="mt-2 font-montserrat text-[15px] font-normal text-sett-text-secondary leading-relaxed animate-sidebar-fade-up"
          style={{ animationDelay: '200ms' }}
        >
          {t.login.signInSubtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div className="animate-sidebar-fade-up" style={{ animationDelay: '260ms' }}>
          <Input
            label={t.login.email}
            placeholder={t.login.emailPlaceholder}
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <div className="animate-sidebar-fade-up" style={{ animationDelay: '320ms' }}>
          <Input
            label={t.login.password}
            placeholder={t.login.passwordPlaceholder}
            isPassword
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <div
          className="flex items-center justify-between animate-sidebar-fade-up"
          style={{ animationDelay: '380ms' }}
        >
          <Checkbox
            label={t.login.rememberMe}
            labelClassName="font-montserrat text-[13px] font-medium text-sett-text-secondary"
            {...register('rememberMe')}
          />
          <Link
            href="/forgot-password"
            className="font-montserrat text-[13px] font-semibold text-sett-primary hover:text-sett-green-dark hover:underline transition-colors"
          >
            {t.login.forgotPassword}
          </Link>
        </div>

        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-2 px-3 py-2.5 rounded-button border border-sett-destructive/30 bg-sett-destructive/10 animate-sidebar-fade-up"
          >
            <AlertTriangle className="w-4 h-4 text-sett-destructive shrink-0 mt-0.5" />
            <p className="font-montserrat text-[13px] font-medium text-sett-destructive leading-snug">
              {submitError}
            </p>
          </div>
        )}

        <div className="animate-sidebar-fade-up pt-2" style={{ animationDelay: '440ms' }}>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isSubmitting}
          >
            {t.login.signIn}
          </Button>
        </div>
      </form>

      <p
        className="mt-8 text-center font-montserrat text-[13px] font-normal text-sett-text-secondary animate-sidebar-fade-up"
        style={{ animationDelay: '520ms' }}
      >
        {t.login.needHelp}{' '}
        <a
          href="mailto:support@s-e-t-t.com"
          className="font-montserrat text-[13px] font-semibold text-sett-primary hover:text-sett-green-dark hover:underline transition-colors"
        >
          support@s-e-t-t.com
        </a>
      </p>
    </div>
  );
}
