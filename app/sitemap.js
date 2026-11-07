import { MONUMENTS } from "@/lib/monuments";
import { EPISODES } from "@/lib/whats-gone";
import { listPublishedPosts } from "@/lib/server/blogRepository";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

// Only pages with real content. The "coming soon" stubs and private routes stay out.
const STATIC_PATHS = ["/", "/monuments", "/about", "/blog", "/investors", "/download", "/privacy", "/terms"];

export default async function sitemap() {
	const posts = await listPublishedPosts({ limit: 500 })
		.then((r) => r.entries)
		.catch(() => []);

	return [
		...STATIC_PATHS.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}` })),
		...MONUMENTS.map((m) => ({ url: `${SITE_URL}/monuments/${m.slug}`, lastModified: m.updated })),
		...EPISODES.map((e) => ({ url: `${SITE_URL}/whats-gone/${e.slug}`, lastModified: e.updated })),
		...posts.map((p) => ({
			url: `${SITE_URL}/blog/${p.slug}`,
			...(p.published_at ? { lastModified: new Date(p.published_at).toISOString() } : {}),
		})),
	];
}
