// Input for the open world: keyboard and mouse, touch (fed by the HUD), and a gamepad if one is there.
// A plain object the game loop reads once a frame. No React state, so input never causes a render.

const DEAD = 0.16;

export function createInput(element) {
	const keys = new Set();
	const state = {
		moveX: 0,
		moveY: 0,
		run: false,
		lookX: 0, // accumulated since the last frame, in radians
		lookY: 0,
		stick: { x: 0, y: 0 }, // set by the on-screen joystick
		pressed: new Set(), // one-shot actions: interact, map, skip
	};
	const SENS_MOUSE = 0.0026;

	const onKey = (e, down) => {
		const t = e.target;
		if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
		if (down) {
			if (!e.repeat && e.code === "KeyE") state.pressed.add("interact");
			if (!e.repeat && e.code === "KeyM") state.pressed.add("map");
			if (!e.repeat && e.code === "KeyX") state.pressed.add("skip");
			keys.add(e.code);
		} else {
			keys.delete(e.code);
		}
		if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
	};
	const keyDown = (e) => onKey(e, true);
	const keyUp = (e) => onKey(e, false);
	const blur = () => keys.clear();

	let dragging = false, lastX = 0, lastY = 0;
	let cursorFree = false; // a HUD action is up, so the mouse must stay able to click it
	const pointerDown = (e) => {
		if (e.pointerType === "touch") return;
		dragging = true;
		lastX = e.clientX;
		lastY = e.clientY;
		if (e.button === 0 && !cursorFree && document.pointerLockElement !== element) {
			try {
				const p = element.requestPointerLock?.();
				p?.catch?.(() => {});
			} catch {
				// Pointer lock is optional. Dragging still looks around.
			}
		}
	};
	const pointerMove = (e) => {
		if (e.pointerType === "touch") return;
		if (document.pointerLockElement === element) {
			state.lookX -= e.movementX * SENS_MOUSE;
			state.lookY -= e.movementY * SENS_MOUSE;
		} else if (dragging) {
			state.lookX -= (e.clientX - lastX) * SENS_MOUSE * 1.6;
			state.lookY -= (e.clientY - lastY) * SENS_MOUSE * 1.6;
			lastX = e.clientX;
			lastY = e.clientY;
		}
	};
	const pointerUp = () => {
		dragging = false;
	};

	window.addEventListener("keydown", keyDown);
	window.addEventListener("keyup", keyUp);
	window.addEventListener("blur", blur);
	element.addEventListener("pointerdown", pointerDown);
	window.addEventListener("pointermove", pointerMove);
	window.addEventListener("pointerup", pointerUp);

	let padInteract = false;
	return {
		state,
		// The HUD's look area on a phone calls this with the drag in pixels.
		touchLook(dx, dy) {
			state.lookX -= dx * 0.0052;
			state.lookY -= dy * 0.0042;
		},
		setStick(x, y) {
			state.stick.x = x;
			state.stick.y = y;
		},
		press(action) {
			state.pressed.add(action);
		},
		poll(dt) {
			let x = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
			let y = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
			let run = keys.has("ShiftLeft") || keys.has("ShiftRight");
			if (state.stick.x || state.stick.y) {
				x = state.stick.x;
				y = state.stick.y;
				run = Math.hypot(x, y) > 0.72;
			}
			const pad = navigator.getGamepads?.()?.find(Boolean);
			if (pad) {
				const [lx = 0, ly = 0, rx = 0, ry = 0] = pad.axes;
				if (Math.hypot(lx, ly) > DEAD) {
					x = lx;
					y = -ly;
					run = pad.buttons[7]?.pressed || Math.hypot(lx, ly) > 0.8;
				}
				if (Math.abs(rx) > DEAD) state.lookX -= rx * 2.4 * dt;
				if (Math.abs(ry) > DEAD) state.lookY -= ry * 1.8 * dt;
				const a = !!pad.buttons[0]?.pressed;
				if (a && !padInteract) state.pressed.add("interact");
				padInteract = a;
			}
			const len = Math.hypot(x, y);
			if (len > 1) {
				x /= len;
				y /= len;
			}
			state.moveX = x;
			state.moveY = y;
			state.run = run;
		},
		consume(action) {
			return state.pressed.delete(action);
		},
		takeLook() {
			const out = [state.lookX, state.lookY];
			state.lookX = 0;
			state.lookY = 0;
			return out;
		},
		releasePointer() {
			if (document.pointerLockElement === element) document.exitPointerLock?.();
		},
		// While on, the pointer is released and a click on the world does not take it again.
		setCursorFree(on) {
			cursorFree = !!on;
			if (cursorFree && document.pointerLockElement === element) document.exitPointerLock?.();
		},
		dispose() {
			window.removeEventListener("keydown", keyDown);
			window.removeEventListener("keyup", keyUp);
			window.removeEventListener("blur", blur);
			element.removeEventListener("pointerdown", pointerDown);
			window.removeEventListener("pointermove", pointerMove);
			window.removeEventListener("pointerup", pointerUp);
		},
	};
}
