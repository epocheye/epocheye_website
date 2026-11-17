# Epocheye Play: how it works and how to run it

For a developer, and for the owner. Everything here was read from the code on 2026-11-17. Where a
tool has its own README, this page says what to run and points there for the rest.

Contents

1. How a site becomes a level
2. Writing story.json
3. Narration
4. The daily puzzle
5. Reading the dashboard
6. Switching features on and off
7. The social exporter
8. The database

---

## 1. How a site becomes a level

A level is two things: a **site pack** (renders, masks, pieces, evidence images) that the exporter
makes from the site's Blender project, and one hand-written **story file**. The engine has no
site-specific code. Adding a site is a pack plus a story file, with no code change.

```
tools/play/sites/<slug>.json            site config (hand-written, read by the exporter)
content/play/<slug>/story.json           the story (hand-written)
tools/play/out/<slug>/v<N>/              exporter working folder (git-ignored)
public/play/packs/<slug>/v<N>/           the published pack the game loads
content/play/sites.json                  the site registry (written by the exporter's publish step)
content/play/daily/<slug>.json           the daily calendar for that site (written by the daily generator)
```

### 1.1 What the Blender project must have

- **THEN is the scene as saved.** The exporter opens the site's `.blend` read-only and renders
  THEN from it as it is. It never saves the file.
- **NOW is a recipe in the site config**, applied in memory by `tools/play/blender/render_node.py`
  (`states.now`, see 1.2). If a site has no honest NOW state, the exporter cannot make one: report
  what is missing, never fake it.
