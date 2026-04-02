"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
	Eye,
	EyeOff,
	Mail,
	Lock,
	User,
	ArrowRight,
	Loader2,
	Instagram,
	Youtube,
	ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ShinyText from "@/components/ShinyText";
import CreatorBrandLink from "@/components/creators/CreatorBrandLink";
import { creatorSignup, isCreatorAuthenticated } from "@/lib/creatorAuthService";

const NICHES = [
	"Heritage & History",
	"Travel & Tourism",
	"Lifestyle",
	"Tech & Gadgets",
	"Culture & Art",
	"Food & Cuisine",
	"Photography",
	"Other",
];

export default function CreatorSignupPage() {
	const router = useRouter();
	const [step, setStep] = useState(1); // 1 = basic info, 2 = social + niche
	const [form, setForm] = useState({
		name: "",
		email: "",
		password: "",
		instagram_url: "",
		youtube_url: "",
		tiktok_url: "",
		twitter_url: "",
		niche: "",
	});
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (isCreatorAuthenticated()) router.replace("/creators/dashboard");
	}, [router]);

	const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

	const handleStep1 = (e) => {
		e.preventDefault();
		setError("");
		if (form.name.trim().length < 2) {
			setError("Name must be at least 2 characters");
			return;
		}
		if (form.password.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}
		setStep(2);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);
		try {
			await creatorSignup(form);
			router.push("/creators/dashboard");
		} catch (err) {
			setError(err.message || "Signup failed. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#0A0A0A] relative overflow-hidden font-montserrat">
			{/* Background */}
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

			{/* Nav */}
			<motion.nav
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				className="relative z-50 w-full flex items-center justify-between px-6 md:px-12 py-6">
				<CreatorBrandLink href="/creators" size="md" showBadge priority />
				<Link
					href="/creators"
					className="text-white/50 hover:text-white text-sm font-medium transition-colors flex items-center gap-2">
					<ArrowRight className="w-4 h-4 rotate-180" />
					Back
				</Link>
			</motion.nav>

			<div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-4 py-8">
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.2 }}
					className="w-full max-w-[460px]">
					{/* Header */}
					<div className="text-center mb-8">
						<ShinyText
							text="Join as Creator"
							disabled={false}
							speed={2}
							className="text-3xl sm:text-4xl font-bold text-white leading-tight font-montserrat"
						/>
						<p className="text-white/40 mt-3 text-sm tracking-wide">
							{step === 1
								? "Create your account"
								: "Tell us about your content"}
						</p>

						{/* Step indicator */}
						<div className="flex items-center justify-center gap-2 mt-5">
							{[1, 2].map((s) => (
								<div
									key={s}
									className={`h-0.5 w-12 rounded-full transition-all duration-300 ${
										s <= step ? "bg-white" : "bg-white/15"
									}`}
								/>
							))}
						</div>
					</div>

					{/* Card */}
					<div className="relative">
						<div className="absolute -inset-px bg-linear-to-b from-white/8 to-transparent rounded-2xl blur-sm" />
						<div className="relative bg-white/3 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 md:p-10">
							<AnimatePresence>
								{error && (
									<motion.div
										initial={{ opacity: 0, y: -10, height: 0 }}
										animate={{ opacity: 1, y: 0, height: "auto" }}
										exit={{ opacity: 0, y: -10, height: 0 }}
										className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
										<p className="text-red-400 text-xs text-center font-medium">
											{error}
										</p>
									</motion.div>
								)}
							</AnimatePresence>

							<AnimatePresence mode="wait">
								{step === 1 ? (
									<motion.form
										key="step1"
										initial={{ opacity: 0, x: 20 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: -20 }}
										transition={{ duration: 0.3 }}
										onSubmit={handleStep1}
										className="space-y-5">
										{/* Name */}
										<Field label="Full Name" htmlFor="name">
											<div className="relative group">
												<User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-white/50 transition-colors" />
												<input
													id="name"
													type="text"
													value={form.name}
													onChange={set("name")}
													placeholder="Your name"
													required
													className={inputCx}
												/>
											</div>
										</Field>

										{/* Email */}
										<Field label="Email" htmlFor="email">
											<div className="relative group">
												<Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-white/50 transition-colors" />
												<input
													id="email"
													type="email"
													value={form.email}
													onChange={set("email")}
													placeholder="you@example.com"
													required
													className={inputCx}
												/>
											</div>
										</Field>

										{/* Password */}
										<Field label="Password" htmlFor="password">
											<div className="relative group">
												<Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-white/50 transition-colors" />
												<input
													id="password"
													type={
														showPassword
															? "text"
															: "password"
													}
													value={form.password}
													onChange={set("password")}
													placeholder="Min. 8 characters"
													required
													className={`${inputCx} pr-11`}
												/>
												<button
													type="button"
													onClick={() =>
														setShowPassword(!showPassword)
													}
													className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
													aria-label="Toggle password">
													{showPassword ? (
														<EyeOff className="w-4 h-4" />
													) : (
														<Eye className="w-4 h-4" />
													)}
												</button>
											</div>
										</Field>

										<motion.button
											type="submit"
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											className="group w-full bg-white text-black font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 hover:bg-white/90 text-sm mt-2">
											Continue
											<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
										</motion.button>
									</motion.form>
								) : (
									<motion.form
										key="step2"
										initial={{ opacity: 0, x: 20 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: -20 }}
										transition={{ duration: 0.3 }}
										onSubmit={handleSubmit}
										className="space-y-5">
										<p className="text-xs text-white/30 -mt-1 mb-1">
											Optional — helps us understand your audience
										</p>

										{/* Instagram */}
										<Field label="Instagram URL" htmlFor="ig">
											<div className="relative group">
												<Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-white/50 transition-colors" />
												<input
													id="ig"
													type="url"
													value={form.instagram_url}
													onChange={set("instagram_url")}
													placeholder="https://instagram.com/yourhandle"
													className={inputCx}
												/>
											</div>
										</Field>

										{/* YouTube */}
										<Field label="YouTube URL" htmlFor="yt">
											<div className="relative group">
												<Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-white/50 transition-colors" />
												<input
													id="yt"
													type="url"
													value={form.youtube_url}
													onChange={set("youtube_url")}
													placeholder="https://youtube.com/@yourchannel"
													className={inputCx}
												/>
											</div>
										</Field>

										{/* TikTok */}
										<Field label="TikTok URL" htmlFor="tt">
											<div className="relative group">
												<span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 text-xs font-bold">
													T
												</span>
												<input
													id="tt"
													type="url"
													value={form.tiktok_url}
													onChange={set("tiktok_url")}
													placeholder="https://tiktok.com/@yourhandle"
													className={inputCx}
												/>
											</div>
										</Field>

										{/* Niche */}
										<Field label="Content Niche" htmlFor="niche">
											<div className="relative group">
												<select
													id="niche"
													value={form.niche}
													onChange={set("niche")}
													className={`${inputCx} appearance-none pr-10`}>
													<option
														value=""
														className="bg-black">
														Select a niche…
													</option>
													{NICHES.map((n) => (
														<option
															key={n}
															value={n}
															className="bg-black">
															{n}
														</option>
													))}
												</select>
												<ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
											</div>
										</Field>

										<div className="flex gap-3 mt-2">
											<button
												type="button"
												onClick={() => setStep(1)}
												className="flex-1 border border-white/15 text-white/60 font-medium py-3.5 px-4 rounded-xl text-sm hover:border-white/30 hover:text-white transition-all duration-300">
												Back
											</button>
											<motion.button
												type="submit"
												disabled={isLoading}
												whileHover={{ scale: 1.02 }}
												whileTap={{ scale: 0.98 }}
												className="group flex-2 bg-white text-black font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 hover:bg-white/90 text-sm">
												{isLoading ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													<>
														Get My Code
														<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
													</>
												)}
											</motion.button>
										</div>
									</motion.form>
								)}
							</AnimatePresence>

							<div className="relative my-5">
								<div className="absolute inset-0 flex items-center">
									<div className="w-full border-t border-white/8" />
								</div>
							</div>

							<p className="text-white/40 text-sm text-center">
								Already a creator?{" "}
								<Link
									href="/creators/login"
									className="text-white font-medium hover:text-white/80 transition-colors">
									Sign in
								</Link>
							</p>
						</div>
					</div>

					<p className="text-center text-white/20 text-xs mt-6">
						By signing up you agree to our Terms of Service
					</p>
				</motion.div>
			</div>
		</div>
	);
}

function Field({ label, htmlFor, children }) {
	return (
		<div className="space-y-2">
			<label
				htmlFor={htmlFor}
				className="block text-xs font-medium text-white/50 tracking-widest uppercase">
				{label}
			</label>
			{children}
		</div>
	);
}

const inputCx =
	"w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.05] transition-all duration-300";
