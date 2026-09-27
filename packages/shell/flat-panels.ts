import * as THREE from 'three'
import type { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'

// CSS3DRenderer draws the displays through a `perspective()` camera, and inside
// that 3D context the browser rasters a panel at a scale of its own and
// resamples it on the GPU: text comes out soft, like upscaled video. A plane
// parallel to the screen projects to plain scale and translate, so while every
// shown panel is face-on it gets the equivalent 2D matrix under a flat camera
// and rasters at the size it is seen. Turned, the renderer's 3D strings return.

/** Px a corner may miss the parallelogram and still pass as face-on. */
const SLACK = 0.25

type Panel = { o: CSS3DObject; w: number; h: number }

const v = new THREE.Vector3()

export function flatPanels(css: CSS3DRenderer, panels: Panel[]) {
  const view = css.domElement.firstElementChild as HTMLElement
  const cam = view.firstElementChild as HTMLElement
  // What each element last got from us and from the renderer. The renderer only
  // writes a transform when its own changes, so a value that isn't ours is new.
  const ours = new Map<HTMLElement, string>()
  const theirs = new Map<HTMLElement, string>()
  const asked = new Map<HTMLElement, string>()

  const set = (el: HTMLElement, t: string | null) => {
    if (el.style.transform !== ours.get(el)) {
      theirs.set(el, el.style.transform)
      ours.delete(el)
      asked.delete(el)
    }
    if (t === null) {
      if (ours.delete(el)) el.style.transform = theirs.get(el) ?? ''
      asked.delete(el)
      return
    }
    if (asked.get(el) === t) return
    el.style.transform = t
    ours.set(el, el.style.transform)
    asked.set(el, t)
  }

  return (camera: THREE.PerspectiveCamera) => {
    const { width, height } = css.getSize()
    const cv = camera.view?.enabled ? camera.view : null
    // The renderer shifts and scales the whole view for an off-centre frustum; undo it to land in camera-layer px.
    const sx = cv ? cv.fullWidth / cv.width : 1
    const sy = cv ? cv.fullHeight / cv.height : 1
    const tx = cv ? -cv.offsetX * (width / cv.width) : 0
    const ty = cv ? -cv.offsetY * (height / cv.height) : 0
    const at = (p: Panel, x: number, y: number) => {
      v.set(x - p.w / 2, p.h / 2 - y, 0)
        .applyMatrix4(p.o.matrixWorld)
        .project(camera)
      return [(((v.x + 1) / 2) * width - tx) / sx, (((1 - v.y) / 2) * height - ty) / sy] as const
    }
    const dpr = devicePixelRatio || 1
    // An eased fold or camera never quite lands, and a transform that changes
    // every frame reads as animating, which the browser won't re-raster sharp.
    // Rounded, the string settles once the motion drops below a device pixel.
    const snap = (n: number) => Math.round(n * dpr) / dpr
    const unit = (n: number) => Math.round(n * 1e4) / 1e4

    const shown = panels.filter((p) => p.o.element.style.display !== 'none')
    const flat = shown.map((p) => {
      const [x0, y0] = at(p, 0, 0)
      const [x1, y1] = at(p, p.w, 0)
      const [x2, y2] = at(p, 0, p.h)
      const [x3, y3] = at(p, p.w, p.h)
      if (Math.hypot(x3 - (x1 + x2 - x0), y3 - (y1 + y2 - y0)) > SLACK) return null
      const a = (x1 - x0) / p.w
      const b = (y1 - y0) / p.w
      const c = (x2 - x0) / p.h
      const d = (y2 - y0) / p.h
      // A mirrored parallelogram is the panel's back, which the 3D path culls.
      if (a * d - b * c <= 0) return null
      // The element transforms about its centre, so the offset carries it.
      const cx = p.w / 2
      const cy = p.h / 2
      return `matrix(${unit(a)},${unit(b)},${unit(c)},${unit(d)},${snap(x0 - cx + a * cx + c * cy)},${snap(y0 - cy + b * cx + d * cy)})`
    })
    const on = shown.length > 0 && flat.every((m) => m !== null)

    set(cam, on ? 'none' : null)
    const style = on ? 'flat' : 'preserve-3d'
    if (cam.style.transformStyle !== style) cam.style.transformStyle = style
    for (const p of panels) {
      const i = shown.indexOf(p)
      set(p.o.element, on && i >= 0 ? flat[i]! : null)
    }
  }
}
