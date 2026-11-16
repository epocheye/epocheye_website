"""Read-only scene inspection for the Play audit.

Run:  blender -b <scene.blend> --python tools/play/blender/inspect_scene.py -- <out.json>
Never saves the .blend. Writes one JSON file.
"""
import bpy, json, os, re, sys
from mathutils import Vector

out = sys.argv[sys.argv.index("--") + 1]
TIER = re.compile(r"__([A-Z0-9][A-Z0-9\-]*)")
scene = bpy.context.scene


def tier_of(name):
    m = TIER.search(name)
    return m.group(1) if m else None


def col_tree(c, depth=0):
    return {
        "name": c.name,
        "objects": len(c.objects),
        "all_objects": len(c.all_objects),
        "hide_render": c.hide_render,
        "hide_viewport": c.hide_viewport,
        "children": [col_tree(k, depth + 1) for k in c.children],
    }


def bounds(objs):
    lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9)); n = 0
    for o in objs:
        if o.type != "MESH":
            continue
        for corner in o.bound_box:
            w = o.matrix_world @ Vector(corner)
            lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w)); n += 1
    return None if not n else {"min": [round(v, 2) for v in lo], "max": [round(v, 2) for v in hi]}


cams = []
for o in bpy.data.objects:
    if o.type == "CAMERA":
        cams.append({
            "name": o.name,
            "loc": [round(v, 3) for v in o.matrix_world.translation],
            "rot_deg": [round(v * 57.29578, 1) for v in o.matrix_world.to_euler()],
            "lens": round(o.data.lens, 1), "type": o.data.type,
            "collections": [c.name for c in o.users_collection],
        })

mats = []
for m in bpy.data.materials:
    imgs = []
    if m.use_nodes and m.node_tree:
        for n in m.node_tree.nodes:
            if n.type == "TEX_IMAGE" and n.image:
                imgs.append(n.image.name)
    mats.append({"name": m.name, "tier": tier_of(m.name), "users": m.users, "images": imgs})

images = []
for i in bpy.data.images:
    p = bpy.path.abspath(i.filepath) if i.filepath else ""
    images.append({"name": i.name, "path": p, "size": list(i.size), "packed": bool(i.packed_file),
                   "missing": bool(i.source == "FILE" and not i.packed_file and p and not os.path.exists(p))})

tagged = {}
for o in bpy.data.objects:
    t = tier_of(o.name)
    if t:
        tagged.setdefault(t, []).append(o.name)

interesting = {}
for cname in ("TSP_OFF_present_state", "TSP_Palace_detail", "TSP_Palace_columns", "TSP_Throne_rebuilt",
              "TSP_Palace_stairs_rebuilt", "TSP_R1_grounds", "Throne__COURT_1791", "TSP_cameras"):
    c = bpy.data.collections.get(cname)
    if c:
        interesting[cname] = {
            "objects": [{"name": o.name, "type": o.type,
                         "mats": [s.material.name for s in o.material_slots if s.material][:6],
                         "hide_render": o.hide_render} for o in c.all_objects][:80],
            "bounds": bounds(c.all_objects),
        }

rebuilt = bpy.data.collections.get("TSP_Palace_rebuilt")
mat_use = {}
if rebuilt:
    for o in rebuilt.all_objects:
        for s in o.material_slots:
            if s.material:
                mat_use[s.material.name] = mat_use.get(s.material.name, 0) + 1

cy = scene.cycles
data = {
    "file": bpy.data.filepath,
    "saved_version": list(bpy.data.version),
    "running_version": list(bpy.app.version),
    "scene": scene.name,
    "render": {"engine": scene.render.engine, "res": [scene.render.resolution_x, scene.render.resolution_y],
               "samples": cy.samples, "device": cy.device, "denoise": cy.use_denoising,
               "adaptive": cy.use_adaptive_sampling, "adaptive_threshold": cy.adaptive_threshold,
               "max_bounces": cy.max_bounces, "view_transform": scene.view_settings.view_transform,
               "look": scene.view_settings.look, "exposure": scene.view_settings.exposure,
               "film_transparent": scene.render.film_transparent},
    "world": scene.world.name if scene.world else None,
    "active_camera": scene.camera.name if scene.camera else None,
    "counts": {"objects": len(bpy.data.objects), "meshes": len(bpy.data.meshes), "materials": len(bpy.data.materials),
               "images": len(bpy.data.images), "collections": len(bpy.data.collections)},
    "libraries": [{"path": bpy.path.abspath(l.filepath), "exists": os.path.exists(bpy.path.abspath(l.filepath))}
                  for l in bpy.data.libraries],
    "collections": col_tree(scene.collection),
    "cameras": cams,
    "materials": mats,
    "images_missing": [i for i in images if i["missing"]],
    "images_total_px": sum(i["size"][0] * i["size"][1] for i in images),
    "image_paths": sorted({os.path.dirname(i["path"]) for i in images if i["path"]}),
    "tagged_objects": {k: v[:40] for k, v in tagged.items()},
    "tagged_counts": {k: len(v) for k, v in tagged.items()},
    "interesting": interesting,
    "palace_bounds": bounds(rebuilt.all_objects) if rebuilt else None,
    "palace_material_use": mat_use,
    "view_layers": [vl.name for vl in scene.view_layers],
    "tris_render_visible": None,
}
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=1)
print("INSPECT_DONE", out)