- **Tier suffixes in object and material names.** A tier is written after a double underscore,
  in capitals, for example `WALL_EXT_HUNTER1792__DECORATION-RECONSTRUCTED` or
  `Soffit_painted__PATTERN-CONFIRMED.001`. The exporter finds it with the pattern
  `__([A-Z0-9][A-Z0-9-]*)` and matches it against glob patterns in the site config
  (`tier.reconstruction.object_tiers` and `material_tiers`, such as `*INFERRED*`). Everything that
  matches is painted white in the tier mask, which drives the proof switch ("Show only what the
  record proves").
- **Restorations are selectable** by material name, object name prefix, tier, or collection
  (`select` in each restoration, see 1.2).
- Linked libraries cannot be repainted. Name their collections in `select.collections` or
  `tier.reconstruction.collections`; the exporter then renders a separate coverage pass for them.
- Missing image files are looked for in `search_dirs`.

### 1.2 The site config: `tools/play/sites/<slug>.json`

Every field the exporter and its Blender scripts read. Copy `tools/play/sites/_test-boxes.json`
(the smallest working example) or the palace's config to start.

Top level

| Field | Required | What it does |
|---|---|---|
| `slug` | yes | Folder and URL name: `/play/<slug>` |
| `name` | yes | Shown on the site card and in the level |
| `place` | no | Shown under the name |
| `version` | yes | Pack version. A new number publishes to a new `v<N>` folder |
| `blend` | yes | Absolute path to the site's `.blend`. Opened read-only, in the background |
| `search_dirs` | no | Folders to look in for missing images |
| `face_px` | no | Cube face size for the final render (default 2048) |
| `sizes` | no | Face sizes written to the pack (default `[512, 1024, 2048]`) |
| `mask_px` | no | Face size of the restoration and tier masks (default 1024) |
| `webp_quality` | no | WebP quality of panorama faces (default 90) |
| `samples` | no | Cycles samples for beauty passes (default 128) |
| `mask_samples` | no | Samples for mask passes (default 8) |
| `start_node` | no | The viewpoint a level opens on |
| `base` | no | `{ hide: [collections], objhide: [object name prefixes] }` hidden in both states |
| `states` | yes | `{ then: {...}, now: {...} }`, see below |
| `nodes` | yes | The viewpoints, see below |
| `restorations` | yes | The pieces the player puts back, see below |
| `tier` | yes | `{ reconstruction: { material_tiers, object_tiers, materials, collections, object_prefixes, except_prefixes } }` |
| `figures` | no | Figure sprites (none in the palace pack) |
| `evidence_images` | no | Images shown as evidence, see below |
| `credits` | no | Lines for the in-game credits and `CREDITS.md` |
| `licenses` | no | `[{ asset, holder, licence }]`, written to `LICENSES.json` |
| `status` | no | Registry status at publish: `live` (default), `dev`, `building` or `coming` |
| `cover`, `opens_at`, `clip` | no | Copied into the registry at publish: card image, opening date (ISO), build clip for a locked card |

A state (`states.then`, `states.now`)

| Field | What it does |
|---|---|
| `hide`, `show` | Collections to hide or show in this state |
| `objhide` | Object name prefixes to leave out of the render |
| `materials` | New materials built in memory from image files: `{ name: { color, normal?, orm?, scale?, roughness?, tint? } }` |
| `matswap` | `{ scene material: replacement }`. A replacement missing from the scene stops the render |
| `haze` | A soft shell that hides unmodelled surroundings: `{ center, radius, height, base_z, color, solid_to, clear_at, strength }` |

THEN is usually `{}`. The palace's NOW recipe is the worked example: it hides the fort and inferred
props, shows the present-state collection, builds lawn, hedge, brick and plaster materials from own
photos, and swaps the reconstructed wall paint for plain plaster.

A node (viewpoint)

| Field | What it does |
|---|---|
| `id`, `name` | Viewpoint id and its label ("Go to Forecourt") |
| `kind` | `exterior` or `interior`. The estimate times one node of each kind |
| `loc` | Camera position, site axes, Z up |
| `look` | The direction the view opens facing |
| `links` | Ids of the viewpoints you can walk to from here |
| `samples` | Per-node samples |
| `exposure` | `{ then: EV, now: EV }`, applied in memory |
| `cycles` | Per-node Cycles settings for the beauty passes only (sampling, bounces, clamping, denoiser, light tree, guiding; anything else is refused) |

A restoration

| Field | What it does |
|---|---|
| `id`, `name` | Id and the name the player sees |
| `chapter`, `slot` | The chapter it belongs to and its slot (S1, S2...) |
| `tier` | Its chip, usually `reconstruction` |
| `nodes` | Viewpoints that may see it. Assemble keeps only those whose mask is not empty and prints the others |
| `target` | A point on it, site axes. The "Where it goes" hotspot points here |
| `piece` | Pack path of the 3D piece, `pieces/<id>.glb` |
| `turn` | Optional: `{ axis, start_deg }` for the Restore step |
| `evidence` | Lines naming the evidence, shown with it |
| `select` | What the mask paints white: `materials`, `object_prefixes`, `object_tiers`, `material_tiers`, `except_prefixes`, `collections` |
| `piece_source` | What becomes the GLB: `collection`, then either `objects` (exact names) or `object_prefixes` with `near` and `radius`; optional `crop: { min, max }`, `rotate_deg`, `max_texture_px` |

An evidence image

| Field | What it does |
|---|---|
| `id` | Written as `evidence/<id>.webp` |
| `source` | The file on disk |
| `title`, `credit` | Shown with it. The story's evidence item must also carry a credit |
| `holder`, `licence` | Required. An image without both is skipped and reported |
| `crop`, `rotate_cw`, `max_px`, `quality` | Optional: crop as fractions (left, top, right, bottom), turn, longest side (default 1600), WebP quality (default 88) |

### 1.3 Running the exporter

Run from the repo root, in this order. Blender always runs in the background (`blender.exe -b`),
never the open window and never its MCP connector. Set `BLENDER_EXE` if Blender is not in
`C:\Program Files\Blender Foundation\Blender 5.3` or `5.2`.

```bash
# 1. How many GPU hours. Renders small probes (192 and 384 px) and fits a time per node.
python tools/play/export_pack.py <slug> estimate
python tools/play/export_pack.py <slug> estimate --nodes forecourt,colonnade --face 1024

# 2. Render. Refuses without --yes. Read the estimate first.
python tools/play/export_pack.py <slug> render --yes
python tools/play/export_pack.py <slug> render --yes --nodes hall-floor --what then,masks,tier
python tools/play/export_pack.py <slug> render --yes --nodes hall-floor --what now --force
python tools/play/export_pack.py <slug> render --yes --face 1024          # a quicker, smaller set
python tools/play/export_pack.py <slug> render --yes --device CPU         # slow, but no GPU

# 3. The 3D piece of each restoration, as GLB (CPU only).
python tools/play/export_pack.py <slug> pieces

# 4. Encode faces to WebP sizes, cut mask strips, validate and merge story.json, write site.json,
#    CREDITS.md and LICENSES.json. Stops if the story fails validation.
python tools/play/export_pack.py <slug> assemble

# 5. Copy to public/play/packs/<slug>/v<N>/ and register the site.
python tools/play/export_pack.py <slug> publish

# Check a pack (the working copy, or the published one)
python tools/play/verify_pack.py <slug>
python tools/play/verify_pack.py <slug> --published
```

Render flags

| Flag | What it does |
|---|---|
| `--nodes a,b` | Only these viewpoints (default all) |
| `--what then,now,masks,tier` | Which passes (default all four). THEN, masks and tier share one Blender process; NOW always runs in its own, because its material swaps are not undone |
| `--face N` | Face size for this run. Each size renders into its own `raw<N>` folder |
| `--device GPU` or `CPU` | GPU by default. CPU skips the GPU check |
| `--force` | Render faces again even if they exist. Without it, finished faces are kept, so a stopped run resumes where it stopped |

`lookdev` renders small test frames into `tools/play/out/lookdev/<tag>/` (`--face`, `--exposure`,
`--samples`, `--set key=value`, `--faces px,pz`, `--loc x,y,z`, `--tag`). It never touches the
real render folders.

**GPU rules.** Before every node, and before every estimate probe, the exporter checks:

- `E:\konark\locks\gpu.lock`: if it exists the Konark build is using the GPU and the run stops at
  once. It never waits on the lock.
- `nvidia-smi`: three samples. Busy means above 25 percent utilisation while the card draws more
  than 20 W, or more than half its memory held. It looks again for up to 60 seconds before it gives
  up, because the tail of its own last Blender process can read as busy.
- If `nvidia-smi` cannot be read, the run stops.

When it stops it says so; run the same command again to resume. Finished faces are kept.

**Read-only rules.** The exporter never saves the site's `.blend`, never edits the shared `pr_kit`,
and writes only inside `tools/play/out/` until `publish`. Every log is in
`tools/play/out/<slug>/v<N>/export.log`, and real render minutes go to `render_times.jsonl`.

**What publish does.** It copies the assembled pack to `public/play/packs/<slug>/v<N>/`,
replacing only the folders the exporter owns (`pano`, `mask`, `tier`, `pieces`, `options`,
`evidence`, `sprites`, `share`). The `audio/` folder is written by the voice tools and is kept.
Then it adds or updates the site's entry in `content/play/sites.json`: `status` (from the config,
`live` unless it says `dev`, `building` or `coming`), `version`, `name`, `place`, and `cover`,
`opens_at` and `clip` when the config has them. Commit both the pack and the registry.

