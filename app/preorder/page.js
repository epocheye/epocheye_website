import PreorderPage from "@/components/preorder/PreorderPage";
import { SITE_NAME } from "@/lib/site";

const TITLE = "Pre-order Epocheye (Epoch Eye)";
const DESCRIPTION =
	"Pre-order Epocheye for the monument you are visiting and hold your place. Nothing to pay today. Live at four monuments in Bengaluru and Kolkata.";

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
	return <PreorderPage />;
}
