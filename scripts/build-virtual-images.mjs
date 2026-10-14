// One-off: build the /virtual hero pair from our own source files.
// Run with: node scripts/build-virtual-images.mjs <today-photo.jpg> <reconstruction.png>
//   today:          heritage_assets/.../research/photos_own/batch1/01_facade_colonnade_square_on_people_for_scale.jpg (own work)
//   reconstruction: heritage_assets/.../output/cards/CARD_P0.png (our Blender render, no figures)
// PROVISIONAL: the two are not shot from the same camera. Replace with a camera-matched pair.
import sharp from "sharp";

const [todaySrc, reconSrc] = process.argv.slice(2);
if (!todaySrc || !reconSrc) {
	console.error("Usage: node scripts/build-virtual-images.mjs <today.jpg> <reconstruction.png>");
	process.exit(1);
}

const OUT_W = 1600;
const OUT_H = 900;
const jpeg = { quality: 80, mozjpeg: true, progressive: true };

// Source photo is 4096x1884. Take a full-height 16:9 window over the colonnade so the
// roofline and plinth sit roughly where they sit in the square-on render.
await sharp(todaySrc)
	.extract({ left: 220, top: 0, width: 3349, height: 1884 })
	.resize(OUT_W, OUT_H)
	.jpeg(jpeg)
	.toFile("public/virtual/today.jpg");

await sharp(reconSrc).resize(OUT_W, OUT_H, { fit: "cover" }).jpeg(jpeg).toFile("public/virtual/reconstruction.jpg");

console.log("Wrote public/virtual/today.jpg and public/virtual/reconstruction.jpg");
