import { apiClient, getApiError } from './client';
import type { ApiResponse, Proposal, ProposalHotel, ProposalService } from '@/types';
import type {
  UpdateProposalPayload,
  AddProposalHotelPayload,
  AdjustHotelPricingPayload,
  AddProposalServicePayload,
  SendProposalPayload,
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
  ): Promise<ProposalHotel> {
    const { data } = await apiClient.post<ApiResponse<ProposalHotel>>(
      `/proposals/${proposalId}/hotels/${hotelId}/adjust-pricing`,
      payload
    );
    if (!data.success || !data.data) throw new Error(data.message || 'Failed to adjust pricing');
    return data.data;
  },

  async addService(proposalId: string, payload: AddProposalServicePayload): Promise<ProposalService> {
    const { data } = await apiClient.post<ApiResponse<ProposalService>>(
      `/proposals/${proposalId}/services`,
      payload
    );
    if (!data.success || !data.data) throw new Error(data.message || 'Failed to add service');
    return data.data;
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
};

export { getApiError };
