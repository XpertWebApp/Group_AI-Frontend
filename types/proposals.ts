export interface CreateProposalPayload {
  notes?: string;
  markupSettings?: Record<string, unknown>;
}

export type UpdateProposalPayload = Partial<CreateProposalPayload>;

export interface RoomDetail {
  net: number;
  sell: number;
  qty: number;
  nights: number;
  actualDescriptions?: string[];
}

export interface AddProposalHotelPayload {
  hotelCode: string;
  hotelName?: string;
  tid?: string;
  starRating?: number | null;
  rooms?: Record<string, RoomDetail>;
  currency: string;
  totalPrice: number;
  freeCancellation?: boolean;
  cancelDeadline?: string | null;
  supplierCode?: string;
  optionDetailsId?: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  addressCity?: string | null;
  addressCountry?: string | null;
  /** Deep-link into SETTHub for this hotel. Captured from the search-result
   *  payload at add-time so it can be re-used on the request summary page. */
  sethubDetailsUrl?: string | null;
}

export interface AdjustHotelPricingPayload {
  rooms?: Record<
    string,
    { net?: number; sell?: number; qty?: number; nights?: number }
  >;
  totalPrice?: number;
  currency?: string;
}

export interface AddProposalServicePayload {
  serviceName: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  buyPrice?: number;
  sellPrice?: number;
  quantity?: number;
  days?: number;
  notes?: string;
  includedInTotal?: boolean;
}

export interface SendProposalPayload {
  sendToEmails?: string[];
}

export interface ApproveProposalPayload {
  agentEmail?: string;
  adminNotes?: string;
}

export interface DeclineProposalPayload {
  rejectionReason: string;
}
