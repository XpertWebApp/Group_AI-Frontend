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
}

export interface AddProposalHotelPayload {
  hotelCode: string;
  hotelName?: string;
  tid?: string;
  rooms?: Record<string, RoomDetail>;
  currency: string;
  totalPrice: number;
  freeCancellation?: boolean;
  cancelDeadline?: string | null;
  supplierCode?: string;
  optionDetailsId?: string;
  latitude?: number | null;
  longitude?: number | null;
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
}

export interface SendProposalPayload {
  sendToEmail?: string;
}
