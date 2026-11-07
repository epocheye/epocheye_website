import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Pre-orders are closed and /preorder is gone, so no new orders start here.
// Payments already under way still confirm through ./verify and ./webhook.
const closed = () => NextResponse.json({ success: false, error: "Pre-orders are closed." }, { status: 410 });

export const GET = closed;
export const POST = closed;
