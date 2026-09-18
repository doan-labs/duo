import { loadIcons, WALLPAPER } from '@doan-labs/duo-uikit/icons/index.ts'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { USDLoader } from 'three/addons/loaders/USDLoader.js'
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'
import { buttons } from './buttons.ts'
import { busy, device, follow, goHome, lockState } from './device.ts'
import { press } from './device-buttons.ts'
import { mountHud } from './hud.tsx'
import { isDesktop } from './native.ts'
import { os } from './os.tsx'
import { updateDisplays } from './runtime/display.ts'
import { subscribeRegistry } from './runtime/registry.ts'
import { subscribeWidgets, widgetSnapshot } from './runtime/widgets.tsx'
import { screen } from './screen.ts'
import foldGlsl from './shaders/fold.ts'
import screenGlsl from './shaders/screen.ts'
import { toggles } from './springboard/toggles.ts'

// Units are centimetres: Apple's USDZ is in metres and gets scaled by 100, then
// dropped by 5.8974 so the hinge sits at the origin. The body is Apple's own
// model (public/model, see scripts/prepare-model.py).
const HINGE_Z = 0.275454 // hinge axis, cm in front of the origin
const INNER_Z = 0.24948 // inner display glass plane
const OUTER_Z = 2 * HINGE_Z - 0.825538 // outer display glass plane when open
const EYE = new THREE.Vector3(0, 0, 40)
// Display rectangles in cm: x, y, width, height.
const INNER = new THREE.Vector4(-7.89935, 0.34562 - 5.8974, 15.7987, 11.1035)
const OUTER = new THREE.Vector4(0.23396, 0.27173 - 5.8974, 7.73936, 11.2513).multiplyScalar(
  (EYE.z - INNER_Z) / (EYE.z - 0.825538)
)

const mix = (a: number, b: number, t: number) => a + (b - a) * t
// GLSL has no imports: hand the shaders their constants as defines.
const defines = `#define HINGE_Z ${HINGE_Z}\n#define INNER_Z ${INNER_Z}\n#define OUTER_Z ${OUTER_Z.toFixed(6)}\n`
const foldShader = defines + foldGlsl
const screenShader = defines + screenGlsl

// The desktop window is transparent and frameless: the wallpaper is the backdrop.
document.documentElement.classList.toggle('web', !isDesktop)

// An embedding page drives the backdrop and the pose: `?bg=` at load, then
// `{ deg, yaw, bg }` by postMessage. Same-origin only, so the site that ships
// the shell is the only sender. Registered before the model loads so a
// message sent at the frame's load event is not lost; the pose waits below.
type Pose = { deg?: number; yaw?: number; bg?: string }
const paint = (bg: string | null) => {
  if (bg) document.body.style.background = bg
}
paint(new URLSearchParams(location.search).get('bg'))
let pose: ((m: Pose) => void) | null = null
let queued: Pose | null = null
addEventListener('message', (e: MessageEvent<Pose>) => {
  if (e.source !== parent || e.origin !== location.origin || typeof e.data !== 'object' || !e.data) return
  if (typeof e.data.bg === 'string') paint(e.data.bg)
  if (pose) pose(e.data)
  else queued = { ...queued, ...e.data }
})

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setClearColor(0xf6f6f3, 0)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.18
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
pmrem.dispose()
scene.environmentIntensity = 1.35
scene.add(new THREE.HemisphereLight(0xffffff, 0xb5baa8, 1.8))
const key = new THREE.DirectionalLight(0xfffcf5, 2.6)
key.position.set(-15, 25, 30)
scene.add(key)
const rim = new THREE.DirectionalLight(0xe8edf5, 2)
rim.position.set(15, 5, -15)
scene.add(rim)

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 250)
camera.position.copy(EYE)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.minDistance = 21
controls.maxDistance = 65
controls.target.set(0, 0, HINGE_Z)
controls.update()

// `phone` turns with the Flip button; `body` inside it gives a little under a
// finger on a button (packages/shell/buttons.ts) and carries every mesh and panel.
const phone = new THREE.Group()
scene.add(phone)
const body = new THREE.Group()
phone.add(body)
// 0 open, PI closed. Shared by every moving mesh's vertex shader.
const bend = { value: 0 }

