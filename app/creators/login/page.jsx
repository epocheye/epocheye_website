"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ShinyText from "@/components/ShinyText";
import CreatorBrandLink from "@/components/creators/CreatorBrandLink";
import { creatorLogin, isCreatorAuthenticated } from "@/lib/creatorAuthService";

export default function CreatorLoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (isCreatorAuthenticated()) router.replace("/creators/dashboard");
	}, [router]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);
		try {
			await creatorLogin(email, password);
			router.push("/creators/dashboard");
		} catch (err) {
			setError(err.message || "Invalid email or password");
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
				<div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
			</div>

			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-white/[0.015] rounded-full blur-[120px]" />
				<div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-white/[0.01] rounded-full blur-[100px]" />
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

			{/* Form */}
			<div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] px-4 py-8">
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.2 }}
					className="w-full max-w-[420px]">
					{/* Header */}
					<div className="text-center mb-10">
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.6, delay: 0.3 }}>
							<ShinyText
								text="Creator Login"
								disabled={false}
								speed={2}
								className="text-3xl sm:text-4xl font-bold text-white leading-tight font-montserrat"
							/>
						</motion.div>
						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.6, delay: 0.5 }}
							className="text-white/40 mt-3 text-sm font-medium tracking-wide">
							Access your creator dashboard
						</motion.p>
					</div>

					{/* Card */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.4 }}
						className="relative">
						<div className="absolute -inset-px bg-gradient-to-b from-white/8 to-transparent rounded-2xl blur-sm" />
						<div className="relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl p-8 md:p-10">
							<form onSubmit={handleSubmit} className="space-y-5">
								<AnimatePresence>
									{error && (
										<motion.div
											initial={{ opacity: 0, y: -10, height: 0 }}
											animate={{
												opacity: 1,
												y: 0,
												height: "auto",
											}}
											exit={{ opacity: 0, y: -10, height: 0 }}
											className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
											<p className="text-red-400 text-xs text-center font-medium">
												{error}
											</p>
										</motion.div>
									)}
								</AnimatePresence>

								{/* Email */}
								<div className="space-y-2">
									<label
										htmlFor="email"
										className="block text-xs font-medium text-white/50 tracking-widest uppercase">
										Email
									</label>
									<div className="relative group">
										<Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-white/50 transition-colors" />
										<input
											id="email"
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											placeholder="you@example.com"
											required
											className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.05] transition-all duration-300"
										/>
									</div>
								</div>

								{/* Password */}
								<div className="space-y-2">
									<label
										htmlFor="password"
										className="block text-xs font-medium text-white/50 tracking-widest uppercase">
										Password
									</label>
									<div className="relative group">
										<Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-white/50 transition-colors" />
										<input
											id="password"
											type={showPassword ? "text" : "password"}
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder="••••••••"
											required
											className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-11 pr-11 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.05] transition-all duration-300"
										/>
										<button
											type="button"
											onClick={() =>
												setShowPassword(!showPassword)
											}
											className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
											aria-label={
												showPassword
													? "Hide password"
													: "Show password"
											}>
											{showPassword ? (
												<EyeOff className="w-4 h-4" />
											) : (
												<Eye className="w-4 h-4" />
											)}
										</button>
									</div>
								</div>

								<motion.button
									type="submit"
									disabled={isLoading}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									className="group w-full bg-white text-black font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 text-sm mt-2">
									{isLoading ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										<>
											Sign In
											<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
										</>
									)}
								</motion.button>
							</form>

							<div className="relative my-6">
								<div className="absolute inset-0 flex items-center">
									<div className="w-full border-t border-white/8" />
								</div>
								<div className="relative flex justify-center">
									<span className="px-4 bg-transparent text-white/25 text-xs uppercase tracking-wider">
										or
									</span>
								</div>
							</div>

							<p className="text-white/40 text-sm text-center">
								New creator?{" "}
								<Link
									href="/creators/signup"
									className="text-white font-medium hover:text-white/80 transition-colors">
									Create an account
								</Link>
							</p>
						</div>
					</motion.div>

					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.6, delay: 0.8 }}
						className="text-center text-white/20 text-xs mt-6">
						Part of the Epocheye Creator Program
					</motion.p>
				</motion.div>
			</div>
		</div>
	);
}
