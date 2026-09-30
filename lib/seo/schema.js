// schema.org JSON-LD builders. Rules (docs/seo/audit-2026-09-30.md):
// - Organization: legal name only, no parent entity.
// - SoftwareApplication: no `offers`, no price, no rating. Pricing is not published.
// - Monuments: TouristAttraction + LandmarksOrHistoricalBuildings with geo.

import {
	ALTERNATE_NAME,
	LEGAL_NAME,
	LOGO_PATH,
	ONE_LINER,
	PLAY_STORE_URL,
	SITE_NAME,
	SITE_URL,
	SOCIAL_PROFILES,
} from "@/lib/site";

const ORG_ID = `${SITE_URL}/#organization`;
const APP_ID = `${SITE_URL}/#app`;

export function organization() {
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		"@id": ORG_ID,
		name: SITE_NAME,
		alternateName: ALTERNATE_NAME,
		legalName: LEGAL_NAME,
		url: SITE_URL,
		logo: `${SITE_URL}${LOGO_PATH}`,
		description: ONE_LINER,
		sameAs: [...Object.values(SOCIAL_PROFILES), PLAY_STORE_URL],
	};
}

export function softwareApplication() {
	return {
		"@context": "https://schema.org",
		"@type": "MobileApplication",
		"@id": APP_ID,
		name: SITE_NAME,
		alternateName: ALTERNATE_NAME,
		description: ONE_LINER,
		operatingSystem: "Android",
		applicationCategory: "TravelApplication",
		installUrl: PLAY_STORE_URL,
		url: PLAY_STORE_URL,
		publisher: { "@id": ORG_ID },
	};
}

export function website() {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": `${SITE_URL}/#website`,
		name: SITE_NAME,
		alternateName: ALTERNATE_NAME,
		url: SITE_URL,
		publisher: { "@id": ORG_ID },
	};
}

const REGION_CODES = { Karnataka: "IN-KA", "West Bengal": "IN-WB" };

export function monumentPlace(m) {
	const url = `${SITE_URL}/monuments/${m.slug}`;
	const sameAs = m.wikidata ? [`https://www.wikidata.org/wiki/${m.wikidata}`] : undefined;
	return {
		"@context": "https://schema.org",
		"@type": ["TouristAttraction", "LandmarksOrHistoricalBuildings"],
		"@id": `${url}#place`,
		name: m.name,
		...(m.alternateNames?.length ? { alternateName: m.alternateNames } : {}),
		description: m.seo.description,
		url,
		geo: { "@type": "GeoCoordinates", latitude: m.geo.lat, longitude: m.geo.lng },
		address: {
			"@type": "PostalAddress",
			addressLocality: m.city,
			addressRegion: REGION_CODES[m.region] ?? m.region,
			addressCountry: m.country,
		},
		...(sameAs ? { sameAs } : {}),
	};
}

export function monumentPage(m) {
	const url = `${SITE_URL}/monuments/${m.slug}`;
	return {
		"@context": "https://schema.org",
		"@type": "WebPage",
		"@id": url,
		url,
		name: m.seo.title,
		description: m.seo.description,
		dateModified: m.updated,
		inLanguage: "en",
		about: { "@id": `${url}#place` },
		publisher: { "@id": ORG_ID },
		isPartOf: { "@id": `${SITE_URL}/#website` },
	};
}

export function breadcrumbs(items) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: item.name,
			item: `${SITE_URL}${item.path}`,
		})),
	};
}

export function faqPage(faq) {
	if (!faq?.length) return null;
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: faq.map((f) => ({
			"@type": "Question",
			name: f.q,
			acceptedAnswer: { "@type": "Answer", text: f.a.text },
		})),
	};
}
