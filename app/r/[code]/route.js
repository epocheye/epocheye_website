import { NextResponse } from "next/server";

const CREATOR_API = process.env.NEXT_PUBLIC_CREATOR_API_URL || "http://localhost:3001";

export async function GET(request, { params }) {
  const { code } = await params;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "";

  // Fire-and-forget click recording — don't block the redirect
  fetch(`${CREATOR_API}/api/creator/promo/click`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, ip_address: ip, user_agent: userAgent }),
  }).catch(() => {});

  // Redirect to home with referral code as query param (can be picked up by app download flow)
  const url = new URL("/", request.url);
  url.searchParams.set("ref", code.toUpperCase());

  return NextResponse.redirect(url, { status: 302 });
}
