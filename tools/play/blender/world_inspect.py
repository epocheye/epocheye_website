"""Read-only report on how a world's scene is lit and surfaced, for diagnosing bakes. No render, no GPU.

blender -b <scene.blend> --python tools/play/blender/world_inspect.py -- --world <world.json> --out <report.json>
"""
import bpy, json, os, sys
import numpy as np
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

a = C.parse_kv(C.argv_after_dashes())
cfg = json.load(open(a["world"], encoding="utf-8"))
scene = bpy.context.scene
c = scene.cycles
rep = {"view": {"transform": scene.view_settings.view_transform, "look": scene.view_settings.look,
                "exposure": scene.view_settings.exposure, "gamma": scene.view_settings.gamma},
       "cycles": {k: getattr(c, k) for k in ("max_bounces", "diffuse_bounces", "glossy_bounces", "transmission_bounces",
                                             "volume_bounces", "transparent_max_bounces", "sample_clamp_direct",
                                             "sample_clamp_indirect", "use_fast_gi")}}
w = scene.world
nodes = []
if w and w.node_tree:
    for n in w.node_tree.nodes:
        d = {"type": n.type, "name": n.name}
        for s in n.inputs:
            if hasattr(s, "default_value") and not s.is_linked:
                v = s.default_value
                d[s.name] = list(v) if hasattr(v, "__len__") and not isinstance(v, str) else v
        for p in ("sky_type", "sun_elevation", "sun_rotation", "altitude", "air_density", "dust_density", "ozone_density", "turbidity"):
            if hasattr(n, p):
                d[p] = getattr(n, p)
        if n.type == "TEX_ENVIRONMENT" and n.image:
            d["image"] = n.image.filepath
        nodes.append(d)
rep["world"] = {"name": w.name if w else None, "nodes": nodes, "links": [f"{l.from_node.name}.{l.from_socket.name}->{l.to_node.name}.{l.to_socket.name}" for l in w.node_tree.links] if w and w.node_tree else []}
rep["lights"] = []
for o in bpy.data.objects:
    if o.type == "LIGHT":
        d = o.matrix_world.to_3x3() @ Vector((0, 0, 1))
        rep["lights"].append({"name": o.name, "type": o.data.type, "energy": o.data.energy, "color": list(o.data.color),
                              "angle": getattr(o.data, "angle", None), "to_light": [round(x, 4) for x in d],
                              "hide_render": o.hide_render, "shadow": getattr(o.data, "use_shadow", None)})
rep["shells"] = []
for o in bpy.data.objects:
    if o.name.startswith(tuple(cfg.get("bake_no_ray", []))):
        rep["shells"].append({"name": o.name, "type": o.type, "hide_render": o.hide_render, "dims": list(o.dimensions),
                              "mats": [s.material.name if s.material else "" for s in o.material_slots]})


def describe(mat):
    out = {"name": mat.name, "users": mat.users}
    if not mat.use_nodes or not mat.node_tree:
        return out
    for n in mat.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED":
            for k in ("Base Color", "Metallic", "Roughness", "Transmission Weight", "Emission Strength", "Alpha"):
                s = n.inputs.get(k)
                if s is None:
                    continue
                v = s.default_value
                out[k] = ("linked" if s.is_linked else (list(v)[:3] if hasattr(v, "__len__") else round(v, 3)))
    out["kinds"] = sorted({n.type for n in mat.node_tree.nodes if n.type.startswith("BSDF") or n.type in ("EMISSION", "AMBIENT_OCCLUSION", "GROUP")})
    return out


g = cfg["cells"]["court"]["groups"]["palace"]
names, areas = set(), {}
for cname in g["collections"]:
    col = bpy.data.collections.get(cname)
    if col:
        names.update(o.name for o in col.all_objects)
dg = bpy.context.evaluated_depsgraph_get()
mats = {}
rows = []
for inst in dg.object_instances:
    ob = inst.object
    if ob.type != "MESH" or ob.original.name not in names:
        continue
    me = ob.data
    v = np.empty(len(me.vertices) * 3); me.vertices.foreach_get("co", v); v = v.reshape(-1, 3)
    M = np.array(inst.matrix_world)
    w = v @ M[:3, :3].T + M[:3, 3]
    me.calc_loop_triangles()
    t = np.empty(len(me.loop_triangles) * 3, np.int32); me.loop_triangles.foreach_get("vertices", t); t = t.reshape(-1, 3)
    mi = np.empty(len(t), np.int32); me.loop_triangles.foreach_get("material_index", mi)
    if not len(t):
        continue
    ar = np.linalg.norm(np.cross(w[t[:, 1]] - w[t[:, 0]], w[t[:, 2]] - w[t[:, 0]]), axis=1) / 2
    for i, s in enumerate(ob.material_slots):
        if s.material:
            mats[s.material.name] = mats.get(s.material.name, 0.0) + float(ar[mi == i].sum())
    rows.append((float(ar.sum()), ob.original.name, [round(float(x), 2) for x in w.min(0)], [round(float(x), 2) for x in w.max(0)], len(t)))
rows.sort(reverse=True)
rep["palace_objects"] = len(rows)
rep["palace_total_area"] = round(sum(r[0] for r in rows), 1)
rep["palace_largest"] = [{"area": round(r[0], 1), "name": r[1], "min": r[2], "max": r[3], "tris": r[4]} for r in rows[:30]]
rep["palace_materials"] = [{**describe(bpy.data.materials[n]), "area_m2": round(x, 1)} for n, x in sorted(mats.items(), key=lambda kv: -kv[1])]

# What stands between a surface and the sun, and which of the group's sources a render would not show.
hidden = sorted({inst.object.original.name for inst in dg.object_instances
                 if inst.object.type == "MESH" and inst.object.original.name in names and inst.object.original.hide_render})
rep["palace_hidden_from_render"] = {"count": len(hidden), "names": hidden[:60]}
sky = next((n for n in scene.world.node_tree.nodes if n.type == "TEX_SKY"), None) if scene.world and scene.world.node_tree else None
if sky is not None and a.get("rays"):
    import math
    if a.get("state"):
        site = json.load(open(cfg["site"], encoding="utf-8"))
        base, st = site.get("base", {}), site["states"][a["state"]]
        C.set_collections(scene, hide=base.get("hide", []) + st.get("hide", []) + cfg.get("bake_hide_collections", []), show=st.get("show", []))
        hide = tuple(base.get("objhide", []) + st.get("objhide", []))
        for o in bpy.data.objects:
            if hide and o.name.startswith(hide):
                o.hide_render = True
            if o.name.startswith(tuple(cfg.get("bake_no_ray", []))):
                o.hide_render = True
        dg = bpy.context.evaluated_depsgraph_get()
    to_sun = Vector((math.sin(sky.sun_rotation) * math.cos(sky.sun_elevation), math.cos(sky.sun_rotation) * math.cos(sky.sun_elevation), math.sin(sky.sun_elevation)))
    rep["sun_rays"] = []
    for spot in str(a["rays"]).split(";"):
        origin = Vector([float(x) for x in spot.split(",")])
        hits, at = [], origin.copy()
        for _ in range(14):
            ok, loc, _n, _i, ob, _m = scene.ray_cast(dg, at + to_sun * 0.01, to_sun)
            if not ok:
                break
            at = loc
            if ob.hide_render:
                continue
            hits.append({"object": ob.name, "m": round((loc - origin).length, 2)})
        rep["sun_rays"].append({"from": spot, "hits": hits})
json.dump(rep, open(a["out"], "w"), indent=1, default=str)
print("WORLD_INSPECT_DONE2", flush=True)
