'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sett-background p-4">
      <div className="w-full max-w-md bg-sett-card rounded-card shadow-card p-8">
        <h1 className="text-heading-md font-bold text-sett-text-primary text-center mb-2">
          Forgot password?
        </h1>
        <p className="text-body text-sett-text-secondary text-center mb-6">
          Contact support to reset your password.
        </p>
        <Link href="/login" className="block">
          <Button variant="primary" fullWidth>
            Back to Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}
