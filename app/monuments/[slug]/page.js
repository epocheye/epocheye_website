import { notFound } from "next/navigation";
import Claim, { SourceName, TIER_LABEL } from "@/components/monuments/Claim";
import PageShell from "@/components/monuments/PageShell";
import PlayCta from "@/components/monuments/PlayCta";
import JsonLd from "@/components/seo/JsonLd";
import { MONUMENTS, getMonument, orderedSources } from "@/lib/monuments";
import { breadcrumbs, faqPage, monumentPage, monumentPlace, softwareApplication } from "@/lib/seo/schema";

export const dynamicParams = false;

export function generateStaticParams() {
	return MONUMENTS.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }) {
	const { slug } = await params;
	const m = getMonument(slug);
	if (!m) return {};
	const path = `/monuments/${m.slug}`;
	return {
		title: m.seo.title,
		description: m.seo.description,
		alternates: { canonical: path },
		openGraph: {
			type: "article",
			siteName: "Epocheye",
			url: path,
			title: m.seo.title,
			description: m.seo.description,
			modifiedTime: m.updated,
		},
		twitter: { title: m.seo.title, description: m.seo.description },
	};
}

function formatDate(iso) {
	return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}

export default async function MonumentPage({ params }) {
	const { slug } = await params;
	const m = getMonument(slug);
	if (!m) notFound();

	const sources = orderedSources(m);
	const numbers = Object.fromEntries(sources.map((s) => [s.id, s.n]));
	const path = `/monuments/${m.slug}`;

	return (
		<PageShell
			crumbs={[
				{ name: "Monuments", path: "/monuments" },
				{ name: m.name, path, current: true },
			]}>
			<JsonLd
				data={[
					monumentPlace(m),
					monumentPage(m),
					softwareApplication(),
					breadcrumbs([
						{ name: "Home", path: "/" },
						{ name: "Monuments", path: "/monuments" },
						{ name: m.name, path },
					]),
					faqPage(m.faq),
				]}
			/>

			<article>
				<header className="mb-10">
					<p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-white/40">
						{m.city} · {m.region}
					</p>
					<h1 className="font-montserrat text-3xl font-light leading-tight text-white sm:text-5xl">
						{m.name}
					</h1>
					{m.alternateNames?.length > 0 && (
						<p className="mt-3 text-sm text-white/45">Also known as {m.alternateNames.join(", ")}</p>
					)}
				</header>

				<section aria-label="Short answer" className="space-y-6">
					{m.answer.map((p, i) => (
						<Claim key={i} paragraph={p} sources={m.sources} numbers={numbers} size="lead" />
					))}
				</section>

				<div className="my-12 border-y border-white/5 py-8">
					<PlayCta label={`Open Epocheye at ${m.name}`} />
				</div>

				{m.sections.map((s) => (
					<section key={s.id} id={s.id} className="mt-14 scroll-mt-8">
						<h2 className="mb-6 font-montserrat text-xl font-semibold text-white sm:text-2xl">{s.heading}</h2>
						<div className="space-y-6">
							{s.paragraphs.map((p, i) => (
								<Claim key={i} paragraph={p} sources={m.sources} numbers={numbers} />
							))}
						</div>
					</section>
				))}

				<section id="not-recorded" className="mt-14 scroll-mt-8">
					<h2 className="mb-2 font-montserrat text-xl font-semibold text-white sm:text-2xl">What no source records</h2>
					<p className="mb-6 text-sm text-white/45">
						No source we could reach records the items below. We say so rather than fill the gap with a guess.
					</p>
					<ul className="space-y-4">
						{m.unknowns.map((u, i) => (
							<li key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
								<Claim paragraph={{ ...u, tier: u.tier ?? "unrecorded" }} sources={m.sources} numbers={numbers} />
							</li>
						))}
					</ul>
				</section>

				{m.experience && (
					<section id="in-the-app" className="mt-14 scroll-mt-8">
						<h2 className="mb-6 font-montserrat text-xl font-semibold text-white sm:text-2xl">How to see it</h2>
						<p className="text-base leading-relaxed text-white/70 sm:text-[17px]">{m.experience.summary}</p>
						<div className="mt-8">
							<PlayCta label={`Be at ${m.name}, then open the app`} />
						</div>
					</section>
				)}

				{m.faq?.length > 0 && (
					<section id="questions" className="mt-14 scroll-mt-8">
						<h2 className="mb-6 font-montserrat text-xl font-semibold text-white sm:text-2xl">Questions</h2>
						<div className="space-y-8">
							{m.faq.map((f, i) => (
								<div key={i}>
									<h3 className="mb-3 text-base font-semibold text-white/90 sm:text-lg">{f.q}</h3>
									<Claim paragraph={f.a} sources={m.sources} numbers={numbers} />
								</div>
							))}
						</div>
					</section>
				)}

				<section id="sources" className="mt-16 scroll-mt-8 border-t border-white/5 pt-10">
					<h2 className="mb-6 font-montserrat text-xl font-semibold text-white sm:text-2xl">Sources</h2>
					<ol className="space-y-3 text-sm leading-relaxed text-white/55">
						{sources.map((s) => (
							<li key={s.id} id={`source-${s.n}`} className="scroll-mt-8">
								<span className="mr-2 text-white/30">[{s.n}]</span>
								<SourceName source={s} />
								{s.publisher && <span className="text-white/40">. {s.publisher}</span>}
								{s.onSite && <span className="text-white/40">. {s.onSite}</span>}
								{s.internal && <span className="text-white/40"> (Epocheye&apos;s own research file)</span>}
							</li>
						))}
					</ol>
					<p className="mt-8 text-xs text-white/35">
						Tiers: {Object.values(TIER_LABEL).join(" · ")}. Last reviewed {formatDate(m.updated)}.
					</p>
				</section>
			</article>
		</PageShell>
	);
}
