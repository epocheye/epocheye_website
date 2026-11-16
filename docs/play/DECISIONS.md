# Epocheye Play: decisions log

Choices made outside the gates, newest last. Each has a date and a reason.

| Date | Decision | Why |
|---|---|---|
| 2026-11-16 | Branch cleanup before Play: merged `claude/hopeful-rubin-ux7guq` and `feat/journeys` (which contains `feat/virtual-summer-palace`) into `main`; archived `claude/color-palettes` as tag `archive/color-palettes`; deleted all six remote branches. | Owner asked for `main` only and answered the three merge questions. The two `claude/*` one-commit branches were already in main. |
| 2026-11-16 | Left out of the journeys merge: `AnnouncementBanner*.jsx` (main removed the banner in #27), the `.pyc`, and `docs/journeys/recording-*.mp4`. | Dead code and build debris. Agreed in the merge question. |
| 2026-11-16 | No Neon migration run for the journeys merge. | `virtual_waitlist` and `journeys_intents` already exist in the production database. |
| 2026-11-16 | Play is built on `feat/play`, the one temporary branch, merged and deleted at GATE 3. | Owner's answer. Keeps production untouched until launch. |
| 2026-11-16 | Linked the repo to the Vercel project `epocheye-website` and pulled env to `.env.local` (gitignored). | Needed to read Neon and, later, to run the Play migration. |
| 2026-11-16 | Palace project folder: `E:\heritage_assets\tipu-summer-palace-bengaluru`, scene `output/blend/TSP_period_world.blend`. | Owner confirmed. |
