/**
 * ONE-TIME setup route to create the first admin user.
 * Protected by ADMIN_SEED_KEY env var.
 *
 * Usage:
 *   curl -X POST https://your-site.com/api/admin/auth/seed \
 *     -H "Content-Type: application/json" \
 *     -d '{"seed_key":"<ADMIN_SEED_KEY>","email":"admin@epocheye.app","password":"your_password"}'
 *
 * After seeding, remove ADMIN_SEED_KEY from .env.local to disable this endpoint.
 */
import { NextResponse } from "next/server";

import { hashAdminPassword } from "@/lib/server/adminAuth";
import { createAdminUser, findAdminUserByEmail } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function POST(request) {
  const seedKey = process.env.ADMIN_SEED_KEY;
  if (!seedKey) {
    return NextResponse.json({ success: false, error: "Seeding is disabled" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (body?.seed_key !== seedKey) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  if (!email || password.length < 8) {
    return NextResponse.json(
      { success: false, error: "Valid email and password (≥8 chars) are required" },
      { status: 400 }
    );
  }

  const existing = await findAdminUserByEmail(email);
  if (existing) {
    return NextResponse.json(
      { success: false, error: "Admin user already exists" },
      { status: 409 }
    );
  }

  const hash = await hashAdminPassword(password);
  await createAdminUser(email, hash);

  return NextResponse.json({ success: true, message: "Admin user created" }, { status: 201 });
}
