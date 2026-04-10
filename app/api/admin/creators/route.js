import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { listAllCreatorsWithPromo, toPublicProfile } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function GET(request) {
  const adminCheck = verifyAdminJWTFromRequest(request);
  if (!adminCheck.ok) {
    return NextResponse.json(
      { success: false, error: adminCheck.message },
      { status: adminCheck.status }
    );
  }

  const creators = await listAllCreatorsWithPromo();
  return NextResponse.json({
    success: true,
    data: creators.map((creator) => toPublicProfile(creator)),
  });
}
