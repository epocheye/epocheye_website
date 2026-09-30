# GEO baseline: 2026-09-30 (before any monument page exists)

This is the only GEO measurement that counts: ask the engines, record whether Epocheye appears. Re-run the **same prompts, same way** 2–4 weeks after the monument pages are indexed, and add an "after" column.

**Method.** Engines were queried through the in-app browser, logged out, with no personalisation, from India, around 00:50–01:00 IST. The model is whatever each engine served by default: ChatGPT with web search (`hints=search`), Gemini Flash-Lite, and Perplexity's default Search.

## Prompts

| # | Prompt |
|---|---|
| P1 | What did Tipu Sultan's Summer Palace in Bengaluru originally look like? |
| P2 | What did Bangalore Fort look like before most of it was demolished? |
| P3 | Victoria Memorial Kolkata history |
| P4 | Indian Museum Kolkata history and what to see |
| P5 | Is there an AR app that shows reconstructions of monuments in Bengaluru or Kolkata? |

## Results

| Engine | P1 Tipu | P2 Fort | P3 Victoria | P4 Indian Museum | P5 AR app |
|---|---|---|---|---|---|
| ChatGPT (logged out, search) | No | No | No | No | **Yes**, cited from the Play listing |
| Gemini (logged out) | No | No | No | No | No |
| Perplexity (logged out) | No | *throttled* | No | *throttled* | *throttled* |
| Copilot | *needs sign-in, run by owner* | | | | |
| Claude | *needs sign-in, run by owner* | | | | |

**Epocheye appears in 1 of 12 answered prompts. It appears only for the app-intent query, and never for a monument query.**

## What the engines said (key lines and sources)

### ChatGPT
- **P1 Tipu.** Sources: Karnataka Tourism (old.karnatakatourism.org).
  - "Construction began under Hyder Ali and was completed by Tipu Sultan in 1791", given as settled.
  - Two storeys, teak, fluted pillars, cusped arches.
  - No dispute mentioned.
- **P2 Fort.** Sources: startrader.one, StarTrader, The Indian Express, a Kiwix mirror, Past India.
  - "Roughly a kilometre around", "about 26 towers/bastions", "enclosed Tipu Sultan's Summer Palace".
  - The perimeter figure traces to a trading-education site.
- **P3 Victoria.** Sources: victoriamemorial-cal.org, artsandculture.google.com.
  - 1901 proposed, 1904 excavation, 4 Jan 1906 foundation stone, 1921 opened. Emerson and Esch.
- **P4 Indian Museum.** Source: indianmuseumkolkata.org.
  - Founded 1814 by the Asiatic Society, moved to Chowringhee in 1878.
- **P5 AR app.** Sources: Google Play (Epocheye's listing and FlippAR Go).
  - Names **Epocheye**: "currently lists Victoria Memorial and the Indian Museum in Kolkata; it also has Tipu Sultan Summer Palace content, though I didn't find confirmation that Bengaluru itself is currently supported."
  - Also names **FlippAR Go** (Bengaluru heritage AR).
  - The Play description is the only source ChatGPT found for Epocheye. It lists Konark and omits Bengaluru, and ChatGPT repeated that error.

### Gemini (Flash-Lite)
- **P1 Tipu.** Mostly unsourced, with a Maps card.
  - "Constructed between 1781 and 1791" as fact.
  - "Four symmetrical staircases" and "frescoes depicting historic events and court life".
  - Neither detail is in our evidence. `palace-dimensions.json` marks stair details UNRECORDED.
- **P2 Fort.** Sources: The New Indian Express, Scribd, Mapcarta.
  - "26 robust, round bastions", "eight major gates".
  - Says Baird was held in fort dungeons.
  - Says the Summer Palace "lay just outside/adjacent to the inner citadel".
- **P3 Victoria.** Sources: Testbook, Treebo Hotels, Wikipedia, Scribd.
  - Cost "over £1,050,000", Makrana marble, Martin & Co.
- **P4 Indian Museum.** Maps card, no citations.
  - 1814, Wallich, 1878 building "designed by Walter B. Grawille" (sic).
- **P5 AR app.** Sources: ResearchGate, Testbook, Deccan Chronicle, INTACH Bangalore, augtraveler.com.
  - Names Timescape: Kolkata, INTACH's Fort Walk app and Augtraveler.
  - **No Epocheye.**

### Perplexity (logged out)
- **P1 Tipu.** Sources: indianexpress, newindianexpress, wikipedia, inheritage.
  - "**160 carved wooden pillars**" as a hard number. Our evidence tier for this is DISPUTED: stated by sources but never independently counted.
  - "Upper floor had four corner rooms used as the Zenana."
  - "East wing… collapsed during the 1791 war."
- **P3 Victoria.** Sources: britannica and others.
  - Cornerstone 4 Jan 1906, opened 1921, Emerson and Esch.
- **P2, P4, P5:** "Sign up and repeat your request." These were throttled after two anonymous queries. Re-run them signed in, or on another day.

## What this tells us

1. **No engine cites Epocheye for any monument question.** The answers are built from tourism boards, newspapers, Wikipedia, and in Bangalore Fort's case a trading site.
2. **The gap the brief predicted is real.** Every engine states contested numbers as fact: 160 pillars, 1781–1791, 26 bastions, a one-kilometre perimeter. No answer says what is *not* recorded. A page that separates the known, the disputed and the unrecorded, with named sources, gives engines something none of their current sources offer.
3. **The Play Store description is currently Epocheye's GEO surface.** It is feeding ChatGPT a wrong live list (Konark, no Bengaluru). Fixing the listing is the fastest GEO win (see play-store-listing.md).
4. **Competitors named for app intent:** FlippAR Go, Timescape: Kolkata, INTACH Fort Walk, Augtraveler.

## For the owner to run (signed-in engines)

Run P1–P5 on Copilot and Claude, and the throttled P2/P4/P5 on Perplexity. Paste the answers into this file, noting for each whether Epocheye appears and which URLs are cited.
