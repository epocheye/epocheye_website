import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { getAdminSettings } from "@/lib/server/creatorRepository";
import {
  assignNext,
  countSalesInWindow,
  endAssignment,
  listLiveAssignments,
  listWaitingCreators,
  rotateSites,
} from "@/lib/server/creatorSites";

export const runtime = "nodejs";

function unauthorized(check) {
  return NextResponse.json({ success: false, error: check.message }, { status: check.status });
}

// Creator sites board: each monument, its creator and window, and the line.
export async function GET(request) {
  const check = verifyAdminJWTFromRequest(request);
  if (!check.ok) return unauthorized(check);

  const [settings, live, waiting] = await Promise.all([
    getAdminSettings(),
    listLiveAssignments(),
    listWaitingCreators(),
  ]);
  const now = new Date().toISOString();
  const liveWithSales = await Promise.all(
    live.map(async (a) => ({
      ...a,
      sales_so_far: await countSalesInWindow(a.creator_id, a.site_slug, a.starts_at, now),
    }))
  );
  const bySite = new Map(liveWithSales.map((a) => [a.site_slug, a]));

  return NextResponse.json({
    success: true,
    data: {
      sites: settings.creator_monuments.map((m) => ({ ...m, assignment: bySite.get(m.slug) ?? null })),
      waiting,
      settings: {
        assignment_days: settings.assignment_days,
        assignment_sales_target: settings.assignment_sales_target,
        max_creators: settings.max_creators,
      },
    },
  });
}

// Actions: { action: "rotate" } | { action: "assign_next", site_slug } |
// { action: "end", assignment_id }
export async function POST(request) {
  const check = verifyAdminJWTFromRequest(request);
  if (!check.ok) return unauthorized(check);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (body?.action === "rotate") {
    const log = await rotateSites();
    return NextResponse.json({ success: true, data: { log } });
  }

  if (body?.action === "end") {
    const ended = await endAssignment(String(body.assignment_id ?? ""));
    if (!ended) {
      return NextResponse.json({ success: false, error: "No live assignment with that id" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { ended } });
  }

  if (body?.action === "assign_next") {
    const settings = await getAdminSettings();
    const site = settings.creator_monuments.find((m) => m.slug && m.slug === body.site_slug);
    if (!site) {
      return NextResponse.json({ success: false, error: "Unknown site" }, { status: 404 });
    }
    const live = await listLiveAssignments();
    if (live.some((a) => a.site_slug === site.slug)) {
      return NextResponse.json(
        { success: false, error: "This site already has a creator. End it first." },
        { status: 409 }
      );
    }
    const result = await assignNext(site);
    if (!result) {
      return NextResponse.json({ success: false, error: "No approved creator is waiting." }, { status: 409 });
    }
    return NextResponse.json({ success: true, data: result });
  }

  return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
}
