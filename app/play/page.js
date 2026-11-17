import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import Link from "next/link";
import { LOCKED_LABELS, liveSites, lockedSites } from "@/lib/play/sites";
import { packBase } from "@/lib/play/pack";
import { playFeatures } from "@/lib/play/features";
import LockedActions from "@/components/play/sites/LockedActions";
import PlayOff from "@/components/play/sites/PlayOff";
import { PLAY_LINE, playMeta } from "@/lib/play/meta";

export const metadata = playMeta({ title: "Epocheye Play", description: PLAY_LINE, path: "/play" });
import "@/components/play/sites/community.css";

// The card picture is a file inside the published pack. Show it only when it is really there.
function coverFor(site) {
	if (!site.cover) return null;
	// turbopackIgnore: without it the build traces every file of every pack into this route.
	const onDisk = join(/* turbopackIgnore: true */ process.cwd(), "public", "play", "packs", site.slug, `v${site.version}`, ...site.cover.split("/"));
	return existsSync(onDisk) ? `${packBase(site.slug, site.version)}/${site.cover}` : null;
}

// A locked card's build-progress clip. Shown only when the registry entry gives one: clip (a
// video URL, with an optional still as its poster) or a still alone. No entry has either yet, so
// no card shows anything here. Never a stand-in picture.
function BuildClip({ site }) {
	const clip = typeof site.clip === "string" && site.clip ? site.clip : null;
	const still = typeof site.still === "string" && site.still ? site.still : null;
	if (!clip && !still) return null;
	return (
		<figure className="play-site-clip">
			{clip ? (
				<video src={clip} poster={still || undefined} muted loop playsInline autoPlay preload="metadata" aria-label={`Build progress, ${site.name}`} />
			) : (
				<Image src={still} alt={`Build progress, ${site.name}`} fill sizes="(max-width: 700px) 100vw, 360px" unoptimized />
			)}
		</figure>
	);
}

// Which sites are live or locked follows each site's opens_at, and the feature switches are read
// per request, so this page is rendered per request (the /play layout asks for that).
export default function PlayHome() {
	const features = playFeatures();
	if (!features.enabled) return <PlayOff />;
	const live = liveSites();
	const locked = lockedSites();
	const links = [
		features.daily ? { href: "/play/daily", text: "Daily puzzle" } : null,
		features.vote ? { href: "/play/vote", text: "Vote for the next site" } : null,
		features.leaderboards ? { href: "/play/leaderboards", text: "Leaderboards" } : null,
	].filter(Boolean);
	return (
		<main className="play-home">
			<div className="play-home-bar">
				<Link href="/" className="play-brand">
					Epocheye
				</Link>
				<span className="play-label">A history game</span>
			</div>

			<header className="play-hero">
				<h1>Epocheye Play</h1>
				<p className="play-logline">Rebuild a lost monument from its evidence.</p>
			</header>

			{links.length ? (
				<nav className="play-home-links" aria-label="More to play">
					{links.map((l) => (
						<Link key={l.href} href={l.href} className="play-pill is-small">
							{l.text}
						</Link>
					))}
				</nav>
			) : null}

			<ul className="play-cards" aria-label="Sites">
				{live.map((site) => {
					const cover = coverFor(site);
					return (
						<li key={site.slug} className="play-site is-live">
							{cover ? <Image className="play-site-cover" src={cover} alt="" fill sizes="(max-width: 1120px) 100vw, 1120px" unoptimized priority /> : null}
							<div className="play-site-shade" aria-hidden="true" />
							<div className="play-site-body">
								<span className="play-label">Ready to play</span>
								<h2 className="play-site-name">
									<Link href={`/play/${site.slug}`} className="play-site-link">
										{site.name}
									</Link>
								</h2>
								<p className="play-site-place">{site.place}</p>
								<div className="play-site-row">
									<span className="play-pill is-strong" aria-hidden="true">
										Play
									</span>
								</div>
							</div>
						</li>
					);
				})}
				{locked.map((site) => (
					<li key={site.slug} className="play-site is-locked">
						<BuildClip site={site} />
						<div className="play-site-status">
							<span className="play-label">{LOCKED_LABELS[site.status]}</span>
						</div>
						<div className="play-site-body">
							<h2 className="play-site-name">{site.name}</h2>
							<p className="play-site-place">{site.place}</p>
							<div className="play-site-row">
								<LockedActions slug={site.slug} name={site.name} vote={features.vote} email={features.email} />
							</div>
						</div>
					</li>
				))}
			</ul>
		</main>
	);
}
