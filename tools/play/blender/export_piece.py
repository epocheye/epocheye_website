"""Export one restoration's handled piece as a GLB. Read-only on the .blend.

blender -b scene.blend --python tools/play/blender/export_piece.py -- --site <site.json> --restoration <id> --out <file.glb>

The site config names the piece: restoration.piece_source = {"collection": name, "object_prefixes": [...], "near": [x, y, z], "radius": metres}
"""
import bpy, os, sys, json
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

a = C.parse_kv(C.argv_after_dashes())
site = json.load(open(a["site"], encoding="utf-8"))
r = next(x for x in site["restorations"] if x["id"] == a["restoration"])
src = r["piece_source"]
col = bpy.data.collections[src["collection"]]
near = Vector(src["near"]); radius = float(src.get("radius", 1.0))
picked = []
for o in col.all_objects:
    if o.type != "MESH" or not o.name.startswith(tuple(src["object_prefixes"])):
        continue
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    centre = sum(pts, Vector()) / 8
    if (Vector((centre.x, centre.y, 0)) - Vector((near.x, near.y, 0))).length <= radius:
        picked.append(o)
if not picked:
    C.report("PIECE", {"error": "nothing matched", "restoration": r["id"]}); sys.exit(1)

# Background mode has no window, so the scene cannot be switched. Export from the current scene:
# clear its selection, add recentred copies, select only those.
scn = bpy.context.scene
for o in bpy.context.view_layer.objects:
    o.select_set(False)
lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
copies = []
for o in picked:
    c = o.copy(); c.data = o.data.copy(); scn.collection.objects.link(c); copies.append(c)
    for corner in o.bound_box:
        w = o.matrix_world @ Vector(corner)
        lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
origin = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
tris = 0
for c in copies:
    c.matrix_world.translation = c.matrix_world.translation - origin
    tris += sum(len(p.vertices) - 2 for p in c.data.polygons)
bpy.context.view_layer.update()
for c in copies:
    c.hide_viewport = False; c.hide_select = False; c.hide_render = False
    c.hide_set(False)          # hidden objects cannot be selected, and the originals may be hidden
    c.select_set(True)
bpy.context.view_layer.objects.active = copies[0]
selected = [o.name for o in bpy.context.view_layer.objects if o.select_get()]
assert set(selected) == {c.name for c in copies}, f"unexpected selection: {selected[:6]}"
os.makedirs(os.path.dirname(a["out"]), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=a["out"], export_format="GLB", use_selection=True, export_apply=True,
                          export_yup=True, export_materials="EXPORT", export_image_format="WEBP",
                          export_draco_mesh_compression_enable=False)
C.report("PIECE", {"restoration": r["id"], "objects": [o.name for o in picked], "tris": tris,
                   "size_m": [round(v, 2) for v in (hi - lo)], "bytes": os.path.getsize(a["out"]),
                   "materials": sorted({s.material.name for o in picked for s in o.material_slots if s.material})})
