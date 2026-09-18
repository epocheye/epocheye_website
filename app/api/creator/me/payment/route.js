import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import { toPublicProfile, updateCreator } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function PUT(request) {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const updates = {};

  if (body?.upi_id !== undefined) {
    const upiId = body.upi_id;
    if (typeof upiId !== "string" || upiId.trim().length < 5 || upiId.trim().length > 100) {
      return NextResponse.json({ success: false, error: "UPI ID must be 5-100 characters" }, { status: 400 });
    }
    updates.upi_id = upiId.trim();
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });
  }

  const updated = await updateCreator(context.creator.id, updates);

  return NextResponse.json({
    success: true,
    data: toPublicProfile(updated),
  });
}
