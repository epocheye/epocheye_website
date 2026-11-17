// The /play/admin dashboard body. Server component: gets the finished view models from the page.
// Internal page, so counts are shown. The no-counts rule (brief 5.6) is for what players see.

import Link from "next/link";
import { BarTable, Empty, Pill, Section, StatCard, fmt, fmtPct } from "@/components/play/admin/parts";

function Funnel({ site }) {
	return (
		<div className="flex flex-col gap-1 mb-6 last:mb-0">
			<div className="flex items-baseline justify-between gap-3 mb-2">
				<h3 className="text-xs font-semibold text-white/80">{site.name}</h3>
				<p className="text-[11px] text-white/35 tabular-nums">
					{fmt(site.start)} opened, {fmt(site.complete)} completed
					{site.start ? ` (${Math.round((site.complete / site.start) * 1000) / 10}%)` : ""}
				</p>
			</div>
			<BarTable
				caption={`Chapter drop-off for ${site.name}`}
				rows={site.steps}
				strongKey="finish"
				columns={[
					{ key: "label", label: "Step", render: (r) => <span className={r.finish ? "text-white/90" : "text-white/55"}>{r.label}</span> },
					{ key: "players", label: "Players", align: "right", render: (r) => fmt(r.players) },
					{ key: "ofStart", label: "Of opened", align: "right", render: (r) => fmtPct(r.ofStart) },
					{ key: "drop", label: "Lost since previous step", align: "right", render: (r) => (r.drop == null ? "" : `${r.drop}%`) },
				]}
			/>
		</div>
	);
}

function DetailTable({ rows }) {
	return (
		<BarTable
			rows={rows}
			columns={[
				{ key: "site", label: "Site" },
				{ key: "detail", label: "Kind", render: (r) => r.detail || "(not given)" },
				{ key: "events", label: "Events", align: "right", render: (r) => fmt(r.events) },
				{ key: "players", label: "Players", align: "right", render: (r) => fmt(r.players) },
			]}
		/>
	);
}

