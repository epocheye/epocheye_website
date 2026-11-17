# Epocheye Play: quality bar (brief 5.7)

Phase 5, measured 2026-11-17 and 18 on a local production build (`npm run build`, `npx next start -p 3105`) on this Windows laptop, in headless Chrome driven by Puppeteer. Every script is in `docs/play/lighthouse/scripts/`; every raw result is next to this file in `docs/play/lighthouse/`.

**Headless Chrome on a laptop is not a mid-range Android.** The CPU slowdown (4x) and the network throttling are emulated; the GPU, the memory, the browser build, the screen and the radio are this laptop's. What that means is said next to each number.

## The bar

| 5.7 item | Measured | Bar | Result |
|---|---|---|---|
| First playable view, slow 4G (150 ms, 1.6 Mbps), 4x CPU, cold cache | **5.3 s** median (5.26, 5.33, 5.42) on `next start`, after 256 px first faces were added (2026-11-18). Before: 6.5 s; at the start of Phase 5: 8.0 s | under 5 s | **FAIL by 0.3 s** |
| Same, Lighthouse's own slow 4G latency (562.5 ms) | 8.1 s median | under 5 s | FAIL |
| Same, a good 4G link (9 Mbps, 60 ms), 4x CPU | 3.2 s median | under 5 s | pass (for comparison only) |
| Bytes before the first view, cold cache | **899 KB** (gzip, HTTP/1.1); 827 KB (brotli, HTTP/2) | under 3 MB | **PASS** |
| Frame rate dragging the panorama 5 s, 4x CPU | **60 fps** median, 59 fps 5th percentile on this laptop's GPU; 30 / 20 fps with software WebGL | 30 fps | **PASS** on a GPU; borderline in software |
| Works one-handed in portrait (375 px) | primary action always in the lower half, no horizontal scroll, every tap target 44 px or more | | **PASS** |
| Works with mouse and keyboard | whole level played to the end card with Tab, Enter and arrows only; and with the mouse only | | **PASS** |
| `prefers-reduced-motion` respected | whole level played with it emulated: no CSS animation or transition ran | | **PASS** |
| Screen reader labels on controls | axe-core: 0 serious or critical violations on 15 level steps and 6 pages | | **PASS** (no real screen reader used) |
| A fully tap-based path, no drag, no gyro | whole level played with touch taps only | | **PASS** |
| Pack files on versioned paths; no `immutable` on anything unversioned | 705 paths checked, 0 wrong | | **PASS** (was failing) |
| Lighthouse mobile report | saved, scores below | | level page scores 49 for performance |

## Lighthouse mobile

Lighthouse 12, default mobile settings (simulated slow 4G, 4x CPU, Moto G Power screen), one run per page. Reports: `docs/play/lighthouse/*.report.html` and `.json` (`next start`), `docs/play/lighthouse/h2/` (through the HTTP/2 + brotli proxy, closer to Vercel). Before: `docs/play/lighthouse/baseline/`.

| Page | Perf | A11y | Best pr. | SEO | FCP | LCP | TBT | CLS | Speed Index | Total bytes |
|---|---|---|---|---|---|---|---|---|---|---|
| `/play` | 79 | 100 | 96 | 69 | 1.2 s | 5.0 s | 190 ms | 0 | 1.2 s | 933 KB |
| `/play/tipu-summer-palace-bengaluru` | 49 | 100 | 96 | 66 | 1.4 s | 6.8 s | 1,530 ms | 0 | 3.6 s | 4,768 KB |
| `/play/daily` | 86 | 100 | 96 | 66 | 1.2 s | 3.8 s | 170 ms | 0 | 1.2 s | 593 KB |
| `/play` (HTTP/2 proxy) | 84 | 100 | 96 | 69 | 1.1 s | 3.9 s | 230 ms | 0 | 1.3 s | 834 KB |
| level (HTTP/2 proxy) | 52 | 100 | 96 | 66 | 1.1 s | 5.2 s | 1,950 ms | 0 | 3.2 s | 4,680 KB |
| `/play/daily` (HTTP/2 proxy) | 93 | 100 | 96 | 66 | 1.1 s | 2.6 s | 220 ms | 0 | 1.3 s | 514 KB |

Before Phase 5 (`next start`): `/play` 75 (TBT 290 ms), level 49 (TBT **4,300 ms**), daily 86 (accessibility 96: a contrast failure).

