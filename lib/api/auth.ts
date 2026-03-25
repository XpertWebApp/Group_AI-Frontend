import { apiClient, getApiError } from './client';
import type { ApiResponse, AuthResponse } from '@/types';

export const authApi = {
  async login(
    email: string,
    password: string,
    rememberMe?: boolean
  ): Promise<AuthResponse> {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      { email, password, rememberMe },
      { headers: { 'Content-Type': 'application/json' } }
    );
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

  // Google OAuth / Gmail integration
  async getGoogleConnectUrl(): Promise<string> {
    const { data } = await apiClient.get<ApiResponse<{ url: string }>>('/auth/google/connect');
    if (!data.success || !data.data?.url) {
      throw new Error(data.message || 'Failed to get Google connect URL');
    }
    return data.data.url;
  },

  async getGoogleStatus(): Promise<{ connected: boolean }> {
    const { data } = await apiClient.get<ApiResponse<{ connected: boolean }>>('/auth/google/status');
    if (!data.success || !data.data) {
      return { connected: false };
    }
    return data.data;
  },

  async disconnectGoogle(): Promise<void> {
    await apiClient.post('/auth/google/disconnect');
  },
};

export { getApiError };
