// Media slots for /virtual. A null slot shows a labelled placeholder on local and preview builds
// and nothing on production. When the owner supplies a file, add it under public/virtual/ with a
// NEW file name (public/ media is cached for a year as immutable) and fill the slot here.

// Hero video: muted, looping, autoplay. 16:9 for desktop, 9:16 for phones.
// TODO(owner): supply hero-16x9.mp4 / .webm and hero-9x16.mp4 / .webm.
export const HERO_VIDEO = {
	desktop: null, // { mp4: "/virtual/hero-16x9.mp4", webm: "/virtual/hero-16x9.webm" }
	mobile: null, // { mp4: "/virtual/hero-9x16.mp4", webm: "/virtual/hero-9x16.webm" }
};

// Hero posters, shown instantly and until the video plays. Rendered from the 3D model
// (/virtual?shot=lawn&clean=1), not the live canvas.
export const HERO_POSTER = {
	desktop: "/virtual/stills/hero-16x9.jpg",
	mobile: "/virtual/stills/hero-9x16.jpg",
	alt: "Tipu Sultan's Summer Palace, rebuilt, in late afternoon light.",
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

// Section stills and public/virtual/share.jpg, rendered from the 3D model in capture mode:
// /virtual?shot=<stop id>&clean=1 parks the camera and hides the UI; capture at 1920x1080 and
// 1080x1920, then compress (about 200 KB for the hero posters, which are the first paint).
export const STILLS = {
	context: { src: "/virtual/stills/context.jpg", alt: "The palace inside the walls of Bangalore Fort, from above." },
	walk: { src: "/virtual/stills/walk.jpg", alt: "The colonnade of the palace, rebuilt." },
	whatYouGet: { src: "/virtual/stills/hall.jpg", alt: "The galleried hall of the palace, rebuilt." },
	faq: { src: "/virtual/stills/ceiling.jpg", alt: "The painted ceiling of the hall, rebuilt." },
};

// Server only: VERCEL_ENV is not exposed to the browser, so the page computes this and passes it down.
export function showSlots() {
	return process.env.VERCEL_ENV !== "production";
}
