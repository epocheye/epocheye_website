// Building blocks for /play/admin, in the same dark look as app/admin. Server components: no
// hooks, no client code. Bars are plain CSS widths, no chart library.

const n = (v) => Number(v ?? 0).toLocaleString("en-IN");

export function fmtPct(v) {
	return v == null ? "" : `${v}%`;
}

export function Num({ value }) {
	return <>{n(value)}</>;
}

export function Section({ title, note, error, children, id }) {
	return (
		<section id={id} className="bg-[#0d0d0d] border border-white/5 rounded-xl p-4 md:p-5 min-w-0">
			<div className="mb-4">
				<h2 className="text-sm font-semibold text-white">{title}</h2>
				{note ? <p className="text-xs text-white/35 mt-1 leading-relaxed">{note}</p> : null}
			</div>
			{error ? <p className="text-xs text-red-300/80">{error}. The rest of the page is unaffected.</p> : children}
		</section>
	);
}

export function Empty({ children = "Nothing in this range." }) {
	return <p className="text-xs text-white/30">{children}</p>;
}

export function StatCard({ label, value, sub }) {
	return (
		<div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-4">
			<p className="text-[11px] text-white/35 uppercase tracking-widest">{label}</p>
			<p className="text-2xl font-semibold text-white mt-2 tabular-nums">{value}</p>
			{sub ? <p className="text-xs text-white/30 mt-1">{sub}</p> : null}
		</div>
	);
}

function Bar({ width, strong = false, label }) {
	return (
		<div className="h-2 w-full rounded-full bg-white/5 overflow-hidden" role="img" aria-label={label}>
			<div className={`h-full rounded-full ${strong ? "bg-white/80" : "bg-white/35"}`} style={{ width: `${Math.max(0, Math.min(100, width || 0))}%` }} />
		</div>
	);
}

// A table whose last column is a bar. columns: [{ key, label, align, render }]
export function BarTable({ rows, columns, barKey = "width", strongKey, caption }) {
	if (!rows?.length) return <Empty />;
	return (
		<div className="overflow-x-auto -mx-1">
			<table className="w-full text-xs border-collapse min-w-[520px]">
				{caption ? <caption className="sr-only">{caption}</caption> : null}
				<thead>
					<tr className="text-white/35 text-left">
						{columns.map((c) => (
							<th key={c.key} scope="col" className={`font-normal py-1.5 px-1 ${c.align === "right" ? "text-right" : ""}`}>
								{c.label}
							</th>
						))}
						<th scope="col" className="font-normal py-1.5 px-1 w-[32%]">
							<span className="sr-only">Bar</span>
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((r, i) => (
						<tr key={r.key ?? i} className="border-t border-white/5 text-white/75">
							{columns.map((c) => (
								<td key={c.key} className={`py-1.5 px-1 align-middle ${c.align === "right" ? "text-right tabular-nums" : ""}`}>
									{c.render ? c.render(r) : r[c.key]}
								</td>
							))}
							<td className="py-1.5 px-1 align-middle">
								<Bar width={r[barKey]} strong={strongKey ? !!r[strongKey] : false} label={`${Math.round(r[barKey] || 0)} percent of the largest`} />
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function Pill({ children }) {
	return <span className="inline-block text-[10px] uppercase tracking-wider text-white/50 border border-white/10 rounded-full px-1.5 py-px ml-1.5 align-middle">{children}</span>;
}

export { n as fmt };
