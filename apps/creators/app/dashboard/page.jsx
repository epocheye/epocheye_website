"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { MousePointerClick, ArrowRightLeft, DollarSign, Wallet } from "lucide-react";
import { creatorFetch } from "@/lib/creatorApi";
import { trackEvent, EVENT_NAMES } from "@/lib/analytics";
import { CREATOR_ROUTES } from "@/lib/creatorRoutes";
import StatsCard from "@/components/creators/StatsCard";
import PromoCodeWidget from "@/components/creators/PromoCodeWidget";
import SiteCard from "@/components/creators/SiteCard";
import { formatUsd } from "@/lib/creatorProgram";
import { useCreatorProgram } from "@/lib/useCreatorMonuments";
import ReferralChart from "@/components/creators/ReferralChart";

export default function DashboardOverview() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { user } = useUser();
	const [stats, setStats] = useState(null);
	const [timeline, setTimeline] = useState([]);
	const [promoCode, setPromoCode] = useState(null);
	const [loading, setLoading] = useState(true);
	// Earnings are recorded in rupees and shown in US dollars at today's rate.
	const { inrPerUsd } = useCreatorProgram();

	useEffect(() => {
		if (searchParams.get("signup") !== "1") return;

		trackEvent(EVENT_NAMES.signUpCompleted, { source: "signup_redirect" });
		router.replace(CREATOR_ROUTES.dashboard, { scroll: false });
	}, [router, searchParams]);

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

			{/* Assigned monument / place in line */}
			<SiteCard />

			{/* Promo code */}
			<PromoCodeWidget code={promoCode} />

			{/* Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<StatsCard
					label="QR scans"
					value={loading ? "—" : (stats?.total_clicks?.toLocaleString() ?? "0")}
					sub={`${stats?.code_entries ?? 0} code entries in the app`}
					icon={MousePointerClick}
				/>
				<StatsCard
					label="Sales"
					value={loading ? "—" : (stats?.total_conversions?.toLocaleString() ?? "0")}
					sub={
						stats?.conversion_rate != null
							? `${stats.conversion_rate}% of scans`
							: undefined
					}
					icon={ArrowRightLeft}
				/>
				<StatsCard
					label="Lifetime Earnings"
					value={
						loading ? "—" : formatUsd(stats?.lifetime_earnings, inrPerUsd)
					}
					sub={`${formatUsd(stats?.pending_earnings, inrPerUsd)} pending`}
					icon={DollarSign}
				/>
				<StatsCard
					label="Available Balance"
					value={
						loading ? "—" : formatUsd(stats?.available_balance, inrPerUsd)
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
