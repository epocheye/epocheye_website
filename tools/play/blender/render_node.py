"""Render one node of a site pack: cube faces for a state, restoration masks, tier mask.

blender -b scene.blend --python tools/play/blender/render_node.py -- \
    --site tools/play/sites/<slug>.json --node <id> --out <dir> \
    --what then,now,masks,tier [--face 2048] [--samples N] [--device GPU|CPU]
    [--exposure EV] [--set key=value,key=value] [--faces px,pz] [--loc x,y,z]   (look development only)

A node may carry "cycles": {setting: value} in the site config. Those Cycles sampling, bounce,
clamp and denoiser settings are applied in memory for that node's beauty passes only and put
back before the masks. They never add a light or touch the sun, the sky or a material.

Read-only on the .blend: every change below is in memory and is never saved.
Output: <out>/<node>/<state>_<face>.png (px,nx,py,ny,pz,nz), mask_<restoration>_<face>.png, tier_<face>.png
"""
import bpy, os, sys, json, math, re
from fnmatch import fnmatchcase
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

a = C.parse_kv(C.argv_after_dashes())
site = json.load(open(a["site"], encoding="utf-8"))
node = next(n for n in site["nodes"] if n["id"] == a["node"])
out = os.path.join(a["out"], node["id"]); os.makedirs(out, exist_ok=True)
what = a.get("what", "then,now,masks,tier").split(",")
face_px = int(a.get("face", site.get("face_px", 2048)))
scene = bpy.context.scene
TIER = re.compile(r"__([A-Z0-9][A-Z0-9\-]*)")

C.remap_missing_images(site.get("search_dirs", []))
backend = C.set_device(scene, a.get("device", "GPU"))

# Blender camera looks down -Z with +Y up. Faces follow the three.js cube order.
# World here is Z up. yaw 0 = looking along +Y (into the building, the site's "front" axis).
FACES = {
    "px": (90, 0, -90), "nx": (90, 0, 90),
    "py": (180, 0, 0), "ny": (0, 0, 0),
    "pz": (90, 0, 0), "nz": (90, 0, 180),
}
# px = looking +X, nx = looking -X, py = up, ny = down, pz = looking +Y, nz = looking -Y
cam_data = bpy.data.cameras.new("PLAY_cube")
cam_data.type = "PERSP"; cam_data.sensor_fit = "HORIZONTAL"
cam_data.angle = math.radians(90)
cam_data.clip_start = 0.05; cam_data.clip_end = 5000
cam = bpy.data.objects.new("PLAY_cube", cam_data)
scene.collection.objects.link(cam)
cam.location = [float(v) for v in str(a["loc"]).split(",")] if a.get("loc") else node["loc"]
scene.camera = cam
scene.render.resolution_x = scene.render.resolution_y = face_px
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.image_settings.color_depth = "8"
scene.render.use_border = False
# The scene's lens finish (vignette, glare) is made for single frames. On cube faces it would
# darken every edge and show as seams, so compositing is off for pack renders.
scene.render.use_compositing = False
scene.render.use_sequencer = False


def apply_state(name):
    base = site.get("base", {}); st = site["states"][name]
    C.set_collections(scene, hide=base.get("hide", []) + st.get("hide", []), show=st.get("show", []))
    prefixes = tuple(base.get("objhide", []) + st.get("objhide", []))
    if prefixes:
        for o in bpy.data.objects:
            if o.name.startswith(prefixes):
                o.hide_render = True
    for name, spec in st.get("materials", {}).items():
        if not bpy.data.materials.get(name):
            C.make_pbr(name, spec)
    C.swap_materials(st.get("matswap", {}))
    if st.get("haze") and not bpy.data.objects.get("PLAY_haze"):
        C.add_haze(st["haze"])


ONLY_FACES = [f for f in str(a.get("faces", "")).split(",") if f]


def render_faces(prefix):
    secs = 0
    for f, rot in FACES.items():
        if ONLY_FACES and f not in ONLY_FACES:
            continue
        path = os.path.join(out, f"{prefix}_{f}.png")
        if os.path.exists(path) and not a.get("force"):
            continue
        cam.rotation_euler = [math.radians(v) for v in rot]
        secs += C.timed_render(scene, path)
    return secs


times = {}
orig_exposure = scene.view_settings.exposure
samples = int(a.get("samples", node.get("samples", site.get("samples", scene.cycles.samples))))

# Per-node Cycles settings for the beauty passes (sampling, bounces, clamping, denoiser only).
CYCLES_ALLOWED = {
    "max_bounces", "diffuse_bounces", "glossy_bounces", "transmission_bounces", "transparent_max_bounces",
    "sample_clamp_direct", "sample_clamp_indirect", "blur_glossy",
    "use_adaptive_sampling", "adaptive_threshold", "adaptive_min_samples",
    "use_denoising", "denoiser", "denoising_input_passes", "denoising_prefilter", "denoising_quality",
    "use_light_tree", "light_sampling_threshold", "use_guiding", "guiding_training_samples",
}


def _coerce(v):
    if not isinstance(v, str):
        return v
    if v.lower() in ("true", "false"):
        return v.lower() == "true"
    try:
        return int(v)
    except ValueError:
        try:
            return float(v)
        except ValueError:
            return v


cycles_over = dict(node.get("cycles", {}))
for pair in str(a.get("set", "")).split(","):
    if "=" in pair:
        k, v = pair.split("=", 1)
        cycles_over[k.strip()] = _coerce(v.strip())
