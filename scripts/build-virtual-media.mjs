// One-off: build the /virtual media from our Blender renders. Needs ffmpeg on PATH.
// Run with: node scripts/build-virtual-media.mjs <ceiling-reel.mp4> <story-film.mp4>
//   ceiling reel: heritage_assets/.../output/blend/renders/EP01_ceiling_1080x1920_v4.mp4
//   story film:   heritage_assets/.../output/film/preview_v1_square.mp4 (PREVIEW; swap for the final render)
import { execFileSync } from "node:child_process";

const [reel, film] = process.argv.slice(2);
if (!reel || !film) {
	console.error("Usage: node scripts/build-virtual-media.mjs <ceiling-reel.mp4> <story-film.mp4>");
	process.exit(1);
}

const ff = (...args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
const OUT = "public/virtual";
const HERO_START = "4"; // skip the first seconds of bare planks so the loop opens on the paint returning

// Hero background: 720x1280, no audio. Small enough to start quickly on 4G.
ff("-ss", HERO_START, "-i", reel, "-an", "-vf", "scale=720:1280:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart", `${OUT}/hero.mp4`);
ff("-ss", HERO_START, "-i", reel, "-an", "-vf", "scale=720:1280:flags=lanczos", "-pix_fmt", "yuv420p", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "40", "-row-mt", "1", "-deadline", "good", "-cpu-used", "4", `${OUT}/hero.webm`);
ff("-ss", HERO_START, "-i", reel, "-frames:v", "1", "-vf", "scale=720:1280", "-q:v", "4", `${OUT}/hero-poster.jpg`);

// Story film at its own size. The preview render is full-range (yuvj420p); convert to TV range,
// or Chrome fails the VP9 stream with a decode error.
const TV_RANGE = ["-vf", "scale=in_range=pc:out_range=tv,format=yuv420p", "-color_range", "tv"];
ff("-i", film, "-an", ...TV_RANGE, "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-movflags", "+faststart", `${OUT}/story-preview.mp4`);
ff("-i", film, "-an", ...TV_RANGE, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "34", "-row-mt", "1", "-deadline", "good", "-cpu-used", "4", `${OUT}/story-preview.webm`);
ff("-ss", "2.5", "-i", film, "-frames:v", "1", "-q:v", "3", `${OUT}/story-preview-poster.jpg`);

// Share card source: the hall from the story film (15 s in), cropped to 1200x630.
ff("-ss", "15", "-i", film, "-frames:v", "1", "-vf", "crop=768:403:0:110,scale=1200:630:flags=lanczos", "-q:v", "2", `${OUT}/share.jpg`);

console.log(`Wrote hero.*, story-preview.*, share.jpg to ${OUT}`);
