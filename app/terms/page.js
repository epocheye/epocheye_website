import Link from "next/link";
import { BGPattern } from "@/components/ui/bg-pattern";

export const metadata = {
	title: "Terms of Service — Epocheye",
	description:
		"The terms that govern your use of the Epocheye app, website, and creator program.",
};

const LAST_UPDATED = "June 25, 2026";

export default function TermsPage() {
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
						Terms of Service
					</h1>
					<p className="mt-4 text-[11px] font-semibold tracking-widest uppercase text-white/40 font-instrument-sans">
						Last updated: {LAST_UPDATED}
					</p>
				</header>

				<div className="space-y-10 font-instrument-sans text-white/60 leading-relaxed">
					<section>
						<p>
							Welcome to Epocheye. These Terms of Service
							(&ldquo;Terms&rdquo;) govern your access to and use of the
							Epocheye augmented-reality application, our website, and
							related services (together, the &ldquo;Service&rdquo;). By
							creating an account, joining our early-access waitlist, or
							otherwise using the Service, you agree to these Terms. If you
							do not agree, please do not use the Service.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							1. The service
						</h2>
						<p>
							Epocheye provides an augmented-reality experience that lets
							you see historical places and monuments come to life, along
							with related content and features. We are continually
							improving the Service and may add, change, or remove features
							from time to time.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							2. Eligibility &amp; accounts
						</h2>
						<ul className="space-y-3 list-disc pl-5">
							<li>
								You must be at least 13 years old (or the minimum age of
								digital consent in your country) to use the Service.
							</li>
							<li>
								You are responsible for the information you provide and for
								keeping your account credentials secure.
							</li>
							<li>
								You are responsible for all activity that occurs under your
								account. Notify us promptly of any unauthorized use.
							</li>
						</ul>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							3. Acceptable use
						</h2>
						<p className="mb-3">When using the Service, you agree not to:</p>
						<ul className="space-y-3 list-disc pl-5">
							<li>
								Break the law, infringe others&apos; rights, or use the
								Service for any harmful or abusive purpose.
							</li>
							<li>
								Reverse engineer, disrupt, or attempt to gain unauthorized
								access to the Service or its systems.
							</li>
							<li>
								Upload content that is unlawful, misleading, or that you do
								not have the right to share.
							</li>
							<li>
								Use the Service in a way that could damage, disable, or
								impair it for others.
							</li>
						</ul>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							4. Creators Program
						</h2>
						<p>
							If you participate in the Epocheye Creators Program, additional
							rules apply. You are responsible for the content you publish and
							for complying with applicable disclosure and advertising laws.
							Promo codes, referrals, conversions, and payouts are tracked in
							your creator dashboard and are subject to verification.
							Fraudulent activity may result in withheld payouts and
							termination from the program. Payouts are processed through our
							third-party payment providers and may be subject to minimum
							thresholds and processing times.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							5. Intellectual property
						</h2>
						<p>
							The Service, including its software, design, text, graphics,
							and reconstructions, is owned by Epocheye or its licensors and
							is protected by intellectual-property laws. We grant you a
							limited, non-exclusive, non-transferable, revocable license to
							use the Service for personal, non-commercial purposes in
							accordance with these Terms. You may not copy, modify,
							distribute, or create derivative works without our permission.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							6. Your content
						</h2>
						<p>
							You retain ownership of content you submit to the Service. By
							submitting content, you grant Epocheye a worldwide,
							royalty-free license to host, store, reproduce, and display
							that content as needed to operate and promote the Service. You
							represent that you have the rights necessary to grant this
							license.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							7. Third-party services
						</h2>
						<p>
							The Service may rely on or link to third-party services (for
							example, app stores, hosting, analytics, and payment
							providers). We are not responsible for third-party services,
							and your use of them is governed by their own terms.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							8. Disclaimers
						</h2>
						<p>
							The Service is provided &ldquo;as is&rdquo; and &ldquo;as
							available&rdquo; without warranties of any kind, whether
							express or implied. Historical reconstructions are
							interpretations and may not be precisely accurate. We do not
							warrant that the Service will be uninterrupted, error-free, or
							secure.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							9. Limitation of liability
						</h2>
						<p>
							To the maximum extent permitted by law, Epocheye and its
							affiliates will not be liable for any indirect, incidental,
							special, consequential, or punitive damages, or for any loss of
							data, profits, or goodwill, arising from your use of the
							Service.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							10. Termination
						</h2>
						<p>
							You may stop using the Service at any time. We may suspend or
							terminate your access if you violate these Terms or if we
							discontinue the Service. Provisions that by their nature should
							survive termination will continue to apply.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							11. Changes to these terms
						</h2>
						<p>
							We may update these Terms from time to time. When we do, we
							will revise the &ldquo;Last updated&rdquo; date above. Your
							continued use of the Service after changes take effect
							constitutes acceptance of the updated Terms.
						</p>
					</section>

					<section>
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							12. Contact us
						</h2>
						<p>
							Questions about these Terms? Reach us at{" "}
							<a
								href="mailto:support@epocheye.app"
								className="text-white/80 underline underline-offset-4 hover:text-white transition-colors">
								support@epocheye.app
							</a>
							. See also our{" "}
							<Link
								href="/privacy"
								className="text-white/80 underline underline-offset-4 hover:text-white transition-colors">
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
