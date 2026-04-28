import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { backendProxy } from "@/lib/server/backendAuth";

export const runtime = "nodejs";

/**
 * POST /api/admin/ar/curate
 * Body: {
 *   monument_id, object_label,
 *   glb_url, thumbnail_url?,
 *   reference_image_urls: string[]  // 1-5 entries
 *   knowledge_text?
 * }
 *
 * Proxies to Go backend `/api/v1/creator/ar-objects/curate`. Backend stores the
 * GLB row, downloads each reference image, computes pHash, and inserts into
 * monument_object_reference_images. Idempotent on (monument_id, object_label).
 */
export async function POST(request) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const monumentId = String(body.monument_id ?? "").trim();
  const objectLabel = String(body.object_label ?? "").trim();
  const glbUrl = String(body.glb_url ?? "").trim();
  const thumbnailUrl = String(body.thumbnail_url ?? "").trim();
  const knowledgeText = String(body.knowledge_text ?? "").trim();

  const referenceUrls = Array.isArray(body.reference_image_urls)
    ? body.reference_image_urls
        .map((u) => String(u ?? "").trim())
        .filter(Boolean)
    : [];

  if (!monumentId || !objectLabel) {
    return NextResponse.json(
      { success: false, error: "monument_id and object_label are required" },
      { status: 400 }
    );
  }
  if (!glbUrl) {
    return NextResponse.json(
      { success: false, error: "glb_url is required (upload the GLB first)" },
      { status: 400 }
    );
  }
  if (referenceUrls.length === 0) {
    return NextResponse.json(
      { success: false, error: "at least one reference image is required" },
      { status: 400 }
    );
  }
  if (referenceUrls.length > 5) {
    return NextResponse.json(
      { success: false, error: "at most 5 reference images per object" },
      { status: 400 }
    );
  }

  try {
    const res = await backendProxy(auth.payload, {
      method: "POST",
      path: "/api/v1/creator/ar-objects/curate",
      body: {
        monument_id: monumentId,
        object_label: objectLabel,
        glb_url: glbUrl,
        thumbnail_url: thumbnailUrl || undefined,
        reference_image_urls: referenceUrls,
        knowledge_text: knowledgeText || undefined,
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: res.data?.error || "Backend error" },
        { status: res.status }
      );
    }
    return NextResponse.json({ success: true, data: res.data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err?.message || "Network error" },
      { status: 502 }
    );
  }
}
