# Epocheye Play: status

**Phase 2 in progress.** GATE 1 answered on 2026-11-16: the voice is Kokoro. The other GATE 1 rulings were not given, so Phase 2 uses the proposals in STORY_CHECK.md and they come back at GATE 2. The sections below are the GATE 1 record.

## Preview

https://epocheye-website-git-feat-play-sambit-singhas-projects.vercel.app/play

Vercel asks you to sign in first (preview deployments are protected). I could not open the pages through that sign-in, so the deployed copy is confirmed built and Ready but not played by me; the play-through was on the local production build.

## What to look at

- `/play` : site select, one live card, three locked cards.
- `/play/tipu-summer-palace-bengaluru` : Prologue, lens choice, Chapter 1, then the restoration preview from the Chapters list.
- `/play/tipu-summer-palace-bengaluru?ch=2` : straight to the restoration preview.
- `/play/admin/voice` : the voice review page (sign in at `/admin/login` first). Three voices, names reel, redo marks.
- `docs/play/STORY_CHECK.md` : every change to section 8 and why.
- `tools/play/AUDIT.md` : the palace audit.
- `tools/play/voice/BAKEOFF.md` : the three voices, measured side by side, and what to listen for.

## The four things you judge

1. **Does it look like our renders.** Three viewpoints, NOW and THEN, at 512, 1024 and 2048 px cube faces. THEN is the scene as saved. NOW is derived in the exporter from present-state materials and your own photos, with haze beyond the garden.
2. **Is the restoration satisfying.** Chapter 1 has no restoration (nothing structural is lost), so the slice carries the Chapter 2 colour restoration as a labelled preview: turn the pillar, set it, the front's colours come back.
3. **Do you want to know what happens in Chapter 2.**
4. **Which voice.** Prologue in three voices; Chapter 1 and the preview in Kokoro.

## Decisions I need from you

