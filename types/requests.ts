import type { RoomsConfig } from './index';

export type { RoomsConfig };

export interface CreateBookingRequestPayload {
  source?: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  currencyCode: string;
  destinationId: number;
  destinationName: string;
  checkinDate: string;
  nights: number;
  rooms: RoomsConfig;
  nationalityCode?: string;
  budget?: number;
  specialRequirements?: string | null;
  status?: 'pending' | 'draft';
}

export type UpdateBookingRequestPayload = Partial<CreateBookingRequestPayload>;
