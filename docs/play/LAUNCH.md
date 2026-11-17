# Epocheye Play: launch checklist (GATE 3)

You launch Play yourself. This is the list, in order. Tick each box. Nothing here has been done for
you unless it says so. Written 2026-11-17 from the code on `feat/play`; the details of every tool
and variable are in `docs/play/PLAY.md`.

If anything goes wrong after launch, go straight to **9. Turning Play off quickly**.

---

## 1. Decide the open questions

From `docs/play/STATUS.md`. Each one is reversible in `story.json` or the registry, but decide them
before players see them.

Story (details in `docs/play/STORY_CHECK.md` and `tools/play/out/reports/phase2_story_fix.md`):

- [ ] 1. Chapter 4's turn: "The block that held the treasury is the part still standing." Approve or rewrite.
- [ ] 2. F09 and c4-11 (Bangalore went back to Tipu Sultan in 1792; he dismantled the fort himself). Both cut because your files' do-not-say list bars them. Keep cut, or put back.
- [ ] 3. Chapter 2, option B: "For colour, go back to the watercolour he painted himself." Approve.
- [ ] 4. Scribe side notes removed from chapters 3 to 5. Keep out, or rule that primary texts count.
- [ ] 5. Construction dates "by its own inscription", plus the entrance board's 1770s. Approve.
- [ ] 6. The added wrong-pick lines (chapters 1, 3, 5), the four "nobody knows" lines and the eight test questions. Approve.
- [ ] 7. The fifth chip "Our reading". Keep, or fold into "Our reconstruction".
- [ ] 8. Line p-02, "Most visitors photograph the front, call it nice and old, and leave." Keep or cut. While it is a placeholder, `node scripts/play/validate-story.mjs --ship` fails.

Other:

- [ ] 9. Title "Envy of Heaven", the four lens names, the share line, the game's final name.
- [ ] 10. Hunter's 1804 plates: supply licensed scans, or Chapter 2 keeps the one Yale watercolour (current).
- [ ] 11. Confirm the project-made tiles (exterior diaper, painted ceiling, gilding) are your own work.
- [ ] 12. Who is a founding member (binding weekly vote) and where that list lives. Mark them with `POST /api/play/vote/founding` (see PLAY.md section 5).
- [ ] 13. The date the next site opens (`opens_at`), which starts early access a week before. Without it, "Play the next site a week early" promises something with no date.
- [ ] 14. Build clips for the three locked cards (optional `clip` in `content/play/sites.json`).
- [ ] 15. Privacy wording for Play: now drafted in `/privacy` (section 11). See step 3.
- [ ] 16. The daily calendar ends on **2026-12-10** (24 elements, no element twice inside 30 days). Publish more elements, or allow a shorter gap (`--min-gap`, your call). If launch is near that date, the daily page will have no puzzle after it.

Every remaining `[SAMBIT: ...]` and every file you must supply is in `docs/play/PLACEHOLDERS.md`.

## 2. Legal review

- [ ] `/privacy`, section 11 "Epocheye Play". Written from the code. It holds one visible
      placeholder: **the retention period for Play data**. The code sets none (only unconfirmed
      email requests are cleared, after 14 days). Choose a period, put it in the page, and if it is
      to be enforced, ask for a cleanup job: none exists.
- [ ] `/terms`, section 13 "Epocheye Play": free, nothing to buy, names from a list, boards and
      votes may be reset, choices do not change history, content is ours with credits in the game.
- [ ] `/play/privacy`: a short summary that links to `/privacy#play`. Keep it in step with section 11.
- [ ] After review, remove the `[SAMBIT: legal review before launch]` comments in
      `app/privacy/page.js` and `app/terms/page.js`, and update `LAST_UPDATED` on both pages
      (left unchanged so far).
