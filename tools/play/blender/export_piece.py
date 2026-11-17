"""Export one restoration's handled piece as a GLB. Read-only on the .blend.

blender -b scene.blend --python tools/play/blender/export_piece.py -- --site <site.json> --restoration <id> --out <file.glb>

The site config names the piece:
  restoration.piece_source = {
    "collection": name,
    "object_prefixes": [...], "near": [x, y, z], "radius": metres     pick whole objects near a point, or
    "objects": [exact object names],                                   pick them by name
    "crop": {"min": [x, y, z], "max": [x, y, z]},                      optional: keep only this world-space box
    "rotate_deg": [rx, ry, rz]                                         optional: turn the exported piece (site axes),
  }                                                                    e.g. so a ceiling panel faces the player

Materials. The scene's materials are node graphs, which glTF cannot carry.
  - If a material's Base Color is fed by an image texture, the piece keeps that texture: the image is
    scaled to at most 1024 px, written as WebP inside the GLB, and the piece gets a UV map that repeats
    the scene's own projection (Generated or Object coordinates, the Mapping scale, box or flat).
  - If the material is node-only, the piece keeps its flat colour, the Principled Base Color value.
Everything is done on copies, in memory. The .blend is never saved.
"""
import bpy, bmesh, os, sys, json, struct, math
from mathutils import Vector, Euler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

a = C.parse_kv(C.argv_after_dashes())
site = json.load(open(a["site"], encoding="utf-8"))
r = next(x for x in site["restorations"] if x["id"] == a["restoration"])
src = r["piece_source"]
MAX_TEX = int(src.get("max_texture_px", 1024))
MAX_BYTES = 2_000_000
TMP = a.get("tmp") or os.path.join(os.path.dirname(a["out"]), "_tex")
C.remap_missing_images(site.get("search_dirs", []))
# No collection, or the scene's root ("Scene Collection"), means every object in the scene.
_cname = src.get("collection")
col = bpy.context.scene.collection if _cname in (None, "", "Scene Collection") else bpy.data.collections[_cname]
picked = []
if src.get("objects"):
    picked = [o for o in col.all_objects if o.type == "MESH" and o.name in src["objects"]]
else:
    near = Vector(src["near"]); radius = float(src.get("radius", 1.0))
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
# clear its selection, add copies, select only those.
scn = bpy.context.scene
for o in bpy.context.view_layer.objects:
    o.select_set(False)


# ---- which image, if any, feeds a material's Base Color -------------------------------------------
def surface_bsdf(mat):
    nt = mat.node_tree
    out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL" and n.is_active_output), None) or \
        next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None)
    seen, todo = set(), [out] if out else []
    while todo:                                   # first Principled reached from the output's Surface
        n = todo.pop(0)
        if n.name in seen:
            continue
        seen.add(n.name)
        if n.type == "BSDF_PRINCIPLED":
            return n
        for i in n.inputs:
            if i.type == "SHADER" or n.type == "OUTPUT_MATERIAL" and i.name == "Surface":
                todo += [l.from_node for l in i.links]
    return next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)


def const_factor(sock):
    """The value of a mix factor if it is a constant (unlinked, or fed by a Value node), else None."""
    if not sock.is_linked:
        v = sock.default_value
        return float(v[0]) if hasattr(v, "__len__") else float(v)
    n = sock.links[0].from_node
    return float(n.outputs[0].default_value) if n.type == "VALUE" else None


def _const_colour(sock):
    return None if sock.is_linked else tuple(sock.default_value)[:3]


def colour_image(sock, depth=0):
    """Follow a colour socket upstream to the image texture that gives it its picture.
    Returns (image node, ops) or None. ops lists the mixes with a constant colour that sit between
    the image and the socket, nearest the image first: (blend_type, factor, (r, g, b)). A mix with
    anything that is not a constant (the baked ambient-occlusion vertex colour, a noise) is left out,
    as the flat-colour rule also leaves it out."""
    if not sock.is_linked or depth > 12:
        return None
    n = sock.links[0].from_node
    if n.type == "TEX_IMAGE":
        return (n, []) if n.image else None
    if n.type == "MIX_RGB":
        ins = [n.inputs["Color1"], n.inputs["Color2"]]; fac = const_factor(n.inputs["Fac"])
    elif n.type == "MIX":
        ins = [i for i in n.inputs if i.type == "RGBA" and i.enabled][:2]
        fsock = next((i for i in n.inputs if i.name == "Factor" and i.enabled), None)
        fac = const_factor(fsock) if fsock else None
    else:
        for i in (i for i in n.inputs if i.type == "RGBA"):
            hit = colour_image(i, depth + 1)
            if hit:
                return hit
        return None
    blend = n.blend_type
    order = [0, 1]
    if blend == "MIX" and fac is not None and fac >= 0.999:
        order = [1, 0]                    # the mix simply passes its second input through
    for k in order:
        hit = colour_image(ins[k], depth + 1)
        if not hit:
            continue
        tex, ops = hit
        other = _const_colour(ins[1 - k])
        if blend == "MIX" and fac is not None and (fac >= 0.999 and k == 1 or fac <= 0.001 and k == 0):
            return tex, ops               # passed straight through
        if k == 0 and other is not None and fac is not None and blend in ("MIX", "MULTIPLY"):
            return tex, ops + [(blend, fac, other)]
        return tex, ops                   # mixed with something that is not a constant: left out
    return None


