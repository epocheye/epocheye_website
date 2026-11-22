"""Build one open-world cell: low-poly targets, UVs, and Cycles bakes of albedo and light.

blender -b <scene.blend> --python tools/play/blender/world_build.py -- \
    --world tools/play/worlds/<slug>.json --cell court --out <dir> \
    --groups palace,near,far,ground --states then,now [--scale 1.0] [--samples 96] [--device GPU|CPU] [--geometry-only]

Read-only on the .blend: every change is in memory and nothing here saves the file.
Writes <out>/<group>.bin + <group>.json (geometry) and <group>_<state>_{albedo,light}.npy.
"""
import bpy, bmesh, json, math, os, re, subprocess, sys, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

a = C.parse_kv(C.argv_after_dashes())
cfg = json.load(open(a["world"], encoding="utf-8"))
site = json.load(open(cfg["site"], encoding="utf-8"))
cell = cfg["cells"][a["cell"]]
out = a["out"]
os.makedirs(out, exist_ok=True)
groups_wanted = a.get("groups", "palace,near,far,ground").split(",")
states_wanted = a.get("states", "then,now").split(",")
scale = float(a.get("scale", 1.0))
samples = int(a.get("samples", 96))
geometry_only = bool(a.get("geometry-only"))
scene = bpy.context.scene
NEVER = tuple(cfg.get("never_export", []))
GZ = float(cfg.get("ground_z", 0))
TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATLAS_PY = os.path.join(TOOLS, "out", "venv", "Scripts", "python.exe")
ATLAS_SCRIPT = os.path.join(TOOLS, "uv_atlas.py")

C.remap_missing_images(site.get("search_dirs", []))
backend = C.set_device(scene, a.get("device", "GPU"))
scene.render.engine = "CYCLES"
scene.render.use_compositing = False
scene.cycles.use_denoising = False
scene.cycles.use_adaptive_sampling = False
print("@@device", json.dumps({"backend": backend}), flush=True)


def hide_scatter():
    n = 0
    for o in bpy.data.objects:
        for m in getattr(o, "modifiers", []):
            if any(m.name.startswith(p) for p in cfg.get("bake_hide_modifiers", [])):
                m.show_render = False; m.show_viewport = False; n += 1
    return n


def group_sources(group):
    """Every evaluated mesh instance that belongs to the group: (source object, world matrix)."""
    names = set()
    for cname in group["collections"]:
        c = bpy.data.collections.get(cname)
        if c:
            names.update(o.name for o in c.all_objects)
    pat = re.compile(group["match"]) if group.get("match") else None
    dg = bpy.context.evaluated_depsgraph_get()
    items = []
    for inst in dg.object_instances:
        ob = inst.object
        if ob.type != "MESH":
            continue
        src = ob.original
        owner = inst.parent.original if inst.is_instance and inst.parent else src
        if src.name not in names and owner.name not in names:
            continue
        if src.name.startswith(NEVER) or owner.name.startswith(NEVER):
            continue
        if pat and not (pat.search(src.name) or pat.search(owner.name)):
            continue
        items.append((src, inst.matrix_world.copy(), owner))
    return items, dg


def mesh_arrays(src, dg, cache):
    if src.name in cache:
        return cache[src.name]
    ev = src.evaluated_get(dg)
    m = ev.to_mesh()
    m.calc_loop_triangles()
    nv, nt = len(m.vertices), len(m.loop_triangles)
    v = np.empty(nv * 3, np.float64); m.vertices.foreach_get("co", v)
    t = np.empty(nt * 3, np.int32); m.loop_triangles.foreach_get("vertices", t)
    mi = np.empty(nt, np.int32); m.loop_triangles.foreach_get("material_index", mi)
    mats = [s.material.name if s.material else "" for s in ev.material_slots]
    cache[src.name] = (v.reshape(-1, 3), t.reshape(-1, 3), mi, mats)
    ev.to_mesh_clear()
    return cache[src.name]