Locked cards (Konark, Victoria Memorial, Hampi) are entries in `content/play/sites.json` with status
`building` or `coming` and no pack. That file is the only one edited by hand, and only for locked
cards. A locked site with a published pack and an `opens_at` date plays early for players with a
confirmed email from a week before that date, and is live for everyone from it, with no other change.

After publishing a new site, run the daily generator (section 4) and `npm run build`.

### 1.4 The format proof (Phase 4)

`tools/play/test/` holds a throwaway scene that proves a new site needs no engine change: three
boxes, two viewpoints, one restoration, a three-beat story. Its config
(`tools/play/sites/_test-boxes.json`) and story (`content/play/_test-boxes/story.json`) are
committed; its pack is git-ignored and its registry status is `dev`, so it never resolves in
production.

```bash
"C:\Program Files\Blender Foundation\Blender 5.3\blender.exe" -b --factory-startup \
  --python tools/play/test/make_test_scene.py -- tools/play/out/test/test_scene.blend
python tools/play/export_pack.py _test-boxes render --yes
python tools/play/export_pack.py _test-boxes pieces
python tools/play/export_pack.py _test-boxes assemble
python tools/play/export_pack.py _test-boxes publish
npm run dev      # then open /play/_test-boxes (dev packs load outside production only)
```

