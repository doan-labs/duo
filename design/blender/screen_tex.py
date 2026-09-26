"""iOS home-screen textures for the Blender build, ported from src/screen.ts.

numpy does the shapes (Blender bundles no PIL); Blender's own `blf` + `gpu`
offscreen does the text. Shapes are signed-distance fields rather than canvas
paths, which gives antialiasing for free and lets every element composite on a
crop instead of the full canvas.

Needs a GPU context, so run it from the GUI Blender once. Results are cached as
PNGs next to this file so later headless renders can skip the text pass.
"""
import math
import os

import numpy as np

PX = 14  # canvas pixels per millimetre
BEZEL_MM = 2.2
RADIUS_MM = 4.2  # glass corner radius = body radius minus the frame lip
FONT = "/System/Library/Fonts/SFNS.ttf"
ASCENT = 0.78  # blf sits on the baseline; canvas textBaseline='top' does not

HERE = os.path.dirname(os.path.abspath(__file__))
TEX_DIR = os.path.join(HERE, "tex")
ICON_DIR = os.path.join(os.path.dirname(HERE), "src", "icons")

# Home-screen order, mirroring HOME_APPS / HOME_DOCK in src/os.ts.
APPS = ["FaceTime", "Calendar", "Photos", "Camera", "Mail", "Notes", "Reminders",
        "Clock", "News", "TV", "Podcasts", "App Store", "Maps", "Weather",
        "Calculator", "Settings", "Books", "Stocks", "Home",
        "Freeform", "Shortcuts", "Find My", "Voice Memos"]
DOCK = ["Phone", "Safari", "Messages", "Music"]


def hx(s):
    return np.array([int(s[i:i + 2], 16) / 255 for i in (1, 3, 5)], dtype="f4")


# -- numpy drawing -----------------------------------------------------------

def _box1(a, r, axis):
    """Centred box average of radius r along axis, via cumulative sums."""
    n = a.shape[axis]
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r, r)
    p = np.pad(a, pad, mode="edge")
    z = np.zeros_like(np.take(p, [0], axis=axis))
    c = np.concatenate([z, np.cumsum(p, axis=axis, dtype="f4")], axis=axis)
    hi = np.take(c, np.arange(2 * r + 1, n + 2 * r + 1), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return (hi - lo) / (2 * r + 1)


def blur(a, sigma):
    """Three box passes ~= a gaussian, and cheap enough to run on the full canvas."""
    r = max(1, int(round(sigma * 0.9)))
    for _ in range(3):
        a = _box1(_box1(a, r, 0), r, 1)
    return a


def vramp(h, stops, x0=0.0, x1=1.0):
    """Vertical colour ramp over rows x0*h..x1*h, clamped outside. Returns (h,1,3)."""
    t = np.clip((np.arange(h, dtype="f4") / h - x0) / max(1e-6, x1 - x0), 0, 1)
    pos = np.array([p for p, _ in stops], dtype="f4")
    cols = np.stack([hx(c) if isinstance(c, str) else np.asarray(c, "f4") for _, c in stops])
    out = np.empty((h, 3), dtype="f4")
    for k in range(3):
        out[:, k] = np.interp(t, pos, cols[:, k])
    return out[:, None, :]


def sdf_rrect(xx, yy, x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    qx = np.abs(xx - (x + w / 2)) - (w / 2 - r)
    qy = np.abs(yy - (y + h / 2)) - (h / 2 - r)
    return (np.hypot(np.maximum(qx, 0), np.maximum(qy, 0))
            + np.minimum(np.maximum(qx, qy), 0) - r)


def sdf_poly(xx, yy, pts):
    """Negative inside a convex polygon. Exact near edges, which is all AA needs."""
    a2 = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1]
             for i in range(len(pts)))
    if a2 < 0:  # need CCW, so that the interior lies left of every edge
        pts = pts[::-1]
    ds = []
    for i in range(len(pts)):
        ax, ay = pts[i]
        bx, by = pts[(i + 1) % len(pts)]
        ex, ey = bx - ax, by - ay
        L = math.hypot(ex, ey) or 1.0
        ds.append(((xx - ax) * ey - (yy - ay) * ex) / L)
    return np.maximum.reduce(ds)


