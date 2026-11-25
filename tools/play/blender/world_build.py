"""Build one open-world cell: low-poly targets, UVs, and Cycles bakes of albedo and light.

blender -b <scene.blend> --python tools/play/blender/world_build.py -- \
    --world tools/play/worlds/<slug>.json --cell court --out <dir> \
    --groups palace,near,far,ground --states then,now [--scale 1.0] [--samples 96] [--device GPU|CPU] [--geometry-only]

Read-only on the .blend: every change is in memory and nothing here saves the file.
Writes <out>/<group>.bin + <group>.json (geometry) and <group>_<state>_{albedo,light}.npy.
"""
import base64, bpy, bmesh, hashlib, json, math, os, re, subprocess, sys, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
import world_edits as E

a = C.parse_kv(C.argv_after_dashes())
cfg = json.load(open(a["world"], encoding="utf-8"))
site = json.load(open(cfg["site"], encoding="utf-8"))
cell = cfg["cells"][a["cell"]]
out = a["out"]
os.makedirs(out, exist_ok=True)
groups_wanted = a.get("groups", "palace,near,far,ground").split(",")
# The scene as saved is the past. Today is derived from it by swaps that are never undone, so the
# past always bakes first, whatever order the states were asked for in.
states_wanted = sorted(a.get("states", "then,now").split(","), key=lambda s: s != "then")
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
    b = group.get("clip_bounds", cell["bounds"])
    classes = group.get("classes", [])
    cache, per_class = {}, {}
    for src, mw, _owner in items:
        v, t, mi, mats = mesh_arrays(src, dg, cache)
        if not len(t):
            continue
        M = np.array(mw, np.float64)
        w = v @ M[:3, :3].T + M[:3, 3]
        if np.linalg.det(M[:3, :3]) < 0:
            t = t[:, ::-1]  # a mirrored copy: same triangles, wound the other way round
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
    simplify = total > group["target_tris"]
    # Flat surfaces first: merging coplanar faces changes no shape at all. Then each connected piece
    # is sorted. A blanket collapse pulled big walls through their own thickness, so a wall face ended
    # up buried inside the wall and baked black. Large plain pieces are now kept exactly as they are,
    # and only small detail (carving, balusters) is simplified to meet the budget.
    # Opt in per group (the palace): a distant group with a tight budget simplifies everything.
    keep_m = float(group.get("keep_piece_m", math.inf))
    keep_density = float(group.get("keep_piece_tris_per_m2", 40))
    parts = []
    stages = {}
    for cid, p in sorted(per_class.items()):
        V, F = np.concatenate(p["v"]), np.concatenate(p["f"])
        me = bpy.data.meshes.new(f"PLAY_t_{name}_{cid}")
        me.from_pydata(V.tolist(), [], F.tolist())
        me.update()
        tmp = bmesh.new(); tmp.from_mesh(me)
        n_in = len(tmp.faces)
        bmesh.ops.remove_doubles(tmp, verts=tmp.verts, dist=0.002)
        n_welded = len(tmp.faces)
        # Merging coplanar faces is opt-in (the palace). On clipped ground with holes in it, the merged
        # faces triangulate into long spikes through the ground, which baked as black wedges.
        if simplify and group.get("planar_merge"):
            bmesh.ops.dissolve_limit(tmp, angle_limit=math.radians(0.5), use_dissolve_boundaries=False,
                                     verts=list(tmp.verts), edges=list(tmp.edges))
            bmesh.ops.triangulate(tmp, faces=list(tmp.faces))
        tmp.verts.ensure_lookup_table(); tmp.verts.index_update()
        co = np.array([v.co[:] for v in tmp.verts], np.float64).reshape(-1, 3)
        rows = [[v.index for v in f.verts] for f in tmp.faces]
        sides = np.array([len(r) for r in rows], np.int64)
        if len(rows) and (sides != 3).any():
            raise RuntimeError(f"{name} class {cid}: {int((sides != 3).sum())} faces are not triangles after triangulate")
        tris = np.array(rows, np.int64).reshape(-1, 3)
        stages[cid] = {"in": n_in, "welded": n_welded, "planar": len(tris)}
        tmp.free()
        bpy.data.meshes.remove(me)
        root = np.arange(len(co))

        def find(x):
            while root[x] != x:
                root[x] = root[root[x]]
                x = root[x]
            return x

        for a_, b_, c_ in tris.tolist():
            ra = find(a_)
            root[find(b_)] = ra
            root[find(c_)] = ra
        labels = np.array([find(i) for i in range(len(co))], np.int64)
        tri_label = labels[tris[:, 0]]
        tri_area = np.linalg.norm(np.cross(co[tris[:, 1]] - co[tris[:, 0]], co[tris[:, 2]] - co[tris[:, 0]]), axis=1) / 2
        order = np.argsort(tri_label)
        ids, first, counts = np.unique(tri_label[order], return_index=True, return_counts=True)
        whole = np.zeros(len(tris), bool)
        pieces = []
        for start_at, n in zip(first.tolist(), counts.tolist()):
            which = order[start_at:start_at + n]
            pts = co[tris[which].ravel()]
            diag = float(np.linalg.norm(pts.max(axis=0) - pts.min(axis=0)))
            if diag >= keep_m and n / max(float(tri_area[which].sum()), 1e-6) < keep_density:
                whole[which] = True
            else:
                pieces.append((which, diag))
        parts.append((cid, co, tris, whole, pieces))
        stages[cid].update({"pieces": int(len(ids)), "whole_tris": int(whole.sum())})
    print("@@stages", json.dumps({"group": name, "by_class": stages}), flush=True)
    kept = sum(int(w.sum()) for _c, _v, _t, w, _p in parts)
    detail = sum(len(_t) - int(w.sum()) for _c, _v, _t, w, _p in parts)
    # Each piece of detail is simplified on its own. One collapse over all of them together measured
    # error in metres, so small pieces (finials, balusters) were the cheapest to remove and went first,
    # down to two shards each. Every piece keeps at least a floor of triangles, and the rest of the
    # budget is shared out in proportion.
    # The floor grows with the piece: at 64, a 1 m finial keeps 64 triangles and a 0.3 m peg about 19.
    # A group asks for one with detail_floor_tris; without it every piece just takes the same share.
    floor = int(group.get("detail_floor_tris", 0))
    sizes = np.array([len(w) for _c, _v, _t, _w, ps in parts for w, _d in ps], np.float64)
    floors = np.array([min(max(round(floor * dg), 12), floor) for _c, _v, _t, _w, ps in parts for _w2, dg in ps], np.float64)
    budget = max(group["target_tris"] - kept, 0)

    def share(r):
        return np.minimum(sizes, np.maximum(r * sizes, floors))
    lo_r, hi_r = 0.0, 1.0
    if not simplify or share(1.0).sum() <= budget:
        lo_r = 1.0
    else:
        for _ in range(40):
            mid = (lo_r + hi_r) / 2
            lo_r, hi_r = (mid, hi_r) if share(mid).sum() <= budget else (lo_r, mid)
    ratio = lo_r
    piece_ratio = iter((share(ratio) / np.maximum(sizes, 1)).tolist())
    bm = bmesh.new()
    col = bm.loops.layers.float_color.new("Col")

    def add_faces(cid, verts, faces):
        offset = len(bm.verts)
        start = len(bm.faces)
        for x in verts:
            bm.verts.new(x)
        bm.verts.ensure_lookup_table()
        for f in faces:
            try:
                bm.faces.new([bm.verts[offset + int(i)] for i in f])
            except ValueError:
                pass
        bm.faces.ensure_lookup_table()
        for f in bm.faces[start:]:
            for l in f.loops:
                l[col] = (cid / 4.0, 0, 0, 1)

    temp = []
    for cid, co, tris, whole, pieces in parts:
        if whole.any():
            used, inv = np.unique(tris[whole], return_inverse=True)
            add_faces(cid, co[used].tolist(), inv.reshape(-1, 3).tolist())
        # Without a floor (distant groups) the detail of a class is simplified as one mesh, as before:
        # crushing small pieces first is what a far layer wants, and it meets the budget.
        batches = [(np.concatenate([w for w, _d in pieces]), _) for _ in [None]] if pieces and not floor else pieces
        for which, _diag in batches:
            r = ratio if not floor else next(piece_ratio)
            used, inv = np.unique(tris[which], return_inverse=True)
            if r >= 0.999:
                add_faces(cid, co[used].tolist(), inv.reshape(-1, 3).tolist())
                continue
            me = bpy.data.meshes.new(f"PLAY_d_{name}_{cid}")
            me.from_pydata(co[used].tolist(), [], inv.reshape(-1, 3).tolist())
            me.update()
            ob = bpy.data.objects.new(me.name, me)
            scene.collection.objects.link(ob)
            d = ob.modifiers.new("dec", "DECIMATE"); d.ratio = r; d.use_collapse_triangulate = True
            temp.append((cid, ob))
    if temp:
        dg2 = bpy.context.evaluated_depsgraph_get()  # once for every piece: each call evaluates the whole scene
        for cid, ob in temp:
            ev = ob.evaluated_get(dg2)
            low = ev.to_mesh()
            add_faces(cid, [v.co.copy() for v in low.vertices], [list(q.vertices) for q in low.polygons])
            ev.to_mesh_clear()
        for _cid, ob in temp:
            me = ob.data
            bpy.data.objects.remove(ob); bpy.data.meshes.remove(me)
    print("@@simplify", json.dumps({"group": name, "kept_whole_tris": kept, "detail_tris": detail, "detail_ratio": round(ratio, 3), "floor": floor,
                                    "pieces": len(sizes), "simplified_pieces": len(temp),
                                    "faces_added": len(bm.faces)}), flush=True)
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    me = bpy.data.meshes.new(f"PLAY_low_{name}")
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(me.name, me)
    scene.collection.objects.link(ob)
    print("@@target", json.dumps({"group": name, "source_tris": total, "tris": len(me.polygons)}), flush=True)
    return ob


