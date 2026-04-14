"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { creatorFetch } from "@/lib/creatorApi";

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

export default function SettingsPage() {
	const [profile, setProfile] = useState({
		name: "",
		instagram_url: "",
		youtube_url: "",
		tiktok_url: "",
		twitter_url: "",
		niche: "",
	});
	const [upiId, setUpiId] = useState("");
	const [initialLoading, setInitialLoading] = useState(true);

	const [profileLoading, setProfileLoading] = useState(false);
	const [upiLoading, setUpiLoading] = useState(false);
	const [profileMsg, setProfileMsg] = useState(null);
	const [upiMsg, setUpiMsg] = useState(null);

	const set = (k) => (e) => setProfile((f) => ({ ...f, [k]: e.target.value }));

	const flash = (setFn, msg, isError = false) => {
		setFn({ text: msg, error: isError });
		setTimeout(() => setFn(null), 3000);
	};

	useEffect(() => {
		let active = true;

		async function loadProfile() {
			try {
				const res = await creatorFetch("/api/creator/me");
				const json = await res.json();

				if (!active || !json.success) return;

				setProfile({
					name: json.data?.name ?? "",
					instagram_url: json.data?.instagram_url ?? "",
					youtube_url: json.data?.youtube_url ?? "",
					tiktok_url: json.data?.tiktok_url ?? "",
					twitter_url: json.data?.twitter_url ?? "",
					niche: json.data?.niche ?? "",
				});
				setUpiId(json.data?.upi_id ?? "");
			} finally {
				if (active) setInitialLoading(false);
			}
		}

		loadProfile();

		return () => {
			active = false;
		};
	}, []);

	const saveProfile = async (e) => {
		e.preventDefault();
		setProfileLoading(true);

		try {
			const res = await creatorFetch("/api/creator/me", {
				method: "PUT",
				body: JSON.stringify(profile),
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.error || "Could not save profile");

			flash(setProfileMsg, "Profile saved");
		} catch (err) {
			flash(setProfileMsg, err.message, true);
		} finally {
			setProfileLoading(false);
		}
	};

	const saveUpi = async (e) => {
		e.preventDefault();
		setUpiLoading(true);

		try {
			const res = await creatorFetch("/api/creator/me/payment", {
				method: "PUT",
				body: JSON.stringify({ upi_id: upiId }),
			});
			const json = await res.json();
			if (!json.success) throw new Error(json.error || "Could not save UPI ID");

			flash(setUpiMsg, "UPI ID saved");
		} catch (err) {
			flash(setUpiMsg, err.message, true);
		} finally {
			setUpiLoading(false);
		}
	};

	if (initialLoading) {
		return (
			<div className="p-6 md:p-10 max-w-2xl">
				<div className="h-44 bg-white/3 rounded-xl animate-pulse" />
			</div>
		);
	}

	return (
		<div className="p-6 md:p-10 max-w-2xl space-y-8">
			<div>
				<h1 className="text-xl font-semibold text-white">Settings</h1>
				<p className="text-white/35 text-sm mt-1">
					Manage your creator profile and payout details. Password and account
					security are managed by Clerk.
				</p>
			</div>

			<Section title="Profile">
				<form onSubmit={saveProfile} className="space-y-4">
					<Field label="Full Name">
						<input
							type="text"
							value={profile.name}
							onChange={set("name")}
							className={inputCx}
						/>
					</Field>

					<Field label="Instagram URL">
						<input
							type="url"
							value={profile.instagram_url}
							onChange={set("instagram_url")}
							placeholder="https://instagram.com/..."
							className={inputCx}
						/>
					</Field>

					<Field label="YouTube URL">
						<input
							type="url"
							value={profile.youtube_url}
							onChange={set("youtube_url")}
							placeholder="https://youtube.com/@..."
							className={inputCx}
						/>
					</Field>

					<Field label="TikTok URL">
						<input
							type="url"
							value={profile.tiktok_url}
							onChange={set("tiktok_url")}
							placeholder="https://tiktok.com/@..."
							className={inputCx}
						/>
					</Field>

					<Field label="Twitter / X URL">
						<input
							type="url"
							value={profile.twitter_url}
							onChange={set("twitter_url")}
							placeholder="https://twitter.com/..."
							className={inputCx}
						/>
					</Field>

					<Field label="Content Niche">
						<select
							value={profile.niche}
							onChange={set("niche")}
							className={`${inputCx} appearance-none`}>
							<option value="" className="bg-black">
								Select niche...
							</option>
							{NICHES.map((n) => (
								<option key={n} value={n} className="bg-black">
									{n}
								</option>
							))}
						</select>
					</Field>

					<div className="flex items-center gap-4 pt-2">
						<SaveButton loading={profileLoading} />
						<Feedback msg={profileMsg} />
					</div>
				</form>
			</Section>

			<Section title="Payment Details">
				<p className="text-xs text-white/30 mb-4">
					Your UPI ID is used for Razorpay payouts. It will only be used when you
					request a withdrawal.
				</p>

				<form onSubmit={saveUpi} className="space-y-4">
					<Field label="UPI ID">
						<input
							type="text"
							value={upiId}
							onChange={(e) => setUpiId(e.target.value)}
							placeholder="yourname@upi"
							className={inputCx}
						/>
					</Field>

					<div className="flex items-center gap-4">
						<SaveButton loading={upiLoading} />
						<Feedback msg={upiMsg} />
					</div>
				</form>
			</Section>
		</div>
	);
}

function Section({ title, children }) {
	return (
		<div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-6">
			<h2 className="text-sm font-semibold text-white mb-5">{title}</h2>
			{children}
		</div>
	);
}

function Field({ label, children }) {
	return (
		<div className="space-y-2">
			<label className="block text-xs font-medium text-white/40 tracking-widest uppercase">
				{label}
			</label>
			{children}
		</div>
	);
}

function SaveButton({ loading, label = "Save Changes" }) {
	return (
		<button
			type="submit"
			disabled={loading}
			className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-all disabled:opacity-50">
			{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
			{loading ? "Saving..." : label}
		</button>
	);
}

function Feedback({ msg }) {
	if (!msg) return null;
	return (
		<p className={`text-xs font-medium ${msg.error ? "text-red-400" : "text-green-400"}`}>
			{msg.text}
		</p>
	);
}

const inputCx =
	"w-full bg-white/3 border border-white/8 rounded-xl py-3 px-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all duration-200";
