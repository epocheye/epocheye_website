"""Game edits to the fort, applied in memory after the source scene loads. Nothing here is saved.

Driven by the "edits" block of the world config, so it holds no site-specific values:
  remove_faces  faces of an object by material (a gate's closed doors)
  passages      an arched opening cut through named walls, lined with stone
  walk_strips   a walking surface between the top edges of two walls
  ramps         a ramp up the face of a wall
  causeways     a raised road along a ribbon, so it can cross a ditch

Every object made here goes in the collection PLAY_added.
"""
import math

import bmesh
import bpy
import numpy as np

ADDED = "PLAY_added"
# The fort is a collection instance, so an object's own matrix is not where it renders.
_placed = {}


def _collection():
    c = bpy.data.collections.get(ADDED)
    if c is None:
        c = bpy.data.collections.new(ADDED)
        bpy.context.scene.collection.children.link(c)
    return c


def _find(prefix):
    return [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith(prefix)]


def _make(name, verts, faces, material):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(map(float, v)) for v in verts], [], faces)
    me.update()
    m = bpy.data.materials.get(material)
    if m is None:
        raise RuntimeError(f"edit {name}: no material {material}")
    me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    _collection().objects.link(ob)
    return ob


def _matrix(o):
    return _placed.get(o.name, o.matrix_world)


def _world_verts(o):
    M = np.array(_matrix(o), np.float64)
    n = len(o.data.vertices)
    v = np.empty(n * 3, np.float64)
    o.data.vertices.foreach_get("co", v)
    return v.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]


def remove_faces(spec):
    done = 0
    for o in _find(spec["object"]):
        slots = {i for i, s in enumerate(o.material_slots) if s.material and s.material.name.startswith(spec["material"])}
        bm = bmesh.new()
        bm.from_mesh(o.data)
        kill = [f for f in bm.faces if f.material_index in slots]
        done += len(kill)
        bmesh.ops.delete(bm, geom=kill, context="FACES")
        bm.to_mesh(o.data)
        bm.free()
        o.data.update()
    if not done:
        raise RuntimeError(f"remove_faces found nothing for {spec}")
    return done


def keep_inside(spec):
    """Deletes the faces of an object that lie outside a wall's closed loop."""
    ring = _world_verts(_find(spec["wall"])[0])
    ring = ring[np.abs(ring[:, 2] - spec["wall_z"]) < 0.02][:, :2]
    c = ring.mean(axis=0)
    ring = ring[np.argsort(np.arctan2(ring[:, 1] - c[1], ring[:, 0] - c[0]))]

    def inside(x, y):
        hit = False
        for i in range(len(ring)):
            a, b = ring[i], ring[i - 1]
            if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
                hit = not hit
        return hit

    done = 0
    for o in _find(spec["object"]):
        M = _matrix(o)
        bm = bmesh.new()
        bm.from_mesh(o.data)
        kill = []
        for f in bm.faces:
            w = M @ f.calc_center_median()
            if not inside(w.x, w.y):
                kill.append(f)
        done += len(kill)
        bmesh.ops.delete(bm, geom=kill, context="FACES")
        bm.to_mesh(o.data)
        bm.free()
        o.data.update()
    return done


def arch_profile(p, floor):
    """The opening's outline in (u, z), left foot to right foot over the crown."""
    h, sp, ap = p["half"], p["spring"], p["apex"]
    n = 6
    right = [(h * math.cos(t) ** 1.15, sp + (ap - sp) * math.sin(t)) for t in (math.pi / 2 * i / n for i in range(n + 1))]
    right[-1] = (0.0, ap)
    return [(h, floor)] + right + [(-u, z) for u, z in reversed(right[:-1])] + [(-h, floor)]