export default function Dashboard({ v }) {
	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
				<StatCard label="Opened a level" value={fmt(v.totals.starts)} sub="players" />
				<StatCard label="Completed" value={fmt(v.totals.completes)} sub={v.totals.completeRate} />
				<StatCard label="Proof toggle" value={fmt(v.totals.proofPlayers)} sub="players used it" />
				<StatCard label="Year votes" value={fmt(v.totals.yearVotes)} sub="stored votes" />
				<StatCard label="Shares" value={fmt(v.totals.shares)} sub="events" />
				<StatCard label="Emails confirmed" value={fmt(v.totals.emailsStored)} sub={`${fmt(v.totals.emailEvents)} email events`} />
				<StatCard label="CTA clicks" value={fmt(v.totals.cta)} sub="events" />
				<StatCard label="Daily plays" value={fmt(v.daily.plays)} sub={`${fmt(v.daily.correct)} right`} />
			</div>

			<Section
				id="funnel"
				title="Chapter by chapter drop-off"
				note="Distinct players (anonymous ids) who reached each step in the range. Started counts the chapter_start event, finished counts chapter_finish. Lost since previous step is the share of the step above who did not reach this one. A player who resumes mid-level can appear in a later step without the earlier ones."
				error={v.funnel.error}
			>
				{v.funnel.sites.length ? v.funnel.sites.map((s) => <Funnel key={s.slug} site={s} />) : <Empty />}
			</Section>

			<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
				<Section title="Runs recorded by the server" note="From play_runs, by the run's start time. Median time and accuracy are over completed runs." error={v.runs.error}>
					<BarTable
						rows={v.runs.rows}
						columns={[
							{ key: "name", label: "Site" },
							{ key: "runs", label: "Runs", align: "right", render: (r) => fmt(r.runs) },
							{ key: "completed", label: "Completed", align: "right", render: (r) => fmt(r.completed) },
							{ key: "median", label: "Median time", align: "right" },
							{ key: "accuracy", label: "Accuracy", align: "right" },
						]}
					/>
				</Section>

				<Section title="Lens chosen" note="Distinct players per lens (lens event)." error={v.lenses.error}>
					<BarTable
						rows={v.lenses.rows}
						columns={[
							{ key: "site", label: "Site" },
							{ key: "lens", label: "Lens", render: (r) => r.lens || "(not given)" },
							{ key: "players", label: "Players", align: "right", render: (r) => fmt(r.players) },
							{ key: "share", label: "Share", align: "right", render: (r) => fmtPct(r.share) },
						]}
					/>
				</Section>
			</div>

			<Section
				title="Choices: how players picked"
				note="First pick per player is the split. All picks include players who changed their mind or replayed. Accepted marks the options the story accepts."
				error={v.choices.error}
			>
				{v.choices.items.length ? (
					<div className="flex flex-col gap-6">
						{v.choices.items.map((c) => (
							<div key={`${c.site}|${c.beat}`}>
								<p className="text-xs text-white/80 mb-1">
									<span className="text-white/40">{c.siteName}, {c.chapter || "?"}, {c.beat}.</span> {c.question}
								</p>
								<BarTable
									rows={c.options.map((o) => ({ ...o, width: o.share ?? 0 }))}
									strongKey="accepted"
									columns={[
										{ key: "id", label: "Option", render: (o) => <span>{o.id}{o.accepted ? <Pill>accepted</Pill> : null}</span> },
										{ key: "label", label: "Wording", render: (o) => <span className="text-white/55">{o.label}</span> },
										{ key: "first", label: "First picks", align: "right", render: (o) => fmt(o.first) },
										{ key: "share", label: "Split", align: "right", render: (o) => fmtPct(o.share) },
										{ key: "picks", label: "All picks", align: "right", render: (o) => fmt(o.picks) },
									]}
								/>
							</div>
						))}
					</div>
				) : (
					<Empty />
				)}
			</Section>

			<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
				<Section title="Proof toggle" note="Players who pressed it, and how often it went on and off. Of completed is against players who completed the level." error={v.proof.error}>
					<BarTable
						rows={v.proof.rows}
						columns={[
							{ key: "name", label: "Site" },
							{ key: "players", label: "Players", align: "right", render: (r) => fmt(r.players) },
							{ key: "ofComplete", label: "Of completed", align: "right", render: (r) => fmtPct(r.ofComplete) },
							{ key: "turned_on", label: "On", align: "right", render: (r) => fmt(r.turned_on) },
							{ key: "turned_off", label: "Off", align: "right", render: (r) => fmt(r.turned_off) },
						]}
					/>
				</Section>

				<Section
					title="Year vote"
					note="Stored votes (one per player per site, the latest pick), by when the vote was last changed. Players see percentages only once a site has 20 votes."
					error={v.yearVotes.error}
				>
					{v.yearVotes.items.length ? (
						v.yearVotes.items.map((s) => (
							<div key={s.slug} className="mb-4 last:mb-0">
								<p className="text-xs text-white/80 mb-1">
									<span className="text-white/40">{s.name}.</span> {s.question} <span className="text-white/35">({fmt(s.total)} votes)</span>
								</p>
								<BarTable
									rows={s.options.map((o) => ({ ...o, width: o.share ?? 0 }))}
									columns={[
										{ key: "label", label: "Option" },
										{ key: "votes", label: "Votes", align: "right", render: (o) => fmt(o.votes) },
										{ key: "share", label: "Share", align: "right", render: (o) => fmtPct(o.share) },
									]}
								/>
							</div>
						))
					) : (
						<Empty />
					)}
				</Section>
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
				<Section title="Shares" note="share events, by what was shared." error={v.details.error}>
					<DetailTable rows={v.details.share} />
				</Section>
				<Section
					title="Emails given"
					note={`email_given and unlock events, by reason. Confirmed with consent in the range: ${fmt(v.totals.emailsStored)} (site filter does not apply to that number).`}
					error={v.details.error || v.emailsError}
				>
					<DetailTable rows={v.details.email} />
				</Section>
				<Section title="CTA clicks" note="cta_click events, by button." error={v.details.error}>
					<DetailTable rows={v.details.cta} />
				</Section>
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
				<Section
					title="Daily: The Missing Piece"
					note={`Results stored per day (one per player per day), and the share answered right. daily_start events in the range: ${fmt(v.dailyStarts.events)} from ${fmt(v.dailyStarts.players)} players. The site filter does not apply here.`}
					error={v.dailyError}
				>
					<BarTable
						rows={v.daily.rows}
						columns={[
							{ key: "day", label: "Day" },
							{ key: "plays", label: "Plays", align: "right", render: (r) => fmt(r.plays) },
							{ key: "correct", label: "Right", align: "right", render: (r) => fmt(r.correct) },
							{ key: "right", label: "Right share", align: "right", render: (r) => fmtPct(r.right) },
						]}
					/>
				</Section>
				<Section
					title="Daily streaks"
					note="Consecutive days answered right. Each player's longest streak that reached into the range; running means it includes the last day of the range or the day before."
					error={v.streaksError}
				>
					<BarTable
						rows={v.streakRows}
						columns={[
							{ key: "label", label: "Longest streak" },
							{ key: "value", label: "Players", align: "right", render: (r) => fmt(r.value) },
							{ key: "running", label: "Still running", align: "right", render: (r) => fmt(r.running) },
						]}
					/>
					{v.daily.top.length ? (
						<ol className="mt-4 text-xs text-white/60 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
							{v.daily.top.map((s, i) => (
								<li key={i} className="flex justify-between gap-2 border-t border-white/5 py-1">
									<span>
										{i + 1}. {s.display_name}
										{s.running ? <Pill>running</Pill> : null}
									</span>
									<span className="tabular-nums text-white/80">{s.len} d</span>
								</li>
							))}
						</ol>
					) : null}
				</Section>
			</div>

			<Section title="Weekly vote: which site next" note="Counted votes per week (email confirmed), the same rule as the tally that decides the vote. Weeks start Monday, India time. Binding: votes of players who are founding members now. The site filter does not apply here." error={v.weekly.error}>
				{v.weekly.items.length ? (
					<div className="flex flex-col gap-4">
						{v.weekly.items.map((w) => (
							<div key={w.week}>
								<p className="text-xs text-white/50 mb-1">
									Week of {w.week} <span className="text-white/30">({fmt(w.total)} votes)</span>
								</p>
								<BarTable
									rows={w.choices.map((c) => ({ ...c, width: c.share ?? 0 }))}
									columns={[
										{ key: "label", label: "Site" },
										{ key: "votes", label: "Votes", align: "right", render: (c) => fmt(c.votes) },
										{ key: "binding", label: "Binding", align: "right", render: (c) => fmt(c.binding) },
										{ key: "share", label: "Share", align: "right", render: (c) => fmtPct(c.share) },
									]}
								/>
							</div>
						))}
					</div>
				) : (
					<Empty />
				)}
			</Section>

			<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
				<Section title="By source" note="Players who opened and completed a level, by where they came from." error={v.bySource.error}>
					<BarTable
						rows={v.bySource.rows}
						columns={[
							{ key: "key", label: "Source" },
							{ key: "starts", label: "Opened", align: "right", render: (r) => fmt(r.starts) },
							{ key: "completions", label: "Completed", align: "right", render: (r) => fmt(r.completions) },
						]}
					/>
				</Section>
				<Section title="By creator code" note="Codes are checked (read only) against active promo codes before they are stored." error={v.byCreator.error}>
					<BarTable
						rows={v.byCreator.rows}
						columns={[
							{ key: "key", label: "Code", render: (r) => (r.key === "(none)" ? r.key : <Link href={r.href} className="underline decoration-white/20 hover:decoration-white/60">{r.key}</Link>) },
							{ key: "starts", label: "Opened", align: "right", render: (r) => fmt(r.starts) },
							{ key: "completions", label: "Completed", align: "right", render: (r) => fmt(r.completions) },
						]}
					/>
				</Section>
			</div>
		</div>
	);
}
