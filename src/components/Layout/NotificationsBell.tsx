import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationsContext';
import { notificationsApiService, NotificationItem } from '../../services/notificationsApi';

function formatNotificationMessage(item: NotificationItem): { message: string; link?: string } {
  const { type, data } = item.attributes;
  if (type === 'test_run_execution_ended' && data) {
    const testRunId = (data as { test_run_id?: number }).test_run_id;
    const message = 'Test run execution ended';
    const link = testRunId != null ? `/test-runs/${testRunId}` : undefined;
    return { message, link };
  }
  return { message: type.replace(/_/g, ' ') };
}

const NotificationsBell: React.FC = () => {
  const { hasUnread, markAsSeen } = useNotifications();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleBellClick = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      markAsSeen();
      setLoading(true);
      try {
        const res = await notificationsApiService.getNotifications({ itemsPerPage: 5, page: 1 });
        setNotifications(res.data ?? []);
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    const isUnread = item.attributes.readAt == null;
    if (isUnread) {
      notificationsApiService.markAsRead(item.id).catch(() => {});
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleBellClick}
        className="relative p-2 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {hasUnread && (
          <span
            className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900"
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg z-50 flex flex-col">
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-600 font-medium text-slate-900 dark:text-white">
            Notifications
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-slate-500 dark:text-gray-400 text-sm">
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500 dark:text-gray-400 text-sm">
                No notifications
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-600">
                {notifications.map((item) => {
                  const { message, link } = formatNotificationMessage(item);
                  const isUnread = item.attributes.readAt == null;
                  const createdAt = item.attributes.createdAt
                    ? new Date(item.attributes.createdAt).toLocaleString(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : '';
                  const content = (
                    <>
                      {message}
                      {createdAt && (
                        <span className="block text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                          {createdAt}
                        </span>
                      )}
                    </>
                  );
                  return (
                    <li
                      key={item.id}
                      className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${isUnread ? 'bg-slate-50/80 dark:bg-slate-700/30' : ''}`}
                    >
                      {link ? (
                        <Link
                          to={link}
                          onClick={() => handleNotificationClick(item)}
                          className={`block text-sm text-slate-700 dark:text-gray-200 hover:text-cyan-600 dark:hover:text-cyan-400 ${isUnread ? 'font-medium' : ''}`}
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleNotificationClick(item)}
                          className="w-full text-left text-sm text-slate-700 dark:text-gray-200"
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsBell;
