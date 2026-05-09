"use client";

import { useEffect, useState, startTransition } from "react";
import Link from "next/link";

const TABS = [
	{ value: "all", label: "All" },
	{ value: "draft", label: "Drafts" },
	{ value: "published", label: "Published" },
];

const STATUS_BADGE = {
	published: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
	draft: "text-amber-300 border-amber-500/40 bg-amber-500/10",
};

function formatDate(value) {
	if (!value) return "—";
	try {
		return new Date(value).toLocaleString();
	} catch {
		return String(value);
	}
}

export default function AdminBlogsPage() {
	const [posts, setPosts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [status, setStatus] = useState("all");
	const [error, setError] = useState(null);
	const [deletingId, setDeletingId] = useState(null);

	useEffect(() => {
		let cancelled = false;
		startTransition(() => setLoading(true));
		setError(null);
		fetch(`/api/admin/blogs?status=${status}&limit=100`)
			.then((res) => res.json())
			.then((json) => {
				if (cancelled) return;
				if (json.success) {
					startTransition(() => setPosts(json.data?.entries || []));
				} else {
					setError(json.error || "Failed to load posts");
				}
			})
			.catch((err) => {
				if (!cancelled) setError(err?.message || "Network error");
			})
			.finally(() => {
				if (!cancelled) startTransition(() => setLoading(false));
			});
		return () => {
			cancelled = true;
		};
	}, [status]);

	async function handleDelete(id) {
		if (!confirm("Delete this post? This cannot be undone.")) return;
		setDeletingId(id);
		try {
			const res = await fetch(`/api/admin/blogs/${id}`, { method: "DELETE" });
			const json = await res.json();
			if (json.success) {
				setPosts((prev) => prev.filter((p) => p.id !== id));
			} else {
				alert(json.error || "Failed to delete");
			}
		} catch (err) {
			alert(err?.message || "Network error");
		} finally {
			setDeletingId(null);
		}
	}

	return (
		<div className="px-6 sm:px-8 py-8 sm:py-10 max-w-6xl mx-auto">
			<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
				<div>
					<p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-1">
						Content
					</p>
					<h1 className="text-2xl sm:text-3xl font-semibold text-white">
						Blog posts
					</h1>
					<p className="text-sm text-white/40 mt-1">
						Author and publish marketing blog content.
					</p>
				</div>
				<Link
					href="/admin/blogs/new"
					className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors">
					New post
				</Link>
			</div>

			<div className="flex gap-2 mb-6">
				{TABS.map((tab) => (
					<button
						key={tab.value}
						type="button"
						onClick={() => setStatus(tab.value)}
						className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
							status === tab.value
								? "bg-white/10 text-white"
								: "text-white/40 hover:text-white/70 hover:bg-white/5"
						}`}>
						{tab.label}
					</button>
				))}
			</div>

			{error && (
				<div className="mb-4 px-4 py-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 text-sm">
					{error}
				</div>
			)}

			{loading ? (
				<p className="text-white/40 text-sm">Loading…</p>
			) : posts.length === 0 ? (
				<p className="text-white/40 text-sm">No posts yet.</p>
			) : (
				<div className="border border-white/5 rounded-xl overflow-hidden">
					<div className="grid grid-cols-[1fr_120px_180px_140px] gap-4 px-4 py-3 text-[11px] font-semibold tracking-widest uppercase text-white/40 border-b border-white/5 bg-white/[0.02]">
						<span>Title</span>
						<span>Status</span>
						<span>Updated</span>
						<span className="text-right">Actions</span>
					</div>
					<ul>
						{posts.map((post) => (
							<li
								key={post.id}
								className="grid grid-cols-[1fr_120px_180px_140px] gap-4 px-4 py-4 items-center border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors">
								<div className="min-w-0">
									<p className="text-sm font-medium text-white truncate">
										{post.title}
									</p>
									<p className="text-xs text-white/40 truncate">
										/{post.slug}
									</p>
								</div>
								<span
									className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${
										STATUS_BADGE[post.status] || "text-white/50 border-white/20"
									}`}>
									{post.status}
								</span>
								<span className="text-xs text-white/50">
									{formatDate(post.updated_at)}
								</span>
								<div className="flex justify-end gap-2">
									<Link
										href={`/admin/blogs/${post.id}`}
										className="px-3 py-1.5 rounded-lg text-xs text-white/70 hover:text-white border border-white/10 hover:border-white/30 transition-colors">
										Edit
									</Link>
									<button
										type="button"
										onClick={() => handleDelete(post.id)}
										disabled={deletingId === post.id}
										className="px-3 py-1.5 rounded-lg text-xs text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/50 transition-colors disabled:opacity-50">
										{deletingId === post.id ? "…" : "Delete"}
									</button>
								</div>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
