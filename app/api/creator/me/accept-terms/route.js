import { NextResponse } from "next/server";

import { syncCreatorCouponState } from "@/lib/server/backendSync";
import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import { CREATOR_TERMS_VERSION } from "@/lib/server/creatorProgram";
import { markPromoCodeSynced, toPublicProfile, updateCreator } from "@/lib/server/creatorRepository";
import { getLiveAssignmentForCreator, rotateSites } from "@/lib/server/creatorSites";

export const runtime = "nodejs";

// Records acceptance of the current creator terms. Until a creator accepts,
// their code is not synced to the app backend, so it cannot be redeemed.
export async function POST(request) {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);
  if (context.creator.status !== "active") {
    return NextResponse.json(
      { success: false, error: "Your application hasn't been approved yet." },
      { status: 403 }
    );
  }

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

  // Register the code with the app backend (off until a site is assigned),
  // then fill any free site so an accepted creator doesn't wait for the cron.
  const promo = context.promo;
  if (promo?.code) {
    const assignment = await getLiveAssignmentForCreator(updated.id).catch(() => null);
    if (await syncCreatorCouponState(updated, promo.code, assignment)) {
      await markPromoCodeSynced(promo.id).catch(() => {});
    }
  }
  await rotateSites().catch((err) => console.error("[accept-terms] rotate:", err?.message ?? err));

  return NextResponse.json({ success: true, data: toPublicProfile(updated) });
}
