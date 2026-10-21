// Scroll choreography for the fixed canvas: one pose per full-screen frame for each of the four
// teaser objects. Index i is the pose when frame i is centred in the viewport; the frame loop
// eases between neighbours, so an object that is "hidden" in one frame flies in from its hidden
// spot on the way to the next. The last pose is the "off" state once the collection grid covers
// the screen.
//   p = position (metres; object origins sit at their base centre, so y lifts the base down),
//   r = rotation (radians, x y z), s = scale, fade = brightness (0 hides the object),
//   mix = 0 today .. 1 painted 1791 (pillar only).
// Text sits on the opposite side of the main object: see FRAME_ALIGN.

export const FRAME_ALIGN = ["left", "right", "left", "right", "left", "right", "left", "right", "right", "left", "right", "left"];

const K = (p, ry, s, extra = {}) => ({ p, r: [extra.rx || 0, ry, 0], s, fade: extra.fade ?? 1, mix: extra.mix ?? 1 });
const HIDE_R = K([7, -6, -8], 0, 0.4, { fade: 0 }); // off to the right and behind
const HIDE_L = K([-7, -6, -8], 0, 0.4, { fade: 0 }); // off to the left and behind
const OFF = K([0, -6, -10], 9.5, 0.5, { fade: 0 });

export const DESKTOP = {
	// The hero object is the palace arcade (about 7 m wide once normalised), so it runs smaller.
	pillar: [
		K([2.7, -2.3, -1.0], -0.3, 0.62), // 0 hero: right, arches facing you, idle turn
		K([-3.1, -2.2, -1.4], 0.55, 0.6, { mix: 0, rx: 0.04 }), // 1 what's gone: swings left, faded
		K([2.3, -3.7, 1.4], -0.55, 0.85, { rx: 0.1 }), // 2 rebuilt: close on the arches and capitals
		K([-3.5, -1.8, -2.8], 1.2, 0.45, { fade: 0.85 }), // 3 two steps: small, far left
		K([-0.2, -1.2, -2.4], 0.2, 0.28), // 4 pick a monument: first in the line-up
		K([-2.9, -2.5, -0.6], 0.9, 0.66, { rx: -0.05 }), // 5 eight stops: left
		K([2.9, -2.2, -1.2], -0.9, 0.6), // 6 narration: right
		HIDE_L, // 7 rockets: the fort takes the frame
		HIDE_L, // 8 walk in: the fort takes the frame
		K([2.9, -2.3, -1.6], -0.4, 0.55), // 9 fact: teak
		K([-2.9, -2.3, -1.6], 0.6, 0.55), // 10 fact: 1791
		K([2.9, -2.3, -1.6], -0.6, 0.55), // 11 fact: 1799
		OFF, // 12 off
	],
	fort: [
		HIDE_R, HIDE_R, HIDE_R, HIDE_R, // 0..3
		K([1.9, -1.2, -2.4], 0.4, 0.36), // 4 line-up
		HIDE_R, HIDE_R, // 5, 6
		K([-3.0, -2.6, -1.4], 0.55, 0.75), // 7 rockets: Bangalore Fort, left
		K([-2.4, -3.0, 0.2], -0.35, 0.9), // 8 walk in: the gate comes toward you
		HIDE_L, HIDE_L, HIDE_L, OFF, // 9..12
	],
	dome: [
		HIDE_R, HIDE_R, HIDE_R, HIDE_R, // 0..3
		K([3.6, -1.2, -2.4], -0.4, 0.38), // 4 line-up
		HIDE_R, HIDE_R, HIDE_R, HIDE_R, HIDE_R, HIDE_R, HIDE_R, OFF, // 5..12
	],
	colonnade: [
		HIDE_R, HIDE_R, HIDE_R, HIDE_R, // 0..3
		K([5.3, -1.2, -2.4], 0.25, 0.33), // 4 line-up
		HIDE_R, HIDE_R, HIDE_R, HIDE_R, HIDE_R, HIDE_R, HIDE_R, OFF, // 5..12
	],
};

// Phones: objects sit low behind centred text, smaller, with simpler motion.
const phone = (k, i, name) => {
	if (k.fade === 0) return k;
	if (i === 4) {
		const slot = { pillar: -1.6, fort: -0.5, dome: 0.6, colonnade: 1.7 }[name];
		return K([slot, -2.4, -3.2], k.r[1], 0.3, { fade: 0.8 });
	}
	if (name === "pillar" && i === 2) return K([0, -3.4, 0.6], k.r[1], 0.55, { fade: 0.6, mix: k.mix });
	return K([0, -3.0, -1.2], k.r[1], name === "pillar" ? 0.42 : 0.6, { fade: k.fade * 0.55, mix: k.mix });
};

export const MOBILE = Object.fromEntries(Object.entries(DESKTOP).map(([name, keys]) => [name, keys.map((k, i) => phone(k, i, name))]));
