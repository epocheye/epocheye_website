// Turns the rows from lib/server/play/stats.js into what the /play/admin page draws. Pure, no
// database and no React. Labels (chapter titles, choice and vote wording) come from each site's
// published story; an id the story does not have is shown as the id.

import { textFor } from "@/lib/play/story/engine";

function allBeats(story) {
	const out = [];
	for (const ch of story?.chapters || []) for (const b of ch.beats || []) out.push({ beat: b, chapter: ch.id });
	for (const b of story?.ending?.beats || []) out.push({ beat: b, chapter: null });
	return out;
}

const say = (story, value) => textFor(value, story?.default_lens || "traveller", story?.default_lens || "traveller");

export function pct(n, d) {
	return d > 0 ? Math.round((n / d) * 1000) / 10 : null;
}

// stories: Map slug -> { name, story } for the sites in play.
export function funnelView(rows, stories) {
	const bySite = new Map();
	for (const r of rows || []) {
		if (!bySite.has(r.site)) bySite.set(r.site, []);
		bySite.get(r.site).push(r);
	}
	const out = [];
	for (const [slug, list] of bySite) {
		const story = stories.get(slug)?.story;
		const get = (name, chapter = null) => list.find((r) => r.name === name && (r.chapter ?? null) === chapter)?.players || 0;
		const chapters = (story?.chapters || []).map((c) => ({ id: c.id, title: c.title || "", preview: !!c.preview }));
		const known = new Set(chapters.map((c) => c.id));
		const extra = [...new Set(list.filter((r) => r.chapter && !known.has(r.chapter)).map((r) => r.chapter))].sort();
		for (const id of extra) chapters.push({ id, title: "(not in the published story)", preview: false });

		const start = get("start");
		const steps = [{ key: "start", label: "Opened the level", players: start }];
		for (const c of chapters) {
			const name = `${c.id}${c.title ? `  ${c.title}` : ""}${c.preview ? " (preview)" : ""}`;
			const s = get("chapter_start", c.id);
			const f = get("chapter_finish", c.id);
			// A preview chapter sits outside the story order: shown only when someone played it.
			if (c.preview && !s && !f) continue;
			steps.push({ key: `${c.id}:s`, label: `${name}: started`, players: s, chapter: c.id, preview: c.preview });
			steps.push({ key: `${c.id}:f`, label: `${name}: finished`, players: f, chapter: c.id, preview: c.preview, finish: true });
		}
		steps.push({ key: "complete", label: "Completed the level", players: get("complete") });

		// Drop-off runs along the story order; a preview step has its own and does not break the chain.
		const top = Math.max(start, ...steps.map((s) => s.players), 1);
		let prev = null;
		let prevPreview = null;
		for (const s of steps) {
			const base = s.preview ? (s.finish ? prevPreview : prev) : prev;
			s.ofStart = pct(s.players, start);
			s.width = (s.players / top) * 100;
			s.drop = base != null && base > 0 ? Math.round(((base - s.players) / base) * 1000) / 10 : null;
			if (s.preview) prevPreview = s.players;
			else prev = s.players;
		}
		out.push({ slug, name: stories.get(slug)?.name || slug, steps, start, complete: get("complete") });
	}
	return out.sort((a, b) => b.start - a.start);
}

