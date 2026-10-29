import PreorderClient from "@/components/preorder/PreorderClient";
import { PREORDER_SITES } from "@/lib/preorder/sites";
import { PLAY_STORE_URL, SITE_NAME } from "@/lib/site";
import { rajdhani, shareTechMono } from "./fonts";

const TITLE = "Pre-order the next Epocheye site";
const DESCRIPTION =
	"Pick the heritage site you want to see in Epocheye next and pre-order it. Nothing to pay. The most-wanted sites get built first.";

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
			{/* Text version of the 3D page, for crawlers and screen readers. */}
			<div className="sr-only">
				<h1>Pre-order the next Epocheye site</h1>
				<p>{DESCRIPTION}</p>
				<h2>Sites you can pre-order</h2>
				<ul>
					{PREORDER_SITES.map((s) => (
						<li key={s.slug}>
							{s.name}, {s.place}
						</li>
					))}
				</ul>
				<p>
					Epocheye is live today at four monuments in Bengaluru and Kolkata.{" "}
					<a href={PLAY_STORE_URL}>Get Epocheye on Google Play</a>.
				</p>
			</div>
			<div className={`${rajdhani.variable} ${shareTechMono.variable}`}>
				<PreorderClient />
			</div>
		</>
	);
}