If the engine ever needs a change to load it, the format is wrong: fix the format.

---

## 2. Writing story.json

`content/play/<slug>/story.json`. The exporter validates it and merges it into `site.json` at
assemble time. The schema is defined by `lib/play/story/engine.js` (what plays) and
`scripts/play/validate-story.mjs` (what passes).

### 2.1 Top level

| Field | What it is |
|---|---|
| `slug`, `title`, `logline`, `question` | The level's name, one-line pitch and the question the player carries |
| `default_lens` | Usually `traveller` |
| `lenses` | `[{ id, name, blurb }]`: `traveller`, `builder`, `scribe`, `child` |
| `tiers` | Chip labels per tier, for example `{ "record": "From the record", "reconstruction": "Our reconstruction", "legend": "Legend", "unknown": "Not known", "reading": "Our reading" }` |
| `facts` | `[{ id, claim, source, tier, status }]` |
| `witnesses` | `[{ id, name, who, record_date, source }]` |
| `evidence` | `[{ id, title, caption, facts, image?, credit? }]`. `image` is a path inside the pack, and needs a `credit` |
| `chapters` | `[{ id, n, title, years, witness, state, nodes, start_node, side_notes, beats }]`. A chapter with `preview: true` sits outside the story order |
| `ending` | `{ beats, know, unknown, share_line, quiz }` |

### 2.2 Facts and tiers

- Every fact has an `id`, the exact `claim`, a `source`, a `tier` and a `status`.
- Tiers: `record`, `reconstruction`, `legend`, `unknown`, `reading` (our inference from sourced
  facts). The game shows each as a chip.
- Only `"status": "verified"` ships. Any other status fails validation.
- A fact needs a source unless its tier is `unknown` (the U facts: what nobody knows).
- Lines that state nothing about the past (framing, questions, method) still need a fact list. They
  may point at the method notes (the M facts).

### 2.3 Beats

Beats play in order. A run of `evidence` beats in a row becomes one Look step: the player finds
them in any order.

| Type | What it does | Fields beyond the common ones |
|---|---|---|
| `line` | A narrated line | `role`: `question` or `turn` (styling); `tier` for a line's chip; `placeholder: true` for owner wording not yet confirmed |
| `lens` | The lens choice (interface, not spoken) | `ui: true` |
| `evidence` | A piece of evidence to find | `evidence` (an evidence id), `at: { node, target }` (where its hotspot sits) |
| `choice` | Which witness to trust | `options: [{ id, text, accepted, record, after: [lines] }]`. At least two, at least one accepted. `record` is what goes on the player's card; `after` lines are spoken after that pick |
| `restore` | Fit the 3D piece | `restoration` (a restoration id from the site config), `ui: true` |
| `order` | Drag dated cards into order | `cards: [{ id, label, text, facts, say?, pace?, pause_after_ms?, gap? }]`, listed in the right order. A `gap: true` card is a blank in the record and is not placed |
| `answer`, `know`, `hook` | The chapter's answer, its "you now know" line, the hook into the next chapter | |
| `reveal` | Every viewpoint goes from NOW to THEN | No text and nothing spoken |
| `proof` | The proof switch | `toggle_label`, `after: [lines]` that wait until the player presses it |
| `vote` | A question with no right answer (the year vote) | `options: [{ id, text }]`; no option may be `accepted` |

Common fields on every beat: `id` (unique across all beats, after lines and cards), `type`, `text`
(a string, or one string per lens: `{ "traveller": "...", "child": "..." }`), `facts` (required
whenever there is text, unless `ui: true`), and the narration fields below.

The ending: `know` is `[{ text, facts }]` (the "What you now know" card), `unknown` is
`[{ text, facts }]` (what nobody knows), `share_line` is the share text, and `quiz` is the
debug-only test: `[{ id, item, q, options: [four], answer: index }]`.

### 2.4 Lenses

All four lenses play the same beats. Only the wording changes: give `text` per lens, and a lens
without its own text falls back to `traveller`. Side notes are per chapter:
`side_notes: { builder: { facts, text } }`. A side note must come from the site's own research
files; a lens with nothing in those files for a chapter gets no side note. Only the default lens is
narrated; the others run the same pauses on reading time.

