import { apiService } from './api';

export interface NotificationAttributes {
  id: number;
  type: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  attributes: NotificationAttributes;
  relationships?: {
    user?: {
      data: {
        type: string;
        id: string;
      };
    };
  };
}

export interface NotificationsListResponse {
  links: {
    self: string;
  };
  meta: {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
  };
  data: NotificationItem[];
}

class NotificationsApiService {
  async getNotifications(params?: { itemsPerPage?: number; page?: number }): Promise<NotificationsListResponse> {
    const itemsPerPage = params?.itemsPerPage ?? 5;
    const page = params?.page ?? 1;
    const query = new URLSearchParams({
      itemsPerPage: String(itemsPerPage),
      page: String(page),
    }).toString();
    const response = await apiService.authenticatedRequest(`/notifications?${query}`);
    if (!response) {
      return {
        links: { self: '/api/notifications/' },
        meta: { totalItems: 0, itemsPerPage, currentPage: page },
        data: [],
      };
    }
    return response as NotificationsListResponse;
  }
}

export const notificationsApiService = new NotificationsApiService();
