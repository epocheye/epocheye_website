import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { findCreatorById, getAdminSettings, updateCreator } from "@/lib/server/creatorRepository";
import { sendEmail } from "@/lib/server/email";
import { getSql } from "@/lib/server/neon";

export const runtime = "nodejs";

const CREATORS_URL = "https://creators.epocheye.com";

// Approve or reject one application. Approval is refused once the number of
// approved creators reaches admin_settings.max_creators.
export async function POST(request, { params }) {
  const adminCheck = verifyAdminJWTFromRequest(request);
  if (!adminCheck.ok) {
    return NextResponse.json({ success: false, error: adminCheck.message }, { status: adminCheck.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const action = body?.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ success: false, error: "action must be approve or reject" }, { status: 400 });
  }

  const { id } = await params;
  const creator = await findCreatorById(id).catch(() => null);
  if (!creator) {
    return NextResponse.json({ success: false, error: "Creator not found" }, { status: 404 });
  }

  if (action === "approve") {
    if (creator.status === "active") {
      return NextResponse.json({ success: false, error: "Already approved" }, { status: 400 });
    }
    const settings = await getAdminSettings();
    const sql = getSql();
    const [{ approved }] = await sql`SELECT COUNT(*)::int AS approved FROM creators WHERE status = 'active'`;
    if (approved >= settings.max_creators) {
      return NextResponse.json(
        { success: false, error: `All ${settings.max_creators} creator spots are taken.` },
        { status: 409 }
      );
    }
    const updated = await updateCreator(creator.id, {
      status: "active",
      approved_at: new Date().toISOString(),
    });
    await sendEmail({
      to: creator.email,
      subject: "You're in: Epocheye Creator Program",
      text: [
        `Hi ${creator.name},`,
        "",
        "Your application to the Epocheye Creator Program is approved.",
        `Sign in at ${CREATORS_URL}, accept the creator terms, and you join the line for a monument. When a monument is yours, your code works there for two weeks.`,
        "",
        "Team Epocheye",
      ].join("\n"),
    });
    return NextResponse.json({ success: true, data: { id: updated.id, status: updated.status } });
  }

  const updated = await updateCreator(creator.id, { status: "rejected" });
  await sendEmail({
    to: creator.email,
    subject: "Your Epocheye Creator Program application",
    text: [
      `Hi ${creator.name},`,
      "",
      "Thank you for applying to the Epocheye Creator Program. We can't offer you a place right now: the program is limited to a small group of creators.",
      "You're welcome to apply again later.",
      "",
      "Team Epocheye",
    ].join("\n"),
  });
  return NextResponse.json({ success: true, data: { id: updated.id, status: updated.status } });
}
