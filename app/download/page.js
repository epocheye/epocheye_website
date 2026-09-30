import Link from "next/link";
import PageShell from "@/components/monuments/PageShell";
import PlayCta from "@/components/monuments/PlayCta";
import { MONUMENTS } from "@/lib/monuments";
import { ONE_LINER } from "@/lib/site";

export const metadata = {
	title: "Download Epocheye",
	description: "Epocheye is on Google Play. It works at Tipu Sultan's Summer Palace, Bangalore Fort, Victoria Memorial and the Indian Museum.",
	alternates: { canonical: "/download" },
};

export default function DownloadPage() {
	return (
		<PageShell crumbs={[{ name: "Download", path: "/download", current: true }]}>
			<p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-white/40">On Google Play</p>
			<h1 className="font-montserrat text-3xl font-light leading-tight text-white sm:text-5xl">
				Download <span className="font-semibold">Epocheye</span>
			</h1>
			<p className="mt-6 text-base leading-relaxed text-white/60 sm:text-lg">{ONE_LINER}</p>
			<p className="mt-3 text-sm text-white/40">On Google Play, search Epocheye (you may hear it as &ldquo;Epoch Eye&rdquo;).</p>
			<div className="mt-10">
				<PlayCta label="Android" />
			</div>
			<h2 className="mt-14 mb-5 font-montserrat text-xl font-semibold text-white">Where it works</h2>
			<ul className="space-y-3">
				{MONUMENTS.map((m) => (
					<li key={m.slug}>
						<Link
							href={`/monuments/${m.slug}`}
							className="text-base text-white/75 underline decoration-white/20 underline-offset-4 hover:decoration-white/60">
							{m.name}
						</Link>
						<span className="text-white/40">, {m.city}</span>
					</li>
				))}
			</ul>
		</PageShell>
	);
}
