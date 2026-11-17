# The eight-question test (brief section 7)

Date: 2026-11-17. Pack: Summer Palace v1. Lens: Traveller. Sound off.

## Who took it

An AI model (Claude) standing in for a first-time human player. It was given no access to the repository, the research files or the web, and was told not to use its own memory of the subject. It played the whole level once through a phone-size browser (375x812) by reading the screen and pressing the buttons a player would press, wrote down every visible line, read that transcript once, and then answered the eight questions from memory. Transcript: `docs/play/test/first-play-transcript.txt`.

**This is not a human test.** A real first-time player should still take it before launch. See LAUNCH.md.

## Result: 8 of 8

| # | Question (from card item) | Answer given | Mark |
|---|---|---|---|
| 1 | Begun and finished, under whom (item 1) | 1781, Hyder Ali's time; 1791, Tipu Sultan; the board says the 1770s | Right |
| 2 | Materials and where (item 3) | Stone for bases and platform; mud for outer walls; teak for pillars, arches, beams, ceilings | Right |
| 3 | The inscription's two names (item 4) | Abode of Happiness, Envy of Heaven | Right |
| 4 | The date the fort fell (item 5) | 21 March 1791 | Right |
| 5 | The oldest dated pictures (item 6) | James Hunter, February 1792, died that year, printed 1804 | Right |
| 6 | The gold and the private rooms (item 8) | False gilding; "small, mean, and inconvenient" | Right |
| 7 | The offices and why they left (item 10) | 1831 to April 1868; fears it would collapse | Right |
| 8 | The painted decoration (item 12) | Nearly all gone, nobody recorded when; painted in 1800, whitewash by 1873 | Right |

## How much this proves

Less than the score suggests:

- The final "What you now know" card states all eight answers almost word for word, and the test came straight after it. This measures recall of the last card more than learning across the level.
- A language model has near-verbatim short-term recall. A person would not.
- A fair human test would be taken a few minutes after the card, or the next day.

## What the test player found, and what was done

| Finding | Done |
|---|---|
| The painted-ceiling restore was nearly impossible: the panel was edge-on through most of its turn | Fixed: the piece now turns in the screen plane, like the pillar |
| Some source lines showed file names and fact ids ("palace-dimensions.json", "Our reading of F12 and F13") | Fixed: 15 sources rewritten for readers; the originals are kept as `source_internal`, which the game does not show |
| A doubled full stop when the order cards are read as one line | Engine, fixed in the Phase 5 engine pass |
| "Go to" in the evidence list moves you but does not open the card; "Nothing more to find from here" shows while the count is still 0 | Engine, fixed in the Phase 5 engine pass |
| On a phone the "Corner room" marker sits on top of the restore instructions | Engine, fixed in the Phase 5 engine pass |
| Lines that reveal phrase by phrase need two taps (one to finish, one to move on), which was unclear at first | Left as designed (brief 5.3: a tap skips to the end of the line); noted for the owner |
