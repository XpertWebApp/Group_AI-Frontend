import { apiClient } from './client';
import type { ApiResponse, Notification } from '@/types';

export interface DashboardStatItem {
  value: number;
  vsLastMonth: number;
}

export interface DashboardStatsResponse {
  totalRequests: DashboardStatItem;
  pendingRequests: DashboardStatItem;
  sentOffers: DashboardStatItem;
  declined: DashboardStatItem;
}

export interface RecentOffer {
  id: string;
  referenceNumber: number;
  offerId: string;
  customer: string;
  destination: string;
  checkinDate: string;
  nights: number;
  totalRooms: number;
  groupSize: number;
  totalSell: number;
  totalBuy: number;
  margin: number;
  marginPct: number;
  status: string;
  proposalId: string;
  createdAt: string;
}

export const dashboardApi = {
  async getStats(): Promise<DashboardStatsResponse | null> {
    const { data } = await apiClient.get<ApiResponse<DashboardStatsResponse>>('/dashboard/stats');
    if (!data.success || !data.data) return null;
    return data.data;
  },

  async getRecentOffers(limit = 10): Promise<RecentOffer[]> {
    const { data } = await apiClient.get<ApiResponse<RecentOffer[]>>(
      '/dashboard/recent-offers',
      { params: { limit } }
    );
    if (!data.success || !Array.isArray(data.data)) return [];
    return data.data;
  },

  async getNotifications(params?: { unread?: boolean; limit?: number }): Promise<Notification[]> {
    const { data } = await apiClient.get<ApiResponse<Notification[]>>(
      '/dashboard/notifications',
      { params }
    );
    if (!data.success || !Array.isArray(data.data)) return [];
    return data.data;
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    await apiClient.patch(`/dashboard/notifications/${notificationId}/read`);
  },

  async markAllNotificationsRead(): Promise<void> {
    await apiClient.post('/dashboard/notifications/read-all');
  },
};
