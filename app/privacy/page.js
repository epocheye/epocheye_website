import Link from "next/link";
import { BGPattern } from "@/components/ui/bg-pattern";

export const metadata = {
	alternates: { canonical: "/privacy" },
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
							You can also{" "}
							<Link
								href="/delete-account"
								className="text-white/80 underline underline-offset-4 hover:text-white transition-colors">
								request deletion of your account
							</Link>{" "}
							at any time.
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

					{/*
					  [SAMBIT: legal review before launch] Epocheye Play section, written from the code on
					  2026-11-17: db/015_play.sql, db/016_play_email_votes.sql, lib/server/play/*,
					  lib/play/player.js, lib/play/api.js and app/api/play/*. If the code changes what Play
					  stores or sends, change this section with it. /play/privacy summarises it.
					*/}
					<section id="play" className="scroll-mt-24">
						<h2 className="font-instrument-serif text-2xl text-white mb-4">
							11. Epocheye Play
						</h2>
						<p>
							Epocheye Play is a free history game at{" "}
							<Link
								href="/play"
								className="text-white/80 underline underline-offset-4 hover:text-white transition-colors">
								/play
							</Link>
							. You can play it without an account and without giving your
							name. This section says what Play keeps, and why.
						</p>

						<h3 className="font-instrument-serif text-xl text-white mt-8 mb-3">
							What Play stores
						</h3>
						<ul className="space-y-3 list-disc pl-5">
							<li>
								<span className="text-white/80">A random id.</span> Your browser
								makes it and keeps it in its local storage. It is not linked to
								your name. Play sets no cookies.
							</li>
							<li>
								<span className="text-white/80">A display name.</span> Each id
								gets a made-up name from a fixed list. You cannot type your own.
								Leaderboards show only that name.
							</li>
							<li>
								<span className="text-white/80">Your progress.</span> Your place
								in each level stays in your browser. Our server keeps the chapters
								you finish, the first answer you pick at each choice, how long the
								level took, the lens you chose and your year vote.
							</li>
							<li>
								<span className="text-white/80">The daily puzzle and votes.</span>{" "}
								Your daily answers and their times, and your weekly vote for the
								next site.
							</li>
							<li>
								<span className="text-white/80">Where you came from.</span> The
								creator code from the link you followed, and the site or tag that
								sent you. Your browser holds them for the open tab only, and sends
								them with your game records.
							</li>
							<li>
								<span className="text-white/80">Your email, only if you give it.</span>{" "}
								With the time you gave consent. See &ldquo;Email&rdquo; below.
							</li>
						</ul>

						<h3 className="font-instrument-serif text-xl text-white mt-8 mb-3">
							What Play does not store
						</h3>
						<ul className="space-y-3 list-disc pl-5">
							<li>
								No IP address and no browser or device details in Play&apos;s
								records. Our server holds your IP address in memory for a short
								time, to limit how many requests it takes from one connection. It
								is not saved.
							</li>
							<li>No free-text names and no chat. There is nowhere in Play to type a message.</li>
							<li>
								A shared card holds the site, your lens, your choices and your
								year vote. It does not hold your id or your name.
							</li>
						</ul>

						<h3 className="font-instrument-serif text-xl text-white mt-8 mb-3">
							Analytics
						</h3>
						<ul className="space-y-3 list-disc pl-5">
							<li>
								Play counts what happens in the game, without cookies: a level
								started, a chapter started and finished, a choice, the proof
								switch, a share, an email given, a tap on a button to the app.
								Each event carries your random id, the page, the time, where you
								came from and the creator code.
							</li>
							<li>
								If your browser sends Do Not Track or Global Privacy Control, Play
								sends no events and does not record your progress through a level.
								Our server also ignores the creator code and the source from that
								browser.
							</li>
							<li>
								What you choose to send still counts with those signals on: daily
								answers, votes, a shared card, and an email if you give one.
							</li>
							<li>
								The website also counts page views with Vercel Web Analytics,
								which does not use cookies.
							</li>
						</ul>

						<h3 className="font-instrument-serif text-xl text-white mt-8 mb-3">
							Email
						</h3>
						<ul className="space-y-3 list-disc pl-5">
							<li>
								Play asks for an email for three things only: so your vote for the
								next site counts, to let you play a new site a week early, and to
								move your Play name, votes and daily streak to another device.
							</li>
							<li>
								We keep it only if you tick the consent box. The box starts
								unticked. We keep the address and the time you gave consent.
							</li>
							<li>
								We send you an email with a link. Your address is confirmed only
								when you open the link and tap Confirm. A request nobody confirms
								stops working after 14 days, and is then deleted.
							</li>
							<li>
								Every Play email has a link to stop all Play emails. On that page
								you can also tick a box to delete your address.
							</li>
							<li>
								After you stop Play emails, we keep a short one-way code made from
								the address, not the address itself, so that we never email it
								again. We also keep a log of when each Play email was sent, under
								the same code.
							</li>
						</ul>

						<h3 className="font-instrument-serif text-xl text-white mt-8 mb-3">
							Creator codes
						</h3>
						<p>
							A Play link can carry a creator&apos;s code. We keep the code only if
							it is an active creator code. It is stored with your random id, your
							runs and your events, so the creator who brought you is credited. The
							first code you arrive with is the one we keep.
						</p>

						<h3 className="font-instrument-serif text-xl text-white mt-8 mb-3">
							Where it is kept, and for how long
						</h3>
						<ul className="space-y-3 list-disc pl-5">
							<li>
								Play&apos;s records are kept in our Neon Postgres database. Play
								emails are sent through Resend.
							</li>
							<li>
								We keep Play data for [SAMBIT: retention period for Play data]. An
								email request nobody confirms is deleted after 14 days.
							</li>
						</ul>

						<h3 className="font-instrument-serif text-xl text-white mt-8 mb-3">
							Deleting your Play data
						</h3>
						<ul className="space-y-3 list-disc pl-5">
							<li>
								To remove the random id from your device, clear this site&apos;s
								data in your browser. Your place in each level goes with it.
							</li>
							<li>To delete your email, use the link at the foot of any Play email.</li>
							<li>
								To ask us to delete your Play records, email{" "}
								<a
									href="mailto:support@epocheye.app"
									className="text-white/80 underline underline-offset-4 hover:text-white transition-colors">
									support@epocheye.app
								</a>
								. If you gave an email, write from that address so we can find your
								records. Without an email we cannot tell which records are yours.
							</li>
						</ul>
					</section>
				</div>
			</article>
		</main>
	);
}
