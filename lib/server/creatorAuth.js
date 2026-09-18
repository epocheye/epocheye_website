import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  ensureCreatorForUser,
  markPromoCodeSynced,
  toPublicProfile,
} from "@/lib/server/creatorRepository";
import { syncPromoCodeToBackend } from "@/lib/server/backendSync";

export async function getCreatorContext() {
  const { userId } = await auth();

  if (!userId) {
    return {
      error: {
        status: 401,
        message: "Unauthorized",
      },
    };
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  if (!user) {
    return {
      error: {
        status: 401,
        message: "User session not found",
      },
    };
  }

  const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress;
  if (!email) {
    return {
      error: {
        status: 400,
        message: "User does not have a primary email",
      },
    };
  }

  const fullName = user.fullName || user.firstName || email.split("@")[0] || "Creator";

  const { creator, promo } = await ensureCreatorForUser({
    clerkUserId: userId,
    email,
    name: fullName,
  });

  // The app redeems codes against the Go backend, so a code only works there
  // once synced. Awaited (a fire-and-forget fetch can be dropped when the
  // serverless response ends) and retried on every request until it lands.
  // Codes go live only once the creator has accepted the program terms.
  if (promo?.code && !promo.backend_synced_at && creator.terms_accepted_at) {
    if (await syncPromoCodeToBackend(creator, promo.code)) {
      await markPromoCodeSynced(promo.id).catch(() => {});
    }
  }

  return {
    creator,
    creatorProfile: toPublicProfile(creator),
    promo,
    clerkUser: user,
  };
}

export function creatorAuthErrorResponse(error) {
  return NextResponse.json(
    { success: false, error: error?.message || "Unauthorized" },
    { status: error?.status || 401 }
  );
}

export function validateAdminKey(request) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    return {
      ok: false,
      status: 500,
      message: "Admin key not configured",
    };
  }

  const provided = request.headers.get("x-admin-key");
  if (!provided || provided !== expected) {
    return {
      ok: false,
      status: 403,
      message: "Forbidden",
    };
  }

  return { ok: true };
}

export function validateWebhookSecret(request) {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) {
    return {
      ok: false,
      status: 500,
      message: "Webhook secret not configured",
    };
  }

  const provided = request.headers.get("x-webhook-secret");
  if (!provided || provided !== expected) {
    return {
      ok: false,
      status: 401,
      message: "Invalid webhook secret",
    };
  }

  return { ok: true };
}
