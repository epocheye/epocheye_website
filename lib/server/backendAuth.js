import "server-only";

import jwt from "jsonwebtoken";

const DEFAULT_TIMEOUT_MS = 8000;

function getBackendConfig() {
  const backendUrl = process.env.BACKEND_API_URL;
  const creatorJwtSecret = process.env.CREATOR_JWT_SECRET;
  if (!backendUrl) throw new Error("BACKEND_API_URL is not configured");
  if (!creatorJwtSecret) throw new Error("CREATOR_JWT_SECRET is not configured");
  return { backendUrl, creatorJwtSecret };
}

/**
 * Mints a short-lived creator JWT from an already-verified admin payload.
 * The Go backend's CreatorAuth middleware accepts tokens issued by
 * "epocheye-creators" — the admin is acting on behalf of the platform,
 * so we sign with the admin's id/email as sub/email.
 */
function mintCreatorTokenFromAdmin(adminPayload, creatorJwtSecret) {
  return jwt.sign(
    {
      sub: adminPayload.sub,
      email: adminPayload.email,
      iss: "epocheye-creators",
      admin: true,
    },
    creatorJwtSecret,
    { expiresIn: "5m" }
  );
}

/**
 * Proxy a request to the Go backend using a freshly minted creator JWT.
 * Returns { ok, status, data } — data is parsed JSON or { error } on failure.
 */
export async function backendProxy(adminPayload, { method, path, body, query }) {
  const { backendUrl, creatorJwtSecret } = getBackendConfig();
  const token = mintCreatorTokenFromAdmin(adminPayload, creatorJwtSecret);

  let url = `${backendUrl}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const init = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  };

  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || "Invalid JSON response" };
  }

  return { ok: res.ok, status: res.status, data };
}
