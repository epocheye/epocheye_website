"use client";

// The open-world HUD, in Epocheye's own design: minimap, objective, prompts, thumb controls,
// mission cards, subtitles, evidence and the end splash.

import dynamic from "next/dynamic";
import NextImage from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { textFor } from "@/lib/play/story/engine";
import { eraProfile } from "@/lib/play/world/missions";
import { PRESETS } from "@/lib/play/world/quality";
import { Switch } from "@/components/play/ui";

const OrderBoard = dynamic(() => import("@/components/play/OrderBoard"), { ssr: false });
const WorldEnding = dynamic(() => import("@/components/play/world/WorldEnding"), { ssr: false });

const MAP_SPAN = 120; // metres across the round minimap

// Keeps a drag on its control when the thumb slides off it. Optional: some browsers refuse it.
function capture(el, id) {
	try {
		el.setPointerCapture?.(id);
	} catch {
		// The drag still works while the thumb stays on the control.
	}
}

function Minimap({ rt, world, inPast }) {
	const ref = useRef(null);
	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) return undefined;
		const size = 168;
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		canvas.width = canvas.height = size * dpr;
		const c = canvas.getContext("2d");
		// Only this era's map is fetched: the other one is not needed until the era shifts.
		const images = {};
		const era = inPast ? "then" : "now";
		const file = world.minimap?.images?.[era];
		if (file) {
			const i = new Image();
			i.src = `${rt.base}/${file}`;
			images[era] = i;
		}
		const b = world.minimap?.bounds || world.play_bounds;
		const scale = size / MAP_SPAN;
		const draw = () => {
			if (!rt.ready) return;
			const h = rt.hud();
			c.setTransform(dpr, 0, 0, dpr, 0, 0);
			c.clearRect(0, 0, size, size);
			c.save();
			c.beginPath();
			c.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
			c.clip();
			c.fillStyle = inPast ? "#3a2230" : "#28343a";
			c.fillRect(0, 0, size, size);
			// North-up in the model, turned with the camera.
			c.translate(size / 2, size / 2);
			c.rotate(h.camYaw);
			const toMap = (x, y) => [(x - h.x) * scale, -(y - h.y) * scale];
			const img = images[inPast ? "then" : "now"];
			if (img?.complete && img.naturalWidth) {
				const [x0, y0] = toMap(b[0], b[3]);
				c.globalAlpha = 0.95;
				c.drawImage(img, x0, y0, (b[2] - b[0]) * scale, (b[3] - b[1]) * scale);
				c.globalAlpha = 1;
			}
			const dot = (p, color, r) => {
				const [x, y] = toMap(p[0], p[1]);
				c.fillStyle = color;
				c.beginPath();
				c.arc(x, y, r, 0, Math.PI * 2);
				c.fill();
			};
			for (const p of h.people) dot(p, "#fff3df", 3);
			for (const p of h.rides) {
				const [x, y] = toMap(p[0], p[1]);
				c.fillStyle = "#7fe0d0";
				c.fillRect(x - 4, y - 3, 8, 6);
			}
			for (const p of h.records) dot(p, "#ffd27a", 4);
			c.restore();
			c.setTransform(dpr, 0, 0, dpr, 0, 0);
			if (h.waypoint) {
				const dx = (h.waypoint[0] - h.x) * scale, dy = -(h.waypoint[1] - h.y) * scale;
				const cs = Math.cos(h.camYaw), sn = Math.sin(h.camYaw);
				let x = dx * cs - dy * sn, y = dx * sn + dy * cs;
				const len = Math.hypot(x, y), max = size / 2 - 11;
				if (len > max) {
					x = (x / len) * max;
					y = (y / len) * max;
				}
				c.fillStyle = "#ff7a45";
				c.strokeStyle = "#fff";
				c.lineWidth = 2;
				c.beginPath();
				c.arc(size / 2 + x, size / 2 + y, 6, 0, Math.PI * 2);
				c.fill();
				c.stroke();
			}
			c.save();
			c.translate(size / 2, size / 2);
			c.rotate(h.camYaw - h.yaw);
			c.fillStyle = "#fff";
			c.strokeStyle = "rgba(20,10,20,.8)";
			c.lineWidth = 1.5;
			c.beginPath();
			c.moveTo(0, -9);
			c.lineTo(6.5, 7);
			c.lineTo(0, 3.5);
			c.lineTo(-6.5, 7);
			c.closePath();
			c.fill();
			c.stroke();
			c.restore();
		};
		const t = setInterval(draw, 66);
		return () => clearInterval(t);
	}, [rt, world, inPast]);
	return <canvas ref={ref} className="w-minimap" aria-hidden="true" />;
}

