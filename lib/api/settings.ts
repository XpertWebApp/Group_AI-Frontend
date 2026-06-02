import { apiClient } from './client';
import type { ApiResponse } from '@/types';

/* ── Overview ── */
export interface SettingsOverview {
  general: { updatedAt: string | null };
  supplierLimits: { updatedAt: string | null };
  email: { updatedAt: string | null };
  company: { updatedAt: string | null };
  policies: { updatedAt: string | null };
  staff: { totalStaff: number };
}

/* ── General ── */
export interface GeneralSettings {
  defaultMarkupPercentage: string;
}

/* ── Email Configuration (Brevo SMTP via nodemailer) ──
 *
 * Architecture (per BE handover 2026-06-02):
 *   - SMTP credentials live in .env, never in the DB, never on the wire
 *   - Sender identity (fromName / fromEmail / replyToFallback /
 *     staffNotificationEmail) lives in DB; env is the boot-time default
 *   - Google OAuth flow is gone — single transport, Brevo
 */
export interface SenderIdentity {
  fromName: string;
  fromEmail: string;
  replyToFallback: string;
  staffNotificationEmail: string;
}

export type EmailConnectionStatus = 'connected' | 'error' | 'untested';

export interface BrevoConnection {
  provider: string;                          // "Brevo (SMTP relay)"
  host: string | null;                       // null when SMTP_HOST is unset
  port: number | null;
  security: string | null;                   // "STARTTLS" / "SSL"
  usernameMasked: string | null;             // pre-masked by BE
  passwordMasked: string | null;
  configured: boolean;                       // true ⇒ BE can build a transport
  status: EmailConnectionStatus;
  statusError: string | null;                // human-readable when status === 'error'
  lastTestedAt: string | null;               // ISO 8601 or null
}

export interface InterceptStatus {
  active: boolean;                           // EMAIL_INTERCEPT_TO is set on the BE
  target: string | null;                     // the address all outbound mail is rerouted to
}

export interface EmailSettingsResponse {
  senderIdentity: SenderIdentity;
  connection: BrevoConnection;
  intercept: InterceptStatus;
}

/** Live connection-status payload from /settings/email/test-status */
export interface EmailTestStatus {
  configured: boolean;
  status: EmailConnectionStatus;
  statusError: string | null;
  lastTestedAt: string | null;
}

export interface EmailTestSendResult {
  delivered: boolean;
  messageId: string;
  sentAt: string;
}

/* ── Company ── */
export interface CompanySettings {
  companyName: string;
  assignedPerson: string;
  emailAddress: string;
  phoneNumber: string;
  website: string;
  taxId: string;
  address: string;
}

/* ── Policies ── */
export interface PoliciesSettings {
  termsConditionsEn: string;
  termsConditionsDe: string;
  cancellationConditionsEn: string;
  cancellationConditionsDe: string;
}

/* ── Supplier Limits ── */
export interface SupplierLimit {
  id: string;
  supplierCode: string;
  providerName: string;
  accCode: string | null;
  maxRooms: number;
  groupsAllowed: boolean;
  notes: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface SupplierLimitsResponse {
  data: SupplierLimit[];
  total: number;
  page: number;
  limit: number;
}

export const settingsApi = {
  /* Overview */
  getOverview: async () => {
    const { data } = await apiClient.get<{ data: SettingsOverview }>('/settings');
    return data.data;
  },

  /* General */
  getGeneral: async () => {
    const { data } = await apiClient.get<{ data: GeneralSettings }>('/settings/general');
    return data.data;
  },
  updateGeneral: async (payload: GeneralSettings) => {
    const { data } = await apiClient.put<{ data: GeneralSettings }>('/settings/general', payload);
    return data.data;
  },

  /* Email Configuration (Brevo SMTP) */
  getEmailSettings: async (): Promise<EmailSettingsResponse> => {
    const { data } = await apiClient.get<ApiResponse<EmailSettingsResponse>>('/settings/email');
    if (!data.success || !data.data) throw new Error('Failed to load email settings');
    return data.data;
  },

  updateSenderIdentity: async (payload: Partial<SenderIdentity>): Promise<EmailSettingsResponse> => {
    // Empty string `""` is a valid value (BE treats it as "clear, fall back
    // to env at send time"). Don't strip empty strings before send.
    const { data } = await apiClient.put<ApiResponse<EmailSettingsResponse>>('/settings/email', payload);
    if (!data.success || !data.data) throw new Error('Failed to update email settings');
    return data.data;
  },

  getEmailTestStatus: async (): Promise<EmailTestStatus> => {
    const { data } = await apiClient.get<ApiResponse<EmailTestStatus>>('/settings/email/test-status');
    if (!data.success || !data.data) throw new Error('Failed to load test status');
    return data.data;
  },

  sendEmailTest: async (to: string): Promise<EmailTestSendResult> => {
    const { data } = await apiClient.post<ApiResponse<EmailTestSendResult>>('/settings/email/test-send', { to });
    if (!data.success || !data.data) throw new Error('Failed to send test email');
    return data.data;
  },

  /* Company */
  getCompany: async () => {
    const { data } = await apiClient.get<{ data: CompanySettings }>('/settings/company');
    return data.data;
  },
  updateCompany: async (payload: CompanySettings) => {
    const { data } = await apiClient.put<{ data: CompanySettings }>('/settings/company', payload);
    return data.data;
  },

  /* Policies */
  getPolicies: async () => {
    const { data } = await apiClient.get<{ data: PoliciesSettings }>('/settings/policies');
    return data.data;
  },
  updatePolicies: async (payload: Partial<PoliciesSettings>) => {
    const { data } = await apiClient.put<{ data: PoliciesSettings }>('/settings/policies', payload);
    return data.data;
  },

  /* Supplier Limits */
  getSupplierLimits: async (params?: { search?: string; page?: number; limit?: number }) => {
    const { data } = await apiClient.get<{ data: SupplierLimitsResponse }>('/settings/supplier-limits', { params });
    return data.data;
  },
  updateSupplierLimit: async (supplierCode: string, payload: { maxRooms?: number; groupsAllowed?: boolean; notes?: string | null }) => {
    const { data } = await apiClient.patch<{ data: SupplierLimit }>(`/settings/supplier-limits/${supplierCode}`, payload);
    return data.data;
  },

};