// Pick split per choice beat: options in story order, first picks and all picks.
export function choicesView(rows, stories) {
	const groups = new Map();
	for (const r of rows || []) {
		const key = `${r.site}|${r.beat}`;
		if (!groups.has(key)) groups.set(key, { site: r.site, chapter: r.chapter, beat: r.beat, options: [] });
		groups.get(key).options.push(r);
	}
	const out = [];
	for (const g of groups.values()) {
		const story = stories.get(g.site)?.story;
		const found = allBeats(story).find((x) => x.beat.id === g.beat && x.beat.type === "choice");
		const order = (found?.beat.options || []).map((o) => o.id);
		const firstTotal = g.options.reduce((a, o) => a + o.first_players, 0);
		const options = g.options
			.map((o) => {
				const opt = found?.beat.options?.find((x) => x.id === o.option);
				return {
					id: o.option,
					label: opt ? say(story, opt.text) : "",
					accepted: opt ? !!opt.accepted : !!o.accepted,
					first: o.first_players,
					picks: o.picks,
					share: pct(o.first_players, firstTotal),
				};
			})
			.sort((a, b) => {
				const ia = order.indexOf(a.id);
				const ib = order.indexOf(b.id);
				return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || String(a.id).localeCompare(String(b.id));
			});
		out.push({
			site: g.site,
			siteName: stories.get(g.site)?.name || g.site,
			chapter: found?.chapter || g.chapter || "",
			beat: g.beat,
			question: found ? say(story, found.beat.text) : "",
			firstTotal,
			options,
		});
	}
	return out.sort((a, b) => a.site.localeCompare(b.site) || String(a.beat).localeCompare(String(b.beat)));
}

// Year vote split per site, options in the story's order.
export function yearVoteView(rows, stories) {
	const bySite = new Map();
	for (const r of rows || []) {
		if (!bySite.has(r.site)) bySite.set(r.site, new Map());
		bySite.get(r.site).set(r.option_id, r.votes);
	}
	const out = [];
	for (const [slug, counts] of bySite) {
		const story = stories.get(slug)?.story;
		const beat = allBeats(story).find((x) => x.beat.type === "vote")?.beat;
		const ids = [...(beat?.options || []).map((o) => o.id)];
		for (const id of counts.keys()) if (!ids.includes(id)) ids.push(id);
		const total = [...counts.values()].reduce((a, n) => a + n, 0);
		out.push({
			slug,
			name: stories.get(slug)?.name || slug,
			question: beat ? say(story, beat.text) : "",
			total,
			options: ids.map((id) => {
				const opt = beat?.options?.find((o) => o.id === id);
				return { id, label: opt ? say(story, opt.text) : `${id} (not in the published story)`, votes: counts.get(id) || 0, share: pct(counts.get(id) || 0, total) };
			}),
		});
	}
	return out;
}

// Daily: plays per day with the share answered right, and streak buckets.
export function dailyView(days, streaks) {
	const max = Math.max(1, ...(days || []).map((d) => d.plays));
	const rows = (days || []).map((d) => ({ ...d, width: (d.plays / max) * 100, right: pct(d.correct, d.plays) }));
	const buckets = [
		{ label: "1 day", test: (n) => n === 1 },
		{ label: "2 days", test: (n) => n === 2 },
		{ label: "3 to 6 days", test: (n) => n >= 3 && n <= 6 },
		{ label: "7 to 13 days", test: (n) => n >= 7 && n <= 13 },
		{ label: "14 days or more", test: (n) => n >= 14 },
	].map((b) => ({
		label: b.label,
		players: (streaks || []).filter((s) => b.test(s.len)).length,
		running: (streaks || []).filter((s) => b.test(s.len) && s.running).length,
	}));
	return {
		rows,
		plays: rows.reduce((a, d) => a + d.plays, 0),
		correct: rows.reduce((a, d) => a + d.correct, 0),
		buckets,
		top: (streaks || []).slice(0, 10),
	};
}

// Weekly vote: one block per week, choices by votes.
export function weeklyView(rows, siteName) {
	const weeks = new Map();
	for (const r of rows || []) {
		if (!weeks.has(r.week)) weeks.set(r.week, []);
		weeks.get(r.week).push(r);
	}
	return [...weeks.entries()].map(([week, list]) => {
		const total = list.reduce((a, r) => a + r.votes, 0);
		return {
			week,
			total,
			choices: list.map((r) => ({ id: r.site_choice, label: siteName(r.site_choice), votes: r.votes, binding: r.binding, share: pct(r.votes, total) })),
		};
	});
}

// Rows of { label, value, sub } for a simple bar list.
export function barRows(items) {
	const max = Math.max(1, ...items.map((i) => i.value || 0));
	return items.map((i) => ({ ...i, width: ((i.value || 0) / max) * 100 }));
}
