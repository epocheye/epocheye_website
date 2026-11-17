import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import Link from "next/link";
import { LOCKED_LABELS, liveSites, lockedSites } from "@/lib/play/sites";
import { packBase } from "@/lib/play/pack";

// The card picture is a file inside the published pack. Show it only when it is really there.
function coverFor(site) {
	if (!site.cover) return null;
	// turbopackIgnore: without it the build traces every file of every pack into this route.
	const onDisk = join(/* turbopackIgnore: true */ process.cwd(), "public", "play", "packs", site.slug, `v${site.version}`, ...site.cover.split("/"));
	return existsSync(onDisk) ? `${packBase(site.slug, site.version)}/${site.cover}` : null;
}

export default function PlayHome() {
	const live = liveSites();
	const locked = lockedSites();
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
						<div className="play-site-status">
							<span className="play-label">{LOCKED_LABELS[site.status]}</span>
						</div>
						<div className="play-site-body">
							<h2 className="play-site-name">{site.name}</h2>
							<p className="play-site-place">{site.place}</p>
							<div className="play-site-row">
								<button type="button" className="play-pill" disabled aria-label={`Vote for ${site.name}. Voting is not open yet`}>
									Vote
								</button>
								<span className="play-note">Voting is not open yet.</span>
							</div>
						</div>
					</li>
				))}
			</ul>
		</main>
	);
}
