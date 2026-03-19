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
import Image from 'next/image';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is Required').email('Please enter a valid email address'),
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
      <h2 className="font-montserrat text-[18px] font-semibold text-[#1D1D1D] text-center leading-normal mb-1">
        Welcome back
      </h2>
      <p className="text-body text-[#4A4A4A] text-center mb-6">
        Sign in to access GroupHub
      </p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label="EMAIL"
          placeholder="Enter email"
          type="text"
          error={errors.email?.message}
          className="placeholder:!text-[#A3A3A3] placeholder:font-montserrat placeholder:!text-[14px] placeholder:font-normal placeholder:leading-normal"
          labelClassName="font-montserrat !text-[14px] font-medium leading-normal tracking-normal text-[#1D1D1D] uppercase"
          {...register('email')}
        />
        <Input
          label="PASSWORD"
          placeholder="Enter password"
          isPassword
          error={errors.password?.message}
          className="placeholder:!text-[#A3A3A3] placeholder:font-montserrat placeholder:!text-[14px] placeholder:font-normal placeholder:leading-normal"
          labelClassName="font-montserrat !text-[14px] font-medium leading-normal tracking-normal text-[#1D1D1D] uppercase"
          {...register('password')}
        />
        <div className="flex items-center justify-between">
          <Checkbox label="Remember me" labelClassName="font-montserrat !text-[14px] font-medium leading-normal text-[#4A4A4A]" {...register('rememberMe')} />
          <Link
            href="/forgot-password"
            className="font-montserrat text-[14px] font-medium leading-normal text-[#667F00] hover:underline"
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
          className="mt-4 !text-[#FFF] font-montserrat !text-[14px] !font-normal leading-normal"
        >
          Sign In
        </Button>
      </form>
      <p className="text-center font-montserrat text-[12px] font-normal leading-[14px] text-[#4A4A4A] mt-6">
        Need help? Contact{' '}
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
