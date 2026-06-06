import Link from "next/link";
import { BGPattern } from "@/components/ui/bg-pattern";

export const metadata = {
	title: "Privacy Policy — Epocheye",
	description:
		"How Epocheye collects, uses, and protects your information.",
};

const LAST_UPDATED = "June 6, 2026";

export default function PrivacyPage() {
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
					<h1 className="font-instrument-serif text-4xl sm:text-5xl text-white">
						Privacy Policy
					</h1>
					<p className="mt-4 text-[11px] font-semibold tracking-widest uppercase text-white/40 font-instrument-sans">
						Last updated: {LAST_UPDATED}
					</p>
				</header>

				<div className="space-y-10 font-instrument-sans text-white/60 leading-relaxed">
					<section>
						<p>
							Epocheye (&ldquo;Epocheye&rdquo;, &ldquo;we&rdquo;,
							&ldquo;us&rdquo;, or &ldquo;our&rdquo;) provides an
							augmented-reality experience and related website that let
							you see historical places come to life. This Privacy Policy
							explains what information we collect, how we use it, and the
							choices you have. By using our app or website, you agree to
							the practices described here.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							1. Information we collect
						</h2>
						<ul className="space-y-3 list-disc pl-5">
							<li>
								<span className="text-white/80">Account information</span> —
								such as your name and email address when you create an
								account or join our early-access waitlist.
							</li>
							<li>
								<span className="text-white/80">Camera & AR data</span> —
								to display augmented-reality overlays, the app accesses your
								camera. Imagery is processed to power the experience and is
								not retained longer than necessary to provide it.
							</li>
							<li>
								<span className="text-white/80">Location data</span> — with
								your permission, we use your location to surface nearby
								historical sites and relevant content.
							</li>
							<li>
								<span className="text-white/80">Usage & device data</span> —
								basic analytics about how you interact with the app and
								website, along with device and log information, to keep the
								service reliable and improve it.
							</li>
						</ul>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							2. How we use your information
						</h2>
						<ul className="space-y-3 list-disc pl-5">
							<li>To provide, maintain, and improve the service.</li>
							<li>To personalize the content and experiences we show you.</li>
							<li>
								To communicate with you about updates, features, and
								support.
							</li>
							<li>
								To keep the service secure and to detect and prevent abuse.
							</li>
						</ul>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							3. Sharing &amp; disclosure
						</h2>
						<p>
							We do not sell your personal information. We may share data
							with trusted service providers who help us operate the service
							(for example, hosting, analytics, and payment processing for
							our creators program via Razorpay), and only to the extent
							needed to perform those services. We may also disclose
							information if required to comply with the law or to protect
							our rights and the safety of our users.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							4. Cookies &amp; analytics
						</h2>
						<p>
							Our website uses cookies and similar technologies to remember
							your preferences and to understand how the site is used. You
							can control cookies through your browser settings; disabling
							them may affect some features.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							5. Data retention
						</h2>
						<p>
							We keep your information only for as long as it is needed to
							provide the service and for legitimate legal or business
							purposes. When it is no longer needed, we delete or anonymize
							it.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							6. Security
						</h2>
						<p>
							We use reasonable technical and organizational safeguards to
							protect your information. No method of transmission or storage
							is completely secure, but we work to protect your data and
							continually improve our practices.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							7. Your rights
						</h2>
						<p>
							Depending on where you live, you may have the right to access,
							correct, or delete your personal information, or to object to
							certain processing. To make a request, contact us at the
							address below and we will respond in line with applicable law.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							8. Children&apos;s privacy
						</h2>
						<p>
							Epocheye is not directed to children under 13, and we do not
							knowingly collect personal information from them. If you
							believe a child has provided us with personal information,
							please contact us so we can remove it.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							9. Changes to this policy
						</h2>
						<p>
							We may update this Privacy Policy from time to time. When we
							do, we will revise the &ldquo;Last updated&rdquo; date above.
							We encourage
							you to review this page periodically.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							10. Contact us
						</h2>
						<p>
							If you have any questions about this Privacy Policy or your
							data, reach out to us at{" "}
							<a
								href="mailto:support@epocheye.app"
								className="text-white/80 underline underline-offset-4 hover:text-white transition-colors">
								support@epocheye.app
							</a>
							.
						</p>
					</section>
				</div>
			</article>
		</main>
	);
}
