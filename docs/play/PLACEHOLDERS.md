# Epocheye Play: placeholders and files to supply

Every `[SAMBIT: ...]` in Play's files, every file only the owner can supply, and the brief's own open
placeholders. Gathered on 2026-11-17 with:

```bash
grep -rn "\[SAMBIT" app/play app/privacy app/terms components/play lib/play lib/server/play \
  content/play tools/play docs/play public/play/packs/*/v*/site.json
```

(`tools/play/out/` was searched separately: it is git-ignored working output, listed in section 4.)
Line numbers are as of that date. Search again before launch: they move.

## 1. Placeholders in the code and content

| File | Line | Placeholder | What closes it |
|---|---|---|---|
| `app/privacy/page.js` | 205 | `[SAMBIT: legal review before launch]` (code comment over the Play section) | Legal review of section 11. Then remove the comment and update `LAST_UPDATED` |
| `app/privacy/page.js` | 355 | `[SAMBIT: retention period for Play data]` (**visible on the page**) | Choose how long Play data is kept. The code sets no period |
| `app/terms/page.js` | 235 | `[SAMBIT: legal review before launch]` (code comment over the Play section) | Legal review of section 13. Then remove the comment and update `LAST_UPDATED` |
| `content/play/tipu-summer-palace-bengaluru/story.json` | 287 | Fact O1, source `[SAMBIT: your gate observation. Keep or cut.]` | Keep line p-02 (and give O1 a source) or cut both |
| `content/play/tipu-summer-palace-bengaluru/story.json` | 607 to 612 | Beat p-02, `"placeholder": true`: "Most visitors photograph the front, call it nice and old, and leave." | Same decision. `validate-story.mjs --ship` fails until it is made |
| `public/play/packs/tipu-summer-palace-bengaluru/v1/site.json` | 819, 1149 to 1154 | The same O1 and p-02, merged into the published pack | Closes when the story is fixed and the pack is assembled and published again |
| `tools/play/voice/names_reel.md` | 8 | `[SAMBIT: listen to the names reel and correct any name.]` | Listen to `audio/kokoro-heart/_names_reel.m4a`; correct `lexicon.json` |
| `tools/play/voice/render.py` | 468 | The same names reel line (it writes `names_reel.md`) | As above. Remove it from the template once the names are checked |
| `tools/play/voice/README.md` | 185 | `[SAMBIT: say if you want a --from-recordings mode that builds the manifest and runs the same checks on recorded files.]` | Only matters if a human records the narration |
| `tools/play/voice/LICENSES.md` | 62 | `[SAMBIT: if you want no GPL tool anywhere in the build, drop the Piper voices. Nothing else depends on them.]` | Keep or drop Piper. Kokoro is the voice in use |
| `tools/play/daily/generate.mjs` | 626 | Printed at run time: `[SAMBIT: the daily runs out after <date>. Publish a pack with more elements and run this again, or choose a shorter --min-gap (your call).]` | Today's calendar ends **2026-12-10**. More elements, or a shorter gap |

Not a placeholder: `tools/play/daily/generate.mjs` line 90 is the filter that keeps any text holding
`[SAMBIT` out of the daily puzzle.

`app/play/privacy/page.js` no longer has a placeholder: its wording moved into `/privacy`.

## 2. Files and facts only the owner can supply

| What | Where it goes | Today |
|---|---|---|
| Scans of Hunter's 1804 aquatint plates of the palace (north front, west front, square), with holder and licence | `evidence_images` in `tools/play/sites/tipu-summer-palace-bengaluru.json`, then assemble and publish | Not on disk and not cleared. Chapter 2 uses the one Yale watercolour (CC0) |
| Build-progress clips for the locked cards (Konark Sun Temple, Victoria Memorial, Hampi) | `clip` on each entry in `content/play/sites.json` | None. The cards show no clip |
| The founding member list: who they are and where the list lives | Marked one by one with `POST /api/play/vote/founding` (admin) | Nobody is marked. No weekly vote is binding |
| `opens_at` for the next site (an ISO date and time) | The site's entry in `content/play/sites.json` (or its site config, copied at publish) | None. Early access opens nothing until it is set |
| A human narration recording, if wanted | A new voice folder, `public/play/packs/<slug>/v1/audio/<name>/<clip-id>.m4a`, from `tools/play/voice/voice_script.md` | Not wanted yet. Kokoro is the placeholder voice |
| Confirmation that the project-made tiles (exterior diaper, painted ceiling, gilding) are your own work | `licenses` in the site config | Recorded as project-made, not yet confirmed (`tools/play/AUDIT.md` section 7) |
| A retention period for Play data | `/privacy` section 11 | None (see section 1) |
| `PLAY_SIGNING_SECRET` for Production | Vercel environment variables | Probably not set (see `LAUNCH.md` step 3) |

## 3. The brief's own open placeholders

From `docs/play/PLAY_BRIEF.md`.

| Brief line | Placeholder | Where it stands |
|---|---|---|
| 7 | `[SAMBIT: final name]` (working title "Rebuild") | Open. The game is called "Epocheye Play" on every page |
| 85 | `[SAMBIT: confirm the four]` lenses: Builder, Scribe, Traveller, Child | Open. Built with those four (STATUS decision 9) |
| 449 | `[SAMBIT: listen to the names reel and correct any name.]` | Open. Same as `names_reel.md` above |
| 559 | Title "Envy of Heaven" `[SAMBIT: confirm]` | Open. In use (`story.json` line 3) |
| 592 | Prologue line p-02 `[SAMBIT: your gate observation. Keep or cut.]` | Open. Same as O1 and p-02 above |
| 811 | U3, what the building was between 1799 and 1831: `[SAMBIT: your files may. If so, fill it.]` | Partly filled by F20 (officers' quarters in 1800, Buchanan). 1800 to 1831 is still "not known" (`STORY_CHECK.md`) |
| 856 | `[SAMBIT: confirm which of A or B our palace model uses for empty panels]` | Answered from the model: it does both (repeats the recorded pattern upstairs and labels it, leaves the ground floor plain). `STORY_CHECK.md` line 158 |
| 965 | Share line "I rebuilt the Envy of Heaven from its evidence. Five chapters. Twelve things I did not know." `[SAMBIT: confirm]` | Open. In use (`story.json` line 3635) |

## 4. In git-ignored working reports

`tools/play/out/reports/` (not committed) repeats some of the above, from earlier phases:

- `phase2_story_fix.md` lines 47 and 48, `phase2_story_write.md` lines 13 and 14: O1 and p-02.
- `phase3_verify-and-fix.md` line 25: the old `/play/privacy` placeholder (now closed); line 75: the daily end date.
- `phase3_votes-email-leaderboards.md` line 46: the founding member list.
- `phase3_review_spec.md` lines 65, 80 and 81, and `phase3_review_correctness.md` line 41: reviewer
  suggestions to add placeholders for the privacy wording, the build clips and the daily coverage.
  All three are listed above.