def sdf_squircle(xx, yy, cx, cy, r, n=5.0):
    """Apple's icon outline is a superellipse. Distance is approximate, which is
    all a 1px coverage test needs."""
    u = np.abs(xx - cx) / r
    v = np.abs(yy - cy) / r
    return ((u ** n + v ** n) ** (1 / n) - 1) * r


def cov(d):
    """1px antialiased coverage from a signed distance."""
    return np.clip(0.5 - d, 0, 1)


def lerp3(t, stops):
    """Interpolate [(pos, hex)] colour stops over an array t -> (..., 3)."""
    pos = np.array([p for p, _ in stops], dtype="f4")
    cols = np.stack([hx(c) for _, c in stops])
    return np.stack([np.interp(t, pos, cols[:, k]) for k in range(3)], -1).astype("f4")


def resample(a, w, h):
    """Bilinear resize of an (H, W, C) array. The icons arrive at 192px and land
    at ~189, so nothing fancier earns its keep."""
    sy = (np.arange(h, dtype="f4") + 0.5) * a.shape[0] / h - 0.5
    sx = (np.arange(w, dtype="f4") + 0.5) * a.shape[1] / w - 0.5
    y0 = np.clip(np.floor(sy), 0, a.shape[0] - 1).astype(int)
    x0 = np.clip(np.floor(sx), 0, a.shape[1] - 1).astype(int)
    y1 = np.minimum(y0 + 1, a.shape[0] - 1)
    x1 = np.minimum(x0 + 1, a.shape[1] - 1)
    fy = np.clip(sy - y0, 0, 1)[:, None, None]
    fx = np.clip(sx - x0, 0, 1)[None, :, None]
    top = a[y0][:, x0] * (1 - fx) + a[y0][:, x1] * fx
    bot = a[y1][:, x0] * (1 - fx) + a[y1][:, x1] * fx
    return top * (1 - fy) + bot * fy


# -- real Apple artwork ------------------------------------------------------

_SPRITES = {}
DRAWN = ("Camera",)  # no macOS app to take the artwork from


def _load(path):
    """RGBA, top-down, straight alpha, sRGB-encoded. `Image.pixels` on a byte
    image hands back the raw buffer, so no colour transform is needed."""
    import bpy

    img = bpy.data.images.load(path)
    w, h = img.size
    a = np.empty(w * h * 4, dtype="f4")
    img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return a.reshape(h, w, 4)[::-1].copy()  # bpy images are bottom-up


def _trim(a):
    """Crop to the ink. SF Symbols export onto a square canvas whatever their
    real aspect is, so without this every glyph lays out at the wrong width."""
    ys, xs = np.nonzero(a[..., 3] > 0.004)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def _drawn(name):
    """Camera, on the same superellipse as the real icons."""
    n = 192
    xx = np.arange(n, dtype="f4")[None, :]
    yy = np.arange(n, dtype="f4")[:, None]
    img = np.zeros((n, n, 4), dtype="f4")
    body = cov(sdf_squircle(xx, yy, 96, 96, 96))

    def put(rgb, a):
        img[..., :3] = img[..., :3] * (1 - a[..., None]) + np.asarray(rgb, "f4") * a[..., None]
        img[..., 3] = img[..., 3] * (1 - a) + a

    g = np.clip((0.35 * xx + yy) / (n * 1.35), 0, 1) + 0 * yy
    put(lerp3(g, [(0, "#b2b2b7"), (1, "#4b4b50")]), body)
    put(hx("#eaeaec"), cov(sdf_rrect(xx, yy, 54, 35, 32, 12, 6)) * 0.9 * body)
    r = np.hypot(xx - 96, yy - 108) + 0 * xx
    put(lerp3(np.clip((yy - 61) / 94, 0, 1) + 0 * xx, [(0, "#fbfbfd"), (1, "#7d7d82")]), cov(r - 47))
    lens = np.hypot(xx - 83.8, yy - 90.5) / 72.2
    put(lerp3(np.clip(lens, 0, 1), [(0, "#5d6d7a"), (0.5, "#1b2025"), (1, "#090b0e")]), cov(r - 38))
    a, b = math.cos(math.radians(-32)), math.sin(math.radians(-32))
    ex, ey = xx - 79, yy - 92
    put((1, 1, 1), cov((np.hypot((ex * a + ey * b) / 14, (ey * a - ex * b) / 9) - 1) * 11) * 0.22)
    return img


