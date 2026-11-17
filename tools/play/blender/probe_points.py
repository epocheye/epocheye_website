"""Read-only probe for placing viewpoints and choosing pieces. No rendering, no GPU.

blender -b scene.blend --python tools/play/blender/probe_points.py -- --site <site.json> --out <file.json>
    [--points "x,y,z;x,y,z"] [--materials "A,B"]

For every node in the site config (and every extra point) it casts rays in 26 directions and
reports the nearest hit and what it is, so a point inside or touching geometry shows up.
For every named material it lists the objects that use it, with world bounds, and dumps the
material's node graph (which image feeds Base Color, through which nodes).
Never saves the .blend.
"""
import bpy, os, sys, json, itertools
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

a = C.parse_kv(C.argv_after_dashes())
site = json.load(open(a["site"], encoding="utf-8"))
scene = bpy.context.scene
base = site.get("base", {})
C.set_collections(scene, hide=base.get("hide", []))
for o in bpy.data.objects:
    if o.name.startswith(tuple(base.get("objhide", []))) or o.hide_render:
        o.hide_viewport = True
for c in bpy.data.collections:
    if c.hide_render:
        c.hide_viewport = True
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()

points = [(n["id"], n["loc"]) for n in site["nodes"]]
for i, p in enumerate(x for x in str(a.get("points", "")).split(";") if x):
    points.append((f"extra{i}", [float(v) for v in p.split(",")]))

dirs = [Vector(d).normalized() for d in itertools.product((-1, 0, 1), repeat=3) if any(d)]
out = {"points": {}, "materials": {}, "graphs": {}}
for name, loc in points:
    hits = []
    for d in dirs:
        ok, pos, nrm, idx, ob, _ = scene.ray_cast(dg, Vector(loc), d, distance=200)
        hits.append({"dir": [round(v, 2) for v in d], "dist": round((pos - Vector(loc)).length, 2) if ok else None,
                     "object": ob.name if ok else None,
                     "backface": bool(ok and nrm.dot(d) > 0)})
    near = sorted((h for h in hits if h["dist"] is not None), key=lambda h: h["dist"])
    out["points"][name] = {"loc": loc, "nearest": near[:5],
                           "up": next(h for h in hits if h["dir"] == [0, 0, 1]),
                           "down": next(h for h in hits if h["dir"] == [0, 0, -1]),
                           "axes": [h for h in hits if sum(abs(v) for v in h["dir"]) == 1],
                           "backfaces": sum(1 for h in hits if h["backface"])}

want = [m for m in str(a.get("materials", "")).split(",") if m]
for o in bpy.data.objects:
    if o.type != "MESH":
        continue
    used = [s.material.name for s in o.material_slots if s.material]
    for m in want:
        if m in used:
            pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
            lo = [round(min(p[i] for p in pts), 2) for i in range(3)]
            hi = [round(max(p[i] for p in pts), 2) for i in range(3)]
            out["materials"].setdefault(m, []).append({
                "object": o.name, "min": lo, "max": hi, "slots": used, "polys": len(o.data.polygons),
                "uv": [l.name for l in o.data.uv_layers], "hide_render": o.hide_render,
                "collections": [c.name for c in o.users_collection]})

for m in want:
    mat = bpy.data.materials.get(m)
    if not mat or not mat.node_tree:
        continue
    nt = mat.node_tree
    out["graphs"][m] = {
        "nodes": [{"name": n.name, "type": n.type,
                   "image": (n.image.name, bpy.path.abspath(n.image.filepath), list(n.image.size)) if n.type == "TEX_IMAGE" and n.image else None,
                   "projection": getattr(n, "projection", None) if n.type == "TEX_IMAGE" else None,
                   "values": {i.name: (list(i.default_value) if hasattr(i.default_value, "__len__") else i.default_value)
                              for i in n.inputs if not i.is_linked and hasattr(i, "default_value")
                              and n.type in {"BSDF_PRINCIPLED", "MAPPING", "MIX", "MIX_RGB", "MATH"}
                              and i.name in {"Base Color", "Roughness", "Metallic", "Scale", "Rotation", "Location", "Factor", "A", "B", "Value", "Color1", "Color2", "Fac"}}}
                  for n in nt.nodes],
        "links": [f"{l.from_node.name}.{l.from_socket.name} -> {l.to_node.name}.{l.to_socket.name}" for l in nt.links]}

os.makedirs(os.path.dirname(a["out"]), exist_ok=True)
json.dump(out, open(a["out"], "w", encoding="utf-8"), indent=1)
print("PROBE_DONE", a["out"])
