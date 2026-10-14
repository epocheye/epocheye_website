// Guard for the /virtual page's copy rules. Exits 1 on any violation.
// Run with: node scripts/check-virtual-copy.mjs
//  1. No em or en dashes in any /virtual file or the refunds draft.
//  2. Never "AR" or "app" in visible copy (comments, imports and email addresses are ignored).
//  3. The price appears nowhere in app/, components/ or lib/ except lib/virtual/copy.js.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const COPY_FILES = [
	"lib/virtual/copy.js",
	"lib/virtual/images.js",
	"app/virtual/page.js",
	"app/virtual/opengraph-image.js",
	"app/refunds/page.js",
	...readdirSync(path.join(ROOT, "components/virtual")).map((f) => `components/virtual/${f}`),
];
const PRICE_HOME = "lib/virtual/copy.js";
const PRICE_RE = /\$\s?25\b|\b25\s?(?:USD|US\$|dollars)\b|\bUSD\s?25\b/i;

const problems = [];

function visible(src) {
	return src
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/^\s*\/\/.*$/gm, "")
		.replace(/^import .*$/gm, "")
		.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "");
}

for (const rel of COPY_FILES) {
	const src = readFileSync(path.join(ROOT, rel), "utf8");
	if (/[–—]/.test(src)) problems.push(`${rel}: contains an em or en dash`);
	const text = visible(src);
	if (/\bAR\b/.test(text)) problems.push(`${rel}: says "AR"`);
	if (/\bapps?\b/i.test(text)) problems.push(`${rel}: says "app"`);
}

function walk(dir, out = []) {
	for (const name of readdirSync(dir)) {
		const full = path.join(dir, name);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (/\.(jsx?|mjs|tsx?|md|json)$/.test(name)) out.push(full);
	}
	return out;
}

for (const dir of ["app", "components", "lib"]) {
	for (const full of walk(path.join(ROOT, dir))) {
		const rel = path.relative(ROOT, full).split(path.sep).join("/");
		if (rel === PRICE_HOME) continue;
		if (PRICE_RE.test(readFileSync(full, "utf8"))) problems.push(`${rel}: mentions the /virtual price`);
	}
}

if (problems.length) {
	console.error("check-virtual-copy failed:\n" + problems.map((p) => `  - ${p}`).join("\n"));
	process.exit(1);
}
console.log(`check-virtual-copy: ok (${COPY_FILES.length} copy files, price only in ${PRICE_HOME})`);
