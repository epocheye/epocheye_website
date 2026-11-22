"""Read-only plan of the fort for the open-world map: every fort mesh as world-space triangles.

Run through:  python tools/play/export_world.py <slug> plan
Never saves the .blend. Uses no GPU. Writes <out>/objects.json and <out>/<index>.npz (v, f, m).
Anything named in the world config's never_export is not read out at all.
"""
import bpy, json, os, re, sys
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
import world_edits as E

a = C.parse_kv(C.argv_after_dashes())
cfg = json.load(open(a["world"], encoding="utf-8"))
out = a["out"]
os.makedirs(out, exist_ok=True)
NEVER = tuple(cfg.get("never_export", []))
KEEP = re.compile(cfg.get("plan_match", r"^(MW_|TSP_fortR_|TSP_court|TSP_verge|Pettah_road|PLAY_)"))
for o in bpy.data.objects:
    for m in getattr(o, "modifiers", []):
        if any(m.name.startswith(p) for p in cfg.get("bake_hide_modifiers", [])):
            m.show_render = False
            m.show_viewport = False

print("@@edits", json.dumps(E.apply(cfg)), flush=True)
dg = bpy.context.evaluated_depsgraph_get()
rows, seen = [], {}
houses = []
for inst in dg.object_instances:
    ob = inst.object
    if ob.type != "MESH":
        continue
    src = ob.original
    owner = inst.parent.original if inst.is_instance and inst.parent else src
    if src.name.startswith(NEVER) or owner.name.startswith(NEVER):
        continue
    if src.name.startswith("Pettah_house"):
        box = np.array([list(inst.matrix_world @ Vector(b)) for b in ob.bound_box], np.float32)
        houses.append([round(float(box[:, 0].min()), 1), round(float(box[:, 1].min()), 1), round(float(box[:, 0].max()), 1), round(float(box[:, 1].max()), 1)])
        continue
    if not (KEEP.search(src.name) or KEEP.search(owner.name)):
        continue
    me = ob.to_mesh()
    me.calc_loop_triangles()
    nv, nt = len(me.vertices), len(me.loop_triangles)
    if nt:
        v = np.empty(nv * 3, np.float64)
        me.vertices.foreach_get("co", v)
        t = np.empty(nt * 3, np.int32)
        me.loop_triangles.foreach_get("vertices", t)
        mi = np.empty(nt, np.int32)
        me.loop_triangles.foreach_get("material_index", mi)
        M = np.array(inst.matrix_world, np.float64)
        w = v.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]
        i = len(rows)
        np.savez_compressed(os.path.join(out, f"{i}.npz"), v=w.astype(np.float32), f=t.reshape(-1, 3), m=mi)
        rows.append({"i": i, "name": src.name, "owner": owner.name, "tris": nt,
                     "mats": [s.material.name if s.material else "" for s in ob.material_slots],
                     "min": w.min(axis=0).round(2).tolist(), "max": w.max(axis=0).round(2).tolist()})
    ob.to_mesh_clear()

hidden = []
for o in bpy.data.objects:
    if o.type != "MESH" or not KEEP.search(o.name) or o.name.startswith(NEVER) or o.name in {r["name"] for r in rows}:
        continue
    me = o.data
    me.calc_loop_triangles()
    nv, nt = len(me.vertices), len(me.loop_triangles)
    row = {"name": o.name, "tris": nt, "mods": [m.type for m in o.modifiers]}
    if nt:
        v = np.empty(nv * 3, np.float64)
        me.vertices.foreach_get("co", v)
        t = np.empty(nt * 3, np.int32)
        me.loop_triangles.foreach_get("vertices", t)
        M = np.array(o.matrix_world, np.float64)
        w = v.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]
        row["file"] = f"h{len(hidden)}.npz"
        row["min"], row["max"] = w.min(axis=0).round(2).tolist(), w.max(axis=0).round(2).tolist()
        np.savez_compressed(os.path.join(out, row["file"]), v=w.astype(np.float32), f=t.reshape(-1, 3))
    hidden.append(row)
for r in rows:
    o = bpy.data.objects.get(r["name"])
    r["mods"] = [m.type for m in o.modifiers] if o else []
    r["linked"] = bool(o and o.library)
    w = bpy.data.objects.get(r["owner"])
    r["owner_linked"] = bool(w and w.library)
json.dump({"objects": rows, "not_rendered": hidden, "houses": houses}, open(os.path.join(out, "objects.json"), "w"), indent=0)
print("WORLD_PLAN_DONE", len(rows), flush=True)
