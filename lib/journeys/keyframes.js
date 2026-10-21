// One pose per full-screen frame for the hero object (the Summer Palace pillar). Index i is
// the pose when frame i is centred in the viewport; the frame loop eases between neighbours.
// p = position (metres, model origin at the base centre, so y lifts the base below centre),
// r = rotation (radians, x y z), s = scale, mix = 0 today .. 1 painted 1791, fade = brightness.
// The last pose is the "off" state once the collection grid covers the screen.
// Text sits on the opposite side: see FRAME_ALIGN.

export const FRAME_ALIGN = ["left", "right", "left", "right", "left", "right", "left", "right", "right", "left", "right", "left"];

export const DESKTOP = [
	{ p: [2.1, -3.0, 0.0], r: [0.0, 0.35, 0.0], s: 1.0, mix: 1.0, fade: 1.0 }, // hero
	{ p: [-2.3, -3.1, 0.2], r: [0.06, 1.15, 0.0], s: 1.05, mix: 0.0, fade: 0.9 }, // gone: faded
	{ p: [1.6, -4.9, 2.6], r: [0.12, -0.45, 0.0], s: 1.15, mix: 1.0, fade: 1.0 }, // rebuilt: panel close
	{ p: [-2.6, -2.9, -1.0], r: [0.0, 1.9, 0.0], s: 0.85, mix: 1.0, fade: 0.85 }, // two steps
	{ p: [2.2, -3.0, 0.0], r: [0.04, 2.6, 0.0], s: 1.0, mix: 1.0, fade: 1.0 }, // reserve
	{ p: [-2.2, -3.4, 0.6], r: [-0.08, 3.4, 0.0], s: 1.08, mix: 1.0, fade: 0.95 }, // stops
	{ p: [2.3, -2.8, -0.6], r: [0.0, 4.2, 0.0], s: 0.9, mix: 1.0, fade: 0.9 }, // narration
	{ p: [-2.1, -2.6, -0.4], r: [0.1, 5.0, 0.0], s: 0.95, mix: 1.0, fade: 0.8 }, // rockets
	{ p: [-2.3, -3.1, 0.0], r: [0.0, 5.9, 0.0], s: 1.0, mix: 1.0, fade: 1.0 }, // walk in
	{ p: [2.4, -3.2, -1.4], r: [0.0, 6.6, 0.0], s: 0.9, mix: 1.0, fade: 0.9 }, // fact: teak
	{ p: [-2.4, -3.0, -1.4], r: [0.0, 7.4, 0.0], s: 0.9, mix: 1.0, fade: 0.9 }, // fact: 1791
	{ p: [2.4, -3.2, -1.4], r: [0.0, 8.2, 0.0], s: 0.9, mix: 1.0, fade: 0.9 }, // fact: 1799
	{ p: [0.0, -4.0, -6.0], r: [0.0, 8.8, 0.0], s: 0.7, mix: 1.0, fade: 0.0 }, // off
];

// Phones: the object sits low behind centred text, smaller, with simpler motion.
export const MOBILE = DESKTOP.map((k, i) => ({
	p: [0.0, i === 2 ? -4.6 : -3.8, i === 2 ? 1.2 : -0.6],
	r: [0.0, k.r[1], 0.0],
	s: i === 2 ? 0.8 : 0.66,
	mix: k.mix,
	fade: k.fade * 0.5,
}));
