#!/usr/bin/env node
// Epocheye Play content engine (brief 5.5): ready-to-post images and captions for one day.
//
//   node --env-file=.env.local tools/play/social/export.mjs [--date YYYY-MM-DD] [--site <slug>]
//        [--daily-dir <dir>]   where the daily files are (default content/play/daily)
//
// Writes into tools/play/social/out/<date>/ (git-ignored), per live site:
//   daily-teaser       the day's Missing Piece, no spoiler (needs content/play/daily/<slug>.json);
//                      one per day, for whichever site the game's schedule picks
//   know-<chapter>     each chapter's "you now know" card: one fact, its source, over that
//                      chapter's restored (THEN) view cut from the pack's panorama faces. Only
//                      chapters the published pack has, linked straight to the chapter (?ch=<n>)
//   year-vote          the year vote shares (only with at least 20 votes)
//   board-daily        the day's daily leaderboard, top 10 display names (only with a full 10)
//   board-site         the site's leaderboard, top 10 display names (only with a full 10)
// Each image comes as 1080x1350 (feed) and 1080x1920 (story) PNG, with a caption .txt.
//
// Read only. Nothing is written to the database. Words come only from story.json (facts marked
// verified) and from the database's generated display names. No player counts, no prices, no em
// or en dashes: every caption and every line drawn on an image is checked before it is written.
// Anything that cannot be made honestly is skipped and listed in SUMMARY.txt.

import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { neon } from "@neondatabase/serverless";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..", "..");
const { SITES } = await import(pathToFileURL(join(ROOT, "lib", "play", "sites.js")).href);
const { SITE_URL } = await import(pathToFileURL(join(ROOT, "lib", "site.js")).href);
const { puzzleForDay, formatDay, gameDay } = await import(pathToFileURL(join(ROOT, "lib", "play", "daily.js")).href);
const { ImageResponse } = await import(pathToFileURL(join(ROOT, "node_modules", "next", "dist", "compiled", "@vercel", "og", "index.node.js")).href);

const MIN_VOTES = 20; // the same floor the game uses before it shows any share (lib/server/play/yearVotes.js)
const BOARD_SIZE = 10; // a shorter board would say how few played
const SIZES = [
	{ key: "feed", width: 1080, height: 1350 },
	{ key: "story", width: 1080, height: 1920 },
];
const DASHES = /[‒–—―⸺⸻]/;

// ---------------------------------------------------------------- args

function argsOf(argv) {
	const out = { date: gameDay(), site: null, dailyDir: join(ROOT, "content", "play", "daily") };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--date") out.date = argv[++i];
		else if (argv[i] === "--site") out.site = argv[++i];
		else if (argv[i] === "--daily-dir") out.dailyDir = resolve(argv[++i]);
		else if (argv[i] === "--help" || argv[i] === "-h") out.help = true;
		else throw new Error(`Unknown argument: ${argv[i]}`);
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(out.date || "") || new Date(`${out.date}T00:00:00Z`).toISOString().slice(0, 10) !== out.date) {
		throw new Error(`--date must be YYYY-MM-DD, got ${out.date}`);
	}
	return out;
}

// ---------------------------------------------------------------- small helpers

const exists = (p) => access(p).then(() => true, () => false);
const traveller = (story, value) => {
	if (value == null) return "";
	if (typeof value === "string") return value;
	const lens = story.default_lens || "traveller";
	return value[lens] ?? value.traveller ?? Object.values(value)[0] ?? "";
};

function checkCopy(text, where) {
	if (DASHES.test(text)) throw new Error(`Copy rule: an em or en dash in ${where}: ${JSON.stringify(text)}`);
	if (/[₹$€£]\s?\d|\bINR\b|\bprice\b/i.test(text)) throw new Error(`Copy rule: a price in ${where}`);
	return text;
}

// A source line split at its semicolons, without the parts that point at our own working files
// (the palace research JSON), which mean nothing to a reader outside the project.
function publicSources(source) {
	return String(source || "")
		.split(";")
		.map((x) => x.trim())
		.filter((x) => x && !/\.json|research file/i.test(x));
}

