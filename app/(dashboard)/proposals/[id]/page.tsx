'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProposalPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/booking-requests');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="w-8 h-8 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
