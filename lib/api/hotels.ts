import { apiClient, getApiError } from './client';
import type { ApiResponse, HotelSearchResult } from '@/types';

export interface HotelSearchParams {
  q?: string;
  destinationId?: number;
  starRating?: number;
  limit?: number;
  offset?: number;
}

export const hotelsApi = {
  async search(params: HotelSearchParams): Promise<HotelSearchResult[]> {
    const { data } = await apiClient.get<ApiResponse<HotelSearchResult[]>>('/hotels/search', {
      params,
    });
    if (!data.success || !Array.isArray(data.data)) return [];
    return data.data;
  },
};

export { getApiError };