def classify(mats, classes):
    ids = np.zeros(max(len(mats), 1), np.int32)
    for i, name in enumerate(mats):
        for c in classes:
            if re.search(c["match"], name):
                ids[i] = c["id"]; break
    return ids


def build_target(name, group, items, dg):
    """World-space low-poly mesh with a class per vertex, decimated to the group's budget."""
    b = cell["bounds"]
    classes = group.get("classes", [])
    cache, per_class = {}, {}
    for src, mw, _owner in items:
        v, t, mi, mats = mesh_arrays(src, dg, cache)
        if not len(t):
            continue
        M = np.array(mw, np.float64)
        w = v @ M[:3, :3].T + M[:3, 3]
        keep = np.ones(len(t), bool)
        if group.get("clip"):
            c = w[t].mean(axis=1)
            keep = (c[:, 0] > b[0]) & (c[:, 0] < b[2]) & (c[:, 1] > b[1]) & (c[:, 1] < b[3])
        ids = classify(mats, classes)[np.clip(mi, 0, max(len(mats) - 1, 0))] if classes else np.zeros(len(t), np.int32)
        for cid in np.unique(ids[keep]):
            sel = t[keep & (ids == cid)]
            used, inv = np.unique(sel, return_inverse=True)
            bucket = per_class.setdefault(int(cid), {"v": [], "f": [], "n": 0})
            bucket["v"].append(w[used])
            bucket["f"].append(inv.reshape(-1, 3) + bucket["n"])
            bucket["n"] += len(used)

    total = sum(sum(len(f) for f in p["f"]) for p in per_class.values())
    ratio = min(1.0, group["target_tris"] / max(total, 1))
    bm = bmesh.new()
    col = bm.loops.layers.float_color.new("Col")
    for cid, p in sorted(per_class.items()):
        V, F = np.concatenate(p["v"]), np.concatenate(p["f"])
        me = bpy.data.meshes.new(f"PLAY_t_{name}_{cid}")
        me.from_pydata(V.tolist(), [], F.tolist())
        me.update()
        tmp = bmesh.new(); tmp.from_mesh(me)
        bmesh.ops.remove_doubles(tmp, verts=tmp.verts, dist=0.002)
        tmp.to_mesh(me); tmp.free()
        ob = bpy.data.objects.new(me.name, me)
        scene.collection.objects.link(ob)
        if ratio < 1:
            d = ob.modifiers.new("dec", "DECIMATE"); d.ratio = ratio; d.use_collapse_triangulate = True
        dg2 = bpy.context.evaluated_depsgraph_get()
        low = ob.evaluated_get(dg2).to_mesh()
        start = len(bm.faces)
        offset = len(bm.verts)
        for vert in low.vertices:
            bm.verts.new(vert.co)
        bm.verts.ensure_lookup_table()
        for poly in low.polygons:
            try:
                bm.faces.new([bm.verts[offset + i] for i in poly.vertices])
            except ValueError:
                pass
        bm.faces.ensure_lookup_table()
        for f in bm.faces[start:]:
            for l in f.loops:
                l[col] = (cid / 4.0, 0, 0, 1)
        ob.evaluated_get(dg2).to_mesh_clear()
        bpy.data.objects.remove(ob); bpy.data.meshes.remove(me)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    me = bpy.data.meshes.new(f"PLAY_low_{name}")
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(me.name, me)
    scene.collection.objects.link(ob)
    print("@@target", json.dumps({"group": name, "source_tris": total, "tris": len(me.polygons)}), flush=True)
    return ob


