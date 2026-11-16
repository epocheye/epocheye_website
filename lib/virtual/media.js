// Media slots for /virtual. A null slot shows a labelled placeholder on local and preview builds
// and nothing on production. When the owner supplies a file, add it under public/virtual/ with a
// NEW file name (public/ media is cached for a year as immutable) and fill the slot here.

// Posters for the 3D layer: the first paint, shown until the live palace has loaded. Rendered
// from the model in capture mode (/virtual?shot=arrive&clean=1) with the same dusk light.
export const HERO_POSTER = {
	desktop: "/virtual/stills/hero-dusk-16x9.jpg",
	mobile: "/virtual/stills/hero-dusk-9x16.jpg",
	alt: "Tipu Sultan's Summer Palace, rebuilt, at dusk inside the walls of Bangalore Fort.",
};

// Then and now slider. Same camera angle for both.
// TODO(owner): supply both. today = a real photo of the palace now; then = the reconstruction.
export const THEN_NOW_IMAGES = {
	today: null, // { src: "/virtual/then-now/today.jpg", alt: "..." }
	then: null, // { src: "/virtual/then-now/1790s.jpg", alt: "..." }
};

// Narration sample for the first stop, 20 to 30 seconds. Never autoplays.
// TODO(owner): supply first-stop.mp3 (and .m4a for Safari if wanted).
export const FIRST_STOP_AUDIO = null; // "/virtual/audio/first-stop.mp3"

// James Hunter's 1792 painting of this front, beside "The colour that was lost".
// TODO(owner): supply the file and the credit line exactly as the holder requires.
export const HUNTER_PAINTING = null; // { src: "/virtual/hunter-1792.jpg", alt: "...", credit: "..." }

// Founder photo for "Who made this".
// TODO(owner): supply a portrait, at least 1200px on the short side.
export const FOUNDER_PHOTO = null; // { src: "/virtual/founder.jpg", alt: "Sambit Singha" }

// Server only: VERCEL_ENV is not exposed to the browser, so the page computes this and passes it down.
export function showSlots() {
	return process.env.VERCEL_ENV !== "production";
}
