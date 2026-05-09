import { NextResponse } from "next/server";

import { listPublishedPosts } from "@/lib/server/blogRepository";

export const runtime = "nodejs";

export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
	const limit = Math.max(
		1,
		Math.min(50, Number.parseInt(searchParams.get("limit") || "20", 10))
	);
	const offset = (page - 1) * limit;

	const result = await listPublishedPosts({ limit, offset });

	return NextResponse.json(
		{
			success: true,
			data: {
				entries: result.entries,
				total: result.total,
				page,
				limit,
			},
		},
		{
			headers: {
				"Cache-Control": "public, max-age=60, stale-while-revalidate=300",
			},
		}
	);
}
