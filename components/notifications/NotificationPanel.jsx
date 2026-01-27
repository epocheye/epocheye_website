'use client';

import { Bell, Check, BellOff } from 'lucide-react';
import { useNotifications, WS_STATES } from './NotificationContext';

// Format relative time
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

// Get icon for notification type
function getNotificationIcon(type) {
  // You can customize icons based on notification type
  switch (type) {
    case 'alert':
      return <Bell size={20} />;
    case 'success':
      return <Check size={20} />;
    default:
      return <Bell size={20} />;
  }
}

export default function NotificationPanel({ onClose, isConnected }) {
  const { 
    notifications, 
    unreadCount, 
    connectionStatus,
    markAsRead, 
    markAllAsRead 
  } = useNotifications();

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    // You can add navigation logic here based on notification.data
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case WS_STATES.CONNECTED:
        return 'Live updates enabled';
      case WS_STATES.CONNECTING:
        return 'Connecting...';
      default:
        return 'Offline';
    }
  };

  const getStatusClass = () => {
    switch (connectionStatus) {
      case WS_STATES.CONNECTED:
        return 'connected';
      case WS_STATES.CONNECTING:
        return 'connecting';
      default:
        return 'disconnected';
    }
  };

  return (
    <div className="notification-panel">
      {/* Header */}
      <div className="notification-panel-header">
        <h3 className="notification-panel-title">Notifications</h3>
        {unreadCount > 0 && (
          <button 
            className="notification-mark-all"
            onClick={markAllAsRead}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="notification-empty">
            <BellOff />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
              style={{ position: 'relative' }}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <div className="notification-title">{notification.title}</div>
                <div className="notification-message">{notification.message}</div>
                <div className="notification-time">
                  {formatRelativeTime(notification.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Connection Status */}
      <div className="notification-status">
        <span className={`notification-status-dot ${getStatusClass()}`} />
        <span>{getStatusText()}</span>
      </div>
    </div>
  );
}
