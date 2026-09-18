import "server-only";

import { syncCreatorCouponState } from "@/lib/server/backendSync";
import { getSql } from "@/lib/server/neon";
import { getAdminSettings, getPromoCodeByCreator } from "@/lib/server/creatorRepository";
import { CREATOR_TERMS_VERSION } from "@/lib/server/creatorProgram";

// Site exclusivity for the creator program.
//
// Each monument on the creator page (admin_settings.creator_monuments, with a
// slug) has at most one live assignment: one creator, for assignment_days. At
// the end of a window, the creator's sales at that site during the window are
// compared with the window's sales_target:
//   met    -> the window is renewed for another assignment_days;
//   missed -> it ends and the site goes to the next creator in line.
// A creator holds at most one site at a time. Their code is live in the app
// only at their site during their window (backend coupon place_ids + dates);
// with no site, the code is switched off.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Live (not ended) assignments, keyed by site slug. */
export async function listLiveAssignments() {
  const sql = getSql();
  const rows = await sql`
    SELECT a.*, c.name AS creator_name, c.email AS creator_email
    FROM site_assignments a
    JOIN creators c ON c.id = a.creator_id
    WHERE a.status <> 'ended'
    ORDER BY a.site_slug
  `;
  return rows;
}

export async function getLiveAssignmentForCreator(creatorId) {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM site_assignments
    WHERE creator_id = ${creatorId} AND status <> 'ended'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Qualifying sales a creator made at a site between two instants. */
export async function countSalesInWindow(creatorId, siteSlug, from, to) {
  const sql = getSql();
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM referral_conversions
    WHERE creator_id = ${creatorId}
      AND site_slug = ${siteSlug}
      AND status <> 'reversed'
      AND converted_at >= ${from}
      AND converted_at < ${to}
  `;
  return Number(rows[0]?.count ?? 0);
}

/**
 * Approved creators without a site, in the order they get one: those who
 * have waited longest since their last window (or never had one) first, then
 * by approval date. Only creators who accepted the current terms qualify.
 */
export async function listWaitingCreators() {
  const sql = getSql();
  return sql`
    SELECT c.id, c.name, c.email, c.approved_at,
           (SELECT MAX(ended_at) FROM site_assignments s WHERE s.creator_id = c.id) AS last_ended_at
    FROM creators c
    WHERE c.status = 'active'
      AND c.terms_version = ${CREATOR_TERMS_VERSION}
      AND NOT EXISTS (
        SELECT 1 FROM site_assignments s WHERE s.creator_id = c.id AND s.status <> 'ended'
      )
    ORDER BY last_ended_at ASC NULLS FIRST, c.approved_at ASC NULLS LAST
  `;
}

async function syncCoupon(creatorId, assignment) {
  const sql = getSql();
  const [creator] = await sql`SELECT * FROM creators WHERE id = ${creatorId}`;
  if (!creator) return false;
  const promo = await getPromoCodeByCreator(creatorId);
  if (!promo?.code) return false;
  return syncCreatorCouponState(creator, promo.code, assignment);
}

/** Gives `site` to `creatorId` for one window starting now. */
export async function assignSite(site, creatorId, { days, target } = {}) {
  const settings = await getAdminSettings();
  const windowDays = days ?? settings.assignment_days;
  const salesTarget = target ?? settings.assignment_sales_target;
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + windowDays * DAY_MS);

  const sql = getSql();
  const [assignment] = await sql`
    INSERT INTO site_assignments (site_slug, site_name, creator_id, starts_at, ends_at, sales_target)
    VALUES (${site.slug}, ${site.name}, ${creatorId}, ${startsAt.toISOString()},
            ${endsAt.toISOString()}, ${salesTarget})
    RETURNING *
  `;
  const synced = await syncCoupon(creatorId, assignment);
  return { assignment, synced };
}

/** Ends a live assignment now and switches the creator's code off. */
export async function endAssignment(assignmentId, salesInWindow) {
  const sql = getSql();
  const [ended] = await sql`
    UPDATE site_assignments
       SET status = 'ended',
           ended_at = NOW(),
           sales_in_window = COALESCE(${salesInWindow ?? null}::int, sales_in_window)
     WHERE id = ${assignmentId} AND status <> 'ended'
     RETURNING *
  `;
  if (ended) await syncCoupon(ended.creator_id, null);
  return ended ?? null;
}

/** Gives a free site to the next creator in line, if there is one. */
export async function assignNext(site) {
  const [next] = await listWaitingCreators();
  if (!next) return null;
  return assignSite(site, next.id);
}

/**
 * The rotation. Safe to run any number of times (daily cron + admin button).
 * Returns a log of what changed.
 */
export async function rotateSites({ now = new Date() } = {}) {
  const settings = await getAdminSettings();
  const sites = settings.creator_monuments.filter((m) => m.slug);
  const live = await listLiveAssignments();
  const bySite = new Map(live.map((a) => [a.site_slug, a]));
  const log = [];
  const sql = getSql();

  for (const site of sites) {
    const current = bySite.get(site.slug);

    if (current && new Date(current.ends_at) > now) continue; // window still running

    if (current) {
      const sales = await countSalesInWindow(
        current.creator_id,
        site.slug,
        current.starts_at,
        current.ends_at
      );
      if (sales >= current.sales_target) {
        // Target met: renew for another window with the current settings.
        const newEnd = new Date(new Date(current.ends_at).getTime() + settings.assignment_days * DAY_MS);
        const [renewed] = await sql`
          UPDATE site_assignments
             SET status = 'renewed', ends_at = ${newEnd.toISOString()},
                 starts_at = ${new Date(current.ends_at).toISOString()},
                 sales_target = ${settings.assignment_sales_target},
                 sales_in_window = 0
           WHERE id = ${current.id}
           RETURNING *
        `;
        await syncCoupon(current.creator_id, renewed);
        log.push({ site: site.slug, action: "renewed", creator: current.creator_name, sales });
        continue;
      }

      const waiting = await listWaitingCreators();
      if (waiting.length === 0) {
        // Nobody else in line: keep the current creator on a fresh window.
        const newEnd = new Date(now.getTime() + settings.assignment_days * DAY_MS);
        const [kept] = await sql`
          UPDATE site_assignments
             SET ends_at = ${newEnd.toISOString()}, starts_at = ${now.toISOString()},
                 sales_target = ${settings.assignment_sales_target}, sales_in_window = 0
           WHERE id = ${current.id}
           RETURNING *
        `;
        await syncCoupon(current.creator_id, kept);
        log.push({ site: site.slug, action: "kept (no one waiting)", creator: current.creator_name, sales });
        continue;
      }

      await endAssignment(current.id, sales);
      log.push({ site: site.slug, action: "ended (target missed)", creator: current.creator_name, sales });
    }

    const next = await assignNext(site);
    if (next) {
      log.push({ site: site.slug, action: "assigned", creatorId: next.assignment.creator_id });
    }
  }

  // A creator whose site was removed from the creator page loses it.
  const siteSlugs = new Set(sites.map((s) => s.slug));
  for (const a of live) {
    if (!siteSlugs.has(a.site_slug)) {
      await endAssignment(a.id);
      log.push({ site: a.site_slug, action: "ended (site removed)", creator: a.creator_name });
    }
  }

  return log;
}

/** Everything the creator dashboard shows about their site. */
export async function getCreatorSiteStatus(creatorId) {
  const assignment = await getLiveAssignmentForCreator(creatorId);
  if (assignment) {
    const sales = await countSalesInWindow(
      creatorId,
      assignment.site_slug,
      assignment.starts_at,
      new Date().toISOString()
    );
    return {
      state: "assigned",
      site_slug: assignment.site_slug,
      site_name: assignment.site_name,
      starts_at: assignment.starts_at,
      ends_at: assignment.ends_at,
      sales_target: assignment.sales_target,
      sales_in_window: sales,
      renewed: assignment.status === "renewed",
    };
  }
  const waiting = await listWaitingCreators();
  const position = waiting.findIndex((c) => c.id === creatorId);
  return { state: "waiting", queue_position: position >= 0 ? position + 1 : null };
}