function Joystick({ input }) {
	const zone = useRef(null);
	const knob = useRef(null);
	useEffect(() => {
		const el = zone.current;
		const dot = knob.current;
		if (!el || !input) return undefined;
		let id = null, cx = 0, cy = 0;
		const R = 52;
		const set = (x, y) => {
			if (dot) dot.style.transform = `translate(${x}px, ${y}px)`;
		};
		const down = (e) => {
			if (id !== null) return;
			id = e.pointerId;
			capture(el, id);
			const r = el.getBoundingClientRect();
			cx = r.left + r.width / 2;
			cy = r.top + r.height / 2;
			move(e);
		};
		const move = (e) => {
			if (e.pointerId !== id) return;
			let x = e.clientX - cx, y = e.clientY - cy;
			const l = Math.hypot(x, y);
			if (l > R) {
				x = (x / l) * R;
				y = (y / l) * R;
			}
			set(x, y);
			input.setStick(x / R, -y / R);
		};
		const up = (e) => {
			if (e.pointerId !== id) return;
			id = null;
			set(0, 0);
			input.setStick(0, 0);
		};
		el.addEventListener("pointerdown", down);
		el.addEventListener("pointermove", move);
		el.addEventListener("pointerup", up);
		el.addEventListener("pointercancel", up);
		return () => {
			el.removeEventListener("pointerdown", down);
			el.removeEventListener("pointermove", move);
			el.removeEventListener("pointerup", up);
			el.removeEventListener("pointercancel", up);
			// Hidden with a thumb still on it: its release never arrives, so let go here.
			set(0, 0);
			input.setStick(0, 0);
		};
	}, [input]);
	return (
		<div ref={zone} className="w-stick" role="img" aria-label="Move: drag the stick">
			<div ref={knob} className="w-stick-knob" />
		</div>
	);
}

function LookPad({ input }) {
	const ref = useRef(null);
	useEffect(() => {
		const el = ref.current;
		if (!el || !input) return undefined;
		let id = null, x = 0, y = 0;
		const down = (e) => {
			if (id !== null) return;
			id = e.pointerId;
			x = e.clientX;
			y = e.clientY;
			capture(el, id);
		};
		const move = (e) => {
			if (e.pointerId !== id) return;
			input.touchLook(e.clientX - x, e.clientY - y);
			x = e.clientX;
			y = e.clientY;
		};
		const up = (e) => {
			if (e.pointerId === id) id = null;
		};
		el.addEventListener("pointerdown", down);
		el.addEventListener("pointermove", move);
		el.addEventListener("pointerup", up);
		el.addEventListener("pointercancel", up);
		return () => {
			el.removeEventListener("pointerdown", down);
			el.removeEventListener("pointermove", move);
			el.removeEventListener("pointerup", up);
			el.removeEventListener("pointercancel", up);
		};
	}, [input]);
	return <div ref={ref} className="w-lookpad" aria-hidden="true" />;
}

