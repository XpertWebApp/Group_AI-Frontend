import type { RoomsConfig } from './index';

export type { RoomsConfig };

export interface CreateBookingRequestPayload {
  // Step 1: Trip Details
  destinationId: number;
  destinationName: string;
  checkinDate: string;
  checkoutDate?: string;
  nights?: number;
  /** Legacy single-select star rating. Send alongside `starRatings` during migration. */
  starRating?: number;
  /** Multi-select hotel category (1..6, half-steps allowed). 1-6 entries, no duplicates. */
  starRatings?: number[];
  budgetRange?: string;
  groupType?: string;
  groupSize?: number;
  averageAge?: number;
  currencyCode?: string;
  nationalityCode?: string;

  // Step 2: Room & Accommodations
  rooms?: RoomsConfig;
  breakfastPreference?: 'BB' | 'RO';
  hotelLocation?: 'central' | 'outside_city_center';
  specialRequirements?: string | null;

  // Step 3: Customer Details
  companyName: string;
  firstName: string;
  lastName: string;
  contactEmail: string;
  contactPhone: string;
  contactPhoneCountryCode?: string;
  guestListFileKey?: string;
  customerNotes?: string | null;

  // Step 4: Policies
  termsAndConditions?: string;
  cancellationConditions?: string;

  // System
  source?: string;
  status?: 'pending' | 'draft';
}

export type UpdateBookingRequestPayload = Partial<CreateBookingRequestPayload> & {
  status?: 'pending' | 'draft' | 'processing' | 'completed' | 'cancelled';
};