def art(name):
    """App artwork by display name. Real Apple icons, extracted by tools/icons.sh."""
    if name not in _SPRITES:
        _SPRITES[name] = _drawn(name) if name in DRAWN else _load(
            os.path.join(ICON_DIR, name.lower().replace(" ", "") + ".webp"))
    return _SPRITES[name]


def sym(name):
    """SF Symbol glyph, cropped to its ink so layout can size it by height."""
    key = "sym/" + name
    if key not in _SPRITES:
        _SPRITES[key] = _trim(_load(os.path.join(ICON_DIR, "sym", name + ".webp")))
    return _SPRITES[key]


def blit(c, a, x, y, w, h, col=None):
    """Composite an RGBA sprite at (x, y), scaled to w x h. `col` flattens it to
    one colour, which is how the white SF Symbols get recoloured."""
    a = resample(a, max(1, int(round(w))), max(1, int(round(h))))
    x0, y0 = int(round(x)), int(round(y))
    sy = slice(max(0, y0), min(c.h, y0 + a.shape[0]))
    sx = slice(max(0, x0), min(c.w, x0 + a.shape[1]))
    if sy.stop <= sy.start or sx.stop <= sx.start:
        return
    a = a[sy.start - y0:sy.stop - y0, sx.start - x0:sx.stop - x0]
    c.over(sy, sx, a[..., :3] if col is None else np.asarray(col, "f4"), a[..., 3])


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.img = np.zeros((h, w, 3), dtype="f4")
        self.xx = np.arange(w, dtype="f4")[None, :]
        self.yy = np.arange(h, dtype="f4")[:, None]
        self.texts = []  # (text, x, y_top, size, align, colour, shadow)

    def crop(self, x, y, w, h, pad=0):
        sy = slice(max(0, int(y - pad)), min(self.h, int(y + h + pad) + 1))
        sx = slice(max(0, int(x - pad)), min(self.w, int(x + w + pad) + 1))
        return sy, sx

    def over(self, sy, sx, rgb, a):
        """Alpha-composite rgb (3-vector or HxWx3) onto a crop."""
        dst = self.img[sy, sx]
        a = a[..., None] if a.ndim == 2 else a
        self.img[sy, sx] = dst * (1 - a) + np.asarray(rgb, "f4") * a

    def text(self, s, x, y, size, align="left", col=(1, 1, 1), shadow=0.0):
        self.texts.append((s, float(x), float(y), float(size), align, col, float(shadow)))


# -- wallpaper ---------------------------------------------------------------