### 2.5 Narration fields

| Field | What it is |
|---|---|
| `say` | The spoken wording, written for the ear: years as words ("seventeen ninety one"), dates in full, no brackets, symbols or digits. A string is one clip; a list `[{ text, pace?, pause_after_ms?, clip? }]` is one clip per item. Without `say`, the traveller text is spoken |
| `pace` | `steady` (about 150 words a minute, the default), `slow` (about 125: questions, turns, reveal lines, the last line of a chapter), `brisk` (about 170: lists only) |
| `pause_after_ms` | Silence after the line, inserted by the engine (default 600) |
| `clip` | Clip id override. Default: the beat id, then `<id>-2`, `<id>-3` for later items of a `say` list |
| `silent` | No clip for this beat |
| `ui` | An interface beat: never spoken |

The pause names from the brief (8.11):

| Name | Length | Use |
|---|---|---|
| breath | 250 ms | between two lines of the same thought |
| beat | 600 ms | a new thought |
| hold | 1100 ms | after a date or name that matters, and either side of a turn |
| silence | 1800 to 2500 ms | after the chapter's question, after a reveal line |

A pause inside a sentence is made by splitting `say` into two sentences, never by cutting audio.
A line whose shown text has as many sentences as it has spoken segments pages one sentence at a
time, in step with its clips.

### 2.6 The validator

```bash
npm run play:validate                                        # every content/play/*/story.json
node scripts/play/validate-story.mjs content/play/<slug>/story.json
node scripts/play/validate-story.mjs --ship                  # placeholders fail too
```

It runs inside `npm run lint` and inside `export_pack.py assemble`. It fails on:

- a beat, card, evidence item or "know" line with text and no fact id, or citing a fact that does not exist;
- a fact whose status is not `verified`, a fact with an unknown tier, or a fact with no source (except `unknown`);
- an em or en dash anywhere in copy;
- a `say` with brackets, digits or symbols in it, or an unknown `pace`;
- an unknown beat type, witness, evidence or a duplicate id or clip id;
- a choice with fewer than two options or none accepted; an order beat with fewer than two cards to place, or a card without a label, text or facts;
- a reveal with text; a proof without its line or `toggle_label`; a vote with an accepted option;
- a quiz question without exactly four options and a valid answer index;
- with `--ship`: any line marked `placeholder` and any fact whose source holds a `[SAMBIT: ...]`.

It also lists, without failing, lines longer than two lines on a 375 px phone (92 characters).

---

## 3. Narration

Everything is in `tools/play/voice/`; its `README.md` is the full manual (setup, every flag, how the
checks work). The essentials:

- **One clip per spoken line.** Pauses are not in the audio. They are `pause_after_ms` in the story,
  inserted by the game, so the voice can be swapped without touching any timing.
- Clips go to `public/play/packs/<slug>/v1/audio/<voice>/<clip-id>.m4a`, with a `manifest.json`, and
  `audio/voices.json` lists the voice folders and the default. The `v1` is fixed in
  `tools/play/voice/common.py` today; a site's second pack version needs that path changed.
- Runs on CPU only. No paid API, no voice cloning. The current voice is `kokoro-heart` (Kokoro,
  Apache-2.0), chosen at GATE 1.

```bash
python tools/play/voice/render.py --voice kokoro-heart                     # every spoken line
python tools/play/voice/render.py --voice kokoro-heart --chapters prologue,ch1
python tools/play/voice/render.py --voice kokoro-heart --only p-03,c1-q
python tools/play/voice/render.py --voice kokoro-heart --names-reel        # audio/<voice>/_names_reel.m4a
python tools/play/voice/render.py --script-only                            # voice_script.md, the recording sheet
python tools/play/voice/check.py  --voice kokoro-heart                     # writes reports/<voice>.md, exit 1 on any failure
python tools/play/voice/calibrate.py --voice kokoro-heart                  # how slow this voice can go
```

`--site <slug>` picks another site (default the palace). A clip is rendered again only when its
words, pace, lexicon entry or voice settings change; changing only `pause_after_ms` re-renders
nothing.

