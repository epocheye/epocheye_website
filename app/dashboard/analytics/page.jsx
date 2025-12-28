"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
	Activity,
	ArrowDownRight,
	ArrowUpRight,
	Brain,
	Clock3,
	CloudDownload,
	Cpu,
	FileBarChart2,
	Globe2,
	Layers,
	MapPin,
	ScanLine,
	ShieldCheck,
	TimerReset,
	Users,
} from "lucide-react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const neon = {
	primary: "#c4f73c",
	amber: "#fcd34d",
	red: "#f87171",
	teal: "#22d3ee",
};

const kpis = [
	{
		key: "currentVisitors",
		title: "Current Visitors",
		icon: Users,
		goodHigh: true,
		format: (v) => v.toLocaleString(),
	},
	{
		key: "avgStay",
		title: "Average Stay",
		icon: Clock3,
		goodHigh: true,
		format: (v) => `${v.toFixed(1)} min`,
	},
	{
		key: "foreignPct",
		title: "Foreign Visitors",
		icon: Globe2,
		goodHigh: true,
		format: (v) => `${v.toFixed(1)}%`,
	},
	{
		key: "staffUtil",
		title: "Staff Utilization",
		icon: ShieldCheck,
		goodHigh: false,
		format: (v) => `${v.toFixed(0)}%`,
	},
];

const anomalies = [];

function StatusBadge({ status }) {
	const tone = status === "optimal" ? "emerald" : status === "over" ? "red" : "amber";
	const label =
		status === "optimal" ? "Optimal" : status === "over" ? "Over-staffed" : "Under-staffed";
	return (
		<span
			className={cn(
				"rounded-full px-3 py-1 text-xs font-medium",
				tone === "emerald" && "bg-emerald-500/10 text-emerald-200",
				tone === "red" && "bg-red-500/10 text-red-200",
				tone === "amber" && "bg-amber-500/10 text-amber-200"
			)}>
			{label}
		</span>
	);
}

function Section({
	title,
	children,
	actions,
	description = "Live operations for heritage tourism",
}) {
	return (
		<Card className="border-white/10 bg-linear-to-b from-neutral-900/80 via-neutral-900/60 to-black/80">
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<div>
					<CardTitle className="text-xl text-white">{title}</CardTitle>
					<CardDescription className="text-sm text-zinc-400">
						{description}
					</CardDescription>
				</div>
				<div className="flex gap-2">{actions}</div>
			</CardHeader>
			<CardContent className="pt-4">{children}</CardContent>
		</Card>
	);
}

