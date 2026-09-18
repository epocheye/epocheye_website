import { NextResponse } from "next/server";

import { backendCreatorFetch } from "@/lib/server/backendSync";
import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";

export const runtime = "nodejs";

const COUPONS_PATH = "/api/v1/creator/coupons";

// A creator's coupon lives in the Go backend (that is what the app redeems).
// Read-only: each creator has exactly one code, and where/when it works is set
// by their site assignment (lib/server/creatorSites.js), not by the creator.
// Runs on the main site so the backend is always called as the website's
// creators.id. The creators app reaches it through its /api/creator/* rewrite.
export async function GET() {
  const ctx = await getCreatorContext();
  if (ctx.error) return creatorAuthErrorResponse(ctx.error);
  if (ctx.creator.status !== "active") {
    return NextResponse.json([]);
  }
  try {
    const res = await backendCreatorFetch(ctx.creator, COUPONS_PATH, { method: "GET" });
    return new NextResponse(await res.text(), {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "coupon backend unavailable" }, { status: 502 });
  }
}
