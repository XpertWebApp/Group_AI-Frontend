export enum BookingRequestStatus {
  PENDING = 'pending',
  DRAFT = 'draft',
  PROCESSING = 'processing',
  AI_GENERATED = 'ai_generated',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NEEDS_MANUAL_HANDLING = 'needs_manual_handling',
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

export interface Attachment {
  id: string;
  fileKey: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string;
  createdAt: string;
}

export interface RoomsConfig {
  single?: number;
  double?: number;
  twin?: number;
  triple?: number;
  quadruple?: number;
  suites?: number;
  standardDoubleBeds?: number;
  twinBeds?: number;
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
  averageAge?: number | null;
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
  contactPhoneCountryCode?: string | null;
  guestListFileKey?: string | null;
  customerNotes?: string | null;
  attachments?: Attachment[];

  // Step 4: Policies
  termsAndConditions?: string | null;
  cancellationConditions?: string | null;

  // System
  status: BookingRequestStatus;
  createdAt: string;
  updatedAt?: string | null;
  assignedUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;

  // Joined from proposals (included in list response)
  proposals?: {
    id: string;
    status: string;
    totalBuy: string | number | null;
    totalSell: string | number | null;
    sentAt?: string | null;
  }[];
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
  assignedUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
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
  pdfUrl?: string | null;
  sentAt?: string | null;
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
  hotelRef?: string | null;
  totalPrice: number;
  currency: string;
  freeCancellation?: boolean;
  cancelDeadline?: string | null;
  supplierCode?: string | null;
  rooms?: Record<string, { net: number; sell: number; qty: number; nights: number }> | null;
  latitude?: number | null;
  longitude?: number | null;
  starRating?: number | null;
  address?: string | null;
  addressCity?: string | null;
  addressCountry?: string | null;
  createdAt: string;
  includedInTotal?: boolean;
}

export interface ProposalService {
  id: string;
  proposalId: string;
  serviceName?: string | null;
  buyPrice?: number | null;
  sellPrice?: number | null;
  quantity?: number | null;
  notes?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  createdAt: string;
  includedInTotal?: boolean;
}

// ──── Offer History Types ────

export interface OfferHistoryEntry {
  id: string;
  offerNumber: number;
  type: 'initial' | 'final' | 'revision';
  sentAt: string;
  sentBy: string;
  sentToEmails: string[];
  totalPrice: number | null;
  currency: string;
  method: string;
  pdfUrl: string | null;
  hotelCount: number;
  serviceCount: number;
}

// ──── Facility Types ────

export interface Facility {
  id: number;
  name: string;
  hotelCount?: number;
}

// ──── Hotel Search Types ────

export interface HotelBestOption {
  tid: string;
  sessionId: string;
  supplierCode: string;
  buyingPricePerRoomPerNight: number;
  currency: string;
  freeCancellation: boolean;
  cancelDeadline?: string | null;
  mealType: string;
  mealName: string;
  roomDescriptions: string[];
}

export interface PerTypeAllocation {
  roomType: string;
  roomsAllocated: number;
  supplierCode?: string;
  mealType?: string;
  mealName?: string;
  pricePerRoomPerNight?: number;
  actualDescriptions?: string[];
}

export interface SupplierSplitItem {
  tid: string;
  rooms: number;
  supplierCode: string;
  sessionId?: string;
  [key: string]: unknown;
}

export interface HotelSearchResult {
  hotelCode: string;
  hotelName: string;
  starRating: number;
  imageUrl?: string | null;
  sethubDetailsUrl?: string | null;
  address?: string | null;
  addressCity?: string | null;
  addressCountry?: string | null;
  currency: string;
  sellingPricePerRoomPerNight: number;
  highestMidRangePrice: number;
  roomsAllocated: number;
  capacityStatus?: 'CONFIRMED' | 'LIMITED';
  cxlDeadline?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  supplierSplit?: SupplierSplitItem[];
  perTypeAllocations?: PerTypeAllocation[];
  note?: string | null;
  description?: string | null;
  descriptionLanguage?: string | null;
  descriptionSource?: string | null;
  facilities?: Facility[];
  // Legacy / backward compat fields
  sessionId?: string;
  status?: 'include' | 'flag' | 'omit';
  totalAvailableRooms?: number;
  bestOption?: HotelBestOption;
  usableOptions?: unknown[];
  selectedOptions?: unknown[];
  name?: string;
  // Alternatives search
  searchKind?: 'main' | 'alternative';
  alternativeReason?: string | null;
}

export interface HotelSearchResponse {
  requestId: string;
  sessionId: string;
  finished: boolean;
  totalRoomsRequested: number;
  summary: {
    total: number;
    included: number;
    flagged: number;
    omitted: number;
  };
  results: HotelSearchResult[];
  alternativeResults: HotelSearchResult[];
}

export interface RoomBreakdownPrice {
  date: string;
  price: number;
}

export interface RoomBreakdown {
  roomId: number;
  description: string;
  prices: RoomBreakdownPrice[];
}

export interface CancellationCondition {
  fromDate: string;
  toDate: string;
  amount: number;
  currency: string;
  text: string;
}

export interface OptionDetailParsed {
  nonRefundable: boolean;
  cxlDeadline?: string | null;
  mealType: string;
  mealName: string;
  daypricesTotal: number;
  daypricesCurrency: string;
  providerPrice: number;
  essentialInfo?: string | null;
  roomBreakdown: RoomBreakdown[];
  cancellationPolicy: {
    nonRefundable: boolean;
    deadline?: string | null;
    conditions: CancellationCondition[];
    comment?: string | null;
  };
  supplements: unknown[];
}

export interface OptionDetailResult {
  tid: string;
  hotelCode: string;
  cached: boolean;
  parsed: OptionDetailParsed;
  data?: unknown;
}

export interface CalculatePriceResult {
  buyingPrice: number;
  sellPrice: number;
  markupPercent: number;
  rawSellPrice?: number;
  markup?: number;
  effectiveMarkupPercent?: number;
}

// ──── Async Hotel Search Types ────

export interface HotelSearchInitResponse {
  requestId: string;
  totalCandidates: number;
  jobsQueued: number;
  message: string;
  sseEndpoint: string;
  statusEndpoint: string;
  relaxation?: {
    level: 'star_pm2' | 'star_any' | 'meal_dropped' | 'location_dropped' | 'facilities_dropped';
    bannerMessage: string;
  } | null;
  destinationFallback?: {
    originalDestinationId: number;
    originalDestinationName: string;
    usedDestinationId: number;
    usedDestinationName: string;
    bannerMessage: string;
  } | null;
  manualRequestOnly?: boolean;
  hasAlternativesAvailable?: boolean;
}

export interface HotelSearchJobStatus {
  id: string;
  hotelCode: string;
  hotelName: string;
  status: 'QUEUED' | 'RUNNING' | 'PROBING' | 'COMPLETED' | 'SKIPPED_INSUFFICIENT' | 'FAILED';
  resultJson?: HotelSearchResult | null;
}

export type HotelSearchPhase = 'in_progress' | 'settled' | 'exhausted';

export interface HotelSearchStatusResponse {
  requestId: string;
  summary: {
    total: number;
    queued: number;
    running: number;
    completed: number;
    skipped: number;
    failed: number;
    // Added by backend pagination work — NULL/absent on historical rows or pre-deploy backends.
    // Treat absent or null as 'in_progress' for safety.
    phase?: HotelSearchPhase | null;
  };
  jobs: HotelSearchJobStatus[];
}

export interface PaginatedResponse<T> {
  requests: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ──── Dashboard Types ────

export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  completedThisMonth: number;
  revenueThisMonth: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  entityId?: string | null;
  entityType?: string | null;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
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