def cut_passage(p, floor):
    org = np.array(p["origin"], np.float64)
    dw = np.array(p["inward"], np.float64)
    dw /= np.linalg.norm(dw)
    du = np.array([dw[1], -dw[0]])
    w0, w1 = p["from"], p["to"]
    prof = arch_profile(p, floor - 1.0)
    # The outline as straight segments, which is what the cuts below follow: half width by height.
    half_line = [q for q in prof if q[0] >= 0]
    rise, reach = [q[1] for q in half_line], [q[0] for q in half_line]
    planes = [((w0, 0), None), ((w1, 0), None)]
    total = 0
    for prefix in p["cut"]:
        hits = _find(prefix)
        if not hits:
            raise RuntimeError(f"passage {p['id']}: nothing named {prefix}")
        for o in hits:
            M = _matrix(o)
            Mi = M.inverted()
            bm = bmesh.new()
            bm.from_mesh(o.data)

            def to_frame(co):
                w = M @ co
                r = np.array([w.x, w.y]) - org
                return float(r @ du), float(r @ dw), w.z

            def near_geom():
                faces = []
                for f in bm.faces:
                    c = [to_frame(l.vert.co) for l in f.loops]
                    if max(x[1] for x in c) < w0 - 0.1 or min(x[1] for x in c) > w1 + 0.1:
                        continue
                    if max(x[0] for x in c) < -p["half"] - 0.1 or min(x[0] for x in c) > p["half"] + 0.1:
                        continue
                    if min(x[2] for x in c) > p["apex"] + 0.1 or max(x[2] for x in c) < floor - 1.1:
                        continue
                    faces.append(f)
                edges = {e for f in faces for e in f.edges}
                verts = {v for f in faces for v in f.verts}
                return list(verts) + list(edges) + faces

            def bisect(co_world, no_world):
                geom = near_geom()
                if not geom:
                    return
                co = Mi @ co_world.__class__((co_world[0], co_world[1], co_world[2]))
                no = (M.to_3x3().transposed() @ no_world.__class__((no_world[0], no_world[1], no_world[2]))).normalized()
                bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-4, plane_co=co, plane_no=no, clear_inner=False, clear_outer=False)

            from mathutils import Vector
            base = lambda u, w, z: Vector((org[0] + du[0] * u + dw[0] * w, org[1] + du[1] * u + dw[1] * w, z))
            for w in (w0, w1):
                bisect(base(0, w, 0), Vector((dw[0], dw[1], 0)))
            for a, b in zip(prof[:-1], prof[1:]):
                ex, ez = b[0] - a[0], b[1] - a[1]
                if abs(ex) + abs(ez) < 1e-6:
                    continue
                # The plane holds this outline segment and runs along the passage.
                n = Vector((du[0] * -ez, du[1] * -ez, ex))
                bisect(base(a[0], 0, a[1]), n)
            # Every face is split on the outline by now, so one is inside only if all its corners are.
            def inside(co):
                u, w, z = to_frame(co)
                return w0 - 2e-3 <= w <= w1 + 2e-3 and z <= p["apex"] + 2e-3 and abs(u) <= float(np.interp(z, rise, reach)) + 4e-3

            kill = [f for f in bm.faces if all(inside(v.co) for v in f.verts)]
            total += len(kill)
            bmesh.ops.delete(bm, geom=kill, context="FACES")
            bm.to_mesh(o.data)
            bm.free()
            o.data.update()
    if not total:
        raise RuntimeError(f"passage {p['id']} removed no faces")
    if p.get("line") is False:
        return total
    # Stone lining, so the opening has sides and a crown instead of showing the inside of a shell.
    outline = arch_profile(p, floor)
    verts, faces = [], []
    for w in (w0, w1):
        for u, z in outline:
            xy = org + du * u + dw * w
            verts.append((xy[0], xy[1], z))
    n = len(outline)
    for i in range(n - 1):
        faces.append((i, i + 1, n + i + 1, n + i))
    if p.get("frame"):
        # A reveal round the mouth, closing any gap between this outline and the opening it replaces.
        h, sp, ap, m = p["half"], p["spring"], p["apex"], float(p["frame"])
        start = len(verts)
        for u, z in outline:
            ou = u + m if u > 0 else u - m if u < 0 else 0.0
            oz = z if z <= sp else z + m * (z - sp) / max(ap - sp, 1e-3)
            xy = org + du * ou + dw * w0
            verts.append((xy[0], xy[1], oz))
        for i in range(n - 1):
            faces.append((i, i + 1, start + i + 1, start + i))
    _make(f"PLAY_passage_{p['id']}", verts, faces, p["material"])
    return total


def _ring(o, z):
    """One closed loop of a wall's vertices at height z, ordered round its centre."""
    v = _world_verts(o)
    top = v[np.abs(v[:, 2] - z) < 0.02]
    c = top[:, :2].mean(axis=0)
    return top[np.argsort(np.arctan2(top[:, 1] - c[1], top[:, 0] - c[0]))], c


def walk_strip(s):
    outer, c = _ring(_find(s["outer"])[0], s["z"])
    inner, _ = _ring(_find(s["inner"])[0], s["z"])
    if len(outer) != len(inner):
        raise RuntimeError(f"walk strip {s['id']}: loops differ ({len(outer)} and {len(inner)})")
    # Line up the two loops by angle, then step round in pairs.
    a0 = np.arctan2(outer[0, 1] - c[1], outer[0, 0] - c[0])
    ang = np.arctan2(inner[:, 1] - c[1], inner[:, 0] - c[0])
    inner = np.roll(inner, -int(np.argmin(np.abs(np.arctan2(np.sin(ang - a0), np.cos(ang - a0))))), axis=0)
    n = len(outer)
    verts = [tuple(p) for p in outer] + [tuple(p) for p in inner]
    faces = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    _make(f"PLAY_walk_{s['id']}", verts, faces, s["material"])
    return n


