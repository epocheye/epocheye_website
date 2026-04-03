import { NextResponse } from "next/server";

import { findCreatorById, getPromoCodeByCode } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const code = String(body?.code || "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ success: false, error: "code is required" }, { status: 400 });
  }

  const promo = await getPromoCodeByCode(code);
  if (!promo) {
    return NextResponse.json(
      { success: false, error: "Invalid or inactive promo code" },
      { status: 404 }
    );
  }

  const creator = await findCreatorById(promo.creator_id);

  return NextResponse.json({
    success: true,
    data: {
      code: promo.code,
      customer_discount: creator?.customer_discount ?? 10,
    },
  });
}
