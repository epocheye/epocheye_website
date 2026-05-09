import Link from "next/link";
import { BGPattern } from "@/components/ui/bg-pattern";

export const metadata = {
	title: "About Epocheye",
	description: "About Epocheye — Historical Intelligence for the Physical World.",
};

export default function AboutPage() {
	return (
		<main className="relative isolate min-h-screen bg-[#080808] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
			<BGPattern variant="grid" mask="fade-edges" fill="rgba(255,255,255,0.07)" />
			<div className="relative z-10 flex flex-col items-center">
				<h1 className="font-instrument-serif text-4xl sm:text-5xl text-white">
					About Epocheye
				</h1>
				<p className="text-white/60 mt-4 font-instrument-sans">Coming soon.</p>
				<Link
					href="/"
					className="mt-10 inline-flex items-center rounded-full border border-white/30 px-5 py-2.5 text-xs font-semibold tracking-widest uppercase text-white/70 hover:bg-white hover:text-black transition-all duration-500 font-instrument-sans">
					← Back to home
				</Link>
			</div>
		</main>
	);
}
