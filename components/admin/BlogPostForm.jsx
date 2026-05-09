"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const EMPTY = {
	title: "",
	slug: "",
	excerpt: "",
	cover_image_url: "",
	body_markdown: "",
	status: "draft",
};

function slugify(value) {
	return String(value || "")
		.toLowerCase()
		.trim()
		.replace(/['"`]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 120);
}

export default function BlogPostForm({ mode = "create", postId = null, initial = null }) {
	const router = useRouter();
	const [form, setForm] = useState(initial || EMPTY);
	const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (initial) {
			setForm(initial);
			setSlugTouched(true);
		}
	}, [initial]);

	function update(field, value) {
		setForm((prev) => {
			const next = { ...prev, [field]: value };
			if (field === "title" && !slugTouched) {
				next.slug = slugify(value);
			}
			return next;
		});
	}

	async function onSubmit(e) {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			const payload = {
				title: form.title.trim(),
				slug: form.slug.trim().toLowerCase(),
				excerpt: form.excerpt.trim() || null,
				cover_image_url: form.cover_image_url.trim() || null,
				body_markdown: form.body_markdown,
				status: form.status,
			};
			const url = mode === "edit" ? `/api/admin/blogs/${postId}` : "/api/admin/blogs";
			const method = mode === "edit" ? "PUT" : "POST";
			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const json = await res.json();
			if (!json.success) {
				setError(json.error || "Save failed");
				return;
			}
			router.push("/admin/blogs");
			router.refresh();
		} catch (err) {
			setError(err?.message || "Network error");
		} finally {
			setSubmitting(false);
		}
	}

	const previewMarkdown = useMemo(() => form.body_markdown || "_Nothing to preview._", [form.body_markdown]);

	return (
		<form onSubmit={onSubmit} className="px-6 sm:px-8 py-8 sm:py-10 max-w-6xl mx-auto">
			<div className="flex items-center justify-between mb-8">
				<div>
					<Link
						href="/admin/blogs"
						className="text-xs text-white/40 hover:text-white/70 uppercase tracking-widest">
						← All posts
					</Link>
					<h1 className="text-2xl sm:text-3xl font-semibold text-white mt-2">
						{mode === "edit" ? "Edit post" : "New post"}
					</h1>
				</div>
				<div className="flex items-center gap-2">
					<select
						value={form.status}
						onChange={(e) => update("status", e.target.value)}
						className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30">
						<option value="draft">Draft</option>
						<option value="published">Published</option>
					</select>
					<button
						type="submit"
						disabled={submitting}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-50">
						{submitting ? "Saving…" : "Save"}
					</button>
				</div>
			</div>

			{error && (
				<div className="mb-6 px-4 py-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 text-sm">
					{error}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="space-y-5">
					<div>
						<label className="block text-xs font-medium text-white/60 tracking-wide uppercase mb-2">
							Title
						</label>
						<input
							type="text"
							value={form.title}
							onChange={(e) => update("title", e.target.value)}
							required
							maxLength={200}
							className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30"
						/>
					</div>
					<div>
						<label className="block text-xs font-medium text-white/60 tracking-wide uppercase mb-2">
							Slug
						</label>
						<input
							type="text"
							value={form.slug}
							onChange={(e) => {
								setSlugTouched(true);
								update("slug", e.target.value);
							}}
							required
							maxLength={120}
							pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
							className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-white/30"
						/>
						<p className="text-[11px] text-white/30 mt-1">
							Public URL: /blog/{form.slug || "your-slug"}
						</p>
					</div>
					<div>
						<label className="block text-xs font-medium text-white/60 tracking-wide uppercase mb-2">
							Excerpt
						</label>
						<textarea
							value={form.excerpt}
							onChange={(e) => update("excerpt", e.target.value)}
							maxLength={500}
							rows={2}
							className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30"
						/>
					</div>
					<div>
						<label className="block text-xs font-medium text-white/60 tracking-wide uppercase mb-2">
							Cover image URL
						</label>
						<input
							type="url"
							value={form.cover_image_url}
							onChange={(e) => update("cover_image_url", e.target.value)}
							maxLength={1000}
							className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30"
						/>
					</div>
					<div>
						<label className="block text-xs font-medium text-white/60 tracking-wide uppercase mb-2">
							Body (Markdown)
						</label>
						<textarea
							value={form.body_markdown}
							onChange={(e) => update("body_markdown", e.target.value)}
							rows={20}
							className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-white/30"
						/>
					</div>
				</div>

				<div>
					<label className="block text-xs font-medium text-white/60 tracking-wide uppercase mb-2">
						Live preview
					</label>
					<div className="border border-white/10 rounded-lg p-6 bg-white/[0.02] min-h-[400px] prose-invert text-white/80">
						<article className="prose-invert">
							<ReactMarkdown
								remarkPlugins={[remarkGfm]}
								components={{
									h1: (props) => <h1 className="text-2xl font-semibold text-white mt-4 mb-2" {...props} />,
									h2: (props) => <h2 className="text-xl font-semibold text-white mt-4 mb-2" {...props} />,
									h3: (props) => <h3 className="text-lg font-semibold text-white mt-3 mb-2" {...props} />,
									p: (props) => <p className="text-white/75 leading-relaxed mb-3" {...props} />,
									a: (props) => <a className="text-sky-300 underline" target="_blank" rel="noreferrer" {...props} />,
									ul: (props) => <ul className="list-disc list-inside text-white/75 mb-3 space-y-1" {...props} />,
									ol: (props) => <ol className="list-decimal list-inside text-white/75 mb-3 space-y-1" {...props} />,
									code: (props) => <code className="bg-white/10 px-1 py-0.5 rounded text-xs font-mono text-white/90" {...props} />,
									pre: (props) => <pre className="bg-white/5 border border-white/10 p-3 rounded-lg overflow-x-auto text-xs my-3" {...props} />,
									blockquote: (props) => <blockquote className="border-l-2 border-white/30 pl-4 italic text-white/60 my-3" {...props} />,
								}}>
								{previewMarkdown}
							</ReactMarkdown>
						</article>
					</div>
				</div>
			</div>
		</form>
	);
}
