import { apiClient, getApiError } from './client';
import type { ApiResponse, HotelSearchResult, Facility } from '@/types';

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

  async getFacilitiesByDestination(destinationId: number): Promise<Facility[]> {
    const { data } = await apiClient.get<ApiResponse<{ facilities: Facility[] }>>(
      `/hotels/facilities/by-destination/${destinationId}`
    );
    if (!data.success || !data.data?.facilities) return [];
    return data.data.facilities;
  },
};

export { getApiError };
