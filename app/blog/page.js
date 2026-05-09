import Link from "next/link";
import Image from "next/image";
import { BGPattern } from "@/components/ui/bg-pattern";
import { listPublishedPosts } from "@/lib/server/blogRepository";

export const metadata = {
	title: "Blog — Epocheye",
	description: "Notes, updates, and stories from the Epocheye team.",
};

export const revalidate = 60;

function formatDate(value) {
	if (!value) return "";
	try {
		return new Date(value).toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	} catch {
		return "";
	}
}

export default async function BlogPage() {
	let posts = [];
	try {
		const result = await listPublishedPosts({ limit: 50, offset: 0 });
		posts = result.entries || [];
	} catch {
		posts = [];
	}

	return (
		<main className="relative isolate min-h-screen bg-[#080808] overflow-hidden">
			<BGPattern variant="grid" mask="fade-edges" fill="rgba(255,255,255,0.07)" />
			<div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 lg:px-20 py-24 sm:py-32">
				<div className="text-center mb-16">
					<span className="inline-block px-3 py-1 text-xs font-medium tracking-widest text-white/60 border border-white/20 rounded-full uppercase mb-6 font-instrument-sans">
						Journal
					</span>
					<h1 className="font-instrument-serif text-4xl sm:text-5xl lg:text-6xl text-white leading-tight">
						The Blog
					</h1>
					<p className="font-instrument-sans text-white/60 mt-4 max-w-xl mx-auto">
						Notes, updates, and field reports from building Epocheye.
					</p>
				</div>

				{posts.length === 0 ? (
					<p className="text-center text-white/40 font-instrument-sans">
						No posts yet — check back soon.
					</p>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
						{posts.map((post) => (
							<Link
								key={post.id}
								href={`/blog/${post.slug}`}
								className="group bg-black/45 border border-white/12 rounded-2xl overflow-hidden backdrop-blur-[2px] hover:border-white/30 transition-all duration-300 flex flex-col">
								{post.cover_image_url ? (
									<div className="relative aspect-[16/9] w-full overflow-hidden bg-white/5">
										<Image
											src={post.cover_image_url}
											alt={post.title}
											fill
											sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
											className="object-cover transition-transform duration-700 group-hover:scale-105"
											unoptimized
										/>
									</div>
								) : (
									<div className="aspect-[16/9] w-full bg-white/5" />
								)}
								<div className="p-6 flex flex-col flex-1">
									<p className="text-[11px] font-semibold tracking-widest uppercase text-white/40 font-instrument-sans mb-2">
										{formatDate(post.published_at)}
									</p>
									<h2 className="font-instrument-serif text-xl text-white leading-snug mb-3">
										{post.title}
									</h2>
									{post.excerpt ? (
										<p className="text-white/60 text-sm leading-relaxed font-instrument-sans flex-1">
											{post.excerpt}
										</p>
									) : null}
									<span className="mt-4 text-xs text-white/40 group-hover:text-white transition-colors font-instrument-sans">
										Read post →
									</span>
								</div>
							</Link>
						))}
					</div>
				)}

				<div className="mt-20 text-center">
					<Link
						href="/"
						className="inline-flex items-center rounded-full border border-white/30 px-5 py-2.5 text-xs font-semibold tracking-widest uppercase text-white/70 hover:bg-white hover:text-black transition-all duration-500 font-instrument-sans">
						← Back to home
					</Link>
				</div>
			</div>
		</main>
	);
}
