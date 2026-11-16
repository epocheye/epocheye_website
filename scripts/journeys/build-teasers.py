# Procedural teaser objects for /journeys, built and baked in headless Blender.
#
#   blender -b --python scripts/journeys/build-teasers.py -- <out dir> [hero|fort|dome|colonnade|all]
#
# These are PLACEHOLDER stand-ins for the Meshy objects described in JOURNEYS.md (Meshy task
# creation was blocked on the free plan when the page was built). Each object is a simple,
# recognisable architectural fragment with lighting baked into one texture for a dark
# museum-spotlight look, so the web material is unlit and cheap on phones.
#
# Per object this writes:  <name>.glb (PNG texture, uncompressed; the Node runner compresses it),
#   <name>-poster.png (square still), frames/<name>/####.png (144-frame turntable, 6 s at 24 fps).
# The hero pillar also writes palace-pillar-today.png: the same bake with faded, weathered
# materials. The page crossfades the two with a single uMix uniform.
import bpy, bmesh, math, os, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else "public/journeys/build")
WHICH = argv[1] if len(argv) > 1 else "all"
os.makedirs(OUT, exist_ok=True)

FRAMES = 144
TRI_BUDGET = 30000


# ----------------------------------------------------------------------------- scene helpers
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    world = bpy.data.worlds.new("void")
    world.color = (0.0, 0.0, 0.0)
    try:
        world.use_nodes = True
    except Exception:
        pass
    if world.node_tree:
        for n in world.node_tree.nodes:
            if n.type == "BACKGROUND":
                n.inputs[0].default_value = (0.0, 0.0, 0.0, 1.0)
                n.inputs[1].default_value = 0.0
    scene.world = world
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    return scene


def lights(target, height):
    """Museum spot: one warm key from upper front-left, a cool rim behind right, a faint fill."""
    def spot(name, loc, energy, color, size):
        data = bpy.data.lights.new(name, "SPOT")
        data.energy = energy
        data.color = color
        data.spot_size = math.radians(size)
        data.spot_blend = 0.6
        data.shadow_soft_size = 0.6
        obj = bpy.data.objects.new(name, data)
        obj.location = loc
        bpy.context.collection.objects.link(obj)
        direction = Vector(target) - Vector(loc)
        obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        return obj

    r = max(height * 1.4, 4.0)
    spot("key", (-r * 0.8, -r * 1.1, height * 1.6), 1500 * (r / 4.0) ** 2, (1.0, 0.88, 0.72), 50)
    spot("rim", (r * 0.9, r * 0.9, height * 1.3), 420 * (r / 4.0) ** 2, (0.75, 0.82, 1.0), 60)
    spot("fill", (r * 0.6, -r * 1.2, height * 0.5), 70 * (r / 4.0) ** 2, (1.0, 0.95, 0.9), 80)


# ----------------------------------------------------------------------------- materials
def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    return m, nt, p


def node(nt, kind, **props):
    n = nt.nodes.new(kind)
    for k, v in props.items():
        setattr(n, k, v)
    return n


def ramp(nt, stops):
    r = nt.nodes.new("ShaderNodeValToRGB")
    cr = r.color_ramp
    cr.interpolation = "CONSTANT" if len(stops) > 3 else "LINEAR"
    while len(cr.elements) < len(stops):
        cr.elements.new(0.5)
    for el, (pos, col) in zip(cr.elements, stops):
        el.position = pos
        el.color = (*col, 1.0)
    return r


def hexc(h, mul=1.0):
    h = h.lstrip("#")
    return tuple(((int(h[i:i + 2], 16) / 255.0) ** 2.2) * mul for i in (0, 2, 4))


