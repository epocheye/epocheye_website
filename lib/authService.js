/**
 * Auth Service - Handle authentication and JWT token management
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const TOKEN_KEY = 'jwt_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

/**
 * Login with email/username and password
 * @param {string} identifier - Email or username
 * @param {string} password - User password
 * @returns {Promise<{accessToken: string, uid: string}>}
 */
export async function login(identifier, password) {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      email: identifier, 
      password 
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Login failed');
  }

  const data = await response.json();
  
  // Store tokens in localStorage
  // Backend returns: accessToken, refreshToken, uid
  if (data.accessToken) {
    localStorage.setItem(TOKEN_KEY, data.accessToken);
  }
  if (data.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  }
  if (data.uid) {
    localStorage.setItem(USER_KEY, JSON.stringify({ uid: data.uid }));
  }

  // Dispatch storage event to notify other components (like NotificationContext)
  window.dispatchEvent(new StorageEvent('storage', {
    key: TOKEN_KEY,
    newValue: data.accessToken,
  }));

  return data;
}

/**
 * Register a new user
 * @param {object} userData - User data (email, password, name, etc.)
 * @returns {Promise<object>}
 */
export async function signup(userData) {
  const response = await fetch(`${API_BASE_URL}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Signup failed');
  }

  return response.json();
}

/**
 * Logout - Clear all tokens and user data
 */
export function logout() {
  const hadToken = localStorage.getItem(TOKEN_KEY);
  
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  // Dispatch event to notify other components
  if (hadToken) {
    window.dispatchEvent(new StorageEvent('storage', {
      key: TOKEN_KEY,
      oldValue: hadToken,
      newValue: null,
    }));
  }
}

/**
 * Get current auth token
 * @returns {string|null}
 */
export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get current user data
 * @returns {object|null}
 */
export function getUser() {
  if (typeof window === 'undefined') return null;
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Refresh the auth token
 * @returns {Promise<string>} New access token
 */
export async function refreshToken() {
  const currentRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  
  if (!currentRefreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE_URL}/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: currentRefreshToken }),
  });

  if (!response.ok) {
    logout(); // Clear tokens on refresh failure
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  
  // Backend returns: access_token, generated_at, expires_at
  if (data.access_token) {
    localStorage.setItem(TOKEN_KEY, data.access_token);
  }

  return data.access_token;
}

/**
 * Set token manually (useful for testing or external auth)
 * @param {string} token - JWT token to set
 */
export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    window.dispatchEvent(new StorageEvent('storage', {
      key: TOKEN_KEY,
      newValue: token,
    }));
  }
}
