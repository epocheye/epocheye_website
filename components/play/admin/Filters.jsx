// The filter bar for /play/admin: a plain GET form, so it works with no client code and every
// view has its own URL. Quick ranges keep the other filters.

import Link from "next/link";

const field = "bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white/80 focus:outline-none focus:border-white/30";

function hrefWith(base, params) {
	const q = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
	const s = q.toString();
	return s ? `${base}?${s}` : base;
}

export default function Filters({ filters, options, sites, quick }) {
	const keep = { src: filters.source || "", c: filters.code || "", site: filters.site || "" };
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-1 bg-[#0d0d0d] border border-white/5 rounded-lg p-1 self-start">
				{quick.map((q) => (
					<Link
						key={q.days}
						href={hrefWith("/play/admin", { from: q.from, to: q.to, ...keep })}
						className={`px-3 py-1.5 rounded-md text-xs transition-colors ${q.active ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
					>
						{q.days}d
					</Link>
				))}
			</div>
			<form method="get" action="/play/admin" className="flex flex-wrap items-end gap-2">
				<label className="flex flex-col gap-1 text-[11px] text-white/40">
					From
					<input type="date" name="from" defaultValue={filters.from} className={field} />
				</label>
				<label className="flex flex-col gap-1 text-[11px] text-white/40">
					To
					<input type="date" name="to" defaultValue={filters.to} className={field} />
				</label>
				<label className="flex flex-col gap-1 text-[11px] text-white/40">
					Site
					<select name="site" defaultValue={filters.site || ""} className={field}>
						<option value="">All sites</option>
						{sites.map((s) => (
							<option key={s.slug} value={s.slug}>
								{s.name}
							</option>
						))}
					</select>
				</label>
				<label className="flex flex-col gap-1 text-[11px] text-white/40">
					Source
					<select name="src" defaultValue={filters.source || ""} className={field}>
						<option value="">Any source</option>
						{options.sources.map((s) => (
							<option key={s} value={s}>
								{s}
							</option>
						))}
					</select>
				</label>
				<label className="flex flex-col gap-1 text-[11px] text-white/40">
					Creator code
					<select name="c" defaultValue={filters.code || ""} className={field}>
						<option value="">Any or none</option>
						{options.codes.map((s) => (
							<option key={s} value={s}>
								{s}
							</option>
						))}
					</select>
				</label>
				<button type="submit" className="border border-white/20 rounded-full px-4 py-1.5 text-xs text-white/80 hover:border-white/50 hover:text-white transition-colors">
					Apply
				</button>
				<Link href="/play/admin" className="text-xs text-white/35 hover:text-white/70 px-2 py-1.5">
					Reset
				</Link>
			</form>
		</div>
	);
}
