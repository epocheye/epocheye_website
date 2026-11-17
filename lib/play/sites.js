// Registry of Play sites. Adding a site is one entry here plus a published pack
// at public/play/packs/<slug>/v<version>/. No engine or component change.
//
// status:
//   "live"      a published pack, shown as a playable card on /play
//   "building"  locked card, "Building now"
//   "coming"    locked card, "Coming"
//   "dev"       a throwaway development pack, reachable by URL outside production only
//
// A locked site may also carry version (its published pack) and opens_at (an ISO date and time
// the owner gives). From a week before opens_at, players with a confirmed email can play it early
// (brief 5.5); from opens_at on it is live for everyone, with no other change.

export const SITES = [
	{
		slug: "tipu-summer-palace-bengaluru",
		status: "live",
		version: 1,
		name: "Tipu Sultan's Summer Palace",
		place: "Bengaluru",
		// Optional card picture, a path inside the pack. Shown only if the file exists.
		cover: "pano/forecourt/now/1024/pz.webp",
	},
	{ slug: "konark-sun-temple", status: "building", name: "Konark Sun Temple", place: "Konark, Odisha" },
	{ slug: "victoria-memorial", status: "coming", name: "Victoria Memorial", place: "Kolkata" },
	{ slug: "hampi", status: "coming", name: "Hampi", place: "Karnataka" },
	{ slug: "_dev", status: "dev", version: 1, name: "Dev pack", place: "Synthetic faces" },
];

export const LOCKED_LABELS = { building: "Building now", coming: "Coming" };

export const EARLY_MS = 7 * 24 * 3600 * 1000;

function opensAtMs(site) {
	const t = typeof site?.opens_at === "string" ? Date.parse(site.opens_at) : NaN;
	return Number.isFinite(t) ? t : null;
}

const lockedStatus = (site) => site.status === "building" || site.status === "coming";

function isLive(site, now) {
	if (site.status === "live") return true;
	const at = opensAtMs(site);
	return lockedStatus(site) && !!site.version && at != null && at <= now;
}

export function getSite(slug) {
	return SITES.find((s) => s.slug === slug) || null;
}

// A site the level route may load. Dev packs never resolve in production, unless the server
// was started with PLAY_DEV_PACKS=1 (a local production build under test). The dev pack is
// git-ignored, so a deployment has no such pack to serve either way.
export function getPlayableSite(slug, now = Date.now()) {
	const site = getSite(slug);
	if (!site || !site.version) return null;
	if (isLive(site, now)) return site;
	if (site.status === "dev" && (process.env.NODE_ENV !== "production" || process.env.PLAY_DEV_PACKS === "1")) return site;
	return null;
}

// A locked site with a published pack that opens within a week: playable early, by players with
// a confirmed email only (the server checks that). Null otherwise.
export function earlySite(slug, now = Date.now()) {
	const site = getSite(slug);
	if (!site || !site.version || !lockedStatus(site) || isLive(site, now)) return null;
	const at = opensAtMs(site);
	return at != null && at - now <= EARLY_MS ? site : null;
}

export function liveSites(now = Date.now()) {
	return SITES.filter((s) => isLive(s, now));
}

export function lockedSites(now = Date.now()) {
	return SITES.filter((s) => lockedStatus(s) && !isLive(s, now));
}
