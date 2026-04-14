"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Loader2, CheckCircle } from "lucide-react";
import { creatorFetch } from "@/lib/creatorApi";

const PLATFORMS = [
	{ value: "instagram", label: "Instagram" },
	{ value: "youtube", label: "YouTube" },
	{ value: "tiktok", label: "TikTok" },
	{ value: "twitter", label: "Twitter / X" },
	{ value: "blog", label: "Blog / Article" },
	{ value: "other", label: "Other" },
];

export default function ContentSubmissionForm({ onClose, onSuccess }) {
	const [form, setForm] = useState({ content_url: "", platform: "", title: "" });
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [done, setDone] = useState(false);

	const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);
		try {
			const res = await creatorFetch("/api/creator/content", {
				method: "POST",
				body: JSON.stringify(form),
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.error || "Submission failed");
			setDone(true);
			setTimeout(() => {
				onSuccess?.(json.data);
				onClose?.();
			}, 1200);
		} catch (err) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
			onClick={(e) => e.target === e.currentTarget && onClose?.()}>
			<motion.div
				initial={{ opacity: 0, scale: 0.95, y: 20 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				exit={{ opacity: 0, scale: 0.95, y: 20 }}
				transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
				className="w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-2xl p-8 relative">
				<button
					onClick={onClose}
					className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors"
					aria-label="Close">
					<X className="w-5 h-5" />
				</button>

				{done ? (
					<div className="flex flex-col items-center justify-center py-8 gap-4">
						<CheckCircle className="w-10 h-10 text-green-400" />
						<p className="text-white font-medium">Content submitted!</p>
						<p className="text-white/40 text-sm text-center">
							We&apos;ll review it shortly. Keep creating.
						</p>
					</div>
				) : (
					<>
						<h2 className="text-lg font-semibold text-white mb-6">
							Submit Content
						</h2>

						<form onSubmit={handleSubmit} className="space-y-5">
							<AnimatePresence>
								{error && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: "auto" }}
										exit={{ opacity: 0, height: 0 }}
										className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
										<p className="text-red-400 text-xs text-center">
											{error}
										</p>
									</motion.div>
								)}
							</AnimatePresence>

							<div className="space-y-2">
								<label className={labelCx}>Content URL *</label>
								<input
									type="url"
									value={form.content_url}
									onChange={set("content_url")}
									placeholder="https://instagram.com/p/..."
									required
									className={inputCx}
								/>
							</div>

							<div className="space-y-2">
								<label className={labelCx}>Platform *</label>
								<select
									value={form.platform}
									onChange={set("platform")}
									required
									className={`${inputCx} appearance-none`}>
									<option value="" className="bg-black">
										Select platform…
									</option>
									{PLATFORMS.map((p) => (
										<option
											key={p.value}
											value={p.value}
											className="bg-black">
											{p.label}
										</option>
									))}
								</select>
							</div>

							<div className="space-y-2">
								<label className={labelCx}>
									Title / Caption (optional)
								</label>
								<input
									type="text"
									value={form.title}
									onChange={set("title")}
									placeholder="Short description of your content"
									maxLength={200}
									className={inputCx}
								/>
							</div>

							<button
								type="submit"
								disabled={isLoading}
								className="w-full bg-white text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-white/90 disabled:opacity-50 text-sm">
								{isLoading ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									"Submit Content"
								)}
							</button>
						</form>
					</>
				)}
			</motion.div>
		</div>
	);
}

const labelCx = "block text-xs font-medium text-white/40 tracking-widest uppercase";
const inputCx =
	"w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-all duration-200";
