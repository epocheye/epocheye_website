import { SITE_URL } from "@/lib/site";

export default function robots() {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				// /r/ is the creator QR redirect: a crawler hit would count as a creator click.
				disallow: ["/admin", "/api/", "/r/"],
			},
		],
		sitemap: `${SITE_URL}/sitemap.xml`,
	};
}
