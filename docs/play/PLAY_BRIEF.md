# EPOCHEYE PLAY: BUILD BRIEF (v3, story-led)

A browser game on our own website, built from our own 3D sites.
Save this file in the website repo as `docs/play/PLAY_BRIEF.md`.
Read all of it at the start of every run. The goal only points here.

Working title: **Rebuild**. `[SAMBIT: final name]`. Route: `/play`.

What changed in v3: the game is now a written story in chapters, not a
pool of shuffled fragments. The full story for the Summer Palace is in
section 8. Build exactly that story. It is narrated by a placeholder
voice with directed pacing (5.8 and 8.11).

---

## 0. What we are making and why

A free game on epocheye.com where the player rebuilds a lost monument
from its evidence, chapter by chapter, and finishes knowing its real
history.

It exists for one reason: **marketing for the main product.** Every play
should end in one of four things: a share, an email, a vote for the next
site, or a click to the app or pre-order page.

The test of the story: **a player who finishes can tell a friend what
this building was, what happened to it, and how we know.** If they
cannot, the level has failed, however good it looks.

Four rules shape everything:

1. **One engine, many sites.** The engine has no site-specific code. A
   site is a "site pack" (renders, masks, pieces) exported by one script,
   plus one hand-written `story.json`. The daily puzzle is generated with
   no writing. The story is written per site and approved by me.
2. **It must look like our renders, on any phone.** See section 2.
3. **It never invents history.** Same evidence rules as our builds. Every
   line of story maps to a fact with a source and a tier.
4. **Story first.** The puzzle serves the story. A restoration is never
   just "fit the piece". It is the answer to a question the chapter asked.

---

## 1. The game

### 1.1 Shape of a level (10 to 15 minutes, five chapters, one win)

- The player is **themselves, today**, standing at the site as it is now.
  They are not a character from the past.
- The level opens with **one question** the player wants answered.
- It runs in **chapters**. Each chapter is one period of the building's
  real life, told through one **witness**: a real person or object that
  saw the building and left a record.
- Every chapter has the same beat, about two to three minutes:
  1. **Cold open**: two or three lines and the chapter's question.
  2. **Look**: move between viewpoints, find two to five pieces of
     evidence.
  3. **Decide**: an evidence choice. Which witness do you trust, and how
     far? A wrong pick explains why the evidence rules it out.
  4. **Restore**: turn and fit the 3D piece. That part of the building
     comes back, in place, from every viewpoint.
  5. **Answer**: the chapter's question answered in one or two lines, one
     "you now know" line, and the next chapter's question as a hook.
- **Win**: the last restoration. The whole site crossfades from today to
  its complete state.
- **After the win**: the proof toggle, the year vote, and the "What you
  now know" card (1.3).

Progress saves after every chapter. Chapters can be replayed from a
chapter list. Chapter 1 must hook in under two minutes with no sign-up.

This is not treasure hunting. The player never takes, digs up or collects
artefacts. They gather evidence and rebuild, the way we do.

### 1.2 Choices that matter but never change facts

- The player's choices are about **evidence and method**, never about
  what happened. History is fixed. What the player decides is which
  source to trust, how far, and what to do where the record runs out.
- Where sources disagree, the player sees both and learns why they
  disagree.
- Choices are recorded and shown on the player's final card ("You chose
  to leave the gaps plain").
- **Lenses stay, but they no longer shuffle the story.** The player picks
  Builder, Scribe, Traveller or Child. `[SAMBIT: confirm the four]` The
  spine is identical for all four. The lens changes the wording level and
  adds one optional side note per chapter:
  - Builder: how it was made.
  - Scribe: who wrote it down and how we read it.
  - Traveller: what you would have seen standing there.
  - Child: the same facts in short words, under twelve words a sentence.
  Side notes come only from the site's own research files. If the files
  have nothing for a lens in a chapter, that lens gets no side note.

### 1.3 The ending pays off three times

1. **The reveal.** The building complete, from every viewpoint.
2. **The proof toggle.** One switch: "Show only what the record proves."
   Everything tiered as our reconstruction fades to plain. Switch it back
   and it returns. This is our method made visible, and it is the most
   honest thing in the game.
3. **The card.** "What you now know": the facts the player learned, the
   choices they made, and "what nobody knows". It has its own URL and
   share image.

Then the year vote ("Which year would you put back?") with live
percentages, and three buttons: Share, See it for real, Next site.

### 1.4 Daily mode: The Missing Piece (60 seconds, endless)

- One lost element per day, from any live site. Same piece for everyone.
- Three clues from the evidence, then: where does it belong, and which
  version is right?
- Result is a small shareable grid, no spoilers. Streaks and a daily
  leaderboard.
- Generated from the site packs, with no writing. Generate every valid
  puzzle from the palace, report how many days that covers, never repeat
  inside 30 days.
- Every daily result ends with: "This piece belongs to Chapter N" and a
  button into that chapter. The daily brings people in. The story keeps
  them.

### 1.5 The world grows by vote

- Weekly vote on which site or part gets built next. Founding members'
  votes are binding.
- Sites not ready appear as locked cards with a build-progress clip and a
  vote button.

### 1.6 Witnesses and voices

- **Witnesses are real.** A named person in the game is a real person who
  left a real record, and says only what that record says. Short direct
  quotes are allowed from public-domain texts, with the source shown.
- **No invented named people.** No invented dialogue for a real person.
- **Role figures** (a carpenter, a clerk, a petitioner) may appear only
  as unnamed figures from our existing palace models. Their caption
  states a sourced fact about that role. They do not speak invented
  lines. Reuse an existing voice line only where it matches a fact in
  section 8.
- The narrator speaks to the player as "you", present tense.
- Text first. The whole game works with sound off.
- **Narration ships with a placeholder synthetic voice, done properly.**
  I may replace it later with my own voice or an actor. Section 5.8 says
  how to build it. Section 8.11 says how every line is spoken: where it
  slows, where it stops, where it stays silent. A flat read-through is a
  failed build.
