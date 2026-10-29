import PreorderExperience from "@/components/preorder/PreorderExperience";
import { THEME_SCRIPT } from "@/components/preorder/themeScript";
import { SITE_NAME } from "@/lib/site";
import "./preorder.css";

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
			<PreorderExperience />
		</>
	);
}