def ground_target():
    b = cell["bounds"]
    nx, ny = max(2, int((b[2] - b[0]) / 8)), max(2, int((b[3] - b[1]) / 8))
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    col = bm.loops.layers.float_color.new("Col")
    grid = [[bm.verts.new((b[0] + (b[2] - b[0]) * i / nx, b[1] + (b[3] - b[1]) * j / ny, GZ + 0.02))
             for j in range(ny + 1)] for i in range(nx + 1)]
    for i in range(nx):
        for j in range(ny):
            f = bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
            for l in f.loops:
                l[uvl].uv = ((l.vert.co.x - b[0]) / (b[2] - b[0]), (l.vert.co.y - b[1]) / (b[3] - b[1]))
                l[col] = (0, 0, 0, 1)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    me = bpy.data.meshes.new("PLAY_low_ground")
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(me.name, me)
    scene.collection.objects.link(ob)
    return ob


def unwrap(ob, res):
    """Chart the low-poly mesh with xatlas. Blender's Smart UV shattered it into thousands of tiny
    islands, which bake as speckle. Runs in the exporter's own venv."""
    me = ob.data
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    v = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get("co", v); v = v.reshape(-1, 3)
    f = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get("vertices", f); f = f.reshape(-1, 3)
    tl = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get("loops", tl)
    attr = me.color_attributes.get("Col")
    c = np.empty(len(me.loops) * 4, np.float32); attr.data.foreach_get("color", c)
    face_class = c[::4][tl[::3]]
    tmp_in, tmp_out = os.path.join(out, "_uv_in.npz"), os.path.join(out, "_uv_out.npz")
    np.savez(tmp_in, v=v, f=f)
    r = subprocess.run([ATLAS_PY, ATLAS_SCRIPT, tmp_in, tmp_out, str(res)], capture_output=True, text=True)
    print(r.stdout.strip(), flush=True)
    if r.returncode != 0:
        raise RuntimeError("xatlas failed: " + r.stderr[-400:])
    with np.load(tmp_out) as d:  # closed at once: Windows will not delete an open file
        vmap, faces, uvs = d["vmap"].copy(), d["faces"].astype(np.int64), d["uvs"].copy()
    new = bpy.data.meshes.new(me.name + "_uv")
    new.from_pydata(v[vmap].tolist(), [], faces.tolist())
    new.update()
    uvl = new.uv_layers.new(name="UVMap")
    uvl.data.foreach_set("uv", uvs[faces.ravel()].astype(np.float32).ravel())
    col = new.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    rgba = np.zeros(len(faces) * 3 * 4, np.float32)
    rgba[0::4] = np.repeat(face_class, 3)
    rgba[3::4] = 1
    col.data.foreach_set("color", rgba)
    ob.data = new
    bpy.data.meshes.remove(me)
    for t in (tmp_in, tmp_out):
        os.remove(t)


