import { NextResponse } from "next/server";

import { syncPromoCodeToBackend } from "@/lib/server/backendSync";
import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import { CREATOR_TERMS_VERSION } from "@/lib/server/creatorProgram";
import { markPromoCodeSynced, toPublicProfile, updateCreator } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

// Records acceptance of the current creator terms. Until a creator accepts,
// their code is not synced to the app backend, so it cannot be redeemed.
export async function POST(request) {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (body?.accept !== true || body?.india_resident !== true) {
    return NextResponse.json(
      { success: false, error: "You must accept the terms and confirm you are an Indian resident" },
      { status: 400 }
    );
  }
  if (body?.terms_version !== CREATOR_TERMS_VERSION) {
    return NextResponse.json(
      { success: false, error: "These terms have been updated. Reload the page and review them again." },
      { status: 409 }
    );
  }

  const updated = await updateCreator(context.creator.id, {
    terms_accepted_at: new Date().toISOString(),
    terms_version: CREATOR_TERMS_VERSION,
    country: "IN",
  });

  // First acceptance: make the code live in the app now rather than on the
  // next request.
  const promo = context.promo;
  if (promo?.code && !promo.backend_synced_at) {
    if (await syncPromoCodeToBackend(updated, promo.code)) {
      await markPromoCodeSynced(promo.id).catch(() => {});
    }
  }

  return NextResponse.json({ success: true, data: toPublicProfile(updated) });
}