How to read them:
- **SEO 66 to 69 is deliberate:** every Play page is `noindex` until launch (DECISIONS 2026-11-16). It goes up when that is lifted.
- **Best practices 96:** the one console error is `/_vercel/insights/script.js` (404), which exists only on Vercel.
- **Level total bytes (4.7 MB)** is everything Lighthouse waits for, including the 1024 and 2048 px faces that stream in after the first view. The brief's limit is on the bytes before the first view (899 KB).
- **Level LCP 6.8 s** is Lighthouse's simulation of the first story line (observed in the unthrottled trace: 0.8 s). The line waits for React to hydrate and mount the level, and the 2 MB of scripts before it (below).
- **Level TBT** fell from 4.3 s to 1.5 s. What is left is React hydrating the page and mounting the level (the `0japrmd...` chunk) and the engine starting up; the sharper faces now decode off the main thread.

## First playable view

**Update 2026-11-18.** Two more changes after this section was written:
- The pack now carries 256 px faces as its first size (88 KB for the six start faces instead of 316 KB at 512). The engine already loads the smallest size first and sharpens from there, so this was a pack change only. Bytes before the first view fell from 916 KB to 706 KB, and the median first view from 6.6 s to 5.3 s (`first-view-256.json`).
- `app/not-found.js` now loads its WebGL background on demand, so three.js is no longer in every page's bundle. It did not move the level's number: the level needs three.js itself. It helps the rest of the site.
- At 1.6 Mbps, 706 KB takes about 3.5 s to arrive; the remaining time is script start-up and the first texture uploads under the 4x CPU slowdown.
- **What would close the last 0.3 s:** the root layout preloads every weight of four font families on every page (about 150 KB), including Instrument Sans, which Play does not use. Turning off that preload, or loading fewer Montserrat Alternates weights, should be enough. Both change every page of the site, so they are the owner's call, not made here.
- On a good 4G link (9 Mbps, 60 ms) the first view was 3.2 s before these changes.
- These measurements ran with the database deliberately unreachable, so no test rows were written.


Definition used: the moment the six 512 px faces of the start viewpoint are drawn **and** the first story line is visible. Measured in the page with `requestAnimationFrame`: the frame after the engine marks `play:first-view` (the faces are uploaded and drawn in it), and the first frame in which `.play-panel .play-line` has text and a box. Puppeteer, Lighthouse's phone size (412x823 at 1.75x), 4x CPU (`Emulation.setCPUThrottlingRate`), `Network.emulateNetworkConditions` 150 ms, 1.6 Mbps down, 750 kbps up, cache disabled, a new browser profile per run, three runs, median. One load after each server start is thrown away (the first request after a start took 3.5 s to answer). Script: `scripts/first-view.mjs`; results `first-view-*.json`.

| Profile | Runs (ms) | Median | First line at | Bytes before |
|---|---|---|---|---|
| Before Phase 5 (one run) | 8,002 | 8.0 s | 4.5 s | 924 KB |
| Task profile, `next start` (HTTP/1.1, gzip) | 6,572 / 6,397 / 6,497 | **6.5 s** | 5.3 s | 899 KB |
| Task profile, HTTP/2 + brotli proxy | 6,552 / 6,436 / 6,574 | 6.6 s | 5.3 s | 827 KB |
| Lighthouse devtools slow 4G (562.5 ms latency) | 8,072 / 8,099 / 8,057 | 8.1 s | 6.9 s | 899 KB |
| Good 4G (9 Mbps, 60 ms), for comparison | 3,331 / 3,227 / 3,248 | 3.2 s | 2.1 s | 899 KB |

The spread between sessions on this laptop was about 0.4 s (other sessions measured 6.4 to 7.1 s for the same build).

**Why it still misses 5 s.** At 1.6 Mbps, about 900 KB takes 4.4 s to arrive whatever the order. Of those bytes, about 315 KB is not Play's and is not needed for the first view, and I may not change it from Play's files:
- **three.js, 165 KB (gzip), is loaded on every page of the site** because the root `app/not-found.js` imports `LiquidEther` (three.js) statically. On the level page three.js is the last script to arrive (4.7 s) and the panorama needs it, so the first view cannot start before then.
- **Eight font files, 150 KB, are preloaded on every page** by the root `app/layout.js`, including Instrument Sans, which Play does not use, and five separate Montserrat Alternates weights. They are fetched at high priority, ahead of the scripts.
- `favicon.ico` (15 KB) and the tally.so widget also load before the first view.

After the last script arrives the main thread needs about 1.8 s at 4x slowdown: React hydration (0.5 s), evaluating three.js (0.3 s), mounting the level, starting WebGL and compiling the shader, then decoding and drawing the faces.

