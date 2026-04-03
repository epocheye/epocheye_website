import { NextResponse } from "next/server";

import { validateAdminKey } from "@/lib/server/creatorAuth";
import { listAllCreators, toPublicProfile } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function GET(request) {
  const adminCheck = validateAdminKey(request);
  if (!adminCheck.ok) {
    return NextResponse.json(
      { success: false, error: adminCheck.message },
      { status: adminCheck.status }
    );
  }

  const creators = await listAllCreators();
  return NextResponse.json({
    success: true,
    data: creators.map((creator) => toPublicProfile(creator)),
  });
}
