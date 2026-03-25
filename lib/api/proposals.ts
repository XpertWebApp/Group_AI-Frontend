import { apiClient, getApiError } from './client';
import type { ApiResponse, Proposal, ProposalHotel, ProposalService } from '@/types';
import type {
  UpdateProposalPayload,
  AddProposalHotelPayload,
  AdjustHotelPricingPayload,
  AddProposalServicePayload,
  SendProposalPayload,
  ApproveProposalPayload,
  DeclineProposalPayload,
} from '@/types/proposals';

export const proposalsApi = {
  async list(): Promise<Proposal[]> {
    const { data } = await apiClient.get<ApiResponse<Proposal[]>>('/proposals');
    if (!data.success || !Array.isArray(data.data)) return [];
    return data.data;
  },

  async get(id: string): Promise<Proposal | null> {
    const { data } = await apiClient.get<ApiResponse<Proposal>>(`/proposals/${id}`);
    if (!data.success || !data.data) return null;
    return data.data;
  },

  async update(id: string, payload: UpdateProposalPayload): Promise<Proposal> {
    const { data } = await apiClient.patch<ApiResponse<Proposal>>(`/proposals/${id}`, payload);
    if (!data.success || !data.data) throw new Error(data.message || 'Failed to update proposal');
    return data.data;
  },

  async addHotel(proposalId: string, payload: AddProposalHotelPayload): Promise<ProposalHotel> {
    const { data } = await apiClient.post<ApiResponse<ProposalHotel>>(
      `/proposals/${proposalId}/hotels`,
      payload
    );
    if (!data.success || !data.data) throw new Error(data.message || 'Failed to add hotel');
    return data.data;
  },

  async removeHotel(proposalId: string, hotelId: string): Promise<void> {
    await apiClient.delete(`/proposals/${proposalId}/hotels/${hotelId}`);
  },

  async listHotels(proposalId: string): Promise<ProposalHotel[]> {
    const { data } = await apiClient.get<ApiResponse<ProposalHotel[]>>(
      `/proposals/${proposalId}/hotels`
    );
    if (!data.success || !Array.isArray(data.data)) return [];
    return data.data;
  },

  async adjustHotelPricing(
    proposalId: string,
    hotelId: string,
    payload: AdjustHotelPricingPayload
  ): Promise<{ hotel: ProposalHotel; proposal: Proposal }> {
    const { data } = await apiClient.post<
      ApiResponse<{ hotel: ProposalHotel; proposal: Proposal }>
    >(`/proposals/${proposalId}/hotels/${hotelId}/adjust-pricing`, payload);
    if (!data.success || !data.data) throw new Error(data.message || 'Failed to adjust pricing');
    return data.data;
  },

  async addService(
    proposalId: string,
    payload: AddProposalServicePayload
  ): Promise<{ service: ProposalService; proposal: Proposal }> {
    const { data } = await apiClient.post<
      ApiResponse<{ service: ProposalService; proposal: Proposal }>
    >(`/proposals/${proposalId}/services`, payload);
    if (!data.success || !data.data) throw new Error(data.message || 'Failed to add service');
    return data.data;
  },

  async updateService(
    proposalId: string,
    serviceId: string,
    payload: Partial<AddProposalServicePayload>
  ): Promise<{ service: ProposalService; proposal: Proposal }> {
    const { data } = await apiClient.patch<
      ApiResponse<{ service: ProposalService; proposal: Proposal }>
    >(`/proposals/${proposalId}/services/${serviceId}`, payload);
    if (!data.success || !data.data) throw new Error(data.message || 'Failed to update service');
    return data.data;
  },

  async removeService(proposalId: string, serviceId: string): Promise<void> {
    await apiClient.delete(`/proposals/${proposalId}/services/${serviceId}`);
  },

  async lock(proposalId: string): Promise<Proposal> {
    const { data } = await apiClient.post<ApiResponse<Proposal>>(
      `/proposals/${proposalId}/actions/lock`
    );
    if (!data.success || !data.data) throw new Error(data.message || 'Failed to lock');
    return data.data;
  },

  async unlock(proposalId: string): Promise<Proposal> {
    const { data } = await apiClient.post<ApiResponse<Proposal>>(
      `/proposals/${proposalId}/actions/unlock`
    );
    if (!data.success || !data.data) throw new Error(data.message || 'Failed to unlock');
    return data.data;
  },

  async saveDraft(proposalId: string): Promise<Proposal> {
    const { data } = await apiClient.post<ApiResponse<Proposal>>(
      `/proposals/${proposalId}/actions/save-draft`
    );
    if (!data.success || !data.data) throw new Error(data.message || 'Failed to save draft');
    return data.data;
  },

  async send(proposalId: string, payload?: SendProposalPayload): Promise<Proposal> {
    const { data } = await apiClient.post<ApiResponse<Proposal>>(
      `/proposals/${proposalId}/actions/send`,
      payload ?? {}
    );
    if (!data.success || !data.data) throw new Error(data.message || 'Failed to send');
    return data.data;
  },

  async previewPdf(proposalId: string): Promise<string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const response = await fetch(`${baseURL}/proposals/${proposalId}/actions/preview-pdf`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'ngrok-skip-browser-warning': 'true',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to generate PDF preview (${response.status})`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },

  async approve(proposalId: string, payload?: ApproveProposalPayload): Promise<Proposal> {
    const { data } = await apiClient.post<ApiResponse<Proposal>>(
      `/proposals/${proposalId}/actions/approve`,
      payload ?? {}
    );
    if (!data.success || !data.data) throw new Error(data.message || 'Failed to approve');
    return data.data;
  },

  async decline(proposalId: string, payload: DeclineProposalPayload): Promise<Proposal> {
    const { data } = await apiClient.post<ApiResponse<Proposal>>(
      `/proposals/${proposalId}/actions/decline`,
      payload
    );
    if (!data.success || !data.data) throw new Error(data.message || 'Failed to decline');
    return data.data;
  },
};

export { getApiError };
