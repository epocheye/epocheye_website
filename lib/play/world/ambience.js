// Ambience generated in the browser, so there is no sound file to license or download.
// Today: a low city rumble. The past: wind and birds. Crossfades on an era shift.

export function createAmbience() {
	const Ctx = typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;
	if (!Ctx) return { start() {}, setEra() {}, setEnabled() {}, duck() {}, dispose() {} };
	let ctx = null, master, today, past, birdTimer = null, era = 0, enabled = false;

	function noise() {
		const len = ctx.sampleRate * 3;
		const buf = ctx.createBuffer(1, len, ctx.sampleRate);
		const d = buf.getChannelData(0);
		let b = 0;
		for (let i = 0; i < len; i++) {
			b = 0.985 * b + 0.015 * (Math.random() * 2 - 1);
			d[i] = b * 6;
		}
		const s = ctx.createBufferSource();
		s.buffer = buf;
		s.loop = true;
		return s;
	}

	function bird() {
		if (!ctx || era < 0.5 || !enabled) return;
		const t = ctx.currentTime;
		const base = 2200 + Math.random() * 1800;
		const notes = 2 + Math.floor(Math.random() * 4);
		for (let i = 0; i < notes; i++) {
			const o = ctx.createOscillator();
			const g = ctx.createGain();
			const at = t + i * (0.09 + Math.random() * 0.05);
			o.type = "sine";
			o.frequency.setValueAtTime(base * (1 + Math.random() * 0.2), at);
			o.frequency.exponentialRampToValueAtTime(base * (0.8 + Math.random() * 0.5), at + 0.07);
			g.gain.setValueAtTime(0.0001, at);
			g.gain.exponentialRampToValueAtTime(0.018, at + 0.015);
			g.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
			o.connect(g).connect(past);
			o.start(at);
			o.stop(at + 0.1);
		}
	}

	return {
		start() {
			if (ctx) {
				ctx.resume?.();
				return;
			}
			ctx = new Ctx();
			master = ctx.createGain();
			master.gain.value = 0;
			master.connect(ctx.destination);
			today = ctx.createGain();
			past = ctx.createGain();
			today.connect(master);
			past.connect(master);
			const rumble = noise();
			const low = ctx.createBiquadFilter();
			low.type = "lowpass";
			low.frequency.value = 210;
			const rumbleGain = ctx.createGain();
			rumbleGain.gain.value = 0.34;
			rumble.connect(low).connect(rumbleGain).connect(today);
			const wind = noise();
			const band = ctx.createBiquadFilter();
			band.type = "bandpass";
			band.frequency.value = 520;
			band.Q.value = 0.5;
			const windGain = ctx.createGain();
			windGain.gain.value = 0.1;
			const lfo = ctx.createOscillator();
			const lfoGain = ctx.createGain();
			lfo.frequency.value = 0.09;
			lfoGain.gain.value = 0.05;
			lfo.connect(lfoGain).connect(windGain.gain);
			wind.connect(band).connect(windGain).connect(past);
			rumble.start();
			wind.start();
			lfo.start();
			today.gain.value = era ? 0 : 1;
			past.gain.value = era ? 1 : 0;
			birdTimer = setInterval(() => Math.random() < 0.55 && bird(), 1500);
		},
		setEra(value, seconds = 1.6) {
			era = value;
			if (!ctx) return;
			const t = ctx.currentTime;
			today.gain.cancelScheduledValues(t);
			past.gain.cancelScheduledValues(t);
			today.gain.setTargetAtTime(value ? 0 : 1, t, seconds / 3);
			past.gain.setTargetAtTime(value ? 1 : 0, t, seconds / 3);
		},
		setEnabled(on) {
			enabled = !!on;
			if (ctx) master.gain.setTargetAtTime(enabled ? 0.55 : 0, ctx.currentTime, 0.25);
		},
		// Drops under the voice and comes back in the silences.
		duck(on) {
			if (ctx && enabled) master.gain.setTargetAtTime(on ? 0.22 : 0.55, ctx.currentTime, 0.2);
		},
		dispose() {
			clearInterval(birdTimer);
			ctx?.close?.();
			ctx = null;
		},
	};
}
