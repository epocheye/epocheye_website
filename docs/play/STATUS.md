# Epocheye Play: status

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
| Every spoken line of the default lens has a clip, a pace and a pause per 8.11; the round-trip check passes; the voice swaps with one command | **Mostly.** 188 clips, every one with its pace and pause. 184 of 188 heard word for word by both speech models, the other 4 by one of them; none fails on both (`c2-01` and `c3-C-1` were reshaped for the ear on 2026-11-18, with no change to their facts). 19 lines run over their pace target because Kokoro adds words when slowed. Swap: `python tools/play/voice/render.py --voice <name> --make-default` |
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
- `PLAY_SIGNING_SECRET` is probably not set on Vercel yet; email unlock fails closed without it (launch checklist).