def write_geometry(name, ob):
    me = ob.data
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    loops = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get("loops", loops)
    lv = np.empty(len(me.loops), np.int32); me.loops.foreach_get("vertex_index", lv)
    co = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    uv = np.empty(len(me.loops) * 2, np.float32); me.uv_layers[0].data.foreach_get("uv", uv); uv = uv.reshape(-1, 2)
    attr = me.color_attributes.get("Col")
    if attr is not None and len(attr.data) == len(me.loops):
        c = np.empty(len(me.loops) * 4, np.float32); attr.data.foreach_get("color", c); cls = np.rint(c[::4] * 4).astype(np.uint8)
    else:
        cls = np.zeros(len(me.loops), np.uint8)
    # One vertex per (position, uv, class) so seams survive.
    key = np.round(np.column_stack((lv[loops], uv[loops] * 65535, cls[loops]))).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.reshape(-1)
    pos = co[lv[loops[first]]]
    uvs = uv[loops[first]]
    kls = cls[loops[first]]
    idx = inv.astype(np.uint32)
    path = os.path.join(out, name + ".bin")
    with open(path, "wb") as f:
        f.write(pos.astype(np.float32).tobytes()); f.write(uvs.astype(np.float32).tobytes())
        f.write(kls.tobytes()); f.write(idx.tobytes())
    meta = {"vertices": int(len(pos)), "indices": int(len(idx)), "tris": int(len(idx) // 3),
            "min": pos.min(axis=0).round(3).tolist(), "max": pos.max(axis=0).round(3).tolist()}
    json.dump(meta, open(os.path.join(out, name + ".json"), "w"))
    print("@@geometry", json.dumps({"group": name, **meta}), flush=True)


PROCEDURAL = {"TEX_NOISE", "TEX_VORONOI", "TEX_WAVE", "TEX_MAGIC", "TEX_GRADIENT", "TEX_CHECKER", "TEX_BRICK"}


def rewire(mat, cache):
    """Copy a material so Generated and Object coordinates read the attributes kept on the joined mesh."""
    if mat is None:
        return None
    if mat.name in cache:
        return cache[mat.name]
    m = mat.copy()
    cache[mat.name] = m
    nt = m.node_tree
    if not nt:
        return m
    attrs = {}

    def attr(name):
        if name not in attrs:
            n = nt.nodes.new("ShaderNodeAttribute")
            n.attribute_type = "GEOMETRY"
            n.attribute_name = name
            attrs[name] = n
        return attrs[name].outputs["Vector"]

    for node in list(nt.nodes):
        if node.type == "TEX_COORD":
            for label, aname in (("Generated", "PLAY_gen"), ("Object", "PLAY_obj")):
                for link in list(node.outputs[label].links):
                    to = link.to_socket
                    nt.links.remove(link)
                    nt.links.new(attr(aname), to)
        elif node.type in PROCEDURAL and "Vector" in node.inputs and not node.inputs["Vector"].is_linked:
            nt.links.new(attr("PLAY_gen"), node.inputs["Vector"])
    return m


def make_hi(items, dg):
    """One joined source mesh. Selected-to-active costs pixels x objects, so a thousand separate
    sources would take hours. The original Generated and Object coordinates ride along as
    attributes, so procedural and box-mapped materials look the same after the join."""
    col = bpy.data.collections.new("PLAY_hi")
    scene.collection.children.link(col)
    meshes, objs = {}, []
    for src, mw, _owner in items:
        if src.name not in meshes:
            me = bpy.data.meshes.new_from_object(src.evaluated_get(dg))
            if not len(me.vertices):
                meshes[src.name] = None
                continue
            for i, slot in enumerate(src.material_slots):
                if i < len(me.materials):
                    me.materials[i] = slot.material
            co = np.empty(len(me.vertices) * 3, np.float32)
            me.vertices.foreach_get("co", co)
            co = co.reshape(-1, 3)
            loc, size = np.array(me.texspace_location), np.array(me.texspace_size)
            size = np.where(np.abs(size) < 1e-6, 1.0, size)
            gen = (co - (loc - size)) / (2 * size)
            for name, arr in (("PLAY_gen", gen), ("PLAY_obj", co)):
                at = me.attributes.new(name, "FLOAT_VECTOR", "POINT")
                at.data.foreach_set("vector", arr.astype(np.float32).ravel())
            meshes[src.name] = me
        if meshes[src.name] is None:
            continue
        h = bpy.data.objects.new("PLAY_hi_" + str(len(objs)), meshes[src.name])
        h.matrix_world = mw
        col.objects.link(h)
        objs.append(h)
    if not objs:
        return col, []
    objs[0].data = objs[0].data.copy()
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for h in objs:
        h.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    cache = {}
    for i, m in enumerate(joined.data.materials):
        joined.data.materials[i] = rewire(m, cache)
    for me in meshes.values():
        if me is not None and me.users == 0:
            bpy.data.meshes.remove(me)
    return col, [joined]


def bake(ob, hi, name, state, px, extrude=0.08, reach=0.25):
    mat = bpy.data.materials.new("PLAY_bake_" + name)
    mat.use_nodes = True
    node = mat.node_tree.nodes.new("ShaderNodeTexImage")
    mat.node_tree.nodes.active = node
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    b = scene.render.bake
    b.use_selected_to_active = True
    b.margin = 8
    b.margin_type = "EXTEND"
    b.target = "IMAGE_TEXTURES"
    b.use_clear = True
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for h in hi:
        h.select_set(True)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    timing = {}
    for kind, passes, spp, res in (("albedo", {"COLOR"}, 4, px), ("light", {"DIRECT", "INDIRECT"}, samples, max(128, px // 2))):
        img = bpy.data.images.new(f"PLAY_{name}_{state}_{kind}", res, res, float_buffer=True, alpha=True)
        img.colorspace_settings.name = "Non-Color"
        node.image = img
        scene.cycles.samples = spp
        t0 = time.time()
        bpy.ops.object.bake(type="DIFFUSE", pass_filter=passes, use_selected_to_active=True,
                            cage_extrusion=extrude, max_ray_distance=reach, margin=8)
        timing[kind] = round(time.time() - t0, 1)
        arr = np.empty(res * res * 4, np.float32)
        img.pixels.foreach_get(arr)
        np.save(os.path.join(out, f"{name}_{state}_{kind}.npy"), arr.reshape(res, res, 4).astype(np.float32))
        bpy.data.images.remove(img)
        print("@@baked", json.dumps({"group": name, "state": state, "kind": kind, "px": res, "seconds": timing[kind]}), flush=True)
    return timing


def render_ground(state, g, px):
    """The ground is flat, so it is rendered straight down with everything else invisible to the
    camera but still casting its shadow. Cleaner and faster than a bake, and denoised."""
    b = cell["bounds"]
    prefixes = tuple(g["sources"][state])
    changed = []
    for o in bpy.data.objects:
        # Meshes only: an instancer's flag also applies to everything it instances, ground included.
        if o.type != "MESH" or o.name.startswith(prefixes):
            continue
        if o.visible_camera:
            o.visible_camera = False
            changed.append(o)
    cam_d = bpy.data.cameras.new("PLAY_top")
    cam_d.type = "ORTHO"
    w, h = b[2] - b[0], b[3] - b[1]
    cam_d.ortho_scale = max(w, h)
    cam_d.clip_start = 0.1
    cam_d.clip_end = 400
    cam = bpy.data.objects.new("PLAY_top", cam_d)
    scene.collection.objects.link(cam)
    cam.location = ((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, 120)
    cam.rotation_euler = (0, 0, 0)
    prev = (scene.camera, scene.render.resolution_x, scene.render.resolution_y, scene.render.pixel_aspect_x,
            scene.render.pixel_aspect_y, scene.render.film_transparent, scene.cycles.use_denoising,
            scene.render.image_settings.file_format, scene.render.filepath)
    scene.camera = cam
    # The image has the ground's own proportions, in multiples of four for texture compression.
    res_x = px if w >= h else int(round(px * w / h / 4)) * 4
    res_y = px if h >= w else int(round(px * h / w / 4)) * 4
    scene.render.resolution_x, scene.render.resolution_y = res_x, res_y
    scene.render.resolution_percentage = 100
    scene.render.pixel_aspect_x = scene.render.pixel_aspect_y = 1
    scene.render.film_transparent = True
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.image_settings.file_format = "OPEN_EXR"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "32"
    path = os.path.join(out, f"ground_{state}.exr")
    scene.render.filepath = path
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path)
    arr = np.empty(res_x * res_y * 4, np.float32)
    img.pixels.foreach_get(arr)
    np.save(os.path.join(out, f"ground_{state}_beauty.npy"), arr.reshape(res_y, res_x, 4))
    bpy.data.images.remove(img)
    os.remove(path)
    (scene.camera, scene.render.resolution_x, scene.render.resolution_y, scene.render.pixel_aspect_x,
     scene.render.pixel_aspect_y, scene.render.film_transparent, scene.cycles.use_denoising,
     scene.render.image_settings.file_format, scene.render.filepath) = prev
    bpy.data.objects.remove(cam)
    bpy.data.cameras.remove(cam_d)
    for o in changed:
        o.visible_camera = True
    print("@@baked", json.dumps({"group": "ground", "state": state, "kind": "beauty", "px": px,
                                 "seconds": round(time.time() - t0, 1)}), flush=True)


def apply_state(name):
    base = site.get("base", {}); st = site["states"][name]
    C.set_collections(scene, hide=base.get("hide", []) + st.get("hide", []), show=st.get("show", []))
    prefixes = tuple(base.get("objhide", []) + st.get("objhide", []))
    if prefixes:
        for o in bpy.data.objects:
            if o.name.startswith(prefixes):
                o.hide_render = True
    for mname, spec in st.get("materials", {}).items():
        if not bpy.data.materials.get(mname):
            C.make_pbr(mname, spec)
    C.swap_materials(st.get("matswap", {}))
    if st.get("haze") and not bpy.data.objects.get("PLAY_haze"):
        C.add_haze(st["haze"])


print("@@scatter_hidden", hide_scatter(), flush=True)
# Scene shells (a horizon plane coplanar with the fort's ground, a sky dome) are for the film only.
# Left in, the plane shadows every surface it touches and the ground bakes black.
_shells = 0
for o in bpy.data.objects:
    if o.name.startswith(tuple(cfg.get("bake_no_ray", []))):
        for flag in ("visible_camera", "visible_shadow", "visible_diffuse", "visible_glossy", "visible_transmission", "visible_volume_scatter"):
            setattr(o, flag, False)
        _shells += 1
print("@@shells_off", _shells, flush=True)
json.dump({"exposure": 2 ** scene.view_settings.exposure, "view_transform": scene.view_settings.view_transform},
          open(os.path.join(out, "meta.json"), "w"))
C.set_collections(scene, hide=cfg.get("bake_hide_collections", []))

targets = {}
state_groups = {}
for gname, g in cell["groups"].items():
    if gname not in groups_wanted:
        continue
    items, dg = group_sources(g)
    ob = build_target(gname, g, items, dg)
    unwrap(ob, g["atlas"])
    write_geometry(gname, ob)
    targets[gname] = (ob, g, items)
if "ground" in groups_wanted:
    ob = ground_target()
    write_geometry("ground", ob)
    targets["ground"] = (ob, cell["ground"], None)

if geometry_only:
    print("WORLD_BUILD_DONE geometry", flush=True)
    sys.exit(0)

for _ob, _g, _i in targets.values():
    _ob.visible_shadow = False
    _ob.visible_camera = False
    _ob.visible_diffuse = False
    _ob.visible_glossy = False

for state in states_wanted:
    apply_state(state)
    C.set_collections(scene, hide=cfg.get("bake_hide_collections", []))
    dg = bpy.context.evaluated_depsgraph_get()
    for gname, (ob, g, _items) in targets.items():
        if state not in g.get("states", ["then"]):
            continue
        px = max(64, int(g["atlas"] * scale))
        if gname == "ground":
            ob.hide_render = True
            render_ground(state, g, px)
            dg = bpy.context.evaluated_depsgraph_get()
            continue
        live, dg = group_sources(g)
        extra = tuple(g.get("extra", {}).get(state, []))
        if extra:
            live += [(o, o.matrix_world.copy(), o) for o in bpy.data.objects
                     if o.type == "MESH" and o.name.startswith(extra) and not o.hide_render]
        extrude, reach = 0.08, 0.25
        col, hi = make_hi(live, dg)
        if not hi:
            print("@@skipped", json.dumps({"group": gname, "state": state}), flush=True)
            continue
        owners = {o for _s, _m, o in live}
        was = {o: o.hide_render for o in owners}
        for o in owners:
            o.hide_render = True
        bake(ob, hi, gname, state, px, extrude, reach)
        for o, v in was.items():
            o.hide_render = v
        for h in hi:
            me = h.data
            bpy.data.objects.remove(h)
            if me.users == 0:
                bpy.data.meshes.remove(me)
        bpy.data.collections.remove(col)
        dg = bpy.context.evaluated_depsgraph_get()

print("WORLD_BUILD_DONE", flush=True)
