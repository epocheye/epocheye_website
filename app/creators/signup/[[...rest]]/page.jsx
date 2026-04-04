import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Show, SignInButton, SignUp, UserButton } from "@clerk/nextjs";

import CreatorBrandLink from "@/components/creators/CreatorBrandLink";

export default function CreatorSignupPage() {
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
			</div>

			<nav className="relative z-50 w-full flex items-center justify-between px-4 sm:px-6 md:px-12 py-4 sm:py-6">
				<CreatorBrandLink href="/creators" size="md" showBadge priority />
				<Link
					href="/creators"
					className="text-white/50 hover:text-white text-xs sm:text-sm font-medium transition-colors flex items-center gap-2">
					<ArrowRight className="w-4 h-4 rotate-180" />
					Back
				</Link>
			</nav>

			<main className="relative z-10 flex min-h-[calc(100vh-88px)] sm:min-h-[calc(100vh-96px)] items-start sm:items-center justify-center px-3 sm:px-4 pt-2 sm:pt-0 pb-8 sm:pb-10">
				<div className="w-full max-w-[400px] sm:max-w-[460px]">
					<Show when="signed-out">
						<div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/3 backdrop-blur-2xl p-3.5 sm:p-5">
							<SignUp
								routing="path"
								path="/creators/signup"
								signInUrl="/creators/login"
								forceRedirectUrl="/creators/dashboard"
								appearance={{
									elements: {
										rootBox: "w-full text-sm sm:text-base",
										cardBox: "w-full",
										card: "bg-transparent shadow-none border-none p-0",
										headerTitle: "text-white text-lg sm:text-xl",
										headerSubtitle:
											"text-white/50 text-xs sm:text-sm",
										formFieldLabel:
											"text-white/70 text-[11px] sm:text-xs",
										formFieldInput:
											"h-10 sm:h-11 bg-white/5 border-white/15 text-sm sm:text-base text-white placeholder:text-white/30",
										socialButtonsBlockButton:
											"h-10 sm:h-11 bg-white/5 border-white/15 text-xs sm:text-sm text-white hover:bg-white/10",
										formButtonPrimary:
											"h-10 sm:h-11 bg-white text-black text-xs sm:text-sm hover:bg-white/90",
										footerActionText:
											"text-white/50 text-xs sm:text-sm",
										footerActionLink:
											"text-white text-xs sm:text-sm hover:text-white/80",
										identityPreviewText:
											"text-white/70 text-xs sm:text-sm",
										identityPreviewEditButton:
											"text-white/70 text-xs sm:text-sm",
									},
								}}
							/>
						</div>
					</Show>

					<Show when="signed-in">
						<div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/3 backdrop-blur-2xl p-6 sm:p-8 text-center space-y-3 sm:space-y-4">
							<div className="flex justify-center">
								<UserButton afterSignOutUrl="/creators/signup" />
							</div>
							<h1 className="text-xl sm:text-2xl font-semibold text-white">
								Account ready
							</h1>
							<p className="text-white/50 text-xs sm:text-sm">
								Welcome to the Epocheye creator program. Continue to your
								dashboard.
							</p>
							<Link
								href="/creators/dashboard"
								className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 sm:px-5 py-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-white hover:border-white/50 transition-all">
								Open Dashboard
							</Link>
						</div>
					</Show>

					<Show when="signed-out">
						<p className="text-white/40 text-xs sm:text-sm text-center mt-4 sm:mt-5">
							Already a creator?{" "}
							<SignInButton mode="modal">
								<button className="text-white text-sm sm:text-base font-medium hover:text-white/80 transition-colors">
									Sign in
								</button>
							</SignInButton>
						</p>
					</Show>
				</div>
			</main>
		</div>
	);
}