// Screen textures, baked by packages/shell/screen.ts (metres in, canvas out).
const icons = await loadIcons()
function screenMaterial(tex: THREE.Texture, frame: THREE.Vector4, gradient: [number, number]) {
  const img = tex.image as HTMLCanvasElement
  return {
    material: new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
    frame: { value: frame },
    gradient: { value: new THREE.Vector2(...gradient) },
    pixel: { value: new THREE.Vector2(1 / img.width, 1 / img.height) }
  }
}
const maxAniso = renderer.capabilities.getMaxAnisotropy()
const bake = (lock: boolean) => {
  const t = {
    inner: screen(INNER.z / 100, INNER.w / 100, true, icons, lock),
    outer: screen(OUTER.z / 100, OUTER.w / 100, false, icons, lock)
  }
  t.inner.anisotropy = t.outer.anisotropy = maxAniso
  return t
}
let home = bake(false)
let weatherSnapshot = JSON.stringify(widgetSnapshot())
subscribeWidgets(() => {
  const next = JSON.stringify(widgetSnapshot())
  if (next === weatherSnapshot) return
  weatherSnapshot = next
  const previous = home
  home = bake(false)
  previous.inner.dispose()
  previous.outer.dispose()
})
subscribeRegistry(() => {
  const previous = home
  home = bake(false)
  previous.inner.dispose()
  previous.outer.dispose()
})
let lockshot = bake(true)
const screens = {
  inner: screenMaterial(home.inner, INNER, [0.5, 0]),
  outer: screenMaterial(home.outer, OUTER, [0, 1])
}
// The baked lock screen carries the real time like the live one: redraw it on
// the minute so the numerals do not jump when a fold swaps live for baked.
const onMinute = () => {
  if (lockState.locked) {
    lockshot.inner.dispose()
    lockshot.outer.dispose()
    lockshot = bake(true)
  }
  setTimeout(onMinute, 60_000 - (Date.now() % 60_000))
}
setTimeout(onMinute, 60_000 - (Date.now() % 60_000))

const MOVING = 'upTUAKvMVkPOMKq'
const FIXED = 'SiftyleUEEZwLhF'
const FLEXIBLE = ['JnJdTkxbQgUtLwU', 'xdyyaajWsatVNxN', 'UXtsBZYlaUvHoEh', 'MvKPXGSdYDVvSpk']
const SCREEN: Record<string, keyof typeof screens> = { UXtsBZYlaUvHoEh: 'inner', hhgAIoCGsHXeDPY: 'outer' }
/**
 * Apple's file carries a 96-vertex proxy the size of the whole phone and 6.1 cm
 * deep, five times the body's thickness, that paints nothing at any pose
 * (docs/debug.md §2). It is in no other list because it costs nothing to draw;
 * `frame()` is the one place its bounds would matter, and there they would
 * shrink the phone by a third.
 */
const PHANTOM = 'lJPfQMFXvvcmdtA'

/**
 * The phone's bounds for `frame()`, in body space and in two piles: what the
 * fold shader turns and what it leaves. It turns the first pile itself, because
 * the fold lives in a vertex shader and a mesh's own bounds never see it.
 * A box per mesh rather than one union: the camera plateau is 0.85 cm deep in
 * its own corner, and a union would carry that depth out to the far corners and
 * shrink the phone for a corner that is not there.
 */
const still: THREE.Box3[] = []
const folds: THREE.Box3[] = []

