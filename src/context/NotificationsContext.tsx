import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { notificationsApiService } from '../services/notificationsApi';

interface NotificationsContextType {
  /** True when long polling has sent a response and the user has not yet opened the notifications panel. */
  hasUnread: boolean;
  /** Call when long polling receives a response (new notification available). */
  setUnread: () => void;
  /** Call when the user opens the notifications panel (bell dropdown). */
  markAsSeen: () => void;
  /** Check for unread notifications on login/page load. */
  checkInitialUnread: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hasUnread, setHasUnread] = useState(false);

  const setUnread = useCallback(() => {
    setHasUnread(true);
  }, []);

  const markAsSeen = useCallback(() => {
    setHasUnread(false);
  }, []);

  const checkInitialUnread = useCallback(async () => {
    try {
      const response = await notificationsApiService.getNotifications({ itemsPerPage: 5, page: 1 });

      const firstFive = response.data.slice(0, 5);
      const hasUnreadNotifications = firstFive.some(notification => !notification.attributes.readAt);

      setHasUnread(hasUnreadNotifications);
    } catch (error) {
      console.error('Failed to check for unread notifications:', error);
    }
  }, []);

  return (
    <NotificationsContext.Provider value={{ hasUnread, setUnread, markAsSeen, checkInitialUnread }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export function useNotifications(): NotificationsContextType {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
