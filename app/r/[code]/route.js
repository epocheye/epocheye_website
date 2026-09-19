import { NextResponse } from "next/server";

import { getPromoCodeByCode, recordClick } from "@/lib/server/creatorRepository";

// Creator QR codes point here (epocheye.com/r/CODE). Scanning one counts a
// click for that creator, then sends the phone straight to the app store: the
// visitor never sees a web page. The sale is counted separately, only when the
// visitor pays in the app with the creator's code.
const IOS_STORE_URL = "https://apps.apple.com/app/epocheye/id6504869173";
const ANDROID_PACKAGE = "com.epocheye";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function playStoreUrl(code) {
  // The install referrer carries the code, so the app can read it after install.
  const referrer = `utm_source=creator&utm_medium=qr&utm_campaign=${code}`;
  return `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}&referrer=${encodeURIComponent(referrer)}`;
}

export async function GET(request, { params }) {
  const { code: rawCode } = await params;
  const code = String(rawCode || "").trim().toUpperCase().slice(0, 32);
  const userAgent = request.headers.get("user-agent") || "";

  if (/^[A-Z0-9_-]{3,32}$/.test(code)) {
    try {
      // Credit the creator who owns the code. Recorded in-process (not via an
      // HTTP hop) so the visitor's real IP and user agent are what's hashed.
      const promo = await getPromoCodeByCode(code);
      await recordClick({
        code,
        creatorId: promo?.creator_id ?? null,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          "unknown",
        userAgent,
      });
    } catch (err) {
      console.error("[r] click not recorded:", err?.message ?? err);
    }
  }

  const ua = userAgent.toLowerCase();
  const target = /iphone|ipad|ipod/.test(ua) ? IOS_STORE_URL : playStoreUrl(code);
  return NextResponse.redirect(target, { status: 302 });
}