export default function AnalyticsPage() {
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(true);
	const [mounted, setMounted] = useState(false);
	const [socketStatus, setSocketStatus] = useState("connecting");
	const [loadError, setLoadError] = useState("");
	const [siteId, setSiteId] = useState(null);
	const [metrics, setMetrics] = useState({
		currentVisitors: 0,
		avgStay: 0,
		foreignPct: 0,
		staffUtil: 0,
		trends: {
			currentVisitors: { dir: "up", change: 0 },
			avgStay: { dir: "up", change: 0 },
			foreignPct: { dir: "up", change: 0 },
			staffUtil: { dir: "up", change: 0 },
		},
		lastUpdated: 0,
	});
	const [trend, setTrend] = useState([]);
	const [zones, setZones] = useState([]);
	const [selectedZone, setSelectedZone] = useState(null);
	const [forecast, setForecast] = useState([]);
	const [staffRows, setStaffRows] = useState([]);
	const [staffSummary, setStaffSummary] = useState({
		monthlySavings: 0,
		hoursReduced: 0,
		optimizationPct: 0,
	});
	const [staffError, setStaffError] = useState("");
	const [reportType, setReportType] = useState("Weekly");
	const [dateRange, setDateRange] = useState({ start: "", end: "" });
	const [reportLoading, setReportLoading] = useState(false);
	const [history, setHistory] = useState([]);
	const [demographics, setDemographics] = useState([]);
	const mapRef = useRef(null);
	const peakHours = useMemo(() => {
		if (!zones.length) return [];
		const top = [...zones].sort((a, b) => (b.capacity || 0) - (a.capacity || 0)).slice(0, 6);
		return top.map((z, idx) => ({
			hour: z.name || `Zone ${idx + 1}`,
			expected: z.visitors || 0,
		}));
	}, [zones]);

	const recalcStaffRow = (row) => {
		const status =
			row.current === row.rec ? "optimal" : row.current > row.rec ? "over" : "under";
		const save = (row.current - row.rec) * 500;
		return { ...row, status, save };
	};

	const fmtCurrency = (value) => {
		const n = Number(value) || 0;
		return n.toLocaleString("en-US", {
			style: "currency",
			currency: "USD",
			maximumFractionDigits: 0,
		});
	};

	const fmtNumber = (value) => (Number(value) || 0).toLocaleString("en-US");

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const paramSite = searchParams.get("siteId");
		const storedSite =
			typeof window !== "undefined"
				? window.localStorage.getItem("epocheye_site_id")
				: null;
		if (paramSite) {
			setSiteId(paramSite);
			if (typeof window !== "undefined") {
				window.localStorage.setItem("epocheye_site_id", paramSite);
			}
		} else if (storedSite) {
			setSiteId(storedSite);
		} else {
			setLoadError(
				"No site selected. Add ?siteId= in the URL or store a site in localStorage."
			);
		}
	}, [searchParams]);

	useEffect(() => {
		if (!siteId) return;
		const controller = new AbortController();

		async function loadData() {
			setLoading(true);
			setLoadError("");
			setStaffError("");
			try {
				const token =
					typeof window !== "undefined"
						? window.localStorage.getItem("epocheye_token")
						: null;
				if (!token) {
					throw new Error("Not signed in. Please log in again.");
				}

				const headers = {
					Authorization: `Bearer ${token}`,
				};
				const today = new Date().toISOString().slice(0, 10);
				const startRange = new Date();
				startRange.setDate(startRange.getDate() - 6);
				setDateRange({
					start: startRange.toISOString().slice(0, 10),
					end: today,
				});

				const [statsRes, trendsRes, demoRes, zonesRes, staffRes] = await Promise.all([
					fetch(`/api/dashboard/stats?siteId=${siteId}`, {
						headers,
						signal: controller.signal,
					}),
					fetch(`/api/dashboard/trends?siteId=${siteId}&days=7`, {
						headers,
						signal: controller.signal,
					}),
					fetch(`/api/analytics/demographics?siteId=${siteId}&date=${today}`, {
						headers,
						signal: controller.signal,
					}),
					fetch(`/api/monitor/zones?siteId=${siteId}`, {
						headers,
						signal: controller.signal,
					}),
					fetch(`/api/staffing/optimize?siteId=${siteId}&date=${today}`, {
						headers,
						signal: controller.signal,
					}),
				]);

				const [stats, trends, demo, zonesResp, staffResp] = await Promise.all([
					statsRes.json(),
					trendsRes.json(),
					demoRes.json(),
					zonesRes.json(),
					staffRes.json(),
				]);

				if (!statsRes.ok || !stats?.success) {
					throw new Error(
						`${stats?.message || "Failed to load stats"}${
							stats?.error ? `: ${stats.error}` : ""
						}`
					);
				}
				if (!trendsRes.ok || !trends?.success) {
					throw new Error(
						`${trends?.message || "Failed to load trends"}${
							trends?.error ? `: ${trends.error}` : ""
						}`
					);
				}
				if (!demoRes.ok || !demo?.success) {
					throw new Error(
						`${demo?.message || "Failed to load demographics"}${
							demo?.error ? `: ${demo.error}` : ""
						}`
					);
				}
				if (!zonesRes.ok || !zonesResp?.success) {
					throw new Error(
						`${zonesResp?.message || "Failed to load zones"}${
							zonesResp?.error ? `: ${zonesResp.error}` : ""
						}`
					);
				}

				const statData = stats.data || {};
				setMetrics({
					currentVisitors: statData.current_visitors || 0,
					avgStay: statData.avg_stay_minutes || 0,
					foreignPct: statData.foreign_percentage || 0,
					staffUtil: statData.staff_utilization || 0,
					trends: {
						currentVisitors: { dir: "up", change: 0 },
						avgStay: { dir: "up", change: 0 },
						foreignPct: { dir: "up", change: 0 },
						staffUtil: { dir: "up", change: 0 },
					},
					lastUpdated: Date.now(),
				});

				const trendData = (trends.data || []).map((row) => {
					const d = new Date(row.date);
					const label = d.toLocaleDateString(undefined, {
						month: "short",
						day: "numeric",
					});
					return { day: label, visitors: row.total || 0 };
				});
				setTrend(trendData);

				const demoData = demo?.data || {};
				const demoItems = [
					{
						name: "Domestic",
						value: demoData.domestic_vs_foreign?.domestic || 0,
						color: neon.primary,
					},
					{
						name: "Foreign",
						value: demoData.domestic_vs_foreign?.foreign || 0,
						color: neon.teal,
					},
					{
						name: "School groups",
						value: demoData.group_types?.school || 0,
						color: "#fbbf24",
					},
					{
						name: "Family",
						value: demoData.group_types?.family || 0,
						color: "#a78bfa",
					},
					{ name: "Solo", value: demoData.group_types?.solo || 0, color: "#f97316" },
					{
						name: "Tour groups",
						value: demoData.group_types?.tour || 0,
						color: "#38bdf8",
					},
				];
				setDemographics(demoItems);

				const zoneData = (zonesResp.data || []).map((z) => ({
					id: String(z.zone_id),
					name: z.zone_name,
					visitors: z.current_count || 0,
					capacity: Math.round(z.density_percentage || 0),
					staff: z.current_staff || 0,
					rec: z.recommended_staff || 0,
					peak: "--",
				}));
				setZones(zoneData);

				if (!staffRes.ok || !staffResp?.success) {
					setStaffError(
						`${staffResp?.message || "Failed to load staff"}${
							staffResp?.error ? `: ${staffResp.error}` : ""
						}`
					);
					setStaffSummary({
						monthlySavings: 0,
						hoursReduced: 0,
						optimizationPct: 0,
					});
					setStaffRows([]);
				} else {
					const staffData = staffResp?.data || {};
					const staffSummaryData = staffData.summary || {};
					setStaffSummary({
						monthlySavings: Math.round(staffSummaryData.monthly_savings || 0),
						hoursReduced: Math.max(0, staffSummaryData.total_hours_reduced || 0),
						optimizationPct: Number(
							(staffSummaryData.optimization_percentage || 0).toFixed(1)
						),
					});

					const staffRowsData = (staffData.hourly || []).map((row) =>
						recalcStaffRow({
							slot: row.time,
							expected: row.expected_visitors || 0,
							current: row.current_staff || 0,
							rec: row.recommended_staff || 0,
							status:
								row.status === "overstaffed"
									? "over"
									: row.status === "understaffed"
									? "under"
									: "optimal",
							save: row.hourly_savings || 0,
						})
					);
					setStaffRows(staffRowsData);
				}

				const totals = trendData.map((t) => t.visitors);
				const avg = totals.length
					? totals.reduce((a, b) => a + b, 0) / totals.length
					: 0;
				const start = new Date();
				const fmt = new Intl.DateTimeFormat("en-US", {
					month: "short",
					day: "numeric",
					timeZone: "UTC",
				});
				const fc = Array.from({ length: 30 }, (_, i) => {
					const d = new Date(start);
					d.setDate(d.getDate() + i);
					const predicted = Math.max(0, Math.round(avg));
					return {
						date: fmt.format(d),
						predicted,
						lower: Math.max(0, Math.round(predicted * 0.85)),
						upper: Math.round(predicted * 1.15),
						historical: i < totals.length ? totals[i] : null,
					};
				});
				setForecast(fc);

				setSocketStatus("connected");
				setLoading(false);
			} catch (err) {
				if (!controller.signal.aborted) {
					setLoadError(err?.message || "Failed to load dashboard data");
					setSocketStatus("fallback");
					setLoading(false);
				}
			}
		}

		loadData();
		return () => controller.abort();
	}, [siteId]);

	const forecastCsv = useMemo(() => {
		const header = "date,predicted,lower,upper,historical";
		const rows = forecast.map(
			(f) =>
				`${f.date},${Math.round(f.predicted)},${Math.round(f.lower)},${Math.round(
					f.upper
				)},${f.historical ?? ""}`
		);
		return [header, ...rows].join("\n");
	}, [forecast]);

	const staffCsv = useMemo(() => {
		const header = "slot,expected,current,recommended,cost_delta,status";
		const rows = staffRows.map(
			(r) => `${r.slot},${r.expected},${r.current},${r.rec},${r.save},${r.status}`
		);
		return [header, ...rows].join("\n");
	}, [staffRows]);
	const downloadCsv = (text, filename) => {
		const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
	};

	const exportHeatmap = async () => {
		if (!mapRef.current) return;
		const dataUrl = await toPng(mapRef.current);
		const link = document.createElement("a");
		link.href = dataUrl;
		link.download = "crowd-heatmap.png";
		link.click();
	};

	const exportForecastPdf = () => {
		const doc = new jsPDF();
		doc.text("Visitor Forecast", 10, 12);
		forecast.slice(0, 18).forEach((f, i) => {
			doc.text(
				`${f.date} - Pred ${Math.round(f.predicted)} (CI ${Math.round(
					f.lower
				)}-${Math.round(f.upper)})`,
				10,
				22 + i * 6
			);
		});
		doc.save("visitor-forecast.pdf");
	};

	const exportStaffPdf = () => {
		const doc = new jsPDF();
		doc.text("Staff Optimization", 10, 12);
		staffRows.forEach((row, i) => {
			doc.text(
				`${row.slot} | exp ${row.expected} | curr ${row.current} | rec ${row.rec} | save $${row.save}`,
				10,
				22 + i * 6
			);
		});
		doc.save("staff-optimization.pdf");
	};

	const handleGenerateReport = () => {
		setReportLoading(true);
		setTimeout(() => {
			setReportLoading(false);
			const doc = new jsPDF();
			doc.text(`${reportType} Report`, 10, 12);
			doc.text(`Range: ${dateRange.start} to ${dateRange.end}`, 10, 22);
			doc.text(`Total visitors: 18,420`, 10, 32);
			doc.text(`Peak: Saturday 4 PM`, 10, 42);
			doc.save(`${reportType.toLowerCase()}-report.pdf`);
			setHistory((h) => [
				{
					id: crypto.randomUUID(),
					name: `${reportType} Report`,
					date: new Date().toLocaleDateString(),
					link: "#",
				},
				...h,
			]);
		}, 900);
	};

	return (
		<div className="min-h-screen bg-linear-to-br from-zinc-950 via-black to-zinc-950 px-6 py-8 text-white">
			<div className="mx-auto flex max-w-7xl flex-col gap-6">
				<header className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-sm text-zinc-400">Real-time control center</p>
						<h1 className="text-3xl font-semibold text-white">
							Tourism Intelligence Dashboard
						</h1>
					</div>
					<div className="flex items-center gap-3">
						<span
							className={cn(
								"flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
								socketStatus === "connected" &&
									"bg-emerald-500/15 text-emerald-200",
								socketStatus === "connecting" &&
									"bg-amber-500/15 text-amber-200",
								socketStatus === "fallback" && "bg-red-500/15 text-red-200"
							)}>
							<span className="h-2 w-2 animate-ping rounded-full bg-current" />
							{socketStatus === "connected"
								? "Live WebSocket"
								: socketStatus === "connecting"
								? "Connecting"
								: "Offline"}
						</span>
						<Button
							variant="outline"
							className="border-white/10 bg-white/5 text-white hover:bg-white/10">
							<CloudDownload className="size-4" /> Export All
						</Button>
					</div>
				</header>

				{loadError && (
					<div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
						{loadError}
					</div>
				)}

				{/* KPI cards */}
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{kpis.map((k) => {
						const trend = metrics.trends[k.key];
						const positive = k.goodHigh
							? trend?.dir !== "down"
							: trend?.dir === "down";
						const Icon = k.icon;
						return (
							<Card
								key={k.key}
								className="relative overflow-hidden border-white/10">
								<div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(196,247,60,0.12),transparent_25%)]" />
								<CardHeader className="relative flex flex-row items-start justify-between pb-2">
									<div>
										<CardDescription className="text-xs uppercase tracking-wide text-zinc-400">
											{k.title}
										</CardDescription>
										{loading ? (
											<Skeleton className="mt-2 h-10 w-24" />
										) : (
											<div className="flex items-baseline gap-2">
												<span className="text-3xl font-bold text-white">
													{k.format(metrics[k.key])}
												</span>
												{k.key === "currentVisitors" && (
													<span className="flex items-center gap-1 text-xs text-emerald-300">
														<span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />{" "}
														Live
													</span>
												)}
											</div>
										)}
										<p className="mt-1 text-xs text-zinc-500">
											Updated{" "}
											{mounted && metrics.lastUpdated
												? new Date(
														metrics.lastUpdated
												  ).toLocaleTimeString("en-US")
												: "--:--:--"}
										</p>
									</div>
									<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-emerald-300">
										<Icon className="size-5" />
									</div>
								</CardHeader>
								<CardFooter className="relative flex items-center justify-between pt-0">
									{loading ? (
										<Skeleton className="h-3 w-24" />
									) : (
										<span
											className={cn(
												"flex items-center gap-1 text-sm",
												positive
													? "text-emerald-300"
													: "text-red-300"
											)}>
											{trend?.dir === "up" ? (
												<ArrowUpRight className="size-4" />
											) : (
												<ArrowDownRight className="size-4" />
											)}{" "}
											{Math.abs(trend?.change ?? 0)}%
										</span>
									)}
									<div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
										<div
											className={cn(
												"h-full rounded-full",
												positive
													? "bg-emerald-400"
													: "bg-red-400"
											)}
											style={{
												width: `${Math.min(
													100,
													Math.abs(trend?.change ?? 0) * 2
												)}%`,
											}}
										/>
									</div>
								</CardFooter>
							</Card>
						);
					})}
				</div>

				{/* Visitor trends */}
				<Section
					title="Visitor Trends (7 days)"
					actions={
						<Button
							variant="outline"
							className="border-white/10 bg-white/5 text-white hover:bg-white/10"
							onClick={() => setTrend([])}>
							Reset
						</Button>
					}>
					<div className="h-64">
						{loading ? (
							<Skeleton className="h-full w-full" />
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={trend}>
									<defs>
										<linearGradient
											id="lineGradient"
											x1="0"
											x2="0"
											y1="0"
											y2="1">
											<stop
												offset="0%"
												stopColor={neon.primary}
												stopOpacity={0.8}
											/>
											<stop
												offset="100%"
												stopColor="#111"
												stopOpacity={0}
											/>
										</linearGradient>
									</defs>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke="#ffffff0f"
									/>
									<XAxis dataKey="day" stroke="#9ca3af" />
									<YAxis stroke="#9ca3af" />
									<Tooltip
										contentStyle={{
											background: "#0b0b0d",
											border: "1px solid #1f2937",
											borderRadius: 12,
											color: "#fff",
										}}
									/>
									<Line
										type="monotone"
										dataKey="visitors"
										stroke={neon.primary}
										strokeWidth={3}
										dot={false}
										fill="url(#lineGradient)"
									/>
								</LineChart>
							</ResponsiveContainer>
						)}
					</div>
				</Section>

				{/* Heat map */}
				<Section
					title="Crowd Density Heat Map"
					actions={
						<Button
							variant="outline"
							className="border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
							onClick={exportHeatmap}>
							<ScanLine className="size-4" /> Export PNG
						</Button>
					}>
					<div className="flex flex-col gap-4" ref={mapRef}>
						<div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
							<span className="flex items-center gap-2">
								<span className="h-3 w-3 rounded-full bg-emerald-400" />{" "}
								&lt; 50%
							</span>
							<span className="flex items-center gap-2">
								<span className="h-3 w-3 rounded-full bg-amber-300" />{" "}
								50-80%
							</span>
							<span className="flex items-center gap-2">
								<span className="h-3 w-3 rounded-full bg-red-400" /> &gt;
								80%
							</span>
						</div>
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							{zones.map((z) => {
								const colorClass =
									z.capacity > 80
										? "from-red-500/20 border-red-500/30"
										: z.capacity > 50
										? "from-amber-400/20 border-amber-300/30"
										: "from-emerald-400/20 border-emerald-300/30";
								return (
									<Card
										key={z.id}
										className={cn(
											"cursor-pointer border-white/5 bg-linear-to-br to-black/80 transition hover:-translate-y-1 hover:border-white/20",
											colorClass
										)}
										onClick={() => setSelectedZone(z)}>
										<CardHeader className="flex flex-row items-start justify-between pb-2">
											<div>
												<p className="text-xs uppercase tracking-wide text-zinc-400">
													{z.name}
												</p>
												<div className="flex items-center gap-2">
													<span className="text-3xl font-semibold text-white">
														{z.visitors}
													</span>
													<span className="text-sm text-zinc-400">
														visitors
													</span>
												</div>
												<p className="text-xs text-zinc-500">
													Capacity {z.capacity}%
												</p>
											</div>
											<div className="flex flex-col items-end gap-2">
												{z.capacity > 80 && (
													<span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-200">
														Critical Alert
													</span>
												)}
												<span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-200">
													Peak {z.peak}
												</span>
											</div>
										</CardHeader>
										<CardFooter className="flex items-center justify-between pt-0">
											<div className="flex items-center gap-2 text-sm text-zinc-300">
												<Cpu className="size-4 text-emerald-300" />{" "}
												Staff {z.staff}/{z.rec}
											</div>
											<div className="flex h-2 w-32 overflow-hidden rounded-full bg-white/10">
												<div
													className="h-full rounded-full"
													style={{
														width: `${z.capacity}%`,
														background:
															z.capacity > 80
																? "linear-gradient(90deg,#f87171,#fbbf24)"
																: z.capacity > 50
																? "linear-gradient(90deg,#fbbf24,#c4f73c)"
																: "linear-gradient(90deg,#34d399,#c4f73c)",
													}}
												/>
											</div>
										</CardFooter>
									</Card>
								);
							})}
						</div>
					</div>
				</Section>

				{/* Prediction */}
				<Section
					title="Visitor Prediction"
					actions={
						<div className="flex gap-2">
							<Button
								variant="outline"
								className="border-white/10 bg-white/5 text-white hover:bg-white/10"
								onClick={() =>
									downloadCsv(forecastCsv, "visitor-forecast.csv")
								}>
								<CloudDownload className="size-4" /> CSV
							</Button>
							<Button
								variant="outline"
								className="border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
								onClick={exportForecastPdf}>
								<FileBarChart2 className="size-4" /> PDF
							</Button>
						</div>
					}>
					<div className="grid gap-6 xl:grid-cols-3">
						<div className="xl:col-span-2">
							<div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
								<label className="flex items-center gap-2">
									Range
									<select
										className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
										value={reportType}
										onChange={(e) => setReportType(e.target.value)}>
										<option>Weekly</option>
										<option>Monthly</option>
										<option>Custom</option>
									</select>
								</label>
								<div className="flex items-center gap-2">
									<input
										type="date"
										value={dateRange.start}
										onChange={(e) =>
											setDateRange((r) => ({
												...r,
												start: e.target.value,
											}))
										}
										className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
									/>
									<span className="text-zinc-500">to</span>
									<input
										type="date"
										value={dateRange.end}
										onChange={(e) =>
											setDateRange((r) => ({
												...r,
												end: e.target.value,
											}))
										}
										className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
									/>
								</div>
							</div>
							<div className="h-72">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={forecast}>
										<defs>
											<linearGradient
												id="ci"
												x1="0"
												y1="0"
												x2="0"
												y2="1">
												<stop
													offset="0%"
													stopColor={neon.primary}
													stopOpacity={0.35}
												/>
												<stop
													offset="100%"
													stopColor="#0b0b0d"
													stopOpacity={0}
												/>
											</linearGradient>
										</defs>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="#ffffff0f"
										/>
										<XAxis
											dataKey="date"
											stroke="#9ca3af"
											minTickGap={24}
										/>
										<YAxis stroke="#9ca3af" />
										<Tooltip
											contentStyle={{
												background: "#0b0b0d",
												border: "1px solid #1f2937",
												borderRadius: 12,
												color: "#fff",
											}}
										/>
										<Legend wrapperStyle={{ color: "white" }} />
										<Area
											type="monotone"
											dataKey="upper"
											stroke="transparent"
											fill="url(#ci)"
										/>
										<Area
											type="monotone"
											dataKey="lower"
											stroke="transparent"
											fill="url(#ci)"
										/>
										<Line
											type="monotone"
											dataKey="predicted"
											stroke={neon.primary}
											strokeWidth={3}
											dot={false}
										/>
										<Line
											type="monotone"
											dataKey="historical"
											stroke="#6366f1"
											strokeWidth={2}
											strokeDasharray="4 6"
											dot
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
							<div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
								<span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200">
									<Brain className="size-4" /> Confidence interval
									included
								</span>
								<span className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-zinc-200">
									<Activity className="size-4" /> Hover for exact numbers
								</span>
							</div>
						</div>

						<div className="space-y-4">
							<Card className="border-white/5 bg-linear-to-b from-neutral-900/80 via-neutral-900/60 to-black/80">
								<CardHeader className="pb-2">
									<CardTitle className="text-base">
										Demographics
									</CardTitle>
								</CardHeader>
								<CardContent className="h-64">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie
												data={demographics}
												dataKey="value"
												nameKey="name"
												innerRadius={50}
												outerRadius={80}
												paddingAngle={2}>
												{demographics.map((d) => (
													<Cell
														key={d.name}
														fill={d.color}
													/>
												))}
											</Pie>
											<Tooltip
												contentStyle={{
													background: "#0b0b0d",
													border: "1px solid #1f2937",
													borderRadius: 12,
													color: "#fff",
												}}
											/>
										</PieChart>
									</ResponsiveContainer>
									<div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
										{demographics.map((d) => (
											<div
												key={d.name}
												className="flex items-center gap-2">
												<span
													className="h-3 w-3 rounded-full"
													style={{ background: d.color }}
												/>{" "}
												{d.name} {d.value}%
											</div>
										))}
									</div>
								</CardContent>
							</Card>

							<Card className="border-white/5 bg-linear-to-b from-neutral-900/80 via-neutral-900/60 to-black/80">
								<CardHeader className="pb-2">
									<CardTitle className="text-base">Peak Hours</CardTitle>
								</CardHeader>
								<CardContent className="h-52">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={peakHours}>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="#ffffff0f"
											/>
											<XAxis dataKey="hour" stroke="#9ca3af" />
											<YAxis stroke="#9ca3af" />
											<Tooltip
												contentStyle={{
													background: "#0b0b0d",
													border: "1px solid #1f2937",
													borderRadius: 12,
													color: "#fff",
												}}
											/>
											<Bar dataKey="expected" fill="#1f2937">
												{peakHours.map((_, i) => (
													<Cell
														key={i}
														fill={
															i === 2
																? neon.primary
																: "#1f2937"
														}
													/>
												))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</CardContent>
							</Card>

							<Card className="border-white/5 bg-linear-to-b from-neutral-900/80 via-neutral-900/60 to-black/80">
								<CardHeader className="pb-2">
									<CardTitle className="text-base">
										Anomaly Alerts
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2 text-sm text-amber-200">
									{anomalies.map((a) => (
										<div
											key={a}
											className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2">
											<ArrowUpRight className="mt-0.5 size-4" />{" "}
											{a}
										</div>
									))}
								</CardContent>
							</Card>
						</div>
					</div>
				</Section>

				{/* Staff optimization */}
				<Section
					title="Staff Optimization"
					actions={
						<div className="flex gap-2">
							<Button
								variant="outline"
								className="border-white/10 bg-white/5 text-white hover:bg-white/10"
								onClick={() => downloadCsv(staffCsv, "staff-export.csv")}>
								<CloudDownload className="size-4" /> CSV
							</Button>
							<Button
								variant="outline"
								className="border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
								onClick={exportStaffPdf}>
								PDF
							</Button>
						</div>
					}>
					<div className="grid gap-4 md:grid-cols-3">
						<Card className="border-white/5 bg-white/5 p-4 text-left text-sm text-zinc-200">
							<p className="text-xs text-zinc-400">Monthly Savings</p>
							<p className="text-2xl font-semibold text-emerald-300">
								{fmtCurrency(staffSummary.monthlySavings)}
							</p>
						</Card>
						<Card className="border-white/5 bg-white/5 p-4 text-left text-sm text-zinc-200">
							<p className="text-xs text-zinc-400">Staff Hours Reduced</p>
							<p className="text-2xl font-semibold text-emerald-300">
								{fmtNumber(staffSummary.hoursReduced)} hrs
							</p>
						</Card>
						<Card className="border-white/5 bg-white/5 p-4 text-left text-sm text-zinc-200">
							<p className="text-xs text-zinc-400">Avg Optimization</p>
							<p className="text-2xl font-semibold text-emerald-300">
								{(Number(staffSummary.optimizationPct) || 0).toFixed(1)}%
							</p>
						</Card>
					</div>
					{staffError && (
						<div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
							{staffError}
						</div>
					)}
					<div className="mt-4 space-y-3">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Time</TableHead>
									<TableHead>Expected Visitors</TableHead>
									<TableHead>Current Staff</TableHead>
									<TableHead>Recommended</TableHead>
									<TableHead>Cost Savings</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{staffRows.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={6}
											className="text-center text-sm text-zinc-400">
											{staffError ? "" : "No staff data yet."}
										</TableCell>
									</TableRow>
								) : (
									staffRows.map((row) => (
										<TableRow key={row.slot}>
											<TableCell>{row.slot}</TableCell>
											<TableCell>{row.expected}</TableCell>
											<TableCell>
												<input
													type="number"
													value={row.current}
													onChange={(e) =>
														setStaffRows((prev) =>
															prev.map((r) =>
																r.slot === row.slot
																	? recalcStaffRow(
																			{
																				...r,
																				current: Number(
																					e
																						.target
																						.value
																				),
																			}
																	  )
																	: r
															)
														)
													}
													className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white"
												/>
											</TableCell>
											<TableCell>{row.rec}</TableCell>
											<TableCell
												className={
													row.save >= 0
														? "text-emerald-300"
														: "text-amber-300"
												}>
												${row.save}
											</TableCell>
											<TableCell>
												<StatusBadge status={row.status} />
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
							<TableCaption>Editable cells allow overrides.</TableCaption>
						</Table>
						<div className="flex flex-wrap items-center gap-3">
							<Button
								onClick={() =>
									setStaffRows((rows) =>
										rows.map((r) =>
											recalcStaffRow({ ...r, current: r.rec })
										)
									)
								}
								className="bg-emerald-500 text-black hover:bg-emerald-400">
								<ShieldCheck className="size-4" /> Apply Recommendations
							</Button>
							<Button
								variant="outline"
								className="border-white/10 bg-white/5 text-white hover:bg-white/10">
								Export Excel/PDF
							</Button>
						</div>
					</div>
				</Section>

				{/* Reports */}
				<Section
					title="Report Generation"
					actions={
						<Button
							onClick={handleGenerateReport}
							className="bg-emerald-500 text-black hover:bg-emerald-400"
							disabled={reportLoading}>
							{reportLoading ? "Generating..." : "Generate Report"}
						</Button>
					}>
					<div className="grid gap-6 lg:grid-cols-2">
						<div className="space-y-4">
							<div className="grid gap-3 md:grid-cols-2">
								<label className="space-y-1 text-sm text-zinc-300">
									Report type
									<select
										value={reportType}
										onChange={(e) => setReportType(e.target.value)}
										className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white">
										<option>Daily</option>
										<option>Weekly</option>
										<option>Monthly</option>
									</select>
								</label>
								<label className="space-y-1 text-sm text-zinc-300">
									Date range
									<div className="flex items-center gap-2">
										<input
											type="date"
											value={dateRange.start}
											onChange={(e) =>
												setDateRange((r) => ({
													...r,
													start: e.target.value,
												}))
											}
											className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
										/>
										<input
											type="date"
											value={dateRange.end}
											onChange={(e) =>
												setDateRange((r) => ({
													...r,
													end: e.target.value,
												}))
											}
											className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
										/>
									</div>
								</label>
							</div>
							<label className="space-y-1 text-sm text-zinc-300">
								Recipient emails
								<input
									type="text"
									defaultValue="ops@heritage.com, director@heritage.com"
									className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
								/>
							</label>
							<label className="flex items-center gap-2 text-sm text-zinc-300">
								<input
									type="checkbox"
									defaultChecked
									className="h-4 w-4 rounded border-white/20 bg-white/10"
								/>{" "}
								Schedule automatic reports
							</label>
							<div className="flex flex-wrap gap-2">
								<Button
									variant="outline"
									className="border-white/10 bg-white/5 text-white hover:bg-white/10">
									Download PDF
								</Button>
								<Button
									variant="outline"
									className="border-white/10 bg-white/5 text-white hover:bg-white/10">
									Download Excel
								</Button>
								<Button
									variant="outline"
									className="border-white/10 bg-white/5 text-white hover:bg-white/10">
									Download CSV
								</Button>
							</div>
						</div>

						<Card className="border-white/5 bg-white/5 p-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-zinc-400">Preview</p>
									<p className="text-xl font-semibold text-white">
										{reportType} Summary
									</p>
								</div>
								<Layers className="size-5 text-emerald-300" />
							</div>
							<div className="mt-4 space-y-3 text-sm text-zinc-200">
								{reportLoading ? (
									<div className="space-y-2">
										<Skeleton className="h-4 w-1/2" />
										<Skeleton className="h-4 w-2/3" />
										<Skeleton className="h-4 w-1/3" />
									</div>
								) : (
									<>
										<div className="flex items-center justify-between">
											<span>Totals visitors</span>
											<span className="font-semibold text-white">
												18,420
											</span>
										</div>
										<div className="flex items-center justify-between">
											<span>Peak day/hour</span>
											<span className="font-semibold text-white">
												Sat 4 PM
											</span>
										</div>
										<div className="flex items-center justify-between">
											<span>Revenue (if available)</span>
											<span className="font-semibold text-white">
												$128,400
											</span>
										</div>
										<div className="flex items-center justify-between">
											<span>Demographics</span>
											<span className="font-semibold text-white">
												62% domestic / 38% foreign
											</span>
										</div>
										<div className="flex items-center justify-between">
											<span>Staff performance</span>
											<span className="font-semibold text-white">
												91% SLA
											</span>
										</div>
									</>
								)}
							</div>
						</Card>
					</div>

					<div className="mt-6">
						<h3 className="mb-3 text-sm font-semibold text-white">
							Report History
						</h3>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Report</TableHead>
									<TableHead>Date</TableHead>
									<TableHead>Download</TableHead>
									<TableHead>Delete</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{history.map((h) => (
									<TableRow key={h.id}>
										<TableCell>{h.name}</TableCell>
										<TableCell>{h.date}</TableCell>
										<TableCell>
											<Button
												size="sm"
												variant="outline"
												className="border-white/10 bg-white/5 text-white hover:bg-white/10">
												Download
											</Button>
										</TableCell>
										<TableCell>
											<Button
												size="sm"
												variant="outline"
												className="border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20"
												onClick={() =>
													setHistory((prev) =>
														prev.filter(
															(x) => x.id !== h.id
														)
													)
												}>
												Delete
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</Section>
			</div>

			{selectedZone && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
					<div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-2xl">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-zinc-400">Zone</p>
								<h3 className="text-2xl font-semibold text-white">
									{selectedZone.name}
								</h3>
							</div>
							<Button
								variant="outline"
								className="border-white/10 bg-white/5 text-white hover:bg-white/10"
								onClick={() => setSelectedZone(null)}>
								Close
							</Button>
						</div>
						<div className="mt-4 grid gap-4 md:grid-cols-3">
							<Card className="border-white/5 bg-white/5 p-4 text-sm text-zinc-200">
								<p className="text-xs text-zinc-400">Current visitors</p>
								<p className="text-2xl font-semibold text-white">
									{selectedZone.visitors}
								</p>
							</Card>
							<Card className="border-white/5 bg-white/5 p-4 text-sm text-zinc-200">
								<p className="text-xs text-zinc-400">Capacity</p>
								<p className="text-2xl font-semibold text-white">
									{selectedZone.capacity}%
								</p>
							</Card>
							<Card className="border-white/5 bg-white/5 p-4 text-sm text-zinc-200">
								<p className="text-xs text-zinc-400">Staff vs rec</p>
								<p className="text-2xl font-semibold text-white">
									{selectedZone.staff}/{selectedZone.rec}
								</p>
							</Card>
						</div>
						<div className="mt-6 h-64">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart
									data={Array.from({ length: 12 }, (_, i) => ({
										hour: `${8 + i}:00`,
										visitors: Math.max(
											60,
											selectedZone.visitors +
												Math.round(Math.sin(i / 1.8) * 40) -
												40
										),
									}))}>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke="#ffffff0f"
									/>
									<XAxis dataKey="hour" stroke="#9ca3af" />
									<YAxis stroke="#9ca3af" />
									<Tooltip
										contentStyle={{
											background: "#0b0b0d",
											border: "1px solid #1f2937",
											borderRadius: 12,
											color: "#fff",
										}}
									/>
									<Line
										type="monotone"
										dataKey="visitors"
										stroke={neon.primary}
										strokeWidth={3}
										dot
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
						<div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-300">
							<span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200">
								Peak time {selectedZone.peak}
							</span>
							<span className="rounded-full bg-white/5 px-3 py-1 text-zinc-200">
								Staff gap{" "}
								{selectedZone.rec - selectedZone.staff >= 0
									? `+${selectedZone.rec - selectedZone.staff}`
									: "0"}
							</span>
							<span className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-200">
								Prediction: +12% next hour
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
