"use client";

import { trackVirtual } from "./track";

// Phase 2: opens the Dodo Payments hosted checkout (DODO_CHECKOUT_URL). No keys in code.
// TODO(phase2): fulfilment. Add a Dodo webhook at app/api/virtual/dodo-webhook/route.js:
// verify the webhook signature, record the purchase, grant access, send the access email.
export default function CheckoutButton({ href, label, note }) {
	return (
		<div id="early-access" className="w-full max-w-lg scroll-mt-28">
			<a
				href={href}
				onClick={() => trackVirtual("virtual_checkout_click")}
				className="inline-block bg-[#c0614a] px-8 py-3.5 font-instrument-sans text-base font-medium text-white transition-colors duration-500 hover:bg-[#a44f3b]">
				{label}
			</a>
			<p className="mt-3 font-instrument-sans text-sm text-white/80">{note}</p>
		</div>
	);
}
