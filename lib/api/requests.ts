import { apiClient, getApiError } from './client';
import type { ApiResponse, BookingRequest } from '@/types';
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
    const { data } = await apiClient.get<ApiResponse<BookingRequest[]>>('/requests', { params });
    if (!data.success || !Array.isArray(data.data)) {
      return [];
    }
    return data.data;
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

  async searchHotels(requestId: string, params?: { starRating?: number }): Promise<unknown[]> {
    const { data } = await apiClient.post<ApiResponse<unknown[]>>(
      `/requests/${requestId}/hotel-search`,
      params ?? {}
    );
    if (!data.success || !Array.isArray(data.data)) return [];
    return data.data;
  },
};

export { getApiError };
