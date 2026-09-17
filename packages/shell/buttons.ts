// The four buttons on the frame, as hardware: side button and Camera
// Control down the right edge, volume up and down along the top, all on the
// fixed half. This file finds Apple's meshes, catches the pointer on them, sinks
// the cap, rocks the body and clicks. What a press means is os/buttons.ts.

import * as THREE from 'three'

export type Button = 'side' | 'camera' | 'up' | 'down'
/** A cap going down or up, or, while down, how far the finger slid along it (cm). */
export type Press = { button: Button; down: boolean } | { button: Button; slide: number }

// Apple's hashed node ids, like the fold's in main.ts. The cap of the two edge
// buttons is a separate thin shell, so each is a list. Volume up is the one
// nearer the corner: iPad mini's arrangement, held closed in portrait.
const NODES: Record<Button, string[]> = {
  side: ['UXtkILReLwCJaov', 'tkSBzAjLTdhANqx', 'fbvEqfwjsAMSDkr'],
  camera: ['AjfIgUpXxKaENDl', 'VNIQJMrwFmXgrBf', 'ejUvJHtjfcqjSvM'],
  up: ['YhaSRqOjDUQrQTc'],
  down: ['FcJBPLgEScWGyXd']
}
const IN = { x: new THREE.Vector3(-1, 0, 0), y: new THREE.Vector3(0, -1, 0) }
/** Which way the cap sinks, and which way a finger slides along it. */
const DIR: Record<Button, { push: THREE.Vector3; along: THREE.Vector3 }> = {
  side: { push: IN.x, along: new THREE.Vector3(0, 1, 0) },
  camera: { push: IN.x, along: new THREE.Vector3(0, 1, 0) },
  up: { push: IN.y, along: new THREE.Vector3(1, 0, 0) },
  down: { push: IN.y, along: new THREE.Vector3(1, 0, 0) }
}
const KEYS: Record<string, Button> = { l: 'side', c: 'camera', ArrowUp: 'up', ArrowDown: 'down' }
// A real cap travels a quarter millimetre. Twice that, or it does not read from
// 40 cm away; the body rocking under the finger carries the rest.
const TRAVEL = 0.05
const NUDGE = 0.045
const TILT = 0.0035
// Hit boxes are the mesh bounds padded by this, so the sliver of cap you see
// from the front is still clickable.
const PAD = 0.15

/** A damped spring toward `target`, stepped at most 20 ms at a time so it never blows up on a long frame. */
class Spring {
  x = new THREE.Vector3()
  v = new THREE.Vector3()
  target = new THREE.Vector3()
  constructor(
    private k: number,
    private zeta: number
  ) {}
  step(dt: number) {
    const c = 2 * Math.sqrt(this.k) * this.zeta
    while (dt > 0) {
      const h = Math.min(dt, 0.02)
      dt -= h
      const a = this.target.clone().sub(this.x).multiplyScalar(this.k).addScaledVector(this.v, -c)
      this.v.addScaledVector(a, h)
      this.x.addScaledVector(this.v, h)
    }
  }
}

