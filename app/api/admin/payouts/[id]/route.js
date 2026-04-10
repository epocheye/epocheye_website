import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { updatePayoutStatus } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function PUT(request, { params }) {
  const adminCheck = verifyAdminJWTFromRequest(request);
  if (!adminCheck.ok) {
    return NextResponse.json(
      { success: false, error: adminCheck.message },
      { status: adminCheck.status }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const status = body?.status;
  if (!["pending", "processing", "completed", "failed"].includes(status)) {
    return NextResponse.json(
      { success: false, error: "status must be pending, processing, completed, or failed" },
      { status: 400 }
    );
  }

  const resolved = await params;
  await updatePayoutStatus({ payoutRequestId: resolved?.id, status });

  return NextResponse.json({ success: true, message: "Payout updated" });
}