| # | Decision | Where |
|---|---|---|
| 1 | The voice: `kokoro-heart`, `melo-india` or `piper-ljspeech`. Listen to the names reel and correct any name | `/play/admin/voice` |
| 2 | Line p-02, "Most visitors photograph the front, call it nice and old, and leave." Keep or cut. It is your observation | Prologue |
| 3 | F09: put "Bangalore went back to Tipu Sultan in 1792" back in (Rice supports it) or leave it cut (your files' do-not-say list) | STORY_CHECK.md |
| 4 | Chapter 4's turn. The record says most of the palace was pulled down after 1868. Approve the new line or rewrite it | STORY_CHECK.md section 3 |
| 5 | The construction dates. The script now says "by its own inscription" and adds the board's 1770s. Approve | STORY_CHECK.md |
| 6 | Two added lines for wrong picks in the Chapter 1 choice (A and B) | story.json, `c1-A-1`, `c1-B-1` |
| 7 | A fifth chip, "Our reading", beside the four in the brief. Keep or fold into "Our reconstruction" | story.json `tiers` |
| 8 | Title "Envy of Heaven", the four lens names, the share line, the game's working name | brief placeholders |
| 9 | Hunter's 1804 plates of the palace: supply licensed scans, or Chapter 2 uses the one Yale watercolour | AUDIT.md section 7 |
| 10 | Confirm the project-made tiles (exterior diaper, painted ceiling, gilding) are your own work | AUDIT.md section 7 |

## Measured

- Lint: 0 errors. Build: passes. `validate-story`: 17 facts, 43 beats, 0 errors, 1 placeholder (p-02), 1 line over two lines on a 375 px phone (`c1-C-1`).
- Bytes before the first view, cold cache, phone size: 883 KB (limit 3 MB).
- Full play-through, headless Chrome, 375x812 and 1440x900, production build, real pack: no console errors except the Vercel analytics script, which only exists on Vercel.
- Narration, Kokoro, 51 clips: every clip passes the speech-to-text round trip on at least one recogniser; loudness within 0.53 LU; no clipping.
- Pack: 28 MB (panoramas 20 MB, audio 4 MB).
- Render time, GTX 1650: about 30 minutes per viewpoint for both states at 2048 px. The estimate printed beforehand was 7.2 hours for three; the real time was about 1.5 hours.

## Known issues

- **Slow lines run fast in Kokoro.** 6 of 13 slow lines are 19 to 32 percent over the 125 words a minute target. Kokoro garbles words when slowed further. MeloTTS and Piper slow cleanly. Nobody has listened to any clip.
- **`c1-C-1` runs to three lines on a 375 px phone.** It is the list "Stone below. Mud in the walls. Wood for everything...". Splitting it into separate taps would lose the scripted 200 ms list rhythm. The proper fix is text that pages in step with its clips, planned for Phase 2.
- **The flat wall at the end of the colonnade** has a stretched wood-grain look in both states. It comes from the scene's own present-state wall material. Left alone.
- **From the colonnade, the NOW lawn is washed out**, because the exposure is set for the shade.
- **Upper-floor viewpoints render near black** in the scene's late-afternoon light. They need an interior lighting pass before Phase 2.
- **The piece is flat-coloured.** The pillar carries the scene's own colours but no baked texture or fluting detail.
- **Not tested:** gyroscope and the iOS motion prompt, real phone hardware, frame rate, `navigator.share`, a screen reader. All runs were headless desktop Chrome.
- **The `order` beat (Chapter 4's dated cards) is not built.** It no longer locks the level, but the card interface is Phase 2.
- **The Vote button on locked cards is a stub** until the Phase 3 backend.
- **Unlocking a site still needs one line in `lib/play/sites.js`.** A build-time pack index would remove it. Phase 4.
- **`/admin/login` redirects to itself when signed out in a local production build.** That is the existing admin layout, not Play. On Vercel it behaves as today.
- **`docs/virtual/TEXTURES.md` wrongly calls `interior_madder_photo.jpg` our own.** It derives from a Mike Prince photo, CC BY 2.0. Play credits him; `/virtual` should too.

## Placeholders

- `[SAMBIT: your gate observation. Keep or cut.]` (fact O1, line p-02)
- From the brief, still open: final name of the game; confirm the four lenses; confirm the title; confirm the share line; listen to the names reel; which of A or B the model uses for empty panels (answered by the audit: both).

## Done before this gate

- Branches consolidated: `main` is the only branch besides `feat/play`; `archive/color-palettes` kept as a tag.
- Phase 0: repo report, palace audit, story check.
- Exporter: estimate, render (GPU guard, resumable, CPU option), pieces, assemble, publish.
- Engine: panorama viewer, story engine, level UI, restore step, debug view, voice review page. Reviewed from three lenses; 28 findings, all blockers and majors fixed.
- Narration pipeline: render, check, calibrate, lexicon, names reel, recording sheet.

## 5.1 report

1. Framework: Next.js 16.2.4 App Router, React 19, JSX, Tailwind v4, React Compiler. ESLint only, no test runner.
2. Hosting: Vercel project `epocheye-website`. Branch pushes get preview URLs from the Git integration.
3. Backend: Next route handlers, Neon Postgres through `lib/server/neon.js`, hand-run SQL in `db/` plus `scripts/migrate-*.mjs`, admin by JWT cookie, email by Resend, in-memory rate limiter.
4. Analytics: cookieless `@vercel/analytics`. No queryable event store for the website, so Play adds its own in Phase 3.
5. 3D and legal: `/virtual` loads one GLB with meshopt and KTX2; `/journeys` loads Draco GLBs; both serve from `public/`. Legal pages are `/privacy`, `/terms`, `/refunds` (draft).

## After the gate

Phase 2: chapters 2 to 5, the ending, proof toggle, year vote, final card, lenses, the `order` step, interior lighting for the upper floor.
