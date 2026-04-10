import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { listAllPayouts } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function GET(request) {
  const adminCheck = verifyAdminJWTFromRequest(request);
  if (!adminCheck.ok) {
    return NextResponse.json(
      { success: false, error: adminCheck.message },
      { status: adminCheck.status }
    );
  }

  const payouts = await listAllPayouts();
  return NextResponse.json({ success: true, data: payouts });
}