- No free-text chat in v1.

### 1.7 What it must never do

- No combat, no violence shown, no looting framing. A siege is one line
  of text and a date, never a scene, never casualty numbers.
- Nothing playable inside a sanctum.
- No invented facts, figures, inscriptions, quotes or scenes.
- Lead with the place, not with a ruler as hero or villain.
- No prices anywhere in the game.

---

## 2. How it looks photoreal on a cheap phone (the main design decision)

Real-time 3D of a whole monument in a mobile browser looks like an old
video game. We already saw that on `/virtual`. So v1 does not do it.

**v1 is node-based, like Myst or Street View:**

- At each viewpoint the player sees a **360 panorama rendered in Cycles**
  from our real scene.
- Each viewpoint has two panoramas from the same camera: **NOW** and
  **THEN**.
- Each restoration has a **mask** for each viewpoint that sees it. When
  the player restores it, THEN shows through NOW inside that mask only.
- Each viewpoint also has one **tier mask**: which pixels of THEN are
  from the record and which are our reconstruction. The proof toggle
  (1.3) uses it to fade reconstructed areas to plain in the shader. No
  third panorama is rendered.
- Only the small piece the player is handling is real-time 3D (one kit
  piece GLB, 1 to 2 MB).

The engine must also support `mode: "realtime"` for a site whose web
model passes the look bar later. v1 ships `mode: "pano"` only.

**Look bar:** a panorama on a phone must be indistinguishable from the
Blender render it came from. If compression shows, raise quality.

---

## 3. The site pack and the story file

### 3.1 The pack (exported, never hand-made)

`play/packs/<slug>/v<N>/`

```
site.json            everything the engine needs (below)
pano/<node>/then/    cube faces, 3 sizes (512 preview, 1024, 2048)
pano/<node>/now/
mask/<node>/<restoration>.webp     greyscale mask per viewpoint
tier/<node>.webp                   record vs reconstruction mask
pieces/<restoration>.glb           the 3D piece (meshopt, KTX2)
options/<restoration>/a|b|c.webp   the Match options
evidence/<id>.webp                 evidence images (licensed only)
sprites/<figure>/<node>.webp       alpha cut-outs
audio/<voice>/<beat-id>.m4a        one clip per spoken line
audio/ambience/<node>.m4a          quiet room tone, CC0 only
share/                              base images for share cards
CREDITS.md  LICENSES.json
```

### 3.2 The story file (hand-written, one per site)

`content/play/<slug>/story.json` in this repo. The exporter merges it
into `site.json`. Schema:

- `title`, `logline`, `question`
- `facts[]`: id, claim (exact wording), source, tier, status
  (`verified` or `check`)
- `witnesses[]`: id, name, who they were, date of their record, source
- `chapters[]`: id, title, years, nodes, witness, and `beats[]`
- `beats[]`: type (`line`, `evidence`, `choice`, `restore`, `order`,
  `answer`, `know`, `hook`), text per lens, fact ids, evidence id,
  restoration id, and for narration: `say` (the spoken wording, see
  5.8), `pace` (`steady`, `slow`, `brisk`), `pause_after_ms`, `clip`
- `choices[]`: options, which are accepted, the explanation shown for
  each, what is recorded on the player's card
- `ending`: reveal line, proof toggle line, year vote options, the
  "now you know" list, the "nobody knows" list

**Hard rule in the build:** a beat with text and no `fact` id fails the
build. A fact with status `check` cannot ship. The session either
confirms it against a source and marks it `verified`, or rewrites the
line to what the source supports, or cuts it.

`site.json` holds: `site`, `nodes[]`, `restorations[]` (id, name, nodes
that see it, evidence, correct option, why the wrong ones are wrong,
piece, chapter), the merged `story`, `figures[]`, `daily[]`, `credits`.

The game shows the tier of every claim as a small chip: **From the
record**, **Our reconstruction**, **Legend**, **Not known**.

### 3.3 The exporter (`tools/play/export_pack.py`)

Runs Blender headless against a site's Blender project and writes a pack:

1. Reads the site's viewpoints, loss list, ledger and stories.
2. Renders the THEN and NOW panorama at every node (Cycles, equirect,
   then cube faces at three sizes).
3. Renders one mask per restoration per node, and one tier mask per node
   from the tier suffix in object names (object ID pass, fast).
4. Exports each piece as a GLB with baked textures.
5. Renders the Match options per restoration (the correct one and real
   alternatives the evidence rules out, never joke options).
6. Renders figure sprites at each node's angle.
7. Validates and merges `story.json`. Writes `site.json`, credits and
   licences.
8. **Estimates render time first and tells me the hours.** Checks
   `nvidia-smi`. Never renders while another project is using the GPU
   (the Konark build uses `E:\konark\locks\gpu.lock`: respect it).

The exporter always runs Blender in the background (`blender.exe -b`).
It never uses the open Blender window or its MCP connector.

Rules: read-only on the site's Blender files, never edit the shared
`pr_kit`, write only inside this repo's `tools\play\out\`. For sites
built before THEN/NOW pairs existed, report what is missing instead of
faking a NOW state.

---

## 4. Launch with one site: Tipu Sultan's Summer Palace

**We launch with the Summer Palace only.** Do not audit or export any
other site in this goal.

### 4.1 Audit the model. Write `tools/play/AUDIT.md`:

- Where its Blender project is (ask me for the folder path, then confirm).
- Does it render photoreal in Cycles today? Render one test frame.
- Does it have a THEN state and a NOW state? If NOW is missing, say what
  it would take to build it from photos. Never fake a NOW state.
- The list of lost elements with their evidence, from the palace's own
  research files (ledger, sources, narration constraints).