`check.py` fails a clip when neither speech-to-text model hears it word for word, it is more than
12 percent off its pace target, its loudness is off -18 LUFS, it clips or peaks above -1.5 dBTP, its
head or tail silence is outside 15 to 90 ms, or its line changed after it was rendered. It measures;
it cannot say whether a voice sounds good.

**voices.json** lists each voice: engine, worker, licence, and engine speeds per pace (`steady`,
`slow`, `brisk`, plus the floors `min` and `min_short` that `calibrate.py` sets). A single clip that
fails its round trip at the floor gets its own floor:

```json
"clip_overrides": { "c1-C-1-2": { "min": 0.85, "why": "extra first word heard at 0.72" } }
```

**lexicon.json** says how each name is said, per engine (`kokoro_a`, `kokoro_b`, `arpabet`,
`espeak`, `respell`). It changes only what the engine is given, never the text players read. After
editing a name: render, render the names reel, check.

**Swap the voice (one command).** Render into a new voice folder and make it the default. Same clip
ids, no timing changes:

```bash
python tools/play/voice/render.py --voice melo-india --make-default
python tools/play/voice/check.py  --voice melo-india
```

A new voice needs an entry in `voices.json` and its licence in `LICENSES.md` first.

**Human recordings.** `render.py --script-only` writes `voice_script.md`: every line with its id,
pace and pause. Record one file per row, named by clip id, with about 40 ms of silence at each end
and no pauses inside. Convert each into a new folder with the same ids:

```bash
ffmpeg -i p-01.wav -af "loudnorm=I=-18:TP=-1.5:LRA=11" -ac 1 -ar 44100 -c:a aac -b:a 96k \
  public/play/packs/tipu-summer-palace-bengaluru/v1/audio/human/p-01.m4a
```

`check.py` reads the manifest that `render.py` writes, so it does not yet run on recorded files.

**Listening.** `/play/admin/voice` (admin sign-in) plays a whole chapter with the real pauses and
lists every line with its own play button, pace and pause. Lines marked to redo are kept in that
browser only.

---

## 4. The daily puzzle

`tools/play/daily/generate.mjs` builds The Missing Piece from published packs, with no writing:
every clue, option and explanation is text already in a pack's `site.json`.

```bash
node tools/play/daily/generate.mjs                    # every live site in the registry
node tools/play/daily/generate.mjs --dry              # report only, write nothing
node tools/play/daily/generate.mjs --site <path/to/site.json> --pack <pack dir>   # a staged pack
node tools/play/daily/generate.mjs --start 2026-12-01 # first date it may add (default today, India time)
```

It writes `content/play/daily/<slug>.json` and `content/play/daily/index.js` (which the server
imports). Commit both, and rebuild.

How it works:

- An **element** is a restoration, or an evidence item found in a chapter. Each element gives one or
  more puzzles: three clues, then "where does it belong" and, where the pack or story has one,
  "which version is right".
- **The 30-day rule.** A date gets the least recently used element that has not appeared in the
  last 30 days. The calendar stops at the first date with nothing free: it never cycles and never
  leaves a hole, and the game shows no puzzle after the last date.
- **Coverage.** The report prints how many elements and puzzles the pack gives and the last date
  the calendar reaches. With fewer than 30 elements a site cannot cover every day; the palace has
  24 elements, and its calendar runs 2026-11-17 to 2026-12-10.
- **Past days never change.** Dates up to today keep their puzzles, and a date another site's
  file already has is skipped, so adding a site or regenerating never changes a puzzle someone
  has played.
- `--min-gap N` allows a shorter gap than 30 days. That is the owner's decision only; log it in
  `DECISIONS.md`.

**When a new site is published:** publish the pack, run the generator with no arguments, commit
`content/play/daily/`, rebuild. The new site's elements fill dates after today. Also run it before
the calendar's last date, every time, to extend it.

`tools/play/daily/smoke.mjs` plays today's puzzle in headless Chrome against a running server and
deletes every row it wrote:

```bash
node --env-file=.env.local tools/play/daily/smoke.mjs http://localhost:3000
```

---

