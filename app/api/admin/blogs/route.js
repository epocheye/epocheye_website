import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import {
	createPost,
	getPostBySlug,
	listAdminPosts,
} from "@/lib/server/blogRepository";

export const runtime = "nodejs";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request) {
	const adminCheck = verifyAdminJWTFromRequest(request);
	if (!adminCheck.ok) {
		return NextResponse.json(
			{ success: false, error: adminCheck.message },
			{ status: adminCheck.status }
		);
	}

	const { searchParams } = new URL(request.url);
	const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
	const limit = Math.max(
		10,
		Math.min(200, Number.parseInt(searchParams.get("limit") || "25", 10))
	);
	const status = searchParams.get("status") || "all";
	const offset = (page - 1) * limit;

	const result = await listAdminPosts({ status, limit, offset });
	const totalPages = Math.max(1, Math.ceil(result.total / limit));

	return NextResponse.json({
		success: true,
		data: {
			entries: result.entries,
			total: result.total,
			page,
			limit,
			total_pages: totalPages,
		},
	});
}

export async function POST(request) {
	const adminCheck = verifyAdminJWTFromRequest(request);
	if (!adminCheck.ok) {
		return NextResponse.json(
			{ success: false, error: adminCheck.message },
			{ status: adminCheck.status }
		);
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ success: false, error: "Invalid JSON body" },
			{ status: 400 }
		);
	}

	const title = typeof body?.title === "string" ? body.title.trim() : "";
	const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
	const status = body?.status === "published" ? "published" : "draft";

	if (!title) {
		return NextResponse.json(
			{ success: false, error: "title is required" },
			{ status: 400 }
		);
	}
	if (!slug || !SLUG_PATTERN.test(slug)) {
		return NextResponse.json(
			{ success: false, error: "slug must be lowercase letters, numbers, and hyphens" },
			{ status: 400 }
		);
	}
	if (slug.length > 120) {
		return NextResponse.json(
			{ success: false, error: "slug must be <= 120 chars" },
			{ status: 400 }
		);
	}

	const existing = await getPostBySlug(slug);
	if (existing) {
		return NextResponse.json(
			{ success: false, error: "slug already exists" },
			{ status: 409 }
		);
	}

	const post = await createPost({
		slug,
		title,
		excerpt: body?.excerpt ? String(body.excerpt).slice(0, 500) : null,
		cover_image_url: body?.cover_image_url ? String(body.cover_image_url).slice(0, 1000) : null,
		body_markdown: typeof body?.body_markdown === "string" ? body.body_markdown : "",
		status,
	});

	return NextResponse.json({ success: true, data: post }, { status: 201 });
}
