"use client";

import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { creatorFetch } from "@/lib/creatorApi";

const STATUS_STYLES = {
	pending: "text-yellow-400",
	processing: "text-blue-400",
	completed: "text-green-400",
	failed: "text-red-400",
};

export default function PayoutSection({ available, payouts, upiId, onPayoutRequested }) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const MIN = 10;

	const handleRequest = async () => {
		if (!upiId) {
			setError("Add your UPI ID in Settings before requesting a payout.");
			return;
		}
		if (available < MIN) {
			setError(`Minimum payout is $${MIN}. You have $${available?.toFixed(2)} available.`);
			return;
		}
		setIsLoading(true);
		setError("");
		try {
			const res = await creatorFetch("/api/creator/payouts/request", { method: "POST" });
			const json = await res.json();
			if (!json.success) throw new Error(json.error);
			onPayoutRequested?.();
		} catch (err) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Balance card */}
			<div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-6">
				<p className="text-xs font-medium text-white/35 uppercase tracking-widest mb-4">
					Available Balance
				</p>
				<p className="text-4xl font-semibold text-white mb-1">
					${available?.toFixed(2) ?? "0.00"}
				</p>
				<p className="text-xs text-white/30 mb-6">Ready to withdraw</p>

				{error && (
					<div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-xs text-red-400">
						<AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
						{error}
					</div>
				)}

				<button
					onClick={handleRequest}
					disabled={isLoading || !available || available < MIN}
					className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
					{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
					{isLoading ? "Requesting…" : "Request Payout"}
				</button>

				{!upiId && (
					<p className="text-xs text-white/30 mt-3">
						Go to{" "}
						<a
							href="/creators/dashboard/settings"
							className="underline hover:text-white/60">
							Settings
						</a>{" "}
						to add your UPI ID first.
					</p>
				)}
			</div>

			{/* History */}
			<div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-6">
				<p className="text-xs font-medium text-white/35 uppercase tracking-widest mb-5">
					Payout History
				</p>

				{!payouts?.length ? (
					<p className="text-white/25 text-sm text-center py-8">No payouts yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-white/5">
									{["Amount", "Status", "UPI", "Date"].map((h) => (
										<th
											key={h}
											className="text-left text-xs text-white/25 uppercase tracking-wider pb-3 px-2 font-medium">
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-white/3">
								{payouts.map((p) => (
									<tr
										key={p.id}
										className="hover:bg-white/1.5 transition-colors">
										<td className="py-3.5 px-2 text-white font-medium">
											${Number(p.amount).toFixed(2)}
										</td>
										<td className="py-3.5 px-2">
											<span
												className={`text-xs font-medium ${STATUS_STYLES[p.status] ?? "text-white/50"}`}>
												{p.status}
											</span>
										</td>
										<td className="py-3.5 px-2 text-white/40 font-mono text-xs">
											{p.upi_id ?? "—"}
										</td>
										<td className="py-3.5 px-2 text-white/30 whitespace-nowrap">
											{new Date(
												p.requested_at,
											).toLocaleDateString()}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