- [ ] Points for the reviewer:
  - `/privacy` section 8 says Epocheye is not directed to children under 13. Play has a "Child"
    lens (a reading level). Decide whether that sits well with section 8.
  - `/privacy` section 4 says the website uses cookies. Play itself sets none. The root layout
    also loads Vercel Web Analytics and the Tally embed script on every page, `/play` included.
    The Play section says Vercel Web Analytics uses no cookies; check that against Vercel's own
    documentation, and decide whether Tally needs a mention.
  - Do Not Track and Global Privacy Control turn off Play's own analytics only. Nothing in our
    code turns off Vercel Web Analytics for those browsers.
  - The page says where Play data lives (Neon Postgres) and who sends email (Resend). It does not
    name a region. Add one if the reviewer wants it.

## 3. Environment variables on Vercel (Production)

Set in Vercel, Settings, Environment Variables, scope **Production**. Never paste a value into a
file in the repo. Changing a variable needs a redeploy to take effect.

Required for Play:

- [ ] `DATABASE_URL` (or `NEON_DATABASE_URL`): the production Neon database. Already used by the site.
- [ ] `PLAY_SIGNING_SECRET`: at least 32 characters. Without it Play stores and sends no email, the
      vote and early access cannot work, and the email form says "Email is not available right now".
      It is not in the `.env.local` pulled from Vercel on 2026-11-16, so it is probably not set yet.
      Generate one with:
      `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
      Use a different value on Preview. Changing it later breaks every link already emailed.
- [ ] `RESEND_API_KEY`: the Resend API key. Already used by the site's other email.
- [ ] `EMAIL_FROM`: the sender, for example `Epocheye <noreply@epocheye.com>`. Its domain must be
      verified in Resend (step 5). Neither `RESEND_API_KEY` nor `EMAIL_FROM` is listed in
      `.env.example`.
- [ ] `ADMIN_JWT_SECRET`: the admin sign-in that guards `/play/admin`. Already used by the site.

Optional:

- [ ] `PLAY_PUBLIC_URL`: origin for links in emails, no trailing slash. Leave empty to use
      `https://www.epocheye.com`.

Must **not** be set in Production (check they are absent):

- [ ] `PLAY_EMAIL_DRY_RUN` (would log emails instead of sending them)
- [ ] `PLAY_DEBUG` (would open the debug view, which can skip the level, to everyone)
- [ ] `PLAY_DEV_PACKS` (would serve development packs)

Feature switches, all on when unset (PLAY.md section 6): `PLAY_ENABLED`, `PLAY_DAILY`, `PLAY_VOTE`,
`PLAY_LEADERBOARDS`, `PLAY_EMAIL`, `PLAY_NARRATION`, `PLAY_ANALYTICS`. Leave them unset to launch
everything, or set one to `off` to launch without that part.

## 4. Run the migrations

Both are additive and idempotent. They were run against the database in `.env.local` during the
build. Run them again against production to be sure; they print every `play_` table and its row
count.

- [ ] Check that `.env.local` (or the shell) points `DATABASE_URL` at the **production** database.
- [ ] `node --env-file=.env.local scripts/migrate-play.mjs`
- [ ] `node --env-file=.env.local scripts/migrate-play-email.mjs`
- [ ] The output lists `play_players`, `play_runs`, `play_run_clock`, `play_daily`,
      `play_daily_starts`, `play_votes`, `play_year_votes`, `play_cards`, `play_events`,
      `play_email_claims`, `play_email_sends`, `play_email_stops`, `play_player_email` and
      `play_email_log`. Every row count should be 0 before launch (test rows were deleted).

## 5. Resend: domain and sender

- [ ] In the Resend dashboard, the domain in `EMAIL_FROM` shows as verified (SPF and DKIM records
      in DNS).
- [ ] On the production deployment, give your own email on `/play` (end card or a locked card's
      "Play the next site a week early"), tick the box, and check:
  - [ ] the email arrives, from the right sender, and not in spam;
  - [ ] the link opens `https://www.epocheye.com/play/unlock` and Confirm works;
  - [ ] "Stop all Play emails" opens `/play/unlock/stop`, and stopping works, with and without the
        "delete my email address" box.
