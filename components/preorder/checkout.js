"use client";

// Paying for a pre-order (used by PreorderForm):
// the API holds the place and opens a Razorpay order, Razorpay Checkout takes
// the payment in its own window, and the API verifies it.

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const BRAND = "#14120d";

let loading = null;

function loadCheckout() {
	if (window.Razorpay) return Promise.resolve();
	loading ??= new Promise((resolve, reject) => {
		const s = document.createElement("script");
		s.src = CHECKOUT_SRC;
		s.async = true;
		s.onload = () => resolve();
		s.onerror = () => {
			loading = null;
			s.remove();
			reject(new Error("Couldn't open the payment window. Check your connection and try again."));
		};
		document.body.appendChild(s);
	});
	return loading;
}

async function post(url, body) {
	const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
	const json = await res.json().catch(() => null);
	if (!res.ok || !json?.success) throw new Error(json?.error || "Something went wrong. Please try again.");
	return json.data;
}

/**
 * Runs the whole payment. Resolves { reference, alreadyPaid } once paid;
 * rejects with a message to show (including when the visitor closes Checkout).
 */
export async function payForPreorder({ form, site, siteLabel }) {
	const start = await post("/api/preorder", { ...form, site });
	if (start.alreadyPaid) return { reference: start.reference, alreadyPaid: true };

	await loadCheckout();
	const payment = await new Promise((resolve, reject) => {
		let failure = "";
		const rzp = new window.Razorpay({
			key: start.keyId,
			order_id: start.order.id,
			amount: start.order.amount,
			currency: start.order.currency,
			name: "Epocheye",
			description: `Pre-order: ${siteLabel}`,
			prefill: { name: form.name, email: form.email },
			notes: { reference: start.reference },
			theme: { color: BRAND },
			handler: resolve,
			modal: {
				// Closing Checkout after a failed attempt keeps the bank's reason.
				ondismiss: () => reject(new Error(failure || "Payment cancelled. Nothing was charged.")),
			},
		});
		// Checkout stays open on failure so the visitor can retry another way.
		rzp.on("payment.failed", (r) => {
			failure = r?.error?.description ? `Payment failed: ${r.error.description}` : "Payment failed. Please try again.";
		});
		rzp.open();
	});

	const done = await post("/api/preorder/verify", payment);
	return { reference: done.reference, alreadyPaid: false };
}