def dunes(w, h):
    """Desert dunes under a hazy sky, in the spirit of Apple's launch wallpaper."""
    xx = np.arange(w, dtype="f4")[None, :]
    yy = np.arange(h, dtype="f4")[:, None]
    img = np.repeat(vramp(h, [(0, "#9dbbd6"), (0.42, "#dde2e2"), (0.6, "#eddcc3")]), w, axis=1)

    d = np.hypot(xx - w * 0.72, yy - h * 0.44) / (w * 0.7)
    a = 0.85 * np.clip(1 - d, 0, 1)
    img = img * (1 - a[..., None]) + hx("#fff2da") * a[..., None]

    t = (xx / w).ravel()
    for base, amp, f, c1, c2 in [(0.5, 0.05, 3.1, "#7e7468", "#b3a696"),
                                 (0.545, 0.03, 5.7, "#a3978b", "#cdbfad")]:
        ridge = (base + amp * (np.sin(t * f * np.pi)
                               + 0.5 * np.sin(t * f * 2.3 * np.pi + 1)
                               + 0.25 * np.sin(t * f * 5.1 * np.pi))) * h
        fillc = np.repeat(vramp(h, [(0, c1), (1, c2)], base, 1.0), w, axis=1)
        m = cov(ridge[None, :] - yy)
        img = img * (1 - m[..., None]) + fillc * m[..., None]

    y0, y1 = int(h * 0.45), int(h * 0.62)
    band = np.linspace(0, 0.9, y1 - y0, dtype="f4")[:, None, None]
    img[y0:y1] = img[y0:y1] * (1 - band) + hx("#ecdec6") * band

    for p, lit, shade in [((0, .66, .3, .55, .62, .6, 1, .71), "#e5d1b0", "#b1946d"),
                          ((0, .8, .28, .87, .55, .69, 1, .79), "#efdcbb", "#c4a67e"),
                          ((0, .94, .4, .86, .75, .97, 1, .9), "#f4e5c8", "#d3b58c")]:
        x0, ya, ax, ay, cx, cy, x1, yb = p
        s = np.linspace(0, 1, 4096, dtype="f4")
        ms = 1 - s
        bx = ms ** 3 * x0 + 3 * ms ** 2 * s * ax + 3 * ms * s ** 2 * cx + s ** 3 * x1
        by = ms ** 3 * ya + 3 * ms ** 2 * s * ay + 3 * ms * s ** 2 * cy + s ** 3 * yb
        ridge = np.interp(xx.ravel() / w, bx, by) * h
        grad = np.clip((xx / w - 0.55) / 0.45, 0, 1)
        fillc = hx(lit) * (1 - grad[..., None]) + hx(shade) * grad[..., None]
        m = cov(ridge[None, :] - yy)
        img = img * (1 - m[..., None]) + fillc * m[..., None]
        # Crest highlight: a thin bright line along the curve itself.
        hw = max(1.0, 0.25 * PX / 2)
        m = cov(np.abs(yy - ridge[None, :]) - hw) * 0.45
        img = img * (1 - m[..., None]) + np.float32(1.0) * m[..., None]

    # iOS dims the home-screen wallpaper, which is what keeps white labels
    # legible and stops the real icon artwork looking pasted on.
    dim = np.interp(np.arange(h, dtype="f4") / h, [0, 0.4, 1], [0.30, 0.08, 0.34])
    img = img * (1 - dim.astype("f4")[:, None, None])
    return np.clip(img, 0, 1)


# -- liquid glass ------------------------------------------------------------

def glass(c, bg, x, y, w, h, r, tint=None):
    """Blurred wallpaper through a rounded slab: tint, specular, refracting rim."""
    shadow_sigma = max(1.0, h * 0.11)
    sy, sx = c.crop(x, y, w, h, pad=int(shadow_sigma * 3 + 4))
    xx, yy = c.xx[:, sx], c.yy[sy, :]

    sh = blur(cov(sdf_rrect(xx, yy - h * 0.05, x, y, w, h, r)), shadow_sigma)
    c.over(sy, sx, (0, 0, 0), sh * 0.28)

    d = sdf_rrect(xx, yy, x, y, w, h, r)
    inside = cov(d)
    body = bg[sy, sx].copy()
    if tint is not None:
        g = np.clip((yy - y) / h, 0, 1)
        col = hx(tint[0]) * (1 - g[..., None]) + hx(tint[1]) * g[..., None]
        body = body * 0.2 + col * 0.8
    else:
        body = body * 0.78 + 0.22
    hl = 0.5 * np.clip(1 - np.hypot(xx - (x + w * 0.3), yy - y) / (w * 0.85), 0, 1)
    body = body * (1 - hl[..., None]) + hl[..., None]
    c.over(sy, sx, body, inside)

    lw = max(3.0, min(w, h) * 0.05)
    rim = inside * cov(-(d + lw / 2))
    ra = np.interp(np.clip((yy - y) / h, 0, 1), [0, 0.5, 1], [0.95, 0.3, 0.7]).astype("f4")
    c.over(sy, sx, (1, 1, 1), rim * ra)


def icon(c, x, y, s, name):
    """App icon: Apple's own artwork, which already carries its squircle."""
    blit(c, art(name), x, y, s, s)


# -- text pass ---------------------------------------------------------------

