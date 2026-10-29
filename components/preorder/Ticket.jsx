"use client";

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { gsap } from "gsap";

import { formatPrice } from "@/lib/preorder/price";
import { OTHER_SITE } from "@/lib/preorder/sites";
import { usePalette } from "./theme";
import { stationDistance } from "./stations";
import { payForPreorder } from "./checkout";
import { T, easeOut } from "./ui3d";

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
const GOLD = "#c9973a";
const tmpObj = new THREE.Object3D();
const DROPS = 26; // ink splash around the imprint

// Deterministic, so the splash is the same shape every time.
const hash01 = (n) => {
	const x = Math.sin(n * 91.3458) * 47453.5453;
	return x - Math.floor(x);
};
const SPLASH = Array.from({ length: DROPS }, (_, i) => ({
	angle: hash01(i + 1) * Math.PI * 2,
	dist: 1.05 + hash01(i + 40) * 0.95,
	size: 0.025 + Math.pow(hash01(i + 80), 2) * 0.1,
	stretch: 1 + hash01(i + 120) * 1.6,
}));

// The inset gold rule, as [x, y, width, height]; the sides break for the stub's notches.
const IN = 0.17;
const RULE = 0.022;
const GAP = 0.42;
const sideTop = [STUB_Y + GAP, H / 2 - IN];
const sideBottom = [-H / 2 + IN, STUB_Y - GAP];
const FOIL_RULES = [
	[0, H / 2 - IN, W - 2 * IN, RULE],
	[0, -H / 2 + IN, W - 2 * IN, RULE],
	...[-1, 1].flatMap((side) =>
		[sideTop, sideBottom].map(([a, b]) => [side * (W / 2 - IN), (a + b) / 2, RULE, b - a])
	),
];

const FOIL_FRAG = /* glsl */ `
	uniform float uTime;
	uniform float uPointer;
	uniform vec3 uColor;
	varying vec2 vPos;
	void main() {
		// A gold sheen sweeps the paper on the diagonal every few seconds and
		// leans towards the pointer.
		float f = dot(vPos, normalize(vec2(1.0, 0.65)));
		float c = mod(uTime * 2.4, 18.0) - 9.0 + uPointer * 1.5;
		float band = exp(-pow((f - c) / 0.55, 2.0)) + 0.35 * exp(-pow((f - c + 1.1) / 0.18, 2.0));
		gl_FragColor = vec4(uColor, band * 0.32);
	}
`;

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

