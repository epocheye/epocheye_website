# Epocheye Play: status

## Open world: WAITING at GATE 3 (2026-11-25)

**WAITING: the owner merges `feat/open-world` into `main`.** Nothing about the open world is on production. Live `/play` is unchanged.

**Preview (needs your Vercel sign-in):** https://epocheye-website-git-feat-open-world-sambit-singhas-projects.vercel.app/play/tipu-summer-palace-bengaluru/world

### What is done

- All six missions play from the title screen to the end, on PC and phone settings, with the era shift between today, 1791 and 1831.
- The bullock cart, horse and elephant can be ridden. In every test drive they kept 0.5 m from people and stayed out of the palace.
- Walk and run work with keyboard and mouse, touch and a gamepad. There is a minimap, waypoints, quality presets, credits and a local save.
- Role figures speak in Kokoro voices. Real people do not speak; their records are objects to find.
- **Your feedback after playing (2026-11-24), fixed in commit `1f3c10b`.**
  - The title screen now says who you are, what the Epocheye does and what your job is.
  - Every mission opens with a "Your job" card.
  - Every step shows what to do, why, and "Step n of N".
  - A story only starts when you choose "Hear what happened here", and you can skip it.
  - "Wake the Epocheye" is now explained by a card, then a "Go back to 1791" button.
- **The palace look, fixed in commit `8b205cf` (world v4).**
  - Walls no longer bake black. Small details no longer collapse into black shards.
  - The palace texture is about 4 times sharper on PC.
  - Colour is now converted the same way Blender's own view converts it.
  - The ground is clean laterite, without purple blotches.
  - The player wears our own clothes instead of the grey mannequin.
  - Before and after pictures, with the old version on the left: `scratchpad/bake2/final/compare_*.jpg` in the session folder.

### Measured (headless Chrome on this PC)

| | Target | Result |
|---|---|---|
| Missions 0 to 5, PC settings | all finish | all finish, 0 stuck, 59.9 fps |
| Missions 0 to 5, phone settings (emulated) | all finish | all finish, 0 stuck, 58.7 fps |
| Rides and route checks | 0 failed | 0 failed (one elephant run failed once, then passed twice) |
| First playable size, phone preset, production build | under 8 MB | 4.30 MB |
| First playable time, slow 4G | under 8 s | **about 24 s at the last measurement, misses** |
| Whole world | under 40 MB | 14.97 MB |
| `npm run lint` | 0 errors | 0 errors |

### Cut by your word, not built

On 2026-11-24 you said: "Let's finish it quickly. We can build it later also. Just finish it quickly. Don't have to build any other new things." So these were not built:
- the full-screen map and fast travel
- side activities and photo mode
- the app question, the browser install and the email list
- the load-time work, so the 8 s target on slow 4G is still missed
- the automatic fall back to Story view at `/play/<slug>`; the open world stays at `/play/<slug>/world`
- a walkable palace interior; the rooms use the Story view panoramas
- licensed music

### Not tested

- A real phone, a real gamepad, or a live database.
- Nobody has listened to the voice clips.
- Admin sign-in with a real password. The fix that stops `/admin/login` redirecting to itself is live on `main`.

### Still weak

- On phones the palace is softer than on PC, and the phone download has no room to spare (4.30 MB against the 4.3 MB we set for ourselves).
- Today's ground is blurry close up. Some arch tips still show dark jagged bits.
- `?debug=1` still sends the share card write.
- The voice row in `CREDITS.md` miscounts the clips.
- In Mission 4, the place notes appear before the era shift and cover the screen on a phone.

### Decisions I need from you

1. **GATE 3:** merge `feat/open-world` into `main`, or tell me what to change.
2. **Mission 2:** keep the compare with Hunter's watercolour without a lock, or build the north front so his sketch can match.
3. **Story lines:** whether `c3-01`, `c4-o2` and `p-02` are acceptable as they stand.
4. **Meshy plan:** which plan made the cart, horse and elephant. See `CREDITS.md`.
5. **Gilding tile:** where it came from.
6. **Display font:** buy the game licence, or stay with Anton (OFL).
7. **GPU check:** `tools/play/export_world.py` now ignores the card's load while the card is idle (P8 or lower and under 20% power). Before, a browser's 30% load blocked every bake. Keep this change, or revert it.

---

## Open world: Phase 2 in progress (2026-11-22)

GATE 1 was answered: "Yes, start Phase 2". Phase 1 is on `feat/open-world`. Nothing is merged and live `/play` is unchanged. The notes below describe the state at GATE 1.

**2026-11-23, world v3 (not committed).** Fixed: the era-shift trap over the ditch and tanks, water in the three tanks, pin holes at the cell seams, and the sentry route through a block. Missions 0 and 1 finished at phone and PC settings and the full route passed, on a dev server with emulated phone settings. Not measured: a production build or a real phone. The server on port 3105 keeps its older version until it is rebuilt.

