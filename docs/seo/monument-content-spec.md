# Monument page content spec

This spec covers the data files in `lib/monuments/<slug>.js`, which the page at `/monuments/<slug>` renders. It also covers WHAT'S GONE episodes in `lib/whats-gone/`. The guard script `scripts/check-monument-claims.mjs` enforces the rules below on every `npm run lint`.

## Rules (from the SEO brief and the canonical claims doc)

1. **Every factual sentence traces to a named source.**
   - Each paragraph carries `cite: [sourceId, …]`.
   - Each source has a `name` and a `url`. When no URL exists (an on-site signboard), it has an `onSite` description of where the source is instead.
2. **Hedges are the product.** The wording follows the evidence tier:
   - `confirmed`: a primary source, or two independent sources that agree. State it plainly.
   - `source`: one source says it and it has not been cross-checked. Attribute it: "According to …", "The ASI's board says …".
   - `estimate`: derived proportionally or reconstructed. Say so: "an estimated …", "about …", "reconstructed from …".
   - `disputed`: sources conflict. Give **both** values, each with its source. Never average them and never pick one silently.
   - `unrecorded`: no source records it. Say so plainly: "No source we could reach records …".
3. **Never harden a figure.** "Around a hundred and sixty pillars" never becomes "160 pillars". Keep the source's own precision or less, never more.
4. **Banned everywhere on these pages:**
   - Any price, any currency symbol or figure (₹, $, rupees, dollars), "free", "subscription", "plan".
   - User, download, waitlist or signup counts. Ratings. Testimonials. "Backed by".
   - Parent-company framing. The company is Epocheye Private Limited.
   - Konark or Udayagiri as live.
5. **Opening answer:** 2–3 plain sentences that directly answer the obvious question (for example, "What did Tipu Sultan's Summer Palace look like?"). An AI engine should be able to lift them whole.
6. **Name the gaps.** Every page has an `unknowns` list, and at least one sentence in the page says what is not recorded.
7. **Don't carry an evidence conflict silently.** When the evidence ledger contradicts app content or DB seed text, the page follows the **ledger**. If the ledger marks a claim DO_NOT_USE or blocklisted, it does not appear.
8. **Plain voice.** No marketing adjectives ("breathtaking", "magnificent", "stunning"). Short sentences. British/Indian spelling (colour, metre).

## Data shape

```js
// lib/monuments/<slug>.js
const monument = {
  slug: "tipu-summer-palace-bengaluru",        // matches production monuments.slug
  name: "Tipu Sultan's Summer Palace",
  alternateNames: ["Rashk-e-Jannat"],          // only names a source uses
  city: "Bengaluru",
  region: "Karnataka",
  country: "IN",
  geo: { lat: 12.9594944, lng: 77.5735722 },   // from the production monuments table
  wikidata: "Q7809034",                        // or null if unverified
  live: true,
  updated: "2026-09-30",
  seo: {
    title: "…",                                // ≤ 60 chars, monument name first
    description: "…",                          // ≤ 155 chars, plain, no hype
  },
  answer: [ /* paragraph objects: the opening direct answer */ ],
  sections: [
    // headings in this order; leave out a section only if nothing sourced exists for it
    { id: "what-it-was",      heading: "What it was",                   paragraphs: [ … ] },
    { id: "what-survives",    heading: "What survives",                 paragraphs: [ … ] },
    { id: "what-is-gone",     heading: "What is gone",                  paragraphs: [ … ] },
    { id: "reconstruction",   heading: "What Epocheye shows, and from what", paragraphs: [ … ] },
    { id: "disputed",         heading: "Where the sources disagree",    paragraphs: [ … ] },
  ],
  unknowns: [ { text: "No measured drawing of this building exists in any source we could reach.", cite: ["pm"] } ],
  experience: {
    // what a visitor gets in the app at this monument; must match the shipped app
    summary: "…",
    cite: [],                                  // may be empty: this describes our own product
  },
  faq: [ { q: "…?", a: { text: "…", cite: ["…"], tier: "…" } } ],  // only questions the page answers
  sources: {
    pm: {
      name: "Palace measurements and evidence file",
      publisher: "Epocheye research",
      url: null,
      onSite: null,
      internal: true,
    },
    hunter: {
      name: "James Hunter, watercolour of the palace, 1792",
      publisher: "Yale Center for British Art, B1974.12.1168 (CC0)",
      url: "https://collections.britishart.yale.edu/…",
    },
  },
};
export default monument;
```

**Paragraph object:**

```js
{ text: "…", cite: ["sourceId"], tier: "confirmed" | "source" | "estimate" | "disputed" | "unrecorded" }
```

## Rules for sources

- **Prefer the public source the evidence file names:** museum collection pages, archive.org scans of named books with printed page numbers, ASI and ministry pages, Wikipedia (tier 4, labelled as tertiary).
- **Epocheye's own research files** (`internal: true`) may be cited only for our own derivations ("estimated from six photographs"). They are named, but never linked to a local path.
- **Never cite:**
  - Google redirect links
  - Generated images (for example `the_lost_colour.jpg`)
  - Hotel, travel-aggregator or exam-prep sites
- **Every `url` must be a real URL** that you took from an evidence or reference file, or opened and checked yourself. Never construct a URL by guessing.
