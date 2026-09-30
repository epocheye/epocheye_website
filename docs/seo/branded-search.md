# Branded search: "Epocheye" and "Epoch Eye"

Goal: anyone who types Epocheye, or hears it and types "epoch eye", finds the app first on Play Store and on Google. Not a goal: 3–4 letter autocomplete ("epo", "epoc").

## 1. Baseline (2026-09-30, logged out, India: `gl=IN`, `hl=en`, non-personalised)

**Method:**
- **Play:** `play.google.com/store/search?q=…&c=apps&gl=IN&hl=en_IN`, fetched logged out; results read in page order. The Play app on a phone can order results differently from the web store.
- **Google:** `google.com/search?q=…&gl=in&hl=en&pws=0` in a signed-out browser.

| Query | Play position | Above us on Play | Google position | Above us on Google |
|---|---|---|---|---|
| epocheye | **1** | n/a | **1** (epocheye.com, apex) | n/a |
| epoch eye | **2** | Epoch Li-ion (Epoch Batteries) | **not in top 20** | Epoch Eyewear (US sunglasses brand) takes every result |
| epocheye app | **1** | n/a | **1** (Play listing); site #2 | n/a |
| epocheye ar | **1** | n/a | **1** (epocheye.com); Play #2 | n/a |
| epoch eye app | **2** | Epoch Li-ion | **not on page 1** | Epoch (Play), Epoch X (App Store), Epoch Times, F-Droid "Epoch" |
| epoch | **not in top 30** | see the table below | not realistic | epoch converter, dictionary meaning |

### "epoch" on Play: the top 10 (installs and ratings from each listing)

| # | App | Developer | Downloads | Rating | Category |
|---|---|---|---|---|---|
| 1 | Epoch Li-ion | Epoch Batteries | 50K+ | 3.8 (119) | Tools |
| 2 | Epoch Cloud | Epoch Batteries | 500+ | none | Tools |
| 3 | Epoch Pro | Epoch Batteries | 1K+ | none | Tools |
| 4 | Epoch Widget | Media Labs | 100+ | none | Productivity |
| 5 | Epoch Time Converter | Kraygsoft Limited | 100+ | none | Tools |
| 6 | Epoch Times Print Edition | Epoch Times Association Inc | 1K+ | none | News & Magazines |
| 7 | Epoch Time Converter | Zanaxú | 1K+ | none | Tools |
| 8 | Epoch Unix Time Converter | SuperVoid | 5K+ | 4.3 (68) | Tools |
| 9 | Epoch: Watch Face | amoledwatchfaces | 100+ | none | Personalization |
| 10 | Epoch | TableTop Journeys | 50+ | none | Board |

**Verdict:** "epoch" on Play is **winnable on installs over time**. Only one app has meaningful volume (50K+); the rest have 5K+ installs or fewer. Metadata alone will not do it: the listing must carry the word ("Epoch Eye" in the descriptions), and installs and engagement from branded searches have to follow. **"epoch" on Google is not winnable.**

### Autocomplete (Google, India)

