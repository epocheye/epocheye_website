"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Download, QrCode } from "lucide-react";
import { trackEvent, EVENT_NAMES } from "@/lib/analytics";

// Creators share only their code (or a QR of it). There is no link: nobody is
// sent to a website or an app store. Followers type or scan the code into the
// Epocheye app at checkout, which is where entries and sales are counted.
export default function PromoCodeWidget({ code }) {
	const [codeCopied, setCodeCopied] = useState(false);
	const [qrDataUrl, setQrDataUrl] = useState(null);
	const [showQr, setShowQr] = useState(false);

	// QR of the plain code (no URL), generated on the client only.
	useEffect(() => {
		if (!code) return;
		let cancelled = false;
		import("qrcode").then((QRCode) => {
			QRCode.toDataURL(code, {
				width: 300,
				margin: 2,
				color: { dark: "#ffffff", light: "#0d0d0d" },
			}).then((url) => {
				if (!cancelled) setQrDataUrl(url);
			});
		});
		return () => {
			cancelled = true;
		};
	}, [code]);

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

	const downloadQr = () => {
		if (!qrDataUrl) return;
		trackEvent(EVENT_NAMES.promoQrDownloaded);
		const a = document.createElement("a");
		a.href = qrDataUrl;
		a.download = `epocheye-${code}-qr.png`;
		a.click();
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
						<button
							onClick={downloadQr}
							className="flex items-center gap-1.5 px-3 py-1.5 border border-white/15 rounded-lg text-xs text-white/50 hover:text-white hover:border-white/30 transition-all duration-200">
							<Download className="w-3.5 h-3.5" />
							Download PNG
						</button>
					)}
				</div>

				{showQr && (
					<div className="mt-4 flex justify-start">
						{qrDataUrl ? (
							<div className="p-3 bg-[#0d0d0d] border border-white/10 rounded-xl inline-block">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={qrDataUrl}
									alt={`QR code for ${code}`}
									width={160}
									height={160}
									className="rounded-lg"
								/>
								<p className="text-[10px] text-white/25 text-center mt-2 font-mono">
									{code}
								</p>
							</div>
						) : (
							<div className="w-40 h-40 bg-white/5 rounded-xl animate-pulse" />
						)}
					</div>
				)}
			</div>

			<p className="text-xs text-white/35 mt-4 leading-relaxed">
				Share only this code, or its QR. Your followers enter it in the Epocheye app when
				they unlock your monument. Each person entering it counts once a day as a code
				entry; a sale counts only when they pay in the app with your code.
			</p>
		</div>
	);
}
