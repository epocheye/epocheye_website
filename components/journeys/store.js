// Mutable scroll state shared between the ScrollTriggers (writers) and the three.js frame
// loop (reader). Kept out of React state so scrolling never re-renders the page.
export const stage = {
	// Fractional frame index: frame i sits centred in the viewport at t = i + 0.5.
	t: 0,
	// Number of full-screen frames the model moves through.
	frames: 12,
	// True once the solid sections after the 3D stage cover the screen.
	off: false,
	pointerX: 0,
	pointerY: 0,
};

// Dev-only handle for poking the scroll state from the browser console.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") window.__jrStage = stage;
