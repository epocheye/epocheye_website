import "./journeys.css";
import { journeysFont } from "./fonts";

// /journeys has its own type, tokens and chrome. The root layout still wraps it (fonts,
// analytics), but nothing from the main site's nav, footer or sections is used here.
export const metadata = {
	title: "Walk into 1791 | Epocheye Journeys",
	description:
		"Virtual walks through reconstructed Indian monuments, rebuilt from the record and narrated stop by stop. Reserve your founding spot.",
	alternates: { canonical: "/journeys" },
	// Reached by shared links only until the dates are set. Not in the sitemap.
	robots: { index: false, follow: true },
	openGraph: {
		title: "Walk into 1791 | Epocheye Journeys",
		description: "Tipu Sultan's Summer Palace, Bengaluru, as it stood in the 1790s. Narrated stop by stop. No flight required.",
		images: [{ url: "/journeys/posters/palace-pillar.webp", width: 1600, height: 1600 }],
	},
};

export const viewport = {
	width: "device-width",
	initialScale: 1,
	themeColor: "#000000",
};

export default function JourneysLayout({ children }) {
	return (
		<div className={`jr ${journeysFont.variable}`}>
			{children}
		</div>
	);
}
