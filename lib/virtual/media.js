// Media for /virtual. Everything here is our own Blender work on the reconstruction;
// no photo of the palace as it stands today is used on this page.
// Built from E:\heritage_assets\tipu-summer-palace-bengaluru\output by scripts/build-virtual-media.mjs.

// Hero background: the EP01 painted-ceiling reel (1080x1920 render, encoded at 720x1280).
// The ceiling's paint returns, then the camera drops to the arcade and the garden.
export const HERO_VIDEO = {
	webm: "/virtual/hero.webm",
	mp4: "/virtual/hero.mp4",
	poster: "/virtual/hero-poster.jpg",
};

// "The story" film: Bengaluru in 1791, the fort, the palace of wood, the hall, the ceiling.
// PREVIEW: only a 768x768 preview render exists (rendered at 384px), so it is soft.
// When the final render exists, add it under NEW file names (public/ media is served with a
// one-year immutable cache, so reusing a name would leave visitors on the old file), point
// STORY_VIDEO at them, and set this to false.
export const STORY_IS_PREVIEW = true;

export const STORY_VIDEO = {
	webm: "/virtual/story-preview.webm",
	mp4: "/virtual/story-preview.mp4",
	poster: "/virtual/story-preview-poster.jpg",
	label: "Film: Tipu Sultan's Summer Palace",
};

// Share card source: public/virtual/share.jpg (1200x630, the hall from the story film),
// read by app/virtual/opengraph-image.js. Rebuild it from the final film.