**Recommended outside Play's files** (not done, not mine to change): load `LiquidEther` in `app/not-found.js` with `next/dynamic` (saves 165 KB and its parse on every page of the site), and preload only the fonts above the fold, or none, in `app/layout.js`. On my estimate these two would bring the task profile to about 5 s; that is an estimate, not a measurement.

**What a real phone changes.** A mid-range Android on real 4G usually has more bandwidth than 1.6 Mbps (the good 4G row is 3.2 s), and Vercel serves HTTP/2 with brotli (the proxy row). Its CPU is roughly what the 4x slowdown models; its WebGL start-up and image decoding may be slower than this laptop's.

## Bytes before the first view

899 KB with `next start` (gzip), 827 KB through the HTTP/2 + brotli proxy: limit 3 MB, **pass**. Counted from Resource Timing (`transferSize`) of the document and every resource finished by the first-view moment, cold cache. What is in it: scripts about 410 KB (165 KB of it three.js), fonts 150 KB, the six start faces 281 KB, CSS 35 KB, page 24 KB. `site.json` (124 KB raw) is no longer a request: the server hands it to the page.

## Frame rate

The panorama dragged continuously for 5 s (Puppeteer mouse, about 300 moves) once the view had settled, 4x CPU slowdown, rAF intervals recorded in the page, plus the count of frames in which WebGL actually drew.

| GPU | Median fps | 5th percentile fps | Frames drawn per second |
|---|---|---|---|
| This laptop's GPU (AMD Radeon, Direct3D 11): headless Chrome used it | 59.9 | 59.2 | 59.2 |
| Software WebGL (SwiftShader, `--use-angle=swiftshader`) | 30 | 20 | 29.7 |

**Pass on a GPU, borderline in software.** The brief's caution that headless WebGL is software did not hold here: headless Chrome drew with the laptop GPU, which is faster than a mid-range phone GPU, so 60 fps is optimistic. SwiftShader is far slower than any phone GPU, so 30/20 fps is pessimistic. The CPU slowdown does not slow the GPU process in either case. The real number lies between, on a phone nobody has tried yet. The shader now samples only the layers in use (NOW alone is one texture read), which helps weak GPUs; screenshots of the THEN and proof states are identical before and after that change.

## Cache headers

`scripts/cache.mjs`: HEAD on all 700 files under `public/play/packs` plus five unversioned or missing paths.

| What | Cache-Control |
|---|---|
| `v<N>/pano`, `v<N>/mask`, `v<N>/tier` (427 files) | `public, max-age=31536000, immutable` |
| `site.json`, audio, pieces, evidence images, `CREDITS.md`, `LICENSES.json` | `public, max-age=0, must-revalidate` |
| any path without a version, missing files | not immutable (404, `no-store`) |

0 wrong. **Before**, the site-wide rule in `next.config.mjs` (`/:all*(svg|jpg|...|webp|...)` immutable) also made every evidence image immutable although they are republished in place, and would have made any unversioned `.webp` under `/play/packs` immutable. A rule for `/play/packs/:path*` now comes after the site-wide one and before the versioned one (the last matching rule wins for the same header). Checked on `next start`; Vercel applies the same `headers()`, but I could not check the deployed preview.

## Accessibility and one-handed use

`scripts/playthrough.mjs` plays the whole palace level (Prologue, five chapters, the full reveal, proof switch, year vote, end card) at 375x812 and checks every step; `scripts/axe-pages.mjs` checks the other pages. Results in `docs/play/lighthouse/a11y/`.

