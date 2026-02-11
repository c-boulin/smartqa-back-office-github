import { apiService } from './api';

export interface NotificationAttributes {
  id: number;
  type: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  /** Set by API for the current user (null/undefined = unread). */
  readAt?: string | null;
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
  links?: {
    self: string;
  };
  meta?: {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
  };
  data: NotificationItem[];
}

/** Extract numeric id from JSON:API id (string "123") or IRI ("/api/notifications/123"). */
function parseNotificationId(value: string | number): string {
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const lastSegment = trimmed.split('/').filter(Boolean).pop();
    return lastSegment ?? trimmed;
  }
  return String(value);
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
    const body = response as NotificationsListResponse;
    return {
      links: body.links ?? { self: '/api/notifications/' },
      meta: body.meta ?? { totalItems: body.data?.length ?? 0, itemsPerPage, currentPage: page },
      data: Array.isArray(body.data) ? body.data : [],
    };
  }

  /**
   * Mark a notification as read for the current user.
   * @param id - Notification id (string or number, or IRI like "/api/notifications/1")
   */
  async markAsRead(id: string | number): Promise<void> {
    const segment = parseNotificationId(id);
    await apiService.authenticatedRequest(`/notifications/${segment}/read`, {
      method: 'PUT',
    });
  }

  /**
   * Mark all notifications as read for the current user.
   * Called when the user opens the notifications panel.
   * No-op if the backend does not support this endpoint (404/405).
   */
  async markAllAsRead(): Promise<void> {
    try {
      const requestBody = {
        data: {
          type: 'Notification',
          attributes: {
            read: true,
          },
        },
      };
      await apiService.authenticatedRequest('/notifications/read', {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });
    } catch {
      // Backend may not support bulk mark-as-read; ignore
    }
  }
}

export const notificationsApiService = new NotificationsApiService();
