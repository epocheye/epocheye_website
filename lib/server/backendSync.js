import "server-only";

import jwt from "jsonwebtoken";

/**
 * Syncs a creator's promo code to the Go backend's coupon system.
 * This is fire-and-forget — failures are logged but do not surface to the creator.
 *
 * @param {object} creator  - creator row from website DB (must have id, email, customer_discount)
 * @param {string} code     - the promo code string (e.g. "SAMBIT2025")
 */
export async function syncPromoCodeToBackend(creator, code) {
  const backendUrl = process.env.BACKEND_API_URL;
  const creatorJwtSecret = process.env.CREATOR_JWT_SECRET;

  if (!backendUrl || !creatorJwtSecret) {
    // Not configured — silently skip (dev environments may not have these)
    return;
  }

  try {
    // Generate a short-lived Creator JWT so the backend accepts our request
    const token = jwt.sign(
      { sub: creator.id, email: creator.email, iss: "epocheye-creators" },
      creatorJwtSecret,
      { expiresIn: "5m" }
    );

    const discountPercent = Math.round(Number(creator.customer_discount) || 10);

    const res = await fetch(`${backendUrl}/api/v1/creator/coupons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code,
        discount_percent: discountPercent,
      }),
      // 8-second timeout via AbortSignal
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok && res.status !== 409) {
      // 409 = already exists (idempotent — safe to ignore)
      const text = await res.text().catch(() => "");
      console.error(`[backendSync] coupon sync failed (${res.status}): ${text}`);
    }
  } catch (err) {
    console.error("[backendSync] coupon sync error:", err?.message ?? err);
  }
}
