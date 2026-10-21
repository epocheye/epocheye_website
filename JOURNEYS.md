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

## Replacing files under public/journeys/

Those files are served with a one-year immutable cache. After replacing any of them, bump
`ASSET_VERSION` in `lib/journeys/config.js`; every model, poster and loop URL carries it as a
query string, which is what makes browsers fetch the new file.

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

Made with Meshy image-to-3D from licensed Wikimedia Commons photographs of each monument (listed
in CREDITS.md and credited in the page footer), then simplified for the web with meshoptimizer
(UV seams locked, Meshy's own textures kept), Draco-compressed, with WebP textures (2048 hero,
1024 cards). The hero also gets a Meshy retexture for the faded "today" set on the same UVs; the
page crossfades the two with a single `uMix` uniform. Lighting is live in three.js (one warm key
spot, one cool rim, low ambient), which keeps the photographic detail that baking into a
30k-triangle re-unwrap destroyed. Triangle counts are 100k to 200k per object; the files still sit
under the brief's budgets (hero 1.7 MB, cards 0.5 to 0.8 MB).

Pipeline, all resumable:

1. `node scripts/journeys/meshy-teasers.mjs image` (key from the `MESHY_API_KEY` user env var;
   REST API, because the project's MCP entry was on a dead free-plan key). Downloads land in
   `.journeys-build/meshy-img/`. About 130 credits for all four objects.
2. `node scripts/journeys/meshy-simplify.mjs` writes `public/journeys/models/`.
3. `blender -b --python scripts/journeys/render-teasers.py -- .journeys-build all` renders the
   posters and the 144-frame turntables from those web GLBs with the same spotlight.
4. `node scripts/journeys-assets.mjs --media` writes the posters and loops. (Never run it without
   `--media` in this flow: `--process` is the older bake pipeline and overwrites the models.)
5. Bump `ASSET_VERSION` in `lib/journeys/config.js`.

Kept for reference: `scripts/journeys/build-teasers.py` (procedural fallback) and
`scripts/journeys/meshy-cleanup.py` (Blender bake pipeline). Both produce the older baked look.

To replace or add an object: pick a licensed frontal photograph of the fragment (not a wide
scene; image-to-3D needs one object), add it to `IMAGE_OBJECTS` in `meshy-teasers.mjs` and to
`OBJECTS` in `meshy-simplify.mjs`, run steps 1 to 5, log the photo in CREDITS.md and
`PHOTO_CREDITS` in `lib/journeys/config.js`, and add the card (see "Add a monument card").

## Scroll choreography

`lib/journeys/keyframes.js` holds one pose per frame for each of the four objects (position,
rotation, scale, fade, and `mix` for the hero). A `fade` of 0 hides an object; between frames
it flies from its hidden spot, so the fort enters on the rockets frame and the four monuments
line up on the "Pick a monument" frame. Phone poses are derived at the bottom of the file.

## Performance notes

The main site's root layout still wraps this route (its four font families, global CSS and
analytics). The announcement banner's motion library is now lazy-loaded only on pages that show
it (`components/layout/AnnouncementBanner.jsx`), which keeps it off `/journeys` and `/virtual`.
On phones the three.js canvas mounts on the first scroll or touch so it never competes with the
first paint; on desktop it mounts when the page is idle after first paint.

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
