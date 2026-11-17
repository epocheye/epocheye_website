import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { earlySite, getPlayableSite } from "@/lib/play/sites";
import { playFeatures } from "@/lib/play/features";
import { firstFaces, forClient, loadSiteOnServer } from "@/lib/play/pack.server";
import { verifyAdminJWT } from "@/lib/server/adminAuth";
import LevelLoader from "@/components/play/LevelLoader";
import EarlyGate from "@/components/play/sites/EarlyGate";
import PlayOff from "@/components/play/sites/PlayOff";
import { PLAY_LINE, playMeta } from "@/lib/play/meta";

// Which sites are open changes with the clock (a site's opens_at), so this page is never cached.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
	const { slug } = await params;
	const site = playFeatures().enabled ? getPlayableSite(slug) || earlySite(slug) : null;
	if (!site) return playMeta({ title: "Epocheye Play", description: PLAY_LINE, path: "/play" });
	return playMeta({
		title: `${site.name} | Epocheye Play`,
		description: `Rebuild ${site.name} from its evidence, chapter by chapter. A history game.`,
		path: `/play/${site.slug}`,
	});
}

// /play/<slug>            the level
// /play/<slug>?ch=<n>     start at chapter n
// /play/<slug>?debug=1    with the debug view. Not for players: outside production, or signed in
//                         as an admin, or on a deployment that sets PLAY_DEBUG=1 (a preview build).
async function debugAllowed() {
	if (process.env.NODE_ENV !== "production" || process.env.PLAY_DEBUG === "1") return true;
	try {
		return (await verifyAdminJWT()).ok;
	} catch {
		return false;
	}
}

export default async function PlayLevelPage({ params, searchParams }) {
	const features = playFeatures();
	if (!features.enabled) return <PlayOff />;
	const { slug } = await params;
	const query = await searchParams;
	const site = getPlayableSite(slug);
	// Early access is given by email: with email off, a site that is not open yet is simply not open.
	const early = site || !features.email ? null : earlySite(slug);
	if (!site && !early) notFound();
	const open = site || early;
	const ch = typeof query.ch === "string" && /^\d{1,3}$/.test(query.ch) ? Number(query.ch) : null;
	const debug = query.debug === "1" && (await debugAllowed());

	// The first view waits for the pack's site.json and the six smallest faces of the viewpoint the
	// level opens on. The server reads site.json from disk and hands it to the page, and asks the
	// browser to fetch those six faces at once, alongside the scripts (brief 5.7). A returning
	// player who resumes elsewhere fetched six small faces for nothing; they are cached for good.
	const pack = site ? await loadSiteOnServer(open.slug, open.version) : null;
	if (pack) {
		for (const url of firstFaces(pack, open.slug, open.version, ch)) preload(url, { as: "fetch", crossOrigin: "anonymous", fetchPriority: "low" });
	}

	const level = <LevelLoader slug={open.slug} version={open.version} name={open.name} chapterNumber={ch} debug={debug} initialSite={pack ? forClient(pack) : null} />;
	// A site that opens within a week plays only for players with a confirmed email; the server
	// decides who (lib/server/play/request.js), and EarlyGate asks it.
	return site ? level : (
		<EarlyGate slug={open.slug} name={open.name}>
			{level}
		</EarlyGate>
	);
}