def mat_teak(faded=False):
    m, nt, p = new_mat("teak_today" if faded else "teak")
    coord = node(nt, "ShaderNodeTexCoord")
    wave = node(nt, "ShaderNodeTexWave")
    wave.inputs["Scale"].default_value = 3.0
    wave.inputs["Distortion"].default_value = 4.0
    wave.inputs["Detail"].default_value = 3.0
    wave.bands_direction = "Z"
    noise = node(nt, "ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 30.0
    noise.inputs["Detail"].default_value = 8.0
    mix = node(nt, "ShaderNodeMix", data_type="FLOAT")
    mix.inputs[0].default_value = 0.35
    nt.links.new(coord.outputs["Object"], wave.inputs["Vector"])
    nt.links.new(coord.outputs["Object"], noise.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], mix.inputs[2])
    nt.links.new(noise.outputs["Fac"], mix.inputs[3])
    if faded:
        stops = [(0.0, hexc("#4a4037")), (0.5, hexc("#6b5c4c")), (1.0, hexc("#8a7b68"))]
        p.inputs["Roughness"].default_value = 0.75
    else:
        stops = [(0.0, hexc("#2e1a0c")), (0.45, hexc("#6a3f1d")), (1.0, hexc("#9a6433"))]
        p.inputs["Roughness"].default_value = 0.42
    r = ramp(nt, stops)
    nt.links.new(mix.outputs[0], r.inputs[0])
    nt.links.new(r.outputs["Color"], p.inputs["Base Color"])
    bump = node(nt, "ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.25
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
    return m


def mat_paint(faded=False):
    """Stylised floral panel: lobed cells of vermilion, green and gold on cream, with a swirl."""
    m, nt, p = new_mat("paint_today" if faded else "paint")
    coord = node(nt, "ShaderNodeTexCoord")
    vor = node(nt, "ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = 7.0
    vor.inputs["Randomness"].default_value = 0.9
    magic = node(nt, "ShaderNodeTexMagic")
    magic.inputs["Scale"].default_value = 5.0
    magic.inputs["Distortion"].default_value = 2.0
    magic.turbulence_depth = 3
    nt.links.new(coord.outputs["Object"], vor.inputs["Vector"])
    nt.links.new(coord.outputs["Object"], magic.inputs["Vector"])
    cells = ramp(nt, [
        (0.0, hexc("#b8362a")), (0.22, hexc("#9d2f24")), (0.36, hexc("#3f6b3a")),
        (0.5, hexc("#c9a24a")), (0.62, hexc("#e9dcbd")), (0.8, hexc("#f0e6cc")),
    ])
    nt.links.new(vor.outputs["Distance"], cells.inputs[0])
    swirl = ramp(nt, [(0.0, hexc("#f2e8d0")), (0.5, hexc("#2b4a2a")), (1.0, hexc("#f2e8d0"))])
    nt.links.new(magic.outputs["Fac"], swirl.inputs[0])
    mix = node(nt, "ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
    mix.inputs[0].default_value = 0.55
    nt.links.new(cells.outputs["Color"], mix.inputs[6])
    nt.links.new(swirl.outputs["Color"], mix.inputs[7])
    color_out = mix.outputs[2]
    if faded:
        hs = node(nt, "ShaderNodeHueSaturation")
        hs.inputs["Saturation"].default_value = 0.22
        hs.inputs["Value"].default_value = 0.7
        nt.links.new(color_out, hs.inputs["Color"])
        plaster = node(nt, "ShaderNodeRGB")
        plaster.outputs[0].default_value = (*hexc("#a89e8e"), 1.0)
        wear = node(nt, "ShaderNodeTexNoise")
        wear.inputs["Scale"].default_value = 2.5
        wear.inputs["Detail"].default_value = 6.0
        nt.links.new(coord.outputs["Object"], wear.inputs["Vector"])
        wear_ramp = ramp(nt, [(0.35, (0.0, 0.0, 0.0)), (0.7, (1.0, 1.0, 1.0))])
        nt.links.new(wear.outputs["Fac"], wear_ramp.inputs[0])
        m2 = node(nt, "ShaderNodeMix", data_type="RGBA")
        nt.links.new(wear_ramp.outputs["Color"], m2.inputs[0])
        nt.links.new(hs.outputs["Color"], m2.inputs[6])
        nt.links.new(plaster.outputs[0], m2.inputs[7])
        color_out = m2.outputs[2]
        p.inputs["Roughness"].default_value = 0.85
    else:
        p.inputs["Roughness"].default_value = 0.5
    nt.links.new(color_out, p.inputs["Base Color"])
    return m


def mat_gilding(faded=False):
    m, nt, p = new_mat("gilding_today" if faded else "gilding")
    p.inputs["Base Color"].default_value = (*hexc("#7a6a4a" if faded else "#d4aa4e"), 1.0)
    p.inputs["Metallic"].default_value = 0.6 if faded else 1.0
    p.inputs["Roughness"].default_value = 0.7 if faded else 0.32
    return m


def mat_noisy(name, a, b, rough, scale=12.0, bump=0.12):
    m, nt, p = new_mat(name)
    coord = node(nt, "ShaderNodeTexCoord")
    noise = node(nt, "ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 7.0
    nt.links.new(coord.outputs["Object"], noise.inputs["Vector"])
    r = ramp(nt, [(0.3, hexc(a)), (0.7, hexc(b))])
    nt.links.new(noise.outputs["Fac"], r.inputs[0])
    nt.links.new(r.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = rough
    bp = node(nt, "ShaderNodeBump")
    bp.inputs["Strength"].default_value = bump
    nt.links.new(noise.outputs["Fac"], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], p.inputs["Normal"])
    return m


def mat_granite(): return mat_noisy("granite", "#56524d", "#8a857c", 0.85, 9.0, 0.3)
def mat_marble(): return mat_noisy("marble", "#d9d2c3", "#f1ece0", 0.3, 4.0, 0.03)
def mat_plaster(): return mat_noisy("plaster", "#cfc6b4", "#ebe4d4", 0.9, 6.0, 0.08)
def mat_stone_base(): return mat_noisy("stone", "#5e5852", "#8c867c", 0.8, 14.0, 0.25)


def mat_bronze():
    m, nt, p = new_mat("bronze")
    p.inputs["Base Color"].default_value = (*hexc("#4f3b26"), 1.0)
    p.inputs["Metallic"].default_value = 0.85
    p.inputs["Roughness"].default_value = 0.45
    return m


# ----------------------------------------------------------------------------- geometry helpers
def link(obj):
    bpy.context.collection.objects.link(obj)
    return obj


def from_bmesh(name, bm, mat):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    me.materials.append(mat)
    return link(obj)


def prism(name, pts, z0, height, mat, y=0.0):
    """Extrude a closed 2D polygon (x, y) in the XY plane from z0 up by height."""
    bm = bmesh.new()
    verts = [bm.verts.new((x, yy + y, z0)) for x, yy in pts]
    bm.faces.new(verts)
    ext = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
    up = [g for g in ext["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, height), verts=up)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return from_bmesh(name, bm, mat)


def slab(name, pts_xz, y0, depth, mat):
    """Extrude a closed 2D polygon (x, z) in the XZ plane from y0 along +Y by depth (a cutter)."""
    bm = bmesh.new()
    verts = [bm.verts.new((x, y0, z)) for x, z in pts_xz]
    f = bm.faces.new(verts)
    bmesh.ops.triangulate(bm, faces=[f])
    ext = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
    up = [g for g in ext["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, depth, 0), verts=up)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return from_bmesh(name, bm, mat)


def box(name, cx, cy, cz, sx, sy, sz, mat):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts[:])
    bmesh.ops.translate(bm, vec=(cx, cy, cz), verts=bm.verts[:])
    return from_bmesh(name, bm, mat)


def regular(n, r, rot=0.0):
    return [(r * math.cos(rot + 2 * math.pi * i / n), r * math.sin(rot + 2 * math.pi * i / n)) for i in range(n)]


def cylinder(name, cx, cy, z0, r, h, mat, n=32, r_top=None):
    pts = regular(n, r)
    obj = prism(name, pts, z0, h, mat)
    if r_top is not None and r_top != r:
        k = r_top / r
        for v in obj.data.vertices:
            if v.co.z > z0 + h * 0.5:
                v.co.x *= k
                v.co.y *= k
    obj.location = (cx, cy, 0)
    return obj


def fluted(name, cx, cy, z0, r, h, mat, flutes=16, depth=0.12, taper=0.9):
    n = flutes * 4
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        rr = r * (1 - depth * (0.5 - 0.5 * math.cos(flutes * a)))
        pts.append((rr * math.cos(a), rr * math.sin(a)))
    obj = prism(name, pts, z0, h, mat)
    for v in obj.data.vertices:
        if v.co.z > z0 + h * 0.5:
            v.co.x *= taper
            v.co.y *= taper
    obj.location = (cx, cy, 0)
    return obj


def dome(name, cx, cy, z0, r, mat, stretch=1.0, seg=48, rings=24):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    low = [v for v in bm.verts if v.co.z < -1e-4]
    bmesh.ops.delete(bm, geom=low, context="VERTS")
    for v in bm.verts:
        v.co.z *= stretch
    bmesh.ops.translate(bm, vec=(cx, cy, z0), verts=bm.verts[:])
    return from_bmesh(name, bm, mat)


def arch_profile(w, z_spring, rise, lobes=0, amp=0.0, floor=-1.0, pointed=0.85):
    """Closed (x, z) outline of an arch opening: straight jambs and a (cusped) pointed head."""
    pts = [(-w, floor), (-w, z_spring)]
    n = 160
    for i in range(n + 1):
        t = i / n
        ang = math.pi * (1 - t)
        x = w * math.cos(ang)
        z = z_spring + rise * (math.sin(ang) ** pointed)
        if lobes and amp:
            nx, nz = -x, -(z - z_spring)
            L = math.hypot(nx, nz) or 1.0
            s = amp * abs(math.sin(lobes * math.pi * t))
            x, z = x + nx / L * s, z + nz / L * s
        pts.append((x, z))
    pts += [(w, z_spring), (w, floor)]
    return pts


def cut(target, cutter, transfer=True):
    mod = target.modifiers.new("cut", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
    mod.object = cutter
    if transfer:
        try:
            mod.material_mode = "TRANSFER"
        except Exception:
            pass
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def assign_by_normal(obj, mat, axis="y", zmin=-1e9):
    me = obj.data
    if mat.name not in [m.name for m in me.materials]:
        me.materials.append(mat)
    idx = [m.name for m in me.materials].index(mat.name)
    for poly in me.polygons:
        n = poly.normal
        comp = abs(getattr(n, axis))
        if comp > 0.9 and poly.center.z > zmin:
            poly.material_index = idx


# ----------------------------------------------------------------------------- objects
def build_hero():
    teak, paint, gild, stone = mat_teak(), mat_paint(), mat_gilding(), mat_stone_base()
    parts = []
    parts.append(prism("base", regular(8, 0.36, math.pi / 8), 0.0, 0.42, stone))
    parts.append(box("plinth", 0, 0, 0.47, 0.62, 0.62, 0.10, stone))
    parts.append(fluted("shaft", 0, 0, 0.52, 0.19, 2.9, teak, flutes=14, depth=0.14, taper=0.88))
    parts.append(cylinder("neck", 0, 0, 3.42, 0.17, 0.08, gild, n=32))
    parts.append(cylinder("capital", 0, 0, 3.5, 0.2, 0.34, teak, n=32, r_top=0.33))
    parts.append(box("abacus", 0, 0, 3.90, 0.74, 0.46, 0.12, teak))
    # Spandrel panel: the arches spring from the abacus and run off to both sides, cut mid-span.
    span = box("spandrel", 0, 0, 3.96 + 0.72, 2.8, 0.34, 1.44, teak)
    for sx in (-1.4, 1.4):
        pts = [(x + sx, z) for x, z in arch_profile(1.08, 3.96, 1.0, lobes=9, amp=0.075)]
        cutter = slab("cutter", pts, -1.0, 2.0, gild)
        cut(span, cutter)
    assign_by_normal(span, paint, "y", zmin=3.98)
    parts.append(span)
    parts.append(box("cornice", 0, 0, 4.68 + 0.72 + 0.06, 2.8, 0.42, 0.12, teak))
    faded = {"teak": mat_teak(True), "paint": mat_paint(True), "gilding": mat_gilding(True)}
    return parts, faded


def build_fort():
    granite, teak = mat_granite(), mat_teak()
    parts = []
    wall = box("wall", 0, 0, 1.5, 3.4, 1.3, 3.0, granite)
    cut(wall, slab("opening", arch_profile(0.72, 1.55, 0.95, pointed=0.7), -1.0, 2.0, granite), transfer=False)
    parts.append(wall)
    parts.append(box("door", 0, 0.45, 1.25, 1.46, 0.08, 2.5, teak))
    for i in range(7):
        x = -1.5 + i * 0.5
        parts.append(box(f"merlon{i}", x, 0, 3.0 + 0.22, 0.3, 1.3, 0.44, granite))
    for sx in (-2.0, 2.0):
        parts.append(cylinder(f"bastion{sx}", sx, 0, 0.0, 0.62, 3.5, granite, n=40, r_top=0.56))
        parts.append(cylinder(f"cap{sx}", sx, 0, 3.5, 0.66, 0.16, granite, n=40))
    parts.append(box("step", 0, -0.9, 0.08, 1.6, 0.5, 0.16, granite))
    return parts, None


def build_dome():
    marble, bronze = mat_marble(), mat_bronze()
    parts = [box("base", 0, 0, 0.1, 2.6, 2.6, 0.2, marble)]
    parts.append(cylinder("drum", 0, 0, 0.2, 0.98, 0.95, marble, n=48))
    for i in range(16):
        a = 2 * math.pi * i / 16
        pil = box(f"pil{i}", 0.98 * math.cos(a), 0.98 * math.sin(a), 0.68, 0.12, 0.08, 0.8, marble)
        pil.rotation_euler = (0, 0, a)
        parts.append(pil)
    parts.append(cylinder("ring", 0, 0, 1.15, 1.06, 0.1, marble, n=48))
    parts.append(dome("dome", 0, 0, 1.25, 1.02, marble, stretch=1.12))
    parts.append(cylinder("lantern", 0, 0, 2.36, 0.2, 0.28, marble, n=24, r_top=0.15))
    parts.append(cylinder("pedestal", 0, 0, 2.64, 0.1, 0.08, bronze, n=16))
    parts.append(cylinder("body", 0, 0, 2.72, 0.07, 0.42, bronze, n=16, r_top=0.045))
    parts.append(dome("head", 0, 0, 3.12, 0.055, bronze, seg=16, rings=8))
    for s in (-1, 1):
        wing = box(f"wing{s}", 0, 0, 0, 0.28, 0.03, 0.16, bronze)
        ang = s * math.radians(-28)
        for v in wing.data.vertices:
            x, z = v.co.x, v.co.z
            v.co.x = x * math.cos(ang) + z * math.sin(ang) + s * 0.17
            v.co.z = -x * math.sin(ang) + z * math.cos(ang) + 2.98
            v.co.y += 0.02
        parts.append(wing)
    for sx in (-1.0, 1.0):
        for sy in (-1.0, 1.0):
            parts.append(cylinder(f"chhatri{sx}{sy}", sx, sy, 0.2, 0.2, 0.42, marble, n=16))
            parts.append(dome(f"chhatridome{sx}{sy}", sx, sy, 0.62, 0.25, marble, seg=24, rings=12))
    return parts, None


def build_colonnade():
    plaster = mat_plaster()
    parts = [box("plinth", 0, 0, 0.15, 3.6, 1.3, 0.3, plaster)]
    for x in (-1.15, 0.0, 1.15):
        parts.append(cylinder(f"colbase{x}", x, -0.25, 0.3, 0.23, 0.1, plaster, n=32))
        parts.append(cylinder(f"col{x}", x, -0.25, 0.4, 0.16, 2.2, plaster, n=32, r_top=0.14))
        parts.append(cylinder(f"colcap{x}", x, -0.25, 2.6, 0.22, 0.12, plaster, n=32))
    parts.append(box("entab", 0, 0, 2.72 + 0.18, 3.6, 1.3, 0.36, plaster))
    parts.append(box("cornice", 0, -0.02, 3.08 + 0.05, 3.7, 1.36, 0.1, plaster))
    upper = box("upper", 0, 0.25, 3.13 + 0.95, 3.6, 0.8, 1.9, plaster)
    for x in (-0.6, 0.6):
        pts = [(xx + x, z) for xx, z in arch_profile(0.38, 3.45, 0.38, pointed=1.0)]
        cut(upper, slab("win", pts, -1.0, 2.0, plaster), transfer=False)
    parts.append(upper)
    parts.append(box("rail", 0, -0.32, 3.7, 3.6, 0.12, 0.08, plaster))
    for i in range(13):
        x = -1.62 + i * 0.27
        if abs(x) < 0.001 or abs(abs(x) - 1.08) < 0.1:
            continue
        parts.append(cylinder(f"bal{i}", x, -0.32, 3.13, 0.045, 0.57, plaster, n=10))
    parts.append(box("top", 0, 0.25, 5.03 + 0.07, 3.7, 0.9, 0.14, plaster))
    return parts, None


BUILDERS = {"hero": build_hero, "fort": build_fort, "dome": build_dome, "colonnade": build_colonnade}
NAMES = {"hero": "palace-pillar", "fort": "fort-gateway", "dome": "victoria-dome", "colonnade": "museum-colonnade"}
TEX = {"hero": 2048, "fort": 1024, "dome": 1024, "colonnade": 1024}


# ----------------------------------------------------------------------------- finish, bake, export
def join_all(parts, name):
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    # Origin at the base centre.
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    zs = [v.co.z for v in obj.data.vertices]
    cx, cy, z0 = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)
    for v in obj.data.vertices:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z -= z0
    obj.location = (0, 0, 0)
    # Normals, smoothing, decimation, UVs.
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.mesh.remove_doubles(threshold=0.0005)
    bpy.ops.object.mode_set(mode="OBJECT")
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    if tris > TRI_BUDGET:
        dec = obj.modifiers.new("dec", "DECIMATE")
        dec.ratio = (TRI_BUDGET * 0.95) / tris
        bpy.ops.object.modifier_apply(modifier=dec.name)
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(32))
    except Exception:
        bpy.ops.object.shade_smooth()
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    dims = obj.dimensions.copy()
    print(f"[teasers] {name}: {tris} tris, size {dims.x:.2f} x {dims.y:.2f} x {dims.z:.2f} m")
    return obj, dims


def bake(scene, obj, size, path):
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 40
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 4
    bk = scene.render.bake
    bk.margin = 8
    bk.use_pass_direct = True
    bk.use_pass_indirect = True
    bk.use_pass_color = True
    bk.use_selected_to_active = False
    img = bpy.data.images.new(os.path.basename(path), size, size, alpha=False)
    nodes = []
    for m in obj.data.materials:
        n = m.node_tree.nodes.new("ShaderNodeTexImage")
        n.image = img
        m.node_tree.nodes.active = n
        nodes.append((m, n))
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.bake(type="COMBINED")
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    for m, n in nodes:
        m.node_tree.nodes.remove(n)
    return img


def baked_material(img, name="baked"):
    m, nt, p = new_mat(name)
    tex = node(nt, "ShaderNodeTexImage")
    tex.image = img
    nt.links.new(tex.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 1.0
    # Render as it will appear on the web: unlit, the bake is the light.
    emit = node(nt, "ShaderNodeEmission")
    nt.links.new(tex.outputs["Color"], emit.inputs["Color"])
    out = nt.nodes["Material Output"]
    nt.links.new(emit.outputs[0], out.inputs["Surface"])
    return m


def export_material(img):
    """Plain Principled with the bake as base colour, which the glTF exporter understands."""
    m, nt, p = new_mat("baked")
    tex = node(nt, "ShaderNodeTexImage")
    tex.image = img
    nt.links.new(tex.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 1.0
    return m


def export_glb(obj, path):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=True, export_apply=True,
        export_image_format="AUTO", export_materials="EXPORT", export_yup=True,
        export_normals=True, export_texcoords=True, export_animations=False,
    )


def set_eevee(scene):
    for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "BLENDER_WORKBENCH"):
        try:
            scene.render.engine = eng
            return eng
        except TypeError:
            continue


def camera_for(scene, dims):
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 42
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam
    centre = Vector((0, 0, dims.z * 0.5))
    radius = max(dims.x, dims.y, dims.z) * 0.62
    fov = cam_data.angle
    d = radius / math.tan(fov / 2) * 1.12
    direction = Vector((-0.55, -1.0, 0.42)).normalized()
    cam.location = centre + direction * d
    cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()
    return cam


def render_still(scene, path, size=1600):
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def render_turntable(scene, obj, folder, size=1080):
    os.makedirs(folder, exist_ok=True)

    # Drive the spin from a frame handler (Blender 5 actions are slotted; this avoids them).
    def spin(sc):
        obj.rotation_euler = (0, 0, 2 * math.pi * (sc.frame_current - 1) / FRAMES)

    bpy.app.handlers.frame_change_pre.append(spin)
    scene.frame_start = 1
    scene.frame_end = FRAMES
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.filepath = os.path.join(folder, "")
    try:
        bpy.ops.render.render(animation=True)
    finally:
        bpy.app.handlers.frame_change_pre.remove(spin)
        obj.rotation_euler = (0, 0, 0)


def run(key):
    scene = reset()
    name = NAMES[key]
    parts, faded = BUILDERS[key]()
    obj, dims = join_all(parts, name)
    lights((0, 0, dims.z * 0.55), dims.z)
    size = TEX[key]
    img = bake(scene, obj, size, os.path.join(OUT, f"{name}.png"))
    if faded:
        slots = obj.data.materials
        originals = list(slots)
        for i, m in enumerate(originals):
            if m.name in faded:
                slots[i] = faded[m.name]
        bake(scene, obj, size, os.path.join(OUT, f"{name}-today.png"))
        for i, m in enumerate(originals):
            slots[i] = m
    obj.data.materials.clear()
    obj.data.materials.append(export_material(img))
    export_glb(obj, os.path.join(OUT, f"{name}.glb"))
    obj.data.materials.clear()
    obj.data.materials.append(baked_material(img))
    eng = set_eevee(scene)
    try:
        scene.eevee.taa_render_samples = 8
    except Exception:
        pass
    camera_for(scene, dims)
    try:
        render_still(scene, os.path.join(OUT, f"{name}-poster.png"))
        render_turntable(scene, obj, os.path.join(OUT, "frames", name))
    except Exception as e:  # Eevee needs a GPU context; fall back to Workbench.
        print("[teasers] render failed on", eng, "->", e)
        scene.render.engine = "BLENDER_WORKBENCH"
        scene.display.shading.light = "FLAT"
        scene.display.shading.color_type = "TEXTURE"
        render_still(scene, os.path.join(OUT, f"{name}-poster.png"))
        render_turntable(scene, obj, os.path.join(OUT, "frames", name))
    print(f"[teasers] done {name}")


if __name__ == "__main__":
    keys = list(BUILDERS) if WHICH == "all" else [WHICH]
    for k in keys:
        run(k)
