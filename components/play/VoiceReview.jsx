"use client";

// Admin review page for narration. Plays a chapter in order with the real pauses, and lists
// every spoken line with its own play button, clip id, pace and pause. Lines can be marked
// "redo"; the marks stay in this browser and can be copied out as a list of clip ids.

import { useEffect, useState } from "react";
import { expandSpoken } from "@/lib/play/story/engine";
import { clipUsable, createNarrator, discoverVoices } from "@/lib/play/audio";
import { loadSite, packUrls } from "@/lib/play/pack";
import { Pill } from "@/components/play/ui";

const redoKey = (slug, voice) => `play:voice-redo:${slug}:${voice}`;

function readRedo(slug, voice) {
	try {
		const list = JSON.parse(window.localStorage.getItem(redoKey(slug, voice)) || "[]");
		return Array.isArray(list) ? list.filter((x) => typeof x === "string") : [];
	} catch {
		return [];
	}
}

function writeRedo(slug, voice, list) {
	try {
		window.localStorage.setItem(redoKey(slug, voice), JSON.stringify(list));
	} catch {
		// No storage: the marks last until the page is closed.
	}
}

export default function VoiceReview({ sites }) {
	const [slug, setSlug] = useState(sites[0]?.slug || "");
	const [data, setData] = useState({ slug: null, site: null, voices: [], listed: false, redo: {}, error: null });
	const [voiceId, setVoiceId] = useState(null);
	const [chapterId, setChapterId] = useState("all");
	const [playing, setPlaying] = useState(null);
	const [copyNote, setCopyNote] = useState("");
	const [narrator, setNarrator] = useState(null);

	const entry = sites.find((s) => s.slug === slug) || null;

	useEffect(() => {
		if (!entry) return undefined;
		let cancelled = false;
		const urls = packUrls(entry.slug, entry.version);
		const n = createNarrator(urls);
		n.setEnabled(true);
		Promise.all([loadSite(entry.slug, entry.version), discoverVoices(urls)])
			.then(([site, found]) => {
				if (cancelled) return;
				const redo = {};
				for (const v of found.voices) redo[v.id] = readRedo(entry.slug, v.id);
				setData({ slug: entry.slug, site, voices: found.voices, listed: found.listed, redo, error: null });
				setVoiceId(found.default);
				setChapterId("all");
				setNarrator(n);
			})
			.catch((err) => {
				if (!cancelled) setData({ slug: entry.slug, site: null, voices: [], listed: false, redo: {}, error: err?.message || "The pack did not load." });
			});
		return () => {
			cancelled = true;
			n.dispose();
		};
	}, [entry]);

	const loaded = data.slug === slug && data.site;
	const voice = data.voices.find((v) => v.id === voiceId) || null;

	useEffect(() => {
		if (!narrator) return;
		narrator.stop();
		narrator.setVoice(voice ? voice.id : null, voice ? voice.clips : null, !!voice?.manifest);
	}, [narrator, voice]);

	if (sites.length === 0) {
		return (
			<main className="play-review">
				<h1>Voice review</h1>
				<p>No published pack is registered yet.</p>
			</main>
		);
	}

	const story = loaded ? data.site.story : null;
	const all = story ? expandSpoken(story) : [];
	const chapters = story ? story.chapters || [] : [];
	const rows = chapterId === "all" ? all : all.filter((r) => r.chapter === chapterId);
	const redo = (voiceId && data.redo[voiceId]) || [];
	const known = (id) => (voice?.manifest ? voice.clips.has(id) : null);
	const missing = voice?.manifest ? rows.filter((r) => !voice.clips.has(r.id)).length : null;
	// Clips whose words no longer match the story. The game does not play them.
	const stale = voice?.manifest ? rows.filter((r) => voice.clips.has(r.id) && !clipUsable(voice.clips.get(r.id))).length : 0;

	const seg = (r, pause) => ({ text: r.text, clip: r.id, pause_after_ms: pause });
	const stop = () => {
		narrator?.stop();
		setPlaying(null);
	};
	const playRows = (list, realPauses) => {
		if (!narrator || list.length === 0) return;
		narrator.unlock();
		narrator.play(list.map((r) => seg(r, realPauses ? r.pause_after_ms : 0)), {
			onSegment: (sg) => setPlaying(sg.clip),
			onDone: () => setPlaying(null),
		});
	};
	const toggleRedo = (id) => {
		if (!voiceId) return;
		const next = redo.includes(id) ? redo.filter((x) => x !== id) : [...redo, id];
		writeRedo(slug, voiceId, next);
		setData((d) => ({ ...d, redo: { ...d.redo, [voiceId]: next } }));
		setCopyNote("");
	};
	// In story order, whatever order they were ticked in.
	const redoList = all.filter((r) => redo.includes(r.id)).map((r) => r.id);
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(redoList.join("\n"));
			setCopyNote(`Copied ${redoList.length} clip ids.`);
		} catch {
			setCopyNote("Copy did not work. Select the list below and copy it by hand.");
		}
	};

	return (
		<main className="play-review">
			<h1>Voice review</h1>

			<div className="play-review-bar">
				<label>
					Site
					<select value={slug} onChange={(e) => { stop(); setSlug(e.target.value); }}>
						{sites.map((s) => (
							<option key={s.slug} value={s.slug}>{s.name}</option>
						))}
					</select>
				</label>
				<label>
					Voice
					<select value={voiceId || ""} onChange={(e) => { stop(); setVoiceId(e.target.value || null); }} disabled={data.voices.length === 0}>
						{data.voices.length === 0 ? <option value="">None found</option> : null}
						{data.voices.map((v) => (
							<option key={v.id} value={v.id}>{v.manifest ? v.id : `${v.id} (no manifest)`}</option>
						))}
					</select>
				</label>
				<label>
					Chapter
					<select value={chapterId} onChange={(e) => { stop(); setChapterId(e.target.value); }}>
						<option value="all">All chapters</option>
						{chapters.map((c) => (
							<option key={c.id} value={c.id}>{`${c.id}: ${c.title}`}</option>
						))}
					</select>
				</label>
			</div>

			{data.error && data.slug === slug ? <p role="alert">{data.error}</p> : null}
			{!loaded && !data.error ? <p role="status">Loading the pack</p> : null}
			{loaded && data.voices.length === 0 ? (
				<p className="play-note">
					{data.listed
						? "audio/voices.json lists no voice. Lines play as silent reading time until audio is published."
						: "audio/voices.json is not in the pack, so no voice can be found. Lines play as silent reading time until it is published."}
				</p>
			) : null}

			{loaded ? (
				<>
					<div className="play-review-bar">
						<Pill strong onClick={() => playRows(rows, true)} disabled={rows.length === 0}>
							{chapterId === "all" ? "Play everything with pauses" : "Play chapter with pauses"}
						</Pill>
						<Pill onClick={stop}>Stop</Pill>
						<span className="play-note" role="status" aria-live="polite">
							{playing ? `Playing ${playing}` : `${rows.length} spoken lines${missing ? `, ${missing} without a clip` : ""}${stale ? `, ${stale} stale` : ""}`}
						</span>
					</div>

					<div className="play-table-wrap">
						<table className="play-table">
							<thead>
								<tr>
									<th scope="col">Play</th>
									<th scope="col">Clip id</th>
									<th scope="col">Spoken line</th>
									<th scope="col">Pace</th>
									<th scope="col">Pause after</th>
									<th scope="col">Redo</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((r) => {
									const has = known(r.id);
									const meta = voice?.clips.get(r.id);
									return (
										<tr key={r.id} className={`play-review-row${playing === r.id ? " is-playing" : ""}${has === false || meta?.stale ? " is-missing" : ""}`}>
											<td>
												<Pill small onClick={() => playRows([r], false)} aria-label={`Play ${r.id}`}>
													Play
												</Pill>
											</td>
											<td>
												<code>{r.id}</code>
												<div className="play-dim">{r.parent ? `${r.chapter}, after ${r.parent}` : `${r.chapter}, ${r.type}${r.role ? `, ${r.role}` : ""}`}</div>
												{has === false ? <div>No clip</div> : null}
												{meta?.stale ? <div>Stale: the line has changed since this clip was made. Render it again.</div> : null}
											</td>
											<td className="play-review-text">{r.text}</td>
											<td>
												{r.pace}
												{meta?.wpm ? <div className="play-dim">{`${meta.wpm} wpm${meta.pace_ok === false ? ", off pace" : ""}`}</div> : null}
												{meta?.duration_ms ? <div className="play-dim">{`${(meta.duration_ms / 1000).toFixed(1)} s`}</div> : null}
											</td>
											<td>{`${r.pause_after_ms} ms`}</td>
											<td>
												<input type="checkbox" checked={redo.includes(r.id)} onChange={() => toggleRedo(r.id)} disabled={!voiceId} aria-label={`Redo ${r.id}`} />
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					<div className="play-review-bar">
						<Pill onClick={copy} disabled={redoList.length === 0}>
							Copy redo list
						</Pill>
						<span className="play-note" role="status" aria-live="polite">
							{copyNote || `${redoList.length} marked for ${voiceId || "no voice"}`}
						</span>
					</div>
					<textarea readOnly value={redoList.join("\n")} aria-label="Clip ids marked redo" />
				</>
			) : null}
		</main>
	);
}
