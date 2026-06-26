import { apiClient, getApiError } from './client';
import type { ApiResponse, Proposal, ProposalHotel, ProposalService, OfferHistoryEntry } from '@/types';
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

  /**
   * Fetch a proposal by id.
   *
   * Optional `language` toggles the BE's GIATA hotel-description language
   * on `proposal.hotels[i].description` (defaults to `en`). Pass `'de'`
   * when the staff member is previewing the German PDF so the inline
   * preview matches the downloadable PDF byte-for-byte.
   *
   * Image URLs, facility lists, hotel names — none of those depend on
   * language. Only the description text is locale-aware.
   */
  async get(id: string, language?: 'en' | 'de'): Promise<Proposal | null> {
    const url = language ? `/proposals/${id}?language=${language}` : `/proposals/${id}`;
    const { data } = await apiClient.get<ApiResponse<Proposal>>(url);
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

  async toggleHotelIncluded(
    proposalId: string,
    hotelId: string,
    includedInTotal: boolean
  ): Promise<{ hotel: ProposalHotel; proposal: Proposal }> {
    const { data } = await apiClient.patch<ApiResponse<{ hotel: ProposalHotel; proposal: Proposal }>>(
      `/proposals/${proposalId}/hotels/${hotelId}`,
      { includedInTotal }
    );
    if (!data.success || !data.data) throw new Error(data.message || 'Failed to update hotel inclusion');
    return data.data;
  },

  /**
   * Set or clear the staff cancellation-deadline override for a hotel
   * on a proposal. Pass `null` to clear (revert to supplier's date).
   * Per BE handover (public/cancellation-override-fe-handover.md):
   *   - Override MUST be strictly earlier than the supplier's date
   *     (BE rejects later overrides with 400 CXL_OVERRIDE_TOO_LATE)
   *   - Override cannot be in the past (400 CXL_OVERRIDE_IN_PAST)
   *   - Proposal must be in draft (409 PROPOSAL_NOT_MODIFIABLE otherwise)
   *
   * Returns the updated ProposalHotel row with refreshed
   * effectiveCancelDeadline so the caller can patch local state without
   * a follow-up GET.
   */
  async updateHotelCancellation(
    proposalId: string,
    hotelId: string,
    cancelDeadlineOverride: string | null,
  ): Promise<ProposalHotel> {
    const { data } = await apiClient.patch<ApiResponse<ProposalHotel>>(
      `/proposals/${proposalId}/hotels/${hotelId}/cancellation`,
      { cancelDeadlineOverride },
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to update cancellation deadline');
    }
    return data.data;
  },

  /**
   * Set or clear the customer-facing payment deadline on a proposal.
   * Pass `null` to clear (Send Offer becomes blocked again on
   * post-cutover proposals).
   *
   * Per BE handover (public/payment-deadline.md):
   *   - Must be strictly earlier than the earliest cancellation deadline
   *     across all hotels (400 PAYMENT_DEADLINE_AFTER_CANCELLATION)
   *   - Cannot be in the past (400 PAYMENT_DEADLINE_IN_PAST)
   *   - Proposal must be in draft (409 PROPOSAL_NOT_MODIFIABLE otherwise)
   *
   * Returns the updated Proposal row so the caller can patch local
   * state without a follow-up GET. Note: BE response may be a partial
   * (handover §2.2 says "...rest of the Proposal row" but doesn't
   * guarantee every field) — callers should merge onto the existing
   * proposal, matching the cancellation-override pattern.
   */
  async updatePaymentDeadline(
    proposalId: string,
    paymentDeadline: string | null,
  ): Promise<Proposal> {
    const { data } = await apiClient.patch<ApiResponse<Proposal>>(
      `/proposals/${proposalId}/payment-deadline`,
      { paymentDeadline },
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to update payment deadline');
    }
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

  async send(proposalId: string, payload?: SendProposalPayload): Promise<{ proposal: Proposal; emailSent: boolean; sendPlaceholder: boolean; emailError: string | null; sentToEmails?: string[]; offer?: Pick<OfferHistoryEntry, 'id' | 'offerNumber' | 'type' | 'pdfUrl' | 'sentAt'> }> {
    const { data } = await apiClient.post<ApiResponse<{ proposal: Proposal; emailSent: boolean; sendPlaceholder: boolean; sent: boolean; emailError: string | null; sentToEmails?: string[]; offer?: Pick<OfferHistoryEntry, 'id' | 'offerNumber' | 'type' | 'pdfUrl' | 'sentAt'> }>>(
      `/proposals/${proposalId}/actions/send`,
      payload ?? {}
    );
    if (!data.success || !data.data) throw new Error(data.message || 'Failed to send');
    return data.data;
  },

  async listOffers(proposalId: string): Promise<OfferHistoryEntry[]> {
    const { data } = await apiClient.get<ApiResponse<{ offers: OfferHistoryEntry[]; count: number }>>(
      `/proposals/${proposalId}/offers`
    );
    if (!data.success || !data.data) return [];
    return data.data.offers ?? [];
  },

  async previewPdf(proposalId: string, language?: string, signal?: AbortSignal): Promise<string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const body: Record<string, string> = {};
    if (language) body.language = language;
    const response = await fetch(`${baseURL}/proposals/${proposalId}/actions/preview-pdf`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(body),
      signal,
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

  /**
   * Download the proposal's current PDF in the chosen language. Triggers a
   * browser save-as dialog using the filename from the Content-Disposition
   * header (the BE includes the language suffix in the filename so users
   * can tell EN/DE downloads apart).
   *
   * Re-rendered server-side from CURRENT proposal data — distinct from the
   * snapshot version captured at send-time. Slower than a cached download
   * (BE: ~1-2s for the DeepL translation step). UX: show a "Downloading…"
   * spinner while this awaits.
   */
  async downloadPdf(proposalId: string, language: string): Promise<void> {
    await downloadBlob(
      `/proposals/${proposalId}/pdf?language=${encodeURIComponent(language)}`,
    );
  },

  /**
   * Download a specific historical offer's PDF in the chosen language.
   * Same re-render semantics as downloadPdf — the cached PDF in storage
   * stays in whichever language it was originally sent in; this endpoint
   * re-renders on demand with CURRENT proposal data.
   */
  async downloadOfferPdf(proposalId: string, offerId: string, language: string): Promise<void> {
    await downloadBlob(
      `/proposals/${proposalId}/offers/${offerId}/pdf?language=${encodeURIComponent(language)}`,
    );
  },
};

/** Shared download helper — fetches a PDF, pulls the filename from
 *  Content-Disposition, and triggers a browser save-as via a synthetic
 *  <a download> click. Handles auth header + ngrok skip + error surface. */
async function downloadBlob(path: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
  const response = await fetch(`${baseURL}${path}`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'ngrok-skip-browser-warning': 'true',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to download PDF (${response.status})`);
  }

  // Pull filename from Content-Disposition. Backend sends it with the
  // language suffix baked in (e.g. "offer-447-de.pdf") so users can tell
  // EN/DE downloads apart in their downloads folder.
  const cd = response.headers.get('Content-Disposition') ?? '';
  const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  const filename = match ? decodeURIComponent(match[1]) : 'offer.pdf';

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Free the blob URL on the next tick (after the click has consumed it).
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export { getApiError };