**2026-11-23, rides proved.** The three rides were put through 28 test drives (18 at limits, 4 at a standing person, 6 among walkers), once each with keyboard, touch and an emulated gamepad: no ride crossed a limit or closed to within 0.5 m of a person. The test can set a ride down closer than that by hand, and those starts are excluded unless the gap then closes. Publish now keeps the 27 new voice clips. Missions 2 to 5 are still not merged. Not measured: a real phone, a real gamepad or a production build. **Looks broken, not fixed:** the distant pettah houses are torn, jagged shapes from the open ground where the horse rides.

**2026-11-23, all six missions play.** A scripted player finished Missions 0 to 5 from the title screen on PC settings (High, 59.9 fps) and phone settings (Low, emulated), with 0 stuck and 0 page errors, on a dev server with no database. The run, vote and card calls all failed and the game carried on. Phone frame rate is not reliable: 58.1 fps in the last run and 38 in an earlier one on the same scene. First playable on phone settings was 30 s on slow 4G against the 8 s target.

Simplified to finish: the palace rooms are the Story view panoramas, not walkable; Mission 2 compares Hunter's watercolour with no lock; the 1831 office furniture stands in the forecourt. **Not built:** the app question, full-screen map, fast travel, side activities, photo mode. **Not tested:** a real phone, a production build, a real database, the vote counting on a real server. Nobody has listened to the 27 new voice clips. After the last runtime change the rides were rerun on keyboard only (0 failed drives) and the route passed; touch and gamepad rides were not rerun. The torn pettah houses are still there.

**Preview (needs your Vercel sign-in):** https://epocheye-website-git-feat-open-world-sambit-singhas-projects.vercel.app/play/tipu-summer-palace-bengaluru/world

Vercel reports this build as Ready, but I could not open it myself because it is behind your sign-in. Every check below ran on a local production build of the same code.

The three things to judge: does it feel like an open-world game, does it look good, and do you want to keep playing?

### What is playable

Mission 0 (today, the era shift) and Mission 1 (1791): the carpenter, the mason, a bullock cart ride up the avenue, Buchanan's journal, the inscription stone, the evidence choice, the restoration and the end splash. Walk and run on keyboard and mouse, touch or gamepad. Minimap, waypoints, quality presets, credits, local save. A scripted player finished both missions on the production build at both settings.

### Measured (headless Chrome on this PC, production build)

| | Target | PC, High | Phone emulation, Low |
|---|---|---|---|
| First playable size | under 8 MB | 5.39 MB | **4.24 MB** |
| First playable time, slow 4G (1.6 Mbps, 4x slower CPU) | under 8 s | not throttled: 3.7 s | **28.3 s, misses** |
| First playable time, good 4G (9 Mbps, 4x slower CPU) | under 8 s | | **9.9 s, misses** |
| Frame rate | 60 PC, 30 phone | 59.7 | 58.6 (48 while recording, 30 at its slow moments) |

**Not measured on a real device.** The phone column is emulation on this PC's AMD Radeon graphics, so its frame rate is much better than a mid-range Android would give. Load time is the main work for Phase 3.

### Known gaps at this gate

- The recordings are scripted headless captures at phone and PC size, not recordings of a real phone.
- Nobody has listened to the carpenter and mason voices. The speech check heard their lines correctly.
- Up close, some clothes still have small flaws, and the awning cloth has small tears. Large fort buildings are plain blocks, because their form is not recorded.
- The world's "today" surroundings are simple blocks, as the brief allows.
- Sound is generated ambience. Licensed music and recorded ambience are Phase 4.
- `/play/<slug>` still opens the panorama level. The open world is at `/play/<slug>/world` until Phase 3 makes it the default with Story view as the fallback.
- The app prompt, horse, elephant, full map and fast travel are later phases.

### Decisions I need from you

1. **GATE 1:** go on to Phase 2, or tell me what to change.
2. **Meshy plan:** which plan were you on when the cart was made on 2026-09-09? See `docs/play/CREDITS.md`.
3. **Gilding tile:** where did it come from? This is already open in `docs/play/LAUNCH.md`.
4. **Display font:** buy the Typodermic game licence, or stay with Anton (OFL).

---

# Panorama level (launched)

**Launched.** GATE 3 answered on 2026-11-18 ("Merge and launch"): `feat/play` was merged into `main` and deleted, so `main` is the only branch and `/play` is on production. The launch checklist items below were not done before launch and are still open.

GATE 1 (2026-11-16): voice chosen, Kokoro. GATE 2 (2026-11-17): approved. Story rulings have not been given at either gate, so the proposals stand; they are item 1 of the launch checklist.

## Preview

https://epocheye-website-git-feat-play-sambit-singhas-projects.vercel.app/play

It is behind Vercel sign-in, so every check below ran on a local production build of the same commit.

## Where things are