def draw_text(c):
    """Rasterise c.texts with blf into a GPU offscreen, then composite in numpy."""
    import blf
    import bpy
    import gpu
    from mathutils import Matrix

    if bpy.app.background:
        gpu.init()  # background Blender has no GPU context until this is called
    W, H = c.w, c.h
    proj = Matrix.Identity(4)
    proj[0][0], proj[1][1], proj[0][3], proj[1][3], proj[2][2] = 2 / W, 2 / H, -1, -1, -1
    fid = blf.load(FONT)
    off = gpu.types.GPUOffScreen(W, H)
    layers = []
    for shadowed in (True, False):
        items = [t for t in c.texts if (t[6] > 0) == shadowed]
        if not items:
            layers.append(None)
            continue
        with off.bind():
            fb = gpu.state.active_framebuffer_get()
            fb.clear(color=(0, 0, 0, 0))
            gpu.matrix.load_matrix(Matrix.Identity(4))
            gpu.matrix.load_projection_matrix(proj)
            for s, x, y, size, align, col, _sh in items:
                blf.size(fid, size)
                blf.color(fid, col[0], col[1], col[2], 1.0)
                tw = blf.dimensions(fid, s)[0]
                px = x - tw / 2 if align == "center" else x
                blf.position(fid, px, H - (y + size * ASCENT), 0)
                blf.draw(fid, s)
            buf = fb.read_color(0, 0, W, H, 4, 0, "FLOAT")
        layers.append(np.asarray(buf, dtype="f4")[::-1].copy())
    off.free()
    blf.unload(FONT)

    lit, plain = layers
    if lit is not None:
        sig = max(1.0, np.mean([t[3] for t in c.texts if t[6] > 0]) * 0.25)
        c.img[:] = c.img * (1 - (blur(lit[..., 3], sig) * 0.45)[..., None])
        c.over(slice(None), slice(None), lit[..., :3], lit[..., 3])
    if plain is not None:
        c.over(slice(None), slice(None), plain[..., :3], plain[..., 3])


# -- layout ------------------------------------------------------------------