// The main reference: the first public part of the source line.
function shortSource(source) {
	return publicSources(source)[0] || "";
}

function playLink(slug, chapter = null) {
	return `${SITE_URL}/play/${slug}${chapter != null ? `?ch=${chapter}` : ""}`;
}

function captionFooter(slug, chapter = null) {
	const link = playLink(slug, chapter);
	return [
		"",
		`Play it free: ${link}`,
		`Creators, use your own link: ${link}${chapter != null ? "&" : "?"}c=YOURCODE`,
	].join("\n");
}

// ---------------------------------------------------------------- pack images

// The cube face a viewpoint looks along: the face whose forward axis is closest to node.look,
// ignoring straight up and straight down.
function faceFor(site, node) {
	const look = node.look || [0, 1, 0];
	let best = null;
	for (const name of site.site.faces || []) {
		const f = site.site.face_axes?.[name]?.f;
		if (!f || Math.abs(f[2]) > 0.5) continue;
		const dot = f[0] * look[0] + f[1] * look[1] + f[2] * look[2];
		if (!best || dot > best.dot) best = { name, dot };
	}
	return best?.name || null;
}

const longDate = (day) => formatDay(day) || day;

// The site as it is today (NOW), from the first viewpoint that has a published NOW panorama.
async function todayView(packDir, site) {
	for (const node of site.nodes || []) {
		if (!(node.states || []).includes("now")) continue;
		const face = faceFor(site, node);
		if (!face) continue;
		for (const size of [...(site.site.sizes || [])].sort((a, b) => b - a)) {
			const file = join(packDir, "pano", node.id, "now", String(size), `${face}.webp`);
			if (await exists(file)) return { file, node, face, size };
		}
	}
	return null;
}

// The restored (THEN) face for the first of the chapter's viewpoints that the pack has published.
async function restoredView(packDir, site, nodeIds) {
	for (const id of nodeIds || []) {
		const node = site.nodes.find((n) => n.id === id);
		if (!node || !(node.states || []).includes("then")) continue;
		const face = faceFor(site, node);
		if (!face) continue;
		for (const size of [...(site.site.sizes || [])].sort((a, b) => b - a)) {
			const file = join(packDir, "pano", id, "then", String(size), `${face}.webp`);
			if (await exists(file)) return { file, node, face, size };
		}
	}
	return null;
}

// How much to lift a dark view so it reads in a feed: a gamma curve that raises the shadows and
// leaves white at white, aimed at a mean of about a quarter brightness, never more than 1.8.
// Interior viewpoints are exposed for the open light beyond them and come out near black.
async function liftFor(file) {
	const { channels } = await sharp(file).stats();
	const [r, g, b] = channels.map((c) => c.mean / 255);
	const mean = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	if (!(mean > 0) || mean >= 0.25) return 1;
	return Math.min(1.8, Math.log(mean) / Math.log(0.25));
}

