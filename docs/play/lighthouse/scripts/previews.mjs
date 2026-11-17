// Link previews as a bot sees them: fetch each page with no JavaScript, read its Open Graph and
// X tags, then fetch the og:image (from this server, at the same path) and check it.
//
//   node docs/play/lighthouse/scripts/previews.mjs <card id> [out dir for the images]
//
// Checks: og:title, og:description, og:url, og:image absolute, twitter:card summary_large_image,
// the image PNG or JPEG, 1200x630, under 600 KB; copy with no em or en dashes, no prices, no counts.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { BASE, SLUG } from "./common.mjs";

const card = process.argv[2];
const out = process.argv[3] || null;
if (out) mkdirSync(out, { recursive: true });
const paths = ["/play", `/play/${SLUG}`, "/play/daily", card ? `/play/c/${card}` : null].filter(Boolean);
const UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
let fails = 0;
const check = (ok, msg) => {
	console.log(`  ${ok ? "PASS" : "FAIL"}  ${msg}`);
	if (!ok) fails++;
};
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const rows = [];
for (const path of paths) {
	console.log(path);
	const html = await fetch(BASE + path, { headers: { "User-Agent": UA } }).then((r) => r.text());
	const tag = (key) => {
		const m = html.match(new RegExp(`<meta[^>]*(?:property|name)="${key}"[^>]*content="([^"]*)"`)) || html.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*(?:property|name)="${key}"`));
		return m ? decode(m[1]) : null;
	};
	const t = {
		title: tag("og:title"), description: tag("og:description"), url: tag("og:url"), image: tag("og:image"),
		imageType: tag("og:image:type"), card: tag("twitter:card"), twitterImage: tag("twitter:image"),
	};
	for (const k of ["title", "description", "url", "image"]) check(!!t[k], `og:${k} present: ${t[k]}`);
	check(/^https:\/\//.test(t.image || ""), "og:image is an absolute https URL");
	check(/^https:\/\//.test(t.url || ""), "og:url is absolute");
	check(t.card === "summary_large_image", `twitter:card ${t.card}`);
	const copy = `${t.title} ${t.description}`;
	check(!/[–—]/.test(copy), "no em or en dashes");
	check(!/[₹$€£]|\bRs\.?\s?\d|\bINR\b|\bprice\b/i.test(copy), "no prices");
	check(!/\d/.test(copy), "no counts (no figures at all in the title or description)");
	// The image, from this server at the same path (the tag names the canonical host).
	const local = BASE + new URL(t.image).pathname + new URL(t.image).search;
	const res = await fetch(local, { headers: { "User-Agent": UA } });
	const buf = Buffer.from(await res.arrayBuffer());
	const type = res.headers.get("content-type");
	const meta = await sharp(buf).metadata().catch(() => null);
	check(res.ok && /image\/(png|jpeg)/.test(type || ""), `image answers ${res.status} ${type}`);
	check(meta?.width === 1200 && meta?.height === 630, `image is ${meta?.width}x${meta?.height}`);
	check(buf.length < 600 * 1024, `image is ${(buf.length / 1024).toFixed(0)} KB`);
	const name = path === "/play" ? "play" : path.replace(/^\/play\//, "").replace(/[^a-z0-9-]+/gi, "-");
	if (out) writeFileSync(join(out, `og-${name}.png`), buf);
	rows.push({ path, ...t, imageBytes: buf.length, imageSize: meta ? `${meta.width}x${meta.height}` : null, imageContentType: type });
}
if (out) writeFileSync(join(out, "previews.json"), JSON.stringify(rows, null, 1));
console.log(fails ? `${fails} check(s) failed` : "all checks passed");
