import { NextResponse } from "next/server";

import { makeAdminCookie, signAdminJWT, verifyAdminPassword } from "@/lib/server/adminAuth";
import { findAdminUserByEmail } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: "Email and password are required" },
      { status: 400 }
    );
  }

  try {
    const admin = await findAdminUserByEmail(email);
    if (!admin) {
      // Constant-time response to avoid user enumeration
      await verifyAdminPassword("dummy", "$2b$10$dummyhashtopreventtimingattacks12345678");
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyAdminPassword(password, admin.password_hash);
    if (!valid) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    const token = signAdminJWT(admin.id, admin.email);

    const response = NextResponse.json({ success: true, email: admin.email });
    response.headers.set("Set-Cookie", makeAdminCookie(token));
    return response;
  } catch (err) {
    // Surface server-side failures (e.g. missing ADMIN_JWT_SECRET / DATABASE_URL)
    // as JSON so the client shows a real message instead of a generic "Network error".
    console.error("[admin/auth/login] internal error:", err);
    return NextResponse.json(
      { success: false, error: "Server error — login is misconfigured. Check server logs." },
      { status: 500 }
    );
  }
}
