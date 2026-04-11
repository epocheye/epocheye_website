import "server-only";

import { getSql } from "@/lib/server/neon";

const CREATOR_UPDATE_FIELDS = new Set([
  "name",
  "email",
  "instagram_url",
  "youtube_url",
  "tiktok_url",
  "twitter_url",
  "niche",
  "upi_id",
  "commission_rate",
  "customer_discount",
  "status",
  "country",
]);

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeCreator(row) {
  if (!row) return null;

  return {
    ...row,
    commission_rate: toNumber(row.commission_rate),
    customer_discount: toNumber(row.customer_discount),
  };
}

export function toPublicProfile(row) {
  const creator = normalizeCreator(row);
  if (!creator) return null;

  const {
    clerk_user_id: _clerkUserId,
    ...publicFields
  } = creator;

  return publicFields;
}

function generatePromoCode(name) {
  const base = String(name || "CREATOR")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6)
    .padEnd(3, "X");
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return base + suffix;
}

export async function findCreatorByClerkUserId(clerkUserId) {
  const sql = getSql();
  const rows = await sql`
    SELECT *
    FROM creators
    WHERE clerk_user_id = ${clerkUserId}
    LIMIT 1
  `;
  return normalizeCreator(rows[0] ?? null);
}

export async function findCreatorById(id) {
  const sql = getSql();
  const rows = await sql`
    SELECT *
    FROM creators
    WHERE id = ${id}
    LIMIT 1
  `;
  return normalizeCreator(rows[0] ?? null);
}

export async function findCreatorByEmail(email) {
  const sql = getSql();
  const rows = await sql`
    SELECT *
    FROM creators
    WHERE email = ${String(email).toLowerCase()}
    LIMIT 1
  `;
  return normalizeCreator(rows[0] ?? null);
}

export async function createCreator({ clerkUserId, name, email }) {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO creators (
      clerk_user_id,
      name,
      email,
      instagram_url,
      youtube_url,
      tiktok_url,
      twitter_url,
      niche,
      upi_id
    )
    VALUES (
      ${clerkUserId},
      ${name},
      ${String(email).toLowerCase()},
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL
    )
    RETURNING *
  `;

  return normalizeCreator(rows[0]);
}

export async function updateCreator(id, fields) {
  const sql = getSql();
  const updates = [];
  const values = [];

  for (const [key, rawValue] of Object.entries(fields || {})) {
    if (!CREATOR_UPDATE_FIELDS.has(key)) continue;
    updates.push(`${key} = $${values.length + 1}`);
    values.push(rawValue ?? null);
  }

  if (!updates.length) {
    return findCreatorById(id);
  }

  values.push(id);
  const rows = await sql.query(
    `UPDATE creators SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values
  );

  return normalizeCreator(rows[0] ?? null);
}

export async function listAllCreators() {
  const sql = getSql();
  const rows = await sql`
    SELECT *
    FROM creators
    ORDER BY created_at DESC
  `;

  return rows.map((row) => normalizeCreator(row));
}

