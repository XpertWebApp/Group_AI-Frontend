'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api/auth';
import { getApiError } from '@/lib/api/auth';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setUser } from '@/lib/store/slices/authSlice';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import Image from 'next/image';
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
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (err) {
      const apiErr = getApiError(err);
      const message = apiErr.message || 'Invalid credentials';
      setSubmitError(message);
      // Keep error visible — clear only on next successful submit
    }
  };

  return (
    <div className="w-full max-w-md bg-sett-card rounded-card shadow-card p-8 mx-4">
      <div className="text-center mb-8">
        <Image
          src="/icons/sett_logo.svg"
          alt="SETT Logo"
          width={180}
          height={60}
          className="mx-auto h-auto w-auto"
        />
      </div>
      <h2 className="font-montserrat text-[18px] font-semibold text-sett-text-primary text-center leading-normal mb-1">
        {t.login.welcomeBack}
      </h2>
      <p className="text-body text-sett-text-secondary text-center mb-6">
        {t.login.signInSubtitle}
      </p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label={t.login.email}
          placeholder={t.login.emailPlaceholder}
          type="text"
          error={errors.email?.message}
          className="placeholder:!text-sett-text-accent placeholder:font-montserrat placeholder:!text-[14px] placeholder:font-normal placeholder:leading-normal"
          labelClassName="font-montserrat !text-[14px] font-medium leading-normal tracking-normal text-sett-text-primary uppercase"
          {...register('email')}
        />
        <Input
          label={t.login.password}
          placeholder={t.login.passwordPlaceholder}
          isPassword
          error={errors.password?.message}
          className="placeholder:!text-sett-text-accent placeholder:font-montserrat placeholder:!text-[14px] placeholder:font-normal placeholder:leading-normal"
          labelClassName="font-montserrat !text-[14px] font-medium leading-normal tracking-normal text-sett-text-primary uppercase"
          {...register('password')}
        />
        <div className="flex items-center justify-between">
          <Checkbox label={t.login.rememberMe} labelClassName="font-montserrat !text-[14px] font-medium leading-normal text-sett-text-secondary" {...register('rememberMe')} />
          <Link
            href="/forgot-password"
            className="font-montserrat text-[14px] font-medium leading-normal text-[#667F00] hover:underline"
          >
            {t.login.forgotPassword}
          </Link>
        </div>
        {submitError && (
          <p className="text-caption text-red-500">{submitError}</p>
        )}
        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isSubmitting}
          className="mt-4"
        >
          {t.login.signIn}
        </Button>
      </form>
      <p className="text-center font-montserrat text-[12px] font-normal leading-[14px] text-sett-text-secondary mt-6">
        {t.login.needHelp}{' '}
        <a
          href="mailto:support@sett.ai"
          className="font-montserrat text-[12px] font-medium leading-[14px] text-[#667F00] hover:underline"
        >
          support@sett.ai
        </a>
      </p>
    </div>
  );
}
