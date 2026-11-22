import { Anton } from "next/font/google";
import { notFound } from "next/navigation";
import { getPlayableSite } from "@/lib/play/sites";
import { playFeatures } from "@/lib/play/features";
import { playMeta } from "@/lib/play/meta";
import PlayOff from "@/components/play/sites/PlayOff";
import WorldLoader from "@/components/play/world/WorldLoader";

// Display face for titles and splashes. SIL Open Font License, see docs/play/CREDITS.md.
const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-world-display", display: "swap" });

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
	const { slug } = await params;
	const site = playFeatures().enabled ? getPlayableSite(slug) : null;
	if (!site?.world_version) return playMeta({ title: "Epocheye Play", description: "A history game.", path: "/play" });
	return playMeta({
		title: `${site.name}, open world | Epocheye Play`,
		description: `Walk our reconstruction of ${site.name} and bring back what was lost.`,
		path: `/play/${site.slug}/world`,
	});
}

export default async function PlayWorldPage({ params }) {
	if (!playFeatures().enabled) return <PlayOff />;
	const { slug } = await params;
	const site = getPlayableSite(slug);
	if (!site?.world_version) notFound();
	return (
		<div className={display.variable}>
			<WorldLoader slug={site.slug} packVersion={site.version} worldVersion={site.world_version} />
		</div>
	);
}
