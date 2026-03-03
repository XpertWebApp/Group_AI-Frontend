'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppSelector } from '@/hooks/useAppSelector';

export default function SettingsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const [saved, setSaved] = useState(false);

  const displayName = user?.firstName || user?.lastName
    ? [user.firstName, user.lastName].filter(Boolean).join(' ')
    : '';

  return (
    <div className="space-y-8 max-w-2xl">
      <Header title="Settings" subtitle="Manage your account and preferences" />
      <section className="bg-sett-card rounded-card shadow-card border border-sett-border p-6">
        <h2 className="text-heading-sm font-bold text-sett-text-primary mb-4">
          General
        </h2>
        <div className="space-y-4">
          <Input
            label="Display name"
            placeholder="Your name"
            defaultValue={displayName}
            disabled
          />
          <Input
            label="Email"
            type="email"
            defaultValue={user?.email ?? ''}
            disabled
          />
        </div>
      </section>
      <section className="bg-sett-card rounded-card shadow-card border border-sett-border p-6">
        <h2 className="text-heading-sm font-bold text-sett-text-primary mb-4">
          Notifications
        </h2>
        <p className="text-body text-sett-text-secondary mb-4">
          Configure how you receive notifications. (Placeholder – not connected to API.)
        </p>
      </section>
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
        >
          {saved ? 'Saved' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