| File | What it is |
|---|---|
| `docs/play/LAUNCH.md` | **The launch checklist, in order.** Start here |
| `docs/play/PLAY.md` | How to add a site, write a story, run the daily generator, read the dashboard, switch features on and off |
| `docs/play/QUALITY.md` | The brief 5.7 quality bar, measured, with Lighthouse mobile reports in `docs/play/lighthouse/` |
| `docs/play/test/EIGHT_QUESTIONS.md` | The eight-question test and its limits |
| `docs/play/PLACEHOLDERS.md` | Every `[SAMBIT: ...]` and every file only you can supply |
| `docs/play/STORY_CHECK.md` | Every change to section 8 of the brief, and why |
| `docs/play/DECISIONS.md` | Every choice made outside the gates |
| `tools/play/AUDIT.md` | The palace audit |

## Section 7 of the brief, item by item

| Done when | State |
|---|---|
| `/play` live on a preview URL with the Summer Palace level (five chapters, ending, proof toggle, year vote, final card), daily mode, vote, locked cards, share cards, leaderboards and email unlock | **Done, and now on production.** The deployed level was played at phone size on www.epocheye.com: renders, no console errors, narration served |
| Every line of story has a fact id; every fact verified with a source and a tier; STORY_CHECK.md lists every change | **Done.** The validator enforces it: 40 facts, 158 beats, 0 errors. One placeholder line (p-02) is yours to keep or cut |
| A test player who has never seen the palace answers the eight questions after one play | **8 of 8, by an AI model standing in for a player**, not a person. The end card lists the answers just before the test, so this proves less than it looks. A real player should take it (launch checklist) |
| Every spoken line of the default lens has a clip, a pace and a pause per 8.11; the round-trip check passes; the voice swaps with one command | **Nearly.** 188 clips, each with its pace and pause. Words: 184 of 188 heard word for word by both speech models, the other 4 by one; none fails on both. Pace: 160 of 166 checked clips in range (was 147) after a Rubber Band slow-down for clips the voice garbles when slowed; 6 still run fast, including the last line (178 against 125 words a minute), because slowing them further would cost words. Nobody has listened to any clip. Swap: `python tools/play/voice/render.py --voice <name> --make-default` |
| A new site is added by running the exporter and adding a story file, no code change; proven with the throwaway pack | **Done.** `_test-boxes` loaded with zero engine changes (`git diff 7fcbaee` on app, components, lib, next.config is empty) |
| Panoramas on a phone match the Blender renders | **Matched on a phone-size screen in headless Chrome**: the faces are the Cycles renders, passed through with no colour change. Not checked on a real phone |
| The quality bar in 5.7 is met, with a Lighthouse mobile report | **Met.** First view on slow 4G with a 4x slower CPU: **4.7 s on live production** against 5 s (5.3 s on a local server; 8.0 s at the start of Phase 5). Under 3 MB before the first view, 60 fps, keyboard, tap-only, reduced motion, screen-reader labels and cache headers pass. Lighthouse reports are in `docs/play/lighthouse/` |
| `docs/play/PLAY.md` explains adding a site, the story file, the daily generator, the dashboard, feature switches | **Done** |
| A list of every placeholder and every file to supply | **Done**: `docs/play/PLACEHOLDERS.md` |

## Decisions I need from you at this gate

1. **Launch.** Say the word and I merge `feat/play` into `main`, which deploys `/play` to production, and delete `feat/play`, leaving `main` as the only branch. Do the launch checklist first, or tell me which parts to skip. Until then `feat/play` stays, as agreed at the start.
2. **Test rows in the production database.** The Phase 5 quality run left test players (anon ids starting `test-q5-`), their runs, votes and events, and a few shared cards (one is `4wTzdGG4y`). None is on a leaderboard. The agent's attempt to delete them was refused by the session's permission check, so I did not run it either. Either delete them yourself (`node --env-file=.env.local docs/play/lighthouse/scripts/cleanup.mjs --since 2026-11-17T00:00:00Z 4wTzdGG4y`, with `--dry` first to see counts), or tell me to.
3. **The last 0.3 s of first view.** The site-wide layout preloads every weight of four fonts on every page (about 150 KB), including one Play does not use. Trimming that would very likely meet the 5 s target, but it changes every page of the site. Yes or no.
4. **The 16 open items** in `docs/play/LAUNCH.md` section 1: the story rulings, names and titles, Hunter scans, the tiles, founding members, the next site's date, build clips, the privacy and terms review, and the daily calendar, which ends on 2026-12-10.

## Not tested anywhere

Real phones (iOS and Android), frame rate on a real mid-range Android, gyroscope and its iOS prompt, a real screen reader, real email delivery (dry run only), the deployed preview, link previews on WhatsApp, Instagram, X and Reddit (the tags and images were checked as a bot sees them), a human player.

## Also known

- Progress across devices is not built; the email link carries the name, votes and streak, not a place in the level.
- Leaderboard anti-cheat raises the cost but does not stop a determined player.
- NOW shows plain plaster and timber on the upper floor, because no file says which painted panels survive. The front balcony is not modelled.
- Test rows: all deleted on 2026-11-18 with the owner's go-ahead; every `play_` table started empty at launch.
- `PLAY_SIGNING_SECRET` is probably not set on Vercel yet; email unlock fails closed without it (launch checklist).