bad = sorted(set(cycles_over) - CYCLES_ALLOWED)
if bad:
    C.report("NODE", {"node": node["id"], "error": f"cycles settings not allowed: {bad}"}); sys.exit(1)
cycles_saved = {k: getattr(scene.cycles, k) for k in cycles_over}


def beauty_settings(on):
    for k, v in (cycles_over if on else cycles_saved).items():
        setattr(scene.cycles, k, v)


def exposure_for(state):
    if "exposure" in a:
        return float(a["exposure"])
    ex = node.get("exposure", {})
    return ex.get(state, ex.get("then", orig_exposure))

# 1. Beauty passes. THEN first: the scene as saved is the THEN state. NOW is derived last
#    because its material swaps are not undone.
if "then" in what:
    apply_state("then")
    scene.cycles.samples = samples
    scene.view_settings.exposure = exposure_for("then")
    beauty_settings(True)
    times["then"] = render_faces("then")
    beauty_settings(False)

# 2. Masks: flat emission, white on the selected objects, black elsewhere. Geometry is the
#    THEN geometry, so masks line up with the THEN panorama pixel for pixel.
def flat(name, value):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    e = nt.nodes.new("ShaderNodeEmission"); e.inputs[0].default_value = (value, value, value, 1)
    o = nt.nodes.new("ShaderNodeOutputMaterial"); nt.links.new(e.outputs[0], o.inputs[0])
    return m


def selected(o, slot_mat, sel):
    nm = o.name
    if any(nm.startswith(p) for p in sel.get("object_prefixes", [])):
        return True
    if slot_mat and slot_mat in sel.get("materials", []):
        return True
    t = TIER.search(nm)
    if t and any(fnmatchcase(t.group(1), pat) for pat in sel.get("object_tiers", [])):
        return not any(nm.startswith(p) for p in sel.get("except_prefixes", []))
    tm = TIER.search(slot_mat or "")
    if tm and any(fnmatchcase(tm.group(1), pat) for pat in sel.get("material_tiers", [])):
        return True
    return False


if "masks" in what or "tier" in what:
    apply_state("then")
    WHITE, BLACK = flat("PLAY_white", 1.0), flat("PLAY_black", 0.0)
    scene.cycles.samples = int(site.get("mask_samples", 8))
    scene.cycles.use_denoising = False
    scene.cycles.max_bounces = 0
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0
    if scene.world:
        scene.world = bpy.data.worlds.new("PLAY_black_world")
        scene.world.use_nodes = True
        scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0, 0, 0, 1)
    originals = {}
    meshes = [o for o in bpy.data.objects if o.type in {"MESH", "CURVE", "SURFACE", "FONT"} and not o.name.startswith("PLAY_")]
    for o in meshes:
        originals[o.name] = [s.material.name if s.material else None for s in o.material_slots]

    def paint(sel):
        for o in meshes:
            names = originals[o.name]
            if not names:
                continue
            for i, s in enumerate(o.material_slots):
                try:
                    if s.link == "DATA" and o.data.users > 1:
                        s.link = "OBJECT"
                    s.material = WHITE if selected(o, names[i], sel) else BLACK
                except AttributeError:
                    pass   # linked library data is read-only; it renders black (no lights, black world)

    def collection_pass(name, cols):
        """White wherever the named collections are visible, with everything else as a holdout.
        Used for linked libraries, whose materials cannot be repainted."""
        vl = bpy.context.view_layer
        lcs = C._layer_collections(vl.layer_collection)
        prev = {k: lc.holdout for k, lc in lcs.items()}
        for k, lc in lcs.items():
            if lc.collection is scene.collection:
                continue
            lc.holdout = k not in cols and not any(k in [c.name for c in bpy.data.collections[x].children_recursive] for x in cols if bpy.data.collections.get(x))
        vl.material_override = WHITE
        scene.render.film_transparent = True
        scene.render.image_settings.color_mode = "RGBA"
        secs = render_faces(name + "_col")
        scene.render.film_transparent = False
        scene.render.image_settings.color_mode = "RGB"
        vl.material_override = None
        for k, lc in lcs.items():
            lc.holdout = prev[k]
        return secs

    jobs = []
    if "masks" in what:
        jobs += [("mask_" + r["id"], r["select"]) for r in site["restorations"] if node["id"] in r["nodes"]]
    if "tier" in what:
        jobs.append(("tier", site["tier"]["reconstruction"]))
    for name, sel in jobs:
        paint(sel)
        times[name] = render_faces(name)
        if sel.get("collections"):
            times[name + "_col"] = collection_pass(name, sel["collections"])

if "now" in what:
    # Fresh material state is needed for NOW; the orchestrator runs NOW in its own Blender process.
    if "masks" in what or "tier" in what or "then" in what:
        C.report("NODE", {"node": node["id"], "error": "run --what now in a separate process"})
    else:
        apply_state("now")
        scene.cycles.samples = samples
        scene.view_settings.exposure = exposure_for("now")
        beauty_settings(True)
        times["now"] = render_faces("now")
        beauty_settings(False)

C.report("NODE", {"node": node["id"], "backend": backend, "face_px": face_px, "samples": samples, "seconds": times,
                  "cycles": cycles_over, "simplify": bool(scene.render.use_simplify),
                  "exposure": {st: exposure_for(st) for st in ("then", "now")}})
