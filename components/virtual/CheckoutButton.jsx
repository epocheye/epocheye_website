"use client";

import { trackVirtual } from "./track";

// Phase 2: opens the Dodo Payments hosted checkout (DODO_CHECKOUT_URL). No keys in code.
// TODO(phase2): fulfilment. Add a Dodo webhook at app/api/virtual/dodo-webhook/route.js:
// verify the webhook signature, record the purchase, grant access, send the access email.
export default function CheckoutButton({ href, label, note }) {
	return (
		<div className="w-full max-w-md">
			<a
				href={href}
				onClick={() => trackVirtual("virtual_checkout_click")}
				className="inline-flex h-12 items-center justify-center rounded-full border border-white/70 px-8 font-montserrat text-sm font-medium text-white transition-colors hover:bg-white hover:text-black">
				{label}
			</a>
			<p className="mt-3 font-instrument-sans text-sm text-white/50">{note}</p>
		</div>
	);
}
