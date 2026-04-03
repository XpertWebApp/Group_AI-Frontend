import { apiClient, getApiError } from './client';
import type { ApiResponse, HotelSearchResult, Facility } from '@/types';

export interface HotelSearchParams {
  q?: string;
  destinationId?: number;
  starRating?: number;
  limit?: number;
  offset?: number;
}

export interface HotelFacilityGroup {
  Category: string;
  Facilities: string[];
}

export interface HotelDetail {
  hotelCode: string;
  name: string;
  description?: string | null;
  location?: string | null;
  address?: string | null;
  addressCity?: string | null;
  addressCountry?: string | null;
  starRating?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  totalRooms?: number | null;
  propertyType?: number | null;
  category?: string | null;
  email?: string | null;
  phone?: string | null;
  images: string[];
  roomFacilities: string[];
  hotelFacilities: HotelFacilityGroup[];
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

  async getDetails(hotelCode: string): Promise<HotelDetail> {
    const { data } = await apiClient.get<ApiResponse<HotelDetail>>(
      `/hotels/details?code=${encodeURIComponent(hotelCode)}`
    );
    if (!data.success || !data.data) throw new Error('Hotel details not found');
    return data.data;
  },
};

export { getApiError };