const model = await new USDLoader().loadAsync('/model/iPhone_Duo_Render.usdc')
model.scale.multiplyScalar(100)
model.updateMatrixWorld(true)
model.traverse((object) => {
  const src = object as THREE.Mesh
  if (!src.isMesh) return
  const geometry = src.geometry.clone().applyMatrix4(src.matrixWorld)
  geometry.translate(0, -5.8974, 0)
  let ancestor: THREE.Object3D | null = object
  while (ancestor && ancestor.name !== MOVING && ancestor.name !== FIXED) ancestor = ancestor.parent
  const moving = ancestor?.name === MOVING
  const flexible = FLEXIBLE.includes(object.name)
  const kind = SCREEN[object.name]
  const material: THREE.Material = kind ? screens[kind].material : (src.material as THREE.Material).clone()
  if (kind) {
    const p = geometry.attributes.position!
    const uv = new Float32Array(p.count * 2)
    for (let i = 0; i < p.count; i++) {
      uv[i * 2] = kind === 'inner' ? (p.getX(i) - INNER.x) / INNER.z : (-OUTER.x - p.getX(i)) / OUTER.z
      uv[i * 2 + 1] = kind === 'inner' ? (p.getY(i) - INNER.y) / INNER.w : (p.getY(i) - OUTER.y) / OUTER.w
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  }
  if (moving || flexible) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.foldAngle = bend
      if (kind) {
        shader.uniforms.uiFrame = screens[kind].frame
        shader.uniforms.uiGradient = screens[kind].gradient
        shader.uniforms.uiReferenceEye = { value: EYE }
        shader.uniforms.uiPixel = screens[kind].pixel
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <map_pars_fragment>',
            `#include <map_pars_fragment>\n${kind === 'inner' ? '#define INNER_UI' : ''}\n${screenShader}`
          )
          .replace('#include <map_fragment>', 'diffuseColor.rgb *= screenColor();')
        shader.vertexShader = `varying vec3 vUIPosition;\n${shader.vertexShader}`.replace(
          '#include <project_vertex>',
          'vUIPosition = transformed;\n#include <project_vertex>'
        )
      }
      shader.vertexShader = `${flexible ? '#define FLEXIBLE_SCREEN\n' : ''}${foldShader}\n${shader.vertexShader}`
        .replace(
          '#include <begin_vertex>',
          flexible
            ? 'vec4 folded = bendStrip(position);\nvec3 transformed = vec3(folded.x, position.y, folded.y);'
            : 'vec2 folded = rotateHinge(position.xz);\nvec3 transformed = vec3(folded.x, position.y, folded.y);'
        )
        .replace(
          '#include <beginnormal_vertex>',
          `
          vec3 objectNormal = vec3(normal);
          ${flexible ? 'vec4 strip = bendStrip(position); float a = atan(-strip.w, strip.z);' : 'float a = foldAngle;'}
          objectNormal.x = cos(a) * normal.x + sin(a) * normal.z;
          objectNormal.z = -sin(a) * normal.x + cos(a) * normal.z;`
        )
    }
    material.customProgramCacheKey = () => `${flexible ? 'fold-flexible' : 'fold-cover'}-${kind ?? 'body'}`
  }
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = object.name
  mesh.frustumCulled = false
  body.add(mesh)
  if (object.name !== PHANTOM) {
    geometry.computeBoundingBox()
    ;(moving || flexible ? folds : still).push(geometry.boundingBox as THREE.Box3)
  }
})
const hardware = buttons(body, camera, renderer.domElement, press)

// The flash LED beside the rear cameras: Apple's 3.4 × 1.6 mm recess on the
// plateau, its emitter at the bottom under a glass cover (the housing around
// them stays dark, or the pill loses its edge). White on a white body is not a
// lit look on its own, so a small cool halo sits just off the glass and a point
// light spills onto the plateau as a real LED does. The halo is blended, not
// added: additive light on a white body clips to a flat white disc. Driven by
// the same switch Control Center and the lock screen flip (`toggles.torch`).
const LED = ['FafuGBBSaHXLqhj', 'itODWJLNRbBbHzD']
const led = body.children.filter((m): m is THREE.Mesh => LED.includes(m.name))
for (const m of led) (m.material as THREE.MeshStandardMaterial).emissive.set(0xf4f7ff)
const ledAt = new THREE.Vector3(3.263, 10.675 - 5.8974, -0.64)
const glowCanvas = document.createElement('canvas')
glowCanvas.width = glowCanvas.height = 128
const g = glowCanvas.getContext('2d')!
const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
grad.addColorStop(0, 'rgba(255,255,255,1)')
grad.addColorStop(0.2, 'rgba(225,236,255,.7)')
grad.addColorStop(0.5, 'rgba(190,210,255,.18)')
grad.addColorStop(1, 'rgba(190,210,255,0)')
g.fillStyle = grad
g.fillRect(0, 0, 128, 128)
const glow = new THREE.Sprite(
  new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCanvas), depthWrite: false, transparent: true })
)
glow.position.copy(ledAt).z -= 0.08
glow.scale.setScalar(1.3)
body.add(glow)
const ledLight = new THREE.PointLight(0xe8eeff, 0, 6, 2)
ledLight.position.copy(ledAt).z -= 0.5
body.add(ledLight)