def projection_of(tex):
    """How the scene maps this image: coordinate source, Mapping location and scale, box or flat."""
    coord, loc, scale = "UV", Vector((0, 0, 0)), Vector((1, 1, 1))
    v = tex.inputs["Vector"]
    hops = 0
    while v.is_linked and hops < 6:
        l = v.links[0]; n = l.from_node; hops += 1
        if n.type == "MAPPING":
            loc = Vector(n.inputs["Location"].default_value); scale = Vector(n.inputs["Scale"].default_value)
            v = n.inputs["Vector"]
        elif n.type == "TEX_COORD":
            coord = l.from_socket.name; break
        else:
            break
    return {"coord": coord, "loc": loc, "scale": scale, "projection": tex.projection}


def small_image(img, ops, tag):
    """A fresh copy of the image file, at most MAX_TEX px on its longest side, with the scene's constant
    colour mixes worked into the pixels (in linear light, as the shader does). Written under tools/play/out."""
    import numpy as np
    src_path = bpy.path.abspath(img.filepath)
    if not os.path.exists(src_path):
        return None
    c = bpy.data.images.load(src_path, check_existing=False)
    w, h = c.size
    if not w or not h:
        bpy.data.images.remove(c); return None
    k = min(1.0, MAX_TEX / max(w, h))
    if k < 1.0:
        c.scale(max(1, round(w * k)), max(1, round(h * k)))
    w, h = c.size
    px = np.empty(w * h * 4, dtype=np.float32)
    c.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    if ops:
        rgb = px[:, :3]
        lin = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
        for blend, fac, col in ops:
            col = np.array(col, dtype=np.float32)
            lin = lin * (1 - fac) + (col if blend == "MIX" else lin * col) * fac
        lin = np.clip(lin, 0, 1)
        px[:, :3] = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)
    mean = [round(float(v), 3) for v in px[:, :3].mean(axis=0)]
    out = bpy.data.images.new(f"piece_{tag}", w, h, alpha=False)
    out.colorspace_settings.name = "sRGB"
    out.pixels.foreach_set(px.ravel())
    os.makedirs(TMP, exist_ok=True)
    out.filepath_raw = os.path.join(TMP, f"{r['id']}_{tag}_{max(w, h)}.png")
    out.file_format = "PNG"
    out.save()
    bpy.data.images.remove(c)
    return out, mean


# ---- copies, optional crop, bounds ------------------------------------------------------------------
crop = src.get("crop")
copies, orig_bounds = [], {}
for o in picked:
    c = o.copy(); c.data = o.data.copy(); scn.collection.objects.link(c); copies.append(c)
    bb = [Vector(v) for v in o.bound_box]
    orig_bounds[c.name] = (Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb))),
                           Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb))))
bpy.context.view_layer.update()
if crop:
    lo_w, hi_w = Vector(crop["min"]), Vector(crop["max"])
    planes = [(lo_w, Vector((-1, 0, 0))), (lo_w, Vector((0, -1, 0))), (lo_w, Vector((0, 0, -1))),
              (hi_w, Vector((1, 0, 0))), (hi_w, Vector((0, 1, 0))), (hi_w, Vector((0, 0, 1)))]
    for c in copies:
        inv = c.matrix_world.inverted(); rot = inv.to_3x3()
        bm = bmesh.new(); bm.from_mesh(c.data)
        for co, no in planes:                      # keep the side the normal points away from
            res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-5,
                                         plane_co=inv @ co, plane_no=(rot @ no).normalized(),
                                         clear_outer=True, clear_inner=False)
            cut = [e for e in res["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
            if cut:
                bmesh.ops.holes_fill(bm, edges=cut, sides=0)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        bm.to_mesh(c.data); bm.free()
    copies = [c for c in copies if len(c.data.polygons)] or copies

lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
for c in copies:
    for v in c.data.vertices:
        w = c.matrix_world @ v.co
        lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))