- The existing stops and viewpoints from the app's journey.
- The palace figures and their existing voice lines.
- Licence status of every texture and reference image, including the
  Hunter prints.
- Blender version on this machine. The photoreal kit was tuned on 5.2; if
  this machine runs 5.3, report anything that behaves differently.

Verdict: READY, or NEEDS WORK with the exact list. If it needs more than
a day of work, stop and tell me before doing it.

### 4.2 Check the story. Write `docs/play/STORY_CHECK.md`:

Section 8 was written from web sources, not from the palace's own
research files. Before building it:

- Check every fact in 8.9 against the palace's research files and, where
  marked, against the primary text. One row per fact: confirmed,
  corrected (old wording, new wording, source), or cut.
- **Where the palace's files and section 8 disagree, the palace's files
  win.** List every such case for me.
- **The hedges from the palace's narration rules apply to every word**
  (for example "around a hundred and sixty pillars", "ten or twelve
  fanams"). Keep that wording. Do not sharpen or soften any of it.
- Map the audited loss list onto the chapter restoration slots in 8.8.
  A chapter with no matching restoration becomes evidence-only. Never
  model a new lost element just to fill a slot.
- Change no more of the story than the check requires. Do not rewrite it
  for style.

### 4.3 Locked cards

`/play` shows Konark Sun Temple, Victoria Memorial and Hampi as locked
cards with a vote button and "Building now" or "Coming". No dates I have
not given you. A card unlocks by uploading a pack and a story file, with
no code change.

---

## 5. The website build

### 5.1 First, inspect and report (5 lines)

Framework, hosting, existing backend or serverless functions, analytics,
how `/virtual` and `/journeys` load 3D today, existing privacy and terms
pages. Then build on a new branch `feat/play` with a preview URL. Do not
break or restyle any existing route.

### 5.2 Routes

- `/play`: site select, daily puzzle entry, vote.
- `/play/<slug>`: the level. Deep link to a chapter with `?ch=<n>`.
- `/play/daily`: The Missing Piece.
- `/play/c/<id>`: a player's "What you now know" card (public, shareable,
  own Open Graph image).
- `/play/vote`: the weekly vote.

### 5.3 Engine

- Three.js (or the 3D library the repo already uses). One engine, driven
  entirely by `site.json`. No site-specific code.
- Panorama viewer: cube map, progressive (512 first, then sharper), drag
  to look, gyroscope on phones with a permission prompt, pinch zoom
  within limits.
- Hotspots for moving, evidence and restorations.
- **Story engine**: plays `chapters[].beats[]` in order. Beat types:
  line, evidence, choice, restore, order (drag dated cards into order),
  answer, know, hook. Deterministic, replayable, with a debug view that
  lists every beat and its fact id.
- Text is the primary channel: short lines, one at a time, tap to
  continue, never a wall of text. Max two lines on screen. A "source"
  tap on any line shows where it comes from.
- Restoration blend: THEN over NOW through the masks, with a short
  animated reveal.
- Proof toggle: fades reconstruction-tier areas using the tier mask.
- Piece handling: a small real-time canvas for the Restore step, with
  snap when the fit is close.
- Audio: narration and a quiet ambience, off until the player taps. The
  engine plays one clip per line and inserts the silence between clips
  itself, from `pause_after_ms`. The line of text appears as its clip
  starts. A tap skips to the next line. With sound off, the same pauses
  run on reading-speed timings.
- Saves progress locally after every chapter. Works without an account.

### 5.4 Backend (use what the repo already has)

New tables in our Neon Postgres, created by migration, touching nothing
else: `play_players` (anonymous id, optional email, consent, display
name), `play_runs` (site, lens, chapters done, time, accuracy, choices),
`play_daily` (day, player, result), `play_votes`, `play_year_votes`.

- Anonymous by default. Email is asked only to save progress across
  devices, to unlock the next site early, or to vote.
- Consent checkbox, unticked, with a link to Privacy.
- Display names come from a generated list. No free-text names, no chat.
- The server checks daily answers and run results. Rate limit every
  endpoint. No secrets in client code.
- Leaderboards: per site, daily, and streaks.

### 5.5 The marketing layer (this is the point)

- **Chapter cards**: after each chapter, one "you now know" line over the
  restored view, shareable. One real fact per card, with its source.
- **The final card**: "I rebuilt [site] from its evidence." The facts
  learned, the player's choices, and what nobody knows. Rendered
  server-side. Test previews on WhatsApp, Instagram, X and Reddit.
- **Year vote**: live percentages, shareable.
- **End of level**: reveal, proof toggle, card, then three buttons:
  Share, See it for real (to the app or pre-order page), Next site.
- **Email unlock**: the next site opens a week early for players who
  leave an email.
- **Creator links**: `?c=<code>` credits a creator for every play and
  sign-up from their link.
- **Tracking**: cookieless analytics. Events: start, lens chosen, each
  chapter started and finished, each choice, level complete, proof toggle
  used, year vote, share, email given, CTA click, each with source and
  creator code. The number I care about most is **chapter-by-chapter
  drop-off**. One dashboard page at `/play/admin` behind our existing
  admin check.
- **Content engine**: a script that exports the day's Missing Piece, each
  chapter's "you now know" card, the year-vote result and the
  leaderboard as ready-to-post images and captions into
  `tools/play/social/`.

### 5.6 Copy rules

- Only facts from `story.json`. No invented numbers, quotes or
  countdowns.
- No user counts, traction, funding or prices.
- No em dashes or en dashes. Short, plain, human sentences. Write ranges
  as "1781 to 1791".
- `[SAMBIT: ...]` for anything unknown. List every placeholder at the end.

### 5.7 Quality bar

- First playable view in under 5 seconds on a mid-range Android over 4G.
  Under 3 MB before the first view. Everything else streams.
