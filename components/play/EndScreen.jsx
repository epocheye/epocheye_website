"use client";

// The end of a level: the "What you now know" card, then three ways on. Share sends the card's
// own address. Everything on the card comes from site.json; the text here is generic.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cardView, encodeCard } from "@/lib/play/card";
import KnowCard from "@/components/play/KnowCard";
import { Pill } from "@/components/play/ui";

// Null when this pack's story has no ending card.
export function endView(site, lens, game) {
	return cardView(site, { lens, choices: game.choices, vote: game.vote });
}

export default function EndScreen({ slug, version, view, game }) {
	const [note, setNote] = useState("");
	const home = useRef(null);

	// Arriving here replaces the story panel. Give the keyboard somewhere to start.
	useEffect(() => {
		const at = document.activeElement;
		if (!at || at === document.body) home.current?.focus({ preventScroll: true });
	}, []);

	const share = async () => {
		// Only what the card shows goes into its address.
		const choices = Object.fromEntries(view.choices.map((c) => [c.id, game.choices[c.id]]));
		const id = encodeCard({ slug, version, lens: view.lens, choices, vote: view.vote ? game.vote : null });
		const url = `${window.location.origin}/play/c/${id}`;
		if (navigator.share) {
			try {
				await navigator.share({ title: view.title || view.siteName, text: view.shareLine || undefined, url });
				return;
			} catch (err) {
				if (err && err.name === "AbortError") return;
			}
		}
		try {
			await navigator.clipboard.writeText(url);
			setNote("Link copied.");
		} catch {
			setNote(url);
		}
	};

	return (
		<section className="play-end" aria-label="What you now know">
			<div className="play-sr" role="status" aria-live="polite">
				You have finished. What you now know.
			</div>
			<div ref={home} className="play-end-scroll" tabIndex={-1} data-focus-home="">
				<KnowCard view={view} />
			</div>
			<div className="play-end-actions">
				<Pill strong onClick={share}>
					Share
				</Pill>
				<Pill as={Link} href="/download">
					See it for real
				</Pill>
				<Pill as={Link} href="/play">
					Next site
				</Pill>
				<span className="play-note play-end-note" role="status" aria-live="polite">
					{note}
				</span>
			</div>
		</section>
	);
}