export async function createPromoCodeForCreator(creatorId, name) {
  const sql = getSql();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generatePromoCode(name);

    try {
      const rows = await sql`
        INSERT INTO promo_codes (creator_id, code, is_active)
        VALUES (${creatorId}, ${code}, true)
        RETURNING *
      `;
      return rows[0] ?? null;
    } catch (error) {
      if (error?.code === "23505") {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Could not generate unique promo code");
}

export async function getPromoCodeByCreator(creatorId) {
  const sql = getSql();
  const rows = await sql`
    SELECT *
    FROM promo_codes
    WHERE creator_id = ${creatorId}
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getPromoCodeByCode(code) {
  const sql = getSql();
  const rows = await sql`
    SELECT *
    FROM promo_codes
    WHERE code = ${String(code).toUpperCase()}
      AND is_active = true
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function ensureCreatorForUser({ clerkUserId, email, name }) {
  let creator = await findCreatorByClerkUserId(clerkUserId);

  if (!creator) {
    creator = await createCreator({
      clerkUserId,
      email,
      name: name || email.split("@")[0] || "Creator",
    });
  } else {
    const updates = {};
    const normalizedEmail = String(email).toLowerCase();

    if (creator.email !== normalizedEmail) {
      updates.email = normalizedEmail;
    }

    if (name && creator.name !== name) {
      updates.name = name;
    }

    if (Object.keys(updates).length) {
      creator = await updateCreator(creator.id, updates);
    }
  }

  let promo = await getPromoCodeByCreator(creator.id);
  let promoIsNew = false;
  if (!promo) {
    promo = await createPromoCodeForCreator(creator.id, creator.name);
    promoIsNew = true;
  }

  return {
    creator,
    promo,
    promoIsNew,
  };
}

export async function recordClick({ code, creatorId, ipAddress, userAgent }) {
  const sql = getSql();
  await sql`
    INSERT INTO referral_clicks (code, creator_id, ip_address, user_agent)
    VALUES (
      ${String(code).toUpperCase()},
      ${creatorId ?? null},
      ${ipAddress ?? null},
      ${userAgent ?? null}
    )
  `;
}

export async function recordConversion({
  code,
  creatorId,
  customerId,
  planAmount,
  commissionRate,
  customerDiscountRate,
}) {
  const sql = getSql();
  const commissionAmount = Number(((planAmount * commissionRate) / 100).toFixed(2));
  const discountAmount = Number(((planAmount * customerDiscountRate) / 100).toFixed(2));

  await sql`
    INSERT INTO referral_conversions (
      code,
      creator_id,
      customer_id,
      plan_amount,
      commission_amount,
      discount_amount,
      currency,
      status
    )
    VALUES (
      ${String(code).toUpperCase()},
      ${creatorId},
      ${customerId},
      ${planAmount},
      ${commissionAmount},
      ${discountAmount},
      'INR',
      'pending'
    )
  `;
}

export async function listContentByCreator(creatorId) {
  const sql = getSql();
  return sql`
    SELECT *
    FROM content_submissions
    WHERE creator_id = ${creatorId}
    ORDER BY submitted_at DESC
  `;
}

export async function createContentSubmission({ creatorId, contentUrl, platform, title }) {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO content_submissions (creator_id, content_url, platform, title)
    VALUES (${creatorId}, ${contentUrl}, ${platform}, ${title ?? null})
    RETURNING *
  `;

  return rows[0] ?? null;
}

export async function deletePendingContentSubmission({ creatorId, contentId }) {
  const sql = getSql();
  const rows = await sql`
    DELETE FROM content_submissions
    WHERE id = ${contentId}
      AND creator_id = ${creatorId}
      AND status = 'pending'
    RETURNING id
  `;

  return rows.length > 0;
}

export async function getAdminSettings() {
  const sql = getSql();
  const rows = await sql`SELECT * FROM admin_settings WHERE id = 1 LIMIT 1`;
  const row = rows[0] ?? {};
  return {
    min_payout_inr: toNumber(row.min_payout_inr, 500),
    default_commission_rate: toNumber(row.default_commission_rate, 10),
    razorpay_payouts_enabled: row.razorpay_payouts_enabled !== false,
    conversion_confirm_days: Number(row.conversion_confirm_days ?? 7),
    product_name: row.product_name ?? "Epocheye Premium",
    product_description:
      row.product_description ?? "Unlock all premium tours and features.",
    product_price_inr: toNumber(row.product_price_inr, 499),
    product_validity_days: Number(row.product_validity_days ?? 30),
    product_enabled: row.product_enabled !== false,
  };
}

export async function updateAdminSettings(fields) {
  const sql = getSql();
  const allowed = [
    "min_payout_inr",
    "default_commission_rate",
    "razorpay_payouts_enabled",
    "conversion_confirm_days",
    "product_name",
    "product_description",
    "product_price_inr",
    "product_validity_days",
    "product_enabled",
  ];
  const updates = {};
  for (const key of allowed) {
    if (key in fields) updates[key] = fields[key];
  }
  if (Object.keys(updates).length === 0) return;

  await sql`
    UPDATE admin_settings SET
      min_payout_inr           = COALESCE(${updates.min_payout_inr ?? null}::numeric, min_payout_inr),
      default_commission_rate  = COALESCE(${updates.default_commission_rate ?? null}::numeric, default_commission_rate),
      razorpay_payouts_enabled = COALESCE(${updates.razorpay_payouts_enabled ?? null}::boolean, razorpay_payouts_enabled),
      conversion_confirm_days  = COALESCE(${updates.conversion_confirm_days ?? null}::int, conversion_confirm_days),
      product_name             = COALESCE(${updates.product_name ?? null}::text, product_name),
      product_description      = COALESCE(${updates.product_description ?? null}::text, product_description),
      product_price_inr        = COALESCE(${updates.product_price_inr ?? null}::numeric, product_price_inr),
      product_validity_days    = COALESCE(${updates.product_validity_days ?? null}::int, product_validity_days),
      product_enabled          = COALESCE(${updates.product_enabled ?? null}::boolean, product_enabled),
      updated_at               = NOW()
    WHERE id = 1
  `;
}

export async function listConversionsByCreator(creatorId, limit = 50) {
  const sql = getSql();
  const settings = await getAdminSettings();
  const confirmDays = settings.conversion_confirm_days;

  const rows = await sql`
    SELECT
      id,
      code,
      plan_amount,
      commission_amount,
      discount_amount,
      currency,
      status,
      converted_at,
      CASE
        WHEN status = 'confirmed' THEN converted_at
        ELSE converted_at + (${confirmDays} * INTERVAL '1 day')
      END AS confirms_on,
      (
        status = 'confirmed'
        OR (status = 'pending' AND converted_at <= NOW() - (${confirmDays} * INTERVAL '1 day'))
      ) AS is_available
    FROM referral_conversions
    WHERE creator_id = ${creatorId}
    ORDER BY converted_at DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    plan_amount: toNumber(row.plan_amount),
    commission_amount: toNumber(row.commission_amount),
    discount_amount: toNumber(row.discount_amount),
    currency: row.currency ?? "INR",
    status: row.status,
    converted_at: row.converted_at,
    confirms_on: row.confirms_on,
    is_available: Boolean(row.is_available),
  }));
}

