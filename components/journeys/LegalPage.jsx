import Link from "next/link";

import { FOOTER } from "@/lib/journeys/config";

// Placeholder legal pages for /journeys. Every page is marked for legal review.
export default function LegalPage({ title, intro, sections }) {
	return (
		<div className="jr-legal">
			<div className="jr-legal__inner">
				<p>
					<Link href="/journeys" className="jr-wordmark">
						Epocheye
					</Link>
				</p>
				<h1 style={{ marginTop: "2rem" }}>{title}</h1>
				<span className="jr-legal__flag">[SAMBIT: legal review]</span>
				<p>{intro}</p>
				{sections.map((s) => (
					<section key={s.h}>
						<h2>{s.h}</h2>
						{s.p.map((text) => (
							<p key={text}>{text}</p>
						))}
					</section>
				))}
				<footer className="jr-footer" style={{ marginTop: "4rem", paddingLeft: 0, paddingRight: 0 }}>
					<p>{FOOTER.company}</p>
					<nav aria-label="Legal">
						{FOOTER.links.map((l) =>
							l.href.startsWith("/") ? (
								<Link key={l.label} href={l.href}>
									{l.label}
								</Link>
							) : (
								<a key={l.label} href={l.href}>
									{l.label}
								</a>
							),
						)}
					</nav>
				</footer>
			</div>
		</div>
	);
}
