// Worst case for the story text: a pure white panorama behind the panel. Each text element of
// the panel and the top bar is compared with the lightest pixel behind it (text hidden for the shot).
//   node docs/play/lighthouse/scripts/contrast-worst.mjs
import sharp from "sharp";
import { BASE, PHONE, SLUG, launch, sleep, testPage } from "./common.mjs";
const browser = await launch();
const { page } = await testPage(browser, { viewport: PHONE });
await page.goto(`${BASE}/play/${SLUG}`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => performance.getEntriesByName("play:first-view").length, { timeout: 60000 });
await sleep(800);
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
async function run(label) {
  await page.evaluate(() => { const c = document.querySelector(".play-pano-canvas canvas"); if (c) c.style.visibility = "hidden"; document.querySelector(".play-pano-canvas").style.background = "#fff"; });
  const els = await page.evaluate(() => [...document.querySelectorAll(".play-panel .play-line, .play-panel .play-ui-text, .play-panel .play-label, .play-panel .play-chip, .play-panel .play-link-btn, .play-where span, .play-panel .play-count, .play-panel .play-pill, .play-panel .play-evidence-title, .play-panel .play-evidence-caption, .play-panel .play-evidence-credit, .play-panel .play-evidence-quote, .play-panel .play-tray-card")].map((el, i) => { el.dataset.w = i; const b = el.getBoundingClientRect(); const st = getComputedStyle(el); const inset = parseFloat(st.borderTopWidth) > 0 ? 4 : 0; /* a border is not what the text sits on */ return { i, cls: el.className, x: b.x + inset, y: b.y + inset, w: Math.min(b.width - 2 * inset, innerWidth - b.x - inset), h: Math.min(b.height - 2 * inset, innerHeight - b.y - inset), color: st.color }; }).filter((e) => e.w > 2 && e.h > 2));
  for (const e of els) {
    await page.evaluate((i) => { const el = document.querySelector(`[data-w="${i}"]`); el.dataset.c = el.style.color; el.style.color = "transparent"; el.style.textDecorationColor = "transparent"; el.querySelectorAll(".play-chip-dot, svg, .play-tray-mark").forEach((d) => (d.style.visibility = "hidden")); }, e.i);
    const png = await page.screenshot({ clip: { x: e.x, y: e.y, width: e.w, height: e.h } });
    await page.evaluate((i) => { const el = document.querySelector(`[data-w="${i}"]`); el.style.color = el.dataset.c; el.style.textDecorationColor = ""; el.querySelectorAll(".play-chip-dot, svg, .play-tray-mark").forEach((d) => (d.style.visibility = "")); }, e.i);
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let best = 0, bp = [0,0,0];
    for (let k = 0; k < data.length; k += info.channels) { const p = [data[k], data[k+1], data[k+2]]; const l = lum(p); if (l > best) { best = l; bp = p; } }
    const c = e.color.match(/[\d.]+/g).map(Number); const a = c[3] ?? 1; const shown = c.slice(0,3).map((v, j) => v * a + bp[j] * (1 - a));
    const L = [lum(shown), best].sort((x, y) => y - x); console.log(label, e.cls.slice(0, 30).padEnd(30), ((L[0] + 0.05) / (L[1] + 0.05)).toFixed(2), JSON.stringify(bp));
  }
}
await run("prologue");
// Chapter 1: on to its first Look step, then open a piece of evidence.
await page.goto(`${BASE}/play/${SLUG}?ch=1`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => performance.getEntriesByName("play:first-view").length, { timeout: 60000 });
for (let i = 0; i < 40 && !(await page.$(".play-panel.is-look")); i++) {
	await page.evaluate(() => document.querySelector(".play-panel .play-continue")?.click());
	await sleep(150);
}
await sleep(500);
await run("look");
await page.evaluate(() => [...document.querySelectorAll(".play-panel .play-pill")].find((b) => b.textContent.trim() === "List")?.click());
await sleep(400);
await page.evaluate(() => document.querySelector(".play-sheet .play-list-row")?.click());
await sleep(1500);
await run("evidence");
await browser.close();
