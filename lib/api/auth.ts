import { apiClient, getApiError } from './client';
import type { ApiResponse, AuthResponse } from '@/types';

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', {
      email,
      password,
    });
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Login failed');
    }
    return data.data;
  },

  async refresh(refreshToken: string): Promise<{ tokens: { accessToken: string; refreshToken: string } }> {
    const { data } = await apiClient.post<ApiResponse<{ tokens: { accessToken: string; refreshToken: string } }>>(
      '/auth/refresh',
      { refreshToken }
    );
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Refresh failed');
    }
    return data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};

export { getApiError };
