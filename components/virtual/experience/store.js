// Shared, mutable journey state. Written by the scroll handler and read every frame by the
// camera rig, so it lives outside React: a frame loop must never wait on a re-render.
export const journey = {
	t: 0, // chapter position: integer part = stop index, fraction = progress to the next stop
	pointerX: 0, // -1..1, for a slight look-around
	pointerY: 0,
	fadeEl: null, // the black cut overlay, faded by the rig
	reducedMotion: false,
};
