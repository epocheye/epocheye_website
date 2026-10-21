// Generate the four /journeys teaser objects with Meshy (REST, key from the MESHY_API_KEY env var).
//   node scripts/journeys/meshy-teasers.mjs            # run every stage, resumable
//   node scripts/journeys/meshy-teasers.mjs status     # print task states
// Per object: text-to-3d preview (20) -> refine texture (10). Hero also gets a retexture (10) for
// the faded "today" set. State lives in .journeys-build/meshy/tasks.json; downloads go next to it.
// No remesh on Meshy: decimation happens in Blender (scripts/journeys/meshy-cleanup.py).
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const KEY = process.env.MESHY_API_KEY;
if (!KEY) throw new Error("MESHY_API_KEY is not set");
const API = "https://api.meshy.ai/openapi";
const DIR = path.resolve(".journeys-build/meshy");
mkdirSync(DIR, { recursive: true });
const STATE = path.join(DIR, "tasks.json");
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
const save = () => writeFileSync(STATE, JSON.stringify(state, null, 2));

const OBJECTS = {
	"palace-pillar": {
		prompt:
			"One architectural fragment from Tipu Sultan's 18th century teak summer palace in Bangalore: a single slender fluted teak wood pillar on a small stone base, with a lotus bud capital carrying a cusped multi-lobed Indo-Islamic arch, and above the arch a flat rectangular spandrel panel painted with dense floral and foliage scrollwork in vermilion red, green and gold on cream. Carved dark teak, isolated museum artifact, clean silhouette, no background",
		texture: "polished dark teak wood with fine grain, gilded arch edge, the spandrel panel painted with vivid vermilion, green and gold floral scrollwork on cream plaster",
		today: "weathered faded teak, grey-brown dry wood, the painted panel almost gone: pale cream plaster with faint ghost traces of red and green florals, flaking paint, dust, dull gilding",
	},
	// Second take on the hero: the brief wants the arch the pillar carries and the painted panel.
	"palace-arcade": {
		prompt:
			"A section of the wooden arcade of Tipu Sultan's Summer Palace in Bangalore, 18th century: one slender fluted teak pillar in the centre on a small stone base, from whose lotus capital two cusped multi-lobed scalloped arches spring to the left and right, cut off at mid-span, with a tall flat spandrel wall above the arches painted with dense floral scrollwork in vermilion red, green and gold on cream plaster, dark carved teak, museum display fragment, clean silhouette, no background",
		texture: "polished dark teak wood with fine grain, gilded scalloped arch edges, spandrel panel painted with vivid vermilion, green and gold floral scrollwork on cream plaster",
		today: "weathered faded teak, grey-brown dry wood, the painted spandrel almost gone: pale cream plaster with faint ghost traces of red and green florals, flaking paint, dust, dull gilding",
	},
	"fort-gateway": {
		prompt:
			"The stone gateway arch of an 18th century South Indian fort, Bangalore Fort: a freestanding grey granite masonry gate with a tall pointed cusped arch opening and a heavy wooden door, thick rusticated stone blocks, battlements and merlons along the top, two short round bastions flanking it, weathered stone, isolated architectural fragment, clean silhouette, no background",
		texture: "weathered grey granite blocks with lichen and mortar joints, dark teak door with iron studs",
	},
	"victoria-dome": {
		prompt:
			"The central dome of the Victoria Memorial in Kolkata: a large white Makrana marble dome on a tall drum with arched openings and pilasters, four small corner chhatri pavilions on a square base, crowned by a bronze winged figure of Victory holding a trumpet, standing on a small pedestal. Indo-Saracenic, isolated architectural fragment, dome and drum only, clean silhouette, no background",
		texture: "white veined Makrana marble, slightly weathered, with a dark patinated bronze winged figure on top",
	},
	"museum-colonnade": {
		prompt:
			"One bay of the 19th century neoclassical colonnade of the Indian Museum in Kolkata: three white plastered Tuscan columns on a low plinth supporting a plain entablature, with a balustrade and a second storey of round arched openings above, lime plastered white walls, isolated architectural fragment, clean silhouette, no background",
		texture: "white lime plaster with soft weathering and faint grey streaks, stone plinth",
	},
};

// Image-to-3D from licensed Wikimedia Commons photographs (see CREDITS.md). Run with
//   node scripts/journeys/meshy-teasers.mjs image
// Outputs go to .journeys-build/meshy-img/ so the text-to-3D set above is kept.
const IMAGE_OBJECTS = {
	"palace-pillar": {
		image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Wooden_arches.jpg/1920px-Wooden_arches.jpg",
		texture: "dark polished teak wood pillars and cusped arches with gilded and painted floral bands in vermilion, green and gold, red ochre wall behind",
		today: "weathered faded dark teak, dry grey-brown wood, paint almost gone: faint ghost traces of red, green and gold florals, flaking, dust",
	},
	"fort-gateway": {
		image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Bangalore_Fort_3.jpg/1920px-Bangalore_Fort_3.jpg",
		texture: "weathered red ochre lime plaster over grey granite blocks, old fort gateway",
	},
	"victoria-dome": {
		image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Victoria_Memorial_Kolkata_Dome.jpg/1920px-Victoria_Memorial_Kolkata_Dome.jpg",
		texture: "white Makrana marble dome with carved details, slightly weathered, dark patinated bronze winged figure on top",
	},
	"museum-colonnade": {
		image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Building_of_Calcutta_Museum_05.jpg/1920px-Building_of_Calcutta_Museum_05.jpg",
		texture: "white lime plastered neoclassical arcade with soft grey weathering",
	},
};

