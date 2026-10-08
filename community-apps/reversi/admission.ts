/**
 * Call-time input admission. A display copy may act on user input only while
 * its view is both visible and active in the freshest snapshot the caller can
 * read - for the app that is `os.view`, which moves synchronously with the
 * view event rather than waiting for a render a hidden frame may never get.
 *
 * Admission happens once, at the original handler: nothing queues work while
 * this copy is off screen, so input fired at a hidden copy is rejected before
 * it can schedule anything and can never slip in through a later activation.
 * Once admitted, an intent validates exactly once against the settled wire
 * document and then completes - pending validation is not yet an accepted
 * move, but a validated write always lands, even when the copy folded during
 * the storage round-trip.
 */
export type ViewState = { active: boolean; visible: boolean }

/** Input counts only while the copy is on screen: both halves of the view. */
export const admitted = (v: ViewState): boolean => v.active && v.visible
