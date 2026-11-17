import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyAdminJWT } from "@/lib/server/adminAuth";
import { SITES, getSite } from "@/lib/play/sites";
import { filterOptions, playStats } from "@/lib/server/play/stats";
import { storyFor } from "@/lib/server/play/story";
import { creatorCodeShape, slugOf, sourceOf } from "@/lib/server/play/validate";
import Dashboard from "@/components/play/admin/Dashboard";
import Filters from "@/components/play/admin/Filters";
import { barRows, choicesView, dailyView, funnelView, pct, weeklyView, yearVoteView } from "@/components/play/admin/view";

export const metadata = { title: "Play dashboard | Epocheye", robots: { index: false, follow: false } };

// Live numbers, never cached.
export const dynamic = "force-dynamic";

const DAY_MS = 86400000;
const MAX_SPAN_DAYS = 400;
const QUICK = [7, 30, 90];

function ymd(d) {
	return d.toISOString().slice(0, 10);
}

function dateOf(value) {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
	const d = new Date(`${value}T00:00:00Z`);
	return Number.isNaN(d.getTime()) || ymd(d) !== value ? null : d;
}

// Filters from the address, each checked. Anything malformed falls back to its default.
function filtersOf(sp) {
	const today = new Date(`${ymd(new Date())}T00:00:00Z`);
	let to = dateOf(sp.to) || today;
	let from = dateOf(sp.from) || new Date(to.getTime() - 29 * DAY_MS);
	if (from > to) [from, to] = [to, from];
	if ((to - from) / DAY_MS > MAX_SPAN_DAYS) from = new Date(to.getTime() - MAX_SPAN_DAYS * DAY_MS);
	const site = slugOf(sp.site);
	return {
		from: ymd(from),
		to: ymd(to),
		source: sourceOf(sp.src),
		code: creatorCodeShape(sp.c),
		site: site && getSite(site) ? site : null,
	};
}

function duration(s) {
	if (s == null) return "";
	const sec = Math.round(Number(s));
	return `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s`;
}

