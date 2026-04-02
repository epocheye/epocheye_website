const API_BASE = process.env.NEXT_PUBLIC_CREATOR_API_URL || "http://localhost:3001";

const KEYS = {
  accessToken: "creator_jwt",
  refreshToken: "creator_refresh_token",
  userData: "creator_data",
};

function dispatchAuthEvent(type) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new StorageEvent("storage", { key: KEYS.accessToken }));
}

export async function creatorSignup(data) {
  const res = await fetch(`${API_BASE}/api/creator/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Signup failed");

  const { access_token, refresh_token, creator, promo_code } = json.data;
  localStorage.setItem(KEYS.accessToken, access_token);
  localStorage.setItem(KEYS.refreshToken, refresh_token);
  localStorage.setItem(KEYS.userData, JSON.stringify({ ...creator, promo_code }));
  dispatchAuthEvent("login");

  return json.data;
}

export async function creatorLogin(email, password) {
  const res = await fetch(`${API_BASE}/api/creator/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Login failed");

  const { access_token, refresh_token, creator, promo_code } = json.data;
  localStorage.setItem(KEYS.accessToken, access_token);
  localStorage.setItem(KEYS.refreshToken, refresh_token);
  localStorage.setItem(KEYS.userData, JSON.stringify({ ...creator, promo_code }));
  dispatchAuthEvent("login");

  return json.data;
}

export function creatorLogout() {
  localStorage.removeItem(KEYS.accessToken);
  localStorage.removeItem(KEYS.refreshToken);
  localStorage.removeItem(KEYS.userData);
  dispatchAuthEvent("logout");
}

export function getCreatorToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.accessToken);
}

export function getCreatorData() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(KEYS.userData) || "null");
  } catch {
    return null;
  }
}

export function isCreatorAuthenticated() {
  return !!getCreatorToken();
}

export async function refreshCreatorToken() {
  const refreshToken = localStorage.getItem(KEYS.refreshToken);
  if (!refreshToken) throw new Error("No refresh token");

  const res = await fetch(`${API_BASE}/api/creator/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "Token refresh failed");

  localStorage.setItem(KEYS.accessToken, json.data.access_token);
  return json.data.access_token;
}

/** Fetch wrapper that auto-attaches creator JWT and retries on 401 */
export async function creatorFetch(path, options = {}) {
  const token = getCreatorToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  let res = await fetch(url, { ...options, headers });

  // Attempt token refresh on 401
  if (res.status === 401) {
    try {
      const newToken = await refreshCreatorToken();
      res = await fetch(url, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    } catch {
      creatorLogout();
      if (typeof window !== "undefined") window.location.href = "/creators/login";
      throw new Error("Session expired");
    }
  }

  return res;
}
