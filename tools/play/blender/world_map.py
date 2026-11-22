"""Read-only plan of an open-world scene: every visible mesh source with its world bounds.

Run:  blender -b <scene.blend> --python tools/play/blender/world_map.py -- <out.json>
Never saves the .blend.
"""
import bpy, json, os, sys
from collections import defaultdict
from mathutils import Vector

out = sys.argv[sys.argv.index("--") + 1]
scene = bpy.context.scene
owner = {}
for top in scene.collection.children:
    for o in top.all_objects:
        owner.setdefault(o.name, top.name)

dg = bpy.context.evaluated_depsgraph_get()
rows = defaultdict(lambda: {"n": 0, "tris": 0, "lo": [1e9] * 3, "hi": [-1e9] * 3, "top": None, "mats": None})
tri = {}
for inst in dg.object_instances:
    ob = inst.object
    if ob.type != "MESH":
        continue
    src = ob.original.name
    if src not in tri:
        m = ob.to_mesh()
        m.calc_loop_triangles()
        tri[src] = (len(m.loop_triangles), [Vector(c) for c in ob.bound_box],
                    sorted({s.material.name for s in ob.material_slots if s.material})[:5])
        ob.to_mesh_clear()
    t, box, mats = tri[src]
    r = rows[src]
    r["n"] += 1
    r["tris"] += t
    r["mats"] = mats
    parent = inst.parent.original.name if inst.is_instance and inst.parent else src
    r["top"] = owner.get(parent) or owner.get(src) or "(none)"
    for c in box:
        w = inst.matrix_world @ c
        for i in range(3):
            r["lo"][i] = min(r["lo"][i], w[i])
            r["hi"][i] = max(r["hi"][i], w[i])

data = [{"name": k, **{a: b for a, b in v.items() if a not in ("lo", "hi")},
         "min": [round(x, 2) for x in v["lo"]], "max": [round(x, 2) for x in v["hi"]]}
        for k, v in rows.items()]
data.sort(key=lambda r: (r["top"], -r["tris"]))
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=0)
print("MAP_DONE", len(data), flush=True)
