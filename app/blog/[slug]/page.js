import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { BGPattern } from "@/components/ui/bg-pattern";
import { getPublishedPostBySlug } from "@/lib/server/blogRepository";

export const revalidate = 60;

export async function generateMetadata({ params }) {
	const { slug } = await params;
	const post = await getPublishedPostBySlug(slug).catch(() => null);
	if (!post) {
		return { title: "Post not found — Epocheye" };
	}
	return {
		title: `${post.title} — Epocheye`,
		description: post.excerpt || undefined,
		openGraph: {
			title: post.title,
			description: post.excerpt || undefined,
			images: post.cover_image_url ? [{ url: post.cover_image_url }] : undefined,
		},
	};
}

function formatDate(value) {
	if (!value) return "";
	try {
		return new Date(value).toLocaleDateString(undefined, {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	} catch {
		return "";
	}
}

export default async function BlogPostPage({ params }) {
	const { slug } = await params;
	const post = await getPublishedPostBySlug(slug).catch(() => null);
	if (!post) notFound();

	return (
		<main className="relative isolate min-h-screen bg-[#080808] overflow-hidden">
			<BGPattern variant="grid" mask="fade-edges" fill="rgba(255,255,255,0.07)" />
			<article className="relative z-10 max-w-3xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
				<Link
					href="/blog"
					className="text-xs text-white/40 hover:text-white/70 uppercase tracking-widest font-instrument-sans">
					← All posts
				</Link>

				<header className="mt-8 mb-10">
					<p className="text-[11px] font-semibold tracking-widest uppercase text-white/40 font-instrument-sans mb-4">
						{formatDate(post.published_at)}
					</p>
					<h1 className="font-instrument-serif text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">
						{post.title}
					</h1>
					{post.excerpt ? (
						<p className="font-instrument-sans text-white/60 mt-4 text-base sm:text-lg leading-relaxed">
							{post.excerpt}
						</p>
					) : null}
				</header>

				{post.cover_image_url ? (
					<div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/12 mb-10">
						<Image
							src={post.cover_image_url}
							alt={post.title}
							fill
							sizes="(max-width: 768px) 100vw, 768px"
							className="object-cover"
							priority
							unoptimized
						/>
					</div>
				) : null}

				<div className="font-instrument-sans text-white/80 leading-relaxed">
					<ReactMarkdown
						remarkPlugins={[remarkGfm]}
						components={{
							h1: (props) => (
								<h2 className="font-instrument-serif text-2xl sm:text-3xl text-white mt-10 mb-4" {...props} />
							),
							h2: (props) => (
								<h2 className="font-instrument-serif text-2xl text-white mt-10 mb-4" {...props} />
							),
							h3: (props) => (
								<h3 className="font-instrument-serif text-xl text-white mt-8 mb-3" {...props} />
							),
							p: (props) => <p className="text-white/75 leading-relaxed mb-5" {...props} />,
							a: (props) => (
								<a className="text-white underline decoration-white/40 hover:decoration-white" target="_blank" rel="noreferrer" {...props} />
							),
							ul: (props) => <ul className="list-disc pl-6 text-white/75 mb-5 space-y-2" {...props} />,
							ol: (props) => <ol className="list-decimal pl-6 text-white/75 mb-5 space-y-2" {...props} />,
							li: (props) => <li className="leading-relaxed" {...props} />,
							code: (props) => (
								<code className="bg-white/10 px-1.5 py-0.5 rounded text-[0.85em] font-mono text-white/90" {...props} />
							),
							pre: (props) => (
								<pre className="bg-white/5 border border-white/10 p-4 rounded-xl overflow-x-auto text-sm my-6" {...props} />
							),
							blockquote: (props) => (
								<blockquote className="border-l-2 border-white/30 pl-5 italic text-white/60 my-6" {...props} />
							),
							hr: () => <hr className="border-white/10 my-10" />,
							img: ({ alt, src }) => (
								/* eslint-disable-next-line @next/next/no-img-element */
								<img alt={alt || ""} src={src} className="rounded-xl my-6 w-full" />
							),
						}}>
						{post.body_markdown || ""}
					</ReactMarkdown>
				</div>

				<div className="mt-16 pt-8 border-t border-white/10 text-center">
					<Link
						href="/blog"
						className="inline-flex items-center rounded-full border border-white/30 px-5 py-2.5 text-xs font-semibold tracking-widest uppercase text-white/70 hover:bg-white hover:text-black transition-all duration-500 font-instrument-sans">
						← All posts
					</Link>
				</div>
			</article>
		</main>
	);
}
