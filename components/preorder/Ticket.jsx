"use client";

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { gsap } from "gsap";

import { formatPrice } from "@/lib/preorder/price";
import { OTHER_SITE } from "@/lib/preorder/sites";
import { usePalette } from "./theme";
import { payForPreorder } from "./checkout";
import { T } from "./ui3d";

// The pre-order is an admission ticket. You flip through sites with the
// arrows, type your name and email straight onto the paper, and press the
// stamp. Real <input>s and <button>s sit invisibly over each printed field
// (drei <Html transform> keeps them aligned as the ticket tilts), so the phone
// keyboard, autofill and screen readers all work as on any form.

const W = 5.6;
const H = 7.6;
const STUB_Y = -2.1; // perforation
const PX = 40; // CSS px per world unit at distanceFactor 10
const INK = "#2a1c15"; // the ticket is paper in both themes; print stays dark
const RED = "#b0472f"; // terracotta print, dark enough to read on the paper
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function ticketShape() {
	const r = 0.28;
	const nr = 0.32;
	const s = new THREE.Shape();
	s.moveTo(-W / 2 + r, -H / 2);
	s.lineTo(W / 2 - r, -H / 2);
	s.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + r);
	s.lineTo(W / 2, STUB_Y - nr);
	s.absarc(W / 2, STUB_Y, nr, -Math.PI / 2, Math.PI / 2, true);
	s.lineTo(W / 2, H / 2 - r);
	s.quadraticCurveTo(W / 2, H / 2, W / 2 - r, H / 2);
	s.lineTo(-W / 2 + r, H / 2);
	s.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - r);
	s.lineTo(-W / 2, STUB_Y + nr);
	s.absarc(-W / 2, STUB_Y, nr, Math.PI / 2, -Math.PI / 2, true);
	s.lineTo(-W / 2, -H / 2 + r);
	s.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + r, -H / 2);
	return s;
}

/** Absolutely-positioned overlay box for a control centred at (x, y) in ticket units. */
const box = (x, y, w, h) => ({
	position: "absolute",
	left: (x + W / 2 - w / 2) * PX,
	top: (H / 2 - y - h / 2) * PX,
	width: w * PX,
	height: h * PX,
});

const hiddenInput = "bg-transparent text-[16px] text-transparent caret-transparent opacity-0 outline-none";
const hiddenButton =
	"cursor-pointer rounded-md bg-transparent outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pa-accent)]";

function Field({ label, value, placeholder, focused, y }) {
	return (
		<group position={[0, y, 0]}>
			<T font="mono" fontSize={0.12} letterSpacing={0.2} color={focused ? RED : "#8c7466"} anchorX="left" position={[-2.3, 0.33, 0]}>
				{label}
			</T>
			<T
				font="display"
				fontSize={0.3}
				color={value ? INK : "#a8948a"}
				anchorX="left"
				clipRect={[0, -0.4, 4.6, 0.4]}
				position={[-2.3, 0, 0]}>
				{(value || (focused ? "" : placeholder)) + (focused ? "|" : "")}
			</T>
			<mesh position={[0, -0.2, 0]}>
				<boxGeometry args={[4.6, focused ? 0.035 : 0.015, 0.01]} />
				<meshBasicMaterial color={focused ? RED : INK} toneMapped={false} />
			</mesh>
		</group>
	);
}

