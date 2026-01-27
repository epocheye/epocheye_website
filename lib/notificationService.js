/**
 * Notification Service - REST API client for notification endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Get notifications for the authenticated user
 * @param {string} token - JWT auth token
 * @param {number} limit - Number of notifications to fetch (default 50, max 100)
 * @param {number} offset - Pagination offset
 * @param {boolean} unreadOnly - Only fetch unread notifications
 * @returns {Promise<{notifications: Array, total: number, unread_count: number}>}
 */
export async function getNotifications(token, limit = 50, offset = 0, unreadOnly = false) {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    unread_only: unreadOnly.toString(),
  });

  const response = await fetch(`${API_BASE_URL}/api/notifications/?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch notifications: ${response.status}`);
  }

  return response.json();
}

/**
 * Get unread notification count
 * @param {string} token - JWT auth token
 * @returns {Promise<{count: number}>}
 */
export async function getUnreadCount(token) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch unread count: ${response.status}`);
  }

  return response.json();
}

/**
 * Mark a notification as read
 * @param {string} token - JWT auth token
 * @param {string} notificationId - Notification UUID
 * @returns {Promise<void>}
 */
export async function markAsRead(token, notificationId) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to mark notification as read: ${response.status}`);
  }
}

/**
 * Mark all notifications as read
 * @param {string} token - JWT auth token
 * @returns {Promise<void>}
 */
export async function markAllAsRead(token) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to mark all as read: ${response.status}`);
  }
}

/**
 * Delete a notification
 * @param {string} token - JWT auth token
 * @param {string} notificationId - Notification UUID
 * @returns {Promise<void>}
 */
export async function deleteNotification(token, notificationId) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete notification: ${response.status}`);
  }
}

/**
 * Get notification preferences
 * @param {string} token - JWT auth token
 * @returns {Promise<Object>}
 */
export async function getPreferences(token) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/preferences`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch preferences: ${response.status}`);
  }

  return response.json();
}

/**
 * Update notification preferences
 * @param {string} token - JWT auth token
 * @param {Object} preferences - Preferences to update
 * @returns {Promise<void>}
 */
export async function updatePreferences(token, preferences) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/preferences`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferences),
  });

  if (!response.ok) {
    throw new Error(`Failed to update preferences: ${response.status}`);
  }
}
