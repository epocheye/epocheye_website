import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";

export const runtime = "nodejs";

// Cloudinary uploads can be sizeable (Polycam GLBs are routinely 30-50 MB),
// so we give this proxy a longer timeout than the standard backend proxy.
const UPLOAD_TIMEOUT_MS = 180_000; // 3 min

function mintCreatorTokenFromAdmin(adminPayload, creatorJwtSecret) {
  return jwt.sign(
    {
      sub: adminPayload.sub,
      email: adminPayload.email,
      iss: "epocheye-creators",
      admin: true,
    },
    creatorJwtSecret,
    { expiresIn: "10m" }
  );
}

/**
 * POST /api/admin/ar/upload-asset
 *
 * Accepts a multipart form-data body with fields:
 *   file:       the binary file
 *   kind:       "glb" | "image" | "thumbnail" | "reference"
 *   folder?:    optional Cloudinary folder override
 *   public_id?: optional Cloudinary public_id
 *
 * Proxies the upload to the Go backend's `/api/v1/creator/upload-asset`,
 * which uses the existing Cloudinary client to store the file with the
 * appropriate resource_type and returns the secure_url.
 */
export async function POST(request) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const backendUrl = process.env.BACKEND_API_URL;
  const creatorJwtSecret = process.env.CREATOR_JWT_SECRET;
  if (!backendUrl) {
    return NextResponse.json(
      { success: false, error: "BACKEND_API_URL is not configured" },
      { status: 500 }
    );
  }
  if (!creatorJwtSecret) {
    return NextResponse.json(
      { success: false, error: "CREATOR_JWT_SECRET is not configured" },
      { status: 500 }
    );
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `Invalid multipart body: ${err?.message || ""}` },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ success: false, error: "file field is required" }, { status: 400 });
  }
  const kind = String(formData.get("kind") ?? "").trim().toLowerCase();
  if (!kind) {
    return NextResponse.json({ success: false, error: "kind field is required" }, { status: 400 });
  }

  // Re-build the multipart body so we can attach the new auth header.
  const upstreamForm = new FormData();
  upstreamForm.set("file", file, file.name || "upload.bin");
  upstreamForm.set("kind", kind);
  const folder = formData.get("folder");
  if (folder) upstreamForm.set("folder", String(folder));
  const publicId = formData.get("public_id");
  if (publicId) upstreamForm.set("public_id", String(publicId));

  const token = mintCreatorTokenFromAdmin(auth.payload, creatorJwtSecret);

  try {
    const res = await fetch(`${backendUrl}/api/v1/creator/upload-asset`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: upstreamForm,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text || "Invalid response" };
    }
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data?.error || "Upload failed" },
        { status: res.status }
      );
    }
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err?.message || "Network error" },
      { status: 502 }
    );
  }
}