export default function Ticket({ sites, counts, price, selected, onSelect, onDone, onSeeBrick, visible, position, scale = 1 }) {
	const t = usePalette();
	const shape = useMemo(() => ticketShape(), []);
	const tilt = useRef(null);
	const stamp = useRef(null);
	const imprint = useRef(null);
	// The inputs are uncontrolled, so their DOM values are the truth at submit time.
	const fields = useRef({});
	const [form, setForm] = useState({ name: "", email: "", suggestion: "", marketingOk: false });
	const [focus, setFocus] = useState(null);
	const [status, setStatus] = useState("idle"); // idle | sending | done
	const [error, setError] = useState("");
	const [result, setResult] = useState(null);
	const [hoverStamp, setHoverStamp] = useState(false);

	const order = [...sites.map((s) => s.slug), OTHER_SITE];
	const site = sites.find((s) => s.slug === selected);
	const ranked = [...sites].sort((a, b) => (counts?.[b.slug] ?? 0) - (counts?.[a.slug] ?? 0));
	const rank = site ? ranked.findIndex((s) => s.slug === site.slug) + 1 : 0;
	const n = site ? counts?.[site.slug] ?? 0 : 0;
	const done = status === "done" && result;
	const priceLabel = formatPrice(price);

	const step = (dir) => {
		const i = order.indexOf(selected);
		onSelect(order[(i + dir + order.length) % order.length]);
	};
	const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

	useFrame((state, delta) => {
		const g = tilt.current;
		if (!g) return;
		g.rotation.y = THREE.MathUtils.damp(g.rotation.y, state.pointer.x * 0.16, 4, delta);
		g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * 0.1, 4, delta);
		g.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.06;
		if (stamp.current && status !== "sending") {
			stamp.current.position.z = THREE.MathUtils.damp(stamp.current.position.z, hoverStamp ? 0.42 : 0.55, 8, delta);
		}
	});

	async function submit() {
		if (status === "sending") return;
		const el = fields.current;
		const current = {
			...form,
			name: el.name?.value ?? form.name,
			email: el.email?.value ?? form.email,
			suggestion: el.suggestion?.value ?? form.suggestion,
		};
		setForm(current);
		if (current.name.trim().length < 2) return setError("Write your name on the ticket.");
		if (!EMAIL_RE.test(current.email.trim())) return setError("That email doesn't look right.");
		if (selected === OTHER_SITE && current.suggestion.trim().length < 3) return setError("Tell us which site you want.");
		setError("");
		setStatus("sending");
		// The stamp comes down while the request is in flight.
		if (stamp.current) gsap.to(stamp.current.position, { z: 0.12, duration: 0.22, ease: "power3.in" });
		try {
			const label = site ? site.name : current.suggestion;
			const paid = await payForPreorder({ form: current, site: selected, siteLabel: label });
			setResult({ ...paid, label });
			setStatus("done");
			if (stamp.current) gsap.to(stamp.current.position, { z: 0.55, duration: 0.5, ease: "power3.out", delay: 0.05 });
			if (imprint.current) gsap.fromTo(imprint.current.scale, { x: 1.6, y: 1.6, z: 1.6 }, { x: 1, y: 1, z: 1, duration: 0.45, ease: "power4.out" });
			onDone?.({ slug: selected, ...paid });
		} catch (err) {
			setError(err.message);
			setStatus("idle");
			if (stamp.current) gsap.to(stamp.current.position, { z: 0.55, duration: 0.4, ease: "power3.out" });
		}
	}

	function another() {
		setForm((f) => ({ ...f, suggestion: "" }));
		setResult(null);
		setStatus("idle");
		step(1);
	}

	return (
		<group position={position} scale={scale}>
			<group ref={tilt}>
				{/* Paper */}
				<mesh position-z={-0.04}>
					<extrudeGeometry args={[shape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 18 }]} />
					{/* Lit from within in dark mode so the print keeps its contrast. */}
					<meshStandardMaterial
						color={t.mode === "light" ? "#fffaf4" : t.paper}
						emissive={t.paper}
						emissiveIntensity={t.mode === "light" ? 0 : 0.42}
						roughness={0.92}
					/>
				</mesh>
				{/* Perforation */}
				{Array.from({ length: 22 }, (_, i) => (
					<mesh key={i} position={[-W / 2 + 0.45 + i * ((W - 0.9) / 21), STUB_Y, 0.04]}>
						<boxGeometry args={[0.1, 0.02, 0.01]} />
						<meshBasicMaterial color="#b9a596" />
					</mesh>
				))}

				<group position-z={0.045}>
					<T font="mono" fontSize={0.14} letterSpacing={0.24} color={RED} position={[0, 3.3, 0]}>
						EPOCHEYE · ADMIT ONE
					</T>
					<T font="display" fontSize={0.34} color={INK} position={[0, 2.85, 0]}>
						INTO THE PAST
					</T>
					<mesh position={[0, 2.5, 0]}>
						<boxGeometry args={[4.6, 0.012, 0.01]} />
						<meshBasicMaterial color={INK} />
					</mesh>

					<T font="mono" fontSize={0.12} letterSpacing={0.22} color="#8c7466" position={[0, 2.17, 0]}>
						THE SITE YOU WANT
					</T>
					<T font="mono" fontSize={0.5} color={RED} position={[-2.35, 1.45, 0]}>
						{"<"}
					</T>
					<T font="mono" fontSize={0.5} color={RED} position={[2.35, 1.45, 0]}>
						{">"}
					</T>
					<T font="display" fontSize={0.42} color={INK} maxWidth={3.8} textAlign="center" lineHeight={1} position={[0, 1.45, 0]}>
						{site ? site.name.toUpperCase() : "YOUR OWN PICK"}
					</T>
					{site ? (
						<T font="mono" fontSize={0.13} letterSpacing={0.14} color="#5b463b" position={[0, 0.85, 0]}>
							{`${site.place.toUpperCase()}  ·  #${String(rank).padStart(2, "0")}  ·  ${n === 1 ? "1 BRICK" : `${n} BRICKS`}`}
						</T>
					) : (
						<Field label="WHICH SITE?" value={form.suggestion} placeholder="e.g. Chittorgarh Fort" focused={focus === "suggestion"} y={0.72} />
					)}

					<group visible={!done}>
						<Field label="YOUR NAME" value={form.name} placeholder="Write your name" focused={focus === "name"} y={0.02} />
						<Field label="EMAIL" value={form.email} placeholder="you@example.com" focused={focus === "email"} y={-0.78} />
						<mesh position={[-2.18, -1.35, 0]}>
							<boxGeometry args={[0.22, 0.22, 0.02]} />
							<meshBasicMaterial color={form.marketingOk ? RED : "#d8c6b8"} />
						</mesh>
						<T font="body" fontSize={0.15} color="#5b463b" anchorX="left" position={[-1.95, -1.35, 0]}>
							Email me when other sites open
						</T>
						<T font="mono" fontSize={0.12} color="#9e2a17" maxWidth={4.6} textAlign="center" position={[0, -1.78, 0]}>
							{error}
						</T>
					</group>

					{/* Imprint left by the stamp */}
					<group ref={imprint} position={[0, -0.45, 0.01]} rotation-z={-0.18} visible={Boolean(done)}>
						<mesh>
							<ringGeometry args={[1.25, 1.36, 64]} />
							<meshBasicMaterial color={RED} transparent opacity={0.85} />
						</mesh>
						<T font="display" fontSize={0.4} color={RED} position={[0, 0.12, 0]}>
							PRE-ORDERED
						</T>
						<T font="mono" fontSize={0.17} letterSpacing={0.2} color={RED} position={[0, -0.32, 0]}>
							{result?.reference ?? ""}
						</T>
					</group>

					{/* Stub */}
					<T font="display" fontSize={0.3} color={INK} anchorX="left" position={[-2.3, -2.62, 0]}>
						{done ? "YOU'RE ON THE WALL" : "PRE-ORDER"}
					</T>
					<T font="body" fontSize={0.12} letterSpacing={0.08} color="#8c7466" anchorX="left" maxWidth={2.9} position={[-2.3, -2.98, 0]}>
						{done
							? result.alreadyPaid
								? "ALREADY PAID FOR THIS SITE. WE'LL EMAIL YOU WHEN IT'S READY."
								: "PAID. WE'LL EMAIL YOU WHEN IT'S READY."
							: `${priceLabel || "PAY"} · FULL REFUND IF WE DON'T BUILD IT`}
					</T>
					{done && (
						<>
							<T font="mono" fontSize={0.13} letterSpacing={0.16} color={RED} anchorX="left" position={[-2.3, -3.4, 0]}>
								{"SEE YOUR BRICK  >"}
							</T>
							<T font="mono" fontSize={0.13} letterSpacing={0.16} color="#5b463b" anchorX="right" position={[2.3, -3.4, 0]}>
								ANOTHER SITE
							</T>
						</>
					)}
				</group>

				{/* The stamp: a terracotta seal that hovers over the stub */}
				<group ref={stamp} position={[1.75, -2.9, 0.55]} visible={!done}>
					<mesh rotation-x={Math.PI / 2}>
						<cylinderGeometry args={[0.55, 0.55, 0.16, 48]} />
						<meshStandardMaterial color={RED} roughness={0.5} />
					</mesh>
					{/* Handle sits high on the seal so the word below it stays readable. */}
					<mesh position={[0, 0.17, 0.25]} rotation-x={Math.PI / 2}>
						<cylinderGeometry args={[0.13, 0.18, 0.35, 24]} />
						<meshStandardMaterial color="#7a4a2e" roughness={0.55} />
					</mesh>
					<T font="display" fontSize={0.14} letterSpacing={0.08} color="#fffaf4" position={[0, -0.27, 0.09]}>
						{status === "sending" ? "…" : `PAY ${priceLabel}`.trim()}
					</T>
				</group>

				{/* Invisible controls over the printed ones. The inputs are uncontrolled: <Html> renders
					them in its own React root, which would reset a controlled value before this tree re-renders. */}
				<Html
					transform
					distanceFactor={10}
					position={[0, 0, 0.06]}
					zIndexRange={[20, 0]}
					style={{ pointerEvents: visible ? "auto" : "none", opacity: visible ? 1 : 0 }}>
					<div style={{ position: "relative", width: W * PX, height: H * PX, pointerEvents: "none" }}>
						<div style={{ pointerEvents: visible ? "auto" : "none" }}>
							<button type="button" aria-label="Previous site" onClick={() => step(-1)} className={hiddenButton} style={box(-2.35, 1.45, 0.8, 0.9)} />
							<button type="button" aria-label="Next site" onClick={() => step(1)} className={hiddenButton} style={box(2.35, 1.45, 0.8, 0.9)} />
							{!site && (
								<input
									aria-label="Which site do you want?"
									ref={(n) => {
										fields.current.suggestion = n;
									}}
									defaultValue={form.suggestion}
									onChange={set("suggestion")}
									onFocus={() => setFocus("suggestion")}
									onBlur={() => setFocus(null)}
									className={hiddenInput}
									style={box(0, 0.72, 4.6, 0.55)}
								/>
							)}
							{!done && (
								<>
									<input
										aria-label="Your name"
										ref={(n) => {
											fields.current.name = n;
										}}
										autoComplete="name"
										defaultValue={form.name}
										onChange={set("name")}
										onFocus={() => setFocus("name")}
										onBlur={() => setFocus(null)}
										className={hiddenInput}
										style={box(0, 0.02, 4.6, 0.6)}
									/>
									<input
										aria-label="Your email"
										ref={(n) => {
											fields.current.email = n;
										}}
										type="email"
										autoComplete="email"
										defaultValue={form.email}
										onChange={set("email")}
										onFocus={() => setFocus("email")}
										onBlur={() => setFocus(null)}
										onKeyDown={(e) => e.key === "Enter" && submit()}
										className={hiddenInput}
										style={box(0, -0.78, 4.6, 0.6)}
									/>
									<button
										type="button"
										role="checkbox"
										aria-checked={form.marketingOk}
										aria-label="Email me when other sites open in Epocheye"
										onClick={() => setForm((f) => ({ ...f, marketingOk: !f.marketingOk }))}
										className={hiddenButton}
										style={box(-1.0, -1.35, 2.8, 0.4)}
									/>
									<button
										type="button"
										aria-label={`${priceLabel ? `Pay ${priceLabel} and pre-order` : "Pre-order"} ${site ? site.name : "this site"}`}
										onClick={submit}
										onPointerEnter={() => setHoverStamp(true)}
										onPointerLeave={() => setHoverStamp(false)}
										className={`${hiddenButton} rounded-full`}
										style={box(1.75, -2.9, 1.3, 1.3)}
									/>
								</>
							)}
							{done && (
								<>
									<button type="button" onClick={onSeeBrick} className={hiddenButton} style={box(-1.3, -3.4, 2.1, 0.4)}>
										<span className="sr-only">See your brick on the wall</span>
									</button>
									<button type="button" onClick={another} className={hiddenButton} style={box(1.5, -3.4, 1.7, 0.4)}>
										<span className="sr-only">Pre-order another site</span>
									</button>
								</>
							)}
							<p aria-live="polite" className="sr-only">
								{error || (done ? `Pre-ordered. Your reference is ${result.reference}.` : "")}
							</p>
						</div>
					</div>
				</Html>
			</group>
		</group>
	);
}
