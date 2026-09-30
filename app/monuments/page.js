import Link from "next/link";
import PageShell from "@/components/monuments/PageShell";
import PlayCta from "@/components/monuments/PlayCta";
import JsonLd from "@/components/seo/JsonLd";
import { MONUMENTS } from "@/lib/monuments";
import { ONE_LINER, SITE_URL } from "@/lib/site";
import { breadcrumbs } from "@/lib/seo/schema";

const title = "Epocheye monuments: what is known, and what is not";
const description =
	"Tipu Sultan's Summer Palace, Bangalore Fort, Victoria Memorial and the Indian Museum: what is known, what is disputed and what is not recorded, with sources.";

export const metadata = {
	title,
	description,
	alternates: { canonical: "/monuments" },
	openGraph: { type: "website", siteName: "Epocheye", url: "/monuments", title, description },
};

export default function MonumentsIndex() {
	return (
		<PageShell crumbs={[{ name: "Monuments", path: "/monuments", current: true }]}>
			<JsonLd
				data={[
					{
						"@context": "https://schema.org",
						"@type": "CollectionPage",
						"@id": `${SITE_URL}/monuments`,
						url: `${SITE_URL}/monuments`,
						name: title,
						description,
						hasPart: MONUMENTS.map((m) => ({ "@id": `${SITE_URL}/monuments/${m.slug}` })),
					},
					breadcrumbs([
						{ name: "Home", path: "/" },
						{ name: "Monuments", path: "/monuments" },
					]),
				]}
			/>
			<header className="mb-12">
				<p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-white/40">Where Epocheye works</p>
				<h1 className="font-montserrat text-3xl font-light leading-tight text-white sm:text-5xl">
					Four monuments,
					<br />
					<span className="font-semibold">and what the record says.</span>
				</h1>
				<p className="mt-6 text-base leading-relaxed text-white/60 sm:text-lg">{ONE_LINER}</p>
				<p className="mt-3 text-sm text-white/40">Epocheye is pronounced &ldquo;Epoch Eye&rdquo;.</p>
			</header>

			<ul className="space-y-4">
				{MONUMENTS.map((m) => (
					<li key={m.slug}>
						<Link
							href={`/monuments/${m.slug}`}
							className="block rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5 transition-colors hover:border-white/25 hover:bg-white/[0.06]">
							<p className="text-[11px] uppercase tracking-[0.18em] text-white/40">{m.city}</p>
							<h2 className="mt-2 font-montserrat text-xl font-semibold text-white">{m.name}</h2>
							<p className="mt-2 text-sm leading-relaxed text-white/60">{m.seo.description}</p>
						</Link>
					</li>
				))}
			</ul>

			<div className="mt-12 border-t border-white/5 pt-8">
				<PlayCta label="Be at the monument, then open the app" />
			</div>
		</PageShell>
	);
}
