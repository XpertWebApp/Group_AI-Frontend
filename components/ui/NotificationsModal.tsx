'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from './Modal';
import { dashboardApi } from '@/lib/api/dashboard';
import type { Notification } from '@/types';

interface NotificationsModalProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsModal({ open, onClose }: NotificationsModalProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.getNotifications({ limit: 20 });
      setNotifications(data);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, loadNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await dashboardApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await dashboardApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Modal open={open} onClose={onClose} title="Notifications">
      {loading && notifications.length === 0 ? (
        <p className="text-body text-sett-text-accent py-4 text-center">Loading...</p>
      ) : notifications.length === 0 ? (
        <p className="text-body text-sett-text-accent py-4 text-center">
          No notifications yet.
        </p>
      ) : (
        <>
          {unreadCount > 0 && (
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-caption text-sett-primary font-medium hover:underline"
              >
                Mark all as read
              </button>
            </div>
          )}
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`px-3 py-2.5 rounded-input border transition-colors ${
                  n.read
                    ? 'border-sett-border bg-white'
                    : 'border-sett-primary/20 bg-sett-primary/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-sett-text-primary truncate">
                      {n.title}
                    </p>
                    <p className="text-caption text-sett-text-accent mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-caption text-sett-text-muted mt-1">
                      {new Date(n.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      className="shrink-0 w-2 h-2 rounded-full bg-sett-primary mt-2"
                      title="Mark as read"
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