function MissionCard({ mission, chip, onBegin }) {
	useEffect(() => {
		const t = setTimeout(onBegin, 3400);
		return () => clearTimeout(t);
		// Timed once per mission.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mission.id]);
	return (
		<button type="button" className="w-mission" onClick={onBegin} aria-label={`${mission.title}. Start mission`}>
			<span className="w-mission-n">Mission {mission.n}</span>
			<span className="w-mission-title">{mission.title}</span>
			<span className="w-mission-place">{mission.place_line}</span>
			{mission.place_note ? (
				<span className="w-mission-note">
					{chip ? <span className={`w-chip is-${chip.tier}`}>{chip.label}</span> : null}
					<span>{mission.place_note}</span>
				</span>
			) : null}
		</button>
	);
}

function Chip({ chip }) {
	const [open, setOpen] = useState(false);
	if (!chip) return null;
	if (!chip.source) return <span className={`w-chip is-${chip.tier}`}>{chip.label}</span>;
	return (
		<span className="w-chipwrap">
			<button type="button" className={`w-chip is-${chip.tier}`} onClick={(e) => {
				e.stopPropagation();
				setOpen((v) => !v);
			}} aria-expanded={open}>
				{chip.label}
			</button>
			{open ? <span className="w-source">{chip.source}</span> : null}
		</span>
	);
}

// The story's proof switch, for its label once its own objective has passed.
const findProof = (story) => story.chapters.flatMap((c) => c.beats).find((b) => b.type === "proof") || null;

export default function WorldHud(p) {
	const { slug, rt, world, missions, site, packVersion, packFile, input, touch, phase, progress, state, mission, objective, prompt, riding, line, card, note, choice, shifting, restoring, talking, sound, presetId, pano, sketch, lookHeld, order, missionChip, liveBeat } = p;
	const [menu, setMenu] = useState(false);
	// The ride being ridden, or the one the player is about to board.
	const rideNear = missions.rides?.find((r) => r.id === (riding || (prompt?.kind === "ride" ? prompt.id : null))) || null;
	const [showCredits, setShowCredits] = useState(false);
	const era = state.era || mission?.era || "today";
	const inPast = eraProfile(missions, era).past;
	// A ride can carry its own credit line, so adding one needs no change to the list.
	const credits = [...new Set([...(missions.credits || []), ...(missions.rides || []).map((r) => r.credit).filter(Boolean)])];
	const keyHint = touch ? null : <kbd>E</kbd>;

	if (phase === "title") {
		return (
			<div className="w-title">
				<p className="w-kicker">Epocheye Play</p>
				<h1 className="w-title-h">{missions.title || "Open world"}</h1>
				{missions.tagline ? <p className="w-title-sub">{missions.tagline}</p> : null}
				<div className="w-title-actions">
					<button type="button" className="w-btn is-hot" onClick={() => p.onEnter(true)}>Play with sound</button>
					<button type="button" className="w-btn" onClick={() => p.onEnter(false)}>Play muted</button>
				</div>
				<Link className="w-link" href={`/play/${slug}?view=story`}>Open Story view instead</Link>
			</div>
		);
	}
	if (phase === "loading") {
		return (
			<div className="w-title">
				<p className="w-kicker">Stepping back</p>
				<div className="w-bar" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Loading the world">
					<span style={{ width: `${Math.round(progress * 100)}%` }} />
				</div>
			</div>
		);
	}

	const showControls = !choice && !shifting && !restoring && !pano && !sketch && !order && state.phase === "play";
	const lens = site.story.default_lens || "traveller";
	const say = (value) => textFor(value, lens);
	return (
		<div className={`w-hud is-${inPast ? "then" : "now"}${touch ? " is-touch" : ""}${pano ? " is-pano" : ""}`}>
			{touch && !pano ? <LookPad input={input} /> : null}
			{pano ? null : <Minimap rt={rt} world={world} inPast={inPast} />}
			{objective ? (
				<div className="w-objective" aria-live="polite">
					<span className="w-objective-era">{inPast ? era : "Today"}</span>
					<span>{objective.text}</span>
					{objective.kind === "look_at" ? (
						<span className="w-look" role="progressbar" aria-label="Holding the view" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(lookHeld * 100)}>
							<span style={{ width: `${Math.round(lookHeld * 100)}%` }} />
						</span>
					) : null}
				</div>
			) : null}
			<div className="w-top-right">
				<button type="button" className="w-icon" onClick={p.onToggleSound} aria-pressed={sound} aria-label={sound ? "Sound off" : "Sound on"}>{sound ? "Sound on" : "Muted"}</button>
				<button type="button" className="w-icon" onClick={() => {
					input?.releasePointer();
					setMenu((m) => !m);
				}} aria-expanded={menu}>Menu</button>
			</div>
			{menu ? (
				<div className="w-menu">
					<p className="w-menu-h">Graphics</p>
					<div className="w-menu-row">
						{Object.values(PRESETS).map((q) => (
							<button key={q.id} type="button" className={`w-btn is-small${q.id === presetId ? " is-on" : ""}`} onClick={() => p.onPreset(q.id)}>{q.label}</button>
						))}
					</div>
					<Link className="w-btn is-small" href={`/play/${slug}?view=story`}>Open Story view</Link>
					{credits.length ? (
						<button type="button" className="w-btn is-small" onClick={() => setShowCredits((v) => !v)} aria-expanded={showCredits}>Credits</button>
					) : null}
					<button type="button" className="w-btn is-small" onClick={p.onReplay}>Start again</button>
					{showCredits && credits.length ? (
						<div className="w-credits">
							<p className="w-menu-h">Credits</p>
							{credits.map((c) => <p key={c}>{c}</p>)}
						</div>
					) : null}
				</div>
			) : null}

			{state.phase === "intro" && mission ? <MissionCard mission={mission} chip={missionChip} onBegin={p.onBegin} /> : null}

			{objective?.kind === "era" && !shifting && !riding && !talking ? (
				<button type="button" className="w-action is-hot" onClick={p.onWake}>{keyHint}{objective.text}</button>
			) : null}
			{objective?.kind === "restore" && !restoring && !riding && !talking && !line ? (
				<button type="button" className="w-action is-hot" onClick={p.onRestore}>{keyHint}{objective.text}</button>
			) : null}
			{pano && objective?.kind === "record" && !talking ? (
				<button type="button" className="w-action is-hot" onClick={p.onAction}>{keyHint}{objective.text}</button>
			) : null}
			{pano && inPast ? <p className="w-pano-note">This room as it stands today, with what you have restored.</p> : null}
			{objective?.kind === "look_at" && pano ? <p className="w-keys is-pano">{touch ? "Drag" : "Drag with the mouse"} to look, and hold the view there.</p> : null}

			{showControls && prompt && (prompt.kind !== "action" || ["sketch_compare", "climb"].includes(objective?.kind)) && !(touch && line) ? (
				<button type="button" className="w-prompt" onClick={() => input?.press("interact")}>
					{touch ? null : <kbd>E</kbd>}
					{prompt.label}
				</button>
			) : null}

			{touch && showControls && !talking ? <Joystick input={input} /> : null}
			{!touch && showControls && state.mission === 0 && state.objective === 0 ? (
				<p className="w-keys">WASD to walk. Shift to run. Mouse to look. E to interact.</p>
			) : null}
			{riding && showControls && !(touch && line) ? <p className="w-keys">{touch ? "Push the stick to drive" : "W to drive, A and D to steer"}. {rideNear?.[touch ? "keys_touch" : "keys"] ? `${rideNear[touch ? "keys_touch" : "keys"]}. ` : ""}People step aside, and your ride stops for them.</p> : null}

			{(rideNear?.notice || note) && !card ? (
				<aside className="w-note" role="status">
					{/* A place's fact can appear while riding, so it joins a ride's notice and never replaces it. */}
					{rideNear?.notice ? (
						<div className="w-note-item">
							<p>{rideNear.notice.text}</p>
							<Chip chip={{ tier: rideNear.notice.tier, label: "Our reconstruction" }} />
						</div>
					) : null}
					{note?.items.map((n) => (
						<div key={n.id} className="w-note-item">
							<p>{n.text}</p>
							<Chip chip={n.chip} />
						</div>
					))}
				</aside>
			) : null}

			{card ? (
				<aside className="w-evidence">
					<p className="w-evidence-title">{card.title}</p>
					{card.image ? <NextImage className="w-evidence-img" src={packFile(card.image)} alt={card.title || ""} width={560} height={360} sizes="(max-width: 480px) 90vw, 420px" unoptimized /> : null}
					{card.quote ? <blockquote>{card.quote}</blockquote> : null}
					{card.caption ? <p>{card.caption}</p> : null}
					{card.credit ? <p className="w-credit">{card.credit}</p> : null}
					{card.placement ? (
						<p className="w-placement">
							<span className="w-chip is-reconstruction">Our reconstruction</span>
							<span>{card.placement}</span>
						</p>
					) : null}
				</aside>
			) : null}

			{line ? (
				<div className="w-subtitle">
					<button type="button" className="w-subtitle-tap" onClick={p.onSkip} aria-label={`${line.role ? `${line.role}: ` : ""}${line.text}. Next line`}>
						{line.role ? <span className="w-speaker">{line.role}</span> : null}
						<span key={line.key} className="w-subtitle-text">{line.text}</span>
					</button>
					<Chip chip={line.chip} />
				</div>
			) : null}

			{choice ? (
				<div className="w-choice" role="group" aria-label={typeof choice.beat.text === "string" ? choice.beat.text : choice.beat.text.traveller}>
					<p className="w-choice-q">{typeof choice.beat.text === "string" ? choice.beat.text : choice.beat.text.traveller}</p>
					{choice.beat.options.map((o) => (
						<button key={o.id} type="button" className="w-btn" disabled={!!choice.picked || choice.wrong.includes(o.id)} onClick={() => p.onPick(o)}>
							{typeof o.text === "string" ? o.text : o.text.traveller}
						</button>
					))}
				</div>
			) : null}

			{shifting ? <div className="w-shift" aria-hidden="true" /> : null}

			{sketch ? (
				<div className="w-sketch">
					{(() => {
						const ev = site.story.evidence?.find((e) => e.id === sketch.objective.evidence);
						return ev?.image ? <NextImage className="w-sketch-img" src={packFile(ev.image)} alt={ev.title || ""} fill sizes="100vw" unoptimized /> : null;
					})()}
					<div className="w-sketch-note">
						<p>{sketch.objective.caption}</p>
						{sketch.chip ? <Chip chip={{ ...sketch.chip, tier: sketch.objective.tier || sketch.chip.tier, label: sketch.objective.tier === "reconstruction" ? "Our reconstruction" : sketch.chip.label }} /> : null}
						<button type="button" className="w-btn is-small w-sketch-close" onClick={p.onSketchClose}>Put it away</button>
					</div>
				</div>
			) : null}

			{order ? (
				<div className="w-order">
					<p className="w-order-q">{say(order.beat.text)}</p>
					<OrderBoard beat={order.beat} lens={lens} fallbackLens={lens} placed={order.placed} telling={null} miss={order.miss} onPlace={p.onPlaceCard} onSources={p.onSources} />
				</div>
			) : null}

			{objective?.kind === "proof" || (pano && state.proofSeen) ? (
				<div className="w-proof">
					<Switch compact label={say((objective?.kind === "proof" ? liveBeat : findProof(site.story))?.toggle_label)} on={state.proof} onChange={p.onProof} />
				</div>
			) : null}

			{objective?.kind === "vote" && liveBeat ? (
				<div className="w-choice" role="group" aria-label={say(liveBeat.text)}>
					<p className="w-choice-q">{say(liveBeat.text)}</p>
					{liveBeat.options.map((o) => (
						<button key={o.id} type="button" className="w-btn" onClick={() => p.onVote(o.id)}>{say(o.text)}</button>
					))}
				</div>
			) : null}

			{objective?.kind === "ending" ? <WorldEnding slug={slug} version={packVersion} site={site} state={state} onContinue={p.onEnding} /> : null}

			{state.phase === "end" && mission?.end ? (
				<button type="button" className="w-splash" onClick={p.onEndDismiss}>
					<span className="w-splash-h">{mission.end.splash}</span>
					<span className="w-splash-place">{mission.end.place}, {mission.end.year}</span>
					<span className="w-splash-count">Mission {mission.n} complete</span>
					<span className="w-link">{touch ? "Tap to continue" : "Press E or click to continue"}</span>
				</button>
			) : null}

			{state.phase === "done" ? (
				<div className="w-title is-over">
					<p className="w-kicker">The end of the story</p>
					<h2 className="w-title-h">{missions.title || "The end"}</h2>
					<p className="w-title-sub">You have played every mission.</p>
					<div className="w-title-actions">
						<button type="button" className="w-btn is-hot" onClick={p.onReplay}>Play again</button>
						<Link className="w-btn" href={`/play/${slug}?view=story`}>Open Story view</Link>
					</div>
				</div>
			) : null}
		</div>
	);
}
