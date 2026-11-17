# Epocheye Play: status

**WAITING.** GATE 2 was shown on 2026-11-17 and has not been answered. Phases 2, 3 and 4 are built on branch `feat/play`. Nothing further happens until you answer this gate. (The GATE 1 record is in git history: commit `de8a203`.)

GATE 1 was answered on 2026-11-16: the voice is Kokoro. The other GATE 1 rulings were not given, so the build went ahead on the proposals in STORY_CHECK.md. They are listed again below.

## Preview

https://epocheye-website-git-feat-play-sambit-singhas-projects.vercel.app/play

Vercel asks you to sign in first (preview deployments are protected). I cannot get through that sign-in, so every play-through below was on a local production build. The preview is built from the same commit.

## What to look at (on a phone)

| Page | What it is |
|---|---|
| `/play` | Site select: the palace, three locked cards with Vote and "Play the next site a week early", links to the daily puzzle, the weekly vote and the leaderboards |
| `/play/tipu-summer-palace-bengaluru` | The whole level: Prologue, five chapters, the full reveal, the proof switch, the year vote, the "What you now know" card. `?ch=<n>` jumps to a chapter |
| `/play/daily` | The Missing Piece |
| `/play/vote` | The weekly vote |
| `/play/leaderboards` | Per site, daily and streaks |
| `/play/c/<id>` | A shared card, with its own share image |
| `/play/admin` | Chapter drop-off and the other numbers (admin sign-in) |
| `/play/admin/voice` | Every spoken line with its clip, pace and pause |

## What changed since GATE 1

- **Story:** chapters 2 to 5 and the ending, written from section 8 with the STORY_CHECK corrections, then checked line by line against the facts and fixed. 40 facts, 158 beats, 188 spoken clips, 0 validator errors.
- **Pack:** eight viewpoints (forecourt, forecourt corner, colonnade, colonnade end, floor of the hall, upper hall, front arcade, corner room), NOW and THEN at 512, 1024 and 2048 px. Three restorations, each with a mask on every viewpoint and a 3D piece: the colours of the front (Chapter 2), the painted walls (Chapter 3), the painted ceiling (Chapter 5, the last piece). A tier mask on every viewpoint drives the proof switch. Five evidence images. 60 MB, 0 problems in `tools/play/verify_pack.py`.
- **Engine:** dated cards to put in order (Chapter 4), the full reveal, the proof switch, the year vote, the end card with Share, See it for real and Next site, text that pages in step with its clips, evidence images, and the eight-question test in the debug view.
- **Narration:** all 188 clips in Kokoro.
- **Phase 3:** additive `play_` tables in Neon by migration, anonymous players with generated names, server-checked runs, daily puzzles and votes, year-vote percentages, weekly vote, email unlock with consent, creator links (`?c=`), cookieless analytics with chapter drop-off, the admin dashboard, and the social exporter (`tools/play/social/export.mjs`). Three reviewers (security and privacy, spec and copy, correctness) checked it; 35 findings, the confirmed ones fixed.
- **Phase 4:** a throwaway three-box scene went through the exporter and loaded with **zero engine changes**. The only file it changed is `content/play/sites.json`, which the exporter writes. To make that true, the site registry was first moved out of code into that file. The test also found an exporter gap, now fixed: a NOW state whose replacement material was missing silently showed THEN; it now stops the render.

## Decisions I need from you

**Story** (all in `docs/play/STORY_CHECK.md` and `tools/play/out/reports/phase2_story_fix.md`):

