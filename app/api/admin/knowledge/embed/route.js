import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { backendProxy } from "@/lib/server/backendAuth";

export const runtime = "nodejs";

export async function POST(request) {
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
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const result = await backendProxy(adminCheck.payload, {
    method: "POST",
    path: "/api/v1/creator/knowledge/embed",
    body,
  });

  return NextResponse.json(
    result.ok ? { success: true, data: result.data } : { success: false, error: result.data?.error || "Embed failed" },
    { status: result.ok ? 200 : result.status }
  );
}
