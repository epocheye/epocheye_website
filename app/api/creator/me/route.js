import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import { toPublicProfile, updateCreator } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

const URL_FIELDS = ["instagram_url", "youtube_url", "tiktok_url", "twitter_url"];

function isValidOptionalUrl(value) {
  if (value === null || value === "") return true;
  if (typeof value !== "string") return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  return NextResponse.json({
    success: true,
    data: context.creatorProfile,
  });
}

export async function PUT(request) {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const updates = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 100) {
      return NextResponse.json({ success: false, error: "Name must be 2-100 characters" }, { status: 400 });
    }
    updates.name = body.name.trim();
  }

  for (const key of URL_FIELDS) {
    if (body[key] === undefined) continue;
    if (!isValidOptionalUrl(body[key])) {
      return NextResponse.json({ success: false, error: `${key} must be a valid URL` }, { status: 400 });
    }
    updates[key] = body[key] || null;
  }

  if (body.niche !== undefined) {
    if (body.niche !== null && (typeof body.niche !== "string" || body.niche.length > 100)) {
      return NextResponse.json({ success: false, error: "Niche must be up to 100 characters" }, { status: 400 });
    }
    updates.niche = body.niche || null;
  }

  const updated = await updateCreator(context.creator.id, updates);

  return NextResponse.json({
    success: true,
    data: toPublicProfile(updated),
  });
}
