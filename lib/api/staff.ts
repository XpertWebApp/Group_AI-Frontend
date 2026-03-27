import { apiClient } from './client';

export interface StaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  status: 'active' | 'blocked';
  lastLoginAt: string | null;
  createdAt: string;
}

interface StaffListResponse {
  data: StaffMember[];
  total: number;
  page: number;
  limit: number;
}

interface StaffCreateResponse {
  email: string;
  oneTimePassword: string;
}

export const staffApi = {
  list: async (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
    const { data } = await apiClient.get<{ data: StaffListResponse }>('/settings/staff', { params });
    return data.data;
  },

  create: async (payload: { fullName: string; email: string }) => {
    const { data } = await apiClient.post<{ data: StaffCreateResponse }>('/settings/staff', payload);
    return data.data;
  },

  blockUnblock: async (id: string, action: 'block' | 'unblock') => {
    const { data } = await apiClient.patch<{ data: StaffMember }>(`/settings/staff/${id}/status`, { action });
    return data.data;
  },

  resetPassword: async (id: string) => {
    const { data } = await apiClient.post<{ data: { email: string; oneTimePassword: string } }>(`/settings/staff/${id}/reset-password`);
    return data.data;
  },

  remove: async (id: string) => {
    await apiClient.delete(`/settings/staff/${id}`);
  },
};
