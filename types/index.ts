export enum BookingRequestStatus {
  PENDING = 'pending',
  DRAFT = 'draft',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ProposalStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  APPROVED = 'approved',
  DECLINED = 'declined',
}

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RoomsConfig {
  single?: number;
  double?: number;
  twin?: number;
  triple?: number;
  quadruple?: number;
  suites?: number;
  extraRoomsNote?: string | null;
}

export interface BookingRequest {
  id: string;
  referenceNumber?: number;
  externalRequestId?: string | null;

  // Step 1: Trip Details
  destinationId: number;
  destinationName?: string | null;
  checkinDate: string;
  checkoutDate?: string | null;
  nights: number;
  starRating?: number | null;
  budgetRange?: string | null;
  budget?: number | null;
  groupType?: string | null;
  groupSize?: number | null;
  currencyCode?: string | null;
  nationalityCode?: string | null;

  // Step 2: Room & Accommodations
  rooms?: RoomsConfig | null;
  breakfastPreference?: string | null;
  hotelLocation?: string | null;
  specialRequirements?: string | null;

  // Step 3: Customer Details
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  guestListFileKey?: string | null;
  customerNotes?: string | null;

  // Step 4: Policies
  termsAndConditions?: string | null;
  cancellationConditions?: string | null;

  // System
  status: BookingRequestStatus;
  createdAt: string;
  updatedAt?: string | null;
}

export interface BookingRequestListItem {
  id: string;
  offerId?: string;
  customer?: string;
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  rooms?: number | null;
  totalSell?: number | null;
  margin?: number | null;
  status: BookingRequestStatus | ProposalStatus;
  createdAt: string;
}

export interface Proposal {
  id: string;
  requestId?: string | null;
  status: ProposalStatus;
  totalBuy?: number | null;
  totalSell?: number | null;
  markupSettings?: Record<string, unknown> | null;
  notes?: string | null;
  lockedBy?: string | null;
  lockedAt?: string | null;
  lockedByUser?: { firstName?: string; lastName?: string } | null;
  createdAt: string;
  updatedAt?: string | null;
  hotels?: ProposalHotel[];
  services?: ProposalService[];
}

export interface ProposalHotel {
  id: string;
  proposalId: string;
  hotelCode: string;
  hotelName?: string;
  tid?: string | null;
  totalPrice: number;
  currency: string;
  rooms?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ProposalService {
  id: string;
  proposalId: string;
  serviceName?: string | null;
  buyPrice?: number | null;
  sellPrice?: number | null;
  quantity?: number | null;
  notes?: string | null;
  createdAt: string;
}

export interface HotelSearchResult {
  hotelCode: string;
  name: string;
  addressCity?: string | null;
  addressCountry?: string | null;
  starRating?: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: string | null;
}

export interface ApiError {
  code?: string;
  message: string;
  owner?: string;
}
