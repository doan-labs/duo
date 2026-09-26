# iPhone Duo — Blender / Cycles

Path-traced version of the Three.js model in `src/`. Same millimetre figures
(`HW/HH/HT/HR`, `LIP`, `SPINE`, `RAIL_BEV` mirror `src/main.ts`).

The studio and the materials here are the reference, and `src/studio.ts` is the
WebGL port of them — same five-stop world ramp, same five area lights at the
same watts, same roughness spreads and base colours. Nothing is exported: the
web build already has this geometry to the millimetre, and none of what makes
these renders work is a mesh. What is still genuinely different:

| | `src/` (WebGL) | this (Cycles) |
|---|---|---|
| Titanium grain | anisotropy at a fixed rotation | radial-Z tangent, so the grain follows the perimeter |
| Lens cover | screen-space refraction, half res | traced through sapphire at IOR 1.77 |
| Displays | emissive map + bloom pass | emitters that light each other and the rails |
| Shadow | one dim directional standing in | soft, from the area lights themselves |
| Roughness/bump | one tileable fBm canvas | 3D noise in a shared object space, plus micro-bump |
| Screen texture | drawn live in `src/screen.ts` | baked by `screen_tex.py` from the same `src/icons` |

## Files

- `iphone_duo.py` — geometry, materials, studio, cameras. Build + render entry point.
- `screen_tex.py` — bakes the iOS home screen to a texture. numpy for shapes
  (Blender bundles no PIL), Blender's `blf` + `gpu` offscreen for text, and the
  real app artwork out of `src/icons`, so the render and the site show the same
  icons in the same order (`APPS`/`DOCK` mirror `HOME_APPS`/`HOME_DOCK` in
  `src/os.ts`). Camera has no macOS app, so it is drawn.
- `bridge.py` — sends Python to a running Blender over the MCP add-on's socket.

## Use

Build into the Blender you have open (needs the MCP add-on running on :9876):

```bash
python3 blender/bridge.py blender/iphone_duo.py
```

Render. Must be headless — in the GUI `bpy.ops.render.render` is modal and
returns before it has traced anything, writing an empty file:

```bash
BL=/Applications/Blender.app/Contents/MacOS/Blender
$BL -b --python blender/iphone_duo.py -- --render hero              # preview, ~14 s
$BL -b --python blender/iphone_duo.py -- --render all --final       # all four, ~20 min
$BL -b --python blender/iphone_duo.py -- --render back --save       # also writes .blend
```

Views: `hero` (open 29°, both inner panels), `cover` (shut, outer display),
`back` (shut, camera plateau), `macro` (lens close-up). `--render` takes a comma
list or `all`; each view rebuilds the collection because they differ in fold and
flip, which still beats paying Blender's startup once per shot. Other flags:
`--samples N`, `--res N`, `--fold 0..1`, `--rebuild-tex`, `--comp` (bloom),
`--final`, `--save`.

Textures cache to `tex/*.png`. `--rebuild-tex` re-bakes them; it works headless
because `draw_text` calls `gpu.init()` first — background Blender has no GPU
context until something asks for one, and `blf` into an offscreen needs it.

## Notes

- Re-running wipes and rebuilds only the `iPhone Duo` collection.
- `LIP` applies to the outer three edges only. The inner panels carry no bezel
  at the spine — they butt at the hinge axis and take exactly half the image
  each, so the wallpaper carries across and the fold reads as a crease in one
  display. There used to be a 0.7 mm `SEAM` inset per half "so the fold reads as
  a hinge"; on the real device there is no line there at all.
- `FOLD` 1 = flat open, 0 = shut. The hinge axis sits on the front plane open
  and walks out by `2*PROUD + SHUT_GAP` as it closes, so the inner panels end up
  parallel with air between them instead of interpenetrating. The shut views
  used to dodge that by parking the halves 3.6° ajar, which at the free edge is
  a ~5 mm wedge you could see both inner displays through — it showed up in the
  back shot as wallpaper bleeding across the edge of the back glass.
- No light sits behind the subject: at grazing incidence Fresnel reaches 1
  whatever the coating is, and a back light lands on the panels as a bright
  swath that no Coat IOR will tame.

## Lighting metal

The first version of this file said "a black room with a few hot strips".
That was wrong, and it cost the whole first render pass. Metal has no colour of
its own — every pixel of it is a mirror. Put it in a black room and it renders
black, which is exactly what happened: the titanium frame was *invisible* in the
hero shot and the back glass read as flat grey paint.

