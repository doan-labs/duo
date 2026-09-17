"""iPhone Duo as a path-traced Cycles scene, ported from src/main.ts.

Same millimetre figures as the Three.js build, but the things WebGL had to fake
are real here: the titanium is an anisotropic BSDF with a radial grain, the lens
cover is transmissive sapphire with a thin-film AR coating, and the two OLED
panels are emitters, so they light each other and the rails for free.

    python3 blender/bridge.py blender/iphone_duo.py

Re-running wipes and rebuilds the "iPhone Duo" collection and nothing else.
"""
import math
import os
import sys
from math import cos, pi, radians, sin

import bmesh
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import screen_tex  # noqa: E402

MM = 0.001
# Body proportions measured off Apple's flat-open back photo, as in main.ts.
HW, HH, HT, HR = 84 * MM, 120.7 * MM, 4.8 * MM, 5.5 * MM
SPINE = 0.6 * MM   # corners on the hinge edge stay near-square so halves butt flush
LIP = 1.8 * MM     # frame visible around the glass -- outer three edges only
GW, GH = HW - 2 * LIP, HH - 2 * LIP        # outer display glass
INNER_W = 2 * HW - 2 * LIP                 # unfolded inner display
RAIL_BEV = 0.55 * MM                        # contoured titanium rail
# Camera pill centre on the right half's back, and its outermost face.
PLATEAU = (HW / 2 - 33.9 * MM, HH / 2 - 15.5 * MM, -(HT / 2 + 1.8 * MM))

GLASS_T = 0.15 * MM      # glass sits proud of the rail by PROUD, thin slab
PROUD = 0.05 * MM
SHUT_GAP = 0.15 * MM     # air left between the two inner panels when closed
FRONT = HT / 2 + PROUD - GLASS_T / 2       # centre z of a front glass slab
BACK = -(HT / 2 + PROUD - GLASS_T / 2)

FOLD = 0.84              # 1 = flat open, 0 = shut. Below ~170 the crease reads.
COLL = "iPhone Duo"
# Display radiance, relative to the room. 0.95 was right for a black studio;
# with a lit environment the panel has to out-run what the coat reflects or it
# greys out. The ceiling is AgX's shoulder -- much past ~1.5 a white icon and a
# pale dune compress to the same tone and the screen reads as fog.
EMISSION = 1.3

mix = lambda a, b, t: a + (b - a) * t


