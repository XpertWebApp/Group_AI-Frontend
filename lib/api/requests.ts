import { apiClient, getApiError } from './client';
import type {
  ApiResponse,
  Attachment,
  BookingRequest,
  HotelSearchInitResponse,
  HotelSearchStatusResponse,
  OptionDetailResult,
  CalculatePriceResult,
  PaginatedResponse,
} from '@/types';
import type { CreateBookingRequestPayload, UpdateBookingRequestPayload } from '@/types/requests';
import type { CreateProposalPayload } from '@/types/proposals';

export interface ListRequestsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListRequestsResult {
  requests: BookingRequest[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const requestsApi = {
  async list(params?: ListRequestsParams): Promise<ListRequestsResult> {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<BookingRequest> | BookingRequest[]>>(
      '/requests',
      { params }
    );
    if (!data.success || !data.data) {
      return { requests: [] };
    }
    const payload = data.data as unknown as Record<string, unknown>;
    // Handle backend's { data: [], meta: {} } format
    if (!Array.isArray(payload) && 'data' in payload && Array.isArray(payload.data)) {
      const meta = payload.meta as { total?: number; page?: number; limit?: number; totalPages?: number } | undefined;
      return {
        requests: payload.data as BookingRequest[],
        pagination: meta ? {
          page: meta.page ?? 1,
          limit: meta.limit ?? 10,
          total: meta.total ?? 0,
          totalPages: meta.totalPages ?? 1,
        } : undefined,
      };
    }
    // Handle backend's { requests: [], pagination: {} } format
    if (!Array.isArray(payload) && 'requests' in payload) {
      const paginated = payload as unknown as PaginatedResponse<BookingRequest>;
      return {
        requests: paginated.requests,
        pagination: paginated.pagination,
      };
    }
    // Fallback: plain array
    if (Array.isArray(data.data)) {
      return { requests: data.data };
    }
    return { requests: [] };
  },

  async get(id: string): Promise<BookingRequest | null> {
    const { data } = await apiClient.get<ApiResponse<BookingRequest>>(`/requests/${id}`);
    if (!data.success || !data.data) return null;
    return data.data;
  },

  async getSummary(id: string): Promise<unknown> {
    const { data } = await apiClient.get<ApiResponse<unknown>>(`/requests/${id}/summary`);
    if (!data.success) return null;
    return data.data;
  },

  async create(payload: CreateBookingRequestPayload): Promise<BookingRequest> {
    const { data } = await apiClient.post<ApiResponse<BookingRequest>>('/requests', payload);
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to create request');
    }
    return data.data;
  },

  async update(id: string, payload: UpdateBookingRequestPayload): Promise<BookingRequest> {
    const { data } = await apiClient.patch<ApiResponse<BookingRequest>>(`/requests/${id}`, payload);
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to update request');
    }
    return data.data;
  },

  async uploadAttachments(requestId: string, files: File[]): Promise<Attachment[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const res = await fetch(`${base}/requests/${requestId}/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Upload failed');
    return json.data as Attachment[];
  },

  async listAttachments(requestId: string): Promise<Attachment[]> {
    const { data } = await apiClient.get<ApiResponse<Attachment[]>>(
      `/requests/${requestId}/attachments`
    );
    return data.data ?? [];
  },

  async deleteAttachment(requestId: string, attachmentId: string): Promise<void> {
    await apiClient.delete(`/requests/${requestId}/attachments/${attachmentId}`);
  },

  async createProposal(requestId: string, payload: CreateProposalPayload): Promise<{ id: string }> {
    const { data } = await apiClient.post<ApiResponse<{ id: string }>>(
      `/requests/${requestId}/proposals`,
      payload
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to create proposal');
    }
    return data.data;
  },

  // Async hotel search — returns immediately with job info
  async startHotelSearch(
    requestId: string,
    params?: {
      mealType?: string;
      includeAlternativeStars?: boolean;
      waitSeconds?: number;
      currencyCode?: string;
      nationalityCode?: string;
      facilityIds?: number[];
      lang?: string;
    }
  ): Promise<HotelSearchInitResponse> {
    const { data } = await apiClient.post<ApiResponse<HotelSearchInitResponse>>(
      `/requests/${requestId}/hotel-search`,
      params ?? {}
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Hotel search failed to start');
    }
    return data.data;
  },

  // Poll for hotel search progress and results
  async getHotelSearchStatus(requestId: string): Promise<HotelSearchStatusResponse> {
    const { data } = await apiClient.get<ApiResponse<HotelSearchStatusResponse>>(
      `/requests/${requestId}/hotel-search/status`
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to get search status');
    }
    return data.data;
  },

  // Start searching for alternative hotels (when main results are few)
  async startHotelSearchAlternatives(
    requestId: string,
    params?: {
      appliedLevel?: string;
      mealType?: string;
      currencyCode?: string;
      nationalityCode?: string;
      lang?: string;
    }
  ): Promise<HotelSearchInitResponse> {
    const { data } = await apiClient.post<ApiResponse<HotelSearchInitResponse>>(
      `/requests/${requestId}/hotel-search/alternatives`,
      params ?? {}
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to start alternatives search');
    }
    return data.data;
  },

  async getOptionDetails(
    requestId: string,
    selections: { sessionId: string; tid: string; hotelCode: string }[]
  ): Promise<OptionDetailResult[]> {
    const { data } = await apiClient.post<ApiResponse<OptionDetailResult[]>>(
      `/requests/${requestId}/hotel-search/option-details`,
      { selections }
    );
    if (!data.success || !Array.isArray(data.data)) return [];
    return data.data;
  },

  async calculatePrice(
    requestId: string,
    buyingPrice: number,
    markupPercent?: number
  ): Promise<CalculatePriceResult> {
    const { data } = await apiClient.post<ApiResponse<CalculatePriceResult>>(
      `/requests/${requestId}/hotel-search/calculate-price`,
      { buyingPrice, markupPercent: markupPercent ?? 18 }
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Price calculation failed');
    }
    return data.data;
  },

  async claim(requestId: string): Promise<{ owner: { id: string; firstName: string | null; lastName: string | null; email: string } }> {
    const { data } = await apiClient.post<ApiResponse<{ owner: { id: string; firstName: string | null; lastName: string | null; email: string } }>>(
      `/requests/${requestId}/actions/claim`
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to claim request');
    }
    return data.data;
  },
};

export { getApiError };
