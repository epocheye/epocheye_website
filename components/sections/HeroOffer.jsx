"use client";

import React, { useEffect, useState } from "react";

// Shown if /api/offer can't be reached, so the offer is never silently missing from the Hero.
// No promo code in the fallback — we never show a code the backend might not accept.
const FALLBACK_OFFER = { claimed: 120, total: 500, promoCode: "", soldOut: false };

// "First 500 in Bangalore free" launch offer, rendered inside the Hero below the subtext.
// Counter + promo code are admin-editable (Admin → Settings → Bangalore Launch Offer).
const HeroOffer = () => {
	const [offer, setOffer] = useState(FALLBACK_OFFER);
	const [enabled, setEnabled] = useState(true);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/offer")
			.then((res) => res.json())
			.then((json) => {
				if (cancelled || !json.success) return;
				setEnabled(json.data.enabled);
				setOffer(json.data);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	if (!enabled) return null;

	const { claimed, total, promoCode, soldOut } = offer;

	const handleCopy = async (e) => {
		// Hero skips its intro on any click — don't let the copy click bubble into it.
		e.stopPropagation();
		try {
			await navigator.clipboard.writeText(promoCode);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Clipboard blocked — the code is still visible to type manually.
		}
	};

	return (
		<div className="mt-6 sm:mt-8 flex flex-col items-center gap-3 sm:gap-4 pointer-events-auto">
			<p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-white text-[11px] sm:text-xs font-medium tracking-[0.18em] uppercase">
				<svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
				</svg>
				{soldOut ? `Bangalore · All ${total} free spots claimed` : `Bangalore · First ${total} explorers free`}
			</p>

			{!soldOut && (
				<p className="text-white/70 text-sm sm:text-base font-medium max-w-md">
					Download the app{promoCode ? ", use the code" : ""} and explore for free. All we ask is your honest
					feedback.
				</p>
			)}

			<div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
				{!soldOut && promoCode && (
					<div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm pl-4 pr-1 py-1">
						<span className="text-white/60 text-[10px] sm:text-[11px] font-medium tracking-[0.18em] uppercase">
							Code
						</span>
						<span className="text-white text-sm sm:text-base font-semibold tracking-[0.18em]">{promoCode}</span>
						<button
							type="button"
							onClick={handleCopy}
							aria-label={`Copy promo code ${promoCode}`}
							className="rounded-full bg-white text-black px-3 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase transition-opacity duration-300 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/50">
							{copied ? "Copied" : "Copy"}
						</button>
					</div>
				)}
				<div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2">
					<span className="text-white text-sm sm:text-base font-semibold">
						{claimed} / {total}
					</span>
					<span className="text-white/60 text-[10px] sm:text-[11px] font-medium tracking-[0.18em] uppercase">
						spots claimed
					</span>
				</div>
			</div>
		</div>
	);
};

export default HeroOffer;
