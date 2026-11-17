// Link-preview tags for Play pages (Open Graph and X). A page's own openGraph and twitter blocks
// replace the site's, so each Play page gives all of them here. og:url is made absolute from the
// root layout's metadataBase; the picture comes from app/play/opengraph-image.js (or the card's own).
// Copy rules for these tags (brief 5.6, Phase 5): no em or en dashes, no prices, no counts.

const NO_INDEX = { index: false, follow: false }; // until launch

// A page's own openGraph block drops the pictures it would inherit, so the Play picture
// (app/play/opengraph-image.js) is named here. A card passes picture: false: its own file wins.
const PICTURE = { width: 1200, height: 630, alt: "Epocheye Play: rebuild a lost monument from its evidence" };

export function playMeta({ title, description, path, type = "website", picture = true }) {
	const og = { title, description, url: path, siteName: "Epocheye", type };
	const x = { card: "summary_large_image", site: "@epocheyeinc", title, description };
	if (picture) {
		og.images = [{ url: "/play/opengraph-image", type: "image/png", ...PICTURE }];
		x.images = [{ url: "/play/twitter-image", ...PICTURE }];
	}
	return { title, description, robots: NO_INDEX, alternates: { canonical: path }, openGraph: og, twitter: x };
}

export const PLAY_LINE = "A history game. Rebuild a lost monument from its evidence.";