let ac: AudioContext | undefined
/** A short band-passed noise burst: the cap's click, brighter on the way up. */
function click(down: boolean) {
  ac ??= new AudioContext()
  void ac.resume()
  const buf = ac.createBuffer(1, 360, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2
  const src = ac.createBufferSource()
  src.buffer = buf
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = down ? 2400 : 3300
  bp.Q.value = 1.1
  const g = ac.createGain()
  g.gain.value = down ? 0.5 : 0.3
  src.connect(bp).connect(g).connect(ac.destination)
  src.start()
}

/**
 * Wires the buttons on `body` (the group holding the phone meshes). `emit`
 * receives presses from the pointer and from the keyboard alike. Call `tick`
 * every frame for the springs.
 */
export function buttons(body: THREE.Group, camera: THREE.Camera, canvas: HTMLElement, emit: (p: Press) => void) {
  type Part = { meshes: THREE.Mesh[]; spring: Spring; hit: THREE.Mesh; centre: THREE.Vector3 }
  const parts = {} as Record<Button, Part>
  const hits: THREE.Mesh[] = []
  const ghost = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
  for (const name of Object.keys(NODES) as Button[]) {
    const meshes = body.children.filter((m): m is THREE.Mesh => NODES[name].includes(m.name))
    const box = new THREE.Box3()
    for (const m of meshes) box.expandByObject(m)
    box.expandByScalar(PAD)
    const size = box.getSize(new THREE.Vector3())
    const centre = box.getCenter(new THREE.Vector3())
    const hit = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), ghost)
    hit.position.copy(centre)
    hit.userData.button = name
    body.add(hit)
    hits.push(hit)
    parts[name] = { meshes, spring: new Spring(2600, 0.5), hit, centre }
  }
  // The whole phone gives a little under the finger, then rings back.
  const shove = new Spring(900, 0.32)
  const rock = new Spring(900, 0.32)

  const held = new Set<Button>()
  const set = (name: Button, down: boolean) => {
    if (down === held.has(name)) return
    held[down ? 'add' : 'delete'](name)
    click(down)
    parts[name].spring.target.copy(DIR[name].push).multiplyScalar(down ? 1 : 0)
    shove.target.set(0, 0, 0)
    rock.target.set(0, 0, 0)
    for (const b of held) {
      shove.target.addScaledVector(DIR[b].push, NUDGE)
      rock.target.addScaledVector(parts[b].centre.clone().cross(DIR[b].push), TILT)
    }
    emit({ button: name, down })
  }

  // ---- pointer ----
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const cast = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    return ray.intersectObjects(hits, false)[0]
  }
  // Hover dims the cap a shade: emissive is invisible on Star White.
  let hover: Button | null = null
  const glow = (name: Button | null) => {
    if (name === hover) return
    for (const b of [hover, name]) {
      if (!b) continue
      for (const m of parts[b].meshes) (m.material as THREE.MeshStandardMaterial).color.setScalar(b === name ? 0.8 : 1)
    }
    hover = name
    canvas.style.cursor = name ? 'pointer' : ''
  }
  let pressed: { name: Button; from: THREE.Vector3; plane: THREE.Plane; along: THREE.Vector3 } | null = null
  canvas.addEventListener(
    'pointerdown',
    (e) => {
      const hit = cast(e)
      if (!hit || e.button !== 0) return
      // Ours, not OrbitControls'.
      e.stopImmediatePropagation()
      canvas.setPointerCapture(e.pointerId)
      const name = hit.object.userData.button as Button
      // Slides are measured on a plane through the hit point facing the camera,
      // along the cap's axis as it sits in the world right now.
      const normal = camera.getWorldDirection(new THREE.Vector3())
      const along = DIR[name].along.clone().transformDirection(body.matrixWorld)
      pressed = {
        name,
        from: hit.point.clone(),
        plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hit.point),
        along
      }
      set(name, true)
    },
    { capture: true }
  )
  canvas.addEventListener('pointermove', (e) => {
    if (!pressed) return glow(cast(e)?.object.userData.button ?? null)
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const p = ray.ray.intersectPlane(pressed.plane, new THREE.Vector3())
    if (p) emit({ button: pressed.name, slide: p.sub(pressed.from).dot(pressed.along) })
  })
  const release = (e: PointerEvent) => {
    if (!pressed) return
    canvas.releasePointerCapture(e.pointerId)
    set(pressed.name, false)
    pressed = null
  }
  canvas.addEventListener('pointerup', release)
  canvas.addEventListener('pointercancel', release)

  // ---- keyboard: the same buttons, and the only way to chord two of them ----
  const typing = (e: KeyboardEvent) => (e.target as HTMLElement).matches('input,textarea')
  addEventListener('keydown', (e) => {
    const b = KEYS[e.key]
    if (!b || e.repeat || typing(e) || e.metaKey || e.ctrlKey) return
    e.preventDefault()
    set(b, true)
  })
  addEventListener('keyup', (e) => {
    const b = KEYS[e.key]
    if (b) set(b, false)
  })
  addEventListener('blur', () => {
    for (const b of [...held]) set(b, false)
  })

  return {
    /** Advances the springs; `dt` in seconds. */
    tick(dt: number) {
      for (const name of Object.keys(parts) as Button[]) {
        const part = parts[name]
        part.spring.step(dt)
        for (const m of part.meshes) m.position.copy(part.spring.x).multiplyScalar(TRAVEL)
        part.hit.position.copy(part.centre).addScaledVector(part.spring.x, TRAVEL)
      }
      shove.step(dt)
      rock.step(dt)
      body.position.copy(shove.x)
      body.rotation.set(rock.x.x, rock.x.y, rock.x.z)
    },
    /** For scripts and tests: the same path a finger takes. */
    press: set
  }
}
