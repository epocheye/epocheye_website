import "server-only";

import { getHeritageSql } from "./heritageDb";

/**
 * Aggregate reads over the first-party analytics pipeline (analytics_events,
 * created by Go migration 063) plus existing behavioural tables. Every query is
 * defensive: a missing table/column yields a zero/empty result instead of
 * breaking the whole dashboard, so this works even before every table exists.
 *
 * Active-user / DAU counts use the user_uuid when known, else the anonymous
 * install id, so pre-login activity still counts exactly once. That identity
 * expression is constant SQL written inline (never interpolated) so it stays a
 * raw fragment rather than a bound parameter.
 */

function clampDays(days) {
  const n = Number(days);
  if (!Number.isFinite(n)) return 30;
  return Math.min(Math.max(Math.round(n), 1), 365);
}

async function scalar(promise, fallback = 0) {
  try {
    const rows = await promise;
    const row = rows?.[0];
    if (!row) return fallback;
    const val = Object.values(row)[0];
    return val == null ? fallback : val;
  } catch {
    return fallback;
  }
}

async function rowsOrEmpty(promise) {
  try {
    return (await promise) ?? [];
  } catch {
    return [];
  }
}

/** Top-line KPI cards. */
export async function getAnalyticsOverview() {
  const sql = getHeritageSql();
  const [
    totalUsers,
    newUsersToday,
    dau,
    wau,
    mau,
    totalEvents,
    eventsToday,
    sessions30,
    scansTotal,
    scansToday,
    visitsTotal,
    sharesTotal,
  ] = await Promise.all([
    scalar(sql`SELECT COUNT(*)::int FROM users`),
    scalar(sql`SELECT COUNT(*)::int FROM users WHERE created_at >= CURRENT_DATE`),
    scalar(sql`SELECT COUNT(DISTINCT COALESCE(user_uuid::text, 'anon:' || anon_id))::int FROM analytics_events WHERE created_at >= CURRENT_DATE`),
    scalar(sql`SELECT COUNT(DISTINCT COALESCE(user_uuid::text, 'anon:' || anon_id))::int FROM analytics_events WHERE created_at >= NOW() - INTERVAL '7 days'`),
    scalar(sql`SELECT COUNT(DISTINCT COALESCE(user_uuid::text, 'anon:' || anon_id))::int FROM analytics_events WHERE created_at >= NOW() - INTERVAL '30 days'`),
    scalar(sql`SELECT COUNT(*)::int FROM analytics_events`),
    scalar(sql`SELECT COUNT(*)::int FROM analytics_events WHERE created_at >= CURRENT_DATE`),
    scalar(sql`SELECT COUNT(DISTINCT session_id)::int FROM analytics_events WHERE created_at >= NOW() - INTERVAL '30 days'`),
    scalar(sql`SELECT COUNT(*)::int FROM analytics_events WHERE event_name = 'scan_started'`),
    scalar(sql`SELECT COUNT(*)::int FROM analytics_events WHERE event_name = 'scan_started' AND created_at >= CURRENT_DATE`),
    scalar(sql`SELECT COUNT(*)::int FROM user_visits`),
    scalar(sql`SELECT COUNT(*)::int FROM share_links`),
  ]);

  // Stickiness = DAU / MAU (a robust retention proxy without a cohort job).
  const stickiness = mau > 0 ? Math.round((dau / mau) * 100) : 0;

  return {
    totalUsers,
    newUsersToday,
    dau,
    wau,
    mau,
    stickiness,
    totalEvents,
    eventsToday,
    sessions30,
    scansTotal,
    scansToday,
    visitsTotal,
    sharesTotal,
  };
}

/** Daily distinct active users for the last N days. */
export async function getActiveUsersSeries(days) {
  const d = clampDays(days);
  const sql = getHeritageSql();
  return rowsOrEmpty(sql`
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
           COUNT(DISTINCT COALESCE(user_uuid::text, 'anon:' || anon_id))::int AS value
    FROM analytics_events
    WHERE created_at >= (CURRENT_DATE - make_interval(days => ${d}))
    GROUP BY 1 ORDER BY 1`);
}

/** Daily count of a single event for the last N days. */
export async function getEventSeries(eventName, days) {
  const d = clampDays(days);
  const sql = getHeritageSql();
  return rowsOrEmpty(sql`
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
           COUNT(*)::int AS value
    FROM analytics_events
    WHERE event_name = ${eventName}
      AND created_at >= (CURRENT_DATE - make_interval(days => ${d}))
    GROUP BY 1 ORDER BY 1`);
}

/** Daily new signups for the last N days (from the users table). */
export async function getNewUsersSeries(days) {
  const d = clampDays(days);
  const sql = getHeritageSql();
  return rowsOrEmpty(sql`
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
           COUNT(*)::int AS value
    FROM users
    WHERE created_at >= (CURRENT_DATE - make_interval(days => ${d}))
    GROUP BY 1 ORDER BY 1`);
}

/** Most frequent events for the last N days. */
export async function getTopEvents(days, limit = 20) {
  const d = clampDays(days);
  const sql = getHeritageSql();
  return rowsOrEmpty(sql`
    SELECT event_name, COUNT(*)::int AS value
    FROM analytics_events
    WHERE created_at >= (CURRENT_DATE - make_interval(days => ${d}))
    GROUP BY 1 ORDER BY value DESC LIMIT ${limit}`);
}

/** Scan outcome breakdown (grounded / ai / out_of_scope / ...) last N days. */
export async function getScanOutcomes(days) {
  const d = clampDays(days);
  const sql = getHeritageSql();
  return rowsOrEmpty(sql`
    SELECT COALESCE(props->>'match', 'unknown') AS label, COUNT(*)::int AS value
    FROM analytics_events
    WHERE event_name = 'scan_result'
      AND created_at >= (CURRENT_DATE - make_interval(days => ${d}))
    GROUP BY 1 ORDER BY value DESC`);
}

/** Most-viewed sites last N days (from site_viewed events). */
export async function getTopSites(days, limit = 10) {
  const d = clampDays(days);
  const sql = getHeritageSql();
  return rowsOrEmpty(sql`
    SELECT COALESCE(props->>'slug', '(unknown)') AS label, COUNT(*)::int AS value
    FROM analytics_events
    WHERE event_name = 'site_viewed'
      AND created_at >= (CURRENT_DATE - make_interval(days => ${d}))
    GROUP BY 1 ORDER BY value DESC LIMIT ${limit}`);
}

/** Platform split (distinct identities) last N days. */
export async function getPlatformSplit(days) {
  const d = clampDays(days);
  const sql = getHeritageSql();
  return rowsOrEmpty(sql`
    SELECT COALESCE(NULLIF(platform, ''), 'unknown') AS label,
           COUNT(DISTINCT COALESCE(user_uuid::text, 'anon:' || anon_id))::int AS value
    FROM analytics_events
    WHERE created_at >= (CURRENT_DATE - make_interval(days => ${d}))
    GROUP BY 1 ORDER BY value DESC`);
}