| # | Decision |
|---|---|
| 1 | Chapter 4's turn. The record says most of the palace was pulled down after 1868 and what stands is the block that held the treasury. The line is now "The block that held the treasury is the part still standing." Approve or rewrite |
| 2 | F09 and c4-11, both cut: "Bangalore went back to Tipu Sultan in 1792" and "Tipu Sultan dismantled [the fort] himself after the peace of 1792". Rice supports both; your files' do-not-say list bars them. Keep cut, or put back |
| 3 | Chapter 2, option B now reads "Trust them for what stood where. For colour, go back to the watercolour he painted himself." Our colours follow the watercolour, not the London plates. Approve |
| 4 | The Scribe side notes were removed from chapters 3 to 5: they quote primary texts, not the palace files (brief 1.2). Keep out, or rule that the primary texts count |
| 5 | The construction dates: "by its own inscription", plus the entrance board's 1770s. Approve |
| 6 | Lines added for wrong picks that section 8 does not script (chapters 1, 3, 5), and the four "nobody knows" lines and eight test questions |
| 7 | A fifth chip, "Our reading", for our inference. Keep or fold into "Our reconstruction" |
| 8 | Line p-02, "Most visitors photograph the front, call it nice and old, and leave." It is your observation. Keep or cut |

**Other:**

| # | Decision |
|---|---|
| 9 | Title "Envy of Heaven", the four lens names, the share line, the game's final name |
| 10 | Hunter's 1804 plates of the palace: supply licensed scans, or Chapter 2 keeps the one Yale watercolour (current) |
| 11 | Confirm the project-made tiles (exterior diaper, painted ceiling, gilding) are your own work |
| 12 | Who counts as a founding member, whose weekly votes are binding, and where that list lives |
| 13 | The date the next site opens (`opens_at`), which starts early access a week before |
| 14 | Build clips for the three locked cards |
| 15 | Privacy wording for Play, to go into `/privacy` (a draft page is at `/play/privacy`) |
| 16 | The daily runs out on 2026-12-10: the palace has 24 elements and the rule is no element twice inside 30 days. Publish more elements, or allow a shorter gap |

## Measured

- Lint: 0 errors (17 warnings, all in pages outside Play). Build: passes.
- Phase 3 end to end on a local production build at 375x812: the palace level to the end card with year-vote percentages, the daily right and wrong, the vote with the email flow (dry run), a `?c=` link landing in the events table, the admin page signed out and in, a shared card and its image. Every test row was deleted afterwards; all `play_` tables held 0 rows.
- Phase 4: the test site plays through its restoration on a phone-size screen with no console errors beyond the Vercel analytics script, which exists only on Vercel.
- Bytes before the first view, cold cache, phone size: about 880 KB (limit 3 MB), measured at Phase 1 and re-measured in Phase 2 and Phase 3.
- Daily: 58 puzzles from 24 elements, scheduled 2026-11-17 to 2026-12-10.
- Render time on the GTX 1650: 10 to 17 minutes per state per viewpoint at 2048 px.

## Known issues

- **Narration words.** 182 of 188 clips are heard word for word by both speech-to-text models, 4 by one of them. Two fail on both: `c2-01` (both drop "the" and "of" from "The twenty first of March, seventeen ninety one") and `c3-C-1` ("Buchanan wrote of false gilding" heard as "wrote a false gilding"). Listen to those two first.
- **Narration pace.** Kokoro adds or changes a word when slowed, so words come first: 19 slow or brisk lines run over their pace target, including the reveal line (165 against 125 words a minute) and the last line (213). Nobody has listened to any clip. The silences between lines are exact.
- **Progress across devices is not built.** The email link carries the name, votes and daily streak, not a player's place in the level.
- **Leaderboard anti-cheat raises the cost but does not stop a determined player.** The accepted answers ship in the public pack.
- **The front balcony is not modelled** (it is switched off in the scene and its projection is unrecorded), so that viewpoint stands at the front arcade of the upper floor. Credits say so.
- **NOW shows plain plaster and timber everywhere on the upper floor.** Paint survives somewhere (own photos 37 and 41) but no file says which panels. The two photos ship as evidence.
- **The NOW garden is flat** (lawn, hedge blocks, brick walk) and the haze beyond it is plain.
- **The hall-floor viewpoint was too bright at first.** Re-rendered one stop darker; it now reads cleanly in both states.
- **Not tested:** real phones, frame rate, gyroscope, a screen reader, real email delivery, the deployed preview, link previews on WhatsApp, Instagram, X and Reddit, the test with a real player.

## After the gate

Phase 5: polish, the quality bar in brief 5.7 with a Lighthouse mobile report, legal pages, `docs/play/PLAY.md`, the full placeholder list, the eight-question test, then GATE 3.
