# Story check: Envy of Heaven

Date: 2026-11-16. Every fact in section 8.9 of the brief, checked first against the palace's own files, then against the primary texts.

Rules applied: palace files win; narration hedges kept word for word; a line is corrected to what the source supports or it is cut; nothing is rewritten for style.

**How the primary texts were read.** From the archive.org OCR text, not the page images. Buchanan was checked on two scans. Everything else rests on one scan. A fact marked "page image to check" stays `check` in `story.json` until someone looks at the page.

Sources, short names used below:
- **Buchanan 1807**: Francis Buchanan, A Journey from Madras, vol. 1, pp. 44 to 46. archive.org/details/journeyfrommadra01hami
- **EC IX**: B. Lewis Rice, Epigraphia Carnatica vol. IX (preface dated 1905), inscription Bn 7 and introduction p. 27. archive.org/details/epigraphiacarnat09myso
- **Rice 1897**: Mysore Gazetteer, revised edition, vols. I and II. archive.org/details/mysoreagazettee02ricegoog
- **Sankey 1873**: R. H. Sankey, "Offices of the Mysore Government at Bangalore", Professional Papers on Indian Engineering, 2nd series, vol. II, no. LXIII. archive.org/details/professionalpap00regoog
- **Bowring 1871**: Lewin Bowring, Eastern Experiences, p. 13. archive.org/details/easternexperienc00bowr
- **Home 1794**: Robert Home, Select Views in Mysore. archive.org
- **Hunter 1805**: Picturesque Scenery in the Kingdom of Mysore, Edward Orme, title page. archive.org/details/dli.calcutta.09945
- **Palace files**: `E:\heritage_assets\tipu-summer-palace-bengaluru\research\`, the fort project's `evidence.md`, and the app's narration (backend migrations 079, 088, 105, 111).

## 1. The five things you need to know first

1. **The construction dates are disputed in your own files.** `palace-dimensions.json` tiers them DISPUTED: the ASI board says 1778 to 1789, most other sources say 1781 to 1791, and the file's rule is "Do not average, do not silently pick. Narrate the disagreement." Rice explains why: his 1897 Gazetteer read the inscription as 1778 and 1789, and his 1905 edition of the inscription corrected that to 1781 and 1791. The story keeps 1781 to 1791, says it comes from the inscription, and says what the board says.
2. **Most of the palace Buchanan described is gone.** Sankey, the engineer who built the new offices, wrote in 1873 that the main block "has now been cleared away" and that "an adjoining block which housed the Treasury ... still stands". Rice 1897: "The palace having partly fallen in the greater part was demolished." This is why Buchanan's four halls do not fit the building you can visit. It changes Chapter 3 and breaks the turn of Chapter 4 ("The palace had clerks in it. It is still here.").
3. **Buchanan described the palace on 10 May 1800**, not in the June stay. "Summer 1800" becomes "May 1800" everywhere.
4. **He was not the first to describe it in print.** Robert Home published a description in 1794. That line in Chapter 1 is corrected.
5. **Chapter 1 has no restoration.** Nothing structural is lost, so slot S1 is empty and the chapter is evidence only, as the brief instructs.

## 2. Fact table

| Id | Verdict | What the sources say | Status now |
|---|---|---|---|
| F01 | **Corrected.** Palace files disagree | Dates disputed in the palace files (above). EC IX p. 27: "The palace was apparently begun in 1781, in the time of Haidar Ali, and completed ten years after, in 1791, under Tipu Sultan." The inscription names neither ruler; that is Rice's inference. The 1791 date marks the finishing of the painting. Inside the fort: confirmed (Mackenzie's survey, March 1791, key 14). Hedge kept from the app narration: "The board at the entrance carries the work back to the seventeen seventies; the palace was finished and named in seventeen ninety one." | verified, as "by its inscription" |
| F01b | **New, split out.** "A working palace for about eight years" | No file or text says this. Finished 1791 (F01) and its builder killed 1799 (F10) are both sourced; the fort was in British hands from March 1791 into 1792. Reworded to "a finished palace for about eight years" | verified as arithmetic on F01 and F10 |
| F02 | Confirmed, with hedges | Rice 1897 II p. 46: the mud fort "is said to have been erected in 1537 by Kempe Gauda"; rebuilt of stone, "attributed to a Khiledar named Ibrahim Sahib ... in 1761, the first year of Haidar Ali's reign". 1751 appears in no source. The story only uses "inside Bangalore Fort" | verified |
| F03 | **Corrected** | The year 1689 is not in the inscription or in Rice. The palace files tier it "inferred (weak), ASI board only". EC IX, Bn 118 and p. 27: the temple "was erected by ... Chikka-Deva-Raja ... It immediately adjoins Tipu Sultan's palace on the north-east." "About ninety years old" is cut | verified, without a year |
| F04 | **Corrected** | "Clay" becomes "mud": palace files (ASI board) "the outer walls alone being of mud"; Buchanan "composed of mud"; Rice "though the walls were of mud". Teak pillars and stone pillar bases: confirmed in `palace-dimensions.json`. Home 1794: "the wooden roof ... supported by colonnades of the same material". No primary text says teak; it stands on the palace files | verified |
| F05 | Confirmed in the 1807 text, **one line corrected** | "Although this is composed of mud, it is not without some degree of magnificence." (p. 45). But Buchanan also described the columns, so "Buchanan looked at walls" is not supported | verified |
| F06 | **Corrected** | EC IX Bn 7, "On a stone in the old palace in Bangalore fort". It opens "As soon as the foundation of this palace was laid". Its two dates are chronogram phrases: "A house of happiness", 1196 (1781), and "Doubtless it is envied by heaven", 1206 (1791). Rice 1897 gives them as "Abode of happiness" and "Envy of heaven". The first is computed "according to Zar ... a system invented by Tipu Sultan". **Not supported:** that it is by the left stair (a newspaper only; Bowring says "let into the wall"). The palace files do not mention the inscription at all; they give the name as Rashk-e-Jannat | verified, without the stair |
| F07 | Confirmed, **one word corrected** | Wilks III pp. 127 to 129; the tablet on the wall; palace fort file. The breach was "in the curtain, to the left of the projecting works of the gateway". The town had fallen on 7 March, so "took Bangalore" becomes "took the fort" | verified |
| F08 | Confirmed, details sharpened | Title page: "James Hunter, Lieutenant in the Royal Artillery". British Library WD2893: "The Entrance of Tippoo's Palace, Bangalore Feby. 92". Yale B1974.12.1168: "N. Front of the Palace Bangalore ... Feby. 92". Plates: North Front, West Front, The Square and Entrance. Died 19 May 1792, Vellore (tomb inscription). Plates dated 1804, published by Edward Orme, London; title page 1805. Hand-coloured aquatints. **The 1794 citation is an error** on Wikipedia: the only 1794 work is Robert Home's. Do not name one engraver; catalogues differ by plate | verified |
| F09 | **Cut, pending your ruling** | Your files put "what happened to Bangalore after March 1791" on the do-not-say list. Rice 1897 II p. 47 does say it: "When the Fort was restored to Tipu at the peace of 1792, he dismantled it". The treaty itself (18 March 1792) does not name Bangalore. Palace files win, so the line is cut. Say the word and it goes back in with Rice as its source | cut |
| F10 | Confirmed | 4 May 1799. Rice 1897 I pp. 414 to 415; app `people.ts` | verified |
| F11 | **Corrected** | The palace account is under "May 10th" 1800 (vol. 1 p. 44). The 22 June to 2 July stay is real (p. 193) but does not describe the palace | verified, as 10 May 1800 |
| F12 | Confirmed in the 1807 text, **framing corrected** | All six parts are in Buchanan, word for word (section 4). But he describes a larger complex than stands today (item 2 above), so the game cannot place each observation "at its spot" or say the player has "stood in both places" | verified |
| F13 | Confirmed, punctuation fixed | "At each end of the halls are private apartments, small, mean, and inconvenient. The public rooms are neatly painted, and ornamented with false gilding." | verified |
| F14 | **Corrected.** Palace files silent | Takeover: Rice 1897 I p. 429, 19 October 1831. Offices: Rice II p. 47, "From 1831 the principal departments of the Administration were accommodated in the palace". **Not found in any text opened:** "ten of eighteen departments", the list of six departments, and "moved from Mysore to Bangalore" (all trace to Wikipedia citing Hasan 1970, not opened). Thirty-seven years: Bowring p. 13, Sankey p. 1 | verified, without the count, the list or the move |
| F15 | **Corrected** | Fears of collapse: Sankey, "the fears of sudden collapse". Occupied "by April 1868": Sankey. **Not found:** Bowring's worry about the treasury (his own book does not say it; the first project dates from 1857, before him). "Handed to the municipality" is not what the record says: Rice 1897 has the remains used "for the Forest, Police and Excise offices". "Attara Kacheri, the eighteen offices, now the High Court" is secondary only; Rice and Sankey call it the Public Offices | verified in part; the Attara Kacheri line is `check` |
| F16 | **Corrected.** Palace files disagree | The fort did not sit idle after 1791. Tipu himself dismantled it after the 1792 peace (Buchanan p. 44; Rice). Purnaiya rebuilt it after 1799. From the 1860s a straight entrance was cut beside the Delhi Gate and roads driven through the walls (Rice 1897 II p. 46 note). "Into the 1930s" is tiered inferred in your fort file. "Two bastions" is tiered disputed. Hedge kept from the app narration: "A gateway and a short run of wall are what survive." | verified, rewritten |
| F17 | Confirmed, **one clause cut, one fact added** | Loss: app narration, "Almost all of it is gone. What is left are fragments, and they are faint." "Repeated rounds of repair and restoration" is in no file. There is one dated marker: Sankey 1873 writes of "the happy application of white-wash" on the surviving block | verified |
| F18 | Confirmed, **one word corrected** | Own photographs 37 (ceiling) and 41 (wall and niche). But the palace files describe the timber today as "dark polished timber" with gilding on the capitals, so "bare wood" overstates. "Bare wood" becomes "dark wood" | verified |
| F19 | **New.** Required by item 2 | Sankey 1873 pp. 1 to 2; Rice 1897 II p. 47 | check (page image to check) |
| F20 | **New.** Fills part of U3 | Buchanan p. 46: "The palace lately served the officers of a European regiment for quarters, while the privates were lodged in the corridor." | verified |
| U1 | Stays unknown, now bounded | Painted in May 1800 (Buchanan). Whitewash recorded by 1873 (Sankey). No date between | not known |
| U2 | Stays unknown | Mackenzie's survey of March 1791 already marks a "Durbar, or Palace". The inscription's second date marks the end of the painting. Nothing fixes the order | not known |
| U3 | Part filled by F20 | After 1800 and before 1831: no record of the palace itself found | not known |
| U4 | Confirmed as unknown | `palace-measurements.md`: "The specific painted composition of each individual room is UNRECORDED." | not known |

## 3. Every line changed, and why

### Prologue

| Old | New | Why |
|---|---|---|
| It took ten years to build. | By its own inscription, it took ten years to build. | F01: dates are disputed in the palace files |
| It was a working palace for about eight. | It was a finished palace for about eight. | F01b |
| Look around. Bare wood. Faded walls. | Look around. Dark wood. Faded walls. | F18 |

### Chapter 1

| Old | New | Why |
|---|---|---|
| Work began here in 1781, under Hyder Ali. It finished in 1791, under his son Tipu Sultan. | Its inscription gives two dates. 1781, in Hyder Ali's time. 1791, in the time of his son, Tipu Sultan. | F01 |
| (added, one line) | The board at the entrance carries the work back to the 1770s. | F01. Your files' rule: narrate the disagreement. Wording follows the app narration hedge |
| The temple next door was already about ninety years old. | The temple next door was already there. An earlier king of Mysore, Chikka Devaraja Wadiyar, had it built. | F03: no year is recorded |
| The first man to describe it in print said mud. | A surveyor who walked through it in 1800 said mud. | Home described it in print in 1794 |
| The walls: clay. | The walls: mud. | F04 |
| The inscription by the stair. It opens with the laying of the foundation and names the building. Its date is written in a number system Tipu Sultan devised himself. | The inscription, on a stone set into the wall. It opens with the laying of the foundation. Its two dates are hidden in two phrases. The first is worked out in a letter and number system Tipu Sultan devised himself. | F06: the stair is unsupported; the phrases are dates, and only the first is said to use Tipu's system |
| Stone below. Clay in the walls. Wood for everything ... | Stone below. Mud in the walls. Wood for everything ... | F04 |
| Buchanan looked at walls. You are looking at pillars. | The mud is in the walls. You are looking at pillars. | F05: he described the columns too |
| Answer: Stone, clay and teak, ten years in the making, inside a fort, beside an older temple. | Stone, mud and teak, ten years in the making by its own account, inside a fort, beside an older temple. | F01, F04 |
| You now know: This palace took from 1781 to 1791 to build, and it named itself the Envy of Heaven. | Its inscription dates this palace 1781 to 1791, and calls it the Envy of Heaven. | F01, F06 |
| Restore: slot S1 | (none) | No structural element is lost |

Unchanged: the question, the three options of the choice, "Two honest witnesses can describe two different buildings", the hook.

### Chapters 2 to 5 (Phase 2; proposed now so you can rule at GATE 1)

| Ch | Old | New | Why |
|---|---|---|---|
| 2 | ... broke through the fort wall near the Delhi Gate and took Bangalore. | ... and took the fort. | F07 |
| 2 | One of the soldiers was an artillery lieutenant named James Hunter. | One of the soldiers was a lieutenant in the Royal Artillery named James Hunter. | F08, title page wording |
| 2 | In 1792 peace was signed, and Bangalore went back to Tipu Sultan. | (cut) | F09 |
| 2 | Hook: So he had his palace back. What did a day in it look like? | What did a day in it look like, when it was full? | F09 |
| 2 | Evidence "Hunter's print of the north front" | "Hunter's watercolour of the north front, February 1792" | The item we hold and may show is the Yale watercolour. The 1804 plates of the palace are not on disk and not cleared |
| 3 | The next summer ... was in Bangalore from 22 June to 2 July 1800. | The next year ... reached Bangalore on 10 May 1800. | F11 |
| 3 | "one piece at each spot" | Buchanan's six observations appear as cards | F12, F19: most of what he saw is gone |
| 3 | (added) | What you are standing in is one part of what he walked through. The rest was pulled down after 1868. | F19, once the page image is checked |
| 3 | You have now stood in both places. Most people who came here only ever stood in one. | (cut, unless you want it rewritten) | F19: the open court is not there to stand in |
| 3 | "small, mean and inconvenient" | "small, mean, and inconvenient" | F13, exact text |
| 4 | In October 1831 the British took over the running of Mysore and moved the government's offices from Mysore to Bangalore. | In October 1831 the British took over the running of Mysore. | F14 |
| 4 | Ten departments, in a building designed for one man to be looked at. | The principal departments of a government, in a building designed for one man to be looked at. | F14 |
| 4 | The six-department list | (cut) | F14: secondary only |
| 4 | Card 4: Summer 1800 | May 1800 | F11 |
| 4 | There were fears it might collapse. The Commissioner, Lewin Bowring, worried about the treasury kept inside. | There were fears it would suddenly collapse. | F15 |
| 4 | It is called Attara Kacheri, the eighteen offices. Today it is the High Court. | (kept only if a primary source is found in Phase 2) | F15 |
| 4 | The palace was handed to the town's municipality. | The greater part of the palace was then pulled down. | F15, F19 |
| 4 | After 1791 it had no job. It was taken apart for roads, schools and hospitals. That went on into the 1930s. One gate and two bastions are left. | Tipu Sultan dismantled it himself after the peace of 1792. It was rebuilt after 1799. Then, from the 1860s, roads were cut through it. A gateway and a short run of wall are what survive. | F16 |
| 4 | The palace had clerks in it. It is still here. | The block that held the treasury is the part still standing. | F19. **This is the chapter's turn and it changes meaning. Yours to approve** |
| 4 | We think the clerks are a good part of the reason. That is our reading, not a record. | We think the offices kept this part in use long enough to be kept. That is our reading, not a record. | F19 |
| 4 | Gap card, 1799 to 1831 | In 1800 it had lately been quarters for the officers of a European regiment. After that, until 1831, we have not found a record. | F20, U3 |
| 5 | You are looking at bare wood and faded walls. | You are looking at dark wood and faded walls. | F18 |
| 5 | Nobody recorded when. It was lost across repeated rounds of repair and restoration. | Nobody recorded when. By 1873 an engineer was writing of whitewash on these walls. | F17 |
| 5 | It has been bare for longer than either. | It has been without its paint for longer than either. | F18 |

### The card (8.10)

1. By its own inscription: begun in 1781, in Hyder Ali's time; finished in 1791, under Tipu Sultan. The board at the entrance says the 1770s.
2. It stands inside what was Bangalore Fort. A gateway and a short run of wall are what survive.
3. Stone at the base, mud in the walls, teak for nearly everything you see.
4. Its own inscription calls it the Abode of Happiness and the Envy of Heaven.
5. The fort fell on 21 March 1791, the year the palace was completed.
6. The oldest pictures of it were drawn in February 1792 by James Hunter, a soldier in the army that took the fort. He died that year. They were printed in 1804.
7. The court ran on height: the ruler on an upper balcony, officers by rank, the public in the open court by the fountains.
8. The gold was false gilding. The private rooms were small.
9. The best description of the palace was written in 1800, a year after its court ended.
10. From 1831 to April 1868 it was the government's offices. They left partly from fear it would collapse.
11. Most of the palace was pulled down after they left. What stands is one part of it.
12. Nearly all its painted decoration is gone, and nobody recorded when.

## 4. Buchanan's words, as they may be quoted

Vol. 1, pp. 45 to 46, entry for 10 May 1800:

> "... no good building, except the mahal or palace. Although this is composed of mud, it is not without some degree of magnificence. On the upper story, it contains four halls, each comprising two balconies of state for the prince, and each balcony faces a different Cutchery, or court for giving audience. No persons, except a few trusty guards, were admitted into the hall with the Sultan: but at each end of the court was erected a balcony for the officers of the highest rank. The inferior officers occupied a hall under the balcony of the prince, open in front, and supported by columns as high as the roof of the upper story. The populace were admitted into the open court, in which there were fountains for cooling the air. At each end of the halls are private apartments, small, mean, and inconvenient. The public rooms are neatly painted, and ornamented with false gilding."

Note for Chapter 3: the highest officers' balconies were at each end of the **court**, and the guards are "trusty", not "trusted".

## 5. Narration hedges that apply

Kept word for word wherever the subject comes up:
- "Around a hundred and sixty pillars" (never a bare number; the files tier the count disputed). Section 8 uses no pillar count, and neither does the game.
- "ten or twelve fanams a month" (not used in section 8).
- "The board at the entrance carries the work back to the seventeen seventies; the palace was finished and named in seventeen ninety one."
- "Almost all of it is gone. What is left are fragments, and they are faint."
- "A gateway and a short run of wall are what survive."
- Any room-by-room painting "must ship visibly labelled as a scholarly reconstruction of the idiom, not as a record."
- Do not say: what happened to Bangalore after March 1791; the rampart's height; six gates.

## 6. Restoration slots

| Slot | Chapter | Element from the audit | State |
|---|---|---|---|
| S1 | 1 | none | **Evidence only.** The stair, hall and galleries stand |
| S2 | 2 | The exterior colour scheme of February 1792, from Hunter's watercolour. Second piece, optional: the packed-earth court in place of today's lawn | Modelled |
| S3 | 3 | The gilded arch heads and the painted walls of the upper hall | Modelled. The open court and fountains are not modelled: evidence only |
| none | 4 | none | Evidence only, as the brief says |
| S5 | 5 | The painted ceiling. Last piece | Modelled |

**Chapter 5, empty panels.** The model does both A and B: it repeats the one recorded pattern on the upper floor and labels the extent as inferred, and it leaves the ground floor plain. It never does C. The script's line can stay as written.

**Consequence for GATE 1.** The slice is the Prologue and Chapter 1, and Chapter 1 has no restoration. So that you can still judge whether a restoration is satisfying, the slice also carries the S2 restoration step from Chapter 2 as a labelled preview. Logged in DECISIONS.md.

## 7. Still open

- F19 and the Attara Kacheri line need a page image or a second source before they ship.
- F09: your ruling.
- Chapter 4's turn: your approval of the new line.
- "Teak" rests on the palace files only. No primary text names the wood.
- The hour of the storming (about eleven at night) is well sourced but the script does not use it.
