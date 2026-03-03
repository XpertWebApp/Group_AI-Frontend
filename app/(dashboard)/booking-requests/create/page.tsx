'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { CreateBookingRequestPayload, RoomsConfig } from '@/types/requests';

const createRequestSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().min(5, 'Valid phone is required'),
  currencyCode: z.string().min(2, 'Currency is required'),
  destinationId: z.number().int().positive('Destination is required'),
  destinationName: z.string().min(1, 'Destination name is required'),
  checkinDate: z.string().min(1, 'Check-in date is required'),
  nights: z.number().int().min(1, 'At least 1 night required'),
  specialRequirements: z.string().optional(),
  single: z.number().int().min(0).optional(),
  double: z.number().int().min(0).optional(),
  twin: z.number().int().min(0).optional(),
  triple: z.number().int().min(0).optional(),
  quadruple: z.number().int().min(0).optional(),
  suites: z.number().int().min(0).optional(),
  extraRoomsNote: z.string().optional(),
  policies: z.string().optional(),
});

type FormValues = z.infer<typeof createRequestSchema>;

const currencyOptions = [
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'USD', label: 'USD' },
];

export default function CreateBookingRequestPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      companyName: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      currencyCode: 'EUR',
      destinationId: 1,
      destinationName: '',
      checkinDate: '',
      nights: 1,
      specialRequirements: '',
      single: 0,
      double: 0,
      twin: 0,
      triple: 0,
      quadruple: 0,
      suites: 0,
      extraRoomsNote: '',
      policies: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    const rooms: RoomsConfig = {
      single: data.single ?? 0,
      double: data.double ?? 0,
      twin: data.twin ?? 0,
      triple: data.triple ?? 0,
      quadruple: data.quadruple ?? 0,
      suites: data.suites ?? 0,
      extraRoomsNote: data.extraRoomsNote || undefined,
    };
    const payload: CreateBookingRequestPayload = {
      companyName: data.companyName,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      currencyCode: data.currencyCode,
      destinationId: data.destinationId,
      destinationName: data.destinationName,
      checkinDate: data.checkinDate,
      nights: data.nights,
      rooms,
      specialRequirements: data.specialRequirements || undefined,
    };
    try {
      const { requestsApi } = await import('@/lib/api/requests');
      await requestsApi.create(payload);
      router.push('/booking-requests');
    } catch {
      // Error toast could be shown here
    }
  };

  return (
    <div className="space-y-8 pb-24">
      <Header title="Create Booking Request" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <section className="bg-sett-card rounded-card shadow-card border border-sett-border p-6">
          <h2 className="text-heading-sm font-bold text-sett-text-primary mb-4">
            Trip Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Trip / Destination Name"
              placeholder="e.g. Paris Conference"
              error={errors.destinationName?.message}
              {...register('destinationName')}
            />
            <Input
              label="Destination ID"
              type="number"
              min={1}
              error={errors.destinationId?.message}
              {...register('destinationId', { valueAsNumber: true })}
            />
            <Input
              label="Check-in Date"
              type="date"
              error={errors.checkinDate?.message}
              {...register('checkinDate')}
            />
            <Input
              label="Nights"
              type="number"
              min={1}
              error={errors.nights?.message}
              {...register('nights', { valueAsNumber: true })}
            />
            <Select
              label="Currency"
              options={currencyOptions}
              {...register('currencyCode')}
            />
            <div className="md:col-span-2">
              <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
                Notes
              </label>
              <textarea
                className="w-full px-3 py-2.5 rounded-input border border-sett-border bg-white text-body text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none focus:ring-2 focus:ring-sett-primary min-h-[100px]"
                placeholder="Special requirements..."
                {...register('specialRequirements')}
              />
            </div>
          </div>
        </section>

        <section className="bg-sett-card rounded-card shadow-card border border-sett-border p-6">
          <h2 className="text-heading-sm font-bold text-sett-text-primary mb-4">
            Rooms & Accommodation
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {(['single', 'double', 'twin', 'triple', 'quadruple', 'suites'] as const).map(
              (room) => (
                <Input
                  key={room}
                  label={room.charAt(0).toUpperCase() + room.slice(1)}
                  type="number"
                  min={0}
                  {...register(room, { valueAsNumber: true })}
                />
              )
            )}
            <div className="col-span-2 sm:col-span-3 md:col-span-6">
              <Input
                label="Extra rooms note"
                placeholder="Optional"
                {...register('extraRoomsNote')}
              />
            </div>
          </div>
        </section>

        <section className="bg-sett-card rounded-card shadow-card border border-sett-border p-6">
          <h2 className="text-heading-sm font-bold text-sett-text-primary mb-4">
            Customer Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Company Name"
              placeholder="Company name"
              error={errors.companyName?.message}
              {...register('companyName')}
            />
            <Input
              label="Contact Name"
              placeholder="Full name"
              error={errors.contactName?.message}
              {...register('contactName')}
            />
            <Input
              label="Email"
              type="email"
              placeholder="email@example.com"
              error={errors.contactEmail?.message}
              {...register('contactEmail')}
            />
            <Input
              label="Phone"
              placeholder="+1 234 567 8900"
              error={errors.contactPhone?.message}
              {...register('contactPhone')}
            />
          </div>
        </section>

        <section className="bg-sett-card rounded-card shadow-card border border-sett-border p-6">
          <h2 className="text-heading-sm font-bold text-sett-text-primary mb-4">
            Policies
          </h2>
          <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
            Policy notes
          </label>
          <textarea
            className="w-full px-3 py-2.5 rounded-input border border-sett-border bg-white text-body text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none focus:ring-2 focus:ring-sett-primary min-h-[100px]"
            placeholder="Cancellation, payment terms..."
            {...register('policies')}
          />
        </section>

        <section className="bg-sett-card rounded-card shadow-card border border-sett-border p-6">
          <h2 className="text-heading-sm font-bold text-sett-text-primary mb-4">
            Attachments
          </h2>
          <div className="border-2 border-dashed border-sett-border rounded-input p-8 text-center text-body text-sett-text-secondary">
            Drag and drop files here, or click to browse. (Placeholder – upload not implemented)
          </div>
        </section>

        <div className="fixed bottom-0 left-0 right-0 lg:left-sidebar bg-sett-card border-t border-sett-border p-4 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Create Request
          </Button>
        </div>
      </form>
    </div>
  );
}