// Live displays: real DOM (iframes, inputs, video) placed in the scene by
// CSS3DRenderer and drawn over the WebGL canvas. The baked textures show
// underneath while the hinge moves, when a flat DOM panel can't bend.
const css = new CSS3DRenderer()
css.domElement.style.cssText = 'position:fixed;inset:0;pointer-events:none'
document.body.appendChild(css.domElement)
const PXCM = 0.02 // 1 CSS px = 0.2 mm, so the outer display is ~387 px wide like an iPhone
const px = (cm: number) => Math.round(cm / PXCM)
// A deep link into an app lands past the lock screen.
lockState.locked = !new URLSearchParams(location.search).get('app')
function live(w: number, h: number) {
  // Pre-attach hidden roots to the renderer's camera layer: moving a live iframe reloads its document.
  const container = css.domElement.firstElementChild!.firstElementChild as HTMLElement
  const o = new CSS3DObject(os(w, h, WALLPAPER, container, new URLSearchParams(location.search).get('app')))
  o.scale.setScalar(PXCM)
  return o
}
const innerLive = live(px(INNER.z), px(INNER.w))
innerLive.position.set(INNER.x + INNER.z / 2, INNER.y + INNER.w / 2, INNER_Z + 0.005)
body.add(innerLive)
// The outer panel rides the cover half: same hinge rotation as the shader.
const hinge = new THREE.Group()
hinge.position.z = HINGE_Z
body.add(hinge)
const outerLive = live(px(7.73936), px(11.2513))
outerLive.position.set(-0.23396 - 7.73936 / 2, 0.27173 - 5.8974 + 11.2513 / 2, OUTER_Z - HINGE_Z - 0.005)
outerLive.rotation.y = Math.PI
hinge.add(outerLive)

// The bands around the phone, in pixels: it hangs centred in what they leave.
// Everything outside it is transparent desktop the window blocks for nothing, so
// a band is its widget (the pill, 50 px tall 28 px up; the orbit card, 112 px
// wide with the same margin — both packages/shell/hud.tsx) plus PAD of slack, and the bare
// sides are PAD alone. Change one here and in hud.tsx.
const PAD = 24
const HUD_BAND = 78 + PAD
const RIGHT_BAND = 140 + PAD
const TOP_BAND = PAD
const LEFT_BAND = PAD
/** Pixels per centimetre face on: the size Apple's reference renders it. */
const SCALE = 37

const corner = new THREE.Vector3()
const eye = new THREE.Vector3()
const right = new THREE.Vector3()
const above = new THREE.Vector3()
const behind = new THREE.Vector3()

/**
 * Fit the phone into the box the bands leave, at the reference size or under
 * it. Turned edge-on its near half is perspective-magnified — 19.8 cm tall
 * against 11.9 flat, measured, docs/debug.md §2 — so a frame cut to the front
 * view crops as soon as the view turns, and one cut to the worst view wants a
 * bigger window than the one we set out to shrink. The phone gives way instead:
 * it shrinks as it turns and never leaves the window.
 *
 * Off the reference eye rather than the camera's own, so the wheel still zooms
 * (and zoomed in past about 36 cm still crops) and only turning shrinks it.
 */
function frame() {
  const { innerWidth: w, innerHeight: h } = window
  const boxW = w - LEFT_BAND - RIGHT_BAND
  const boxH = h - TOP_BAND - HUD_BAND
  scene.updateMatrixWorld()
  eye.copy(camera.position).sub(controls.target).setLength(EYE.z).add(controls.target)
  right.setFromMatrixColumn(camera.matrixWorld, 0)
  above.setFromMatrixColumn(camera.matrixWorld, 1)
  behind.setFromMatrixColumn(camera.matrixWorld, 2)
  let tanX = 0
  let tanY = 0
  // The turning half is measured in the hinge's own space, which is how the
  // shader turns it: subtract the axis, then let the group's matrix rotate it.
  for (const [boxes, matrix, axis] of [
    [still, body.matrixWorld, 0],
    [folds, hinge.matrixWorld, HINGE_Z]
  ] as const)
    for (const box of boxes)
      for (let i = 0; i < 8; i++) {
        corner
          .set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, (i & 4 ? box.max.z : box.min.z) - axis)
          .applyMatrix4(matrix)
          .sub(eye)
        const depth = Math.max(-corner.dot(behind), 1)
        tanX = Math.max(tanX, Math.abs(corner.dot(right)) / depth)
        tanY = Math.max(tanY, Math.abs(corner.dot(above)) / depth)
      }
  const pixelsPerUnit = Math.max(8, Math.min(boxW / (2 * EYE.z * tanX), boxH / (2 * EYE.z * tanY), SCALE))
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(h / pixelsPerUnit / 2 / EYE.z))
  // The camera aims at the phone and so draws it in the middle of the window;
  // the bands want it in the middle of what they leave. Slide the image, not the
  // phone: off the orbit pivot the phone would swing as the view turns and leave
  // the window from behind. An off-centre frustum is a pure pixel translation,
  // and CSS3DRenderer applies the same one to the live panels from `camera.view`.
  const dx = LEFT_BAND + boxW / 2 - w / 2
  const dy = TOP_BAND + boxH / 2 - h / 2
  camera.setViewOffset(w, h, -dx, -dy, w, h)
  camera.updateProjectionMatrix()
}