def terrain_sampler():
    """Bilinear lookup into the map's height raster, or the flat ground if none was built."""
    path = os.path.join(TOOLS, "out", "world", "terrain.npz")
    if not os.path.exists(path):
        return lambda x, y: GZ
    with np.load(path) as d:
        h, x0, y0, step = d["h"].copy(), float(d["x0"]), float(d["y0"]), float(d["step"])

    def at(x, y):
        fx = np.clip((x - x0) / step, 0, h.shape[1] - 1.001)
        fy = np.clip((y - y0) / step, 0, h.shape[0] - 1.001)
        i, j = int(fx), int(fy)
        tx, ty = fx - i, fy - j
        return float(h[j, i] * (1 - tx) * (1 - ty) + h[j, i + 1] * tx * (1 - ty) + h[j + 1, i] * (1 - tx) * ty + h[j + 1, i + 1] * tx * ty)
    return at


def ground_target():
    """The ground as a height grid. Its UVs are its plan position, which is how the straight-down
    render maps onto it. pack_world.mjs merges the flat parts."""
    b = cell["bounds"]
    step = float(cell["ground"].get("grid", 4))
    nx, ny = max(2, int(round((b[2] - b[0]) / step))), max(2, int(round((b[3] - b[1]) / step)))
    height = terrain_sampler()
    bm = bmesh.new()
    grid = [[None] * (ny + 1) for _ in range(nx + 1)]
    for i in range(nx + 1):
        for j in range(ny + 1):
            x, y = b[0] + (b[2] - b[0]) * i / nx, b[1] + (b[3] - b[1]) * j / ny
            grid[i][j] = bm.verts.new((x, y, height(x, y) + 0.02))
    for i in range(nx):
        for j in range(ny):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    bmesh.ops.triangulate(bm, faces=bm.faces)
    uvl = bm.loops.layers.uv.new("UVMap")
    col = bm.loops.layers.float_color.new("Col")
    for f in bm.faces:
        for l in f.loops:
            l[uvl].uv = ((l.vert.co.x - b[0]) / (b[2] - b[0]), (l.vert.co.y - b[1]) / (b[3] - b[1]))
            l[col] = (0, 0, 0, 1)
    me = bpy.data.meshes.new("PLAY_low_ground")
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(me.name, me)
    scene.collection.objects.link(ob)
    return ob