def screen(width_mm, height_mm, cols):
    """Bake one display: black bezel, dune wallpaper, iOS home screen on `cols`."""
    mm = lambda v: v * PX
    w, h = round(width_mm * PX), round(height_mm * PX)
    bez, rad = mm(BEZEL_MM), mm(RADIUS_MM)
    c = Canvas(w, h)
    wall = dunes(w, h)
    bg = blur(wall, mm(1.4))
    c.img[:] = wall

    # Status bar: clock, front-camera punch hole, real SF Symbols to its left.
    c.text("9:41", bez + mm(6), bez + mm(3.2), mm(4))
    hx_, hy = w - bez - mm(9), bez + mm(6.2)
    sy, sx = c.crop(hx_ - mm(3), hy - mm(3), mm(6), mm(6), pad=2)
    c.over(sy, sx, (0, 0, 0), cov(np.hypot(c.xx[:, sx] - hx_, c.yy[sy, :] - hy) - mm(2.6)))
    gx = hx_ - mm(6)
    for nm, gh in (("battery-100", 2.4), ("wifi", 2.8), ("cellularbars", 2.6)):
        a = sym(nm)
        gw = mm(gh) * a.shape[1] / a.shape[0]
        gx -= gw
        blit(c, a, gx, hy - mm(gh) / 2, gw, mm(gh), col=(1, 1, 1))
        gx -= mm(1.6)

    # Grid: two 2x2 widgets top-left, apps fill the rest, dock below.
    margin = bez + mm(5)
    cell = (w - 2 * margin) / cols
    size = min(cell * 0.68, mm(13.5))
    pad = (cell - size) / 2
    row_h = size + mm(5.5)
    top = bez + mm(10.5)
    dh = size + mm(4)
    dy = h - bez - mm(3) - dh
    rows = int((dy - mm(1.5) - top - (size + mm(3.9))) // row_h) + 1

    wh = row_h + size
    ww = cell * 2 - pad * 2
    wr = size * 0.3
    glass(c, bg, margin + pad, top, ww, wh, wr, ("#3f8ff5", "#1e5fd8"))
    tx = margin + pad + mm(3)
    c.text("San Francisco", tx, top + mm(3), mm(2.6))
    c.text("12°", margin + pad + mm(2.5), top + mm(6), mm(9))
    c.text("Partly Cloudy", tx, top + wh - mm(9), mm(2.6))
    c.text("H:18°  L:11°", tx, top + wh - mm(5.2), mm(2.6), col=(0.8, 0.8, 0.8))

    mx = margin + cell * 2 + pad
    glass(c, bg, mx, top, ww, wh, wr, ("#f1ecdf", "#dfe6d3"))
    sy, sx = c.crop(mx, top, ww, wh, pad=2)
    xx, yy = c.xx[:, sx], c.yy[sy, :]
    clip = cov(sdf_rrect(xx, yy, mx, top, ww, wh, wr))
    for x0, y0, x1, y1 in [(0, .3, 1, .45), (.35, 0, .5, 1), (0, .8, 1, .65)]:
        a, b = (mx + x0 * ww, top + y0 * wh), (mx + x1 * ww, top + y1 * wh)
        ex, ey = b[0] - a[0], b[1] - a[1]
        L = math.hypot(ex, ey)
        t = np.clip(((xx - a[0]) * ex + (yy - a[1]) * ey) / L ** 2, 0, 1)
        dist = np.hypot(xx - (a[0] + t * ex), yy - (a[1] + t * ey))
        c.over(sy, sx, (1, 1, 1), cov(dist - mm(1.6) / 2) * clip)
    park = np.hypot((xx - (mx + ww * .75)) / (ww * .18), (yy - (top + wh * .25)) / (wh * .14))
    c.over(sy, sx, hx("#b9d7a8"), cov((park - 1) * ww * 0.18) * clip)
    pin = np.hypot(xx - (mx + ww * .5), yy - (top + wh * .55))
    c.over(sy, sx, hx("#3478f6"), cov(pin - mm(2.2)) * clip)
    c.over(sy, sx, (1, 1, 1), cov(np.abs(pin - mm(2.2)) - mm(0.6) / 2) * clip)
    c.text("Weather", margin + cell, top + wh + mm(1.2), mm(2.7), "center", shadow=0.45)
    c.text("Maps", margin + cell * 3, top + wh + mm(1.2), mm(2.7), "center", shadow=0.45)

    n = 0
    for r in range(rows):
        for col in range(cols):
            if r < 2 and col < 4:
                continue
            if n >= len(APPS):
                break
            app = APPS[n]
            x, y = margin + col * cell + pad, top + r * row_h
            icon(c, x, y, size, app)
            c.text(app, x + size / 2, y + size + mm(1.2), mm(2.7), "center", shadow=0.45)
            n += 1

    dw = len(DOCK) * cell + mm(2)
    dx = (w - dw) / 2
    glass(c, bg, dx, dy, dw, dh, dh * 0.34)
    for i, app in enumerate(DOCK):
        icon(c, dx + mm(1) + i * cell + pad, dy + mm(2), size, app)

    draw_text(c)
    # Black bezel with rounded glass corners, punched last so nothing spills.
    m = cov(sdf_rrect(c.xx, c.yy, bez, bez, w - 2 * bez, h - 2 * bez, rad))
    c.img *= m[..., None]
    return np.clip(c.img, 0, 1)


def bake(name, width_mm, height_mm, cols, rebuild=False):
    """Return a bpy image for one display, caching the PNG next to this file."""
    import bpy

    path = os.path.join(TEX_DIR, name + ".png")
    img = bpy.data.images.get(name)
    if img is not None:
        if not rebuild:
            return img
        bpy.data.images.remove(img)
    if os.path.exists(path) and not rebuild:
        img = bpy.data.images.load(path)
        img.name = name
        img.colorspace_settings.name = "sRGB"
        return img

    a = screen(width_mm, height_mm, cols)
    h, w = a.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=False, float_buffer=True)
    # Colorspace first: changing it on a generated image reallocates the buffer,
    # which silently wipes anything already written.
    img.colorspace_settings.name = "sRGB"
    rgba = np.ones((h, w, 4), dtype="f4")
    rgba[..., :3] = a
    img.pixels.foreach_set(rgba[::-1].ravel())  # bpy images are bottom-up
    img.update()  # without this the buffer is never flushed and saves out black
    os.makedirs(TEX_DIR, exist_ok=True)
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    return img