function resize() {
  const { innerWidth: w, innerHeight: h } = window
  renderer.setSize(w, h)
  css.setSize(w, h)
  camera.aspect = w / h
  frame()
}
addEventListener('resize', resize)
resize()

// Interaction: orbit with the mouse, hinge angle from the slider (0 closed,
// 180 open). Deep links and headless renders pin state with ?deg=&yaw=<radians>.
const q = new URLSearchParams(location.search)
/** Reset pressed: the camera eases back to EYE until a drag takes over. */
let homing = false
const hud = mountHud({
  angle: (v) => setAngle(v),
  toggle: () => setAngle(targetAngle > 90 ? 0 : 180),
  flip: () => {
    targetYaw += Math.PI
    hud.yaw(targetYaw)
  },
  home: goHome,
  reset: () => {
    // Back to the front view: yaw unwinds the short way, the camera eases home.
    targetYaw = 0
    hud.yaw(0)
    homing = true
  }
})
controls.addEventListener('start', () => {
  hud.hideHint()
  homing = false
})

let targetAngle = Number(q.get('deg') ?? 180)
let angle = targetAngle
let yaw = Number(q.get('yaw') ?? 0)
let targetYaw = yaw

function setAngle(v: number) {
  targetAngle = Math.min(180, Math.max(0, v))
  hud.target(targetAngle)
}
// The buttons on the frame have keys too, in packages/shell/buttons.ts.
addEventListener('keydown', (e) => e.key === 'Escape' && goHome())
setAngle(targetAngle)

// The pose half of the embed bridge, now that the numbers exist; a message
// that arrived during the model load is applied here.
pose = (m) => {
  if (typeof m.deg === 'number') setAngle(m.deg)
  if (typeof m.yaw === 'number') {
    targetYaw = m.yaw
    hud.yaw(targetYaw)
  }
}
if (queued) pose(queued)

if (q.has('debug')) {
  Object.assign(window, {
    __duo: { bend, phone, renderer, scene, camera, controls, screens, press: hardware.press, device }
  })
}
const dir = new THREE.Vector3()
const pos = new THREE.Vector3()
/** Flat: off it the inner display is a bent surface, and only the clip below keeps its panel honest. */
const FLAT = 179
/**
 * Where the lead passes between the displays: above it the inner display is
 * the one in use and the cover mirrors it, below it the other way round
 * (docs/decisions.md 24). By 40° the fold has taken 94% of the inner display's
 * width and the cover has turned round to be the glass in front of you. Nothing
 * visible happens at the crossing — both displays already show the session.
 */
const HANDOVER = 40
const camLocal = new THREE.Vector3()
/**
 * How much of the inner display the fold has taken, as a fraction of its width
 * from the moving half's free edge: 0 flat, 1 gone. The edge is rotated about
 * the hinge exactly as `shaders/fold.ts` does it, then projected back onto the
 * flat glass plane along the ray it leaves the eye on — the trip the screen
 * shader makes per fragment. So the folded display shows the flat picture cut
 * off at this edge, and a flat live panel clipped here is that picture, live:
 * the app keeps running while the phone folds instead of being swapped for a
 * baked home screen.
 *
 * From the camera's own position rather than the shader's fixed eye. The two
 * agree at the default pose, and away from it this one still cuts the panel
 * exactly where the folding half hides it — which is what keeps a panel with no
 * depth test from spilling over the fold.
 */
const foldClip = () => {
  body.worldToLocal(camLocal.copy(camera.position))
  const c = Math.cos(bend.value)
  const s = Math.sin(bend.value)
  const dz = INNER_Z - HINGE_Z
  const edge = c * INNER.x + s * dz
  const depth = -s * INNER.x + c * dz + HINGE_Z
  const t = (INNER_Z - camLocal.z) / (depth - camLocal.z)
  if (t <= 0) return 1
  return Math.min(1, Math.max(0, (camLocal.x + (edge - camLocal.x) * t - INNER.x) / INNER.z))
}