export default function Ticket({ sites, counts, price, selected, onSelect, onDone, onSeeBrick, visible, progress, position, scale = 1 }) {
	const t = usePalette();
	const shape = useMemo(() => ticketShape(), []);
	const flip = useRef(null);
	const tilt = useRef(null);
	const stamp = useRef(null);
	const imprint = useRef(null);
	const splash = useRef(null);
	const foil = useRef(null);
	const hit = useRef(-1e9); // when the stamp last struck the paper (s)
	const [foilUniforms] = useState(() => ({ uTime: { value: 0 }, uPointer: { value: 0 }, uColor: { value: new THREE.Color("#ffd98a") } }));
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
		const now = performance.now() / 1000; // same clock as the strike
		// Flips in from the side as the camera arrives, and out again as it leaves.
		const f = flip.current;
		if (f) {
			const k = easeOut((1 - stationDistance(progress.get(), 3)) * 1.4 - 0.15);
			f.rotation.y = (1 - k) * -1.9;
			f.rotation.z = (1 - k) * 0.12;
			f.position.x = (1 - k) * 3.2;
		}
		const g = tilt.current;
		if (!g) return;
		// The stamp's strike shakes the ticket for a moment.
		const since = now - hit.current;
		const shake = since < 0.4 ? (1 - since / 0.4) ** 2 : 0;
		g.rotation.y = THREE.MathUtils.damp(g.rotation.y, state.pointer.x * 0.16, 4, delta);
		g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * 0.1, 4, delta);
		g.rotation.z = Math.sin(since * 70) * 0.025 * shake;
		g.position.x = Math.sin(since * 55) * 0.07 * shake;
		g.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.06 + Math.cos(since * 63) * 0.05 * shake;
		if (stamp.current && status === "idle") {
			stamp.current.position.z = THREE.MathUtils.damp(stamp.current.position.z, hoverStamp ? 0.42 : 0.55, 8, delta);
		}
		// Ink flies out from under the stamp and stays on the paper.
		const drops = splash.current;
		if (drops) {
			drops.visible = since >= 0 && since < 1e6;
			const k = Math.min(1, Math.max(0, since / 0.22));
			const out = 1 - (1 - k) ** 3;
			SPLASH.forEach((d, i) => {
				tmpObj.position.set(Math.cos(d.angle) * d.dist * out, Math.sin(d.angle) * d.dist * out, 0);
				tmpObj.rotation.set(0, 0, d.angle);
				const size = d.size * Math.min(1, k * 3);
				tmpObj.scale.set(size * (1 + (d.stretch - 1) * (1 - k * 0.6)), size, 1);
				tmpObj.updateMatrix();
				drops.setMatrixAt(i, tmpObj.matrix);
			});
			drops.instanceMatrix.needsUpdate = true;
		}
		const fm = foil.current;
		if (fm) {
			fm.uniforms.uTime.value = state.clock.elapsedTime;
			fm.uniforms.uPointer.value = THREE.MathUtils.damp(fm.uniforms.uPointer.value, state.pointer.x, 3, delta);
		}
	});

	/** The stamp rears up and strikes; resolves at the moment it hits the paper. */
	function strike() {
		const st = stamp.current;
		if (!st) return Promise.resolve();
		return new Promise((resolve) => {
			const struck = () => {
				hit.current = performance.now() / 1000;
				resolve();
			};
			gsap
				.timeline({ onComplete: struck })
				.to(st.position, { z: 0.8, duration: 0.18, ease: "power2.out" })
				.to(st.position, { z: 0.06, duration: 0.1, ease: "power4.in" });
		});
	}

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
			await strike();
			setResult({ ...paid, label });
			setStatus("done");
			if (imprint.current) gsap.fromTo(imprint.current.scale, { x: 1.35, y: 1.35, z: 1.35 }, { x: 1, y: 1, z: 1, duration: 0.35, ease: "power4.out" });
			// Its work done, the stamp lifts away off the ticket.
			const st = stamp.current;
			if (st) {
				gsap.to(st.position, { z: 2.4, y: -1.2, duration: 0.8, ease: "power3.in", delay: 0.2 });
				gsap.to(st.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.45, ease: "power2.in", delay: 0.55 });
			}
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
		hit.current = -1e9;
		const st = stamp.current;
		if (st) {
			gsap.killTweensOf([st.position, st.scale]);
			gsap.to(st.position, { z: 0.55, y: -2.9, duration: 0.6, ease: "power3.out" });
			gsap.to(st.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: "back.out(1.6)" });
		}
		step(1);
	}

	return (
		<group position={position} scale={scale}>
			<group ref={flip}>
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
					{/* Gold foil: an inset rule round the edge, and a sheen that sweeps the paper. */}
					{FOIL_RULES.map(([x, y, w, h], i) => (
						<mesh key={i} position={[x, y, 0.035]}>
							<boxGeometry args={[w, h, 0.012]} />
							<meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} emissive={GOLD} emissiveIntensity={0.15} />
						</mesh>
					))}
					<mesh position-z={0.04}>
						<shapeGeometry args={[shape, 18]} />
						<shaderMaterial
							ref={foil}
							uniforms={foilUniforms}
							vertexShader={/* glsl */ `varying vec2 vPos; void main() { vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
							fragmentShader={FOIL_FRAG}
							transparent
							depthWrite={false}
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
						{/* Long names wrap to two lines: set them smaller so they clear the line below. */}
						<T
							font="display"
							fontSize={(site?.name.length ?? 0) > 14 ? 0.31 : 0.42}
							color={INK}
							maxWidth={3.8}
							textAlign="center"
							lineHeight={1}
							position={[0, 1.5, 0]}>
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
						{/* Ink thrown out by the strike; it stays on the paper with the imprint. */}
						<instancedMesh ref={splash} args={[undefined, undefined, DROPS]} position={[0, -0.45, 0.008]} rotation-z={-0.18} visible={false} frustumCulled={false}>
							<circleGeometry args={[1, 14]} />
							<meshBasicMaterial color={RED} transparent opacity={0.85} toneMapped={false} />
						</instancedMesh>
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
					<group ref={stamp} position={[1.75, -2.9, 0.55]}>
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
		</group>
	);
}