| Check | Result |
|---|---|
| axe-core 4 (WCAG 2.0/2.1/2.2 A and AA, best practice) at the first step of every kind: lens, line, look, evidence card open, evidence list sheet, choice, answer, know, hook, restore, order, reveal, proof, vote, end card | 0 violations of any impact |
| axe-core on `/play`, `/play/daily`, `/play/vote`, `/play/leaderboards`, `/play/c/<id>` (made through `POST /api/play/card`), `/play/privacy` | 0 serious or critical (was: `/play/daily` source line 3.56:1, fixed) |
| Keyboard only (Tab to every control, Enter, arrow keys to turn the piece) | level completed; 0 controls Tab could not reach; every focused control showed a focus ring |
| Taps only (touch events, no drag, no gyro) | level completed |
| Mouse only | level completed (also the final play-through, below) |
| Sheets | focus moves into the Chapters sheet, 25 Tab presses never leave it, Escape closes it, focus returns to the Chapters button |
| `prefers-reduced-motion` emulated, keyboard run | level completed; no CSS animation or transition longer than 1 ms ran at any step. The panorama engine and the piece canvas also switch their tweens off (code path, not measured) |
| Story text contrast over the panorama | at every viewpoint visited: 6.0:1 or better. Worst case, a **pure white** panorama behind everything: story line 13.8:1 or better, every label, chip, link and button 4.6:1 or better (`a11y/contrast-white-panorama.txt`; the pack's faces do reach white) |
| Primary action in the lower half of a 812 px screen | at every step |
| Horizontal scroll at 375 px | none, on any step or page |
| Tap targets | all 44x44 px or larger (small pills and the back link keep their look and get a 44 px touch area from `::after`) |

Not tested: a real screen reader (VoiceOver, TalkBack), a real phone in one hand, the gyroscope, the daily puzzle's later steps (axe ran on its first screen; its own smoke test covers keyboard and reduced motion, but it writes rows I could not delete, so I did not run it), Windows high contrast mode.

## Feature switches

`lib/play/features.js` reads seven server-side variables on every request (the `/play` layout calls `connection()`, so no Play page is built with an old setting); each is on unless set to `0`, `off`, `false`, `no` or `disabled`. Documented in `.env.example`. Change one in Vercel and redeploy.

| Variable | Off means |
|---|---|
| `PLAY_ENABLED` | every `/play` page shows a plain "Coming soon" page with no game and no Play API call; every `/api/play/*` route answers 404. Kept: `/play/privacy`, `/play/unlock/stop` and its API (an unsubscribe link already emailed must work), `/play/admin` behind its sign-in |
| `PLAY_DAILY` | `/play/daily` shows "The daily puzzle is not available right now"; `/api/play/daily/*` 404; no daily link on `/play`; no streak board and no daily link on `/play/leaderboards` |
| `PLAY_VOTE` | `/play/vote` "not available"; `/api/play/vote`, `/vote/me` 404; no Vote buttons on locked cards and no vote link. Off whenever `PLAY_EMAIL` is off (voting needs an email). The year vote in the level is part of the story and stays |
| `PLAY_LEADERBOARDS` | `/play/leaderboards` "not available"; `/api/play/leaderboard` 404; no board or "All boards" on the end card, no board on the daily; the daily API sends no board. Runs are still recorded |
| `PLAY_EMAIL` | no email offers (end card, locked cards, early access), no email status call; `/play/unlock` "not available"; `/api/play/email`, `/status`, `/confirm`, `/restore` 404; early access closed. Unsubscribing always works |
| `PLAY_NARRATION` | no Sound button, no audio fetched; the directed pauses still run on reading time |
| `PLAY_ANALYTICS` | no event queued in the browser, `/api/play/event` 404. Runs, votes and daily results (game records) are still kept |

Each switched off once on a production server (`scripts/switches.mjs`, log in `switches.log`): **66 checks, all passed**: pages, API status codes, no links to anything switched off (fetched as a bot), and in Chrome no console error, no failed request, and no call to a switched-off API.

## Link previews

The real services (WhatsApp, Instagram, X, Reddit) were **not tested**: I cannot post to them. Instead `scripts/previews.mjs` fetched each page as a bot does (no JavaScript, `facebookexternalhit` user agent) and checked the tags and the picture; the pictures are in `docs/play/lighthouse/previews/`.

| Page | og:title | og:image |
|---|---|---|
| `/play` | Epocheye Play | Play picture, PNG 1200x630, 39 KB |
| `/play/tipu-summer-palace-bengaluru` | Tipu Sultan's Summer Palace \| Epocheye Play | same Play picture |
| `/play/daily` | The Missing Piece \| Epocheye Play | same Play picture |
| `/play/c/<id>` | Envy of Heaven \| Epocheye Play | the card's own picture, PNG 1200x630 |

All pass: og:title, og:description, absolute og:url and og:image, `twitter:card` `summary_large_image`, the picture renders (read and looked at), PNG, 1200x630, under 600 KB; titles and descriptions have no dashes, no prices and no figures at all.

Before this phase, `/play`, the level and the daily carried the **site's** tags (the app's title and description, the site picture) and no page had og:url. Now each Play page sets its own (`lib/play/meta.js`) and `app/play/opengraph-image.js` draws the Play picture.

