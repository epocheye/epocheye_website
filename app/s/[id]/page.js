import ShareRedirect from "./ShareRedirect";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

// Fetch the share metadata the app backend minted for this id. Cached briefly so
// repeated opens of a popular link don't re-hit the backend.
async function fetchMeta(id) {
	if (!API_BASE) return null;
	try {
		const res = await fetch(
			`${API_BASE}/api/v1/share/${encodeURIComponent(id)}`,
			{ next: { revalidate: 300 } },
		);
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}

export async function generateMetadata({ params }) {
	const { id } = await params;
	const meta = await fetchMeta(id);
	const title = meta?.title || "A discovery on Epocheye";
	const description = "Open in Epocheye — walk where they walked.";
	const images = meta?.image_url ? [meta.image_url] : [];
	return {
		title,
		description,
		openGraph: { title, description, images, type: "website" },
		twitter: {
			card: images.length ? "summary_large_image" : "summary",
			title,
			description,
			images,
		},
	};
}

export default async function SharePage({ params }) {
	const { id } = await params;
	const meta = await fetchMeta(id);
	const deepLink = meta?.deep_link || "epocheye://";

	return (
		<ShareRedirect
			deepLink={deepLink}
			title={meta?.title}
			image={meta?.image_url}
		/>
	);
}
