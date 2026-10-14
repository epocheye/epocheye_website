import Link from "next/link";
import { BGPattern } from "@/components/ui/bg-pattern";

// DRAFT FOR REVIEW. Written for the /virtual walk (Phase 2 checkout). Not linked from the
// main site; only the /virtual footer links here. Keep noindex until a reviewer signs off,
// then remove the draft banner and the robots rule together.
// No price on this page: the price appears on /virtual only.

export const metadata = {
	alternates: { canonical: "/refunds" },
	title: "Refund Policy (Draft) | Epocheye",
	description: "How refunds work for the Epocheye virtual walk.",
	robots: { index: false, follow: true },
};

const LAST_UPDATED = "Draft, not yet in force";

export default function RefundsPage() {
	return (
		<main className="relative isolate min-h-screen bg-[#080808] overflow-hidden">
			<BGPattern variant="grid" mask="fade-edges" fill="rgba(255,255,255,0.07)" />

			<div className="relative z-20 w-full border-b border-amber-300/30 bg-amber-300/10 px-6 py-3 text-center font-instrument-sans text-xs font-semibold uppercase tracking-widest text-amber-200">
				DRAFT FOR REVIEW. This policy is not yet in force.
			</div>

			<article className="relative z-10 max-w-3xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
				<header className="mb-12">
					<h1 className="font-instrument-serif text-4xl sm:text-5xl text-white">Refund Policy</h1>
					<p className="mt-4 text-[11px] font-semibold tracking-widest uppercase text-white/40 font-instrument-sans">
						{LAST_UPDATED}
					</p>
				</header>

				<div className="space-y-10 font-instrument-sans text-white/60 leading-relaxed">
					<section>
						<p>
							This policy covers purchases of the Epocheye virtual walk through Tipu Sultan&rsquo;s
							Summer Palace, sold by Epocheye Private Limited, Bengaluru, India.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">1. Full refund within 14 days</h2>
						<p>
							If the walk is not for you, ask for a refund within 14 days of your purchase and we will
							refund the full amount you paid. You do not need to give a reason.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">2. How to ask</h2>
						<p>
							Email{" "}
							<a
								href="mailto:support@epocheye.app"
								className="text-white/80 underline underline-offset-4 hover:text-white transition-colors">
								support@epocheye.app
							</a>{" "}
							from the address you used to pay, with your order or receipt number.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">3. How you are refunded</h2>
						<p>
							Refunds go back to the original payment method through our payment provider. Your bank or
							card issuer decides how long it takes to appear. Once a refund is made, access to the walk
							ends.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">4. Your legal rights</h2>
						<p>
							Nothing in this policy limits any right you have under the consumer law where you live.
						</p>
					</section>

					<section>
						<p>
							See also our{" "}
							<Link href="/terms" className="text-white/80 underline underline-offset-4 hover:text-white">
								Terms
							</Link>{" "}
							and{" "}
							<Link href="/privacy" className="text-white/80 underline underline-offset-4 hover:text-white">
								Privacy Policy
							</Link>
							.
						</p>
					</section>
				</div>
			</article>
		</main>
	);
}