What actually fixed it, in order of how much each mattered:

1. **The environment, not the lamps, carries the gradient.** The world is a
   five-stop ramp on `Incoming.Z` with a bright wide band at the horizon, which
   is the studio wall every glossy surface falls off across. A lamp only sits at
   *one* camera's mirror angle; `hero` and `back` look from opposite sides, so
   no lamp rig can serve both. Because the band is bright, the floor is 8 m —
   large enough that the band is only ever seen in a reflection, never directly
   as a stripe across the top of frame.
2. **Lights are sized as the shapes they should draw.** Cycles area lights show
   up in glossy rays, so their dimensions *are* the highlight's dimensions. The
   1.30 × 0.10 m overhead strip is what draws the streak down the chamfer.
3. **Roughness had been tuned for the black room.** Titanium at 0.28–0.38 and a
   coat at 0.22 blur a real environment into one average grey. 0.13–0.30 and
   0.07 respectively.
4. **Base colours were too bright.** A back panel at `#b8b5ae` with metallic 0
   has a diffuse term that swamps every reflection. `#8f8c85`, and let the coat
   supply the brightness.
5. **Depth of field was hiding the model.** DOF goes as (subject/focal)², so at
   0.54 m on an 85 mm lens f/5.6 holds ~13 mm — under a tenth of the device.
   The f-stops are f/25–f/32 now.

Power is total watts, so a box nine times the area at twice the distance needs
the same order of watts, not nine times more. The rig totals ~20 W for a 165 mm
subject; the world supplies the rest.

## Blender 5.2 gotchas that cost real time

- `bpy.ops.render.render(write_still=True)` in a GUI Blender is **modal**. It
  returns before tracing and `write_still` saves an empty frame. Either render
  headless (what this does) or use `'INVOKE_DEFAULT'` and poll for the file.
- `scene.node_tree` is gone. The compositor is `scene.compositing_node_group`, a
  `CompositorNodeTree` node group wired Group Input → … → Group Output. Glare is
  socket-driven now: `glare_type` and `quality` are no longer properties, they
  are inputs (`Type`, `Quality`, `Threshold`, `Strength`, `Size`, …).
- Setting `image.colorspace_settings.name` on a generated image **reallocates the
  buffer** and wipes anything already written. Set colorspace *first*, then
  `pixels.foreach_set(...)`, then `image.update()`. Skip `update()` and the file
  saves out black.
- `bmesh.ops.extrude_face_region` on a lone face leaves the bottom open. Building
  both caps plus the wall quads by hand (`prism`) is shorter than fixing it.
- A solid `cyl()` cannot be a lens ring — it caps the barrel and everything
  behind it disappears. That is what `tube()` is for.
- `gpu` + `blf` offscreen text needs an ortho projection in pixel space; with an
  identity matrix the draw silently lands off-screen. Read back with
  `np.asarray(buffer)`, never `buffer.to_list()`.
- `Image.pixels` on a byte image is the **raw** buffer — `sRGB` on the datablock
  does not mean the floats come back linear. Straight alpha, so a plain
  `dst*(1-a) + rgb*a` composite is right. Images are bottom-up, hence `[::-1]`.
- SF Symbols export onto a square canvas whatever the glyph's real aspect is.
  Crop to the alpha bounding box or every one lays out at the wrong width.

### Finding a specular artifact

Do not guess. Give each light a primary colour, render once, and read the
culprit off the wash. That found the back-light problem in one 8 s render after
two wrong guesses (floor bounce, then emission level) had each cost several.

Emission must stay under AgX's shoulder — past ~1.5 a white icon and a pale
dune compress to the same tone and the panel reads as fog. But it is a ratio,
not an absolute: at `0.95` the panel was right for a black room and greyed out
once the environment came in, because the coat now had something to reflect.
`EMISSION = 1.3` with `Coat Weight` at 0.7 is the balance.

## Not done

- No hinge mechanism. At 29° the gap behind the spine is ~2 mm and out of frame
  in every view here. Add a spine barrel if you
  want a side-on shot.
- Screen text ignores font weights — SF Pro is a variable font and `blf` cannot
  set an axis, so 300/500/600 all render at the default weight.
- Cover glass has no thickness (0.15 mm slab, coat does the work). Fine until
  something needs to refract through the panel edge.
