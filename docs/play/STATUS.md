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

## Waiting on the owner
- **NOW state**: how to build it (AUDIT.md section 3). Asked 2026-11-16.

## Next
- Phase 1 vertical slice: story.json for the Prologue and Chapter 1, panorama viewer, narration bake-off, then GATE 1.
