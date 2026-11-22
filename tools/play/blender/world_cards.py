"""Render trees as lit cut-out cards and list where each tree stands.

blender -b <scene.blend> --python tools/play/blender/world_cards.py -- \
    --world tools/play/worlds/<slug>.json --cell court --out <dir> [--px 512] [--samples 48] [--device GPU|CPU]

Read-only on the .blend. Each species gets two views, front and side, lit by the scene's own sun and
sky, so two crossed cards in the game carry the same light as the baked world.
Writes <out>/<species>_<view>.png and <out>/cards.json.
"""
import bpy, json, math, os, sys
from mathutils import Matrix, Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

a = C.parse_kv(C.argv_after_dashes())
cfg = json.load(open(a["world"], encoding="utf-8"))
site = json.load(open(cfg["site"], encoding="utf-8"))
b = cfg["cells"][a["cell"]]["bounds"]
out = a["out"]
os.makedirs(out, exist_ok=True)
px = int(a.get("px", 512))
samples = int(a.get("samples", 48))
src_scene = bpy.context.scene
C.remap_missing_images(site.get("search_dirs", []))

SPECIES = cfg["cards"]
dg = bpy.context.evaluated_depsgraph_get()
found = {k: {"parts": {}, "at": []} for k in SPECIES}
for inst in dg.object_instances:
    ob = inst.object
    if ob.type != "MESH":
        continue
    name = ob.original.name
    for key, spec in SPECIES.items():
        if not any(name.startswith(p) for p in spec["parts"]):
            continue
        found[key]["parts"].setdefault(name, []).append(inst.matrix_world.copy())
        if name.startswith(spec["anchor"]):
            t, r, s = inst.matrix_world.decompose()
            if b[0] <= t.x <= b[2] and b[1] <= t.y <= b[3]:
                found[key]["at"].append({"x": round(t.x, 2), "y": round(t.y, 2), "z": round(t.z, 2),
                                         "yaw": round(r.to_euler()[2], 3), "scale": round(s.z, 3)})

# Sun direction and strength from the scene.
sun = next((o for o in src_scene.objects if o.type == "LIGHT" and o.data.type == "SUN"), None)
report = {}
for key, spec in SPECIES.items():
    f = found[key]
    anchor_name = next(n for n in f["parts"] if n.startswith(spec["anchor"]))
    base = f["parts"][anchor_name][0]
    base_inv = base.inverted()
    scene = bpy.data.scenes.new("PLAY_card_" + key)
    scene.render.engine = "CYCLES"
    scene.world = src_scene.world
    bpy.context.window.scene = scene
    C.set_device(scene, a.get("device", "GPU"))
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    # The scene's own view, so a card matches the baked world around it.
    scene.view_settings.view_transform = src_scene.view_settings.view_transform
    scene.view_settings.look = src_scene.view_settings.look
    scene.view_settings.exposure = src_scene.view_settings.exposure + float(spec.get("exposure", 0))
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for name, mats in f["parts"].items():
        # The instance of this part closest to the anchor belongs to the same tree.
        m = min(mats, key=lambda x: (x.translation - base.translation).length)
        if (m.translation - base.translation).length > spec.get("reach", 12):
            continue
        src = bpy.data.objects[name]
        me = bpy.data.meshes.new_from_object(src.evaluated_get(dg))
        o = bpy.data.objects.new("c_" + name, me)
        o.matrix_world = base_inv @ m
        scene.collection.objects.link(o)
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    if sun:
        ld = sun.data.copy()
        so = bpy.data.objects.new("c_sun", ld)
        so.rotation_euler = sun.matrix_world.to_euler()
        scene.collection.objects.link(so)
    w = max(hi.x - lo.x, hi.y - lo.y) * 1.04
    h = (hi.z - lo.z) * 1.02
    cam_d = bpy.data.cameras.new("c_cam"); cam_d.type = "ORTHO"; cam_d.ortho_scale = max(w, h)
    cam = bpy.data.objects.new("c_cam", cam_d)
    scene.collection.objects.link(cam); scene.camera = cam
    res_w = px if w >= h else max(64, int(px * w / h))
    res_h = px if h >= w else max(64, int(px * h / w))
    scene.render.resolution_x, scene.render.resolution_y = res_w, res_h
    cx, cy, cz = (lo.x + hi.x) / 2, (lo.y + hi.y) / 2, (lo.z + hi.z) / 2
    for view, yaw in (("front", 0.0), ("side", math.pi / 2)):
        d = Vector((math.sin(yaw), -math.cos(yaw), 0)) * 60
        cam.location = Vector((cx, cy, cz)) + d
        cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(out, f"{key}_{view}.png")
        bpy.ops.render.render(write_still=True, scene=scene.name)
    report[key] = {"width": round(w, 2), "height": round(h, 2), "base_z": round(lo.z, 3), "px": [res_w, res_h],
                   "center": [round(cx, 3), round(cy, 3)], "at": f["at"], "count": len(f["at"])}
    print("@@card", key, report[key]["count"], report[key]["width"], report[key]["height"], flush=True)

json.dump(report, open(os.path.join(out, "cards.json"), "w"), indent=1)
print("WORLD_CARDS_DONE", flush=True)
