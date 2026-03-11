import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export interface Destination {
  id: number;
  name: string;
  countryCode: string;
  region: string | null;
}

export const destinationsApi = {
  async search(query: string, limit = 10): Promise<Destination[]> {
    if (query.length < 2) return [];
    const { data } = await apiClient.get<ApiResponse<Destination[]>>(
      '/destinations/search',
      { params: { q: query, limit } }
    );
    if (!data.success || !Array.isArray(data.data)) return [];
    return data.data;
  },
};
