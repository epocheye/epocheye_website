import { NextResponse } from "next/server";

import {
  findCreatorById,
  getPromoCodeByCode,
  recordClick,
} from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const code = String(body?.code || "").trim().toUpperCase();
  if (code.length < 3 || code.length > 20) {
    return NextResponse.json({ success: false, error: "code is required" }, { status: 400 });
  }

  const promo = await getPromoCodeByCode(code);

  const ipAddress =
    body?.ip_address ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = body?.user_agent || request.headers.get("user-agent") || null;

  await recordClick({
    code,
    creatorId: promo?.creator_id ?? null,
    ipAddress,
    userAgent,
  });

  if (!promo) {
    return NextResponse.json({ success: true, data: { valid: false } });
  }

  const creator = await findCreatorById(promo.creator_id);

  return NextResponse.json({
    success: true,
    data: {
      valid: true,
      customer_discount: creator?.customer_discount ?? 10,
    },
  });
}
