"use client";

// The end of a level: the "What you now know" card, then three ways on. Share sends the card's
// own address: a short id from the server when it has given one, else the long id that carries
// the card itself. Everything on the card comes from site.json; the text here is generic.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cardView, decodeCard, encodeCard } from "@/lib/play/card";
import { createCard, flush, track } from "@/lib/play/api";
import KnowCard from "@/components/play/KnowCard";
import YearVoteShares from "@/components/play/YearVoteShares";
import EndExtras from "@/components/play/sites/EndExtras";
import { Pill } from "@/components/play/ui";

// Null when this pack's story has no ending card.
export function endView(site, lens, game) {
	return cardView(site, { lens, choices: game.choices, vote: game.vote });
}

export default function EndScreen({ slug, version, view, game, voteOptions = [] }) {
	const [note, setNote] = useState("");
	const [short, setShort] = useState({ key: "", id: null });
	const home = useRef(null);

	// Only what the card shows goes into its address.
	const choices = Object.fromEntries(view.choices.map((c) => [c.id, game.choices[c.id]]));
	const vote = view.vote ? game.vote : null;
	const longId = encodeCard({ slug, version, lens: view.lens, choices, vote });

	// Arriving here replaces the story panel. Give the keyboard somewhere to start.
	useEffect(() => {
		const at = document.activeElement;
		if (!at || at === document.body) home.current?.focus({ preventScroll: true });
	}, []);

	// Ask for the short id now, so Share can use it at once when tapped. The card is read back
	// from longId, so this runs once per card, not once per render.
	useEffect(() => {
		const p = decodeCard(longId);
		if (!p) return undefined;
		let live = true;
		createCard(slug, { lens: p.l, choices: p.c, vote: p.y }).then((r) => {
			if (live && r.ok && typeof r.id === "string") setShort({ key: longId, id: r.id });
		});
		return () => {
			live = false;
		};
	}, [slug, longId]);

	const share = async () => {
		const id = short.key === longId && short.id ? short.id : longId;
		const url = `${window.location.origin}/play/c/${id}`;
		track("share", { site: slug, props: { what: "card", short: id !== longId } });
		flush();
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

	const cta = (which) => () => {
		track("cta_click", { site: slug, props: { cta: which } });
		flush();
	};

	return (
		<section className="play-end" aria-label="What you now know">
			<div className="play-sr" role="status" aria-live="polite">
				You have finished. What you now know.
			</div>
			<div ref={home} className="play-end-scroll" tabIndex={-1} data-focus-home="">
				<KnowCard view={view} />
				{vote ? <YearVoteShares slug={slug} vote={vote} options={voteOptions} /> : null}
				<EndExtras slug={slug} />
			</div>
			<div className="play-end-actions">
				<Pill strong onClick={share}>
					Share
				</Pill>
				<Pill as={Link} href="/download" onClick={cta("see_it")}>
					See it for real
				</Pill>
				<Pill as={Link} href="/play" onClick={cta("next_site")}>
					Next site
				</Pill>
				<span className="play-note play-end-note" role="status" aria-live="polite">
					{note}
				</span>
			</div>
		</section>
	);
}