export async function getAvailableBalance(creatorId) {
  const sql = getSql();
  const settings = await getAdminSettings();
  const confirmDays = settings.conversion_confirm_days;

  const confirmedRows = await sql`
    SELECT COALESCE(SUM(commission_amount), 0) AS total
    FROM referral_conversions
    WHERE creator_id = ${creatorId}
      AND (
        status = 'confirmed'
        OR (status = 'pending' AND converted_at <= NOW() - (${confirmDays} * INTERVAL '1 day'))
      )
  `;

  const requestedRows = await sql`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM payout_requests
    WHERE creator_id = ${creatorId}
      AND status IN ('pending', 'processing', 'completed')
  `;

  const confirmed = toNumber(confirmedRows[0]?.total);
  const requested = toNumber(requestedRows[0]?.total);

  return Number(Math.max(0, confirmed - requested).toFixed(2));
}

export async function listPayoutsByCreator(creatorId) {
  const sql = getSql();
  return sql`
    SELECT *
    FROM payout_requests
    WHERE creator_id = ${creatorId}
    ORDER BY requested_at DESC
  `;
}

export async function createPayoutRequest({ creatorId, amount, upiId }) {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO payout_requests (creator_id, amount, currency, status, upi_id)
    VALUES (${creatorId}, ${amount}, 'INR', 'processing', ${upiId})
    RETURNING *
  `;

  return rows[0] ?? null;
}

export async function attachRazorpayPayoutId({ payoutRequestId, razorpayPayoutId }) {
  const sql = getSql();
  await sql`
    UPDATE payout_requests
    SET razorpay_payout_id = ${razorpayPayoutId}
    WHERE id = ${payoutRequestId}
  `;
}

export async function updatePayoutStatus({ payoutRequestId, status }) {
  const sql = getSql();

  if (status === "completed" || status === "failed") {
    await sql`
      UPDATE payout_requests
      SET status = ${status}, processed_at = NOW()
      WHERE id = ${payoutRequestId}
    `;
    return;
  }

  await sql`
    UPDATE payout_requests
    SET status = ${status}
    WHERE id = ${payoutRequestId}
  `;
}

export async function listAllPayouts() {
  const sql = getSql();
  const rows = await sql`
    SELECT
      pr.*,
      c.name AS creator_name,
      c.email AS creator_email
    FROM payout_requests pr
    LEFT JOIN creators c ON c.id = pr.creator_id
    ORDER BY pr.requested_at DESC
  `;

  return rows.map((row) => ({
    ...row,
    amount: toNumber(row.amount),
  }));
}

export async function listAdminContent() {
  const sql = getSql();
  return sql`
    SELECT
      cs.*,
      c.name AS creator_name,
      c.email AS creator_email
    FROM content_submissions cs
    LEFT JOIN creators c ON c.id = cs.creator_id
    ORDER BY cs.submitted_at DESC
  `;
}

export async function updateAdminContentSubmission({ contentId, status, adminNotes }) {
  const sql = getSql();
  const updates = ["status = $1"];
  const values = [status];

  if (typeof adminNotes === "string") {
    updates.push(`admin_notes = $${values.length + 1}`);
    values.push(adminNotes);
  }

  if (status !== "pending") {
    updates.push("reviewed_at = NOW()");
  }

  values.push(contentId);
  const rows = await sql.query(
    `UPDATE content_submissions SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values
  );

  return rows[0] ?? null;
}

