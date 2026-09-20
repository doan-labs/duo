// One vocabulary for movement, so the indicator that slides under the nav and
// the one inside a segmented control settle the same way. Curves for things
// that only fade or travel a fixed distance; springs for anything chasing a
// position it did not know in advance.

/** The site's easing curve, matching `ease.out` in tokens.stylex.ts. */
export const CURVE = [0.22, 1, 0.36, 1] as const

/** An indicator sliding between siblings: quick, settled, no visible overshoot. */
export const SLIDE = { type: 'spring', stiffness: 520, damping: 42, mass: 0.85 } as const

/** Sheets, menus and panels: softer, because they travel further. */
export const SHEET = { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 } as const

/** A press: the scale a control takes while the pointer is down. */
export const TAP = 0.97
