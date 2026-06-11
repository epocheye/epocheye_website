export async function creatorFetch(path, options = {}) {
  const normalizedPath = path.startsWith("http")
    ? path
    : path.startsWith("/")
      ? path
      : `/${path}`;

  const baseHeaders = options.body
    ? { "Content-Type": "application/json" }
    : {};

  // Attach the Clerk session token so cross-subdomain calls (proxied to the
  // main site via the next.config rewrite) authenticate via the Authorization
  // header — independent of whether the session cookie is shared across the
  // creators/main subdomains.
  let authHeaders = {};
  if (typeof window !== "undefined") {
    try {
      const token = await window.Clerk?.session?.getToken();
      if (token) authHeaders = { Authorization: `Bearer ${token}` };
    } catch {
      // Not signed in (or Clerk not ready) — fall back to cookie-based auth.
    }
  }

  // NOTE: We intentionally do NOT redirect to /login on 401 here. Clerk
  // middleware + the dashboard layout's server-side auth() already redirect
  // genuinely unauthenticated users. A 401 from a data call (e.g. a transient
  // session-propagation issue) must not force a client redirect: /login is a
  // Clerk <SignIn forceRedirectUrl="/dashboard">, so a signed-in user would be
  // bounced straight back, creating an infinite reload loop. Callers handle
  // non-success responses by rendering empty/zero states instead.
  return fetch(normalizedPath, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...baseHeaders,
      ...authHeaders,
      ...(options.headers || {}),
    },
  });
}