export async function getStatsOverview(creatorId) {
  const sql = getSql();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const settings = await getAdminSettings();
  const confirmDays = settings.conversion_confirm_days;

  const [
    totalClicksRows,
    totalConversionsRows,
    earningsRows,
    payoutRows,
    confirmedRows,
    monthClicksRows,
    monthConversionsRows,
  ] = await Promise.all([
    sql`
      SELECT COUNT(*)::int AS count
      FROM referral_clicks
      WHERE creator_id = ${creatorId}
    `,
    sql`
      SELECT COUNT(*)::int AS count
      FROM referral_conversions
      WHERE creator_id = ${creatorId}
    `,
    sql`
      SELECT commission_amount, status
      FROM referral_conversions
      WHERE creator_id = ${creatorId}
    `,
    sql`
      SELECT amount
      FROM payout_requests
      WHERE creator_id = ${creatorId}
        AND status IN ('pending', 'processing', 'completed')
    `,
    sql`
      SELECT commission_amount
      FROM referral_conversions
      WHERE creator_id = ${creatorId}
        AND (
          status = 'confirmed'
          OR (status = 'pending' AND converted_at <= NOW() - (${confirmDays} * INTERVAL '1 day'))
        )
    `,
    sql`
      SELECT COUNT(*)::int AS count
      FROM referral_clicks
      WHERE creator_id = ${creatorId}
        AND clicked_at >= ${monthStart}
    `,
    sql`
      SELECT COUNT(*)::int AS count
      FROM referral_conversions
      WHERE creator_id = ${creatorId}
        AND converted_at >= ${monthStart}
    `,
  ]);

  let lifetimeEarnings = 0;
  let pendingEarnings = 0;
  let paidEarnings = 0;

  for (const row of earningsRows) {
    const amount = toNumber(row.commission_amount);
    lifetimeEarnings += amount;

    if (row.status === "pending" || row.status === "confirmed") {
      pendingEarnings += amount;
    }

    if (row.status === "paid") {
      paidEarnings += amount;
    }
  }

  const totalRequestedPayouts = payoutRows.reduce(
    (sum, row) => sum + toNumber(row.amount),
    0
  );

  const confirmedEarnings = confirmedRows.reduce(
    (sum, row) => sum + toNumber(row.commission_amount),
    0
  );

  const availableBalance = Math.max(0, confirmedEarnings - totalRequestedPayouts);
  const totalClicks = Number(totalClicksRows[0]?.count ?? 0);
  const totalConversions = Number(totalConversionsRows[0]?.count ?? 0);

  return {
    total_clicks: totalClicks,
    total_conversions: totalConversions,
    conversion_rate:
      totalClicks > 0 ? Number(((totalConversions / totalClicks) * 100).toFixed(1)) : 0,
    lifetime_earnings: Number(lifetimeEarnings.toFixed(2)),
    pending_earnings: Number(pendingEarnings.toFixed(2)),
    paid_earnings: Number(paidEarnings.toFixed(2)),
    available_balance: Number(availableBalance.toFixed(2)),
    current_month_clicks: Number(monthClicksRows[0]?.count ?? 0),
    current_month_conversions: Number(monthConversionsRows[0]?.count ?? 0),
  };
}

