import HomePage from "@/components/home/HomePage";
import JsonLd from "@/components/seo/JsonLd";
import { softwareApplication } from "@/lib/seo/schema";
import { ONE_LINER, SITE_NAME } from "@/lib/site";

// openGraph is replaced, not merged, when a page sets it, so repeat the layout's fields.
export const metadata = {
	alternates: { canonical: "/" },
	openGraph: {
		type: "website",
		siteName: SITE_NAME,
		url: "/",
		title: "Epocheye (Epoch Eye): monuments as the record describes them",
		description: ONE_LINER,
	},
};

export default function Home() {
	return (
		<>
			<JsonLd data={softwareApplication()} />
			<HomePage />
		</>
	);
}
