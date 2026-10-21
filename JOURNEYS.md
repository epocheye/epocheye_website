# /journeys

One scroll-driven page that sells pre-orders for virtual walks through reconstructed Indian
monuments. Black page, one fixed 3D object behind full-screen frames, one statement per frame.
Not linked from the main site; people arrive by shared links. Prices live only here.

## Where things are

| Path | What |
| --- | --- |
| `app/journeys/layout.js`, `journeys.css`, `fonts.js` | Own layout, tokens and type (scoped under `.jr`) |
| `app/journeys/page.js` | Reads `?for=` and renders the page |
| `app/journeys/{terms,privacy,refunds}/page.js` | Placeholder legal pages, each marked `[SAMBIT: legal review]` |
| `lib/journeys/config.js` | All copy, monuments, tiers, prices, frame order, `CHECKOUT_ENABLED` |
| `lib/journeys/keyframes.js` | One 3D pose per frame (desktop and phone) |
| `lib/journeys/checkout.js` | Dodo Payments hand-off (stub, TODO) |
| `components/journeys/JourneysPage.jsx` | Frames, sections, Lenis + ScrollTrigger wiring |
| `components/journeys/Scene.jsx`, `Stage.jsx` | Fixed R3F canvas, poster fallback, `uMix` crossfade |
| `components/journeys/ReserveModal.jsx`, `NotifyForm.jsx` | Reserve / vote / notify forms |
| `app/api/journeys/intent/route.js` | Saves intents to Neon table `journeys_intents` |
| `app/api/journeys/checkout/route.js` | Dodo checkout session (stub, 501 until connected) |
| `scripts/journeys/build-teasers.py`, `scripts/journeys-assets.mjs` | Teaser objects: Blender build, GLB compression, posters, loops |
| `scripts/journeys/record.mjs` | 30 s desktop + phone screen recordings |
| `public/journeys/{models,posters,loops}` | Committed web assets |

## Add a monument card

1. Make the teaser object (see "Teaser objects" below) and drop in
   `public/journeys/models/<object>.glb`, `public/journeys/posters/<object>.webp` (1600 square)
   and `public/journeys/loops/<object>.mp4` + `.webm` (6 s, 720 square).
2. Add an entry to `MONUMENTS` in `lib/journeys/config.js`:
   `{ slug, name, city, era, opens, object: "<object>", alt }`. `slug` is what the reserve
   API stores; `object` is the asset file stem.
3. The card, the modal's monument list and the API's allow-list all read from that array.

## Change dates, copy or prices

Everything is in `lib/journeys/config.js`. `opens` on each monument is shown as
"Opens [date]". Never write "available now". No em or en dashes anywhere. Prices are the
`TIERS` object; nothing else on the site may show them.

## Audience switch

`/journeys?for=family` swaps the hero line and shows the family pass first.
`/journeys?for=history` moves the rockets frame to frame 2 and shows the solo walk first.
Every reserve click logs `journeys_reserve_click` with `variant`, `source` and `monument`
(Vercel Analytics custom events, with `journeys_page_view`, `journeys_reserved`,
`journeys_notify`, `journeys_vote`).

## Swap fonts

`app/journeys/fonts.js` loads the self-hosted Hanken Grotesk variable font from
`public/fonts/hanken-grotesk/` (the Google Fonts loader breaks the Turbopack production build
for this font in Next 16.2). When the Magnetik web licence is bought, put the files in
`public/fonts/magnetik/` and replace the `src` with:

```js
import localFont from "next/font/local";
export const journeysFont = localFont({
	src: [
		{ path: "../../public/fonts/magnetik/Magnetik-Light.woff2", weight: "300" },
		{ path: "../../public/fonts/magnetik/Magnetik-SemiBold.woff2", weight: "600" },
	],
	variable: "--jr-font",
	display: "swap",
});
```

Nothing else changes: every rule reads `var(--jr-font)`.

## Switch on checkout

1. Implement `app/api/journeys/checkout/route.js` (create a Dodo checkout session, return
   `{ url }`) and the Dodo webhook that sets `journeys_intents.status = 'paid'`.
   The client side is already in `lib/journeys/checkout.js`.
2. Set `NEXT_PUBLIC_JOURNEYS_CHECKOUT=true` in the Vercel environment and redeploy.
   Until then every Reserve saves an intent and shows the founding-list message.

## Storage

Neon table `journeys_intents` (`db/012_journeys_intents.sql`, created with
`node --env-file=.env.local scripts/migrate-journeys.mjs`). `kind` is `reserve`, `notify`
or `vote`; `variant` records the audience switch; `country` comes from the edge.

## Teaser objects

The brief asks for Meshy-generated objects cleaned up in Blender. When this page was built,
Meshy refused to create tasks on the account's free plan (HTTP 402, "Task creation on the free
plan is no longer supported") and the Blender MCP server would not connect, so the four
objects are procedural placeholders built and baked in headless Blender 5.2 by
`scripts/journeys/build-teasers.py`. They keep the brief's budgets (hero 2048 texture,
cards 1024, Draco + WebP, under 30k triangles, origin at the base centre, lighting baked in)
and the hero has the two texture sets (`today` and `1791`) the `uMix` crossfade needs.

To replace one with a Meshy object: export the cleaned GLB with the same file stem, run
`node scripts/journeys-assets.mjs --process` with your GLB and renders in `.journeys-build/`
(or just overwrite the files in `public/journeys/`). The hero pillar needs
`palace-pillar.glb` (painted texture inside) plus `palace-pillar-today.webp` on the same UVs.

Rebuild everything from scratch: `node scripts/journeys-assets.mjs` (needs Blender 5.2 at the
path in `BLENDER`, and ffmpeg).

## Facts allowed in copy

Only these, unless the owner adds more: begun under Hyder Ali and completed under Tipu
Sultan around 1791; almost entirely teak; used as British administrative offices after
1799; painted floral interiors almost all faded or lost; reconstruction sourced from
colonial-period documentation and ASI records; Mysore's iron rockets under Hyder Ali and
Tipu Sultan informed Britain's Congreve rockets, fired at Fort McHenry in 1814.

## Placeholders still in the page

Search for `[SAMBIT:` in `lib/journeys/config.js` and `app/journeys/*/page.js`:

- `[SAMBIT: date]` on all four monument cards (opening dates)
- `[SAMBIT: era]` on Bangalore Fort, Victoria Memorial and Indian Museum cards
- `[SAMBIT: 3 lines]` founder note
- `[SAMBIT: legal review]` on the Terms, Privacy and Refunds pages
