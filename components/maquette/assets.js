// The data some models are built from, fetched once and shared by every stage.
export const assets = {};
const pending = {};

function sampleLogo(img) {
	const size = 200;
	const c = document.createElement("canvas");
	c.width = c.height = size;
	const ctx = c.getContext("2d", { willReadFrequently: true });
	ctx.drawImage(img, 0, 0, size, size);
	const { data } = ctx.getImageData(0, 0, size, size);
	const px = [];
	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			if (data[(y * size + x) * 4 + 3] < 128) continue;
			const u = (x / size) * 2 - 1;
			const v = 1 - (y / size) * 2;
			px.push(u, v, Math.hypot(u, v) < 0.82 ? 1 : 0);
		}
	}
	return { px: new Float32Array(px), step: 2 / size };
}

const LOADERS = {
	scan: () =>
		fetch("/home/konark-points.bin")
			.then((r) => r.arrayBuffer())
			.then((buf) => new Int16Array(buf)),
	geo: () =>
		fetch("/home/globe.bin")
			.then((r) => r.arrayBuffer())
			.then((buf) => {
				const borders = new DataView(buf).getUint32(0, true);
				const maskBytes = (720 * 360) / 8;
				return { mask: new Uint8Array(buf, 4, maskBytes), borders: new Int16Array(buf.slice(4 + maskBytes, 4 + maskBytes + borders * 4)) };
			}),
	india: () =>
		fetch("/home/india.bin")
			.then((r) => r.arrayBuffer())
			.then((buf) => {
				const head = new DataView(buf);
				const [latMin, latMax, lonMin, lonMax] = [0, 4, 8, 12].map((o) => head.getFloat32(o, true));
				const [cols, rows, borders] = [16, 20, 24].map((o) => head.getUint32(o, true));
				const maskBytes = Math.ceil((cols * rows) / 8);
				return {
					latMin,
					latMax,
					lonMin,
					lonMax,
					cols,
					rows,
					mask: new Uint8Array(buf, 28, maskBytes),
					borders: new Int16Array(buf.slice(28 + maskBytes, 28 + maskBytes + borders * 4)),
				};
			}),
	mark: () =>
		new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(sampleLogo(img));
			img.onerror = reject;
			img.src = "/logo-white.png";
		}),
};

export function loadAsset(name) {
	if (assets[name] || pending[name]) return;
	pending[name] = LOADERS[name]()
		.then((v) => {
			assets[name] = v;
		})
		.catch(() => {
			delete pending[name];
		});
}
