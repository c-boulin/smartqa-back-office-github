import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
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
  /** Start polling for new notifications. */
  startPolling: () => void;
  /** Stop polling for new notifications. */
  stopPolling: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const POLLING_INTERVAL = 30000;

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hasUnread, setHasUnread] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const setUnread = useCallback(() => {
    setHasUnread(true);
  }, []);

  const markAsSeen = useCallback(() => {
    setHasUnread(false);
  }, []);

  const checkForUnread = async () => {
    try {
      const response = await notificationsApiService.getNotifications({ itemsPerPage: 5, page: 1 });

      const firstFive = response.data.slice(0, 5);
      const hasUnreadNotifications = firstFive.some(notification => !notification.attributes.readAt);

      setHasUnread(hasUnreadNotifications);
    } catch (error) {
      console.error('Failed to check for unread notifications:', error);
    }
  };

  const checkInitialUnread = useCallback(async () => {
    await checkForUnread();
  }, []);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      return;
    }

    checkForUnread();

    pollingIntervalRef.current = setInterval(() => {
      checkForUnread();
    }, POLLING_INTERVAL);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return (
    <NotificationsContext.Provider value={{ hasUnread, setUnread, markAsSeen, checkInitialUnread, startPolling, stopPolling }}>
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