## 5. Reading the dashboard: `/play/admin`

Behind the site's existing admin sign-in (`/admin/login`, the admin session cookie signed with
`ADMIN_JWT_SECRET`). Never cached. Filters at the top: a date range (UTC, last 30 days by default,
at most 400), source, creator code and site. Every section reads only the `play_` tables, and a
"player" is a distinct anonymous id. Counts are fine here; the no-counts rule is for players.
Browsers with Do Not Track or Global Privacy Control send no events, so they are not in the event
numbers.

| Section | What it shows |
|---|---|
| Top cards | Opened a level, completed, proof switch users, year votes, shares, emails confirmed, CTA clicks, daily plays |
| **Chapter by chapter drop-off** | The number that matters most. See below |
| Runs recorded by the server | From `play_runs`: runs, completed, players, median time and average accuracy of completed runs |
| Lens chosen | Distinct players per lens |
| Choices | Each option of each choice: first picks per player (the honest split) and all picks (changed minds included) |
| Proof toggle | Players who pressed it, how often it went on and off |
| Year vote | Stored votes per option (a player may change their vote) |
| Shares, Emails given, CTA clicks | Events by kind. "Emails given" also shows addresses confirmed with consent in the range |
| Daily: The Missing Piece | Results per day and the share answered right, plus `daily_start` events |
| Daily streaks | Each player's longest run of right days that reached into the range; "running" if it includes the range's last day or the day before |
| Weekly vote | Counted votes per week (email confirmed only), and binding votes from founding members. Weeks start Monday, India time |
| By source, By creator code | Players who opened and completed a level, by where they came from and by creator code |

**How drop-off is counted** (`lib/server/play/stats.js`, `components/play/admin/view.js`). For each
site it counts distinct anonymous ids with a `start` event, then for each chapter of the published
story a `chapter_start` and a `chapter_finish`, then `complete`. Each step's "lost since previous
step" is the share of the step above that did not reach it. A preview chapter is shown only if
someone played it and does not break the chain. A player who resumes mid-level can appear in a
later step without the earlier ones, so a later step can be larger than an earlier one. Chapter ids
in events that are not in the published story are listed as "(not in the published story)".

**Founding members.** Whose weekly vote is binding is an admin flag, set by email address:
`POST /api/play/vote/founding` with `{ "email": "...", "founding": true }`, signed in as admin.
`GET` on the same route gives this week's raw tally.

---

## 6. Switching features on and off

`lib/play/features.js`. Server-side environment variables, read on every request. Each is **on
unless set to an off word**: `0`, `off`, `false`, `no`, `disabled` (any case). Set one in Vercel
(Settings, Environment Variables, Production) and redeploy.

| Variable | Off means |
|---|---|
| `PLAY_ENABLED` | The whole game. Every `/play` page shows a plain "Coming soon" page and every `/api/play` route answers 404. Still up: `/play/privacy`, `/play/unlock/stop` and its API (unsubscribe links in sent emails keep working), and `/play/admin` behind its sign-in. With it off, every other switch reads off too |
| `PLAY_DAILY` | The daily puzzle (`/play/daily`, `/api/play/daily/*`) and the streak board |
| `PLAY_VOTE` | The weekly vote (`/play/vote`, `/api/play/vote/*`) and the Vote buttons on locked cards. Also off whenever `PLAY_EMAIL` is off. The year vote at the end of a level is part of the story and is not switched |
| `PLAY_LEADERBOARDS` | `/play/leaderboards`, `/api/play/leaderboard`, the end-card board and the daily board. Runs and daily results are still recorded, so the boards come back complete |
| `PLAY_EMAIL` | Giving an email (end card, locked cards, early access), the confirm and restore links, and with them early access and the weekly vote. Unsubscribing always works |
| `PLAY_NARRATION` | The narrator. No Sound button and no audio fetched; the pauses still run on reading time |
| `PLAY_ANALYTICS` | The cookieless events behind the dashboard. Nothing is sent or stored. Runs, votes and daily results are game records and are still kept |

Status on 2026-11-17: `lib/play/features.js` and the 404 helper `featureOff()` in
`lib/server/play/http.js` exist; another change was wiring them into the pages and routes while
this was written. Check with `grep -rn "featureOff\|playFeatures" app components` before relying on
a switch, and test it on a preview first.

