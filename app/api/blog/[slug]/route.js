import { NextResponse } from "next/server";

import { getPublishedPostBySlug } from "@/lib/server/blogRepository";

export const runtime = "nodejs";

export async function GET(request, { params }) {
	const { slug } = await params;
	const post = await getPublishedPostBySlug(String(slug || "").toLowerCase());
	if (!post) {
		return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
	}
	return NextResponse.json(
		{ success: true, data: post },
		{
			headers: {
				"Cache-Control": "public, max-age=60, stale-while-revalidate=300",
			},
		}
	);
}
