import { NextResponse } from "next/server";

import { preorderPriceFor, visitorCountry } from "@/lib/server/preorderPayment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: the price this visitor will be charged, for the ticket to show.
// The order itself is priced again on the server; this is display only.
export async function GET(request) {
	try {
		const price = await preorderPriceFor(visitorCountry(request));
		return NextResponse.json({ success: true, data: { price } }, { headers: { "Cache-Control": "private, no-store" } });
	} catch (err) {
		console.error("[api/preorder/price] failed:", err?.message ?? err);
		return NextResponse.json({ success: false, error: "Price unavailable." }, { status: 500 });
	}
}