// Behind the same admin check as /admin, before anything is read or rendered.
export default async function PlayAdminPage({ searchParams }) {
	const auth = await verifyAdminJWT();
	if (!auth.ok) redirect("/admin/login");

	const f = filtersOf((await searchParams) ?? {});
	const [stats, options] = await Promise.all([playStats(f), filterOptions()]);

	// Every site the data mentions plus every playable one, with its published story for labels.
	const slugs = new Set(SITES.filter((s) => s.version && s.status === "live").map((s) => s.slug));
	for (const r of stats.funnel.rows || []) slugs.add(r.site);
	for (const r of stats.choices.rows || []) slugs.add(r.site);
	for (const r of stats.yearVotes.rows || []) slugs.add(r.site);
	const stories = new Map();
	await Promise.all(
		[...slugs].map(async (slug) => {
			const entry = getSite(slug);
			const loaded = await storyFor(slug);
			stories.set(slug, { name: entry?.name || slug, story: loaded?.site?.story || null });
		}),
	);
	const siteName = (slug) => getSite(slug)?.name || slug;

	const funnelSites = funnelView(stats.funnel.rows, stories);
	const starts = funnelSites.reduce((a, s) => a + s.start, 0);
	const completes = funnelSites.reduce((a, s) => a + s.complete, 0);
	const completeBySite = new Map(funnelSites.map((s) => [s.slug, s.complete]));
	const detailRows = stats.details.rows || [];
	const detailsOf = (names) => barRows(detailRows.filter((r) => names.includes(r.name)).map((r) => ({ ...r, site: r.site ? siteName(r.site) : "(none)", value: r.events })));
	const lensTotals = new Map();
	for (const r of stats.lenses.rows || []) lensTotals.set(r.site, (lensTotals.get(r.site) || 0) + r.players);
	const daily = dailyView(stats.daily.rows, stats.streaks.rows);
	const yearItems = yearVoteView(stats.yearVotes.rows, stories);
	const linkWith = (params) => {
		const q = new URLSearchParams({ from: f.from, to: f.to });
		if (f.source) q.set("src", f.source);
		if (f.site) q.set("site", f.site);
		for (const [k, v] of Object.entries(params)) q.set(k, v);
		return `/play/admin?${q}`;
	};

	const v = {
		totals: {
			starts,
			completes,
			completeRate: starts ? `${pct(completes, starts)}% of opened` : "",
			proofPlayers: (stats.proof.rows || []).reduce((a, r) => a + r.players, 0),
			yearVotes: yearItems.reduce((a, s) => a + s.total, 0),
			shares: detailRows.filter((r) => r.name === "share").reduce((a, r) => a + r.events, 0),
			emailEvents: detailRows.filter((r) => r.name === "email_given").reduce((a, r) => a + r.events, 0),
			emailsStored: stats.emailsStored.rows?.[0]?.emails ?? 0,
			cta: detailRows.filter((r) => r.name === "cta_click").reduce((a, r) => a + r.events, 0),
		},
		funnel: { error: stats.funnel.error, sites: funnelSites },
		runs: {
			error: stats.runs.error,
			rows: barRows(
				(stats.runs.rows || []).map((r) => ({
					...r,
					name: siteName(r.site),
					median: duration(r.median_s),
					accuracy: r.accuracy == null ? "" : `${Math.round(Number(r.accuracy) * 1000) / 10}%`,
					value: r.runs,
				})),
			),
		},
		lenses: {
			error: stats.lenses.error,
			rows: barRows((stats.lenses.rows || []).map((r) => ({ ...r, site: siteName(r.site), share: pct(r.players, lensTotals.get(r.site) || 0), value: r.players }))),
		},
		choices: { error: stats.choices.error, items: choicesView(stats.choices.rows, stories) },
		proof: {
			error: stats.proof.error,
			rows: barRows((stats.proof.rows || []).map((r) => ({ ...r, name: siteName(r.site), ofComplete: pct(r.players, completeBySite.get(r.site) || 0), value: r.players }))),
		},
		yearVotes: { error: stats.yearVotes.error, items: yearItems },
		details: { error: stats.details.error, share: detailsOf(["share"]), email: detailsOf(["email_given", "unlock"]), cta: detailsOf(["cta_click"]) },
		emailsError: stats.emailsStored.error,
		daily,
		dailyError: stats.daily.error,
		dailyStarts: stats.dailyStarts.rows?.[0] || { players: 0, events: 0 },
		streaksError: stats.streaks.error,
		streakRows: barRows(daily.buckets.map((b) => ({ ...b, value: b.players }))),
		weekly: { error: stats.weekly.error, items: weeklyView(stats.weekly.rows, siteName) },
		bySource: { error: stats.bySource.error, rows: barRows((stats.bySource.rows || []).map((r) => ({ ...r, value: r.starts }))) },
		byCreator: {
			error: stats.byCreator.error,
			rows: barRows((stats.byCreator.rows || []).map((r) => ({ ...r, value: r.starts, href: linkWith({ c: r.key }) }))),
		},
	};

	// A filter value from the address stays selectable even if no event has it yet.
	const sources = f.source && !options.sources.includes(f.source) ? [...options.sources, f.source] : options.sources;
	const codes = f.code && !options.codes.includes(f.code) ? [...options.codes, f.code] : options.codes;
	const today = ymd(new Date());
	const quick = QUICK.map((days) => {
		const from = ymd(new Date(new Date(`${today}T00:00:00Z`).getTime() - (days - 1) * DAY_MS));
		return { days, from, to: today, active: f.to === today && f.from === from };
	});
	const siteOptions = SITES.filter((s) => s.status !== "dev" || process.env.NODE_ENV !== "production").map(({ slug, name }) => ({ slug, name }));

	return (
		<div className="min-h-screen bg-[#080808] text-white">
			<div className="p-4 md:p-8 max-w-[1500px] mx-auto flex flex-col gap-5">
				<header className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p className="text-[11px] text-white/35 uppercase tracking-widest">Epocheye Play</p>
						<h1 className="text-lg font-semibold text-white mt-1">Dashboard</h1>
						<p className="text-xs text-white/35 mt-1">
							{f.from} to {f.to}, UTC (the daily and the weekly vote run on India time)
							{f.site ? `, ${siteName(f.site)}` : ""}
							{f.source ? `, source ${f.source}` : ""}
							{f.code ? `, creator ${f.code}` : ""}. Cookieless: a player is an anonymous browser id. With Do Not Track or Global Privacy Control on, no analytics events are stored and no creator code or source is kept; that player&apos;s runs, daily results and votes still are.
						</p>
					</div>
					<nav className="flex items-center gap-2 text-xs">
						<Link href="/play/admin/voice" className="border border-white/15 rounded-full px-3 py-1.5 text-white/70 hover:text-white hover:border-white/40 transition-colors">
							Voice review
						</Link>
						<Link href="/admin" className="border border-white/15 rounded-full px-3 py-1.5 text-white/70 hover:text-white hover:border-white/40 transition-colors">
							Admin
						</Link>
					</nav>
				</header>
				<Filters filters={f} options={{ sources, codes }} sites={siteOptions} quick={quick} />
				<Dashboard v={v} />
			</div>
		</div>
	);
}