// The blur and darkening shaders/screen.ts ramps toward a display's free edge,
// in CSS. A live panel is flat glass and the bake is not there to help — with
// an app up it is black or showing home — so without this the app would fold to
// a hard cut where the rest of the phone folds to a soft one. Same curves as the
// shader: strongest at the free edge, gone at the hinge.
//
// The darkening is one gradient, whose alpha is honoured exactly. The blur is a
// backdrop-filter, which Chrome applies at full strength wherever its mask is
// not transparent, so one layer cannot taper. It is built up instead: `STEPS`
// layers nested from the free edge, each blurring a little, so a point is under
// as many as it is close to the edge and the variances add up to the shader's
// radius there. Every blur layer spans the whole panel and is cut by a
// clip-path, not sized to its band: a backdrop-filter mirrors the backdrop at
// its own box, so a sized layer folds the picture back at its edge, and a clip
// edge is only the small step in blur. (A mask would not do: Chrome does not
// apply mask-image to a backdrop-filter's output at all.)
const STEPS = 6
/** Alpha at band fractions 0…1 from the free edge, as gradient stops. */
const stops = (f: (v: number) => number) =>
  [0, 0.25, 0.5, 0.75, 1].map((v) => `rgba(0,0,0,${f(v).toFixed(3)}) ${v * 100}%`).join(',')
/** The shader's `pow(clamp((edge - lo) / (1 - lo)), 1.35)`, edge counted from the hinge. */
const curve = (v: number, lo: number) => Math.min(1, Math.max(0, (1 - lo - v) / (1 - lo))) ** 1.35
/**
 * The ramp for one panel: `free` is the side its free edge is on, `band` how
 * much of the width the shader's gradient spans — half the inner display, the
 * whole cover (`uiGradient` in main.ts). Returns the per-frame setter.
 */
function ramp(panel: HTMLElement, free: 'left' | 'right', band: number) {
  const dir = free === 'left' ? '90deg' : '270deg'
  /** `to` of the panel's width from the free edge, as the inset of the far side. */
  const far = (to: number) => (free === 'left' ? `0 ${100 - to}% 0 0` : `0 0 0 ${100 - to}%`)
  const layer = (css: string) => {
    const el = document.createElement('div')
    // The fold is the glass itself, so it sits over everything the OS stacks
    // (its highest layer, the power slider, is 10).
    el.style.cssText = `position:absolute;z-index:11;pointer-events:none;${css}`
    return el
  }
  // Sized to the band, so the gradient's stops are band fractions.
  const dark = layer(`inset:${far(band * 100)}`)
  const steps = Array.from({ length: STEPS }, (_, i) =>
    layer(`inset:0;clip-path:inset(${far((band * 100 * (i + 1)) / STEPS)})`)
  )
  const layers = [dark, ...steps]
  let ramped = -1
  return (motion: number) => {
    // React owns the panel's children and clears the container on its first
    // commit, which lands a frame or more after this module runs. Checked every
    // frame rather than on the way past the guard below: at a pinned angle there
    // is no way past it, and the layers would stay in the bin React threw them in.
    for (const el of layers) if (el.parentNode !== panel) panel.appendChild(el)
    if (Math.abs(motion - ramped) < 0.004) return
    ramped = motion
    for (const el of layers) el.style.display = motion > 0 ? 'block' : 'none'
    if (motion <= 0) return
    dark.style.background = `linear-gradient(${dir},${stops((v) => Math.min(1, 2 * motion * curve(v, 0.2)))})`
    // 72 texels of a 12 px/mm bake is 30 px of a 5 px/mm panel. Gaussians add
    // in variance, so the layer that reaches step `i` carries what the shader's
    // radius there has over the next step's.
    const sigma = (i: number) => (i < STEPS ? 30 * motion * curve((i + 0.5) / STEPS, 0) : 0)
    steps.forEach((el, i) => {
      el.style.backdropFilter = `blur(${Math.sqrt(Math.max(0, sigma(i) ** 2 - sigma(i + 1) ** 2)).toFixed(2)}px)`
    })
  }
}
const innerFold = ramp(innerLive.element, 'left', 0.5)
// Rotated half a turn to face out, so the cover's free edge is the panel's right.
const coverFold = ramp(outerLive.element, 'right', 1)
const smooth = (x: number) => x * x * (3 - 2 * x)

