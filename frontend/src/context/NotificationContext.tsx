import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { notificationApi } from '../services/notificationApi';
import socketClient from '../sockets/socket';
import { useAuth } from './AuthContext';

export type NotificationItem = {
  _id?: string;
  id?: string;
  title?: string;
  message?: string;
  type?: string;
  isRead?: boolean;
  createdAt?: string;
  [key: string]: any;
};

type NotificationContextType = {
  notifications: NotificationItem[];
  unreadCount: number;
  load: (page?: number) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNotification: (notification: NotificationItem) => void;
  dismissNotification: (id?: string | null) => void;
  clearNotifications: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { isAuthenticated, user } = useAuth();

  // Ref to prevent duplicate initial loads (React StrictMode double-mount)
  const hasInitiallyLoaded = React.useRef(false);

  const load = useCallback(async (page = 1) => {
    try {
      const res: any = await notificationApi.list(page);
      const data = res?.data || res;
      const items: NotificationItem[] = Array.isArray(data?.data?.items) ? data.data.items : [];
      setNotifications(items);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  }, []);

  // Load notifications once when user authenticates
  useEffect(() => {
    if (!isAuthenticated) {
      hasInitiallyLoaded.current = false;
      return;
    }
    if (hasInitiallyLoaded.current) return;
    hasInitiallyLoaded.current = true;
    load(1);
  }, [isAuthenticated, load]);

  useEffect(() => {
    if (!isAuthenticated) return;
    try { socketClient.initSocket(); } catch (e) { console.warn('socket init in NotificationContext failed', e); }

    const handler = (n: NotificationItem) => {
      try {
        const t = (n.type || '').toLowerCase();
        const isAdminNotif = t === 'admin';
        const isUserAdmin = (user && (user.role === 'admin' || (user as any).role === 'admin')) || false;
        if (isAdminNotif && !isUserAdmin) return; // don't surface admin notifications to non-admins
      } catch (e) {
        // ignore
      }
      setNotifications(prev => [n, ...prev]);
    };

    socketClient.on('notification', handler);
    return () => socketClient.off('notification', handler);
  }, [isAuthenticated, user]);

  const addNotification = useCallback((notification: NotificationItem) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: notification.id || Math.random().toString(36).substring(2, 9),
      createdAt: notification.createdAt || new Date().toISOString(),
      isRead: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications(prev => prev.map(n => (n._id === id || n.id === id ? { ...n, isRead: true } : n)));
    } catch (e) {
      console.error('markRead failed', e);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error('markAllRead failed', e);
    }
  };

  const dismissNotification = (id?: string | null) => {
    if (!id) return;
    setNotifications(prev => prev.filter(n => (n._id ? n._id !== id : n.id !== id)));
  };

  const clearNotifications = () => setNotifications([]);

  // Derive unread count by role: admin users count only 'admin' notifications; non-admins exclude 'admin'
  useEffect(() => {
    try {
      const isUserAdmin = (user && (user.role === 'admin' || (user as any).role === 'admin')) || false;
      const count = notifications.filter(n => {
        if (n.isRead) return false;
        const t = (n.type || '').toLowerCase();
        if (isUserAdmin) return t === 'admin';
        return t !== 'admin';
      }).length;
      setUnreadCount(count);
    } catch (e) {
      // ignore
    }
  }, [notifications, user]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        load,
        markRead,
        markAllRead,
        addNotification,
        dismissNotification,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

export default NotificationContext;