- 30 fps or better on a mid-range Android.
- Works one-handed in portrait. Works with mouse and keyboard.
- `prefers-reduced-motion` respected. Screen reader labels on controls.
  A fully tap-based path with no drag or gyro needed.
- Pack files on versioned paths. No `immutable` cache header on anything
  unversioned.

### 5.8 Narration: a placeholder voice, done properly

The voice is a placeholder. The pacing is not. Build the pacing so well
that swapping the voice later changes nothing else.

**How it is built (`tools/play/voice/`)**

- **One clip per spoken line.** Never one long file per chapter. Pauses
  are silence the engine inserts between clips, set per line in
  `story.json`. This is what makes the timing exact with any voice.
- **A pause inside a sentence is made by rewriting it as two sentences,
  never by cutting audio mid-sentence.** Example. Shown text: "The first
  man to describe it in print said mud." Spoken: "The first man to
  describe it in print said something else." Then a breath. Then "He
  said mud." You may reshape `say` like this. You may not change a fact.
- **`say` is written for the ear.** Years as words ("seventeen ninety
  one"). Dates in full ("the twenty first of March"). No brackets, no
  abbreviations, no symbols.
- **Names lexicon** (`lexicon.json`): Hyder Ali, Tipu Sultan,
  Srirangapatna, Bangalore, Kempe Gowda, Chikka Devaraja Wadiyar, Kote
  Venkataramana, Attara Kacheri, Mysore, Buchanan, Cornwallis, Bowring,
  Hunter. Render a "names reel" of all of them for me to check.
  `[SAMBIT: listen to the names reel and correct any name.]`
- **Clean the clips.** Trim silence at head and tail to about 40 ms so
  the engine alone controls the gaps. Same loudness on every clip. No
  clipping. Short fades.
- **Render the default lens only** for the placeholder. The other three
  lenses are text only until I choose a final voice.
- Output goes to `audio/<voice>/<beat-id>.m4a`. Replacing the voice is
  one command (`render.py --voice <name>`) or dropping in recorded files
  with the same ids. Also export `voice_script.md`: every line with its
  id, pace and pause, as a recording sheet for a human.

**Choosing the placeholder voice**

- One narrator. Warm, calm, unhurried. A person telling you something at
  the site. Not an advert, not a film trailer, not a newsreader.
  Sentences end downward. No rising excitement.
- Indian English if a good one exists, otherwise neutral. Never a put-on
  accent. No second voice for quotes.
- Free and local first. Candidates to test, **checking each licence
  yourself on the day for use on a public commercial website**: Kokoro,
  MeloTTS (has an Indian English voice), Chatterbox. Run on CPU, or
  respect the GPU lock.
- Do not ship a voice whose licence is unclear. Do not use a paid API
  without asking me. Do not clone any real person's voice, mine included.
- **Bake-off:** render the Prologue in the three best candidates. I pick
  by ear at GATE 1.
- Credits say: "Narration: synthetic voice."

**Checks you can run without ears**

You cannot hear. Never tell me it sounds good. Run these and report:

- Speech-to-text round trip: transcribe every clip locally and compare
  with `say`. Any wrong name, date or word: fix the lexicon or the
  wording and render again.
- Words per minute per clip against its `pace` (8.11). Flag outliers.
- Loudness, clipping, head and tail silence on every clip.
- **`/play/admin/voice`**: a review page that plays a whole chapter in
  order with the real pauses, and lists every line with its own play
  button, pace and pause. I listen there and mark lines to redo.

---

## 6. Order of work and gates

**Phase 0**: inspect the repo (5.1), audit the palace (4.1), check the
story (4.2). Report all three. Ask me for the palace project folder path.

**Phase 1, vertical slice**: the Prologue and Chapter 1 of section 8,
complete, on a phone: the viewpoints it needs, its evidence, its choice,
its restoration, its answer and one chapter card.
The slice includes narration: the Prologue in three candidate voices,
Chapter 1 in the best one, the names reel and the voice review page.
**GATE 1: stop and show me**, with `STORY_CHECK.md`. I judge four
things: does it look like our renders, is the restoration satisfying, do
I want to know what happens in Chapter 2, and which voice I can listen
to for fifteen minutes.

**Phase 2**: all five chapters, the ending, the proof toggle, the year
vote, the final card, lenses.

**Phase 3**: backend, leaderboards, daily mode, vote, email unlock,
creator links, analytics, admin page, content engine.

**Phase 4, prove the format without a second site**: run the exporter on
a tiny throwaway test scene (a few boxes, two viewpoints, one
restoration) with a three-beat test story, and load it with **zero engine
changes**. It never ships. If the engine needs a change, the format is
wrong: fix the format.
**GATE 2: stop and show me** the full palace level, the daily puzzle, the
vote and the locked cards on a phone.

**Phase 5**: polish, the quality bar, legal pages, launch checklist.
**GATE 3: stop.** I launch it myself.

Outside the gates, do not stop to ask. Make the labelled best choice,
write it in `docs/play/DECISIONS.md`, and keep going. If I do not answer a
gate, write WAITING in `docs/play/STATUS.md` and stop. Never loop.

---

## 7. Done when

- `/play` live on a preview URL with the Summer Palace level (five
  chapters, ending, proof toggle, year vote, final card), daily mode,
  vote, locked cards, share cards, leaderboards and email unlock.
- Every line of story has a fact id. Every fact is `verified` with a
  source and a tier. `STORY_CHECK.md` lists every change made to
  section 8 and why.
- A test player who has never seen the palace can, after one play, answer
  the eight questions in 8.10 without looking. Run it with the built-in
  quiz in the debug view and report the result honestly.
- Every spoken line of the default lens has a clip, a pace and a pause
  that follow 8.11. The round-trip check passes on every clip. The voice
  can be replaced with one command and no timing changes.
- A new site is added by running the exporter and adding a story file.
  No code change. Proven with the throwaway test pack.
- Panoramas on a phone match the Blender renders.
- The quality bar in 5.7 is met, with a Lighthouse mobile report.
- `docs/play/PLAY.md` explains how to add a site, write a story file, run
  the daily generator, read the dashboard and switch features on and off.
- A list of every `[SAMBIT: ...]` placeholder and every file I must
  supply.

---

## 8. THE STORY: Tipu Sultan's Summer Palace

### 8.1 Title, question, shape

**Title: Envy of Heaven.** `[SAMBIT: confirm]`
The palace's own inscription gives it that name. We lead with the
building's name for itself.

**Logline:** A palace called itself the Envy of Heaven. It was a working
palace for about eight years. Find out what it was, what happened to it,
and put it back, using only what you can prove.

**The question the player carries:** What did this building look like on
the day it earned its name, and where did that go?

**Shape:** a cold case. Five chapters, five witnesses, in the order
things happened. Each witness is real. Each one is partly right. The
player learns the history and, underneath it, how history is known.

| Ch | Title | Years | Witness | Where |
|---|---|---|---|---|
| 0 | Nice. Old. | today | you | forecourt |
| 1 | Ten Years | 1781 to 1791 | the building and its inscription | ground colonnade, stair |
| 2 | The Year It Was Finished | 1791 to 1792 | James Hunter, soldier and artist | the fronts |
| 3 | A Machine for Being Seen | 1792 to 1799 | Francis Buchanan, surveyor | upper hall, balconies, court |
| 4 | The Office | 1831 to 1868 | the Commission's records | ground floor rooms |
| 5 | What Nobody Wrote Down | 1868 to today | nobody | upper hall, the ceiling |

The script below is the default (Traveller) wording. Each line shows its
fact id from 8.9. Write the other three lenses from the same facts.

### 8.2 Prologue: Nice. Old.

NOW state. Forecourt.

- This is Tipu Sultan's Summer Palace, in Bangalore. (F01)
- Most visitors photograph the front, call it nice and old, and leave.
  `[SAMBIT: your gate observation. Keep or cut.]`
- Here is what the front does not tell you.
- It took ten years to build. (F01)
- It was a working palace for about eight. (F01, F10)
- A line of writing on its wall calls it the Abode of Happiness and the
  Envy of Heaven. (F06)
- Look around. Bare wood. Faded walls. (F17, F18)
- So what was there to envy?
- That is the case. You are going to put this building back. You may
  only use what you can prove.

Lens choice appears here. Then straight into Chapter 1.

### 8.3 Chapter 1: Ten Years (1781 to 1791)

NOW state. Ground colonnade, then the stair.

Cold open:
- Work began here in 1781, under Hyder Ali. It finished in 1791, under
  his son Tipu Sultan. (F01)
- The site was inside Bangalore Fort. (F01, F02)
- The temple next door was already about ninety years old. (F03)

Question: **What is this palace made of?** Every guidebook says teak. The
first man to describe it in print said mud.

Evidence to find:
- The pillars, arches, beams and ceilings: wood. (F04)
- The pillar bases and the foundation: stone. (F04)
- The walls: clay. (F04)
- Francis Buchanan, 1800: the palace is "composed of mud". (F05)
- The inscription by the stair. It opens with the laying of the
  foundation and names the building. Its date is written in a number
  system Tipu Sultan devised himself. (F06)

Choice: **Who is right?**
- A. Teak. Buchanan was careless.
- B. Mud. The teak is later repair.
- C. Both.

Accepted: C. Shown after the pick:
- Stone below. Clay in the walls. Wood for everything that holds the
  building up and everything you look at. (F04)
- Buchanan looked at walls. You are looking at pillars.
- Two honest witnesses can describe two different buildings. Keep that
  in mind. You will need it.

Restore: slot S1 (see 8.8).

Answer: Stone, clay and teak, ten years in the making, inside a fort,
beside an older temple. (F01, F03, F04)

You now know: This palace took from 1781 to 1791 to build, and it named
itself the Envy of Heaven. (F01, F06)

Hook: It was finished in 1791. In 1791 something else happened to the
fort around it.

### 8.4 Chapter 2: The Year It Was Finished (1791 to 1792)

NOW state. The north and west fronts.

Cold open:
- On 21 March 1791 an East India Company army under Cornwallis broke
  through the fort wall near the Delhi Gate and took Bangalore. (F07)
- The palace was completed that same year. We have not found a record
  that says which came first. (F01, U2)
- One of the soldiers was an artillery lieutenant named James Hunter. He
  could draw. (F08)
- In February 1792 he sketched this palace: its entrance, its square,
  its north front, its west front. (F08)
- He died that year, in India. (F08)
- His views were printed in London in 1804. (F08)

Question: **These are the oldest pictures of this building that we have.
How much weight can they carry?**

Evidence to find:
- Hunter's print of the north front. (F08)
- Hunter's print of the west front. (F08)
- Hunter's print of the square and entrance. (F08)
- The title page: published in London, 1804, twelve years after he
  died. Aquatints, tinted by hand. (F08)
- The same front today. (photo, ours)

Choice: **How do you use the prints?**
- A. Copy their colours exactly.
- B. Trust them for what stood where. Treat their colour as a lead, and
  check it against paint that survives on the building.
- C. Ignore them. He was with the army that took the place.

Accepted: B. Shown after the pick:
- If A: He drew it on the spot. But the plates were cut and coloured in
  London, twelve years later. The shapes are his. We cannot say the same
  of every colour.
- If C: A hostile witness is still a witness. He had no reason to lie
  about a doorway.
- If B: That is how we did it. Shape from Hunter. Colour from Hunter
  only where the building agrees.

Restore: slot S2. Everything restored here carries the chip **Our
reconstruction**, and the narrator says so:
- This part is our reconstruction. It is the best reading of the
  evidence. It is not a photograph.

Closing lines:
- In 1792 peace was signed, and Bangalore went back to Tipu Sultan. (F09)

You now know: The fort fell on 21 March 1791. The oldest pictures of the
palace were drawn the next February, by a soldier who did not live to see
them printed. (F07, F08)

Hook: So he had his palace back. What did a day in it look like?

### 8.5 Chapter 3: A Machine for Being Seen (1792 to 1799)

THEN state shows through wherever restorations are done. Start in the
open court on the ground, looking up. Then the upper hall and balcony.

Cold open:
- Tipu Sultan was killed at Srirangapatna in 1799. (F10)
- The next summer a Scottish doctor named Francis Buchanan, sent to
  survey Mysore, was in Bangalore from 22 June to 2 July 1800. (F11)
- He walked through this palace and wrote down how it had worked.
- It is the best description we have of the court. It was written by a
  stranger, a year after the court ended. (F12)

Question: **How did this building work when it was full?**

Evidence to find (Buchanan's account, one piece at each spot):
- Upstairs, four halls. Each has two balconies of state. (F12)
- Each balcony faces a different court for giving audience. (F12)
- With the ruler in the hall: only a few trusted guards. (F12)
- At each end of the court, balconies for the officers of highest
  rank. (F12)
- Lower officers stood in the hall beneath the ruler's balcony. (F12)
- The people stood in the open court. It had fountains. (F12)

Then the narrator puts it together:
- Read that as a diagram. Height is rank.
- One man at the top, almost alone. The court arranged beneath him by
  importance. The public in the open, by the fountains, looking up.
- You have now stood in both places. Most people who came here only
  ever stood in one. (F12)

Then the second half of Buchanan:
- The public rooms, he wrote, were "neatly painted and ornamented with
  false gilding". (F13)
- The private rooms, where people lived, he called "small, mean and
  inconvenient". (F13)

Choice: **It glittered. With what?**
- A. Gold leaf.
- B. False gilding.
- C. Plain paint. The gold is a later story.

Accepted: B. Shown after the pick:
- The shine was made to be seen from the court below. Up close it was
  not gold. Buchanan was close. (F13)
- All the money and all the skill went into the rooms where the ruler
  was looked at. The rooms where he slept were an afterthought. (F13)

Restore: slot S3.

You now know: The court ran on height. The gold was not gold. And the
best account of both was written in 1800, when the court was gone. (F12,
F13)

Hook: A solid building, with no court in it. Buildings like that get
given a job.

Rule for this chapter: describe how the court was arranged. Do not judge
the ruler, praise him or accuse him. No throne story, no tiger.

### 8.6 Chapter 4: The Office (1831 to 1868)

NOW state. Ground floor rooms.

Cold open:
- In October 1831 the British took over the running of Mysore and moved
  the government's offices from Mysore to Bangalore. (F14)
- They put them here. (F14)
- Ten departments, in a building designed for one man to be looked
  at. (F14)
- The Commissioner's office. The court. The treasury. The police. The
  post. The sandalwood department. (F14)
- They stayed almost thirty-seven years. (F14, F15)

Question: **What do thirty-seven years of clerks do to a palace?**

Play: **Order the record.** Six dated cards. The player drags them into
order. Each one snaps in with its line.
1. 1781. Work begins. (F01)
2. 21 March 1791. The fort falls. (F07)
3. February 1792. Hunter sketches the palace. (F08)
4. Summer 1800. Buchanan describes it. (F11)
5. October 1831. The offices move in. (F14)
6. April 1868. The offices move out. (F15)

After card 6:
- By the 1860s the offices had outgrown the building. (F15)
- There were fears it might collapse. The Commissioner, Lewin Bowring,
  worried about the treasury kept inside. (F15)
- A new building went up across town. In April 1868 the clerks left. It
  is called Attara Kacheri, the eighteen offices. Today it is the High
  Court. (F15)
- The palace was handed to the town's municipality. (F15)

Then the turn:
- Now look at what happened to the fort.
- After 1791 it had no job. It was taken apart for roads, schools and
  hospitals. That went on into the 1930s. One gate and two bastions are
  left. (F16)
- The palace had clerks in it. It is still here. (F14)
- We think the clerks are a good part of the reason. That is our
  reading, not a record. (tier: our reading)

A gap, shown as a blank card between 1800 and 1831:
- What was this building between 1799 and 1831? We have not found a
  record that says. (U3) `[SAMBIT: your files may. If so, fill it.]`

No restoration in this chapter unless the audit finds one that fits.

You now know: From 1831 to 1868 this was the government's office. The
people who filled it with paperwork are probably why you can still stand
in it. (F14, F15)

Hook: The clerks saved the walls. Now look up.

### 8.7 Chapter 5: What Nobody Wrote Down (1868 to today)

NOW state. Upper hall. Camera tilts to the ceiling.

Cold open:
- In 1800 Buchanan saw painted rooms. (F13)
- You are looking at bare wood and faded walls. (F17, F18)
- Somewhere between those two, almost all of it went. (F17)
- Nobody recorded when. It was lost across repeated rounds of repair and
  restoration. We do not have a date. We will not make one up. (F17, U1)

Question: **How do you put back something nobody recorded?**

Evidence to find:
- Traces of painted flowers on a wall. (F18)
- Traces in a ceiling panel. (F18)
- Traces in a niche. (F18)
- Buchanan again: painted, with false gilding. (F13)
- A panel with nothing left on it at all.

Choice: **The empty panel. What do you do?**
- A. Continue the pattern that survives on its matching panels, and mark
  it as our reconstruction.
- B. Leave it plain.
- C. Design something that suits the period.

Accepted: A and B. Rejected: C. Shown after the pick:
- If C: It would look the best. It would also be fiction. A rebuilt
  ceiling does not look uncertain. It looks like the answer. So it has to
  come from the building, not from taste.
- If A: Good. Where the same panel survives elsewhere in the palace, we
  repeat it and label it.
- If B: Good. Where nothing survives, plain is the honest answer, even
  though plain looks unfinished.
The pick is recorded on the player's card. The restored ceiling follows
what our model actually does. `[SAMBIT: confirm which of A or B our
palace model uses for empty panels, so the line matches.]`

Restore: slot S5, the last piece. Then the full reveal: every viewpoint
crossfades from NOW to THEN.

Reveal lines:
- This is the building that called itself the Envy of Heaven. (F06)
- It looked like this for about eight years. (F01, F10)

Proof toggle:
- Now press this. "Show only what the record proves."
- That is the gap between what we know and what we believe. You should
  always be able to see it.

Year vote: **Which year would you put back?**
- 1791. The palace, complete.
- 1800. As Buchanan found it, with the court gone.
- 1868. The office.
- Today. Leave it as it is.
Then the live percentages. No answer is marked right.

Last line:
- It was a palace for about eight years and an office for almost
  thirty-seven. It has been bare for longer than either. Now you know
  what was under the wood.

### 8.8 Restoration slots

The audit decides what is actually modelled. Attach each audited lost
element to the chapter whose theme and witness it belongs to. Suggested:

| Slot | Chapter | Theme | Likely elements (confirm in audit) |
|---|---|---|---|
| S1 | 1 | structure | the stair, the two-storey hall and galleries |
| S2 | 2 | the outside | the colour of the front, the square and entrance |
| S3 | 3 | the court | painted and gilded public rooms, the open court and fountains |
| S5 | 5 | the paint | the ceiling flowers (always the last piece) |

Two restorations at most per chapter. The ceiling is always last.

### 8.9 Fact table

Status `verified` here means I found the claim in the named source this
week. `check` means it must be confirmed in the primary text or in the
palace's own files before it ships. Tier is how the game labels it.

| Id | Claim | Source | Tier | Status |
|---|---|---|---|---|
| F01 | Begun 1781 under Hyder Ali inside Bangalore Fort, completed 1791 under Tipu Sultan | Wikipedia; our canonical line | record | verified |
| F02 | Fort: mud, 1537, Kempe Gowda I. Stone, 1761, Hyder Ali | Wikipedia (its infobox says 1751); our canonical line says 1761 | record | check the year |
| F03 | Kote Venkataramana temple adjoins the palace, built 1689 under Chikka Devaraja Wadiyar | one travel blog only | record | check |
| F04 | Stone foundation and pillar bases, clay walls, wood pillars, arches, beams and ceilings | Deccan Herald, 2010 | record | check against palace files |
| F05 | Buchanan: the palace is "composed of mud" | Buchanan, A Journey from Madras, 1807, vol. 1, quoted second-hand | record | check the 1807 text |
| F06 | Inscription names it Abode of Happiness and Envy of Heaven; near the left stair; opens with the laying of the foundation; date in Tipu's own numeral system | Deccan Herald; Wikipedia citing Rice, Epigraphia Carnatica IX, and Mysore Gazetteer 1897 | record | check Rice's full text |
| F07 | 21 March 1791: Cornwallis's army breaches the wall near the Delhi Gate and takes the fort | Wikipedia; our canonical line | record | verified |
| F08 | James Hunter, artillery lieutenant; sketched the entrance, square, north front and west front; one dated Feb 1792; died 1792 in India; published by Edward Orme, London, 1804, as tinted aquatints | Wikipedia; DAG | record | verified. One citation is dated 1794: resolve |
| F09 | 1792: peace signed, Bangalore returned to Tipu Sultan | not found in this pass | record | check. Cut the line if unconfirmed |
| F10 | Tipu Sultan killed at Srirangapatna, 1799 | Wikipedia | record | verified |
| F11 | Buchanan in Bangalore 22 June to 2 July 1800 | secondary (blog on Buchanan) | record | check the 1807 text |
| F12 | Buchanan's account of the court: four halls, two balconies of state each, each facing a different court; a few trusted guards with the ruler; highest officers on end balconies; lower officers beneath; the people in an open court with fountains | Buchanan 1807, quoted second-hand | record | check the 1807 text |
| F13 | Buchanan: public rooms "neatly painted and ornamented with false gilding"; private apartments "small, mean and inconvenient" | Buchanan 1807, quoted second-hand | record | check the 1807 text |
| F14 | October 1831: offices move from Mysore into the palace; ten of eighteen departments, including Commissioner's office, court, treasury, police, post, sandalwood | Wikipedia (Attara Kacheri); bengaluru.com | record | verified |
| F15 | Offices outgrew it; fears of collapse; Bowring's worry for the treasury; move to Attara Kacheri in April 1868; palace handed to the municipality; Attara Kacheri means eighteen offices and is now the High Court | Wikipedia (Attara Kacheri) | record | verified |
| F16 | Fort dismantled from after 1791 into the 1930s for roads, schools, hospitals; Delhi Gate and two bastions remain | Wikipedia | record | verified |
| F17 | Painted floral interiors nearly all lost across restoration cycles; no date known | our canonical line | record | confirm source in palace files |
| F18 | Faded floral painting survives on walls, ceilings and niches | Deccan Herald; Wikipedia | record | verified |
| U1 | When the paint was lost | | not known | |
| U2 | Whether the palace was finished before or after the fort fell in 1791 | | not known | |
| U3 | What the building was used for between 1799 and 1831 | | not known | check palace files |
| U4 | The colours of anything Hunter did not draw and the building did not keep | | not known | |

Never use: the throne legend, Tipu's Tiger, "copper gilding", carpets
and lamps, any pillar count except the hedge in our narration rules, any
claim about the ruler's character, casualty numbers.

### 8.10 The card and the test

**"What you now know"** (the final card, and the eight test questions
come from it):

1. Begun in 1781 under Hyder Ali. Finished in 1791 under Tipu Sultan.
2. It stands inside what was Bangalore Fort. One gate and two bastions
   of that fort are left.
3. Stone at the base, clay in the walls, teak for nearly everything you
   see.
4. Its own inscription calls it the Abode of Happiness and the Envy of
   Heaven.
5. The fort fell on 21 March 1791, the year the palace was completed.
6. The oldest pictures of it were drawn in February 1792 by James
   Hunter, a soldier in the army that took the fort. He died that year.
   They were printed in 1804.
7. The court ran on height: the ruler on an upper balcony, officers by
   rank, the public in the open court by the fountains.
8. The gold was false gilding. The private rooms were small.
9. The best description of the palace was written in 1800, a year after
   its court ended.
10. From October 1831 to April 1868 it was the government's offices.
    They left partly from fear it would collapse.
11. The fort around it was taken apart. The palace, full of clerks, was
    not.
12. Nearly all its painted decoration is gone, and nobody recorded when.

**What nobody knows:** U1 to U4, in plain words.

**Your choices:** the player's picks from chapters 1, 2, 3 and 5, and
their year vote.

**Share line:** "I rebuilt the Envy of Heaven from its evidence. Five
chapters. Twelve things I did not know." `[SAMBIT: confirm]`

**The test (section 7):** eight multiple-choice questions drawn from
items 1, 3, 4, 5, 6, 8, 10 and 12. Debug view only, never shown to
players.

### 8.11 How it is spoken

This is the direction for the narrator. Apply it to every line, then
apply the marked moments exactly.

**Pauses** (silence after a line, set as `pause_after_ms`):

| Name | Length | Use |
|---|---|---|
| breath | 250 ms | between two lines of the same thought |
| beat | 600 ms | a new thought |
| hold | 1,100 ms | after a date or name that matters, and either side of a turn |
| silence | 1,800 to 2,500 ms | after the chapter's question, after a reveal line |

**Pace** (set as `pace`):

| Name | About | Use |
|---|---|---|
| steady | 150 words a minute | the default |
| slow | 125 words a minute | questions, turns, reveal lines, the last line of a chapter |
| brisk | 170 words a minute | lists only |

**Ten rules**

1. **Never talk over a reveal.** While the building crossfades, the
   voice is silent. It comes in after the picture has settled.
2. **A question is followed by silence.** The player has to feel asked.
3. **Slow down on a date, then pause.** A date said at full speed is not
   heard.
4. **Lists are brisk, then stop.** Each item is its own clip with a 200
   ms gap. Then a hold. Then the line that gives the list its meaning.
5. **Every chapter has one turn line. It stands alone.** Slow, with a
   hold before and after.
6. **A witness's words get a gap before and after**, so they are heard
   as someone else's. Same voice, no accent, no acting.
7. **The voice never reads the options.** It reads the question, waits,
   and after the pick it reads the explanation.
8. **The voice never reads the interface.** No "tap to continue".
9. **The key word goes last in the sentence.** If a line buries it,
   reshape `say` so it lands at the end.
10. **Short lines are not rushed.** "He could draw." takes a full beat
    either side.

**Marked moments**

Prologue
- "Here is what the front does not tell you." slow, then hold.
- "It took ten years to build." beat. "It was a working palace for
  about eight." hold.
- The name: slow through "the Abode of Happiness and the Envy of
  Heaven", then hold.
- "Look around." beat. "Bare wood." breath. "Faded walls." hold.
- "So what was there to envy?" slow, then 2,000 ms of silence.
- "You may only use what you can prove." slow. Then silence until the
  lens choice appears.

Chapter 1
- "Every guidebook says teak." beat. "The first man to describe it in
  print said something else." breath. "He said mud." hold.
- "Buchanan looked at walls." breath. "You are looking at pillars."
  hold. This is the turn.
- "Keep that in mind. You will need it." slow.

Chapter 2
- The date of the siege: slow, then hold. One line, no colour, no drama.
- "He could draw." alone, a beat either side.
- "He died that year, in India." slow, then hold. This is the turn.
- "His views were printed in London in eighteen oh four." beat.
- "A hostile witness is still a witness." slow, beat. "He had no reason
  to lie about a doorway."
- "It is not a photograph." hold.

Chapter 3
- Buchanan's six observations: steady, each one landing as the player
  finds it. Never played back to back.
- "Read that as a diagram." beat. "Height is rank." slow, alone, hold.
  This is the turn.
- "Most people who came here only ever stood in one." slow, then hold.
- Both quotes: a breath before, a beat after.
- "Up close it was not gold." beat. "Buchanan was close." hold.

Chapter 4
- The six departments: brisk, 200 ms apart. Hold. Then "They stayed
  almost thirty seven years." slow.
- Each dated card speaks only when it snaps into place.
- "The palace had clerks in it." beat. "It is still here." slow, then
  1,800 ms of silence. This is the turn.
- "That is our reading, not a record." steady and plain. Do not sell it.

Chapter 5
- "Nobody recorded when." slow, then hold.
- "We do not have a date." beat. "We will not make one up." slow, hold.
- **The reveal.** Silence through the whole crossfade. Then 1,500 ms
  more. Then: "This is the building that called itself the Envy of
  Heaven." slow. 2,000 ms of silence. "It looked like this for about
  eight years." slow. 2,500 ms of silence.
- The proof toggle line waits until the player has pressed it.
- The last line, in three clips: "It was a palace for about eight years
  and an office for almost thirty seven." beat. "It has been bare for
  longer than either." hold. "Now you know what was under the wood."
  slow. Then three full seconds of nothing before the card appears.

**Ambience.** One quiet bed per viewpoint, CC0 only, or none. It drops
under the voice and comes back in the silences. No music under
narration. One low swell is allowed, once, on the final reveal.
