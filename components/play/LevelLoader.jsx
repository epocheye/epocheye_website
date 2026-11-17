"use client";

// Fetches a pack's site.json (unless the server already handed it over), compiles its story and
// mounts the level.

import Link from "next/link";
import { useEffect, useState } from "react";
import { compileStory } from "@/lib/play/story/engine";
import { loadSite, packUrls } from "@/lib/play/pack";
import { Pill } from "@/components/play/ui";
import Level from "@/components/play/Level";

function compiled(slug, version, site) {
	const chapters = compileStory(site.story);
	if (chapters.length === 0) throw new Error("This pack has no story yet.");
	return { slug, site, chapters, urls: packUrls(slug, version), error: null };
}

// initialSite: the pack's site.json as the server read it, or null to fetch it here.
export default function LevelLoader({ slug, version, name, chapterNumber = null, debug = false, initialSite = null }) {
	const [loaded, setLoaded] = useState({ slug: null, site: null, chapters: null, urls: null, error: null });

	useEffect(() => {
		let cancelled = false;
		// The level reads this browser's save, so it is mounted after hydration either way.
		const given = initialSite && initialSite.mode === "pano" && Array.isArray(initialSite.nodes) && initialSite.nodes.length ? initialSite : null;
		(given ? Promise.resolve(given) : loadSite(slug, version))
			.then((site) => {
				if (!cancelled) setLoaded(compiled(slug, version, site));
			})
			.catch((err) => {
				if (!cancelled) setLoaded({ slug, site: null, chapters: null, urls: null, error: err?.message || "The level did not load." });
			});
		return () => {
			cancelled = true;
		};
	}, [slug, version, initialSite]);

	if (loaded.slug !== slug || (!loaded.site && !loaded.error)) {
		return (
			<main className="play-level is-loading">
				<p className="play-loading" role="status">
					{name ? `Loading ${name}` : "Loading"}
				</p>
			</main>
		);
	}
	if (loaded.error) {
		return (
			<main className="play-level is-loading">
				<div className="play-loading">
					<p role="alert">{loaded.error}</p>
					<Pill as={Link} href="/play">
						All sites
					</Pill>
				</div>
			</main>
		);
	}

	// ?ch=<n> matches a chapter's own number, else its place in the list.
	let startChapter = null;
	if (chapterNumber != null) {
		const byN = loaded.chapters.findIndex((c) => c.n === chapterNumber);
		startChapter = byN >= 0 ? byN : loaded.chapters[chapterNumber] ? chapterNumber : null;
	}

	return (
		<main>
			<h1 className="play-sr">{loaded.site.site.name}</h1>
			<Level key={slug} slug={slug} version={version} site={loaded.site} chapters={loaded.chapters} urls={loaded.urls} startChapter={startChapter} debug={debug} />
		</main>
	);
}
