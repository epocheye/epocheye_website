import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { updateAdminContentSubmission } from "@/lib/server/creatorRepository";

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
  if (!["pending", "approved", "rejected"].includes(status)) {
    return NextResponse.json(
      { success: false, error: "status must be pending, approved, or rejected" },
      { status: 400 }
    );
  }

  if (body?.admin_notes !== undefined && typeof body.admin_notes !== "string") {
    return NextResponse.json({ success: false, error: "admin_notes must be a string" }, { status: 400 });
  }

  if (typeof body?.admin_notes === "string" && body.admin_notes.length > 500) {
    return NextResponse.json(
      { success: false, error: "admin_notes must be <= 500 chars" },
      { status: 400 }
    );
  }

  const resolved = await params;
  const updated = await updateAdminContentSubmission({
    contentId: resolved?.id,
    status,
    adminNotes: body?.admin_notes,
  });

  if (!updated) {
    return NextResponse.json({ success: false, error: "Content not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Content updated" });
}
