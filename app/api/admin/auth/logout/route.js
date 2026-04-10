import { NextResponse } from "next/server";

import { clearAdminCookie } from "@/lib/server/adminAuth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", clearAdminCookie());
  return response;
}
