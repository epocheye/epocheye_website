// One-off: build the /virtual share card source from the Blender story film. Needs ffmpeg on PATH.
// Run with: node scripts/build-virtual-media.mjs <story-film.mp4>
//   story film: heritage_assets/.../output/film/preview_v1_square.mp4 (PREVIEW; rebuild from the final render)
// public/virtual/share.jpg is read by app/virtual/opengraph-image.js and is the still shown when a
// browser has no WebGL.
import { execFileSync } from "node:child_process";

const [film] = process.argv.slice(2);
if (!film) {
	console.error("Usage: node scripts/build-virtual-media.mjs <story-film.mp4>");
	process.exit(1);
}

// The hall from the story film, 15 s in, cropped to 1200x630.
execFileSync(
	"ffmpeg",
	["-v", "error", "-y", "-ss", "15", "-i", film, "-frames:v", "1", "-vf", "crop=768:403:0:110,scale=1200:630:flags=lanczos", "-q:v", "2", "public/virtual/share.jpg"],
	{ stdio: "inherit" },
);
console.log("Wrote public/virtual/share.jpg");
