import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Dodo Payments checkout session for /journeys. Stub: CHECKOUT_ENABLED is false by default
// and the modal never calls this until it is switched on.
//
// TODO(SAMBIT): create a Dodo checkout session here and return { url }.
//   - DODO_API_KEY, DODO_PRODUCT_SOLO, DODO_PRODUCT_FAMILY from the environment
//   - prefill the customer email, pass { monument, variant } as metadata
//   - success_url: /journeys?reserved=<monument>, cancel_url: /journeys
export async function POST() {
	return NextResponse.json(
		{ success: false, error: "Checkout is not connected yet. Your reservation was not charged." },
		{ status: 501 },
	);
}
