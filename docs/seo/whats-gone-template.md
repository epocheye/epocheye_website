# WHAT'S GONE: companion page template

Each weekly episode gets one page at `/whats-gone/<slug>`. Every page covers one monument, one thing that no longer exists, the reconstruction, and the honest gap. The structure is the same every week.

The route, rendering, JSON-LD (`Article`), sitemap entry and guard checks are already built. No episode exists yet (`EPISODES = []`), so the route returns 404 and nothing is in the sitemap.

## Adding an episode

1. Write the episode from the evidence files, following `docs/seo/monument-content-spec.md` (tiers, hedging, banned content, source rules).
2. Add the object to `EPISODES` in `lib/whats-gone/index.js`:

```js
{
  slug: "tipu-summer-palace-the-lost-colour",
  episode: 1,
  monument: "tipu-summer-palace-bengaluru",   // must match a file in lib/monuments
  title: "The lost colour of Tipu Sultan's Summer Palace",
  published: "2026-10-06",
  updated: "2026-10-06",
  seo: { title: "…", description: "…" },       // title ≤ 60 chars, description ≤ 160
  answer: [{ text: "…", cite: ["hunter"], tier: "confirmed" }],
  sections: [
    { id: "the-monument",   heading: "The monument",           paragraphs: [/* … */] },
    { id: "what-is-gone",   heading: "The thing that is gone", paragraphs: [/* … */] },
    { id: "reconstruction", heading: "The reconstruction",     paragraphs: [/* … */] },
    { id: "the-gap",        heading: "The honest gap",         paragraphs: [/* … */] },
  ],
  sources: { hunter: { name: "…", publisher: "…", url: "https://…" } },
}
```

3. Run `npm run lint`. The guard checks that:
   - the monument exists,
   - the four sections are present in this order,
   - every paragraph has a cite and a tier,
   - every source has a name and a URL, an on-site description, or `internal: true`,
   - the text contains no price, currency, counts or non-live monuments.
4. Deploy. The page is statically generated and added to `sitemap.xml`.

## Rules that matter most here

- **"The honest gap"** is required and must be specific. Say what no source records about the thing that is gone, and name the resolution route when one exists (for example, "one tape measurement on site").
- **Don't make it firmer than the source.** If the episode's video or narration hedges a claim, the page hedges it the same way.
- **Name what the reconstruction is based on** (Hunter's 1792 watercolour, Mackenzie's 1791 survey, and so on), and say which parts are estimates.
