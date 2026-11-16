// Registry of Play sites. Adding a site is one entry here plus a published pack
// at public/play/packs/<slug>/v<version>/. No engine or component change.
//
// status:
//   "live"      a published pack, shown as a playable card on /play
//   "building"  locked card, "Building now"
//   "coming"    locked card, "Coming"
//   "dev"       a throwaway development pack, reachable by URL outside production only

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

export function getSite(slug) {
	return SITES.find((s) => s.slug === slug) || null;
}

// A site the level route may load. Dev packs never resolve in production.
export function getPlayableSite(slug) {
	const site = getSite(slug);
	if (!site || !site.version) return null;
	if (site.status === "live") return site;
	if (site.status === "dev" && process.env.NODE_ENV !== "production") return site;
	return null;
}

export function liveSites() {
	return SITES.filter((s) => s.status === "live");
}

export function lockedSites() {
	return SITES.filter((s) => s.status === "building" || s.status === "coming");
}