Check by hand once deployed:
- **The tags name `https://www.epocheye.com`** (the root layout's `metadataBase`). A link from a preview deployment shows a picture only once `/play` is live on www; until launch a preview link's picture will not load.
- Paste `/play`, the level, `/play/daily` and a card link into WhatsApp, X, Reddit and an Instagram DM; check the picture is the large one and the title is not cut. Instagram shows link previews only in DMs.
- The card picture shows "12 things learned" and "4 things nobody knows", and the page and the share text lead with the share line "Five chapters. Twelve things I did not know." These are counts of facts, not of players; the card's tags leave them out under the rule given for this phase. Your call (the share line is still a `[SAMBIT: confirm]`).
- Previews are cached by each service; use each one's debugger (Facebook Sharing Debugger for WhatsApp) to refresh after a change.

## Final play-through

`playthrough.mjs click` at 375x812 on the last build: the whole palace level, 236 steps, to the end card with Share, See it for real and Next site, in 86 s, **no console errors and no failed requests** other than the Vercel analytics script (`playthrough-final.json`).

## What changed

Performance
- The level page reads `site.json` on the server and hands it to the page (one request fewer, after hydration), and asks the browser for the start viewpoint's six 512 px faces in the page head (`<link rel="preload" as="fetch">`) so they arrive alongside the scripts. `next.config.mjs` traces `site.json` into the `/play/*` functions.
- The panorama engine is part of the level's first scripts instead of two chunks fetched after the level mounted (saved two round trips). The piece canvas stays loaded on demand.
- Faces, masks and tier masks are decoded off the main thread (`fetch` then `createImageBitmap`, flipped for WebGL, no colour conversion), with an `<img>` fallback where a browser cannot flip a bitmap. This took `texSubImage2D` from 5.9 s to 0.6 s of main-thread time in a 4x-slowed load, and Lighthouse TBT from 4.3 s to 1.5 s. Bitmaps are closed when their textures are dropped.
- The shader reads only the layers in use.
- The level's back link no longer prefetches `/play` during the load (it made five requests).

Accessibility and layout
- `--play-faint` text raised from 38 to 52 percent white (was 3.56:1), the daily source line from 11.5 to 12 px.
- The top bar's and the story panel's dark scrims hold further, so every label stays 4.5:1 over a white panorama.
- Order step slots are 44 px tall.

Fixes reported by the coordinator's first-time player (each verified in Puppeteer at 375x812)
1. Doubled full stop when text is joined ("The offices have moved out.. 1800 to 1831."): joined text now goes through `joinSentences` (`lib/play/story/engine.js`), which adds a full stop only where the piece before does not end one. Used for the order step's spoken summary, the evidence and restore announcements and the order board's status. Every step of three full play-throughs was scanned for `..`: none.
2. Evidence list: one tap on a "Go to <place>" item moves there, turns to the item and opens its card (8 of 8 such taps opened the card). "Nothing more to find here." shows only when nothing unfound is at this viewpoint, and says where the rest are ("The rest are at: Upper hall."), or to open a card.
3. Markers on the story panel: a marker whose box would overlap the panel's content is hidden until the view turns it clear, and markers are placed again whenever the panel changes size. Checked at every step of three play-throughs: no marker overlaps the panel. Every move and every piece of evidence can still be reached from the Chapters and List sheets.
- The coordinator's data changes are kept. `source_internal` is never shown, and it is removed from the copy of `site.json` the level page hands to the browser; it is still inside the published `public/play/packs/.../site.json`, which anyone can fetch (the exporter should leave it out; that is outside my files). The painted ceiling's `turn {start_deg: 60}` plays: the restore step snapped and was set in place in every play-through.

Feature switches and link previews as above.

## Not measured, and why

- **A real mid-range Android** on a real 4G network: none here. Every number above is emulated.
- **The deployed preview**: Vercel asks for a sign-in I cannot pass.
- **Real link previews** on WhatsApp, Instagram, X and Reddit: I cannot post to them.
- **A real screen reader**, the gyroscope, real email.
- **Test rows in the production database.** Every player these scripts made has an anonymous id starting `test-q5-` (a few dozen players, with their runs, year votes and events), plus share cards made by the end card of each play-through and card `4wTzdGG4y`. My attempt to delete them was refused by this session's permission settings (direct database access), so **they are still there**. To remove them: `node --env-file=.env.local docs/play/lighthouse/scripts/cleanup.mjs --since 2026-11-17T00:00:00Z 4wTzdGG4y` (`--dry` first to see the counts). The cards made by the end card have ids I did not record; they hold no player data (a card is a story id, lens, choices and vote) and are shared with anyone who makes the same card. The test runs finished in under 100 s, below the 250 s floor, so none is on a leaderboard; the year-vote shares need 20 votes before they show.
