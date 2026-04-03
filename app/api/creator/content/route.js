import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import {
  createContentSubmission,
  listContentByCreator,
} from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

const PLATFORMS = new Set(["instagram", "youtube", "tiktok", "twitter", "blog", "other"]);

function isValidUrl(value) {
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

  const data = await listContentByCreator(context.creator.id);
  return NextResponse.json({ success: true, data });
}

export async function POST(request) {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const contentUrl = String(body?.content_url || "").trim();
  const platform = String(body?.platform || "").trim();
  const title = body?.title ? String(body.title).trim() : null;

  if (!isValidUrl(contentUrl)) {
    return NextResponse.json({ success: false, error: "content_url must be a valid URL" }, { status: 400 });
  }

  if (!PLATFORMS.has(platform)) {
    return NextResponse.json({ success: false, error: "Invalid platform" }, { status: 400 });
  }

  if (title && title.length > 200) {
    return NextResponse.json({ success: false, error: "title must be <= 200 chars" }, { status: 400 });
  }

  const created = await createContentSubmission({
    creatorId: context.creator.id,
    contentUrl,
    platform,
    title,
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
