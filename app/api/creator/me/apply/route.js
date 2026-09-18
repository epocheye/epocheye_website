import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import { toPublicProfile, updateCreator } from "@/lib/server/creatorRepository";
import { ADMIN_NOTIFY_EMAIL, sendEmail } from "@/lib/server/email";

export const runtime = "nodejs";

const URL_FIELDS = ["instagram_url", "youtube_url", "tiktok_url", "twitter_url"];

function cleanUrl(value) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  try {
    return new URL(v).toString();
  } catch {
    return undefined; // invalid
  }
}

// A creator submits (or updates) their application. It lands in
// Admin -> Creator applications and is emailed to the team.
export async function POST(request) {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  const { creator } = context;
  if (creator.status === "active") {
    return NextResponse.json({ success: false, error: "You're already approved." }, { status: 400 });
  }
  if (creator.status === "suspended") {
    return NextResponse.json({ success: false, error: "This account is suspended." }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const name = String(body?.name ?? "").trim();
  if (name.length < 2 || name.length > 100) {
    return NextResponse.json({ success: false, error: "Name must be 2-100 characters" }, { status: 400 });
  }

  const links = {};
  for (const key of URL_FIELDS) {
    const url = cleanUrl(body?.[key]);
    if (url === undefined) {
      return NextResponse.json({ success: false, error: `${key.replace("_url", "")} link isn't a valid URL` }, { status: 400 });
    }
    links[key] = url;
  }
  if (!Object.values(links).some(Boolean)) {
    return NextResponse.json({ success: false, error: "Add at least one social profile link" }, { status: 400 });
  }

  const audience = String(body?.audience_size ?? "").trim().slice(0, 40);
  const city = String(body?.city ?? "").trim().slice(0, 80);
  const niche = String(body?.niche ?? "").trim().slice(0, 100);
  const pitch = String(body?.pitch ?? "").trim();
  if (pitch.length < 20 || pitch.length > 1000) {
    return NextResponse.json(
      { success: false, error: "Tell us about your content in 20-1000 characters" },
      { status: 400 }
    );
  }

  const application = { name, ...links, audience_size: audience, city, niche, pitch };
  const updated = await updateCreator(creator.id, {
    name,
    ...links,
    niche: niche || null,
    application,
    applied_at: new Date().toISOString(),
    status: "pending",
  });

  const details = [
    `Email: ${creator.email}`,
    ...URL_FIELDS.filter((k) => links[k]).map((k) => `${k.replace("_url", "")}: ${links[k]}`),
    audience ? `Audience: ${audience}` : null,
    city ? `City: ${city}` : null,
    niche ? `Niche: ${niche}` : null,
  ].filter(Boolean);
  const lines = [
    `New creator application: ${name}`,
    ...details,
    "",
    pitch,
    "",
    "Review it in the admin panel: https://epocheye.com/admin/creator-applications",
  ];
  await sendEmail({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `Creator application: ${name}`,
    text: lines.join("\n"),
    replyTo: creator.email,
  });

  return NextResponse.json({ success: true, data: toPublicProfile(updated) });
}
