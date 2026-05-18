import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export interface Destination {
  id: number;
  name: string;
  countryCode: string;
  region: string | null;
}

// Returns full country name for a 2-letter ISO code using the browser Intl API.
// Falls back to the code itself if unsupported (e.g. in Node/test env).
export function getCountryName(code: string, locale = 'en'): string {
  try {
    const display = new Intl.DisplayNames([locale], { type: 'region' });
    return display.of(code) ?? code;
  } catch {
    return code;
  }
}

export const destinationsApi = {
  async search(query: string, limit = 50): Promise<Destination[]> {
    if (query.length < 2) return [];
    const { data } = await apiClient.get<ApiResponse<Destination[]>>(
      '/destinations/search',
      { params: { q: query, limit } }
    );
    if (!data.success || !Array.isArray(data.data)) return [];
    return data.data;
  },
};