# ---- materials: textured where the scene's base colour is an image, flat otherwise -----------------
made, textured, flat = {}, {}, []
for c in copies:
    me = c.data
    for si, slot in enumerate(c.material_slots):
        sm = slot.material
        if not sm:
            continue
        bs = surface_bsdf(sm) if sm.node_tree else None
        hit = colour_image(bs.inputs["Base Color"]) if bs else None
        tex, ops = hit if hit else (None, [])
        if sm.name not in made:
            m = bpy.data.materials.new("piece_" + sm.name.split("__")[0])
            m.use_nodes = True
            dst = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
            if bs:
                dst.inputs["Base Color"].default_value = tuple(bs.inputs["Base Color"].default_value)
                dst.inputs["Roughness"].default_value = bs.inputs["Roughness"].default_value if not bs.inputs["Roughness"].is_linked else 0.7
                dst.inputs["Metallic"].default_value = bs.inputs["Metallic"].default_value
            made_img = small_image(tex.image, ops, sm.name.split("__")[0]) if tex else None
            if made_img:
                img, mean = made_img
                tn = m.node_tree.nodes.new("ShaderNodeTexImage"); tn.image = img
                m.node_tree.links.new(tn.outputs["Color"], dst.inputs["Base Color"])
                textured[sm.name] = {"image": tex.image.name, "source_px": list(tex.image.size), "px": list(img.size),
                                     "projection": tex.projection, "coord": projection_of(tex)["coord"],
                                     "mixes": [(b, round(f, 3), [round(v, 3) for v in c3]) for b, f, c3 in ops],
                                     "mean_srgb": mean,
                                     "flat_value_linear": [round(v, 3) for v in tuple(bs.inputs["Base Color"].default_value)[:3]]}
            else:
                flat.append(sm.name)
            made[sm.name] = m
        if sm.name in textured:
            # A UV map that repeats the scene's projection of this image on this object.
            pr = projection_of(tex)
            uvl = me.uv_layers.get("piece_uv") or me.uv_layers.new(name="piece_uv")
            me.uv_layers.active = uvl; uvl.active_render = True
            blo, bhi = orig_bounds[c.name]
            size = Vector((max(bhi.x - blo.x, 1e-6), max(bhi.y - blo.y, 1e-6), max(bhi.z - blo.z, 1e-6)))
            for poly in me.polygons:
                if poly.material_index != si:
                    continue
                n = poly.normal
                ax = max(range(3), key=lambda i: abs(n[i])) if pr["projection"] == "BOX" else 2
                for li in poly.loop_indices:
                    co = me.vertices[me.loops[li].vertex_index].co
                    p = Vector(((co.x - blo.x) / size.x, (co.y - blo.y) / size.y, (co.z - blo.z) / size.z)) \
                        if pr["coord"] == "Generated" else Vector(co)
                    p = Vector((p.x * pr["scale"].x + pr["loc"].x, p.y * pr["scale"].y + pr["loc"].y, p.z * pr["scale"].z + pr["loc"].z))
                    if pr["projection"] != "BOX":
                        uv = (p.x, p.y)
                    elif ax == 0:
                        uv = (1.0 - p.y if n.x < 0 else p.y, p.z)
                    elif ax == 1:
                        uv = (1.0 - p.x if n.y > 0 else p.x, p.z)
                    else:
                        uv = (1.0 - p.y if n.z > 0 else p.y, p.x)
                    uvl.data[li].uv = uv
        slot.material = made[sm.name]

# ---- recentre, select, export ----------------------------------------------------------------------
origin = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
tris = 0
turn = Euler([math.radians(v) for v in src.get("rotate_deg", [0, 0, 0])], "XYZ").to_matrix().to_4x4()
for c in copies:
    mw = c.matrix_world.copy()
    mw.translation = mw.translation - origin
    c.matrix_world = turn @ mw
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

# What actually went into the file.
with open(a["out"], "rb") as f:
    magic, ver, total = struct.unpack("<4sII", f.read(12))
    jlen, jtype = struct.unpack("<I4s", f.read(8))
    gl = json.loads(f.read(jlen))
images = [{"mime": i.get("mimeType"), "bytes": gl["bufferViews"][i["bufferView"]]["byteLength"]} for i in gl.get("images", [])]
size = os.path.getsize(a["out"])
C.report("PIECE", {"restoration": r["id"], "objects": [o.name for o in picked], "tris": tris,
                   "size_m": [round(v, 2) for v in (hi - lo)], "bytes": size, "under_2mb": size < MAX_BYTES,
                   "textured": textured, "flat": sorted(set(flat)), "glb_images": images,
                   "glb_materials": [m["name"] for m in gl.get("materials", [])], "cropped": bool(crop)})
if size >= MAX_BYTES:
    sys.exit(2)
