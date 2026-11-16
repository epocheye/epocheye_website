# Epocheye Play: status

**Phase:** 0 (inspect, audit, story check). Branch `feat/play`.

## Done
- Brief read (v3, story-led).
- Repo inspected (5.1 report below).
- Branches consolidated: `main` is the only branch besides `feat/play`.

## 5.1 report
1. Framework: Next.js 16.2.4 App Router, React 19, JSX, Tailwind v4, React Compiler. ESLint only, no test runner.
2. Hosting: Vercel project `epocheye-website`. Branch pushes get preview URLs from the Git integration.
3. Backend: Next route handlers, Neon Postgres through `lib/server/neon.js`, hand-run SQL in `db/` plus `scripts/migrate-*.mjs`, admin by JWT cookie (`lib/server/adminAuth.js`), email by Resend (`lib/server/email.js`), in-memory rate limiter (`lib/server/rateLimit.js`).
4. Analytics: cookieless `@vercel/analytics`. No queryable event store for the website, so Play adds its own.
5. 3D and legal: `/virtual` loads one GLB with meshopt and KTX2 through drei; `/journeys` loads Draco GLBs. Both serve from `public/`, no CDN. Legal pages are `/privacy`, `/terms`, `/refunds` (draft).

## Phase 0 results
- `tools/play/AUDIT.md`: verdict NEEDS WORK. THEN renders well. There is no NOW state, and building an honest one is two to three days of work.
- `docs/play/STORY_CHECK.md`: 18 facts checked. 11 corrected, 1 cut, 2 added. Chapter 1 has no restoration.
- Exporter core written: `tools/play/export_pack.py` (estimate, render, assemble, publish) and `tools/play/blender/`.
- Story validator written: `scripts/play/validate-story.mjs`. Story engine reducer: `lib/play/story/engine.js`.

## Phase 1 in progress (2026-11-16)
- Owner chose: NOW derived by the exporter, haze beyond the garden.
- `content/play/tipu-summer-palace-bengaluru/story.json`: Prologue, Chapter 1 and the S2 restoration preview. Validates with 0 errors and 1 placeholder.
- Site config and NOW recipe written. Render estimate printed: 7.2 GPU hours for three viewpoints at 2048 px (small probes overstate it).
- Rendering now: three viewpoints at 1024 px faces. 2048 px follows.
- Piece exported: `pieces/exterior-colour.glb`, 1.5 MB.
- Being built in parallel: the panorama viewer and level UI; the narration pipeline and three-voice bake-off.

## Known issues
- Upper-floor viewpoints render near black. Needs an interior lighting pass before Phase 2.
- The GLB piece carries the scene's materials as exported, not baked textures.

## Next
- Integrate pack, engine and audio. Check on a phone-sized screen. Push `feat/play` for a preview URL. GATE 1.