/** The cover panel answers a finger only while flat, so `coverTouch` is written on change. */
let coverTouch = true
let last = performance.now()
renderer.setAnimationLoop((now) => {
  // Ease toward the targets at a rate independent of frame rate.
  const dt = Math.min(now - last, 50)
  const k = 1 - 0.92 ** (dt / 16.7)
  last = now
  angle = mix(angle, targetAngle, k)
  yaw = mix(yaw, targetYaw, k)
  if (hud.spinning()) targetYaw += 0.004
  hud.angle(angle)
  if (homing) {
    camera.position.lerp(EYE, k)
    homing = camera.position.distanceTo(EYE) > 0.01
  }

  bend.value = ((180 - angle) / 180) * Math.PI
  hinge.rotation.y = bend.value
  phone.rotation.y = yaw
  hardware.tick(dt / 1000)
  const torch = toggles.torch && !device.off
  for (const m of led) (m.material as THREE.MeshStandardMaterial).emissiveIntensity = torch ? 6 : 0
  ledLight.intensity = torch ? 4 : 0
  glow.visible = torch
  // The display in use leads and the other mirrors it, so both hold the session
  // through the whole fold and nothing launches when the lead passes.
  follow(angle > HANDOVER)
  const app = busy()
  // Asleep, both displays are dark; open, the outer one sleeps on its own. Both
  // go dark under an app: the bake can only draw the shell, and a home screen
  // there would be a lie about what is running. The live panels below cover
  // whatever of them faces you.
  screens.inner.material.color.setScalar(device.asleep || (angle < FLAT && app) ? 0 : 1)
  screens.outer.material.color.setScalar(device.asleep || angle > FLAT || app ? 0 : 1)
  const shot = lockState.locked ? lockshot : home
  screens.inner.material.map = shot.inner
  screens.outer.material.map = shot.outer

  controls.update()
  frame()
  hud.orbit(controls.getAzimuthalAngle(), controls.getPolarAngle(), controls.getDistance(), yaw)
  renderer.render(scene, camera)
  // A DOM panel has no depth test and can't bend, so a panel stands in for the
  // bake only where the bake cannot draw what is up: the inner one flat, or
  // holding an app through the fold; the cover closed, or holding the app at
  // any angle it faces you. Everywhere else the bake draws the shell with the
  // fade the fold was designed around (decisions 2), and a live panel would
  // flatten it. Where a panel does stand in, it is ramped where the shader
  // ramps, so it is the same picture the bake would draw, live.
  const facing = (o: THREE.Object3D) =>
    o.getWorldDirection(dir).dot(camera.position.clone().sub(o.getWorldPosition(pos))) > 0
  // Open flat, the cover is off like the bake has it: from the back you should
  // see a sleeping display, not a blurred copy of the app. It fades out over the
  // last 30° so the mirror is never a pop when the fold begins.
  outerLive.visible = facing(outerLive) && (angle < 1 || (app && angle < FLAT))
  outerLive.element.style.opacity = Math.min(1, (FLAT - angle) / 30).toFixed(3)
  coverFold(outerLive.visible ? smooth(Math.min(1, angle / 90)) : 0)
  // The clip is what keeps the inner panel inside the half that is still
  // facing you, so it holds all the way to closed.
  const clip = foldClip()
  innerLive.visible = facing(innerLive) && (angle > FLAT || app)
  innerLive.element.style.clipPath = clip > 0 ? `inset(0 0 0 ${(clip * 100).toFixed(2)}%)` : ''
  updateDisplays(
    { visible: innerLive.visible && !device.asleep, active: angle > 40, angle, clip },
    {
      visible: outerLive.visible && Number(outerLive.element.style.opacity) > 0 && !device.asleep,
      active: angle <= 40,
      angle,
      clip: 0
    }
  )
  // Past half way the clip has eaten the whole band, as it has in the shader.
  innerFold(clip < 0.5 && angle < FLAT ? smooth(Math.min(1, bend.value / (Math.PI / 2))) : 0)
  // No depth test either: a turned panel would still take the clicks meant for
  // the frame drawn over it, so it is scenery until it is flat.
  const touch = angle < 1
  if (touch !== coverTouch) {
    coverTouch = touch
    outerLive.element.style.pointerEvents = touch ? 'auto' : 'none'
  }
  css.render(scene, camera)
})
