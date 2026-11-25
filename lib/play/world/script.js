// The one owner of whatever is being spoken in the open world. Only one script runs at a time.
// A script's cleanup runs exactly once, whether it finishes or is replaced, so a cancelled line
// can never leave the player held or a person stuck mid-conversation.

export function createScriptOwner({ voices, setLine, setCard }) {
	let token = 0;
	let active = false;
	let skipLine = null;
	let skipRest = null;
	let startedAt = 0;
	let cleanup = null;

	const stop = () => {
		token++;
		active = false;
		skipLine = null;
		skipRest = null;
		const cancelled = cleanup;
		cleanup = null;
		voices.narrator.stop();
		for (const n of voices.roles.values()) n.stop();
		voices.ambience.duck(false);
		setLine(null);
		setCard(null);
		cancelled?.();
	};

	// setup runs once the previous script is fully cleaned up. cleanup always runs.
	// done runs only when every line has played or been skipped. label names what is playing, and the
	// line it sets says how far through it is.
	const play = (items, { setup, cleanup: release, done, label = null } = {}) => {
		stop();
		const my = ++token;
		const list = items.filter(Boolean);
		active = true;
		startedAt = performance.now();
		cleanup = release || null;
		setup?.();
		const next = (i) => {
			if (my !== token) return;
			if (i >= list.length) {
				const finish = cleanup;
				active = false;
				skipLine = null;
				skipRest = null;
				cleanup = null;
				setLine(null);
				setCard(null);
				voices.ambience.duck(false);
				finish?.();
				done?.();
				return;
			}
			const item = list[i];
			const voice = item.speaker ? voices.roles.get(item.speaker) || voices.narrator : voices.narrator;
			skipLine = () => {
				voice.stop();
				next(i + 1);
			};
			skipRest = () => {
				voice.stop();
				next(list.length);
			};
			setCard(item.evidence || null);
			voices.ambience.duck(true);
			voice.play(item.segments, {
				onSegment: (seg, k) => setLine({ key: `${item.key}:${k}`, text: item.paged ? item.paged[k] : item.text, role: item.role, chip: item.chip, label, at: i + 1, of: list.length }),
				onDone: () => next(i + 1),
			});
		};
		next(0);
	};

	return {
		play,
		stop,
		skip: () => skipLine?.(),
		skipAll: () => skipRest?.(),
		get startedAt() {
			return startedAt;
		},
		get active() {
			return active;
		},
	};
}
