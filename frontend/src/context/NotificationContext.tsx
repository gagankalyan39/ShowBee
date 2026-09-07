'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { notificationAPI } from '@/lib/api';
import { NotificationItem } from '@/types';
import { useAuth } from './AuthContext';
import { Bell, CheckCircle2, AlertCircle, X } from 'lucide-react';
import Link from 'next/link';

interface ToastData {
  id: string;
  title: string;
  message: string;
  type?: string;
  timestamp: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  socket: Socket | null;
  showToast: (title: string, message: string, type?: string) => void;
  activeToast: ToastData | null;
  dismissToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeToast, setActiveToast] = useState<ToastData | null>(null);

  const displayToast = useCallback((title: string, message: string, type: string = 'SYSTEM') => {
    const toast: ToastData = {
      id: `toast_${Date.now()}`,
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setActiveToast(toast);

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setActiveToast((curr) => (curr?.id === toast.id ? null : curr));
    }, 6000);
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
      (typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : 'http://localhost:5000');
    const s = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    s.on('connect', () => {
      if (user?.id) {
        s.emit('join_user', user.id);
      }
    });

    s.on('new_notification', (newNotif: NotificationItem) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((c) => c + 1);
      displayToast(newNotif.title, newNotif.message, newNotif.type);
    });

    s.on('bookingConfirmed', (data: any) => {
      displayToast(
        '🎟️ Booking Confirmed!',
        `Your booking ${data.ref ? `(Ref: ${data.ref})` : ''} has been successfully processed!`,
        'BOOKING_CONFIRMED'
      );
    });

    s.on('broadcast_notification', (data: any) => {
      const broadcastItem: NotificationItem = {
        id: `bc_${Date.now()}`,
        user_id: user?.id || 'all',
        type: data.type || 'SYSTEM',
        title: data.title,
        message: data.message,
        is_read: false,
        created_at: data.timestamp || new Date().toISOString(),
      };
      setNotifications((prev) => [broadcastItem, ...prev]);
      setUnreadCount((c) => c + 1);
      displayToast(data.title, data.message, data.type || 'SYSTEM');
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user?.id, displayToast]);

  // Ensure user room is joined whenever user becomes available
  useEffect(() => {
    if (socket && socket.connected && user?.id) {
      socket.emit('join_user', user.id);
    }
  }, [socket, user?.id]);

  // Fetch initial notifications when user logs in
  useEffect(() => {
    if (user?.id) {
      notificationAPI
        .getMy()
        .then((res) => {
          if (res.success && res.data) {
            setNotifications(res.data);
            setUnreadCount(res.unreadCount || res.data.filter((n) => !n.is_read).length);
          }
        })
        .catch(() => {});
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        socket,
        showToast: displayToast,
        activeToast,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
