"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const IOS_STORE_URL = "https://apps.apple.com/app/epocheye/id6504869173";
const ANDROID_STORE_URL =
	"https://play.google.com/store/apps/details?id=com.epocheye";

function detectPlatform(userAgent = "") {
	const ua = userAgent.toLowerCase();
	if (/iphone|ipad|ipod/.test(ua)) return "ios";
	if (/android/.test(ua)) return "android";
	return "desktop";
}

/**
 * Attempts to open the Epocheye app via its custom scheme. On mobile, if the app
 * doesn't take over within a short window (i.e. it isn't installed), falls back to
 * the relevant app store. Desktop just shows the manual links.
 */
export default function ShareRedirect({ deepLink, title, image }) {
	const [platform, setPlatform] = useState("desktop");
	const storeUrl =
		platform === "ios"
			? IOS_STORE_URL
			: platform === "android"
				? ANDROID_STORE_URL
				: "/download";

	useEffect(() => {
		const p = detectPlatform(navigator.userAgent);
		startTransition(() => setPlatform(p));

		if (p === "desktop" || !deepLink) return;

		// Try to hand off to the app; if we're still here after the timeout, the app
		// likely isn't installed → send to the store.
		const start = Date.now();
		const timer = setTimeout(() => {
			if (Date.now() - start < 2500) {
				window.location.href = p === "ios" ? IOS_STORE_URL : ANDROID_STORE_URL;
			}
		}, 1500);

		window.location.href = deepLink;

		return () => clearTimeout(timer);
	}, [deepLink]);

	return (
		<main className="relative isolate min-h-screen bg-[#080808] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
			<div className="relative z-10 flex flex-col items-center max-w-md">
				{image ? (
					<div className="mb-8 overflow-hidden rounded-2xl border border-white/10">
						<Image
							src={image}
							alt={title || "Epocheye discovery"}
							width={320}
							height={200}
							className="object-cover"
							unoptimized
						/>
					</div>
				) : null}

				<h1 className="font-instrument-serif text-3xl sm:text-4xl text-white">
					{title || "A discovery on Epocheye"}
				</h1>
				<p className="text-white/60 mt-4 font-instrument-sans">
					Opening Epocheye…
				</p>

				<div className="mt-10 flex flex-col items-center gap-3">
					<Link
						href={storeUrl}
						className="inline-flex items-center rounded-full bg-white px-6 py-3 text-xs font-semibold tracking-widest uppercase text-black hover:bg-white/90 transition-all duration-300 font-instrument-sans">
						Get the app
					</Link>
					<Link
						href="/"
						className="inline-flex items-center rounded-full border border-white/30 px-5 py-2.5 text-xs font-semibold tracking-widest uppercase text-white/70 hover:bg-white hover:text-black transition-all duration-500 font-instrument-sans">
						Explore on the web
					</Link>
				</div>
			</div>
		</main>
	);
}