Other Play variables, not switches:

| Variable | What it does |
|---|---|
| `PLAY_SIGNING_SECRET` | Signs every link in Play emails (HMAC-SHA256). At least 32 characters. Without it Play stores and sends no email |
| `PLAY_PUBLIC_URL` | Origin for links in emails, no trailing slash. Empty: `https://www.epocheye.com` |
| `PLAY_EMAIL_DRY_RUN` | `1` logs each email instead of sending it. Tests only; never in production |
| `PLAY_DEBUG` | `1` lets anyone on that deployment open the debug view with `?debug=1` (every beat, its fact id, the eight-question test). Signed-in admins always can. Never set it in production |
| `PLAY_DEV_PACKS` | `1` lets a production build serve `dev` packs. Local testing only |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend key, and the sender (default `Epocheye <noreply@epocheye.com>`, which must be on a domain verified in Resend) |
| `DATABASE_URL` or `NEON_DATABASE_URL` | Neon Postgres |
| `ADMIN_JWT_SECRET` | The admin sign-in that guards `/play/admin` |

---

## 7. The social exporter

`tools/play/social/export.mjs` makes ready-to-post images and captions for one day. Read only:
nothing is written to the database.

```bash
node --env-file=.env.local tools/play/social/export.mjs
node --env-file=.env.local tools/play/social/export.mjs --date 2026-11-20 --site tipu-summer-palace-bengaluru
```

It writes to `tools/play/social/out/<date>/` (git-ignored), per live site:

- `daily-teaser`: the day's Missing Piece, no spoiler;
- `know-<chapter>`: each chapter's "you now know" card, one fact and its source over that chapter's
  restored view, linked to the chapter;
- `year-vote`: the year-vote shares, only with at least 20 votes;
- `board-daily`, `board-site`: top ten display names, only with a full ten.

Each comes as 1080x1350 (feed) and 1080x1920 (story) PNG with a caption `.txt`. Words come only
from verified facts in `story.json` and from generated display names. Anything that cannot be made
honestly (too few votes, a short board, a dash in a caption) is skipped and listed in
`SUMMARY.txt`.

---

## 8. The database

Neon Postgres. Play has its own tables, all prefixed `play_`, created by two additive migrations.
Nothing outside `play_` is written. Creator codes are read (only) from `promo_codes`.

```bash
node --env-file=.env.local scripts/migrate-play.mjs          # db/015_play.sql
node --env-file=.env.local scripts/migrate-play-email.mjs    # db/016_play_email_votes.sql
```

Both are idempotent (`CREATE ... IF NOT EXISTS`), refuse any statement that is not an additive
`play_` create, and print the tables with their row counts at the end. Run 015 first: 016
references `play_players`.

| Table | Holds |
|---|---|
| `play_players` | Anonymous id, generated display name, the confirmed email with consent flag and consent time, the one live link nonce, the first creator code, first and last seen |
| `play_runs` | One row per run: site, pack version, lens, chapters done, completed, time, accuracy, first picks, year vote, creator code, source |
| `play_run_clock` | When the server first saw a run (the leaderboard time starts here) |
| `play_daily`, `play_daily_starts` | Daily results, and when the first clue was handed out |
| `play_votes` | Weekly vote, one per player per week, with `binding` |
| `play_year_votes` | Year vote, one per player per site |
| `play_cards` | Short card ids and their payload (site, lens, choices, vote; no player) |
| `play_events` | Cookieless analytics: anonymous id, name, site, chapter, props, source, creator code, path, time. No IP, no user agent |
| `play_email_claims` | An address a player asked to use, not yet confirmed. Expires after 14 days |
| `play_player_email` | Confirmed address, confirmation and unsubscribe times, founding member flag (016) |
| `play_email_sends` | One row per email sent, by a one-way tag of the address (send limits) |
| `play_email_stops` | Addresses that asked for no more Play email, by tag |
| `play_email_log` | Created by 016, no longer written |

No retention job exists. Only unconfirmed email claims are cleared, after 14 days, when the next
email request comes in.
