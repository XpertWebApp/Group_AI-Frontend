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

/* ── Email / SMTP ── */
export interface EmailSettings {
  smtpHost: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
}

export interface EmailConfigUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  isActive: boolean;
  googleConnected: boolean;
}

export interface EmailConfig {
  users: EmailConfigUser[];
  fromName: string;
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

const SMTP_PASSWORD_MASK = '••••••••••••';

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

  /* Email */
  getEmail: async () => {
    const { data } = await apiClient.get<{ data: EmailSettings }>('/settings/email');
    return data.data;
  },
  updateEmail: async (payload: Partial<EmailSettings>) => {
    // If password is still the mask, omit it so backend doesn't overwrite
    const body = { ...payload };
    if (body.smtpPassword === SMTP_PASSWORD_MASK) {
      delete body.smtpPassword;
    }
    const { data } = await apiClient.put<{ data: EmailSettings }>('/settings/email', body);
    return data.data;
  },

  /* Email Config (new Google-based) */
  getEmailConfig: async (): Promise<EmailConfig> => {
    const { data } = await apiClient.get<ApiResponse<EmailConfig>>('/settings/email');
    if (!data.success || !data.data) throw new Error('Failed to load email config');
    return data.data;
  },
  updateFromName: async (fromName: string): Promise<void> => {
    await apiClient.put('/settings/email', { fromName });
  },
  disconnectGoogle: async (userId: string): Promise<void> => {
    await apiClient.post(`/settings/email/disconnect/${userId}`);
  },
  getGoogleConnectUrl: async (): Promise<string> => {
    const { data } = await apiClient.get<ApiResponse<{ url: string }>>('/auth/google/connect');
    if (!data.success || !data.data?.url) throw new Error('Failed to get Google connect URL');
    return data.data.url;
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

  SMTP_PASSWORD_MASK,
};
