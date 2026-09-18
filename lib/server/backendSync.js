import "server-only";

import jwt from "jsonwebtoken";

/**
 * Calls a creator-scoped Go backend endpoint as `creator`. The backend keys
 * coupons by the JWT `sub`, so this must always be the website's creators.id -
 * the redeem webhook looks the creator up by that same id to pay commission.
 * Throws when the backend is not configured.
 *
 * @param {{ id: string, email?: string }} creator
 * @param {string} path  e.g. "/api/v1/creator/coupons"
 * @param {RequestInit} [init]
 */
export async function backendCreatorFetch(creator, path, init = {}) {
  const backendUrl = process.env.BACKEND_API_URL;
  const creatorJwtSecret = process.env.CREATOR_JWT_SECRET;
  if (!backendUrl || !creatorJwtSecret) {
    throw new Error("BACKEND_API_URL or CREATOR_JWT_SECRET is not configured");
  }

  const token = jwt.sign(
    { sub: creator.id, email: creator.email || "", iss: "epocheye-creators" },
    creatorJwtSecret,
    { expiresIn: "5m" }
  );

  return fetch(`${backendUrl}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
    signal: init.signal ?? AbortSignal.timeout(8000),
  });
}

/** Backend coupons accept whole-number discounts from 5 to 25 percent. */
export function toBackendDiscount(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 10;
  return Math.min(25, Math.max(5, n));
}

/**
 * Creates (or updates) a creator's promo code in the Go backend so the same
 * code works in the app. Re-posting an existing code of the same creator
 * updates its discount. Never throws; returns true when the backend accepted it.
 *
 * @param {object} creator - creator row (id, email, customer_discount)
 * @param {string} code    - the promo code string (e.g. "SAMBIT2025")
 */
export async function syncPromoCodeToBackend(creator, code) {
  if (!code) return false;
  try {
    const res = await backendCreatorFetch(creator, "/api/v1/creator/coupons", {
      method: "POST",
      body: JSON.stringify({
        code,
        discount_percent: toBackendDiscount(creator.customer_discount ?? 10),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[backendSync] coupon sync failed (${res.status}): ${text}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[backendSync] coupon sync error:", err?.message ?? err);
    return false;
  }
}

/**
 * Pushes the launch-offer code from the admin panel to the Go backend so the
 * app can redeem it for a free Explorer Pass (backend migration 113).
 * total → max_uses, enabled → is_active. Renaming the code retires the old one.
 * Never throws; returns true when the backend accepted the update.
 *
 * @param {{ code: string, total: number, enabled: boolean }} offer
 */
export async function syncFreeAccessCodeToBackend({ code, total, enabled }) {
  const backendUrl = process.env.BACKEND_API_URL;
  const creatorJwtSecret = process.env.CREATOR_JWT_SECRET;

  if (!backendUrl || !creatorJwtSecret || !code) {
    return false;
  }

  try {
    const token = jwt.sign(
      { sub: "website-admin", email: "admin@epocheye.com", iss: "epocheye-creators" },
      creatorJwtSecret,
      { expiresIn: "5m" }
    );

    const res = await fetch(`${backendUrl}/api/v1/creator/explorer-pass/free-access-codes`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code,
        max_uses: total,
        is_active: enabled,
        deactivate_others: true,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[backendSync] free-access code sync failed (${res.status}): ${text}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[backendSync] free-access code sync error:", err?.message ?? err);
    return false;
  }
}

/**
 * Puts a creator's code in the state the program says it should be in:
 * live only at their assigned site during their window, off otherwise.
 * `assignment` is a site_assignments row (or null when the creator holds no
 * site). Creates the backend coupon first if it doesn't exist. Never throws;
 * returns true when the backend accepted every call.
 */
export async function syncCreatorCouponState(creator, code, assignment) {
  if (!code) return false;
  if (!(await syncPromoCodeToBackend(creator, code))) return false;
  try {
    const live = Boolean(assignment);
    const res = await backendCreatorFetch(
      creator,
      `/api/v1/creator/coupons/by-code/${encodeURIComponent(code)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          is_active: live,
          set_place_ids: true,
          place_ids: live ? [assignment.site_slug] : null,
          set_valid_from: true,
          valid_from: live ? new Date(assignment.starts_at).toISOString() : null,
          set_expires_at: true,
          expires_at: live ? new Date(assignment.ends_at).toISOString() : null,
        }),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[backendSync] coupon state sync failed (${res.status}): ${text}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[backendSync] coupon state sync error:", err?.message ?? err);
    return false;
  }
}

/** Sum of in-app code entries across a creator's coupons (their "clicks"). */
export async function fetchCreatorCodeEntries(creator) {
  try {
    const res = await backendCreatorFetch(creator, "/api/v1/creator/coupons", { method: "GET" });
    if (!res.ok) return null;
    const list = await res.json();
    return Array.isArray(list) ? list.reduce((sum, c) => sum + Number(c.entries || 0), 0) : null;
  } catch {
    return null;
  }
}