// A background picture, cut to the frame, as a JPEG data URL for the image renderer.
async function backgroundData(file, width, height, lift = 1) {
	let img = sharp(file);
	if (lift > 1.01) img = img.gamma(1, lift);
	const buf = await img.resize(width, height, { fit: "cover", position: "centre" }).jpeg({ quality: 90 }).toBuffer();
	return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

// ---------------------------------------------------------------- rendering (next/og, same look as the card share image)

const h = (type, style, children) => ({ type, props: { style: { display: "flex", ...style }, children } });

function frame({ width, height, bg, top, middle, bottom }) {
	const pad = Math.round(width * 0.074);
	const layers = [];
	if (bg) {
		layers.push({ type: "img", props: { src: bg, width, height, style: { position: "absolute", left: 0, top: 0, width, height } } });
		layers.push(
			h("div", {
				position: "absolute", left: 0, top: 0, width, height,
				backgroundImage: "linear-gradient(180deg, rgba(8,8,8,0.55) 0%, rgba(8,8,8,0.15) 32%, rgba(8,8,8,0.55) 58%, rgba(8,8,8,0.92) 100%)",
			}, []),
		);
	}
	layers.push(
		h("div", {
			position: "absolute", left: 0, top: 0, width, height, flexDirection: "column", justifyContent: "space-between",
			padding: `${pad}px`, color: "#FFFFFF",
		}, [top, middle, bottom].filter(Boolean)),
	);
	return h("div", { width: "100%", height: "100%", position: "relative", background: "#0A0A0B" }, layers);
}

const small = { fontSize: 26, letterSpacing: 5, textTransform: "uppercase", color: "rgba(255,255,255,0.62)" };
const brand = (place) =>
	h("div", { flexDirection: "column", gap: 10 }, [
		h("div", { fontSize: 40, fontWeight: 600, letterSpacing: -1 }, "Epocheye Play"),
		place ? h("div", small, place) : null,
	].filter(Boolean));

async function renderPng(element, width, height) {
	const res = new ImageResponse(element, { width, height });
	return Buffer.from(await res.arrayBuffer());
}

// ---------------------------------------------------------------- items

async function knowCards(ctx) {
	const { story, site, packDir, slug, place } = ctx;
	const facts = new Map((story.facts || []).map((f) => [f.id, f]));
	const out = [];
	// The published pack decides which chapters a player can reach. A chapter only story.json has
	// is not advertised.
	const published = new Map((site.story?.chapters || []).map((c, i) => [c.id, i]));
	for (const [ci, ch] of (story.chapters || []).entries()) {
		if (ch.preview) continue;
		if (!published.has(ch.id)) {
			out.push({ skip: `know-${ch.id}`, why: "the published pack does not have this chapter yet" });
			continue;
		}
		const n = Number.isInteger(ch.n) ? ch.n : ci;
		const know = (ch.beats || []).filter((b) => b.type === "know");
		if (!know.length) {
			out.push({ skip: `know-${ch.id}`, why: "this chapter has no \"you now know\" line in story.json" });
			continue;
		}
		const beat = know[0];
		const line = traveller(story, beat.text);
		const cited = (beat.facts || []).map((id) => facts.get(id)).filter(Boolean);
		if (!line || cited.length !== (beat.facts || []).length || cited.some((f) => f.status !== "verified")) {
			out.push({ skip: `know-${ch.id}`, why: "its line is missing, or cites a fact that is missing or not verified" });
			continue;
		}
		// The source shown is the line's first fact from the record; failing that, its first fact.
		const fact = cited.find((f) => f.tier === "record") || cited[0];
		const source = shortSource(fact.source);
		if (!source) {
			out.push({ skip: `know-${ch.id}`, why: `fact ${fact.id} has no public source to show` });
			continue;
		}
		const tier = story.tiers?.[fact.tier] || "";
		const view = await restoredView(packDir, site, ch.nodes);
		if (!view) {
			out.push({ skip: `know-${ch.id}`, why: `none of its viewpoints (${(ch.nodes || []).join(", ")}) has a published panorama in the pack yet` });
			continue;
		}
		const label = [n === 0 ? "Prologue" : `Chapter ${n}`, ch.title, ch.years].filter(Boolean).join(" · ");
		for (const t of [line, source, label, tier]) checkCopy(t, `know-${ch.id}`);
		out.push({
			name: `know-${ch.id}`,
			bgFile: view.file,
			note: `${view.node.id} THEN, face ${view.face}, ${view.size} px`,
			draw: ({ width, height, bg }) =>
				frame({
					width, height, bg,
					top: brand(place),
					middle: null,
					bottom: h("div", { flexDirection: "column", gap: 26 }, [
						h("div", small, label),
						h("div", small, "You now know"),
						h("div", { fontSize: line.length > 90 ? 58 : 68, lineHeight: 1.16, letterSpacing: -1, color: "rgba(255,255,255,0.96)" }, line),
						h("div", { flexDirection: "column", gap: 8, marginTop: 10, fontSize: 25, lineHeight: 1.35, color: "rgba(255,255,255,0.7)" }, [
							tier ? h("div", { fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }, tier) : null,
							h("div", {}, `Source: ${source}`),
						].filter(Boolean)),
					]),
				}),
			caption: [
				`You now know: ${line}`,
				"",
				`Source: ${publicSources(fact.source).join("; ")}`,
				"",
				`${story.title}. ${label}.`,
				captionFooter(slug, n),
			].join("\n"),
		});
	}
	return out;
}

async function yearVote(ctx, sql) {
	const { story, slug, place } = ctx;
	const beat = (story.chapters || []).flatMap((c) => c.beats || []).concat(story.ending?.beats || []).find((b) => b.type === "vote");
	if (!beat) return [{ skip: "year-vote", why: "story.json has no vote beat" }];
	const ids = (beat.options || []).map((o) => o.id);
	// The same rule as the game (lib/server/play/yearVotes.js): only votes from players with a
	// completed run of the site as the server recorded it.
	const rows = await sql`
		SELECT v.option_id, COUNT(*)::int AS n FROM play_year_votes v
		WHERE v.site = ${slug}
		  AND EXISTS (SELECT 1 FROM play_runs r WHERE r.player_id = v.player_id AND r.site = v.site AND r.completed)
		GROUP BY v.option_id
	`;
	const counts = new Map(rows.map((r) => [r.option_id, r.n]));
	const total = ids.reduce((a, id) => a + (counts.get(id) || 0), 0);
	if (total < MIN_VOTES) return [{ skip: "year-vote", why: `fewer than ${MIN_VOTES} votes so far, so no shares are published` }];
	// Whole percentages that add up to 100 (largest remainder), as in lib/server/play/yearVotes.js.
	const raw = ids.map((id) => ({ id, exact: ((counts.get(id) || 0) * 100) / total }));
	const shares = raw.map((r) => ({ id: r.id, pct: Math.floor(r.exact), rest: r.exact - Math.floor(r.exact) }));
	let left = 100 - shares.reduce((a, r) => a + r.pct, 0);
	for (const r of [...shares].sort((a, b) => b.rest - a.rest)) {
		if (left <= 0) break;
		r.pct += 1;
		left -= 1;
	}
	const question = traveller(story, beat.text);
	const lines = shares.map((s) => ({ ...s, label: traveller(story, beat.options.find((o) => o.id === s.id)?.text) }));
	for (const t of [question, ...lines.map((l) => l.label)]) checkCopy(t, "year-vote");
	return [{
		name: "year-vote",
		draw: ({ width, height }) =>
			frame({
				width, height,
				top: brand(place),
				middle: h("div", { flexDirection: "column", gap: 40 }, [
					h("div", { fontSize: 64, lineHeight: 1.15, letterSpacing: -1 }, question),
					h("div", { flexDirection: "column", gap: 30 }, lines.map((l) =>
						h("div", { flexDirection: "column", gap: 10 }, [
							h("div", { justifyContent: "space-between", alignItems: "baseline", fontSize: 30, color: "rgba(255,255,255,0.85)" }, [
								h("div", { maxWidth: 760 }, l.label),
								h("div", { fontSize: 44, fontWeight: 600 }, `${l.pct}%`),
							]),
							h("div", { width: "100%", height: 10, borderRadius: 5, background: "rgba(255,255,255,0.12)" }, [
								h("div", { width: `${l.pct}%`, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.85)" }, []),
							]),
						]))),
				]),
				bottom: h("div", small, "No answer is marked right"),
			}),
		caption: [
			`${question} Players of ${story.title} answered:`,
			...lines.map((l) => `${l.pct}%  ${l.label}`),
			"",
			"No answer is marked right. Which would you put back?",
			captionFooter(slug),
		].join("\n"),
	}];
}

function boardItem({ name, title, sub, names, place, slug, intro }) {
	for (const t of [title, sub, ...names]) checkCopy(t, name);
	return {
		name,
		draw: ({ width, height }) =>
			frame({
				width, height,
				top: brand(place),
				middle: h("div", { flexDirection: "column", gap: 36 }, [
					h("div", { flexDirection: "column", gap: 14 }, [
						h("div", small, sub),
						h("div", { fontSize: 64, lineHeight: 1.12, letterSpacing: -1 }, title),
					]),
					h("div", { flexDirection: "column", gap: height > 1500 ? 26 : 16 }, names.map((n, i) =>
						h("div", { alignItems: "baseline", fontSize: 38, color: i < 3 ? "#FFFFFF" : "rgba(255,255,255,0.78)" }, [
							h("div", { width: 80, fontSize: 30, color: "rgba(255,255,255,0.45)" }, String(i + 1)),
							h("div", {}, n),
						]))),
				]),
				bottom: h("div", small, "Names are made up by the game"),
			}),
		caption: [intro, "", ...names.map((n, i) => `${i + 1}. ${n}`), captionFooter(slug)].join("\n"),
	};
}

async function boards(ctx, sql, date) {
	const { story, slug, place } = ctx;
	const out = [];
	// The day's daily board: best score, then fastest. Daily results are not per site, so this one
	// is made once, with the first live site (see main).
	if (ctx.first) {
		// The same rows the game's board shows (lib/server/play/daily.js dailyBoard): a time the
		// server measured, from players who existed before the day began (India time).
		const dayStart = new Date(Date.parse(`${date}T00:00:00Z`) - (5 * 60 + 30) * 60 * 1000);
		const daily = await sql`
			SELECT p.display_name FROM play_daily d JOIN play_players p ON p.id = d.player_id
			WHERE d.day = ${date}::date AND d.duration_ms IS NOT NULL AND p.created_at < ${dayStart}
			ORDER BY d.score DESC, d.duration_ms ASC
			LIMIT ${BOARD_SIZE}
		`;
		if (daily.length < BOARD_SIZE) out.push({ skip: "board-daily", why: `fewer than ${BOARD_SIZE} daily results on ${date}` });
		else {
			out.push(boardItem({
				name: "board-daily", slug, place: "The Missing Piece", sub: `Daily, ${date}`, title: "Today's top ten",
				names: daily.map((r) => r.display_name),
				intro: `The Missing Piece, ${date}. Today's top ten:`,
			}));
		}
	}
	const site = await sql`
		SELECT p.display_name
		FROM (
			SELECT DISTINCT ON (player_id) player_id, accuracy, duration_s
			FROM play_runs WHERE site = ${slug} AND completed AND duration_s IS NOT NULL AND accuracy IS NOT NULL
			ORDER BY player_id, accuracy DESC, duration_s ASC
		) best JOIN play_players p ON p.id = best.player_id
		ORDER BY best.accuracy DESC, best.duration_s ASC
		LIMIT ${BOARD_SIZE}
	`;
	if (site.length < BOARD_SIZE) out.push({ skip: "board-site", why: `fewer than ${BOARD_SIZE} completed runs` });
	else {
		out.push(boardItem({
			name: "board-site", slug, place, sub: story.title, title: "Top ten restorers",
			names: site.map((r) => r.display_name),
			intro: `${story.title}: the top ten who rebuilt it from its evidence.`,
		}));
	}
	return out;
}

// The day's Missing Piece: the same puzzle the game serves that day, picked with the game's own
// rule (lib/play/daily.js puzzleForDay over every daily file). The teaser shows the site, the
// missing element's name and the first clue, which a player sees before answering anyway. Never
// the answers, the chapter or the reveal. Background: the site's view as it is today (NOW).
async function dailyTeaser(date, dailyDir, ctxBySlug) {
	const rel = relative(ROOT, dailyDir).split("\\").join("/") || ".";
	if (!(await exists(dailyDir))) return [{ skip: "daily-teaser", why: `${rel}/ does not exist yet (the daily generator has not written it)` }];
	const names = (await readdir(dailyDir)).filter((f) => f.endsWith(".json"));
	const files = [];
	for (const n of names) {
		try {
			files.push(JSON.parse(await readFile(join(dailyDir, n), "utf8")));
		} catch {
			return [{ skip: "daily-teaser", why: `${rel}/${n} is not valid JSON` }];
		}
	}
	if (!files.length) return [{ skip: "daily-teaser", why: `${rel}/ has no daily files yet` }];
	const found = puzzleForDay(files, date);
	if (!found) return [{ skip: "daily-teaser", why: `no puzzle for ${date} in ${rel}/` }];
	const { file, puzzle } = found;
	const ctx = ctxBySlug.get(file.site?.slug);
	if (!ctx) return [{ skip: "daily-teaser", why: `the ${date} puzzle is for ${file.site?.slug}, which is not a live site here` }];
	const { slug, place, story, site, packDir } = ctx;
	const piece = typeof puzzle.element?.name === "string" ? puzzle.element.name.trim().replace(/[.\s]+$/, "") : "";
	const first = (puzzle.clues || []).find((c) => typeof c?.text === "string" && c.text.trim());
	const clue = first && first.text.trim().length <= 180 ? first.text.trim() : "";
	// The hook is the puzzle's own question prompts, which the player sees before answering.
	const COUNT = ["No", "One", "Two", "Three", "Four", "Five", "Six"];
	const nClues = (puzzle.clues || []).length;
	const prompts = (puzzle.questions || []).map((q) => (typeof q?.prompt === "string" ? q.prompt.trim() : "")).filter(Boolean);
	const hook = [nClues > 0 && nClues < COUNT.length ? `${COUNT[nClues]} ${nClues === 1 ? "clue" : "clues"}.` : "", ...prompts].filter(Boolean).join(" ");
	const headline = puzzle.element?.kind === "restoration" ? "One piece of this building is missing." : "One piece of the evidence is missing.";
	for (const t of [piece, clue, hook, headline]) checkCopy(t, "daily-teaser");
	const view = await todayView(packDir, site);
	return [{
		name: "daily-teaser",
		bgFile: view?.file || null,
		note: `puzzle ${puzzle.id}${view ? `, over ${view.node.id} NOW, face ${view.face}` : ""}`,
		draw: ({ width, height, bg }) =>
			frame({
				width, height, bg,
				top: brand(place),
				middle: null,
				bottom: h("div", { flexDirection: "column", gap: 28 }, [
					h("div", small, `The Missing Piece, ${longDate(date)}`),
					h("div", { fontSize: 72, lineHeight: 1.1, letterSpacing: -1 }, headline),
					piece ? h("div", { fontSize: 40, lineHeight: 1.2, color: "rgba(255,255,255,0.9)" }, `Today's piece: ${piece}`) : null,
					clue ? h("div", { flexDirection: "column", gap: 10, marginTop: 6 }, [
						h("div", small, "First clue"),
						h("div", { fontSize: 34, lineHeight: 1.3, color: "rgba(255,255,255,0.82)" }, clue),
					]) : null,
					h("div", { fontSize: 30, lineHeight: 1.3, color: "rgba(255,255,255,0.7)", marginTop: 6 }, hook),
				].filter(Boolean)),
			}),
		caption: [
			`The Missing Piece, ${longDate(date)}. ${story.title}.`,
			headline,
			piece ? `Today's piece: ${piece}.` : null,
			clue ? `First clue: ${clue}` : null,
			hook,
			"Sixty seconds. Same piece for everyone today.",
			"",
			`Play it free: ${SITE_URL}/play/daily`,
			`Creators, use your own link: ${SITE_URL}/play/daily?c=YOURCODE`,
		].filter((x) => x != null).join("\n"),
	}];
}

// ---------------------------------------------------------------- main

async function writeItem(dir, prefix, item) {
	const written = [];
	const lift = item.bgFile ? await liftFor(item.bgFile) : 1;
	if (lift > 1.01) item.note = `${item.note ? `${item.note}, ` : ""}shadows lifted, gamma ${lift.toFixed(2)}`;
	for (const s of SIZES) {
		const bg = item.bgFile ? await backgroundData(item.bgFile, s.width, s.height, lift) : null;
		const png = await renderPng(item.draw({ width: s.width, height: s.height, bg }), s.width, s.height);
		const file = join(dir, `${prefix}${item.name}-${s.width}x${s.height}.png`);
		await writeFile(file, png);
		written.push(file);
	}
	const caption = checkCopy(item.caption, `${item.name} caption`);
	const capFile = join(dir, `${prefix}${item.name}.txt`);
	await writeFile(capFile, `${caption}\n`, "utf8");
	written.push(capFile);
	return written;
}

async function main() {
	const args = argsOf(process.argv.slice(2));
	if (args.help) {
		console.log("node --env-file=.env.local tools/play/social/export.mjs [--date YYYY-MM-DD] [--site <slug>]");
		return;
	}
	const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
	const sql = url ? neon(url) : null;
	const live = SITES.filter((s) => s.status === "live" && s.version && (!args.site || s.slug === args.site));
	if (!live.length) throw new Error(args.site ? `No live site called ${args.site}` : "No live sites");

	const outDir = join(HERE, "out", args.date);
	await mkdir(outDir, { recursive: true });
	// A rerun replaces the day's set, so an item skipped now does not leave an old image behind.
	for (const f of await readdir(outDir)) if (/\.(png|txt)$/.test(f)) await rm(join(outDir, f));
	const summary = [`Epocheye Play social export for ${args.date}`, ""];
	const emit = async (item, prefix) => {
		if (item.skip) {
			summary.push(`  skipped ${item.skip}: ${item.why}`);
			return;
		}
		await writeItem(outDir, prefix, item);
		summary.push(`  wrote ${prefix}${item.name}${item.note ? ` (${item.note})` : ""}`);
	};

	const ctxs = [];
	for (const [i, entry] of live.entries()) {
		const storyFile = join(ROOT, "content", "play", entry.slug, "story.json");
		const packDir = join(ROOT, "public", "play", "packs", entry.slug, `v${entry.version}`);
		const story = JSON.parse(await readFile(storyFile, "utf8"));
		const site = JSON.parse(await readFile(join(packDir, "site.json"), "utf8"));
		ctxs.push({ entry, slug: entry.slug, story, site, packDir, place: [entry.name, entry.place].filter(Boolean).join(" · "), first: i === 0 });
	}
	const ctxBySlug = new Map(ctxs.map((c) => [c.slug, c]));

	// One Missing Piece a day across all sites.
	summary.push("The Missing Piece");
	for (const item of await dailyTeaser(args.date, args.dailyDir, ctxBySlug)) await emit(item, "");
	summary.push("");

	for (const ctx of ctxs) {
		const { entry } = ctx;
		const prefix = ctxs.length > 1 ? `${entry.slug}-` : "";
		summary.push(`${entry.name} (${entry.slug}, pack v${entry.version})`);

		const items = [];
		items.push(...(await knowCards(ctx)));
		if (sql) {
			items.push(...(await yearVote(ctx, sql)));
			items.push(...(await boards(ctx, sql, args.date)));
		} else {
			items.push({ skip: "year-vote", why: "no DATABASE_URL (run with --env-file=.env.local)" });
			items.push({ skip: "boards", why: "no DATABASE_URL (run with --env-file=.env.local)" });
		}

		for (const item of items) await emit(item, prefix);
		summary.push("");
	}

	summary.push(`Files in ${outDir}:`);
	for (const f of (await readdir(outDir)).sort()) if (f !== "SUMMARY.txt") summary.push(`  ${f}`);
	await writeFile(join(outDir, "SUMMARY.txt"), `${summary.join("\n")}\n`, "utf8");
	console.log(summary.join("\n"));
}

main().catch((err) => {
	console.error(err?.message || err);
	process.exitCode = 1;
});
