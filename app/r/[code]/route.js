import { NextResponse } from "next/server";

const IOS_STORE_URL = "https://apps.apple.com/app/epocheye/id6504869173";
const ANDROID_STORE_URL = "https://play.google.com/store/apps/details?id=com.epocheye";

function detectPlatform(userAgent = "") {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

export async function GET(request, { params }) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "";

  // Fire-and-forget click recording — don't block the redirect
  const clickEndpoint = new URL("/api/creator/promo/click", request.url);
  fetch(clickEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: upperCode, ip_address: ip, user_agent: userAgent }),
  }).catch(() => {});

  const platform = detectPlatform(userAgent);

  if (platform === "ios") {
    return NextResponse.redirect(IOS_STORE_URL, { status: 302 });
  }

  if (platform === "android") {
    return NextResponse.redirect(ANDROID_STORE_URL, { status: 302 });
  }

  // Desktop: redirect to homepage with ref param so visitors can see the app
  const homeUrl = new URL("/", request.url);
  homeUrl.searchParams.set("ref", upperCode);
  return NextResponse.redirect(homeUrl, { status: 302 });
}
