# Alpha from a black and a white shot of the same layer: a pixel's alpha is
# 1 - (white - black) / 255, and its colour is the black shot over that alpha.
# One crop for all six, so they stay registered. Prints each layer's rightmost
# pixel, which architecture.tsx keeps as EDGE for the leaders, and its outline
# as its four extreme pixels, kept as HIT for the hover area.
import json, sys
import numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
L = ['window', 'shell', 'os', 'runtime', 'app', 'sdk']
out = {}
imgs = {}
box = None
for n in L:
    k = np.asarray(Image.open(f'{src}/{n}-k.png').convert('RGB')).astype(np.float32)
    w = np.asarray(Image.open(f'{src}/{n}-w.png').convert('RGB')).astype(np.float32)
    a = np.clip(1 - (w - k).mean(axis=2) / 255, 0, 1)
    rgb = np.where(a[..., None] > 0.004, k / np.maximum(a[..., None], 0.004), 0)
    rgba = np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8)
    imgs[n] = rgba
    ys, xs = np.nonzero(a > 0.02)
    b = [xs.min(), ys.min(), xs.max() + 1, ys.max() + 1]
    box = b if box is None else [min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3])]
pad = 8
box = [box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad]
S = 0.8  # the 3x capture, kept at twice the hero's widest size so a retina screen or a zoom stays sharp
UNIT = 2  # file pixels per viewBox unit in architecture.tsx, so its W, H, EDGE and HIT hold across resolutions
for n in L:
    im = Image.fromarray(imgs[n]).crop(box)
    im = im.resize((round(im.width * S), round(im.height * S)), Image.LANCZOS)
    im.save(f'{dst}/{n}.webp', quality=88, method=6)
    a = np.asarray(im)[..., 3]
    ys, xs = np.nonzero(a > 40)
    i = xs.argmax()
    ext = [xs.argmin(), ys.argmin(), xs.argmax(), ys.argmax()]
    u = lambda j: [round(xs[j] / UNIT), round(ys[j] / UNIT)]
    out[n] = {'right': u(i), 'hit': [u(j) for j in ext]}
print(json.dumps({'size': [round(im.width / UNIT), round(im.height / UNIT)], 'layers': out}))
