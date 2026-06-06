import { NextResponse } from "next/server";

import { saveAccountDeletionRequest } from "@/lib/server/accountDeletionRepository";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const email = String(body?.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { success: false, error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  let reason = String(body?.reason || "").trim();
  if (reason.length > 2000) reason = reason.slice(0, 2000);

  try {
    await saveAccountDeletionRequest({ email, reason: reason || null });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[account-deletion] failed to save request:", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
