// Shared, mutable journey state. Written by the scroll handler and read every frame by the
// camera rig, so it lives outside React: a frame loop must never wait on a re-render.
export const journey = {
	t: 0, // chapter position: integer part = stop index, fraction = progress to the next stop
	pointerX: 0, // -1..1, for a slight look-around
	pointerY: 0,
	reducedMotion: false,
	locked: false, // capture mode: scroll does not move the camera
	capture: null, // capture mode: a toBlob callback, served after the next rendered frame
};