| Typed | Suggestions (in order) |
|---|---|
| epo | epoch converter, epoxy flooring, eportal income tax, epoch, epoxy grouting, epoch time converter, epo, epoch meaning, epfo, epoch to time |
| epoc | epoch converter, epoch, epoch time converter, epoch meaning, epoch to time, epoch to timestamp, epoch to ist, epoc, epoch to date, epoch time now |
| epoche | epoche meaning, epoche, epoch converter, **epocheye** (#4), … |
| epochey | **epocheye** (#1), epoch eyewear, … |
| epoch ey | epoch eyewear ×5, **epoch eye** (#6), … |

Play Store autocomplete was **not captured**. The public suggest endpoint is retired (404), and the browser check was stopped at the owner's request. Measure it by hand in the Play app at the next re-measure.

**What we are up against:**
- **Google:** Epoch Eyewear owns "epoch eye*", and "epoch converter" and EPFO own "epo"/"epoc".
- **Play:** Epoch Batteries owns "epoch".

## 2. Play listing

Old and new for every field: see [play-store-listing.md](play-store-listing.md).
- The title contains "Epocheye" exactly. "Epoch" is not added as a separate title word, per Play policy.
- "Epoch Eye" appears in the short and full descriptions only.
- The developer name changes to "Epocheye Private Limited".

## 3. Google

| Item | Old | New / status |
|---|---|---|
| Homepage `<title>` | `Epocheye - Historical Intelligence for the Physical World` | `Epocheye (Epoch Eye): monuments as the record describes them` (60 chars, leads with Epocheye) |
| Organization schema | none before this project | name Epocheye, **alternateName Epoch Eye**, legalName Epocheye Private Limited, logo, url, and sameAs for LinkedIn, Instagram @epocheyeinc, X @epocheyeinc and the Play listing (Crunchbase once it exists) |
| WebSite and MobileApplication schema | none | name Epocheye, alternateName Epoch Eye |
| "Epoch Eye" on the page | nowhere | footer ("Say it 'Epoch Eye'"), /monuments intro, /download |
| Domains | apex and www both 200; `.app` → www with **307** | `vercel.json`: 308 apex → www (except `/api/`) and 308 `.app` → www. **The owner must also set 308 in Vercel → Domains, which overrides `vercel.json`.** |

### Google Business Profile

- **None exists** (Maps search for "Epocheye" found nothing).
- **Creating one requires:**
  - a physical location where customers are served in person during stated hours, or a service-area business that visits customers
  - verification by video or postcard at that address
- **Online-only businesses are not eligible** under Google's guidelines. An app company with a registered office customers don't visit does not qualify. **Don't create one** unless Epocheye has a staffed, customer-facing location (for example, a staffed desk at a monument).

### Name and one-line description across profiles: mismatches

| Surface | Name | Description | Mismatch |
|---|---|---|---|
| Website | Epocheye | the approved one-liner | none |
| Play | Epocheye, developer "Epocheye" | "See monuments rise again…" | developer name not the legal name; description differs → fix per play-store-listing.md |
| LinkedIn (company/epocheye) | Epocheye | "AI Native Experience Layer for Tourism" | **tagline differs** |
| Instagram | @epocheyeinc (ours) | not checked (login wall) | **@epocheye belongs to an unrelated photographer** and ranks on Google for "epocheye". Use @epocheyeinc everywhere and never link to @epocheye |
| X | @epocheyeinc | not checked (login wall) | confirm the bio |
| Crunchbase | being created | n/a | use the one-liner and "Epocheye Private Limited" |
| BeBee (third party) | "Epocheye, Inc" | n/a | **wrong entity type**; request a correction |
| ZaubaCorp, Tracxn (third party) | EPOCHEYE PRIVATE LIMITED / Epocheye | n/a | correct |

**Text for every bio:** *Epocheye (Epoch Eye) is an augmented-reality app that shows heritage monuments as the historical record describes them, and says plainly where the record runs out.* Where there is a character limit, use *Epocheye (Epoch Eye): heritage monuments as the record describes them.*

**Google's AI Overview for "epocheye"** currently says Konark is live and repeats "offline-first" and "adjusts to your questions". The sources were the Play description and the homepage copy. The homepage lines are now corrected, and the Play description is in the proposal.

## 4. QR codes

- **Gate/site QR** (`public/playstoreqr.svg`, decoded 2026-09-30): points **directly** to `https://play.google.com/store/apps/details?id=com.epocheye`, with **no referrer**. Installs from it produce no branded search and cannot be told apart in Play Console.
- **Creator QRs** point to `epocheye.com/r/CODE`. That route logs the scan, then returns 302 to Play with `referrer=utm_source=creator&utm_medium=qr&utm_campaign=CODE`.

### Proposed test: one gate, two weeks (do not change other gates)

- **Where:** Tipu Sultan's Summer Palace entrance.
- **Arms, alternating by day (A, B, A, B…) so weekday and weekend effects balance:**
  - **A, QR:** the existing sign, but the QR points to `https://www.epocheye.com/r/GATE-TIPU`. No code change is needed: the route logs every scan with `code=GATE-TIPU` and tags the install referrer `utm_campaign=GATE-TIPU`.
  - **B, search:** the same sign with the QR covered, reading "Search **Epocheye** on Play Store".
- **Measure:**
  - Gate footfall per day: a ticket count from the ASI counter, or a tally.
  - Scans per A day: `referral_clicks` rows with `code = 'GATE-TIPU'`.
  - Installs per day by source: Play Console → Statistics → User acquisition, split by "Google Play search" and "Third-party referrers" (the `GATE-TIPU` campaign is visible under UTM tracking).
  - Unlocks per day at the palace: the app database.
- **Drop-off:**
  - A days: footfall → scans → installs → unlocks.
  - B days: footfall → (search installs above the non-sign baseline) → unlocks.
  - Compare installs ÷ footfall. Before the test starts, set the acceptable loss: how much of A's install rate B may lose and still be worth the branded searches. Then judge the result against that number.

## 5. Re-measure

Repeat section 1 exactly (same queries, logged out, `gl=IN`) on **2026-10-14** (+2 weeks) and **2026-10-28** (+4 weeks). Play indexing of listing changes takes days.

| Query | Play 09-30 | Play 10-14 | Play 10-28 | Google 09-30 | Google 10-14 | Google 10-28 |
|---|---|---|---|---|---|---|
| epocheye | 1 | | | 1 | | |
| epoch eye | 2 | | | >20 | | |
| epocheye app | 1 | | | 1 | | |
| epocheye ar | 1 | | | 1 | | |
| epoch eye app | 2 | | | >10 | | |
| epoch | >30 | | | n/a | | |
