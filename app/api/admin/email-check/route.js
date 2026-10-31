import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { ADMIN_NOTIFY_EMAIL, EMAIL_FROM, deliverEmail } from "@/lib/server/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Admin only: sends one test email and reports exactly what Resend said, so a
// broken email setup can be diagnosed from the browser. ?to= picks the
// recipient (default: ADMIN_NOTIFY_EMAIL).
export async function GET(request) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const to = new URL(request.url).searchParams.get("to")?.trim() || ADMIN_NOTIFY_EMAIL;
  if (!EMAIL_RE.test(to)) return NextResponse.json({ success: false, error: "Invalid ?to= address." }, { status: 400 });

  const result = await deliverEmail({
    to,
    subject: "Epocheye email test",
    text: `This is a test email from epocheye.com, sent by ${auth.payload.email}. If you can read it, website emails work.`,
  });

  return NextResponse.json({
    success: result.ok,
    data: {
      resendKeySet: Boolean(process.env.RESEND_API_KEY),
      from: EMAIL_FROM,
      adminNotifyEmail: ADMIN_NOTIFY_EMAIL,
      sentTo: to,
      resend: result,
    },
  });
}
