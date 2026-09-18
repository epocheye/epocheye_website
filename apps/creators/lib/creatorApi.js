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
  // header - independent of whether the session cookie is shared across the
  // creators/main subdomains.
  let authHeaders = {};
  if (typeof window !== "undefined") {
    try {
      const token = await window.Clerk?.session?.getToken();
      if (token) authHeaders = { Authorization: `Bearer ${token}` };
    } catch {
      // Not signed in (or Clerk not ready) - fall back to cookie-based auth.
    }
  }

  // NOTE: We intentionally do NOT redirect to /login on 401.
  //
  // There is no server-side auth protection in this app (proxy.js is a bare
  // clerkMiddleware() with no auth.protect(), by design - see the note there).
  // Access is gated client-side by components/creators/DashboardAuthGate.jsx.
  //
  // A 401 from a data call therefore does NOT mean "signed out". It also occurs
  // when the Clerk session status is "pending" (a session task is outstanding):
  // the bearer token is real, but @clerk/backend's auth() defaults to
  // treatPendingAsSignedOut and returns userId: null. Redirecting on 401 would
  // send such a user to /login, and <SignIn> would bounce them straight back -
  // the /dashboard <-> /login infinite redirect this app has already had once.
  // Callers must handle non-success responses by rendering empty/zero states.
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