def reach_cells():
    """Every one-metre cell the player can stand on, from the reach map, as (x, y) arrays."""
    path = os.path.join(TOOLS, "worlds", f"{cfg['slug']}.reach.json")
    if not os.path.exists(path):
        return None
    r = json.load(open(path))
    bits = np.zeros(r["nx"] * r["ny"], np.uint8)
    at, on, run, shift = 0, 0, 0, 0
    for b in base64.b64decode(r["rle"]):
        run |= (b & 127) << shift
        shift += 7
        if b & 128:
            continue
        if on:
            bits[at:at + run] = 1
        at += run
        on, run, shift = 1 - on, 0, 0
    j, i = np.nonzero(bits.reshape(r["ny"], r["nx"]))
    return r["x0"] + (i + 0.5) * r["step"], r["y0"] + (j + 0.5) * r["step"]


def player_eyes(bounds, step, heights):
    """Points a player's eye can be at inside the bounds, from the reach map."""
    cells = reach_cells()
    if cells is None:
        return None
    xs, ys = cells
    keep = (xs >= bounds[0]) & (xs <= bounds[2]) & (ys >= bounds[1]) & (ys <= bounds[3])
    xs, ys = xs[keep], ys[keep]
    if not len(xs):
        return None
    _, first = np.unique(np.floor(xs / step) + np.floor(ys / step) * 100000, return_index=True)
    height = terrain_sampler()
    return np.array([(x, y, height(x, y) + h) for x, y in zip(xs[first], ys[first]) for h in heights], np.float64)


