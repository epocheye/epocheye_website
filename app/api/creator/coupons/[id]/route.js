import { NextResponse } from "next/server";

import { backendCreatorFetch } from "@/lib/server/backendSync";
import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";

export const runtime = "nodejs";

export async function DELETE(_request, { params }) {
  const ctx = await getCreatorContext();
  if (ctx.error) return creatorAuthErrorResponse(ctx.error);

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "coupon id required" }, { status: 400 });
  }

  try {
    const res = await backendCreatorFetch(
      ctx.creator,
      `/api/v1/creator/coupons/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    return new NextResponse(await res.text(), {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "coupon backend unavailable" }, { status: 502 });
  }
}
