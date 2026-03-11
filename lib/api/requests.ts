import { apiClient, getApiError } from './client';
import type { ApiResponse, BookingRequest, HotelSearchResponse, OptionDetailResult, CalculatePriceResult } from '@/types';
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

export const requestsApi = {
  async list(params?: ListRequestsParams): Promise<BookingRequest[]> {
    const { data } = await apiClient.get<ApiResponse<BookingRequest[] | { data: BookingRequest[]; meta: unknown }>>('/requests', { params });
    if (!data.success || !data.data) {
      return [];
    }
    // Backend returns { data: [...], meta: {...} } for paginated responses
    if (Array.isArray(data.data)) {
      return data.data;
    }
    if (typeof data.data === 'object' && 'data' in data.data && Array.isArray(data.data.data)) {
      return data.data.data;
    }
    return [];
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

  async searchHotels(
    requestId: string,
    params?: {
      mealType?: string;
      includeAlternativeStars?: boolean;
      waitSeconds?: number;
      currencyCode?: string;
      nationalityCode?: string;
    }
  ): Promise<HotelSearchResponse> {
    const { data } = await apiClient.post<ApiResponse<HotelSearchResponse>>(
      `/requests/${requestId}/hotel-search`,
      params ?? {},
      { timeout: 60000 } // Long-running search: 30-45s
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Hotel search failed');
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
};

export { getApiError };