SKY_DIRS = np.array([(math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e))
                     for e, count in ((0.12, 8), (0.55, 6), (1.05, 4), (1.57, 1))
                     for a in np.linspace(0, math.tau, count, endpoint=False)], np.float64)


def face_sides(ob, eyes, tests=20):
    """For each triangle, can its front and its back be seen, from the open sky or a player's eye?"""
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
    me = ob.data
    me.calc_loop_triangles()
    co = np.empty(len(me.vertices) * 3, np.float64); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    tri = np.empty(len(me.loop_triangles) * 3, np.int32); me.loop_triangles.foreach_get("vertices", tri); tri = tri.reshape(-1, 3)
    tree = BVHTree.FromPolygons([tuple(x) for x in co.tolist()], [tuple(t) for t in tri.tolist()], all_triangles=True)
    p = co[tri]
    normals = np.cross(p[:, 1] - p[:, 0], p[:, 2] - p[:, 0])
    area = np.linalg.norm(normals, axis=1) / 2
    normals /= np.maximum(area[:, None] * 2, 1e-12)
    key = hashlib.sha1(b"sides3" + co.tobytes() + tri.tobytes() + (b"" if eyes is None else eyes.tobytes())).hexdigest()[:16]
    cache_dir = os.path.join(TOOLS, "out", "world", "_sides")
    cache = os.path.join(cache_dir, key + ".npz")
    if os.path.exists(cache):
        with np.load(cache) as d:
            return d["front"].copy(), d["back"].copy(), area, d["buried"].copy()
    rng = np.random.default_rng(11)
    spots = ((1 / 3, 1 / 3, 1 / 3), (0.7, 0.15, 0.15), (0.15, 0.7, 0.15), (0.15, 0.15, 0.7))

    def open_side(k, n):
        """2 if a player's eye can see this side, 1 if only the sky can, 0 if nothing can."""
        sky = False
        for w in spots:
            c = p[k, 0] * w[0] + p[k, 1] * w[1] + p[k, 2] * w[2] + n * 0.03
            origin = Vector(c)
            if eyes is not None:
                to = eyes - c
                dist = np.linalg.norm(to, axis=1)
                front = np.flatnonzero((to @ n) > 0.05 * dist)
                if len(front):
                    near = front[np.argsort(dist[front])[:tests // 2]]
                    spread = rng.choice(front, min(tests // 2, len(front)), replace=False)
                    for e in np.unique(np.concatenate((near, spread))):
                        if tree.ray_cast(origin, Vector(to[e] / dist[e]), float(dist[e]))[0] is None:
                            return 2
            if not sky:
                sky = any(tree.ray_cast(origin, Vector(d))[0] is None for d in SKY_DIRS[(SKY_DIRS @ n) > 0.1])
        return 1 if sky else 0

    front, back = np.zeros(len(tri), np.uint8), np.zeros(len(tri), np.uint8)
    for k in range(len(tri)):
        if area[k] < 1e-8:
            continue
        front[k] = open_side(k, normals[k])
        if front[k] < 2:
            back[k] = open_side(k, -normals[k])
    # Seen from neither side, like a ceiling deep in a hall: the open side is the one with room in
    # front of it. The other looks into the solid and hits something at once.
    fan = np.array([(math.cos(a) * math.sin(t), math.sin(a) * math.sin(t), math.cos(t))
                    for t in (0.0, 0.6, 1.1) for a in np.linspace(0, math.tau, 6, endpoint=False)], np.float64)

    def room(k, n):
        u = np.cross(n, (0.0, 0.0, 1.0) if abs(n[2]) < 0.9 else (1.0, 0.0, 0.0))
        u /= np.linalg.norm(u)
        v = np.cross(n, u)
        c = p[k].mean(axis=0) + n * 0.03
        origin = Vector(c)
        total = 0.0
        for d in fan:
            hit = tree.ray_cast(origin, Vector(u * d[0] + v * d[1] + n * d[2]), 4.0)
            total += 4.0 if hit[0] is None else hit[3]
        return total

    # Buried: seen by nothing and with no room on either side (inside a column, between stacked
    # slabs). The 18 rays of the fan average under half a metre before they hit something.
    buried = np.zeros(len(tri), bool)
    for k in np.flatnonzero((front == 0) & (back == 0) & (area > 1e-8)):
        r_front, r_back = room(k, normals[k]), room(k, -normals[k])
        if r_back > r_front * 1.5:
            back[k] = 1
        buried[k] = max(r_front, r_back) < 0.5 * len(fan)
    os.makedirs(cache_dir, exist_ok=True)
    np.savez(cache, front=front, back=back, buried=buried)
    return front, back, area, buried


def orient_faces(name, ob, eyes, drop_buried=False):
    """Turn every face that points into solid so it points out. A selected-to-active bake casts along
    the face normal, so a face wound the wrong way reads the inside of the wall and bakes black."""
    t0 = time.time()
    front, back, area, buried = face_sides(ob, eyes)
    flip = back > front
    if flip.any():
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        bm.faces.ensure_lookup_table()
        bmesh.ops.reverse_faces(bm, faces=[bm.faces[i] for i in np.flatnonzero(flip)], flip_multires=False)
        bm.to_mesh(ob.data)
        bm.free()
        ob.data.update()
    seen = (front == 2) | (back == 2)  # what a player can actually look at
    dropped = 0
    if drop_buried and buried.any():
        # Nobody can see these and nothing can reach them: they cost bytes on every phone and texels.
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        bm.faces.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[bm.faces[i] for i in np.flatnonzero(buried)], context="FACES_ONLY")
        loose = [v for v in bm.verts if not v.link_faces]
        bmesh.ops.delete(bm, geom=loose, context="VERTS")
        bm.to_mesh(ob.data)
        bm.free()
        ob.data.update()
        dropped = int(buried.sum())
    print("@@oriented", json.dumps({"group": name, "tris": len(area), "flipped": int(flip.sum()),
                                    "flipped_m2": round(float(area[flip].sum()), 1), "seen_tris": int(seen.sum()),
                                    "seen_m2": round(float(area[seen].sum()), 1), "total_m2": round(float(area.sum()), 1),
                                    "buried_dropped": dropped, "seconds": round(time.time() - t0, 1)}), flush=True)
    return seen[~buried] if dropped else seen


def unwrap(ob, res, scale=None):
    """Chart the low-poly mesh with xatlas. Blender's Smart UV shattered it into thousands of tiny
    islands, which bake as speckle. A face's scale sets its share of the atlas. Runs in the
    exporter's own venv."""
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
    if scale is not None:
        np.savez(tmp_in, v=v, f=f, scale=scale)
    else:
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

    # The diffuse colour pass of a metal is black, and the bake has no reflections to make up for it.
    # Gilding keeps its base colour as a flat paint.
    for node in nt.nodes:
        if node.type == "BSDF_PRINCIPLED" and "Metallic" in node.inputs:
            metal = node.inputs["Metallic"]
            for link in list(metal.links):
                nt.links.remove(link)
            metal.default_value = 0.0
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


def light_shell(ob, mat, push=0.04):
    """A copy of the low mesh, each triangle moved a little off the surface along its own normal.
    Light is baked on this and not selected-to-active. Cycles shades a source face only on the side
    its normal points to, and many sources are thin sheets or wound inward, so they baked the wrong
    side: black under the eaves, or sunlit where no sun reaches. The low mesh's faces already point
    at the side a player sees, so the light is measured there, with the sources as occluders."""
    me = ob.data
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    loops = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get("loops", loops)
    lv = np.empty(len(me.loops), np.int32); me.loops.foreach_get("vertex_index", lv)
    co = np.empty(len(me.vertices) * 3, np.float64); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    uv = np.empty(len(me.loops) * 2, np.float32); me.uv_layers[0].data.foreach_get("uv", uv); uv = uv.reshape(-1, 2)
    p = co[lv[loops]].reshape(-1, 3, 3)
    n = np.cross(p[:, 1] - p[:, 0], p[:, 2] - p[:, 0])
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    moved = (p + n[:, None, :] * push).reshape(-1, 3)
    shell = bpy.data.meshes.new("PLAY_light_shell")
    shell.from_pydata(moved.tolist(), [], np.arange(nt * 3).reshape(-1, 3).tolist())
    shell.update()
    layer = shell.uv_layers.new(name="UVMap")
    layer.data.foreach_set("uv", uv[loops].ravel())
    shell.materials.append(mat)
    o = bpy.data.objects.new("PLAY_light_shell", shell)
    scene.collection.objects.link(o)
    o.visible_shadow = False
    o.visible_diffuse = False
    o.visible_glossy = False
    o.visible_transmission = False
    o.visible_volume_scatter = False
    return o


def bake(ob, hi, name, state, px, extrude=0.08, reach=0.25, spp=None, light_scale=0.5):
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
    for kind, passes, spp, res in (("albedo", {"COLOR"}, 4, px), ("light", {"DIRECT", "INDIRECT"}, spp or samples, max(128, int(px * light_scale)))):
        img = bpy.data.images.new(f"PLAY_{name}_{state}_{kind}", res, res, float_buffer=True, alpha=True)
        img.colorspace_settings.name = "Non-Color"
        node.image = img
        scene.cycles.samples = spp
        t0 = time.time()
        if kind == "albedo":
            bpy.ops.object.bake(type="DIFFUSE", pass_filter=passes, use_selected_to_active=True,
                                cage_extrusion=extrude, max_ray_distance=reach, margin=8)
        else:
            shell = light_shell(ob, mat)
            for o in bpy.context.selected_objects:
                o.select_set(False)
            shell.select_set(True)
            bpy.context.view_layer.objects.active = shell
            b.use_selected_to_active = False
            bpy.ops.object.bake(type="DIFFUSE", pass_filter=passes, use_selected_to_active=False, margin=8)
            b.use_selected_to_active = True
            shell_mesh = shell.data
            bpy.data.objects.remove(shell)
            bpy.data.meshes.remove(shell_mesh)
            for h in hi:
                h.select_set(True)
            ob.select_set(True)
            bpy.context.view_layer.objects.active = ob
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
        # An instancer's flag also applies to everything it instances, so one is only hidden when
        # no ground source is inside it. Trees are instanced, and must not be drawn on the ground.
        if o.type == "EMPTY" and o.instance_type == "COLLECTION" and o.instance_collection:
            if any(k.name.startswith(prefixes) for k in o.instance_collection.all_objects):
                continue
        elif o.type != "MESH" or o.name.startswith(prefixes):
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
print("@@edits", json.dumps(E.apply(cfg)), flush=True)
# Nothing that is never exported may leave its shadow in a bake either.
for _o in bpy.data.objects:
    if _o.name.startswith(NEVER) and _o.type == "MESH":
        _o.hide_render = True
# Scene shells (a horizon plane coplanar with the fort's ground, a sky dome) are for the film only.
# Left in, the plane shadows every surface it touches and the ground bakes black.
_shells = 0
for o in bpy.data.objects:
    if o.name.startswith(tuple(cfg.get("bake_no_ray", []))):
        for flag in ("visible_camera", "visible_shadow", "visible_diffuse", "visible_glossy", "visible_transmission", "visible_volume_scatter"):
            setattr(o, flag, False)
        _shells += 1
print("@@shells_off", _shells, flush=True)
_sun = C.split_sky_sun(scene, out, a.get("device", "GPU"))
print("@@sun", json.dumps(_sun), flush=True)
json.dump({"exposure": 2 ** scene.view_settings.exposure, "view_transform": scene.view_settings.view_transform,
           "look": scene.view_settings.look, "display": scene.display_settings.display_device, "sun": _sun},
          open(os.path.join(out, "meta.json"), "w"))
# The scene's own view transform as a table, so compose_world.py tone maps exactly as Blender does.
_lut = C.view_lut(scene)
np.savez(os.path.join(out, "view_lut.npz"), **_lut)
np.savez(os.path.join(TOOLS, "out", "world", "view_lut.npz"), **_lut)
print("@@view_lut", json.dumps({k: str(v) for k, v in _lut.items() if k != "table"}), flush=True)
C.set_collections(scene, hide=cfg.get("bake_hide_collections", []))

targets = {}
state_groups = {}
group_eyes = {}
for gname, g in cell["groups"].items():
    if gname not in groups_wanted:
        continue
    items, dg = group_sources(g)
    ob = build_target(gname, g, items, dg)
    if a.get("target-only"):
        # The low mesh as it leaves build_target, for checking the simplification without the slow steps.
        _co = np.empty(len(ob.data.vertices) * 3, np.float32); ob.data.vertices.foreach_get("co", _co)
        ob.data.calc_loop_triangles()
        _t = np.empty(len(ob.data.loop_triangles) * 3, np.int32); ob.data.loop_triangles.foreach_get("vertices", _t)
        np.savez(os.path.join(out, f"{gname}_target.npz"), v=_co.reshape(-1, 3), f=_t.reshape(-1, 3))
        continue
    focus = g.get("uv_focus")
    if focus:
        eyes = player_eyes(focus["bounds"], focus.get("step", 3), focus.get("heights", [1.6, 3.4]))
    else:
        co = np.empty(len(ob.data.vertices) * 3, np.float64); ob.data.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
        eyes = player_eyes([co[:, 0].min() - 30, co[:, 1].min() - 30, co[:, 0].max() + 30, co[:, 1].max() + 30], 12, [1.6])
    group_eyes[gname] = eyes
    seen = orient_faces(gname, ob, eyes, bool(g.get("drop_buried")))
    # Most of the palace's surface is the hidden tops and undersides of its stacked slabs. An even
    # unwrap spent the atlas on them, so faces nobody can see get a small share.
    texels = np.where(seen, 1.0, float(focus.get("hidden", 0.2))).astype(np.float32) if focus else None
    unwrap(ob, g["atlas"], texels)
    write_geometry(gname, ob)
    targets[gname] = (ob, g, items)
if "ground" in groups_wanted:
    ob = ground_target()
    write_geometry("ground", ob)
    targets["ground"] = (ob, cell["ground"], None)

if geometry_only or a.get("target-only"):
    print("WORLD_BUILD_DONE geometry", flush=True)
    sys.exit(0)

for _ob, _g, _i in targets.values():
    _ob.visible_shadow = False
    _ob.visible_camera = False
    _ob.visible_diffuse = False
    _ob.visible_glossy = False

for state in states_wanted:
    apply_state(state)
    C.set_collections(scene, hide=cfg.get("bake_hide_collections", []) + ([E.ADDED] if state == "now" else []))
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
        # A group can bake against more than it keeps, so its neighbours still cast their shadows.
        live, dg = group_sources({**g, "match": g["hi_match"]} if g.get("hi_match") else g)
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
        bake(ob, hi, gname, state, px, extrude, reach, int(samples * float(g.get("sample_scale", 1))),
             float(g.get("light_scale", 0.5)))
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
