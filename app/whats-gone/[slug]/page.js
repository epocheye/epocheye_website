import Link from "next/link";
import { notFound } from "next/navigation";
import Claim, { SourceName } from "@/components/monuments/Claim";
import PageShell from "@/components/monuments/PageShell";
import PlayCta from "@/components/monuments/PlayCta";
import JsonLd from "@/components/seo/JsonLd";
import { getMonument, orderedSources } from "@/lib/monuments";
import { breadcrumbs } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/site";
import { EPISODES, getEpisode } from "@/lib/whats-gone";

export const dynamicParams = false;

export function generateStaticParams() {
	return EPISODES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }) {
	const { slug } = await params;
	const e = getEpisode(slug);
	if (!e) return {};
	const path = `/whats-gone/${e.slug}`;
	return {
		title: e.seo.title,
		description: e.seo.description,
		alternates: { canonical: path },
		openGraph: {
			type: "article",
			siteName: "Epocheye",
			url: path,
			title: e.seo.title,
			description: e.seo.description,
			publishedTime: e.published,
			modifiedTime: e.updated,
		},
	};
}

export default async function EpisodePage({ params }) {
	const { slug } = await params;
	const e = getEpisode(slug);
	if (!e) notFound();
	const m = getMonument(e.monument);
	const sources = orderedSources(e);
	const numbers = Object.fromEntries(sources.map((s) => [s.id, s.n]));
	const path = `/whats-gone/${e.slug}`;

	return (
		<PageShell
			crumbs={[{ name: `What's gone, episode ${e.episode}`, path, current: true }]}>
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "Article",
						"@id": `${SITE_URL}${path}`,
						headline: e.title,
						description: e.seo.description,
						datePublished: e.published,
						dateModified: e.updated,
						inLanguage: "en",
						about: m ? { "@id": `${SITE_URL}/monuments/${m.slug}#place` } : undefined,
						publisher: { "@id": `${SITE_URL}/#organization` },
					},
					breadcrumbs([
						{ name: "Home", path: "/" },
						{ name: `What's gone, episode ${e.episode}`, path },
					]),
				]}
			/>
			<article>
				<header className="mb-10">
					<p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-white/40">
						What&apos;s gone · Episode {e.episode}
						{m && ` · ${m.name}`}
					</p>
					<h1 className="font-montserrat text-3xl font-light leading-tight text-white sm:text-5xl">{e.title}</h1>
				</header>

				<section aria-label="Short answer" className="space-y-6">
					{e.answer.map((p, i) => (
						<Claim key={i} paragraph={p} sources={e.sources} numbers={numbers} size="lead" />
					))}
				</section>

				{e.sections.map((s) => (
					<section key={s.id} id={s.id} className="mt-14 scroll-mt-8">
						<h2 className="mb-6 font-montserrat text-xl font-semibold text-white sm:text-2xl">{s.heading}</h2>
						<div className="space-y-6">
							{s.paragraphs.map((p, i) => (
								<Claim key={i} paragraph={p} sources={e.sources} numbers={numbers} />
							))}
						</div>
					</section>
				))}

				{m && (
					<div className="mt-14 border-y border-white/5 py-8">
						<p className="mb-5 text-base text-white/70">
							More on{" "}
							<Link href={`/monuments/${m.slug}`} className="underline decoration-white/30 underline-offset-4">
								{m.name}
							</Link>
							: what survives, what is gone, and what no source records.
						</p>
						<PlayCta label={`Be at ${m.name}, then open the app`} />
					</div>
				)}

				<section id="sources" className="mt-16 scroll-mt-8">
					<h2 className="mb-6 font-montserrat text-xl font-semibold text-white sm:text-2xl">Sources</h2>
					<ol className="space-y-3 text-sm leading-relaxed text-white/55">
						{sources.map((s) => (
							<li key={s.id} id={`source-${s.n}`} className="scroll-mt-8">
								<span className="mr-2 text-white/30">[{s.n}]</span>
								<SourceName source={s} />
								{s.publisher && <span className="text-white/40">. {s.publisher}</span>}
								{s.onSite && <span className="text-white/40">. {s.onSite}</span>}
							</li>
						))}
					</ol>
				</section>
			</article>
		</PageShell>
	);
}
