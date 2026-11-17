import "server-only";

// Feature switches for Epocheye Play. Server-side environment variables, read on every request,
// each on unless it is set to an "off" word. Set one in Vercel (or .env.local) and redeploy.
//
//   PLAY_ENABLED       the whole game. Off: every /play page shows a plain "Coming soon" page and
//                      every /api/play route answers 404. Two pages stay up: /play/privacy (what
//                      Play stored) and /play/unlock/stop with its API (an unsubscribe link in an
//                      email already sent must keep working). /play/admin stays up behind its sign-in.
//   PLAY_DAILY         the daily puzzle (/play/daily, /api/play/daily/*) and the streak board.
//   PLAY_VOTE          the weekly vote (/play/vote, /api/play/vote/*) and the Vote buttons on locked
//                      cards. It needs email: with PLAY_EMAIL off the vote is off too. The year vote
//                      at the end of a level is part of the story and is not switched by this.
//   PLAY_LEADERBOARDS  /play/leaderboards, /api/play/leaderboard, the board on the end card and the
//                      daily board. Runs and daily results are still recorded, so the boards come
//                      back complete when it is switched on again.
//   PLAY_EMAIL         giving an email (end card, locked cards, early access), the confirm and
//                      restore links, and so early access and the weekly vote. Unsubscribing always works.
//   PLAY_NARRATION     the narrator's voice. Off: no Sound button and no audio is fetched; the
//                      directed pauses still run on reading time.
//   PLAY_ANALYTICS     the cookieless events (/api/play/event) behind the dashboard. Off: no event
//                      is sent or stored. Runs, votes and daily results are game records and are
//                      still kept (the leaderboards and the year vote need them).
//
// Off words: 0, off, false, no, disabled (any case). Anything else, or unset, is on.

const OFF = new Set(["0", "off", "false", "no", "disabled"]);

function flag(name) {
	const raw = process.env[name];
	if (raw == null) return true;
	return !OFF.has(String(raw).trim().toLowerCase());
}

export const FEATURE_ENV = {
	enabled: "PLAY_ENABLED",
	daily: "PLAY_DAILY",
	vote: "PLAY_VOTE",
	leaderboards: "PLAY_LEADERBOARDS",
	email: "PLAY_EMAIL",
	narration: "PLAY_NARRATION",
	analytics: "PLAY_ANALYTICS",
};

// { enabled, daily, vote, leaderboards, email, narration, analytics }: booleans. With the game off
// every other switch reads off too, so no caller has to check two.
export function playFeatures() {
	const enabled = flag(FEATURE_ENV.enabled);
	const email = enabled && flag(FEATURE_ENV.email);
	return {
		enabled,
		daily: enabled && flag(FEATURE_ENV.daily),
		vote: email && flag(FEATURE_ENV.vote),
		leaderboards: enabled && flag(FEATURE_ENV.leaderboards),
		email,
		narration: enabled && flag(FEATURE_ENV.narration),
		analytics: enabled && flag(FEATURE_ENV.analytics),
	};
}

export function featureOn(name) {
	return !!playFeatures()[name];
}
