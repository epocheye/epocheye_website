"use client";

import { useEffect, useState } from "react";
import { creatorFetch } from "@/lib/creatorApi";
import PayoutSection from "@/components/creators/PayoutSection";

export default function PayoutsPage() {
	const [data, setData] = useState(null);
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);

	async function load() {
		try {
			const [payoutRes, profileRes] = await Promise.all([
				creatorFetch("/api/creator/payouts"),
				creatorFetch("/api/creator/me"),
			]);

			const [payoutJson, profileJson] = await Promise.all([
				payoutRes.json(),
				profileRes.json(),
			]);

			if (payoutJson.success) setData(payoutJson.data);
			if (profileJson.success) setProfile(profileJson.data);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, []);

	return (
		<div className="p-6 md:p-10 max-w-3xl">
			<div className="mb-8">
				<h1 className="text-xl font-semibold text-white">Payouts</h1>
				<p className="text-white/35 text-sm mt-1">
					Withdraw your earnings via UPI.
				</p>
			</div>

			{loading ? (
				<div className="space-y-4">
					<div className="h-40 bg-white/3 rounded-xl animate-pulse" />
					<div className="h-64 bg-white/3 rounded-xl animate-pulse" />
				</div>
			) : (
				<PayoutSection
					available={data?.available_balance}
					payouts={data?.payouts}
					upiId={profile?.upi_id}
					minPayout={data?.min_payout_inr}
					onPayoutRequested={load}
				/>
			)}
		</div>
	);
}
