'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { getApiError } from '@/lib/api/auth';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setUser } from '@/lib/store/slices/authSlice';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setSubmitError(null);
    try {
      const result = await authApi.login(data.email, data.password);
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', result.tokens.accessToken);
        localStorage.setItem('refreshToken', result.tokens.refreshToken);
      }
      dispatch(setUser(result.user));
      router.push('/dashboard');
    } catch (err) {
      const apiErr = getApiError(err);
      setSubmitError(apiErr.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sett-background p-4">
      <div className="w-full max-w-md bg-sett-card rounded-card shadow-card p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-sett-primary">SETT</h1>
          <p className="text-sm text-sett-primary/90 mt-0.5">
            SPORT & EVENTS TOURS & TRAVEL
          </p>
        </div>
        <h2 className="text-heading-lg font-bold text-sett-text-primary text-center mb-1">
          Welcome back
        </h2>
        <p className="text-body text-sett-text-secondary text-center mb-6">
          Sign in to access GroupHub
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="EMAIL"
            placeholder="Enter email"
            type="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="PASSWORD"
            placeholder="Enter password"
            isPassword
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex items-center justify-between">
            <Checkbox label="Remember me" {...register('rememberMe')} />
            <Link
              href="/forgot-password"
              className="text-body text-sett-primary font-medium hover:underline"
            >
              Forgot password?
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
            Sign In
          </Button>
        </form>
        <p className="text-center text-body text-sett-text-secondary mt-6">
          Need help? Contact{' '}
          <a
            href="mailto:support@sett.ai"
            className="text-sett-primary font-medium hover:underline"
          >
            support@sett.ai
          </a>
        </p>
      </div>
    </div>
  );
}
