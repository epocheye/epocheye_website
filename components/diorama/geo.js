// The baked land mask for the globe (720×360 bits), fetched once.
let geo = null;
let pending = null;
export const getGeo = () => geo;
export function loadGeo() {
	if (geo || pending) return;
	pending = fetch("/home/globe.bin")
		.then((r) => r.arrayBuffer())
		.then((buf) => {
			geo = { mask: new Uint8Array(buf, 4, (720 * 360) / 8) };
		})
		.catch(() => {
			pending = null;
		});
}