- [ ] Real email delivery has never been tested; every test so far was a dry run.

## 6. Merge `feat/play` into `main`

- [ ] `npm run lint` and `npm run build` pass on `feat/play`.
- [ ] `node scripts/play/validate-story.mjs --ship` passes (it fails while p-02 is a placeholder).
- [ ] Open a pull request from `feat/play` to `main` and read the Vercel preview of it.
- [ ] The packs in `public/play/packs/` are committed (about 550 files, about 60 MB for the palace).
      Check the preview serves them.
- [ ] Merge. Delete `feat/play` afterwards (the branch was always meant to be temporary).
- [ ] Decide whether `/play` stays out of search, the nav, the footer and the sitemap. Today
      `app/play/layout.js` sets `noindex` and nothing links to `/play`. Launching publicly means
      removing that rule and adding the links; launching quietly means leaving it.

## 7. Check on a real phone after deploy

None of these have been tested (STATUS.md, "Not tested"). Use a mid-range Android on 4G and an
iPhone.

- [ ] `/play` loads, the palace card opens, the first view appears in under about 5 seconds.
- [ ] Panoramas look like the Blender renders: no visible compression, no seams.
- [ ] Drag to look, pinch zoom, and the gyroscope (with its permission prompt on iPhone).
- [ ] Frame rate feels smooth, about 30 fps or better.
- [ ] One-handed in portrait. Every step can be done by tap alone.
- [ ] Sound: tap to turn on; narration plays with the pauses; it is silent through the reveal.
      Listen first to `c2-01` and `c3-C-1`, the two clips the speech-to-text check fails on, and
      to the slow lines that run fast (the reveal line and the last line).
- [ ] The whole level, Prologue to the end card, with the proof switch and the year vote.
- [ ] A screen reader (TalkBack or VoiceOver) can reach and name every control.
- [ ] `/play/daily`, `/play/vote`, `/play/leaderboards` (the boards say "not open yet" until ten rows).
- [ ] With "reduce motion" on, the animations stop.
- [ ] `/play/admin` after signing in: events from your own play-through appear.
- [ ] A test player who has never seen the palace takes the eight-question test in the debug view
      (signed in as admin, `?debug=1`). Never done yet.

## 8. Social previews, by hand

Only the card page has its own share image (`app/play/c/[id]/opengraph-image.js` and
`twitter-image.js`). Finish a level, tap Share, and paste the `/play/c/<id>` link into each app.
Check the image, the title and the description, and that the image is not cropped badly.

- [ ] WhatsApp
- [ ] Instagram (a DM; Instagram does not preview links in posts)
- [ ] X
- [ ] Reddit

Also paste `https://www.epocheye.com/play` into each: it has no image of its own and uses the
site's default.

## 9. Turning Play off quickly

**Switch:** in Vercel, Settings, Environment Variables, Production, add `PLAY_ENABLED` = `off`.
Then Deployments, the current production deployment, Redeploy. A variable change does nothing until
a redeploy.

With it off, every `/play` page shows "Coming soon" and every `/api/play` route answers 404. These
stay up on purpose: `/play/privacy`, `/play/unlock/stop` with its API (unsubscribe links in emails
already sent must keep working), and `/play/admin` behind its sign-in. Delete the variable (or set
it to `on`) and redeploy to bring Play back. Nothing is lost: the database is untouched.

To switch off one part only, use `PLAY_EMAIL`, `PLAY_VOTE`, `PLAY_DAILY`, `PLAY_LEADERBOARDS`,
`PLAY_NARRATION` or `PLAY_ANALYTICS` the same way (PLAY.md section 6).

**Faster still:** Vercel's Instant Rollback (Deployments, a production deployment from before the
merge, Promote) puts the whole site back as it was. Use it if the problem is not inside Play.

- [ ] Before launch, try `PLAY_ENABLED=off` on a **preview** deployment and check every `/play`
      route and `/api/play` route. The switches were being wired in when this list was written.
