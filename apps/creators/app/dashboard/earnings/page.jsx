"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { creatorFetch } from "@/lib/creatorApi";

function formatCurrency(amount, currency = "INR") {
	const symbol = currency === "INR" ? "₹" : "$";
	return `${symbol}${Number(amount || 0).toFixed(2)}`;
}

function formatDate(value) {
	if (!value) return "—";
	try {
		return new Date(value).toLocaleDateString("en-IN", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	} catch {
		return "—";
	}
}

function StatusPill({ conversion }) {
	if (conversion.is_available) {
		return (
			<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
				<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
				Available
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 border border-amber-500/20 text-amber-300">
			<span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
			Pending
		</span>
	);
}

export default function EarningsPage() {
	const [conversions, setConversions] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function load() {
			try {
				const res = await creatorFetch("/api/creator/conversions");
				const json = await res.json();
				if (json.success) {
					setConversions(json.data.conversions || []);
				}
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	const totalCommission = conversions.reduce(
		(sum, c) => sum + Number(c.commission_amount || 0),
		0,
	);

	return (
		<div className="p-6 md:p-10 max-w-5xl">
			<div className="mb-8">
				<h1 className="text-xl font-semibold text-white">Earnings</h1>
				<p className="text-white/35 text-sm mt-1">
					Every conversion your promo code has driven on Epocheye Premium.
				</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
				<div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-5">
					<div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-wider mb-2">
						<TrendingUp className="w-3.5 h-3.5" />
						Total commission
					</div>
					<div className="text-white text-2xl font-semibold">
						{formatCurrency(totalCommission)}
					</div>
				</div>
				<div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-5">
					<div className="text-white/40 text-xs uppercase tracking-wider mb-2">
						Conversions
					</div>
					<div className="text-white text-2xl font-semibold">
						{conversions.length}
					</div>
				</div>
			</div>

			<div className="bg-[#0d0d0d] border border-white/5 rounded-xl overflow-hidden">
				{loading ? (
					<div className="p-6 space-y-3">
						{[...Array(4)].map((_, i) => (
							<div key={i} className="h-12 bg-white/3 rounded-lg animate-pulse" />
						))}
					</div>
				) : conversions.length === 0 ? (
					<div className="p-10 text-center">
						<p className="text-white/60 text-sm">No conversions yet.</p>
						<p className="text-white/30 text-xs mt-1">
							Share your promo code — every Premium purchase earns you commission.
						</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-white/5 text-white/40 text-[11px] uppercase tracking-wider">
									<th className="text-left px-5 py-3 font-medium">Date</th>
									<th className="text-left px-5 py-3 font-medium">Code</th>
									<th className="text-right px-5 py-3 font-medium">Gross</th>
									<th className="text-right px-5 py-3 font-medium">Commission</th>
									<th className="text-left px-5 py-3 font-medium">Status</th>
									<th className="text-left px-5 py-3 font-medium">Confirms on</th>
								</tr>
							</thead>
							<tbody>
								{conversions.map((c) => (
									<tr
										key={c.id}
										className="border-b border-white/5 last:border-b-0 hover:bg-white/2 transition-colors">
										<td className="px-5 py-4 text-white/80">
											{formatDate(c.converted_at)}
										</td>
										<td className="px-5 py-4 text-white/60 font-mono text-xs">
											{c.code}
										</td>
										<td className="px-5 py-4 text-white/60 text-right">
											{formatCurrency(c.plan_amount, c.currency)}
										</td>
										<td className="px-5 py-4 text-white text-right font-medium">
											{formatCurrency(c.commission_amount, c.currency)}
										</td>
										<td className="px-5 py-4">
											<StatusPill conversion={c} />
										</td>
										<td className="px-5 py-4 text-white/60">
											{c.is_available ? "—" : formatDate(c.confirms_on)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<p className="text-white/30 text-xs mt-4">
				Showing most recent 50 conversions. Pending commissions become available
				after the confirmation window.
			</p>
		</div>
	);
}
