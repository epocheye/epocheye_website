import { NextResponse } from "next/server";

import { backendCreatorFetch, toBackendDiscount } from "@/lib/server/backendSync";
import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";

export const runtime = "nodejs";

const COUPONS_PATH = "/api/v1/creator/coupons";

// Creator coupons live in the Go backend (that is what the app redeems). These
// routes run on the main site so the backend is always called as the website's
// creators.id - the id the redeem webhook uses to credit commission. The
// creators app reaches them through its /api/creator/* rewrite.

async function passthrough(res) {
  return new NextResponse(await res.text(), {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}

export async function GET() {
  const ctx = await getCreatorContext();
  if (ctx.error) return creatorAuthErrorResponse(ctx.error);
  try {
    return passthrough(await backendCreatorFetch(ctx.creator, COUPONS_PATH, { method: "GET" }));
  } catch (err) {
    return NextResponse.json({ error: err?.message || "coupon backend unavailable" }, { status: 502 });
  }
}

export async function POST(request) {
  const ctx = await getCreatorContext();
  if (ctx.error) return creatorAuthErrorResponse(ctx.error);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  // The customer discount is set by Epocheye per creator (admin panel), never
  // by the creator: commission is paid on list price, so a creator gains
  // nothing from a bigger discount and cannot trade their earnings for one.
  const payload = {
    ...body,
    discount_percent: toBackendDiscount(ctx.creator.customer_discount ?? 10),
  };

  try {
    const res = await backendCreatorFetch(ctx.creator, COUPONS_PATH, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return passthrough(res);
  } catch (err) {
    return NextResponse.json({ error: err?.message || "coupon backend unavailable" }, { status: 502 });
  }
}
