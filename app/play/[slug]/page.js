import { notFound } from "next/navigation";
import { earlySite, getPlayableSite } from "@/lib/play/sites";
import { verifyAdminJWT } from "@/lib/server/adminAuth";
import LevelLoader from "@/components/play/LevelLoader";
import EarlyGate from "@/components/play/sites/EarlyGate";

// Which sites are open changes with the clock (a site's opens_at), so this page is never cached.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
	const { slug } = await params;
	const site = getPlayableSite(slug) || earlySite(slug);
	return { title: site ? `${site.name} | Epocheye Play` : "Epocheye Play" };
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
	const { slug } = await params;
	const query = await searchParams;
	const site = getPlayableSite(slug);
	const early = site ? null : earlySite(slug);
	if (!site && !early) notFound();
	const open = site || early;
	const ch = typeof query.ch === "string" && /^\d{1,3}$/.test(query.ch) ? Number(query.ch) : null;
	const debug = query.debug === "1" && (await debugAllowed());
	const level = <LevelLoader slug={open.slug} version={open.version} name={open.name} chapterNumber={ch} debug={debug} />;
	// A site that opens within a week plays only for players with a confirmed email; the server
	// decides who (lib/server/play/request.js), and EarlyGate asks it.
	return site ? level : (
		<EarlyGate slug={open.slug} name={open.name}>
			{level}
		</EarlyGate>
	);
}
