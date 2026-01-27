'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/lib/notificationService';

const NotificationContext = createContext(null);

// WebSocket connection states
const WS_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
};

// API Base URL for WebSocket
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState(WS_STATES.DISCONNECTED);
  const [newNotification, setNewNotification] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Get token from localStorage
  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('jwt_token');
  }, []);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const data = await getNotifications(token, 50, 0, false);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [getToken]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const data = await getUnreadCount(token);
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [getToken]);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    const token = getToken();
    if (!token) {
      console.log('[WS] No token available, skipping connection');
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionStatus(WS_STATES.CONNECTING);

    try {
      const wsUrl = `${WS_BASE_URL}/api/notifications/ws?token=${encodeURIComponent(token)}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[WS] Connected to notification server');
        setConnectionStatus(WS_STATES.CONNECTED);
        reconnectAttempts.current = 0;
        // Fetch initial notifications after connection
        fetchNotifications();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);
          console.log('[WS] Received notification:', notification);
          
          // Add to notifications list
          setNotifications(prev => [notification, ...prev]);
          
          // Increment unread count
          if (!notification.is_read) {
            setUnreadCount(prev => prev + 1);
          }
          
          // Set new notification for toast
          setNewNotification(notification);
          
          // Request browser notification permission and show if granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/logo-black.png',
            });
          }
        } catch (error) {
          console.error('[WS] Failed to parse notification:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('[WS] Connection closed:', event.code, event.reason);
        setConnectionStatus(WS_STATES.DISCONNECTED);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[WS] Error:', error);
        setConnectionStatus(WS_STATES.DISCONNECTED);
      };
    } catch (error) {
      console.error('[WS] Failed to create WebSocket:', error);
      setConnectionStatus(WS_STATES.DISCONNECTED);
    }
  }, [getToken, fetchNotifications]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus(WS_STATES.DISCONNECTED);
  }, []);

  // Mark notification as read
  const handleMarkAsRead = useCallback(async (notificationId) => {
    const token = getToken();
    if (!token) return;

    try {
      await markAsRead(token, notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, [getToken]);

  // Mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      await markAllAsRead(token);
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [getToken]);

  // Clear new notification (after toast is dismissed)
  const clearNewNotification = useCallback(() => {
    setNewNotification(null);
  }, []);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Connect on mount if token exists
  useEffect(() => {
    const token = getToken();
    if (token) {
      connectWebSocket();
      requestNotificationPermission();
    }

    // Listen for storage changes (login/logout)
    const handleStorageChange = (e) => {
      if (e.key === 'jwt_token') {
        if (e.newValue) {
          connectWebSocket();
        } else {
          disconnectWebSocket();
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      disconnectWebSocket();
    };
  }, [getToken, connectWebSocket, disconnectWebSocket, requestNotificationPermission]);

  const value = {
    notifications,
    unreadCount,
    connectionStatus,
    newNotification,
    isConnected: connectionStatus === WS_STATES.CONNECTED,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    clearNewNotification,
    refreshNotifications: fetchNotifications,
    refreshUnreadCount: fetchUnreadCount,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export { WS_STATES };
