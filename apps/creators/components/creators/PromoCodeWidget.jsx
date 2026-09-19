"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Download, QrCode } from "lucide-react";
import { trackEvent, EVENT_NAMES } from "@/lib/analytics";
import { CUSTOMER_DISCOUNT_PERCENT } from "@/lib/creatorProgram";
import { styledQrPng } from "@/lib/styledQr";

const MAIN_SITE_ORIGIN = (
	process.env.NEXT_PUBLIC_MAIN_SITE_ORIGIN || "https://epocheye.com"
).replace(/\/$/, "");

// A creator shares their code, and a QR that opens Epocheye in the app store.
// The QR goes through epocheye.com/r/CODE, which counts the scan as a click
// for this creator and redirects straight to the Play Store / App Store (no web
// page). A sale counts only when someone pays in the app with the code.
export default function PromoCodeWidget({ code }) {
	const [codeCopied, setCodeCopied] = useState(false);
	const [qrDataUrl, setQrDataUrl] = useState(null);
	const [showQr, setShowQr] = useState(false);

	const scanUrl = code ? `${MAIN_SITE_ORIGIN}/r/${code}` : "";
	const caption = code ? `Use code ${code} for ${CUSTOMER_DISCOUNT_PERCENT}% off` : "";

	// Epocheye-styled QR of the scan link, black on white (the version every
	// phone scanner reads), with the code printed under it. Client only.
	useEffect(() => {
		if (!code) return;
		let cancelled = false;
		styledQrPng(scanUrl, { logoHref: "/logo-black.png", caption })
			.then((url) => {
				if (!cancelled) setQrDataUrl(url);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [code, scanUrl, caption]);

	const copy = async (text, setFn, eventName) => {
		try {
			await navigator.clipboard.writeText(text);
			trackEvent(eventName);
			setFn(true);
			setTimeout(() => setFn(false), 2000);
		} catch {
			// Clipboard access can fail on unsupported contexts.
		}
	};

	const saveAs = (url, name) => {
		const a = document.createElement("a");
		a.href = url;
		a.download = name;
		a.click();
	};

	const downloadQr = () => {
		if (!qrDataUrl) return;
		trackEvent(EVENT_NAMES.promoQrDownloaded);
		saveAs(qrDataUrl, `epocheye-${code}-qr.png`);
	};

	// White code + white logo on a transparent background, for dark posts.
	const downloadQrWhite = async () => {
		try {
			const url = await styledQrPng(scanUrl, {
				color: "#ffffff",
				background: "none",
				logoHref: "/logo-white.png",
				caption,
			});
			trackEvent(EVENT_NAMES.promoQrDownloaded);
			saveAs(url, `epocheye-${code}-qr-white.png`);
		} catch {
			// Rendering can fail on very old browsers; the black version still works.
		}
	};

	const toggleQr = () => {
		setShowQr((v) => {
			const next = !v;
			if (next) trackEvent(EVENT_NAMES.promoQrShown);
			return next;
		});
	};

	if (!code) {
		return (
			<div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-6 animate-pulse">
				<div className="h-3 w-24 bg-white/5 rounded mb-4" />
				<div className="h-8 w-48 bg-white/5 rounded" />
			</div>
		);
	}

	return (
		<div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-6">
			<p className="text-xs font-medium text-white/35 uppercase tracking-widest mb-4">
				Your Promo Code
			</p>

			<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
				{/* Code display */}
				<div className="flex items-center gap-4 flex-1">
					<span className="text-3xl font-mono font-bold tracking-widest text-white">
						{code}
					</span>
					<button
						onClick={() => copy(code, setCodeCopied, EVENT_NAMES.promoCodeCopied)}
						className="flex items-center gap-1.5 px-3 py-1.5 border border-white/15 rounded-lg text-xs text-white/50 hover:text-white hover:border-white/30 transition-all duration-200"
						aria-label="Copy promo code">
						{codeCopied ? (
							<Check className="w-3.5 h-3.5 text-green-400" />
						) : (
							<Copy className="w-3.5 h-3.5" />
						)}
						{codeCopied ? "Copied!" : "Copy code"}
					</button>
				</div>

			</div>

			{/* QR code section */}
			<div className="mt-5 pt-5 border-t border-white/5">
				<div className="flex items-center justify-between">
					<button
						onClick={toggleQr}
						className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors duration-200">
						<QrCode className="w-3.5 h-3.5" />
						{showQr ? "Hide QR code" : "Show QR code"}
					</button>

					{showQr && qrDataUrl && (
						<div className="flex flex-wrap gap-2">
							<button
								onClick={downloadQr}
								className="flex items-center gap-1.5 px-3 py-1.5 border border-white/15 rounded-lg text-xs text-white/50 hover:text-white hover:border-white/30 transition-all duration-200">
								<Download className="w-3.5 h-3.5" />
								Black PNG
							</button>
							<button
								onClick={downloadQrWhite}
								title="White on transparent, for dark backgrounds. Some older scanner apps can't read light-on-dark codes."
								className="flex items-center gap-1.5 px-3 py-1.5 border border-white/15 rounded-lg text-xs text-white/50 hover:text-white hover:border-white/30 transition-all duration-200">
								<Download className="w-3.5 h-3.5" />
								White PNG
							</button>
						</div>
					)}
				</div>

				{showQr && (
					<div className="mt-4 flex justify-start">
						{qrDataUrl ? (
							<div className="p-3 bg-white rounded-xl inline-block">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={qrDataUrl}
									alt={`QR code that opens Epocheye in the app store, with code ${code}`}
									width={200}
									height={224}
								/>
							</div>
						) : (
							<div className="w-[224px] h-[224px] bg-white/5 rounded-xl animate-pulse" />
						)}
					</div>
				)}
			</div>

			<p className="text-xs text-white/35 mt-4 leading-relaxed">
				Share your code and this QR. Scanning the QR opens Epocheye in the Play Store or
				App Store and counts as a click for you. A sale counts only when someone pays in
				the app with your code.
			</p>
		</div>
	);
}
