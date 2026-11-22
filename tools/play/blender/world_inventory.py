"""Read-only inventory of an open-world source scene.

Run:  blender -b <scene.blend> --python tools/play/blender/world_inventory.py -- <out.json>
Never saves the .blend. Writes one JSON file.

Counts what the render actually sees: evaluated meshes, modifiers applied and
collection instances expanded, grouped by the top-level collection that owns them.
"""
import bpy, json, os, sys, time
from collections import defaultdict
from mathutils import Vector

out = sys.argv[sys.argv.index("--") + 1]
t0 = time.time()
scene = bpy.context.scene
vl = bpy.context.view_layer


def layer_tree(lc, depth=0):
    c = lc.collection
    return {
        "name": c.name,
        "excluded": lc.exclude,
        "hide_render": c.hide_render,
        "hide_viewport": c.hide_viewport or lc.hide_viewport,
        "objects": len(c.objects),
        "all_objects": len(c.all_objects),
        "children": [layer_tree(k, depth + 1) for k in lc.children] if depth < 3 else [],
    }


owner = {}
for top in scene.collection.children:
    for o in top.all_objects:
        owner.setdefault(o.name, top.name)

dg = bpy.context.evaluated_depsgraph_get()
print("INV depsgraph ready", round(time.time() - t0, 1), flush=True)

tri_cache = {}
per_top = defaultdict(lambda: {"instances": 0, "tris": 0, "lo": [1e9] * 3, "hi": [-1e9] * 3})
per_source = defaultdict(lambda: {"instances": 0, "tris": 0, "top": None, "is_instance": False})
total = 0
for inst in dg.object_instances:
    ob = inst.object
    if ob.type != "MESH":
        continue
    key = ob.data.name if ob.data else ob.name
    if key not in tri_cache:
        try:
            mesh = ob.to_mesh()
            mesh.calc_loop_triangles()
            tri_cache[key] = (len(mesh.loop_triangles), [Vector(c) for c in ob.bound_box])
            ob.to_mesh_clear()
        except Exception:
            tri_cache[key] = (0, [])
    tris, box = tri_cache[key]
    src = inst.parent.original.name if inst.is_instance and inst.parent else ob.original.name
    top = owner.get(src) or owner.get(ob.original.name) or "(none)"
    p = per_top[top]
    p["instances"] += 1
    p["tris"] += tris
    m = inst.matrix_world
    for c in (box[0], box[6]) if box else ():
        w = m @ c
        for i in range(3):
            p["lo"][i] = min(p["lo"][i], w[i])
            p["hi"][i] = max(p["hi"][i], w[i])
    s = per_source[ob.original.name]
    s["instances"] += 1
    s["tris"] += tris
    s["top"] = top
    s["is_instance"] = s["is_instance"] or bool(inst.is_instance)
    total += tris

print("INV counted", round(time.time() - t0, 1), flush=True)

by_type = defaultdict(int)
for o in bpy.data.objects:
    by_type[o.type] += 1

armatures = []
for o in bpy.data.objects:
    if o.type == "ARMATURE":
        armatures.append({
            "name": o.name, "bones": len(o.data.bones),
            "action": o.animation_data.action.name if o.animation_data and o.animation_data.action else None,
            "top": owner.get(o.name),
        })

gun_like = sorted({o.name for o in bpy.data.objects if any(k in o.name.lower() for k in ("gun", "cannon", "musket", "rifle", "sword", "weapon"))})
life = {}
for name in ("TSP_INFERRED_people", "TSP_INFERRED_life_props", "TSP_INFERRED_planting"):
    c = bpy.data.collections.get(name)
    if c:
        life[name] = [{
            "name": o.name, "type": o.type,
            "loc": [round(v, 2) for v in o.matrix_world.translation],
            "rot_z": round(o.matrix_world.to_euler()[2] * 57.29578, 1),
        } for o in c.all_objects if o.parent is None][:120]

cams = [{"name": o.name, "loc": [round(v, 2) for v in o.matrix_world.translation]}
        for o in bpy.data.objects if o.type == "CAMERA"]

mats = []
for m in bpy.data.materials:
    imgs = []
    if m.use_nodes and m.node_tree:
        for n in m.node_tree.nodes:
            if n.type == "TEX_IMAGE" and n.image:
                imgs.append({"name": n.image.name, "size": list(n.image.size)})
    mats.append({"name": m.name, "users": m.users, "library": bool(m.library), "images": imgs[:6]})

data = {
    "file": bpy.data.filepath,
    "blender": bpy.app.version_string,
    "counts_by_type": dict(by_type),
    "evaluated_tris_total": total,
    "evaluated_unique_meshes": len(tri_cache),
    "by_top_collection": {
        k: {"instances": v["instances"], "tris": v["tris"],
            "min": [round(x, 1) for x in v["lo"]], "max": [round(x, 1) for x in v["hi"]]}
        for k, v in sorted(per_top.items(), key=lambda kv: -kv[1]["tris"])
    },
    "top_sources": [
        {"name": k, **v}
        for k, v in sorted(per_source.items(), key=lambda kv: -kv[1]["tris"])[:120]
    ],
    "collections": [layer_tree(lc) for lc in vl.layer_collection.children],
    "armatures": armatures[:80],
    "weapon_like_objects": gun_like[:60],
    "weapon_like_count": len(gun_like),
    "life": life,
    "cameras": cams,
    "materials": mats,
    "libraries": [bpy.path.abspath(l.filepath) for l in bpy.data.libraries],
    "seconds": round(time.time() - t0, 1),
}
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=1)
print("INV_DONE", out, flush=True)
