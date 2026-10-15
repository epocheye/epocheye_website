"use client";

import { trackVirtual } from "./track";

// Phase 2: opens the Dodo Payments hosted checkout (DODO_CHECKOUT_URL). No keys in code.
// TODO(phase2): fulfilment. Add a Dodo webhook at app/api/virtual/dodo-webhook/route.js:
// verify the webhook signature, record the purchase, grant access, send the access email.
export default function CheckoutButton({ href, label, note }) {
	return (
		<div className="flex w-full max-w-md flex-col items-center">
			<a
				href={href}
				onClick={() => trackVirtual("virtual_checkout_click")}
				className="inline-flex items-center rounded-full border border-white/20 bg-white/10 p-1 backdrop-blur-sm transition-opacity duration-300 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/50">
				<span className="rounded-full bg-white px-6 py-3 font-montserrat text-xs font-semibold uppercase tracking-[0.14em] text-black sm:text-sm">
					{label}
				</span>
			</a>
			<p className="mt-3 max-w-sm font-montserrat text-xs leading-relaxed text-white/60">{note}</p>
		</div>
	);
}