def lin(hexstr):
    """Hex sRGB -> linear, which is what shader colour sockets actually hold."""
    out = []
    for i in (1, 3, 5):
        c = int(hexstr[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


# -- mesh building -----------------------------------------------------------

def rrect(w, h, rl, rr, seg=48):
    """CCW rounded-rect outline; rl is the -X corner radius, rr the +X one."""
    big = max(rl, rr, 1e-9)
    pts = []
    for cx, cy, a0, r in ((w / 2 - rr, -h / 2 + rr, -pi / 2, rr),
                          (w / 2 - rr, h / 2 - rr, 0.0, rr),
                          (-w / 2 + rl, h / 2 - rl, pi / 2, rl),
                          (-w / 2 + rl, -h / 2 + rl, pi, rl)):
        n = max(2, round(seg * r / big))
        for i in range(n + 1):
            a = a0 + pi / 2 * i / n
            pts.append((cx + r * cos(a), cy + r * sin(a)))
    # Drop coincident neighbours; a near-zero radius can collapse an arc.
    out = [pts[0]]
    for p in pts[1:]:
        if math.dist(p, out[-1]) > 1e-7:
            out.append(p)
    if math.dist(out[0], out[-1]) < 1e-7:
        out.pop()
    return out


def circle(r, seg=96):
    return [(r * cos(2 * pi * i / seg), r * sin(2 * pi * i / seg)) for i in range(seg)]


def prism(pts_b, pts_t, zb, zt, bev=0.0, bseg=8, sharp=radians(28)):
    """Closed solid between two matching rings, optionally with rounded rims."""
    bm = bmesh.new()
    bot = [bm.verts.new((x, y, zb)) for x, y in pts_b]
    top = [bm.verts.new((x, y, zt)) for x, y in pts_t]
    bm.faces.new(bot[::-1])
    bm.faces.new(top)
    for i in range(len(bot)):
        j = (i + 1) % len(bot)
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bev > 0:
        # The two caps are the only n-gons, so their edges are exactly the rims.
        edges = [e for e in bm.edges if any(len(f.verts) > 4 for f in e.link_faces)]
        verts = list({v for e in edges for v in e.verts})
        bmesh.ops.bevel(bm, geom=edges + verts, offset=bev, offset_type="OFFSET",
                        segments=bseg, profile=0.5, affect="EDGES", clamp_overlap=True)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        f.smooth = True
    for e in bm.edges:
        e.smooth = len(e.link_faces) == 2 and e.calc_face_angle() < sharp
    return bm


def plate(w, h, d, rl, rr, bev=0.0, bseg=8, seg=48):
    r = rrect(w, h, rl, rr, seg)
    return prism(r, r, -d / 2, d / 2, bev, bseg)


def cyl(r, d, r_top=None, seg=96, bev=0.0, bseg=4):
    r_top = r if r_top is None else r_top
    return prism(circle(r, seg), circle(r_top, seg), -d / 2, d / 2, bev, bseg)


def tube(r_out, r_in, d, seg=96, bev=0.0, bseg=5, sharp=radians(28)):
    """Annulus, so a lens ring is a ring and not a disc capping the barrel."""
    bm = bmesh.new()
    ring = lambda r, z: [bm.verts.new((r * cos(2 * pi * i / seg),
                                      r * sin(2 * pi * i / seg), z)) for i in range(seg)]
    ob, ot = ring(r_out, -d / 2), ring(r_out, d / 2)
    ib, it = ring(r_in, -d / 2), ring(r_in, d / 2)
    for i in range(seg):
        j = (i + 1) % seg
        bm.faces.new((ob[i], ob[j], ot[j], ot[i]))   # outer wall
        bm.faces.new((it[i], it[j], ib[j], ib[i]))   # bore wall
        bm.faces.new((ib[i], ib[j], ob[j], ob[i]))   # bottom face
        bm.faces.new((ot[i], ot[j], it[j], it[i]))   # top face
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bev > 0:
        # Only the outward-facing top rim, which is the edge that catches light.
        top = set(ot)
        loop = [e for e in bm.edges if e.verts[0] in top and e.verts[1] in top]
        verts = list({v for e in loop for v in e.verts})
        bmesh.ops.bevel(bm, geom=loop + verts, offset=bev, offset_type="OFFSET",
                        segments=bseg, profile=0.5, affect="EDGES", clamp_overlap=True)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        f.smooth = True
    for e in bm.edges:
        e.smooth = len(e.link_faces) == 2 and e.calc_face_angle() < sharp
    return bm


def obj(name, bm, material, parent, loc=(0, 0, 0), rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.data.materials.append(material)
    bpy.data.collections[COLL].objects.link(o)
    o.parent = parent
    o.location = loc
    o.rotation_euler = rot
    return o


def empty(name, parent=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.02
    bpy.data.collections[COLL].objects.link(e)
    e.parent = parent
    e.location = loc
    e.rotation_euler = rot
    return e


# -- shading -----------------------------------------------------------------

def mat(name):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    out.location = (300, 0)
    nt.links.new(b.outputs[0], out.inputs[0])
    return m, nt, b


def noise(nt, scale, detail=2.0, rough=0.5, space="Object", ref=None):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.object = ref  # one shared space, so halves do not repeat the same pattern
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    nt.links.new(tc.outputs[space], n.inputs["Vector"])
    return n.outputs["Fac"]


def remap(nt, src, lo, hi):
    r = nt.nodes.new("ShaderNodeMapRange")
    r.inputs["To Min"].default_value = lo
    r.inputs["To Max"].default_value = hi
    nt.links.new(src, r.inputs["Value"])
    return r.outputs["Result"]


def bump(nt, src, strength, socket, dist=0.00008):
    b = nt.nodes.new("ShaderNodeBump")
    b.inputs["Strength"].default_value = strength
    b.inputs["Distance"].default_value = dist
    nt.links.new(src, b.inputs["Height"])
    nt.links.new(b.outputs["Normal"], socket)


def build_materials(ref):
    M = {}

    # Brushed Grade 5 titanium. A radial tangent about Z runs the grain around
    # the perimeter, which is the direction a CNC rail is actually finished in,
    # and is what separates machined metal from a chrome ball.
    m, nt, b = mat("Duo Titanium")
    b.inputs["Base Color"].default_value = lin("#c9c5bd")
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Anisotropic"].default_value = 0.85
    # 0.28-0.38 was tuned in a black room, where a rough rail at least caught
    # the few lamps there were. Against a real environment it just averages
    # everything to one grey. A finished rail is nearer 0.13-0.30, and that
    # spread is what gives the brushed bands their light-to-dark contrast.
    nt.links.new(remap(nt, noise(nt, 260, 3, 0.55, ref=ref), 0.13, 0.30),
                 b.inputs["Roughness"])
    t = nt.nodes.new("ShaderNodeTangent")
    t.direction_type = "RADIAL"
    t.axis = "Z"
    nt.links.new(t.outputs["Tangent"], b.inputs["Tangent"])
    bump(nt, noise(nt, 3200, 4, 0.6, ref=ref), 0.06, b.inputs["Normal"])
    M["ti"] = m

    m, nt, b = mat("Duo Titanium Polished")
    b.inputs["Base Color"].default_value = lin("#eeece8")
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.07
    M["polished"] = m

    # Textured matte glass over a light coating: satin, not flat plastic. The
    # roughness noise is the etch; without it this reads as painted metal.
    m, nt, b = mat("Duo Back Glass")
    # Darker than it looks in a photo. The panel's brightness should come from
    # the coat, not from diffuse: at #b8b5ae the diffuse term swamped every
    # reflection and the back read as light grey paint under any lighting.
    b.inputs["Base Color"].default_value = lin("#8f8c85")
    b.inputs["Metallic"].default_value = 0.0
    b.inputs["Coat Weight"].default_value = 1.0
    # The etch is in the glass under the coat; the coat itself is smooth. At
    # 0.22 it blurred the environment away and there was nothing left to
    # gradate across the panel.
    b.inputs["Coat Roughness"].default_value = 0.07
    nt.links.new(remap(nt, noise(nt, 900, 6, 0.6, ref=ref), 0.26, 0.38),
                 b.inputs["Roughness"])
    bump(nt, noise(nt, 5000, 4, 0.5, ref=ref), 0.08, b.inputs["Normal"])
    M["back"] = m

    # Sapphire lens cover with an AR coating: thin film is what gives a real
    # lens its blue-violet sheen at grazing angles.
    m, nt, b = mat("Duo Sapphire")
    b.inputs["Base Color"].default_value = (1, 1, 1, 1)
    b.inputs["Roughness"].default_value = 0.0
    b.inputs["Transmission Weight"].default_value = 1.0
    b.inputs["IOR"].default_value = 1.77
    b.inputs["Thin Film Thickness"].default_value = 380.0
    b.inputs["Thin Film IOR"].default_value = 1.45
    M["sapphire"] = m

    m, nt, b = mat("Duo Lens Element")
    b.inputs["Base Color"].default_value = lin("#0b1738")
    b.inputs["Metallic"].default_value = 0.9
    b.inputs["Roughness"].default_value = 0.06
    b.inputs["Thin Film Thickness"].default_value = 520.0
    b.inputs["Thin Film IOR"].default_value = 1.5
    M["element"] = m

    m, nt, b = mat("Duo Flash")
    b.inputs["Base Color"].default_value = lin("#f6ecd2")
    b.inputs["Roughness"].default_value = 0.28
    b.inputs["Coat Weight"].default_value = 1.0
    M["flash"] = m

    m, nt, b = mat("Duo Black")
    b.inputs["Base Color"].default_value = (0.012, 0.012, 0.013, 1)
    b.inputs["Roughness"].default_value = 0.5
    M["black"] = m

    # The inside of a lens barrel is flocked, not painted: near-black but with
    # enough sheen to pick up a rim, which is what stops the gap between the
    # element and the ring reading as a hole punched in the render.
    m, nt, b = mat("Duo Bore")
    b.inputs["Base Color"].default_value = (0.006, 0.006, 0.008, 1)
    b.inputs["Roughness"].default_value = 0.26
    M["bore"] = m

    m, nt, b = mat("Duo Floor")
    b.inputs["Base Color"].default_value = lin("#080909")
    b.inputs["Metallic"].default_value = 0.0
    nt.links.new(remap(nt, noise(nt, 40, 4, 0.5, space="Generated"), 0.42, 0.60),
                 b.inputs["Roughness"])
    M["floor"] = m
    return M


def display_mat(name, img, w, h, u0=0.0, u1=1.0):
    """Emissive OLED under a clear coat, mapped from the slab's own object space.

    Object coordinates beat a UV unwrap here: the slab is a centred rounded
    rect, so x/w maps to u exactly, and each half can take its slice of one
    continuous inner-display image with no seam.
    """
    m, nt, b = mat(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = ((u1 - u0) / w, 1.0 / h, 1.0)
    mp.inputs["Location"].default_value = ((u0 + u1) / 2, 0.5, 0.0)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.extension = "EXTEND"
    tex.interpolation = "Cubic"
    nt.links.new(mp.outputs["Vector"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = EMISSION
    b.inputs["Base Color"].default_value = (0, 0, 0, 1)
    b.inputs["Roughness"].default_value = 0.3
    b.inputs["Metallic"].default_value = 0.0
    # Under 1: a full-weight coat against a lit environment veils the far half
    # of an open device, where the panel is near grazing to the camera.
    b.inputs["Coat Weight"].default_value = 0.7
    # Anti-reflective coating: a real display is coated down to about 1%
    # head-on reflectance, and 1.28 gives that. It does nothing for grazing
    # angles, where Fresnel reaches 1 regardless -- that is a lighting problem.
    b.inputs["Coat IOR"].default_value = 1.28
    # Smudges: a perfectly clean coat is the giveaway that glass is CG.
    nt.links.new(remap(nt, noise(nt, 22, 3, 0.6, space="Generated"), 0.06, 0.18),
                 b.inputs["Coat Roughness"])
    return m


# -- the device --------------------------------------------------------------

def build_half(side, parent, M, inner_mat, tex_outer):
    """side -1 = left half (volume keys, port, outer display on its back).

    side +1 = right half (action key, matte back glass, camera plateau).
    """
    spine_left = side > 0
    rl = SPINE if spine_left else HR
    rr = HR if spine_left else SPINE
    tag = "R" if spine_left else "L"

    obj(f"Duo Body {tag}", plate(HW, HH, HT, rl, rr, bev=RAIL_BEV, bseg=10),
        M["ti"], parent)

    # Inner panel: no bezel at all on the spine edge, so the two butt at the
    # hinge axis and the pair reads as one display folded, not two screens.
    iw = HW - LIP
    dr_l = SPINE if spine_left else HR - LIP
    dr_r = HR - LIP if spine_left else SPINE
    obj(f"Duo Inner Display {tag}",
        plate(iw, GH, GLASS_T, dr_l, dr_r, bev=0.04 * MM, bseg=3, seg=32),
        inner_mat, parent, loc=(-side * LIP / 2, 0, FRONT))

    if spine_left:
        obj("Duo Back Glass", plate(GW, GH, 0.2 * MM, SPINE, HR - LIP,
                                    bev=0.04 * MM, bseg=3, seg=32),
            M["back"], parent, loc=(0, 0, BACK))
        build_camera_plateau(parent, M)
    else:
        # Outer 5.36" display, on the back. Rotating the slab keeps its object
        # space with it, so the same object-space mapping still reads correctly.
        obj("Duo Outer Display",
            plate(GW, GH, GLASS_T, HR - LIP, HR - LIP, bev=0.04 * MM, bseg=3, seg=32),
            display_mat("Duo Display Outer", tex_outer, GW, GH),
            parent, loc=(0, 0, BACK), rot=(0, pi, 0))

    # Rail hardware, on the outer edge. Keys are rounded plates lying on the
    # rail rather than boxes, so they follow the contour instead of cutting it.
    edge = side * (HW / 2 - 0.3 * MM)
    keys = [(22 * MM, 12 * MM)] if spine_left else [(30 * MM, 9 * MM), (17 * MM, 9 * MM)]
    for i, (y, length) in enumerate(keys):
        obj(f"Duo Key {tag}{i}",
            plate(length, 2.6 * MM, 1.2 * MM, 0.7 * MM, 0.7 * MM, bev=0.2 * MM, bseg=4, seg=12),
            M["polished"], parent, loc=(edge, y, 0), rot=(pi / 2, 0, pi / 2))

    if not spine_left:
        obj("Duo Port",
            plate(8.8 * MM, 2.8 * MM, 1.2 * MM, 1.4 * MM, 1.4 * MM, seg=16),
            M["black"], parent,
            loc=(0, -HH / 2 + 0.6 * MM, 0), rot=(pi / 2, 0, 0))
        for i in range(5):
            obj(f"Duo Speaker {i}", cyl(0.5 * MM, 1 * MM, seg=24),
                M["black"], parent,
                loc=(14 * MM + i * 2.4 * MM, -HH / 2 + 0.5 * MM, 0), rot=(pi / 2, 0, 0))


def build_camera_plateau(parent, M):
    """Pill 57.9x21.6mm on the right half's back, two lenses toward the outer edge."""
    cx, cy, top = PLATEAU               # top is the outermost face
    obj("Duo Camera Plateau",
        plate(57.9 * MM, 21.6 * MM, 1.8 * MM, 10.8 * MM, 10.8 * MM, bev=0.35 * MM, bseg=8),
        M["back"], parent, loc=(cx, cy, top + 0.9 * MM))

    # -Z is outward here. Sapphire sits flush with the ring, then real air, then
    # the coated element, then the pupil, then a black bore floor. The gaps are
    # the point: a path tracer draws actual depth through the cover glass, which
    # is what stops a lens reading as a dark sticker.
    for dx in (18.5 * MM, 0.3 * MM):
        x = cx + dx
        ring_out = top - 2.1 * MM       # ring stands 2.1mm off the plateau
        obj("Duo Lens Ring", tube(8.6 * MM, 7.15 * MM, 2.1 * MM, bev=0.25 * MM),
            M["polished"], parent, loc=(x, cy, top - 1.05 * MM))
        obj("Duo Lens Cover", cyl(7.1 * MM, 0.5 * MM),
            M["sapphire"], parent, loc=(x, cy, ring_out + 0.25 * MM))
        # The element nearly fills the bore on a real module. At 5.4 the black
        # gap out to the 7.15 ring was the widest thing in the macro frame.
        # An annulus, not a disc: the element is opaque, so a solid one hides
        # the pupil sitting behind it and the lens reads as a flat blue chip.
        obj("Duo Lens Element", tube(6.45 * MM, 2.25 * MM, 0.35 * MM),
            M["element"], parent, loc=(x, cy, top - 1.0 * MM))
        obj("Duo Lens Pupil", cyl(1.9 * MM, 0.2 * MM, seg=48),
            M["black"], parent, loc=(x, cy, top - 0.42 * MM))
        obj("Duo Lens Bore", cyl(7.4 * MM, 0.22 * MM),
            M["bore"], parent, loc=(x, cy, top - 0.11 * MM))

    fx = cx - 16.8 * MM
    obj("Duo Flash", cyl(1.9 * MM, 0.5 * MM, seg=48), M["flash"], parent,
        loc=(fx, cy - 4.5 * MM, top - 0.2 * MM))
    obj("Duo Mic", plate(3.2 * MM, 1.6 * MM, 0.2 * MM, 0.8 * MM, 0.8 * MM, seg=12),
        M["black"], parent, loc=(fx, cy + 4.4 * MM, top - 0.08 * MM))


# -- studio ------------------------------------------------------------------

def area(name, w, h, loc, power, color, target):
    d = bpy.data.lights.new(name, "AREA")
    d.shape = "RECTANGLE"
    d.size, d.size_y = w, h
    d.energy = power
    d.color = color[:3]
    o = bpy.data.objects.new(name, d)
    bpy.data.collections[COLL].objects.link(o)
    o.location = loc
    c = o.constraints.new("TRACK_TO")
    c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
    return o


def camera(name, dist, az, el, lens, fstop, target):
    """Orbits `target` rather than the world origin, so a macro can frame a
    sub-assembly that is parented several transforms deep."""
    d = bpy.data.cameras.new(name)
    d.lens = lens
    d.sensor_width = 36
    d.dof.use_dof = True
    d.dof.focus_object = target
    d.dof.aperture_fstop = fstop
    o = bpy.data.objects.new(name, d)
    bpy.data.collections[COLL].objects.link(o)
    a, e = radians(az), radians(el)
    o.location = target.matrix_world.translation + Vector(
        (dist * cos(e) * sin(a), -dist * cos(e) * cos(a), dist * sin(e)))
    c = o.constraints.new("TRACK_TO")
    c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
    return o


def build_studio(M, target):
    """A softbox rig, not a set of lamps.

    Metal has no colour of its own; every pixel of it is a mirror of the room.
    Small lamps in a black room therefore give small dots and a black body,
    which is exactly what the first pass rendered. So the lights here are sized
    and placed as the *shapes* the rails should reflect: one long narrow strip
    overhead to draw the chamfer streak, two tall side panels to fill the rails,
    a broad key to carry the glass, and a dim bounce so the underside does not
    dissolve into the floor. Cycles area lights show up in glossy rays, so their
    dimensions are the highlight's dimensions.
    """
    w = bpy.context.scene.world
    if w is None:
        w = bpy.data.worlds.new("Duo World")
        bpy.context.scene.world = w
    w.use_nodes = True
    # A vertical gradient rather than a flat colour. Flat glass under flat
    # ambient renders as one dead tone; the gradient is what gives a back panel
    # its fall-off from top to bottom without adding another light.
    nt = w.node_tree
    nt.nodes.clear()
    wout = nt.nodes.new("ShaderNodeOutputWorld")
    wout.location = (600, 0)
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.location = (400, 0)
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = -1.0
    mr.inputs["From Max"].default_value = 1.0
    # Not a two-stop fade. A real studio has a bright wall at eye level and
    # falls off above and below it, and that band is what a glossy panel
    # gradates across. With a flat dark world every metal surface returns one
    # value and reads as grey paint, which is what the first pass did.
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.location = (200, 0)
    # Wide and bright. Narrow was useless: the back glass is roughness 0.35, so
    # it averages the environment over a wide cone and a thin band vanishes.
    # This is also why the environment, not the lamps, has to carry the
    # gradient — a lamp only sits at one camera's mirror angle, and `hero` and
    # `back` look at the device from opposite sides.
    stops = [
        (0.00, (0.010, 0.011, 0.014)),   # straight down
        (0.26, (0.055, 0.060, 0.075)),
        (0.50, (1.050, 1.080, 1.150)),   # horizon = the studio wall
        (0.74, (0.120, 0.128, 0.150)),
        (1.00, (0.038, 0.041, 0.052)),   # straight up
    ]
    e = ramp.color_ramp.elements
    e[0].position, e[0].color = stops[0][0], (*stops[0][1], 1)
    e[1].position, e[1].color = stops[-1][0], (*stops[-1][1], 1)
    for pos, col in stops[1:-1]:
        e.new(pos).color = (*col, 1)
    nt.links.new(geo.outputs["Incoming"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg.inputs[0])
    nt.links.new(bg.outputs[0], wout.inputs[0])

    # Power is total watts, so a box nine times the area at twice the distance
    # needs roughly the same order of watts, not nine times more. Everything is
    # pushed out to ~0.6-1.0 m: near boxes wrap too fast and flatten the rail.
    #
    # Still nothing directly behind the subject. At grazing incidence Fresnel
    # goes to 1 whatever the coating is, so a back light lands on the display
    # as one flat swath that no Coat IOR will tame. Side rims instead.
    # Halved now that the world carries the base exposure; these are accents.
    area("Duo Key", 0.90, 0.62, (-0.46, -0.60, 0.72), 6.0, (1, 1, 1), target)
    # Long and narrow, overhead, along the device's own long axis. This is the
    # one that draws the chamfer streak; width sets how tight the streak reads.
    area("Duo Strip", 1.30, 0.10, (0.02, -0.06, 0.60), 4.5, (0.95, 0.97, 1.0), target)
    area("Duo Rim R", 0.11, 1.15, (0.66, 0.16, 0.20), 4.5, (0.86, 0.91, 1.0), target)
    area("Duo Rim L", 0.09, 0.95, (-0.63, -0.02, 0.14), 5.5, (0.88, 0.93, 1.0), target)
    # Broad, dim, from below-front: keeps the underside of the rail off black
    # and puts a warm edge under the plateau. Too hot and the glass goes milky.
    area("Duo Bounce", 1.00, 1.00, (0.06, -0.34, -0.46), 1.6, (1.0, 0.93, 0.84), target)

    # 8 m, not 2.4. It has to fill every frame edge to edge: the world now has
    # a hot horizon band in it, and that band must only ever be seen in a
    # reflection, never directly as a stripe across the top of the shot.
    floor = obj("Duo Floor", plate(8.0, 8.0, 0.01, 0.05, 0.05, seg=4),
                M["floor"], None, loc=(0, 0, -0.09))
    # The floor stays visible to glossy rays. It is dark and rough, so what the
    # rails get back is a soft gradient underneath rather than a hot wash, and
    # that gradient is most of what makes the underside of a chamfer read as
    # metal instead of as an unlit edge. (The veiling this once got blamed for
    # was a back light; hiding the floor changed nothing then.)
    return floor


def setup_render(preview=True, comp=False):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "GPU"
    cy.use_adaptive_sampling = True
    cy.samples = 128 if preview else 400
    cy.adaptive_threshold = 0.02 if preview else 0.004
    cy.use_denoising = True
    cy.max_bounces = 32
    cy.transmission_bounces = 24
    cy.glossy_bounces = 12
    cy.transparent_max_bounces = 16
    cy.blur_glossy = 1.0            # filter glossy: the cheap fix for fireflies
    cy.sample_clamp_indirect = 10.0
    sc.render.resolution_x = 1000 if preview else 1800
    sc.render.resolution_y = 750 if preview else 1350
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.render.film_transparent = False
    sc.view_settings.exposure = -0.8  # bare titanium and light glass sit ~2 stops hot
    for attr, val in (("view_transform", "AgX"), ("look", "AgX - Base Contrast")):
        try:
            setattr(sc.view_settings, attr, val)
        except (TypeError, AttributeError):
            pass

    # Bloom, so the panels read as emitting rather than as bright paint. Purely
    # cosmetic, and the 5.x compositor is a node group with socket-driven Glare,
    # so a failure here must not take the render down with it.
    if not comp:
        sc.compositing_node_group = None
        return
    try:
        sc.use_nodes = True
        ng = bpy.data.node_groups.get("Duo Comp")
        if ng is None:
            ng = bpy.data.node_groups.new("Duo Comp", "CompositorNodeTree")
        ng.nodes.clear()
        for it in list(ng.interface.items_tree):
            ng.interface.remove(it)
        ng.interface.new_socket("Image", in_out="INPUT", socket_type="NodeSocketColor")
        ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        gi = ng.nodes.new("NodeGroupInput")
        go = ng.nodes.new("NodeGroupOutput")
        go.location = (600, 0)
        g = ng.nodes.new("CompositorNodeGlare")
        g.location = (300, 0)
        for k, v in (("Threshold", 1.0), ("Strength", 0.13), ("Size", 0.35),
                     ("Smoothness", 0.45), ("Saturation", 1.0)):
            if k in g.inputs:
                g.inputs[k].default_value = v
        ng.links.new(gi.outputs[0], g.inputs[0])
        ng.links.new(g.outputs[0], go.inputs[0])
        sc.compositing_node_group = ng
    except Exception as exc:
        print("compositor skipped:", exc)


def render(name, cam=None, preview=True, samples=None, res=None, comp=False):
    """Only usable from a background Blender: in the GUI, render.render is
    modal and returns before it has traced anything, writing an empty file."""
    sc = bpy.context.scene
    setup_render(preview, comp)
    if samples:
        sc.cycles.samples = samples
    if res:
        sc.render.resolution_x, sc.render.resolution_y = res, round(res * 0.75)
    if cam is not None:
        sc.camera = bpy.data.objects[cam]
    out = os.path.join(HERE, "render")
    os.makedirs(out, exist_ok=True)
    sc.render.filepath = os.path.join(out, name)
    if not bpy.app.background:
        raise RuntimeError("render only works headless; see the module docstring")
    bpy.ops.render.render(write_still=True)
    return sc.render.filepath + ".png"


# -- assembly ----------------------------------------------------------------

def build(fold=FOLD, flip=False, rebuild_tex=False):
    coll = bpy.data.collections.get(COLL)
    if coll is None:
        coll = bpy.data.collections.new(COLL)
        bpy.context.scene.collection.children.link(coll)
    else:
        for o in list(coll.objects):
            bpy.data.objects.remove(o, do_unlink=True)

    tex_inner = screen_tex.bake("duo_inner", INNER_W / MM, GH / MM, 7, rebuild_tex)
    tex_outer = screen_tex.bake("duo_outer", GW / MM, GH / MM, 4, rebuild_tex)

    # Shut, the backs face away from the floor, so a cover shot needs the whole
    # rig turned over rather than a camera dropped below the floor plane.
    root = empty("Duo Root", rot=(0, pi if flip else 0, 0))
    M = build_materials(root)
    target = empty("Duo Target", root, (0, 0, 0))

    # Rig recentres the model as it doubles in width, so it turns about its own
    # visual centre; hinge swings the right half on the front plane.
    #
    # With the axis fixed on that plane the two glass faces overlap by 2*PROUD
    # once shut, so it walks out by that much plus a clearance as it closes,
    # which is what a real teardrop hinge does. Parking the halves a few degrees
    # ajar instead is what left a wedge along the free edge that you could see
    # both inner displays through.
    rig = empty("Duo Rig", root, (mix(HW / 2, 0, fold), 0, mix(-HT / 2, 0, fold)))
    left = empty("Duo Half L", rig, (-HW / 2, 0, 0))
    hinge = empty("Duo Hinge", rig, (0, 0, mix(HT / 2 + 2 * PROUD + SHUT_GAP, HT / 2, fold)),
                  (0, mix(pi, 0, fold), 0))
    right = empty("Duo Half R", hinge, (HW / 2, 0, -HT / 2))
    empty("Duo Macro Target", right, PLATEAU)

    iw = HW - LIP
    us = iw / INNER_W  # exactly half the image each, so the wallpaper carries over
    build_half(-1, left, M, display_mat("Duo Display Inner L", tex_inner, iw, GH, 0.0, us),
               tex_outer)
    build_half(+1, right, M, display_mat("Duo Display Inner R", tex_inner, iw, GH, 1 - us, 1.0),
               tex_outer)

    build_studio(M, target)
    bpy.context.view_layer.update()  # cameras read their target's world matrix
    for name, (d, az, el, lens, f, tgt) in CAMS.items():
        camera(name, d, az, el, lens, f, bpy.data.objects[tgt])
    bpy.context.scene.camera = bpy.data.objects["Duo Cam Hero"]

    n = len(coll.objects)
    tris = sum(len(o.data.polygons) for o in coll.objects if o.type == "MESH")
    return {"objects": n, "faces": tris, "fold_deg": round(mix(180, 0, fold), 1)}


# name -> (distance m, azimuth deg, elevation deg, focal mm, f-stop, target)
# f-stops are deep on purpose. Depth of field goes as (subject/focal)^2, so at
# 0.5 m on an 85 mm lens f/5.6 holds about 13 mm — less than a tenth of the
# device, which is why the first pass was mush everywhere but one band. f/25
# holds ~60 mm and still falls off at the far corner.
CAMS = {
    "Duo Cam Hero": (0.54, 28, 22, 85, 25.0, "Duo Target"),
    "Duo Cam Back": (0.44, 206, 22, 90, 25.0, "Duo Target"),
    "Duo Cam Cover": (0.40, 24, 32, 90, 25.0, "Duo Target"),
    "Duo Cam Macro": (0.115, 196, 24, 100, 32.0, "Duo Macro Target"),
}
# view -> (camera, fold, flip). Shut shows the hardware; open shows the display.
VIEWS = {
    "hero": ("Duo Cam Hero", FOLD, False),
    "back": ("Duo Cam Back", 0.0, False),
    "cover": ("Duo Cam Cover", 0.0, True),
    "macro": ("Duo Cam Macro", 0.0, False),
}


def main():
    """Live via the bridge: just build. Headless: build, then render.

        blender -b -P blender/iphone_duo.py -- --render hero --samples 128
        blender -b -P blender/iphone_duo.py -- --render all --final

    `--render` takes a comma list or `all`. Each view needs its own fold and
    flip so the collection is rebuilt between them, which is far cheaper than
    paying Blender's startup four times over.
    """
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    opt = lambda k, d=None: (argv[argv.index(k) + 1] if k in argv
                             and len(argv) > argv.index(k) + 1 else d)
    which = opt("--render", "hero")
    names = list(VIEWS) if which == "all" else which.split(",")
    samples = opt("--samples")
    res = opt("--res")
    out = {}

    for i, name in enumerate(names):
        cam, fold, flip = VIEWS.get(name, VIEWS["hero"])
        if opt("--fold"):
            fold = float(opt("--fold"))
        # Textures are cached after the first build, so rebuilds are seconds.
        out = build(fold, flip, "--rebuild-tex" in argv and i == 0)
        if "--render" not in argv:
            return out
        if bpy.app.background:
            # A fresh headless Blender still has the startup cube and lamp.
            for o in list(bpy.data.objects):
                if o.name not in bpy.data.collections[COLL].objects:
                    bpy.data.objects.remove(o, do_unlink=True)
        out.setdefault("render", {})[name] = render(
            name, cam, "--final" not in argv,
            int(samples) if samples else None,
            int(res) if res else None, "--comp" in argv)
        print("RENDERED", name, flush=True)

    # Where the device actually lands in camera space, for framing sanity.
    c = bpy.data.objects[VIEWS.get(names[-1], VIEWS["hero"])[0]]
    mi = c.matrix_world.inverted()
    pts = [mi @ (o.matrix_world @ v.co) for o in bpy.data.collections[COLL].objects
           if o.type == "MESH" and o.name != "Duo Floor" for v in o.data.vertices]
    if "--save" in argv:
        out["blend"] = os.path.join(HERE, "iphone_duo.blend")
        bpy.ops.wm.save_as_mainfile(filepath=out["blend"])
    out["cam_space"] = {
        "x": [round(min(p.x for p in pts), 3), round(max(p.x for p in pts), 3)],
        "y": [round(min(p.y for p in pts), 3), round(max(p.y for p in pts), 3)],
        "depth": [round(min(-p.z for p in pts), 3), round(max(-p.z for p in pts), 3)],
    } if pts else None
    return out


result = main()
print("RESULT", result)
