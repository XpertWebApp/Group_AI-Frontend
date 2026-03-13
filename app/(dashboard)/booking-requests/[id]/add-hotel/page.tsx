'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AddHotelPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  useEffect(() => {
    router.replace(`/booking-requests/${requestId}`);
  }, [router, requestId]);

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="w-8 h-8 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
