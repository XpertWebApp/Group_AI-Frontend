import { apiClient } from './client';
import type { ApiResponse, Notification } from '@/types';

type StatValue = number | { value: number; vsLastMonth: number };

export interface DashboardStatsResponse {
  totalRequests: StatValue;
  pending: StatValue;
  pendingRequests?: StatValue;
  sentOffers: StatValue;
  declined: StatValue;
}

export interface RecentOffer {
  id: string;
  requestId?: string;
  referenceNumber: number;
  destinationName?: string;
  destination?: string;
  companyName?: string;
  customer?: string;
  contactName?: string;
  checkinDate: string;
  checkoutDate?: string;
  status: string;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
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

  async getNotifications(params?: { unread?: boolean; limit?: number }): Promise<NotificationsResponse> {
    const { data } = await apiClient.get<ApiResponse<NotificationsResponse>>(
      '/dashboard/notifications',
      { params }
    );
    if (!data.success || !data.data) return { notifications: [], unreadCount: 0 };
    // Handle both array and object response shapes
    if (Array.isArray(data.data)) {
      return { notifications: data.data as unknown as Notification[], unreadCount: 0 };
    }
    return data.data;
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    await apiClient.patch(`/dashboard/notifications/${notificationId}/read`);
  },

  async markAllNotificationsRead(): Promise<void> {
    await apiClient.post('/dashboard/notifications/read-all');
  },
};