async function api(method, url, body) {
	const res = await fetch(`${API}${url}`, {
		method,
		headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
		body: body ? JSON.stringify(body) : undefined,
	});
	const text = await res.text();
	let data;
	try {
		data = JSON.parse(text);
	} catch {
		data = { raw: text };
	}
	if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${text.slice(0, 300)}`);
	return data;
}

async function wait(kind, id) {
	const url = kind === "retexture" ? `/v1/retexture/${id}` : kind === "image" ? `/v1/image-to-3d/${id}` : `/v2/text-to-3d/${id}`;
	for (;;) {
		const t = await api("GET", url);
		if (t.status === "SUCCEEDED") return t;
		if (t.status === "FAILED" || t.status === "CANCELED") throw new Error(`${kind} ${id} ${t.status}: ${t.task_error?.message || ""}`);
		process.stdout.write(`  ${kind} ${id.slice(0, 8)} ${t.status} ${t.progress ?? 0}%\r`);
		await new Promise((r) => setTimeout(r, 10000));
	}
}

async function download(url, file) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`download ${res.status}`);
	writeFileSync(file, Buffer.from(await res.arrayBuffer()));
	console.log(`  saved ${path.basename(file)} ${(Buffer.byteLength(readFileSync(file)) / 1024 / 1024).toFixed(2)} MB`);
}

async function run(name, o) {
	const s = (state[name] ||= {});
	if (!s.preview) {
		const r = await api("POST", "/v2/text-to-3d", {
			mode: "preview",
			prompt: o.prompt,
			art_style: "realistic",
			ai_model: "latest",
			should_remesh: false,
			topology: "triangle",
		});
		s.preview = r.result;
		save();
		console.log(`${name}: preview ${s.preview}`);
	}
	await wait("preview", s.preview);
	if (!s.refine) {
		const r = await api("POST", "/v2/text-to-3d", {
			mode: "refine",
			preview_task_id: s.preview,
			enable_pbr: false,
			texture_prompt: o.texture,
			ai_model: "latest",
		});
		s.refine = r.result;
		save();
		console.log(`${name}: refine ${s.refine}`);
	}
	const refined = await wait("refine", s.refine);
	const glb = path.join(DIR, `${name}.glb`);
	if (!existsSync(glb)) await download(refined.model_urls.glb, glb);
	if (refined.thumbnail_url && !existsSync(path.join(DIR, `${name}-thumb.png`))) await download(refined.thumbnail_url, path.join(DIR, `${name}-thumb.png`));
	if (o.today) {
		if (!s.today) {
			const r = await api("POST", "/v1/retexture", {
				input_task_id: s.refine,
				text_style_prompt: o.today,
				enable_original_uv: true,
				enable_pbr: false,
				ai_model: "latest",
			});
			s.today = r.result;
			save();
			console.log(`${name}: retexture (today) ${s.today}`);
		}
		const today = await wait("retexture", s.today);
		const tglb = path.join(DIR, `${name}-today.glb`);
		if (!existsSync(tglb)) await download(today.model_urls.glb, tglb);
	}
	console.log(`${name}: done`);
}

async function runImage(name, o, dir) {
	const s = (state[`img:${name}`] ||= {});
	if (!s.model) {
		const r = await api("POST", "/v1/image-to-3d", {
			image_url: o.image,
			ai_model: "latest",
			should_remesh: false,
			should_texture: true,
			enable_pbr: false,
			texture_prompt: o.texture,
			topology: "triangle",
		});
		s.model = r.result;
		save();
		console.log(`${name}: image-to-3d ${s.model}`);
	}
	const done = await wait("image", s.model);
	const glb = path.join(dir, `${name}.glb`);
	if (!existsSync(glb)) await download(done.model_urls.glb, glb);
	if (done.thumbnail_url && !existsSync(path.join(dir, `${name}-thumb.png`))) await download(done.thumbnail_url, path.join(dir, `${name}-thumb.png`));
	if (o.today) {
		if (!s.today) {
			const r = await api("POST", "/v1/retexture", {
				input_task_id: s.model,
				text_style_prompt: o.today,
				enable_original_uv: true,
				enable_pbr: false,
				ai_model: "latest",
			});
			s.today = r.result;
			save();
			console.log(`${name}: retexture (today) ${s.today}`);
		}
		const today = await wait("retexture", s.today);
		const tglb = path.join(dir, `${name}-today.glb`);
		if (!existsSync(tglb)) await download(today.model_urls.glb, tglb);
	}
	console.log(`${name}: done`);
}

if (process.argv[2] === "image") {
	const dir = path.resolve(".journeys-build/meshy-img");
	mkdirSync(dir, { recursive: true });
	const only = process.argv.slice(3);
	const bal = await api("GET", "/v1/balance");
	console.log("balance before:", bal.balance);
	await Promise.all(Object.entries(IMAGE_OBJECTS).filter(([n]) => !only.length || only.includes(n)).map(([n, o]) => runImage(n, o, dir)));
	const after = await api("GET", "/v1/balance");
	console.log("balance after:", after.balance);
} else if (process.argv[2] === "status") {
	console.log(JSON.stringify(state, null, 2));
} else {
	const only = process.argv[2] === "only" ? process.argv.slice(3) : null;
	const bal = await api("GET", "/v1/balance");
	console.log("balance before:", bal.balance);
	await Promise.all(Object.entries(OBJECTS).filter(([n]) => !only || only.includes(n)).map(([n, o]) => run(n, o)));
	const after = await api("GET", "/v1/balance");
	console.log("balance after:", after.balance);
}
