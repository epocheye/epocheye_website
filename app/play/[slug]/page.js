import { notFound } from "next/navigation";
import { getPlayableSite } from "@/lib/play/sites";
import LevelLoader from "@/components/play/LevelLoader";

export async function generateMetadata({ params }) {
	const { slug } = await params;
	const site = getPlayableSite(slug);
	return { title: site ? `${site.name} | Epocheye Play` : "Epocheye Play" };
}

// /play/<slug>            the level
// /play/<slug>?ch=<n>     start at chapter n
// /play/<slug>?debug=1    with the debug view
export default async function PlayLevelPage({ params, searchParams }) {
	const { slug } = await params;
	const query = await searchParams;
	const site = getPlayableSite(slug);
	if (!site) notFound();
	const ch = typeof query.ch === "string" && /^\d{1,3}$/.test(query.ch) ? Number(query.ch) : null;
	return <LevelLoader slug={site.slug} version={site.version} name={site.name} chapterNumber={ch} debug={query.debug === "1"} />;
}
