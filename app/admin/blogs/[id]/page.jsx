"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BlogPostForm from "@/components/admin/BlogPostForm";

export default function EditBlogPostPage() {
	const params = useParams();
	const id = params?.id;
	const [initial, setInitial] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			try {
				const res = await fetch(`/api/admin/blogs/${id}`);
				const json = await res.json();
				if (cancelled) return;
				if (json.success) {
					setInitial({
						title: json.data.title || "",
						slug: json.data.slug || "",
						excerpt: json.data.excerpt || "",
						cover_image_url: json.data.cover_image_url || "",
						body_markdown: json.data.body_markdown || "",
						status: json.data.status || "draft",
					});
				} else {
					setError(json.error || "Failed to load post");
				}
			} catch (err) {
				if (!cancelled) setError(err?.message || "Network error");
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		if (id) load();
		return () => {
			cancelled = true;
		};
	}, [id]);

	if (loading) {
		return <p className="px-6 py-8 text-white/40 text-sm">Loading…</p>;
	}
	if (error) {
		return (
			<div className="px-6 py-8 max-w-2xl">
				<p className="text-rose-300 text-sm">{error}</p>
			</div>
		);
	}
	return <BlogPostForm mode="edit" postId={id} initial={initial} />;
}
