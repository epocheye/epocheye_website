import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BGPattern } from "@/components/ui/bg-pattern";

export const metadata = {
	title: "Invest in Epocheye",
	description:
		"Epocheye is raising $500K on a SAFE to bring AR heritage experiences to 10 monuments across 5 cities.",
};

export default function InvestorsPage() {
	return (
		<main className="relative isolate min-h-screen bg-[#080808] flex flex-col items-center justify-center px-6 py-32 text-center overflow-hidden">
			<BGPattern variant="grid" mask="fade-edges" fill="rgba(255,255,255,0.07)" />
			<div className="relative z-10 flex flex-col items-center">
				<h1 className="font-instrument-serif text-4xl sm:text-5xl text-white leading-tight">
					Invest in Epocheye
				</h1>
				<p className="font-instrument-sans text-white/70 max-w-2xl mt-6 text-base sm:text-lg leading-relaxed">
					We&apos;re raising $500K on a SAFE to bring AR heritage experiences to 10 monuments across 5 cities. If you&apos;re interested in learning more, reach out directly.
				</p>
				<a
					href="mailto:sambit@epocheye.com?subject=Pitch%20Deck%20Request%20%E2%80%94%20Epocheye"
					className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold tracking-wider uppercase text-white hover:bg-white hover:text-black transition-all duration-500 font-instrument-sans">
					Request Pitch Deck
					<ArrowRight className="w-4 h-4" aria-hidden="true" />
				</a>
				<Link
					href="/"
					className="mt-12 text-white/40 hover:text-white/70 text-xs tracking-widest uppercase font-instrument-sans transition-colors">
					← Back to home
				</Link>
			</div>
		</main>
	);
}
