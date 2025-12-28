"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
	AlertCircle,
	CheckCircle2,
	Clock3,
	MapPin,
	Plus,
	RefreshCw,
	Save,
	Trash2,
	UserRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const emptyForm = {
	name: "",
	role: "",
	shift_start: "09:00",
	shift_end: "17:00",
	location: "",
	is_active: true,
};

export default function StaffAdminPage() {
	return (
		<Suspense
			fallback={
				<div className="p-6">
					<Skeleton className="mb-4 h-10 w-56" />
					<Skeleton className="h-72 w-full" />
				</div>
			}>
			<StaffAdminPageContent />
		</Suspense>
	);
}

function StaffAdminPageContent() {
	const searchParams = useSearchParams();
	const [siteId, setSiteId] = useState("");
	const [loading, setLoading] = useState(true);
	const [savingId, setSavingId] = useState(null);
	const [deletingId, setDeletingId] = useState(null);
	const [creating, setCreating] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);
	const [error, setError] = useState("");
	const [staff, setStaff] = useState([]);
	const [form, setForm] = useState(emptyForm);

	useEffect(() => {
		const paramSite = searchParams.get("siteId");
		const stored =
			typeof window !== "undefined"
				? window.localStorage.getItem("epocheye_site_id")
				: null;
		const resolved = paramSite || stored || "";
		if (resolved) {
			setSiteId(resolved);
			if (paramSite && typeof window !== "undefined") {
				window.localStorage.setItem("epocheye_site_id", resolved);
			}
		} else {
			setSiteId("");
		}
	}, [searchParams]);

	const token = useMemo(() => {
		if (typeof window === "undefined") return null;
		return window.localStorage.getItem("epocheye_token");
	}, []);

	useEffect(() => {
		if (!siteId) return;
		const controller = new AbortController();
		async function load() {
			setLoading(true);
			setError("");
			try {
				if (!token) throw new Error("Not signed in");
				const res = await fetch(`/api/staff?siteId=${siteId}`, {
					headers: { Authorization: `Bearer ${token}` },
					signal: controller.signal,
				});
				const data = await res.json();
				if (!res.ok || !data?.success) {
					throw new Error(data?.message || "Unable to load staff");
				}
				setStaff(data.data || []);
			} catch (err) {
				if (!controller.signal.aborted) {
					setError(err.message || "Failed to load staff");
					setStaff([]);
				}
			} finally {
				if (!controller.signal.aborted) {
					setLoading(false);
				}
			}
		}
		load();
		return () => controller.abort();
	}, [siteId, token, reloadKey]);

	const handleCreate = async (e) => {
		e.preventDefault();
		if (!siteId) {
			setError("Select a site to manage staff.");
			return;
		}
		if (!form.name.trim() || !form.role.trim()) {
			setError("Name and role are required.");
			return;
		}
		setCreating(true);
		setError("");
		try {
			const res = await fetch("/api/staff", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ ...form, site_id: Number(siteId) }),
			});
			const data = await res.json();
			if (!res.ok || !data?.success) {
				throw new Error(data?.message || "Unable to add staff");
			}
			setStaff((prev) =>
				[...prev, data.data].sort((a, b) => a.name.localeCompare(b.name))
			);
			setForm(emptyForm);
		} catch (err) {
			setError(err.message || "Failed to add staff");
		} finally {
			setCreating(false);
		}
	};

	const updateLocal = (id, changes) => {
		setStaff((prev) => prev.map((row) => (row.id === id ? { ...row, ...changes } : row)));
	};

	const handleSave = async (id) => {
		const row = staff.find((s) => s.id === id);
		if (!row) return;
		setSavingId(id);
		setError("");
		try {
			const res = await fetch(`/api/staff/${id}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					name: row.name,
					role: row.role,
					shift_start: row.shift_start,
					shift_end: row.shift_end,
					location: row.location,
					is_active: row.is_active,
				}),
			});
			const data = await res.json();
			if (!res.ok || !data?.success) {
				throw new Error(data?.message || "Unable to save staff");
			}
			updateLocal(id, data.data);
		} catch (err) {
			setError(err.message || "Failed to save staff");
		} finally {
			setSavingId(null);
		}
	};

	const handleDelete = async (id) => {
		setDeletingId(id);
		setError("");
		try {
			const res = await fetch(`/api/staff/${id}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await res.json();
			if (!res.ok || !data?.success) {
				throw new Error(data?.message || "Unable to delete staff");
			}
			setStaff((prev) => prev.filter((row) => row.id !== id));
		} catch (err) {
			setError(err.message || "Failed to delete staff");
		} finally {
			setDeletingId(null);
		}
	};

	const StaffStatus = ({ active }) => (
		<span
			className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
				active ? "bg-emerald-500/15 text-emerald-200" : "bg-zinc-700/50 text-zinc-200"
			}`}>
			{active ? (
				<CheckCircle2 className="size-3.5" />
			) : (
				<AlertCircle className="size-3.5" />
			)}
			{active ? "Active" : "Inactive"}
		</span>
	);

	const NoSiteSelected = () => (
		<Card className="border-white/10 bg-white/5">
			<CardHeader>
				<CardTitle className="text-white">Select a site</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2 text-sm text-zinc-300">
				<p>
					No site found in context. Open analytics for a site or append ?siteId= in
					the URL.
				</p>
			</CardContent>
		</Card>
	);

	const StaffRow = ({ row }) => (
		<TableRow key={row.id} className="border-white/5">
			<TableCell>
				<div className="font-medium text-white">{row.name}</div>
				<div className="text-xs text-zinc-400">{row.role}</div>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2 text-sm text-zinc-200">
					<Clock3 className="size-4 text-emerald-300" />
					<input
						type="time"
						value={row.shift_start || ""}
						onChange={(e) => updateLocal(row.id, { shift_start: e.target.value })}
						className="w-28 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
					/>
					<span className="text-zinc-500">to</span>
					<input
						type="time"
						value={row.shift_end || ""}
						onChange={(e) => updateLocal(row.id, { shift_end: e.target.value })}
						className="w-28 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
					/>
				</div>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2 text-sm text-zinc-200">
					<MapPin className="size-4 text-sky-300" />
					<input
						type="text"
						value={row.location || ""}
						onChange={(e) => updateLocal(row.id, { location: e.target.value })}
						className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
						placeholder="Zone / post"
					/>
				</div>
			</TableCell>
			<TableCell>
				<label className="inline-flex items-center gap-2 text-sm text-zinc-200">
					<input
						type="checkbox"
						checked={row.is_active !== false}
						onChange={(e) => updateLocal(row.id, { is_active: e.target.checked })}
						className="h-4 w-4 rounded border-white/20 bg-white/10"
					/>
					<StaffStatus active={row.is_active !== false} />
				</label>
			</TableCell>
			<TableCell className="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={savingId === row.id}
					onClick={() => handleSave(row.id)}
					className="border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20">
					<Save className="size-4" />
					{savingId === row.id ? "Saving" : "Save"}
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={deletingId === row.id}
					onClick={() => handleDelete(row.id)}
					className="border-red-500/50 bg-red-500/10 text-red-100 hover:bg-red-500/20">
					<Trash2 className="size-4" />
					{deletingId === row.id ? "Removing" : "Remove"}
				</Button>
			</TableCell>
		</TableRow>
	);

	const StaffCard = ({ row }) => (
		<div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
			<div className="flex items-center justify-between gap-3">
				<div>
					<div className="text-base font-semibold text-white">{row.name}</div>
					<div className="text-sm text-zinc-400">{row.role}</div>
				</div>
				<StaffStatus active={row.is_active !== false} />
			</div>
			<div className="flex items-center gap-2 text-sm text-zinc-200">
				<Clock3 className="size-4 text-emerald-300" />
				<input
					type="time"
					value={row.shift_start || ""}
					onChange={(e) => updateLocal(row.id, { shift_start: e.target.value })}
					className="w-28 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
				/>
				<span className="text-zinc-500">to</span>
				<input
					type="time"
					value={row.shift_end || ""}
					onChange={(e) => updateLocal(row.id, { shift_end: e.target.value })}
					className="w-28 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
				/>
			</div>
			<div className="flex items-center gap-2 text-sm text-zinc-200">
				<MapPin className="size-4 text-sky-300" />
				<input
					type="text"
					value={row.location || ""}
					onChange={(e) => updateLocal(row.id, { location: e.target.value })}
					className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
					placeholder="Zone / post"
				/>
			</div>
			<div className="flex flex-wrap gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={savingId === row.id}
					onClick={() => handleSave(row.id)}
					className="border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20">
					<Save className="size-4" />
					{savingId === row.id ? "Saving" : "Save"}
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={deletingId === row.id}
					onClick={() => handleDelete(row.id)}
					className="border-red-500/50 bg-red-500/10 text-red-100 hover:bg-red-500/20">
					<Trash2 className="size-4" />
					{deletingId === row.id ? "Removing" : "Remove"}
				</Button>
			</div>
		</div>
	);

	return (
		<div className="min-h-screen bg-black px-4 py-8 text-white">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-sm text-emerald-200">Admin · Staff</p>
						<h1 className="text-3xl font-semibold">Staff Management</h1>
						<p className="text-sm text-zinc-400">
							Add, edit, or remove staff for the selected site.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							variant="outline"
							onClick={() => siteId && setReloadKey((k) => k + 1)}
							className="border-white/10 bg-white/5 text-white hover:bg-white/10">
							<RefreshCw className="size-4" />
							Refresh
						</Button>
					</div>
				</div>

				{!siteId ? (
					<NoSiteSelected />
				) : (
					<div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
						<Card className="border-white/10 bg-white/5">
							<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
								<CardTitle className="text-xl">Team roster</CardTitle>
								<div className="text-xs text-zinc-400">
									Site ID: {siteId}
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								{error && (
									<div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
										{error}
									</div>
								)}
								{loading ? (
									<p className="text-sm text-zinc-400">
										Loading staff...
									</p>
								) : staff.length === 0 ? (
									<p className="text-sm text-zinc-400">
										No staff in this site yet. Add a team member
										below.
									</p>
								) : (
									<>
										<div className="hidden md:block">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>
															Name / Role
														</TableHead>
														<TableHead>Shift</TableHead>
														<TableHead>
															Location
														</TableHead>
														<TableHead>Status</TableHead>
														<TableHead>Actions</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{staff.map((row) => (
														<StaffRow
															key={row.id}
															row={row}
														/>
													))}
												</TableBody>
											</Table>
										</div>
										<div className="grid gap-3 md:hidden">
											{staff.map((row) => (
												<StaffCard key={row.id} row={row} />
											))}
										</div>
									</>
								)}
							</CardContent>
						</Card>

						<Card className="border-white/10 bg-white/5">
							<CardHeader>
								<CardTitle className="text-xl">Add staff</CardTitle>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleCreate} className="space-y-4">
									<div className="grid gap-3 sm:grid-cols-2">
										<label className="text-sm text-zinc-300">
											Name
											<div className="mt-1 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
												<UserRound className="size-4 text-emerald-300" />
												<input
													type="text"
													value={form.name}
													onChange={(e) =>
														setForm((p) => ({
															...p,
															name: e.target.value,
														}))
													}
													className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
													placeholder="Ranger, Guide"
													required
												/>
											</div>
										</label>
										<label className="text-sm text-zinc-300">
											Role
											<div className="mt-1 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
												<UserRound className="size-4 text-emerald-300" />
												<input
													type="text"
													value={form.role}
													onChange={(e) =>
														setForm((p) => ({
															...p,
															role: e.target.value,
														}))
													}
													className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
													placeholder="Security, Ticketing"
													required
												/>
											</div>
										</label>
									</div>

									<label className="text-sm text-zinc-300">
										Location / Post
										<div className="mt-1 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
											<MapPin className="size-4 text-sky-300" />
											<input
												type="text"
												value={form.location}
												onChange={(e) =>
													setForm((p) => ({
														...p,
														location: e.target.value,
													}))
												}
												className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
												placeholder="North Gate, Zone A"
											/>
										</div>
									</label>

									<div className="grid gap-3 sm:grid-cols-2">
										<label className="text-sm text-zinc-300">
											Shift start
											<input
												type="time"
												value={form.shift_start}
												onChange={(e) =>
													setForm((p) => ({
														...p,
														shift_start: e.target.value,
													}))
												}
												className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
												required
											/>
										</label>
										<label className="text-sm text-zinc-300">
											Shift end
											<input
												type="time"
												value={form.shift_end}
												onChange={(e) =>
													setForm((p) => ({
														...p,
														shift_end: e.target.value,
													}))
												}
												className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
												required
											/>
										</label>
									</div>

									<label className="inline-flex items-center gap-2 text-sm text-zinc-300">
										<input
											type="checkbox"
											checked={form.is_active}
											onChange={(e) =>
												setForm((p) => ({
													...p,
													is_active: e.target.checked,
												}))
											}
											className="h-4 w-4 rounded border-white/20 bg-white/10"
										/>
										Active
									</label>

									<Button
										type="submit"
										disabled={creating}
										className="flex w-full items-center justify-center gap-2 bg-emerald-400 text-black hover:bg-emerald-300">
										<Plus className="size-4" />
										{creating ? "Adding..." : "Add staff"}
									</Button>
								</form>
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</div>
	);
}