export async function getStatsTimeline(creatorId, days = 30) {
  const sql = getSql();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const [clickRows, conversionRows] = await Promise.all([
    sql`
      SELECT TO_CHAR(DATE(clicked_at), 'YYYY-MM-DD') AS date, COUNT(*)::int AS clicks
      FROM referral_clicks
      WHERE creator_id = ${creatorId}
        AND clicked_at >= ${sinceIso}
      GROUP BY DATE(clicked_at)
    `,
    sql`
      SELECT TO_CHAR(DATE(converted_at), 'YYYY-MM-DD') AS date, COUNT(*)::int AS conversions
      FROM referral_conversions
      WHERE creator_id = ${creatorId}
        AND converted_at >= ${sinceIso}
      GROUP BY DATE(converted_at)
    `,
  ]);

  const clickMap = new Map(clickRows.map((row) => [row.date, Number(row.clicks)]));
  const conversionMap = new Map(
    conversionRows.map((row) => [row.date, Number(row.conversions)])
  );

  const timeline = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const key = date.toISOString().split("T")[0];

    timeline.push({
      date: key,
      clicks: clickMap.get(key) ?? 0,
      conversions: conversionMap.get(key) ?? 0,
    });
  }

  return timeline;
}

// ─── Admin helpers ────────────────────────────────────────────────────────────

export async function getAdminOverviewStats() {
  const sql = getSql();

  const [creatorsRow, conversionsRow, payoutsRow, contentRow] = await Promise.all([
    sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active FROM creators`,
    sql`SELECT COALESCE(SUM(commission_amount), 0) AS lifetime FROM referral_conversions`,
    sql`SELECT COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count FROM payout_requests`,
    sql`SELECT COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count FROM content_submissions`,
  ]);

  return {
    total_creators: Number(creatorsRow[0]?.total ?? 0),
    active_creators: Number(creatorsRow[0]?.active ?? 0),
    lifetime_earnings: toNumber(conversionsRow[0]?.lifetime),
    pending_payouts: Number(payoutsRow[0]?.pending_count ?? 0),
    pending_content: Number(contentRow[0]?.pending_count ?? 0),
  };
}

export async function listRecentConversions(limit = 10) {
  const sql = getSql();
  return sql`
    SELECT
      rc.*,
      c.name  AS creator_name,
      c.email AS creator_email
    FROM referral_conversions rc
    LEFT JOIN creators c ON c.id = rc.creator_id
    ORDER BY rc.converted_at DESC
    LIMIT ${limit}
  `;
}

export async function listAllCreatorsWithPromo() {
  const sql = getSql();
  return sql`
    SELECT
      cr.*,
      pc.code AS promo_code
    FROM creators cr
    LEFT JOIN promo_codes pc ON pc.creator_id = cr.id AND pc.is_active = true
    ORDER BY cr.created_at DESC
  `;
}

// ─── Admin user table ─────────────────────────────────────────────────────────

export async function findAdminUserByEmail(email) {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM admin_users WHERE email = ${String(email).toLowerCase()} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createAdminUser(email, passwordHash) {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO admin_users (email, password_hash)
    VALUES (${String(email).toLowerCase()}, ${passwordHash})
    RETURNING *
  `;
  return rows[0] ?? null;
}
