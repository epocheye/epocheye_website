"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function formatDate(iso) {
	if (!iso) return "—";
	try {
		return new Date(iso).toLocaleDateString();
	} catch {
		return iso;
	}
}

export default function AdminUsersPage() {
	const [users, setUsers] = useState([]);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [tier, setTier] = useState("");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(search.trim());
		}, 300);

		return () => clearTimeout(timer);
	}, [search]);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({ limit: "100" });
			if (debouncedSearch) params.set("search", debouncedSearch);
			if (tier) params.set("tier", tier);
			const res = await fetch(`/api/admin/users?${params.toString()}`);
			const json = await res.json();
			if (json.success) setUsers(json.data?.entries || []);
		} finally {
			setLoading(false);
		}
	}, [debouncedSearch, tier]);

	useEffect(() => {
		load();
	}, [load]);

	return (
		<div className="p-8 md:p-12 max-w-6xl">
			<div className="mb-8">
				<h1 className="text-xl font-semibold text-white">Users</h1>
				<p className="text-white/35 text-sm mt-1">
					Cross-feature view: premium tier, engagement state, AR quota usage today.
				</p>
			</div>

			<div className="mb-5 flex items-center gap-3 flex-wrap">
				<input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search email or name…"
					className="flex-1 min-w-[220px] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
				/>
				<div className="flex items-center gap-2">
					{[
						{ v: "", label: "All" },
						{ v: "free", label: "Free" },
						{ v: "premium", label: "Premium" },
					].map((opt) => (
						<button
							key={opt.v || "all"}
							type="button"
							onClick={() => setTier(opt.v)}
							className={`px-3 py-1.5 text-xs rounded border transition-colors ${
								tier === opt.v
									? "bg-white text-black border-white"
									: "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
							}`}>
							{opt.label}
						</button>
					))}
				</div>
			</div>

			<div className="bg-[#0d0d0d] border border-white/5 rounded-xl overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-xs">
						<thead>
							<tr className="text-white/40 text-[10px] uppercase tracking-widest border-b border-white/5">
								<th className="text-left px-5 py-3 font-medium">Email</th>
								<th className="text-left px-3 py-3 font-medium">Name</th>
								<th className="text-left px-3 py-3 font-medium">Joined</th>
								<th className="text-left px-3 py-3 font-medium">
									Last login
								</th>
								<th className="text-center px-3 py-3 font-medium">Tier</th>
								<th className="text-center px-3 py-3 font-medium">
									Opt-out
								</th>
								<th className="text-right px-5 py-3 font-medium">
									AR today
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5">
							{loading ? (
								[...Array(6)].map((_, i) => (
									<tr key={i}>
										<td colSpan={7} className="px-5 py-3">
											<div className="h-4 bg-white/5 rounded animate-pulse" />
										</td>
									</tr>
								))
							) : users.length === 0 ? (
								<tr>
									<td
										colSpan={7}
										className="px-5 py-10 text-center text-white/30">
										No users match.
									</td>
								</tr>
							) : (
								users.map((u) => (
									<tr
										key={u.uuid}
										className="text-white/70 hover:bg-white/3">
										<td className="px-5 py-3">
											<Link
												href={`/admin/users/${u.uuid}`}
												className="text-white hover:underline">
												{u.email}
											</Link>
										</td>
										<td className="px-3 py-3">{u.name || "—"}</td>
										<td className="px-3 py-3 text-white/50">
											{formatDate(u.created_at)}
										</td>
										<td className="px-3 py-3 text-white/50">
											{formatDate(u.last_login)}
										</td>
										<td className="px-3 py-3 text-center">
											{u.has_premium ? (
												<span className="px-2 py-0.5 bg-amber-400/10 text-amber-300 border border-amber-400/20 rounded text-[10px]">
													Premium
												</span>
											) : (
												<span className="text-white/30 text-[10px]">
													Free
												</span>
											)}
										</td>
										<td className="px-3 py-3 text-center">
											{u.engagement_opt_out ? (
												<span className="px-2 py-0.5 bg-red-400/10 text-red-300 border border-red-400/20 rounded text-[10px]">
													Opted out
												</span>
											) : (
												<span className="text-white/30 text-[10px]">
													—
												</span>
											)}
										</td>
										<td className="px-5 py-3 text-right font-mono text-white/60">
											{u.ar_count_today}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
