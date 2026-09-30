# Play Store listing: current state and proposal (2026-09-30)

Package: `com.epocheye`. Paste the approved text in Play Console → Grow → Store presence → Main store listing. Claude cannot change the listing.

## Current listing

| Field | Current |
|---|---|
| Title | Epocheye |
| Developer name | Epocheye |
| Short description | See monuments rise again. Point your phone and watch history rebuild |
| Shown on page | 5.0★ (6 reviews), 100+ downloads, Rated 3+, In-app purchases, updated 21 Sept 2026 |

**Current full description: problems**

- It says "We're live at: Konark Sun Temple, reconstructed across four different historical eras; The Indian Museum, Kolkata; Victoria Memorial, Kolkata".
  - **Konark is not live** (`recognition_enabled = false`).
  - **Tipu Sultan's Summer Palace, the flagship, is missing.** ChatGPT now repeats this wrong list (see geo-baseline).
- It says "an AI narrator… adapts to your curiosity. Want the quick version? You get it. Want to go deep…" The live Palace narration is a fixed script, one track per stop (migration 111), so this overstates it.
- It says "Narration is available in English, Hindi, and Bengali". Palace narration is English and Hindi. The Victoria audio guide (with Bengali) is admin-only, so visitors cannot hear Bengali anywhere yet.
- It says "We're building this in step with archaeologists and heritage experts". This is not in the canonical claims, so remove it unless there is a named, written collaboration.
- It keeps the claims that are true and on-brand: "We don't invent history to fill gaps. What we can't verify, we don't fake."

**Current screenshots (8): all UI chrome, none showing a reconstruction**

1. A "Victoria Memorial" detail screen. **The hero photo is not the Victoria Memorial** (it shows a carved temple interior). It says "Built 1921" flatly; the evidence has ground broken in 1904 and opening in 1921.
2. "Today's Discovery": **Hampi** stone chariot (not live), plus a "12-day streak".
3. A home screen with rank "Pathfinder", "8 sites, 4 dynasties, 5 badges" and a **Taj Mahal** card (not live).
4. "You're all set": the image is **Amer Fort, Rajasthan**, captioned "Northern India, Mughal marvels" (not live).
5. "Historian" rank unlocked: "**You've explored 15 heritage sites**", "+120 XP".
6. "Plan a trip": "A weekend in Rajasthan", "Mughal sites near me".
7. The AI Guide "**Grounded at Taj Mahal**" answering a Makrana marble question (not live).
8. The Account screen with a real person's name ("Likhit Nayak") and "**Explorer Pass: unlock AR, HD scans & every site**", which implies an all-sites product that does not exist (the pass is per monument).

Six of the eight show monuments that are not live. None shows what the app is for.

## Proposal (revised 2026-09-30 for branded search)

Goal: "Epocheye" and "Epoch Eye" both find the app first. Play already ranks the app **#1 for "epocheye"** and **#2 for "epoch eye"** (behind Epoch Li-ion by Epoch Batteries, 50K+ installs). See `docs/seo/branded-search.md`.

**Rules for this listing:**
- "Epocheye" appears exactly in the title.
- "Epoch Eye" appears only in the short and full descriptions, written the way people say the name. "Epoch" is never added to the title as a separate word: Play policy prohibits repetitive or misleading title keywords.
- It names the four public monuments (by owner decision, 2026-09-30).
- **Bangalore Fort's recognition is still off in production.** Switch it on before this goes live.
- No price, counts or ratings claims.

### Old and new, every field

| Field | Old | New |
|---|---|---|
| App name (title, 30 max) | `Epocheye` | `Epocheye: Monuments in AR` (25) |
| Short description (80 max) | `See monuments rise again. Point your phone and watch history rebuild` | `Epocheye (Epoch Eye): Tipu's Palace, Bangalore Fort, Victoria Memorial in AR` (76) |
| Full description | Lists Konark as live, leaves out the Summer Palace and Bangalore Fort, "AI narrator adapts to your curiosity", Bengali narration, "in step with archaeologists" | The text below |
| Developer name | `Epocheye` | `Epocheye Private Limited` |
| Category | Entertainment | **Travel & Local** (proposed) |
| Package | `com.epocheye` | unchanged; it cannot change |

**How to change the developer name:** Play Console → Settings → Developer account → Account details → Developer name. For an organisation account, Google may ask for the organisation's details to be re-verified, and it must match the verified legal name ("Epocheye Private Limited", CIN U58200WB2026PTC287076, per the public MCA listing).

**Category:** change it under Grow → Store presence → Store settings → App category. People planning visits look under Travel & Local, and the app faces less competition there than in Entertainment. This is optional and the owner's call.

### Full description (new)

> Epocheye (you may hear it said as "Epoch Eye") shows heritage monuments as the historical record describes them, and says plainly where the record runs out.
>
> Epocheye works at four places:
>
> • Tipu Sultan's Summer Palace, Bengaluru: the palace reconstructed in 3D as it was painted, with a guided narration in English and Hindi.
> • Bangalore Fort, Bengaluru: stand by the surviving wall and see the lost rampart placed back onto the stone, with cards that name each source.
> • Indian Museum, Kolkata: point your camera at an object and read what the museum's published records say, with the source named on each card.
> • Victoria Memorial, Kolkata: point your camera at an exhibit and read what the published records say, with the source named on each card.
>
> Every reconstruction starts from sources: archival drawings, period paintings, published surveys and the monument's own records. Where nothing was recorded, Epocheye says so instead of inventing a detail to fill the gap. The evidence for each monument, including where the sources disagree, is published at epocheye.com/monuments.
>
> Nothing at the site changes. No projectors, no screens on the stone. The reconstruction lives on your phone and is gone when you leave.
>
> Search Epocheye, or Epoch Eye, on Google Play. Then go to the monument, open the app, and look up.

"Epocheye" appears 4 times (plus the epocheye.com link) and "Epoch Eye" twice, both in full sentences, not a keyword list. The per-monument lines match what the shipped code does, as recorded in the monument pages (`lib/monuments/*.js`, `experience`). Victoria Memorial has no narration line because its audio guide is admin-only.

### Screenshots (brief for 6–8 new ones)

Each screenshot is a **real in-app capture** showing a reconstruction or a sourced card. There is no streak, XP, rank, trip planner, account screen or non-live monument.

1. **Summer Palace reconstruction:** the 3D palace as it was painted. Caption: "Tipu Sultan's Summer Palace, Bengaluru: as the records describe it."
2. **The lost colour:** the exterior colour scheme as of 1792, from James Hunter's watercolour (Yale Center for British Art, B1974.12.1168). The caption names the source.
3. **The honest gap:** a board or card saying what no source records. Caption: "Where nothing was recorded, we say so."
4. **Indian Museum:** an object recognised, with its sourced card.
5. **Victoria Memorial:** an exhibit recognised, with its sourced card. It needs a correct photo; the current one shows a temple.
6. **Bangalore Fort:** the lost rampart on the surviving wall, with a sourced card visible. Capture this once recognition is switched on.

A "sources disagree" screenshot (Tipu's dates, 1778–1789 against 1781–1791) can be added only after the app's dates placard and narration carry the dispute. Today they state 1781–1791 as fact.

Remove all eight current screenshots. Remove any real user's name from future captures.
