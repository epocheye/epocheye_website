"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { MousePointerClick, ArrowRightLeft, DollarSign, Wallet } from "lucide-react";
import { creatorFetch } from "@/lib/creatorApi";
import StatsCard from "@/components/creators/StatsCard";
import PromoCodeWidget from "@/components/creators/PromoCodeWidget";
import ReferralChart from "@/components/creators/ReferralChart";

export default function DashboardOverview() {
	const { user } = useUser();
	const [stats, setStats] = useState(null);
	const [timeline, setTimeline] = useState([]);
	const [promoCode, setPromoCode] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function load() {
			try {
				const [statsRes, timelineRes, promoRes] = await Promise.all([
					creatorFetch("/api/creator/stats/overview"),
					creatorFetch("/api/creator/stats/timeline?days=30"),
					creatorFetch("/api/creator/promo"),
				]);

				const [statsJson, timelineJson, promoJson] = await Promise.all([
					statsRes.json(),
					timelineRes.json(),
					promoRes.json(),
				]);

				if (statsJson.success) setStats(statsJson.data);
				if (timelineJson.success) setTimeline(timelineJson.data);
				if (promoJson.success) setPromoCode(promoJson.data.code);
				else setPromoCode(null);
			} catch {
				setPromoCode(null);
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "";

	return (
		<div className="p-6 md:p-10 space-y-8 max-w-5xl">
			{/* Header */}
			<div>
				<h1 className="text-xl font-semibold text-white">
					Welcome back{firstName ? `, ${firstName}` : ""}
				</h1>
				<p className="text-white/35 text-sm mt-1">
					Here&apos;s how your creator campaign is performing
				</p>
			</div>

			{/* Promo code */}
			<PromoCodeWidget code={promoCode} />

			{/* Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<StatsCard
					label="Total Clicks"
					value={loading ? "—" : (stats?.total_clicks?.toLocaleString() ?? "0")}
					sub={`${stats?.current_month_clicks ?? 0} this month`}
					icon={MousePointerClick}
				/>
				<StatsCard
					label="Conversions"
					value={loading ? "—" : (stats?.total_conversions?.toLocaleString() ?? "0")}
					sub={
						stats?.conversion_rate != null
							? `${stats.conversion_rate}% conversion rate`
							: undefined
					}
					icon={ArrowRightLeft}
				/>
				<StatsCard
					label="Lifetime Earnings"
					value={
						loading ? "—" : `$${stats?.lifetime_earnings?.toFixed(2) ?? "0.00"}`
					}
					sub={`$${stats?.pending_earnings?.toFixed(2) ?? "0.00"} pending`}
					icon={DollarSign}
				/>
				<StatsCard
					label="Available Balance"
					value={
						loading ? "—" : `$${stats?.available_balance?.toFixed(2) ?? "0.00"}`
					}
					sub="Ready to withdraw"
					icon={Wallet}
				/>
			</div>

			{/* Chart */}
			<ReferralChart data={timeline} />
		</div>
	);
}