def ramp(r):
    """A solid ramp against a wall's inner face, rising along it between two points."""
    wall = _world_verts(_find(r["along"])[0])
    loop = wall[np.abs(wall[:, 2] - r["wall_z"]) < 0.02]
    centre = loop[:, :2].mean(axis=0)
    ang = np.arctan2(loop[:, 1] - centre[1], loop[:, 0] - centre[0])
    loop = loop[np.argsort(ang)]
    a, b = np.array(r["from"], np.float64), np.array(r["to"], np.float64)
    ia = int(np.argmin(np.hypot(*(loop[:, :2] - a).T)))
    ib = int(np.argmin(np.hypot(*(loop[:, :2] - b).T)))
    n = len(loop)
    forward = (ib - ia) % n
    idx = [(ia + i) % n for i in range(forward + 1)] if forward <= n / 2 else [(ia - i) % n for i in range((ia - ib) % n + 1)]
    path = loop[idx, :2]
    seg = np.hypot(*np.diff(path, axis=0).T)
    t = np.concatenate(([0], np.cumsum(seg))) / seg.sum()
    # The last stretch is level: a landing to step sideways from, onto the walk.
    z = r["z0"] + (r["z1"] - r["z0"]) * np.minimum(t / (1 - r.get("landing", 0.08)), 1)
    to_c = centre - path
    to_c /= np.linalg.norm(to_c, axis=1, keepdims=True)
    wall_side = path - to_c * 0.05  # a hair into the wall, so there is no crack
    free_side = path + to_c * r["width"]
    base = r.get("base", r["z0"]) - 0.05
    k = len(path)
    verts = []
    for p, h in zip(wall_side, z):
        verts.append((p[0], p[1], h))
    for p, h in zip(free_side, z):
        verts.append((p[0], p[1], h))
    for p in free_side:
        verts.append((p[0], p[1], base))
    for p in wall_side:
        verts.append((p[0], p[1], base))
    faces = []
    for i in range(k - 1):
        faces.append((i, i + 1, k + i + 1, k + i))  # the walking surface
        faces.append((k + i, k + i + 1, 2 * k + i + 1, 2 * k + i))  # the open side
    faces.append((k - 1, 2 * k - 1, 3 * k - 1, 4 * k - 1))  # the high end
    # A low kerb on the open side and across the high end, so nobody walks off the ramp by accident.
    kerb = float(r.get("kerb", 0.9))
    base_v = len(verts)
    for p, h in zip(free_side, z):
        verts.append((p[0], p[1], h))
        verts.append((p[0], p[1], h + kerb))
    for i in range(k - 1):
        a = base_v + i * 2
        faces.append((a, a + 2, a + 3, a + 1))
    end = base_v + len(free_side) * 2
    verts += [tuple(wall_side[-1]) + (z[-1],), tuple(wall_side[-1]) + (z[-1] + kerb,),
              tuple(free_side[-1]) + (z[-1],), tuple(free_side[-1]) + (z[-1] + kerb,)]
    faces.append((end, end + 2, end + 3, end + 1))
    _make(f"PLAY_ramp_{r['id']}", verts, faces, r["material"])
    return round(float(seg.sum()), 1)


def causeway(c):
    o = _find(c["route"])[0]
    v = _world_verts(o)
    if len(v) % 2:
        v = v[:-1]
    left, right = v[0::2], v[1::2]
    centre = (left + right) / 2
    across = right[:, :2] - left[:, :2]
    across /= np.maximum(np.linalg.norm(across, axis=1, keepdims=True), 1e-6)
    z = float(np.median(centre[:, 2])) + c.get("lift", 0.0)
    verts, faces = [], []
    rows = [(-c["shoulder"], c["foot"]), (-c["half"], z), (c["half"], z), (c["shoulder"], c["foot"])]
    for p, d in zip(centre, across):
        for off, h in rows:
            verts.append((p[0] + d[0] * off, p[1] + d[1] * off, h))
    for i in range(len(centre) - 1):
        for j in range(3):
            a = i * 4 + j
            faces.append((a, a + 1, a + 5, a + 4))
    _make(f"PLAY_causeway_{c['id']}", verts, faces, c["material"])
    return len(centre)


def apply(cfg):
    """Run every edit once. Returns a small report."""
    e = cfg.get("edits")
    report = {}
    if not e or bpy.data.collections.get(ADDED):
        return report
    floor = float(cfg.get("ground_z", 0))
    for inst in bpy.context.evaluated_depsgraph_get().object_instances:
        if inst.object.type == "MESH":
            _placed.setdefault(inst.object.original.name, inst.matrix_world.copy())
    for s in e.get("remove_faces", []):
        report[f"removed:{s['object']}"] = remove_faces(s)
    for k in e.get("keep_inside", []):
        report[f"clipped:{k['object']}"] = keep_inside(k)
    for p in e.get("passages", []):
        report[f"passage:{p['id']}"] = cut_passage(p, floor)
    for s in e.get("walk_strips", []):
        report[f"walk:{s['id']}"] = walk_strip(s)
    for r in e.get("ramps", []):
        report[f"ramp:{r['id']}_m"] = ramp(r)
    for c in e.get("causeways", []):
        report[f"causeway:{c['id']}"] = causeway(c)
    bpy.context.view_layer.update()
    return report
