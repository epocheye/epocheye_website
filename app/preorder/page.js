import { Homemade_Apple, Inter, Newsreader } from "next/font/google";

import PreorderExperience from "@/components/preorder/PreorderExperience";
import { THEME_SCRIPT } from "@/components/preorder/themeScript";
import { SITE_NAME } from "@/lib/site";
import "./preorder.css";

// Light editorial serif for display and body, tiny spaced sans capitals for
// labels, and a hand for the sign-off.
const serif = Newsreader({ subsets: ["latin"], weight: ["200", "300", "400"], style: ["normal", "italic"], variable: "--font-pa-serif" });
const sans = Inter({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-pa-sans" });
const script = Homemade_Apple({ subsets: ["latin"], weight: "400", variable: "--font-pa-script" });

const TITLE = "Pre-order the next Epocheye site";
const DESCRIPTION =
	"Pick the heritage site you want to see in Epocheye next and pre-order it. The most-wanted sites get built first, and if we don't build yours, you get a full refund.";

// openGraph is replaced, not merged, when a page sets it, so repeat the layout's fields.
export const metadata = {
	title: TITLE,
	description: DESCRIPTION,
	alternates: { canonical: "/preorder" },
	openGraph: {
		type: "website",
		siteName: SITE_NAME,
		url: "/preorder",
		title: TITLE,
		description: DESCRIPTION,
	},
};

export default function Page() {
	return (
		<>
			{/* Before first paint, so the page never flashes the wrong theme. */}
			<script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
			<div className={`${serif.variable} ${sans.variable} ${script.variable}`}>
				<PreorderExperience />
			</div>
		</>
	);
}
