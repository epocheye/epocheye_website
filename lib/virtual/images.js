// Image pair for the /virtual reveal and its share card.
// PROVISIONAL: our own site photo and our Blender render (no figures), cropped to 16:9 by
// scripts/build-virtual-images.mjs. They are NOT shot from the same camera, so the wipe does
// not line up exactly. Replace both files with a camera-matched pair, then set this to false.
export const PAIR_IS_PROVISIONAL = true;

export const TODAY = {
	src: "/virtual/today.jpg",
	file: "public/virtual/today.jpg",
	alt: "Tipu Sultan's Summer Palace today: the carved timber colonnade seen from the garden.",
	label: "Today",
};

export const RECONSTRUCTION = {
	src: "/virtual/reconstruction.jpg",
	file: "public/virtual/reconstruction.jpg",
	alt: "Reconstruction of the palace front as it stood in the 1790s.",
	label: "Reconstruction",
	note: PAIR_IS_PROVISIONAL ? "Provisional" : null,
};

// Section 3 slot. Set to { mp4, webm, poster } once the walkthrough clip exists.
export const WALKTHROUGH_VIDEO = null;
