import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Show, SignIn, SignUpButton, UserButton } from "@clerk/nextjs";

import CreatorBrandLink from "@/components/creators/CreatorBrandLink";

export default function CreatorLoginPage() {
	return (
		<div className="min-h-screen bg-[#0A0A0A] relative overflow-hidden font-montserrat">
			<div className="absolute inset-0 w-full h-full">
				<video
					className="absolute inset-0 w-full h-full object-cover opacity-20"
					src="/bg_vid.mp4"
					autoPlay
					loop
					muted
					playsInline
					preload="auto"
				/>
				<div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/50 to-black/80" />
			</div>

			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-white/1.5 rounded-full blur-[120px]" />
				<div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-white/1 rounded-full blur-[100px]" />
			</div>

			<nav className="relative z-50 w-full flex items-center justify-between px-6 md:px-12 py-6">
				<CreatorBrandLink href="/creators" size="md" showBadge priority />
				<Link
					href="/creators"
					className="text-white/50 hover:text-white text-sm font-medium transition-colors flex items-center gap-2">
					<ArrowRight className="w-4 h-4 rotate-180" />
					Back
				</Link>
			</nav>

			<main className="relative z-10 flex min-h-[calc(100vh-96px)] items-center justify-center px-4 pb-10">
				<div className="w-full max-w-[430px]">
					<Show when="signed-out">
						<div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-2xl p-4 sm:p-5">
							<SignIn
								path="/creators/login"
								routing="path"
								signUpUrl="/creators/signup"
								forceRedirectUrl="/creators/dashboard"
								appearance={{
									elements: {
										rootBox: "w-full",
										cardBox: "w-full",
										card: "bg-transparent shadow-none border-none",
										headerTitle: "text-white",
										headerSubtitle: "text-white/50",
										formFieldLabel: "text-white/70",
										formFieldInput:
											"bg-white/5 border-white/15 text-white placeholder:text-white/30",
										socialButtonsBlockButton:
											"bg-white/5 border-white/15 text-white hover:bg-white/10",
										formButtonPrimary:
											"bg-white text-black hover:bg-white/90",
										footerActionText: "text-white/50",
										footerActionLink:
											"text-white hover:text-white/80",
										identityPreviewText: "text-white/70",
										identityPreviewEditButton: "text-white/70",
									},
								}}
							/>
						</div>
					</Show>

					<Show when="signed-in">
						<div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-2xl p-8 text-center space-y-4">
							<div className="flex justify-center">
								<UserButton afterSignOutUrl="/creators/login" />
							</div>
							<h1 className="text-2xl font-semibold text-white">
								You are signed in
							</h1>
							<p className="text-white/50 text-sm">
								Open your dashboard to manage content, referrals, and
								payouts.
							</p>
							<Link
								href="/creators/dashboard"
								className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:border-white/50 transition-all">
								Go to Dashboard
							</Link>
						</div>
					</Show>

					<Show when="signed-out">
						<p className="text-white/40 text-sm text-center mt-5">
							New creator?{" "}
							<SignUpButton mode="modal">
								<button className="text-white font-medium hover:text-white/80 transition-colors">
									Create an account
								</button>
							</SignUpButton>
						</p>
					</Show>
				</div>
			</main>
		</div>
	);
}
