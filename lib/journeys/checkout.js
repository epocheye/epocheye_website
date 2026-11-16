"use client";

// Dodo Payments checkout hand-off for /journeys. Reached only when CHECKOUT_ENABLED is true
// (lib/journeys/config.js). Until the integration lands this records the intent and throws,
// so the modal shows a plain error instead of pretending a payment happened.
//
// TODO(SAMBIT): connect Dodo Payments.
//   1. Create the two products in the Dodo dashboard (solo, family) and put their ids in
//      DODO_PRODUCT_SOLO / DODO_PRODUCT_FAMILY on the server.
//   2. Implement app/api/journeys/checkout/route.js: create a Dodo checkout session for the
//      tier with the email prefilled and `metadata: { monument, variant }`, return { url }.
//   3. Add the Dodo webhook route that marks the reservation paid (journeys_intents.status).
//   4. Then this function should `window.location.assign(url)`.
export async function startDodoCheckout({ monument, tier, email, variant }) {
	const res = await fetch("/api/journeys/checkout", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ monument, tier, email, variant }),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok || !data?.url) {
		throw new Error(data?.error || "Checkout is not connected yet.");
	}
	window.location.assign(data.url);
}
