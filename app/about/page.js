/*
	DRAFT — placeholder founder story written by an assistant from public facts only
	(Sambit Singha, Founder & CEO, full-stack builder) plus a "stutter -> Epocheye"
	framing. Please review and edit the copy below to match your real story before launch.
*/
import Link from "next/link";
import { BGPattern } from "@/components/ui/bg-pattern";

export const metadata = {
	title: "About Epocheye",
	description:
		"Why I built Epocheye — a founder's story about a stutter, history, and seeing the past live.",
};

export default function AboutPage() {
	return (
		<main className="relative isolate min-h-screen bg-[#080808] overflow-hidden">
			<BGPattern variant="grid" mask="fade-edges" fill="rgba(255,255,255,0.07)" />

			<article className="relative z-10 max-w-3xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
				<Link
					href="/"
					className="text-xs text-white/40 hover:text-white/70 uppercase tracking-widest font-instrument-sans">
					← Back to home
				</Link>

				<header className="mt-8 mb-12">
					<p className="text-[11px] font-semibold tracking-widest uppercase text-white/40 font-instrument-sans mb-4">
						About
					</p>
					<h1 className="font-instrument-serif text-4xl sm:text-5xl text-white leading-tight">
						The kid who couldn&apos;t get the words out.
					</h1>
				</header>

				<div className="space-y-8 font-instrument-sans text-white/60 leading-relaxed text-base sm:text-lg">
					<p>
						Hi, I&apos;m{" "}
						<span className="text-white/85">Sambit Singha</span> — founder of
						Epocheye. Before I tell you what we&apos;re building, I want to
						tell you why.
					</p>

					<p>
						I grew up with a stutter. For a long time, speaking felt like a
						door I couldn&apos;t always open. In classrooms, the answer was in
						my head but it would catch in my throat. So I learned to listen
						instead — to watch, to notice the things other people walked past.
						When you spend years unable to say what you see, you get very good
						at seeing.
					</p>

					<p>
						History became the place I could go where no one needed me to
						hurry. A ruin doesn&apos;t interrupt you. A monument waits. I
						could stand in front of an old wall and feel the centuries stacked
						behind it — but I could never quite{" "}
						<span className="text-white/85">show</span> anyone what I felt. The
						picture in my mind was alive; the world in front of me was just
						stone.
					</p>

					<p>
						Epocheye is that picture, made shareable. It&apos;s an
						augmented-reality lens that rebuilds the past where it actually
						stood — so you can point your phone at a site and watch the
						centuries come back. No translation needed. No words caught in
						anyone&apos;s throat. You just see it.
					</p>

					<p>
						I&apos;m a full-stack engineer and product builder. I shipped at
						two startups before building the first Epocheye AR prototype from
						scratch — equal parts code, history, and stubbornness. The stutter
						never fully went away, and honestly, I stopped wanting it to. It
						taught me the thing this whole company is built on:{" "}
						<span className="text-white/85">
							the most powerful way to communicate isn&apos;t always to
							speak. Sometimes it&apos;s to let people see for themselves.
						</span>
					</p>

					<p>
						That&apos;s what we&apos;re doing — one monument, one city, one
						era at a time. Thanks for being here.
					</p>

					<p className="text-white/45">— Sambit</p>
				</div>

				<div className="mt-14 flex flex-wrap gap-4">
					<a
						href="https://play.google.com/store/apps/details?id=com.epocheye"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center rounded-full border border-white/30 px-5 py-2.5 text-xs font-semibold tracking-widest uppercase text-white/80 hover:bg-white hover:text-black transition-all duration-300 font-instrument-sans">
						Get it on Google Play
					</a>
					<a
						href="mailto:sambit@epocheye.app"
						className="inline-flex items-center rounded-full border border-white/15 px-5 py-2.5 text-xs font-semibold tracking-widest uppercase text-white/55 hover:text-white transition-all duration-300 font-instrument-sans">
						Get in touch
					</a>
				</div>
			</article>
		</main>
	);
}
