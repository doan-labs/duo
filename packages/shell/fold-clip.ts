// The fold math of shaders/fold.ts, reused to cut the flat live panel where the
// fold takes the display. Kept pure so the edge cases are testable without a GL
// context: a clipped live panel must end exactly where the folded half hides it.

export type FoldPanel = {
  /** Left edge x, cm in body space. */
  x: number
  /** Width, cm in body space. */
  w: number
  /** Glass plane z, cm in body space. */
  z: number
}

/**
 * How much of the inner display the fold has taken, as a fraction of its width
 * from the moving half's free edge: 0 flat, 1 gone. The edge is rotated about
 * the hinge exactly as shaders/fold.ts does it, then projected back onto the
 * flat glass plane along the ray it leaves the eye on - the trip the screen
 * shader makes per fragment. So the folded display shows the flat picture cut
 * off at this edge, and a flat live panel clipped here is that picture, live:
 * the app keeps running while the phone folds instead of being swapped for a
 * baked home screen.
 *
 * `camX`/`camZ` are the camera's position in body space - from the camera's own
 * position rather than the shader's fixed eye. The two agree at the default
 * pose, and away from it this one still cuts the panel exactly where the
 * folding half hides it - which is what keeps a panel with no depth test from
 * spilling over the fold.
 */
export const foldClip = (bend: number, camX: number, camZ: number, panel: FoldPanel, hingeZ: number) => {
  const c = Math.cos(bend)
  const s = Math.sin(bend)
  const dz = panel.z - hingeZ
  const edge = c * panel.x + s * dz
  const depth = -s * panel.x + c * dz + hingeZ
  // Eye on the fold plane: the projection degenerates and `t` is infinite, so
  // take the limit - the edge covers the glass in the direction it leans.
  if (depth === camZ) return edge >= camX ? 1 : 0
  const t = (panel.z - camZ) / (depth - camZ)
  if (t <= 0) return 1
  return Math.min(1, Math.max(0, (camX + (edge - camX) * t - panel.x) / panel.w))
}

/**
 * A panel whose clip covers its whole width paints nothing. Whatever the
 * compositor would have drawn, the honest state is empty, so the object is
 * culled: a composited element clipped at its edge can raster a mirrored copy
 * of itself at the boundary (the raster artifact docs/debug.md lists under
 * false alarms), and the fully clipped copy is also where taps meant for the
 * page background were landing.
 */
export const panelGone = (clip: number) => clip >= 1
