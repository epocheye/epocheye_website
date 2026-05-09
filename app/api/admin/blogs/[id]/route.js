import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import {
	deletePost,
	getAdminPostById,
	getPostBySlug,
	updatePost,
} from "@/lib/server/blogRepository";

export const runtime = "nodejs";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request, { params }) {
	const adminCheck = verifyAdminJWTFromRequest(request);
	if (!adminCheck.ok) {
		return NextResponse.json(
			{ success: false, error: adminCheck.message },
			{ status: adminCheck.status }
		);
	}
	const { id } = await params;
	const post = await getAdminPostById(id);
	if (!post) {
		return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
	}
	return NextResponse.json({ success: true, data: post });
}

export async function PUT(request, { params }) {
	const adminCheck = verifyAdminJWTFromRequest(request);
	if (!adminCheck.ok) {
		return NextResponse.json(
			{ success: false, error: adminCheck.message },
			{ status: adminCheck.status }
		);
	}

	const { id } = await params;
	let body;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ success: false, error: "Invalid JSON body" },
			{ status: 400 }
		);
	}

	const fields = {};

	if (body.title !== undefined) {
		const title = String(body.title).trim();
		if (!title) {
			return NextResponse.json({ success: false, error: "title cannot be empty" }, { status: 400 });
		}
		fields.title = title;
	}

	if (body.slug !== undefined) {
		const slug = String(body.slug).trim().toLowerCase();
		if (!SLUG_PATTERN.test(slug) || slug.length > 120) {
			return NextResponse.json(
				{ success: false, error: "slug must be lowercase letters, numbers, hyphens; max 120 chars" },
				{ status: 400 }
			);
		}
		const collision = await getPostBySlug(slug);
		if (collision && collision.id !== id) {
			return NextResponse.json(
				{ success: false, error: "slug already exists" },
				{ status: 409 }
			);
		}
		fields.slug = slug;
	}

	if (body.excerpt !== undefined) {
		fields.excerpt = body.excerpt ? String(body.excerpt).slice(0, 500) : null;
	}
	if (body.cover_image_url !== undefined) {
		fields.cover_image_url = body.cover_image_url
			? String(body.cover_image_url).slice(0, 1000)
			: null;
	}
	if (body.body_markdown !== undefined) {
		fields.body_markdown = String(body.body_markdown);
	}
	if (body.status !== undefined) {
		if (!["draft", "published"].includes(body.status)) {
			return NextResponse.json(
				{ success: false, error: "status must be draft or published" },
				{ status: 400 }
			);
		}
		fields.status = body.status;
	}

	const updated = await updatePost(id, fields);
	if (!updated) {
		return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
	}
	return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request, { params }) {
	const adminCheck = verifyAdminJWTFromRequest(request);
	if (!adminCheck.ok) {
		return NextResponse.json(
			{ success: false, error: adminCheck.message },
			{ status: adminCheck.status }
		);
	}
	const { id } = await params;
	const removed = await deletePost(id);
	if (!removed) {
		return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
	}
	return NextResponse.json({ success: true, message: "Post deleted" });
}
