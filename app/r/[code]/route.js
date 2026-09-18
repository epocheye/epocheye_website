import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Creator referral links are retired: creators share their code (or a QR of
// the plain code) and it is entered in the Epocheye app, which is where both
// "clicks" (code entries) and sales are counted. Old links land here.
export function GET() {
  return new NextResponse(
    "This link is no longer used. Ask the creator for their code and enter it in the Epocheye app.",
    { status: 410, headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}
